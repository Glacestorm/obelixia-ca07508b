/**
 * useSandboxEnvironment — Hook para gestión de entornos sandbox de conectores regulatorios
 * V2-ES.8 T8: Estado, gates, ejecuciones y auditoría de sandbox
 */
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ConnectorEnvironment,
  ConnectorEnvironmentConfig,
  SandboxExecution,
  EnvironmentSummary,
  ENVIRONMENT_DEFINITIONS,
  evaluateGates,
  allBlockingGatesPassed,
  isEnvironmentActivatable,
  isRealSubmissionBlocked,
  createSandboxExecution,
  completeExecution,
  buildEnvironmentSummary,
  getEnvironmentDisclaimer,
} from '@/components/erp/hr/shared/sandboxEnvironmentEngine';
import type { IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';

interface UseSandboxEnvironmentParams {
  companyId: string;
  adapters: IntegrationAdapter[];
}

export function useSandboxEnvironment({ companyId, adapters }: UseSandboxEnvironmentParams) {
  const [activeEnvironment, setActiveEnvironmentState] = useState<ConnectorEnvironment>('sandbox');
  const [adapterEnvConfigs, setAdapterEnvConfigs] = useState<ConnectorEnvironmentConfig[]>([]);
  const [executions, setExecutions] = useState<SandboxExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ===================== GATE CONTEXT BUILDER =====================

  const buildGateContext = useCallback((adapter: IntegrationAdapter) => {
    const config = adapter.config as Record<string, unknown>;
    const adapterExecs = executions.filter(e => e.adapterId === adapter.id);

    return {
      adapterConfigured: adapter.status === 'configured' && adapter.is_active,
      hasTestCredentials: !!(config?.test_credentials || config?.test_endpoint),
      hasPreprodCredentials: !!(config?.preprod_credentials || config?.preprod_endpoint),
      hasCertificate: !!(config?.certificate_alias),
      certificateExpired: !!(config?.certificate_expired),
      hasPreRealApproval: !!(config?.pre_real_approved),
      sandboxSuccessCount: adapterExecs.filter(
        e => e.environment === 'sandbox' && e.status === 'completed'
      ).length,
      testSuccessCount: adapterExecs.filter(
        e => e.environment === 'test' && e.status === 'completed'
      ).length,
    };
  }, [executions]);

  // ===================== LOAD ENVIRONMENT CONFIGS =====================

  const loadEnvironmentConfigs = useCallback(() => {
    const configs: ConnectorEnvironmentConfig[] = [];

    for (const adapter of adapters) {
      const gateCtx = buildGateContext(adapter);

      for (const env of ['sandbox', 'test', 'preprod'] as ConnectorEnvironment[]) {
        const gateResults = evaluateGates(env, gateCtx);
        const adapterConfig = adapter.config as Record<string, unknown>;
        const envConfig = (adapterConfig?.[`env_${env}`] || {}) as Record<string, unknown>;

        configs.push({
          adapterId: adapter.id,
          adapterName: adapter.adapter_name,
          environment: env,
          credentialAlias: (envConfig?.credential_alias as string) || null,
          hasCredentials: !!(envConfig?.has_credentials),
          isEnabled: !!(envConfig?.enabled),
          enabledAt: (envConfig?.enabled_at as string) || null,
          enabledBy: (envConfig?.enabled_by as string) || null,
          gateResults,
          lastExecutionAt: executions
            .filter(e => e.adapterId === adapter.id && e.environment === env)
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]?.startedAt || null,
          lastExecutionStatus: executions
            .filter(e => e.adapterId === adapter.id && e.environment === env)
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]?.status === 'completed'
            ? 'success'
            : executions.filter(e => e.adapterId === adapter.id && e.environment === env).length > 0
              ? 'failure'
              : null,
          executionCount: executions.filter(
            e => e.adapterId === adapter.id && e.environment === env
          ).length,
        });
      }
    }

    setAdapterEnvConfigs(configs);
  }, [adapters, buildGateContext, executions]);

  // ===================== SWITCH ENVIRONMENT =====================

  const switchEnvironment = useCallback((env: ConnectorEnvironment) => {
    if (env === 'production') {
      toast.error('Producción está bloqueada en esta fase del sistema');
      return false;
    }

    if (!isEnvironmentActivatable(env)) {
      toast.error(`El entorno ${ENVIRONMENT_DEFINITIONS[env].label} no está disponible`);
      return false;
    }

    setActiveEnvironmentState(env);
    toast.info(`Entorno activo: ${ENVIRONMENT_DEFINITIONS[env].label}`, {
      description: getEnvironmentDisclaimer(env),
    });

    // Audit
    logSandboxAudit('environment_switched', {
      from: activeEnvironment,
      to: env,
      companyId,
    });

    return true;
  }, [activeEnvironment, companyId]);

  // ===================== ENABLE ADAPTER IN ENVIRONMENT =====================

  const enableAdapterInEnvironment = useCallback(async (
    adapterId: string,
    env: ConnectorEnvironment
  ): Promise<boolean> => {
    if (env === 'production') {
      toast.error('No se puede habilitar un conector en producción');
      return false;
    }

    const adapter = adapters.find(a => a.id === adapterId);
    if (!adapter) {
      toast.error('Conector no encontrado');
      return false;
    }

    // Evaluate gates
    const gateCtx = buildGateContext(adapter);
    const gateResults = evaluateGates(env, gateCtx);

    if (!allBlockingGatesPassed(env, gateResults)) {
      const failedGates = gateResults.filter(g => !g.passed);
      toast.error(`No se cumplen los requisitos para ${ENVIRONMENT_DEFINITIONS[env].label}`, {
        description: failedGates.map(g => g.reason).join('. '),
      });
      return false;
    }

    // Persist
    setAdapterEnvConfigs(prev =>
      prev.map(c =>
        c.adapterId === adapterId && c.environment === env
          ? { ...c, isEnabled: true, enabledAt: new Date().toISOString() }
          : c
      )
    );

    logSandboxAudit('adapter_enabled_in_environment', {
      adapterId,
      adapterName: adapter.adapter_name,
      environment: env,
      companyId,
    });

    toast.success(`${adapter.adapter_name} habilitado en ${ENVIRONMENT_DEFINITIONS[env].label}`);
    return true;
  }, [adapters, buildGateContext, companyId]);

  // ===================== EXECUTE IN SANDBOX =====================

  const executeSandbox = useCallback(async (params: {
    adapterId: string;
    submissionType: string;
    domain: string;
    payload: Record<string, unknown>;
  }): Promise<SandboxExecution | null> => {
    if (isRealSubmissionBlocked() && activeEnvironment === 'production') {
      toast.error('Ejecución en producción bloqueada');
      return null;
    }

    const adapter = adapters.find(a => a.id === params.adapterId);
    if (!adapter) {
      toast.error('Conector no encontrado');
      return null;
    }

    setIsLoading(true);

    try {
      const executionType = activeEnvironment === 'sandbox'
        ? 'sandbox_submit'
        : activeEnvironment === 'test'
          ? 'test_connect'
          : 'preprod_validate';

      const execution = createSandboxExecution({
        adapterId: params.adapterId,
        environment: activeEnvironment,
        executionType,
        submissionType: params.submissionType,
        domain: params.domain,
        payloadHash: btoa(JSON.stringify(params.payload)).slice(0, 32),
        initiatedBy: 'current_user',
      });

      setExecutions(prev => [execution, ...prev]);

      // Simulate execution (in sandbox, responses are simulated)
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

      const simulatedResult = {
        statusCode: 200,
        accepted: Math.random() > 0.15, // 85% success rate in sandbox
        errors: Math.random() > 0.85 ? ['Validación de campo NAF incorrecta'] : [],
        warnings: Math.random() > 0.7 ? ['Formato de fecha no estándar detectado'] : [],
      };

      const completed = completeExecution(execution, simulatedResult);
      setExecutions(prev => prev.map(e => e.id === completed.id ? completed : e));

      logSandboxAudit('sandbox_execution_completed', {
        executionId: completed.id,
        adapterId: params.adapterId,
        environment: activeEnvironment,
        status: completed.status,
        domain: params.domain,
        companyId,
      });

      if (completed.status === 'completed') {
        toast.success(`Ejecución ${ENVIRONMENT_DEFINITIONS[activeEnvironment].label} completada`);
      } else {
        toast.warning('Ejecución completada con errores', {
          description: simulatedResult.errors.join('. '),
        });
      }

      return completed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error en ejecución sandbox', { description: msg });

      logSandboxAudit('sandbox_execution_failed', {
        adapterId: params.adapterId,
        environment: activeEnvironment,
        error: msg,
        companyId,
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [activeEnvironment, adapters, companyId]);

  // ===================== AUDIT =====================

  const logSandboxAudit = useCallback(async (
    eventType: string,
    metadata: Record<string, unknown>
  ) => {
    try {
      await supabase.from('erp_hr_audit_log').insert({
        company_id: companyId,
        action: eventType,
        entity_type: 'sandbox_environment',
        entity_id: (metadata.adapterId as string) || companyId,
        details: {
          ...metadata,
          _disclaimer: 'Operación en entorno sandbox/preparatorio — no constituye acción oficial',
          _phase: 'V2-ES.8-T8',
          _production_blocked: true,
        },
      } as any);
    } catch {
      console.warn('[useSandboxEnvironment] Audit log failed silently');
    }
  }, [companyId]);

  // ===================== SUMMARY =====================

  const summary = useMemo((): EnvironmentSummary => {
    const base = buildEnvironmentSummary(adapterEnvConfigs);
    return { ...base, activeEnvironment };
  }, [adapterEnvConfigs, activeEnvironment]);

  // ===================== ADAPTER CONFIGS FOR CURRENT ENV =====================

  const currentEnvConfigs = useMemo(() =>
    adapterEnvConfigs.filter(c => c.environment === activeEnvironment),
    [adapterEnvConfigs, activeEnvironment]
  );

  return {
    // State
    activeEnvironment,
    summary,
    currentEnvConfigs,
    adapterEnvConfigs,
    executions,
    isLoading,

    // Actions
    switchEnvironment,
    enableAdapterInEnvironment,
    executeSandbox,
    loadEnvironmentConfigs,

    // Safety
    isRealSubmissionBlocked: isRealSubmissionBlocked(),
    productionBlocked: true,
  };
}
