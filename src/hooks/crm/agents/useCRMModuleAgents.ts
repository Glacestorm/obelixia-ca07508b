/**
 * useCRMModuleAgents - Hook para gestión de agentes especializados CRM
 * Arquitectura: Supervisor General → Agentes CRM Especializados
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import type {
  CRMModuleType,
  CRMModuleAgent,
  CRMAgentInsight,
  CRMSupervisorStatus,
  CRMAgentCommunication,
  CRMInsightPriority,
  CRMExecutionMode
} from './crmAgentTypes';

import { CRM_AGENT_CONFIG, CRM_AUTONOMOUS_ACTIONS } from './crmAgentTypes';

// Re-exportar tipos
export type {
  CRMModuleType,
  CRMModuleAgent,
  CRMAgentInsight,
  CRMSupervisorStatus,
  CRMAgentCommunication
} from './crmAgentTypes';

export { CRM_AGENT_CONFIG } from './crmAgentTypes';

// === HELPER: Parse JSON from raw content ===
function parseJsonFromRawContent(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// === HOOK PRINCIPAL ===

export function useCRMModuleAgents() {
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<CRMModuleAgent[]>([]);
  const [supervisorStatus, setSupervisorStatus] = useState<CRMSupervisorStatus | null>(null);
  const [communications, setCommunications] = useState<CRMAgentCommunication[]>([]);
  const [insights, setInsights] = useState<CRMAgentInsight[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refs
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const autonomousInterval = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // === INICIALIZAR AGENTES ===
  const initializeAgents = useCallback(async (): Promise<CRMModuleAgent[] | null> => {
    setIsLoading(true);

    try {
      // Generar estructura de agentes basada en configuración
      const moduleAgents: CRMModuleAgent[] = Object.entries(CRM_AGENT_CONFIG).map(([, config]) => ({
        id: `crm_agent_${config.type}`,
        type: config.type,
        name: config.name,
        description: config.description,
        status: 'idle' as const,
        capabilities: config.capabilities,
        metrics: {
          leadsProcessed: 0,
          dealsAnalyzed: 0,
          predictionsAccuracy: 0,
          actionsGenerated: 0,
          successRate: 100,
          avgResponseTime: 0
        },
        lastActivity: new Date().toISOString(),
        healthScore: 100,
        confidenceThreshold: 80,
        executionMode: 'supervised' as CRMExecutionMode,
        priority: config.defaultPriority
      }));

      if (!isMountedRef.current) return null;

      setAgents(moduleAgents);

      // Inicializar supervisor
      setSupervisorStatus({
        status: 'running',
        activeAgents: 0,
        totalAgents: moduleAgents.length,
        pendingDecisions: 0,
        insightsGenerated: 0,
        systemHealth: 98,
        predictiveAccuracy: 87,
        lastOptimization: new Date().toISOString(),
        autonomousMode: false,
        autonomousIntervalMs: 60000,
        pipelineHealth: {
          totalDeals: 0,
          atRiskDeals: 0,
          acceleratedDeals: 0,
          forecastAccuracy: 85
        },
        insights: []
      });

      setLastRefresh(new Date());
      return moduleAgents;
    } catch (error) {
      console.error('[useCRMModuleAgents] initializeAgents error:', error);
      toast.error('Error al inicializar agentes CRM');
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // === EJECUTAR AGENTE ===
  const executeAgent = useCallback(async (
    agentId: string,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> => {
    setIsLoading(true);

    try {
      const targetAgent = agents.find(a => a.id === agentId);
      if (!targetAgent) throw new Error('Agente no encontrado');

      // Actualizar estado a analyzing
      setAgents(prev => prev.map(a =>
        a.id === agentId ? { ...a, status: 'analyzing' as const } : a
      ));

      // Llamar a edge function
      const { data, error } = await supabase.functions.invoke('crm-module-agent', {
        body: {
          action: 'execute',
          agentType: targetAgent.type,
          context,
          capabilities: targetAgent.capabilities
        }
      });

      if (error) throw error;

      if (!isMountedRef.current) return null;

      // Actualizar estado y métricas
      setAgents(prev => prev.map(a =>
        a.id === agentId ? {
          ...a,
          status: 'active' as const,
          lastActivity: new Date().toISOString(),
          metrics: {
            ...a.metrics,
            ...(data as Record<string, unknown>)?.metrics as Record<string, number> || {}
          }
        } : a
      ));

      toast.success(`${targetAgent.name} ejecutado correctamente`);
      return data as Record<string, unknown>;
    } catch (error) {
      console.error('[useCRMModuleAgents] executeAgent error:', error);

      setAgents(prev => prev.map(a =>
        a.id === agentId ? { ...a, status: 'error' as const } : a
      ));

      toast.error('Error al ejecutar agente');
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [agents]);

  // === SUPERVISOR: ORQUESTAR TODOS ===
  const supervisorOrchestrate = useCallback(async (
    objective: string,
    priority?: CRMInsightPriority
  ): Promise<Record<string, unknown> | null> => {
    setIsLoading(true);

    try {
      setSupervisorStatus(prev => prev ? { ...prev, status: 'coordinating' } : prev);

      const { data, error } = await supabase.functions.invoke('crm-module-agent', {
        body: {
          action: 'supervisor_orchestrate',
          objective,
          priority: priority || 'medium',
          agents: agents.map(a => ({
            id: a.id,
            type: a.type,
            status: a.status,
            capabilities: a.capabilities,
            metrics: a.metrics
          }))
        }
      });

      if (error) throw error;

      if (!isMountedRef.current) return null;

      // Normalizar respuesta
      let payload = data as Record<string, unknown>;
      if (payload?.rawContent && typeof payload.rawContent === 'string') {
        const parsed = parseJsonFromRawContent(payload.rawContent);
        if (parsed) payload = { ...payload, ...parsed };
      }

      const nextInsights = payload?.insights as CRMAgentInsight[] | undefined;

      if (Array.isArray(nextInsights)) {
        setInsights(nextInsights);
        setSupervisorStatus(prev => prev ? {
          ...prev,
          status: 'running',
          insights: nextInsights,
          insightsGenerated: (prev.insightsGenerated || 0) + nextInsights.length,
          lastOptimization: new Date().toISOString()
        } : prev);
      } else {
        setSupervisorStatus(prev => prev ? { ...prev, status: 'running' } : prev);
      }

      toast.success('Orquestación CRM completada');
      return payload;
    } catch (error) {
      console.error('[useCRMModuleAgents] supervisorOrchestrate error:', error);
      toast.error('Error en orquestación CRM');
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [agents]);

  // === ENVIAR MENSAJE A AGENTE ===
  const sendMessageToAgent = useCallback(async (
    agentId: string,
    message: string,
    context?: Record<string, unknown>
  ): Promise<string | null> => {
    try {
      const targetAgent = agents.find(a => a.id === agentId);
      if (!targetAgent) throw new Error('Agente no encontrado');

      const { data, error } = await supabase.functions.invoke('crm-module-agent', {
        body: {
          action: 'chat',
          agentType: targetAgent.type,
          message,
          context: {
            ...context,
            agentCapabilities: targetAgent.capabilities,
            agentDescription: targetAgent.description
          }
        }
      });

      if (error) throw error;

      const response = data as Record<string, unknown>;
      return response?.response as string || response?.message as string || null;
    } catch (error) {
      console.error('[useCRMModuleAgents] sendMessageToAgent error:', error);
      toast.error('Error al comunicar con el agente');
      return null;
    }
  }, [agents]);

  // === CONFIGURAR AGENTE ===
  const configureAgent = useCallback(async (
    agentId: string,
    config: Partial<Pick<CRMModuleAgent, 'confidenceThreshold' | 'executionMode' | 'priority'>>
  ): Promise<void> => {
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, ...config } : a
    ));

    toast.success('Configuración actualizada');
  }, []);

  // === TOGGLE AGENTE ===
  const toggleAgent = useCallback(async (agentId: string, active: boolean): Promise<void> => {
    setAgents(prev => prev.map(a =>
      a.id === agentId ? {
        ...a,
        status: active ? 'idle' as const : 'paused' as const
      } : a
    ));

    toast.success(active ? 'Agente activado' : 'Agente pausado');
  }, []);

  // === MODO AUTÓNOMO ===
  const supervisorOrchestrateRef = useRef(supervisorOrchestrate);
  useEffect(() => {
    supervisorOrchestrateRef.current = supervisorOrchestrate;
  }, [supervisorOrchestrate]);

  const runAutonomousCycle = useCallback(async (): Promise<void> => {
    const randomIndex = Math.floor(Math.random() * CRM_AUTONOMOUS_ACTIONS.length);
    const randomAction = CRM_AUTONOMOUS_ACTIONS[randomIndex];
    console.log('[CRM Supervisor Autónomo] Ejecutando ciclo:', randomAction);
    await supervisorOrchestrateRef.current(randomAction, 'medium');
  }, []);

  const toggleAutonomousMode = useCallback((enabled: boolean, intervalMs: number = 60000): void => {
    if (autonomousInterval.current) {
      clearInterval(autonomousInterval.current);
      autonomousInterval.current = null;
    }

    setSupervisorStatus(prev => prev ? {
      ...prev,
      autonomousMode: enabled,
      autonomousIntervalMs: intervalMs
    } : prev);

    if (enabled) {
      runAutonomousCycle();
      autonomousInterval.current = setInterval(() => {
        runAutonomousCycle();
      }, intervalMs);
      toast.success(`Modo autónomo CRM activado (cada ${Math.round(intervalMs / 1000)}s)`);
    } else {
      toast.info('Modo autónomo CRM desactivado');
    }
  }, [runAutonomousCycle]);

  // === CLEANUP ===
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
      if (autonomousInterval.current) {
        clearInterval(autonomousInterval.current);
      }
    };
  }, []);

  // === RETURN ===
  return {
    // Estado
    isLoading,
    agents,
    supervisorStatus,
    communications,
    insights,
    lastRefresh,
    // Configuración
    CRM_AGENT_CONFIG,
    // Acciones
    initializeAgents,
    executeAgent,
    supervisorOrchestrate,
    sendMessageToAgent,
    configureAgent,
    toggleAgent,
    toggleAutonomousMode
  };
}

export default useCRMModuleAgents;
