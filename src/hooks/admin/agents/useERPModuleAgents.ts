/**
 * useERPModuleAgents - Hook para gestión de agentes especializados por módulo ERP
 * Arquitectura híbrida: Supervisor → Agentes de Dominio → Sub-agentes de Módulo
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Importar tipos y configuración desde archivos separados
import type {
  AgentDomain,
  ModuleAgent,
  DomainAgent,
  SupervisorStatus,
  SupervisorInsight,
  AgentCommunication,
  AgentConfigUpdate,
  InsightPriority
} from './erpAgentTypes';

import { DOMAIN_CONFIG, MODULE_AGENT_CONFIG, AUTONOMOUS_ACTIONS } from './erpAgentConfig';

// Re-exportar tipos para compatibilidad
export type { 
  AgentDomain, 
  ModuleAgentType, 
  ModuleAgent, 
  DomainAgent, 
  SupervisorStatus, 
  SupervisorInsight, 
  AgentCommunication 
} from './erpAgentTypes';

export { DOMAIN_CONFIG, MODULE_AGENT_CONFIG } from './erpAgentConfig';

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

export function useERPModuleAgents() {
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [domainAgents, setDomainAgents] = useState<DomainAgent[]>([]);
  const [supervisorStatus, setSupervisorStatus] = useState<SupervisorStatus | null>(null);
  const [communications, setCommunications] = useState<AgentCommunication[]>([]);
  const [insights, setInsights] = useState<SupervisorInsight[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refs
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const autonomousInterval = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // === INICIALIZAR AGENTES ===
  const initializeAgents = useCallback(async (): Promise<DomainAgent[] | null> => {
    setIsLoading(true);

    try {
      // Generar estructura de agentes basada en configuración
      const domains: DomainAgent[] = Object.entries(DOMAIN_CONFIG).map(([domainKey, config]) => {
        const moduleAgents: ModuleAgent[] = config.moduleTypes.map(moduleType => {
          const moduleConfig = MODULE_AGENT_CONFIG[moduleType];
          return {
            id: `agent_${domainKey}_${moduleType}`,
            domain: domainKey as AgentDomain,
            type: moduleType,
            name: moduleConfig.name,
            description: moduleConfig.description,
            status: 'idle' as const,
            capabilities: moduleConfig.capabilities,
            metrics: {},
            lastActivity: new Date().toISOString(),
            healthScore: 100,
            confidenceThreshold: 80,
            executionMode: 'supervised' as const,
            priority: moduleConfig.defaultPriority
          };
        });

        return {
          id: `domain_${domainKey}`,
          domain: domainKey as AgentDomain,
          name: config.name,
          description: config.description,
          status: 'idle' as const,
          moduleAgents,
          metrics: {
            totalActions: 0,
            successRate: 100,
            avgResponseTime: 0,
            activeModules: 0
          },
          lastCoordination: new Date().toISOString()
        };
      });

      if (!isMountedRef.current) return null;

      setDomainAgents(domains);

      // Inicializar supervisor
      setSupervisorStatus({
        status: 'running',
        activeDomains: domains.length,
        activeAgents: domains.reduce((sum, d) => sum + d.moduleAgents.length, 0),
        pendingDecisions: 0,
        conflictsResolved: 0,
        lastOptimization: new Date().toISOString(),
        systemHealth: 98,
        resourceUtilization: 45,
        learningProgress: 72,
        predictiveInsights: [],
        autonomousMode: false,
        autonomousIntervalMs: 60000
      });

      setLastRefresh(new Date());
      return domains;
    } catch (error) {
      console.error('[useERPModuleAgents] initializeAgents error:', error);
      toast.error('Error al inicializar agentes');
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // === EJECUTAR AGENTE DE MÓDULO ===
  const executeModuleAgent = useCallback(async (
    agentId: string,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> => {
    setIsLoading(true);

    try {
      // Encontrar el agente
      let targetAgent: ModuleAgent | null = null;
      let targetDomain: DomainAgent | null = null;

      for (const domain of domainAgents) {
        const agent = domain.moduleAgents.find(a => a.id === agentId);
        if (agent) {
          targetAgent = agent;
          targetDomain = domain;
          break;
        }
      }

      if (!targetAgent || !targetDomain) {
        throw new Error('Agente no encontrado');
      }

      // Actualizar estado a analyzing
      setDomainAgents(prev => prev.map(d => ({
        ...d,
        moduleAgents: d.moduleAgents.map(a => 
          a.id === agentId ? { ...a, status: 'analyzing' as const } : a
        )
      })));

      // Llamar a edge function del agente
      const { data, error } = await supabase.functions.invoke('erp-module-agent', {
        body: {
          action: 'execute',
          agentType: targetAgent.type,
          domain: targetAgent.domain,
          context,
          capabilities: targetAgent.capabilities
        }
      });

      if (error) throw error;

      if (!isMountedRef.current) return null;

      const targetDomainId = targetDomain.id;

      // Actualizar estado y métricas
      setDomainAgents(prev => prev.map(d => ({
        ...d,
        moduleAgents: d.moduleAgents.map(a => 
          a.id === agentId ? { 
            ...a, 
            status: 'active' as const,
            lastActivity: new Date().toISOString(),
            metrics: (data as Record<string, unknown>)?.metrics as Record<string, number | string> || a.metrics
          } : a
        ),
        metrics: d.id === targetDomainId ? {
          ...d.metrics,
          totalActions: d.metrics.totalActions + 1
        } : d.metrics
      })));

      toast.success(`${targetAgent.name} ejecutado correctamente`);
      return data as Record<string, unknown>;
    } catch (error) {
      console.error('[useERPModuleAgents] executeModuleAgent error:', error);
      
      // Marcar como error
      setDomainAgents(prev => prev.map(d => ({
        ...d,
        moduleAgents: d.moduleAgents.map(a => 
          a.id === agentId ? { ...a, status: 'error' as const } : a
        )
      })));

      toast.error('Error al ejecutar agente');
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [domainAgents]);

  // === COORDINAR DOMINIO ===
  const coordinateDomain = useCallback(async (
    domainId: string,
    objective: string
  ): Promise<Record<string, unknown> | null> => {
    setIsLoading(true);

    try {
      const domain = domainAgents.find(d => d.id === domainId);
      if (!domain) throw new Error('Dominio no encontrado');

      // Actualizar estado del dominio
      setDomainAgents(prev => prev.map(d => 
        d.id === domainId ? { ...d, status: 'coordinating' as const } : d
      ));

      // Llamar a edge function de coordinación
      const { data, error } = await supabase.functions.invoke('erp-module-agent', {
        body: {
          action: 'coordinate_domain',
          domain: domain.domain,
          objective,
          moduleAgents: domain.moduleAgents.map(a => ({
            id: a.id,
            type: a.type,
            status: a.status,
            capabilities: a.capabilities
          }))
        }
      });

      if (error) throw error;

      if (!isMountedRef.current) return null;

      // Actualizar estado
      setDomainAgents(prev => prev.map(d => 
        d.id === domainId ? { 
          ...d, 
          status: 'active' as const,
          lastCoordination: new Date().toISOString()
        } : d
      ));

      toast.success(`Coordinación de ${domain.name} completada`);
      return data as Record<string, unknown>;
    } catch (error) {
      console.error('[useERPModuleAgents] coordinateDomain error:', error);
      toast.error('Error en coordinación de dominio');
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [domainAgents]);

  // === SUPERVISOR: ORQUESTAR TODOS ===
  const supervisorOrchestrate = useCallback(async (
    objective: string,
    priority?: InsightPriority
  ): Promise<Record<string, unknown> | null> => {
    setIsLoading(true);

    try {
      setSupervisorStatus(prev => prev ? { ...prev, status: 'coordinating' } : prev);

      const { data, error } = await supabase.functions.invoke('erp-module-agent', {
        body: {
          action: 'supervisor_orchestrate',
          objective,
          priority: priority || 'medium',
          domains: domainAgents.map(d => ({
            id: d.id,
            domain: d.domain,
            status: d.status,
            activeModules: d.moduleAgents.filter(a => a.status === 'active').length
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

      const nextInsights = payload?.insights as SupervisorInsight[] | undefined;

      // Actualizar insights del supervisor
      if (Array.isArray(nextInsights)) {
        setInsights(nextInsights);
        setSupervisorStatus(prev => prev ? {
          ...prev,
          status: 'running',
          predictiveInsights: nextInsights,
          lastOptimization: new Date().toISOString()
        } : prev);
      } else {
        setSupervisorStatus(prev => prev ? { ...prev, status: 'running' } : prev);
      }

      toast.success('Orquestación del supervisor completada');
      return payload;
    } catch (error) {
      console.error('[useERPModuleAgents] supervisorOrchestrate error:', error);
      toast.error('Error en orquestación');
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [domainAgents]);

  // === OBTENER INSIGHTS PREDICTIVOS ===
  const fetchPredictiveInsights = useCallback(async (): Promise<SupervisorInsight[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-module-agent', {
        body: {
          action: 'get_predictive_insights',
          currentState: {
            domains: domainAgents.map(d => ({
              domain: d.domain,
              metrics: d.metrics,
              agentStatuses: d.moduleAgents.map(a => a.status)
            }))
          }
        }
      });

      if (error) throw error;

      if (!isMountedRef.current) return [];

      const responseData = data as Record<string, unknown>;
      const insightsData = responseData?.insights as SupervisorInsight[] | undefined;

      if (Array.isArray(insightsData)) {
        setInsights(insightsData);
        return insightsData;
      }

      return [];
    } catch (error) {
      console.error('[useERPModuleAgents] fetchPredictiveInsights error:', error);
      return [];
    }
  }, [domainAgents]);

  // === CONFIGURAR AGENTE ===
  const configureAgent = useCallback(async (
    agentId: string,
    config: AgentConfigUpdate
  ): Promise<void> => {
    setDomainAgents(prev => prev.map(d => ({
      ...d,
      moduleAgents: d.moduleAgents.map(a => 
        a.id === agentId ? { ...a, ...config } : a
      )
    })));

    toast.success('Configuración actualizada');
  }, []);

  // === TOGGLE AGENTE ===
  const toggleAgent = useCallback(async (agentId: string, active: boolean): Promise<void> => {
    setDomainAgents(prev => prev.map(d => ({
      ...d,
      moduleAgents: d.moduleAgents.map(a => 
        a.id === agentId ? { 
          ...a, 
          status: active ? 'idle' as const : 'paused' as const 
        } : a
      )
    })));

    toast.success(active ? 'Agente activado' : 'Agente pausado');
  }, []);

  // === AUTO-REFRESH ===
  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  const startAutoRefresh = useCallback((intervalMs = 60000) => {
    stopAutoRefresh();
    initializeAgents();
    autoRefreshInterval.current = setInterval(() => {
      fetchPredictiveInsights();
    }, intervalMs);
  }, [stopAutoRefresh, initializeAgents, fetchPredictiveInsights]);

  // === MODO AUTÓNOMO DEL SUPERVISOR ===
  const runAutonomousCycle = useCallback(async (): Promise<void> => {
    const randomIndex = Math.floor(Math.random() * AUTONOMOUS_ACTIONS.length);
    const randomAction = AUTONOMOUS_ACTIONS[randomIndex];
    console.log('[Supervisor Autónomo] Ejecutando ciclo:', randomAction);
    await supervisorOrchestrate(randomAction, 'medium');
  }, [supervisorOrchestrate]);

  const toggleAutonomousMode = useCallback((enabled: boolean, intervalMs: number = 60000): void => {
    // Limpiar intervalo anterior si existe
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
      toast.success(`Modo autónomo activado (cada ${Math.round(intervalMs / 1000)}s)`);
    } else {
      toast.info('Modo autónomo desactivado');
    }
  }, [runAutonomousCycle]);

  // === CLEANUP ===
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      stopAutoRefresh();
      if (autonomousInterval.current) {
        clearInterval(autonomousInterval.current);
      }
    };
  }, [stopAutoRefresh]);

  // === RETURN ===
  return {
    // Estado
    isLoading,
    domainAgents,
    supervisorStatus,
    communications,
    insights,
    lastRefresh,
    // Configuración
    DOMAIN_CONFIG,
    MODULE_AGENT_CONFIG,
    // Acciones
    initializeAgents,
    executeModuleAgent,
    coordinateDomain,
    supervisorOrchestrate,
    fetchPredictiveInsights,
    configureAgent,
    toggleAgent,
    toggleAutonomousMode,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useERPModuleAgents;
