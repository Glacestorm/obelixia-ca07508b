/**
 * useSandboxEnvironment — Hook para gestión de entornos sandbox de conectores regulatorios
 * V2-ES.8 T8+T9: Gates de elegibilidad, ejecución sandbox diferenciada, trazabilidad y persistencia
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  ConnectorEnvironment,
  ConnectorEnvironmentConfig,
  SandboxExecution,
  EnvironmentSummary,
  SandboxDomain,
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
import {
  evaluateSandboxEligibility,
  type SandboxEligibilityResult,
  type EligibilityContext,
} from '@/components/erp/hr/shared/sandboxEligibilityEngine';
import {
  executeSandboxSimulation,
  buildSandboxAuditEvents,
  type SandboxExecutionRecord,
  type SandboxExecutionRequest,
} from '@/components/erp/hr/shared/sandboxExecutionService';
import type { IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';
import {
  auditEnvironmentSwitched,
  auditSandboxEnabled,
  auditDisclaimersAccepted,
  auditProductionBlocked,
  auditExecutionAttempted,
  auditExecutionCompleted,
  auditExecutionFailed,
  auditGateNotMet,
  logSandboxAuditEvent,
} from '@/lib/security/sandboxAuditHelper';
import { useSandboxPersistence, type SandboxHistoryFilters } from './useSandboxPersistence';

interface UseSandboxEnvironmentParams {
  companyId: string;
  adapters: IntegrationAdapter[];
}

export function useSandboxEnvironment({ companyId, adapters }: UseSandboxEnvironmentParams) {
  const [activeEnvironment, setActiveEnvironmentState] = useState<ConnectorEnvironment>('sandbox');
  const [adapterEnvConfigs, setAdapterEnvConfigs] = useState<ConnectorEnvironmentConfig[]>([]);
  const [executions, setExecutions] = useState<SandboxExecution[]>([]);
  const [executionRecords, setExecutionRecords] = useState<SandboxExecutionRecord[]>([]);
  const [eligibilityResults, setEligibilityResults] = useState<Map<string, SandboxEligibilityResult>>(new Map());
  const [disclaimersAccepted, setDisclaimersAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ===================== PERSISTENCE (T9) =====================
  const persistence = useSandboxPersistence(companyId);

  // Load history on mount
  useEffect(() => {
    persistence.fetchHistory();
  }, [companyId]);

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

  // ===================== ELIGIBILITY EVALUATION =====================

  const evaluateEligibility = useCallback((
    domain: SandboxDomain,
    adapterId: string,
    overrides?: Partial<EligibilityContext>
  ): SandboxEligibilityResult => {
    const adapter = adapters.find(a => a.id === adapterId);
    const config = (adapter?.config || {}) as Record<string, unknown>;
    const adapterExecs = executionRecords.filter(r => r.adapterId === adapterId);
    const sandboxSuccessCount = adapterExecs.filter(
      r => r.environment === 'sandbox' && r.status === 'completed'
    ).length;

    const ctx: EligibilityContext = {
      adapterConfigured: adapter?.status === 'configured' && !!adapter?.is_active,
      adapterActive: !!adapter?.is_active,
      domainSupported: true, // All 3 domains supported
      readinessScore: (config?.readiness_score as number) || 50,
      readinessLevel: (config?.readiness_level as string) || 'partial',
      hasBlockers: !!(config?.has_blockers),
      hasCertificate: !!(config?.certificate_alias),
      certificateExpired: !!(config?.certificate_expired),
      certificateCompatibleWithSandbox: true,
      hasPreRealApproval: !!(config?.pre_real_approved),
      approvalStatus: (config?.approval_status as string) || null,
      sandboxExplicitlyEnabled: !!((config?.env_sandbox as Record<string, unknown>)?.enabled),
      currentEnvironment: activeEnvironment,
      sandboxSuccessCount,
      lastSandboxExecution: adapterExecs
        .filter(r => r.environment === 'sandbox')
        .sort((a, b) => b.executedAt.localeCompare(a.executedAt))[0]?.executedAt || null,
      disclaimersAccepted,
      ...overrides,
    };

    const result = evaluateSandboxEligibility(domain, activeEnvironment, ctx);

    // Cache result
    const key = `${domain}:${adapterId}:${activeEnvironment}`;
    setEligibilityResults(prev => {
      const next = new Map(prev);
      next.set(key, result);
      return next;
    });

    return result;
  }, [adapters, activeEnvironment, executionRecords, disclaimersAccepted]);

  const getEligibility = useCallback((domain: SandboxDomain, adapterId: string): SandboxEligibilityResult | null => {
    const key = `${domain}:${adapterId}:${activeEnvironment}`;
    return eligibilityResults.get(key) || null;
  }, [eligibilityResults, activeEnvironment]);

  // ===================== ACCEPT DISCLAIMERS =====================

  const acceptDisclaimers = useCallback(() => {
    setDisclaimersAccepted(true);
    auditDisclaimersAccepted(companyId, activeEnvironment);
    toast.success('Disclaimers de sandbox aceptados');
  }, [companyId, activeEnvironment]);

  // ===================== SWITCH ENVIRONMENT =====================

  const switchEnvironment = useCallback((env: ConnectorEnvironment) => {
    if (env === 'production') {
      toast.error('Producción está bloqueada en esta fase del sistema');
      auditProductionBlocked(companyId, undefined, 'Intento de cambio a producción rechazado');
      return false;
    }

    if (!isEnvironmentActivatable(env)) {
      toast.error(`El entorno ${ENVIRONMENT_DEFINITIONS[env].label} no está disponible`);
      return false;
    }

    setActiveEnvironmentState(env);
    setDisclaimersAccepted(false);
    toast.info(`Entorno activo: ${ENVIRONMENT_DEFINITIONS[env].label}`, {
      description: getEnvironmentDisclaimer(env),
    });

    auditEnvironmentSwitched(companyId, activeEnvironment, env);

    return true;
  }, [activeEnvironment, companyId]);

  // ===================== ENABLE ADAPTER IN ENVIRONMENT =====================

  const enableAdapterInEnvironment = useCallback(async (
    adapterId: string,
    env: ConnectorEnvironment
  ): Promise<boolean> => {
    if (env === 'production') {
      toast.error('No se puede habilitar un conector en producción');
      auditProductionBlocked(companyId, adapterId, 'Intento de habilitar conector en producción');
      return false;
    }

    const adapter = adapters.find(a => a.id === adapterId);
    if (!adapter) {
      toast.error('Conector no encontrado');
      return false;
    }

    const gateCtx = buildGateContext(adapter);
    const gateResults = evaluateGates(env, gateCtx);

    if (!allBlockingGatesPassed(env, gateResults)) {
      const failedGates = gateResults.filter(g => !g.passed);
      toast.error(`No se cumplen los requisitos para ${ENVIRONMENT_DEFINITIONS[env].label}`, {
        description: failedGates.map(g => g.reason).join('. '),
      });
      // Audit each failed gate
      for (const fg of failedGates) {
        auditGateNotMet(companyId, env, fg.gateId, fg.reason, adapterId);
      }
      return false;
    }

    setAdapterEnvConfigs(prev =>
      prev.map(c =>
        c.adapterId === adapterId && c.environment === env
          ? { ...c, isEnabled: true, enabledAt: new Date().toISOString() }
          : c
      )
    );

    auditSandboxEnabled(companyId, env, adapterId, adapter.adapter_name);

    toast.success(`${adapter.adapter_name} habilitado en ${ENVIRONMENT_DEFINITIONS[env].label}`);
    return true;
  }, [adapters, buildGateContext, companyId]);

  // ===================== EXECUTE SANDBOX (ADVANCED SIMULATION) =====================

  const executeSandboxAdvanced = useCallback(async (params: {
    adapterId: string;
    domain: SandboxDomain;
    submissionType: string;
    referencePeriod?: string;
    payload: Record<string, unknown>;
    relatedDryRunId?: string;
    relatedApprovalId?: string;
  }): Promise<SandboxExecutionRecord | null> => {
    // Hard block on production
    if (activeEnvironment === 'production') {
      toast.error('Ejecución en producción BLOQUEADA');
      return null;
    }

    const adapter = adapters.find(a => a.id === params.adapterId);
    if (!adapter) {
      toast.error('Conector no encontrado');
      return null;
    }

    // Check eligibility first
    const eligibility = evaluateEligibility(params.domain, params.adapterId);
    if (eligibility.eligibility === 'not_eligible') {
      toast.error('No elegible para sandbox', {
        description: eligibility.blockers.map(b => b.detail).join('. '),
      });
      return null;
    }

    setIsLoading(true);

    try {
      const request: SandboxExecutionRequest = {
        domain: params.domain,
        adapterId: params.adapterId,
        adapterName: adapter.adapter_name,
        companyId,
        legalEntityId: null,
        environment: activeEnvironment,
        submissionType: params.submissionType,
        referencePeriod: params.referencePeriod || null,
        payload: params.payload,
        executedBy: 'current_user',
        relatedDryRunId: params.relatedDryRunId || null,
        relatedApprovalId: params.relatedApprovalId || null,
      };

      const record = await executeSandboxSimulation(request);

      // Persist record in state and DB
      setExecutionRecords(prev => [record, ...prev]);
      
      // T9: Persist to database
      persistence.persistRecord(record).then(ok => {
        if (ok) {
          console.log('[useSandboxEnvironment] Record persisted to DB:', record.id);
        } else {
          console.warn('[useSandboxEnvironment] Failed to persist record to DB:', record.id);
        }
      });

      // Also add to legacy executions for backward compat
      const legacyExec = createSandboxExecution({
        adapterId: params.adapterId,
        environment: activeEnvironment,
        executionType: 'sandbox_submit',
        submissionType: params.submissionType,
        domain: params.domain,
        payloadHash: record.payloadHash,
        initiatedBy: 'current_user',
      });
      const completed = completeExecution(legacyExec, {
        statusCode: record.result?.simulatedOrganismResponse?.code === '0000' ? 200 : 400,
        accepted: record.status === 'completed',
        errors: record.result?.structuralErrors.map(e => e.message) || [],
        warnings: record.result?.fieldWarnings.map(w => w.message) || [],
      });
      setExecutions(prev => [completed, ...prev]);

      // Centralized audit: execution attempted + completed/failed
      await auditExecutionAttempted(companyId, activeEnvironment, params.adapterId, params.domain, record.id);
      if (record.status === 'completed') {
        await auditExecutionCompleted(companyId, activeEnvironment, params.adapterId, params.domain, record.id, record.result?.payloadConformance || 0);
      } else {
        await auditExecutionFailed(companyId, activeEnvironment, params.adapterId, params.domain, record.id, record.result?.structuralErrors.map(e => e.message).join('; ') || 'Unknown');
      }

      if (record.status === 'completed') {
        toast.success(`Ejecución sandbox ${params.domain} completada`, {
          description: `Conformidad: ${record.result?.payloadConformance}% — ${record.result?.executionStages.filter(s => s.status === 'passed').length}/${record.result?.executionStages.length} etapas OK`,
        });
      } else {
        toast.warning(`Ejecución sandbox ${params.domain} con errores`, {
          description: record.result?.structuralErrors.map(e => e.message).join('. ') || 'Error desconocido',
        });
      }

      return record;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error en ejecución sandbox', { description: msg });

      await auditExecutionFailed(companyId, activeEnvironment, params.adapterId, params.domain, 'error', msg);

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [activeEnvironment, adapters, companyId, evaluateEligibility]);

  // ===================== AUDIT (delegated to sandboxAuditHelper) =====================

  const logSandboxAudit = useCallback(async (
    eventType: string,
    metadata: Record<string, unknown>
  ) => {
    await logSandboxAuditEvent(eventType as any, {
      companyId,
      environment: (metadata.environment as ConnectorEnvironment) || activeEnvironment,
      adapterId: metadata.adapterId as string | undefined,
      adapterName: metadata.adapterName as string | undefined,
      executionId: metadata.executionId as string | undefined,
      metadata,
    });
  }, [companyId, activeEnvironment]);

  // ===================== SUMMARY =====================

  const summary = useMemo((): EnvironmentSummary => {
    const base = buildEnvironmentSummary(adapterEnvConfigs);
    return { ...base, activeEnvironment };
  }, [adapterEnvConfigs, activeEnvironment]);

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
    executionRecords,
    eligibilityResults,
    disclaimersAccepted,
    isLoading,

    // Persistence (T9)
    persistedHistory: persistence.history,
    persistedHistoryLoading: persistence.isLoading,
    persistedHistoryCount: persistence.totalCount,
    fetchPersistedHistory: persistence.fetchHistory,
    getPersistedRecord: persistence.getRecord,
    getLatestForDomain: persistence.getLatestForDomain,

    // Actions
    switchEnvironment,
    enableAdapterInEnvironment,
    executeSandboxAdvanced,
    evaluateEligibility,
    getEligibility,
    acceptDisclaimers,
    loadEnvironmentConfigs,

    // Safety
    isRealSubmissionBlocked: isRealSubmissionBlocked(),
    productionBlocked: true,
  };
}
