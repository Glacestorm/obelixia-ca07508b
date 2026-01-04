/**
 * useCRMAgents - Hook para gestión de agentes CRM ultra-especializados
 * Arquitectura: Supervisor General → Agentes CRM Especializados
 * Tendencias 2025-2027: Agentic AI, Multi-agent orchestration, Autonomous decision-making
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import type {
  CRMModuleType,
  CRMModuleAgent,
  CRMAgentMetrics,
  AgentConversation,
  AgentAction,
  SupervisorGeneralConfig,
  SupervisorPrediction,
  SupervisorCommand,
  AgentMessage,
  AgentDashboardStats,
  CRMAgentExecutionResult,
  AgentInstructionRequest,
  AgentInstructionResponse,
} from './crmAgentTypes';

import { CRM_MODULE_CONFIG, CRM_AUTONOMOUS_ACTIONS } from './crmAgentConfig';

// Re-exportar tipos y configuración
export type { CRMModuleType, CRMModuleAgent, SupervisorGeneralConfig, AgentDashboardStats };
export { CRM_MODULE_CONFIG };

// === HELPER FUNCTIONS ===

const generateDefaultMetrics = (): CRMAgentMetrics => ({
  tasksCompleted: 0,
  tasksInProgress: 0,
  successRate: 95 + Math.random() * 5,
  avgResponseTimeMs: 150 + Math.random() * 100,
  errorRate: Math.random() * 2,
  conversionImpact: Math.random() * 15,
  revenueImpacted: Math.floor(Math.random() * 50000),
  timesSaved: Math.random() * 10,
  predictionsAccuracy: 85 + Math.random() * 10,
  recommendationsAccepted: 70 + Math.random() * 25,
  autonomousDecisions: Math.floor(Math.random() * 50),
  learningScore: 75 + Math.random() * 20,
});

// === HOOK PRINCIPAL ===

export function useCRMAgents() {
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<CRMModuleAgent[]>([]);
  const [supervisor, setSupervisor] = useState<SupervisorGeneralConfig | null>(null);
  const [dashboardStats, setDashboardStats] = useState<AgentDashboardStats | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refs para estabilidad
  const isMountedRef = useRef(true);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const autonomousInterval = useRef<NodeJS.Timeout | null>(null);
  const agentsRef = useRef<CRMModuleAgent[]>([]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  // === INICIALIZAR AGENTES CRM ===
  const initializeAgents = useCallback(async () => {
    if (!isMountedRef.current) return null;
    setIsLoading(true);

    try {
      const crmAgents: CRMModuleAgent[] = Object.entries(CRM_MODULE_CONFIG).map(
        ([moduleType, config]) => ({
          id: `crm_agent_${moduleType}`,
          moduleType: moduleType as CRMModuleType,
          name: config.name,
          description: config.description,
          systemPrompt: config.systemPrompt,
          status: 'idle' as const,
          capabilities: config.capabilities,
          confidenceThreshold: config.defaultConfidence,
          executionMode: 'supervised' as const,
          priority: config.defaultPriority,
          maxActionsPerHour: config.maxActionsPerHour,
          metrics: generateDefaultMetrics(),
          healthScore: 90 + Math.random() * 10,
          lastActivity: new Date().toISOString(),
          lastLearning: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          conversationHistory: [],
          recentActions: [],
          collaboratingAgents: config.collaboratingModules.map(m => `crm_agent_${m}`),
        })
      );

      if (!isMountedRef.current) return null;
      setAgents(crmAgents);

      // Inicializar supervisor general
      const supervisorConfig: SupervisorGeneralConfig = {
        id: 'supervisor_general',
        name: 'Supervisor General IA',
        status: 'running',
        autonomousMode: false,
        autonomousIntervalMs: 60000,
        registeredAgents: crmAgents.map(a => a.id),
        activeDomains: ['crm'],
        globalConfidenceThreshold: 75,
        maxConcurrentOperations: 10,
        escalationPolicy: 'smart',
        systemHealth: 95 + Math.random() * 5,
        resourceUtilization: 40 + Math.random() * 30,
        totalAgentsManaged: crmAgents.length,
        decisionsToday: Math.floor(Math.random() * 100),
        conflictsResolved: Math.floor(Math.random() * 20),
        learningProgress: 70 + Math.random() * 25,
        crossAgentPatterns: [],
        predictiveInsights: [],
      };

      setSupervisor(supervisorConfig);
      calculateDashboardStats(crmAgents);
      setLastRefresh(new Date());

      return crmAgents;
    } catch (error) {
      console.error('[useCRMAgents] initializeAgents error:', error);
      toast.error('Error al inicializar agentes CRM');
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // === CALCULAR ESTADÍSTICAS DEL DASHBOARD ===
  const calculateDashboardStats = useCallback((currentAgents: CRMModuleAgent[]) => {
    const stats: AgentDashboardStats = {
      totalAgents: currentAgents.length,
      activeAgents: currentAgents.filter(a => a.status === 'active' || a.status === 'processing').length,
      processingAgents: currentAgents.filter(a => a.status === 'processing').length,
      errorAgents: currentAgents.filter(a => a.status === 'error').length,
      avgHealthScore: currentAgents.reduce((sum, a) => sum + a.healthScore, 0) / currentAgents.length,
      avgSuccessRate: currentAgents.reduce((sum, a) => sum + a.metrics.successRate, 0) / currentAgents.length,
      totalTasksToday: currentAgents.reduce((sum, a) => sum + a.metrics.tasksCompleted, 0),
      totalDecisionsAutonomous: currentAgents.reduce((sum, a) => sum + a.metrics.autonomousDecisions, 0),
      totalRevenueImpacted: currentAgents.reduce((sum, a) => sum + a.metrics.revenueImpacted, 0),
      totalTimeSaved: currentAgents.reduce((sum, a) => sum + a.metrics.timesSaved, 0),
      conversionImprovement: currentAgents.reduce((sum, a) => sum + a.metrics.conversionImpact, 0) / currentAgents.length,
      healthTrend: 'stable',
      performanceTrend: 'improving',
      moduleStats: {} as AgentDashboardStats['moduleStats'],
    };

    // Stats por módulo
    currentAgents.forEach(agent => {
      stats.moduleStats[agent.moduleType] = {
        status: agent.status,
        healthScore: agent.healthScore,
        tasksCompleted: agent.metrics.tasksCompleted,
      };
    });

    setDashboardStats(stats);
  }, []);

  // === EJECUTAR INSTRUCCIÓN A AGENTE ===
  const sendInstructionToAgent = useCallback(async (
    request: AgentInstructionRequest
  ): Promise<AgentInstructionResponse | null> => {
    if (!isMountedRef.current) return null;
    setIsLoading(true);

    const agent = agents.find(a => a.id === request.agentId);
    if (!agent) {
      toast.error('Agente no encontrado');
      setIsLoading(false);
      return null;
    }

    try {
      // Actualizar estado del agente a processing
      setAgents(prev => prev.map(a =>
        a.id === request.agentId ? { ...a, status: 'processing' as const } : a
      ));

      // Añadir mensaje a historial
      const userMessage: AgentConversation = {
        id: `msg_${Date.now()}`,
        timestamp: new Date().toISOString(),
        role: 'user',
        content: request.instruction,
        context: JSON.stringify(request.context || {}),
      };

      const { data, error } = await supabase.functions.invoke('crm-agent-orchestrator', {
        body: {
          action: 'execute_instruction',
          agentId: request.agentId,
          moduleType: agent.moduleType,
          instruction: request.instruction,
          context: request.context,
          systemPrompt: agent.systemPrompt,
          capabilities: agent.capabilities,
        }
      });

      if (error) throw error;
      if (!isMountedRef.current) return null;

      const responseData = data as Record<string, unknown>;

      // Crear respuesta del agente
      const agentMessage: AgentConversation = {
        id: `msg_${Date.now() + 1}`,
        timestamp: new Date().toISOString(),
        role: 'agent',
        content: (responseData?.response as string) || 'Instrucción procesada.',
        confidenceScore: (responseData?.confidenceScore as number) || 85,
        actionTaken: (responseData?.actionTaken as string) || undefined,
      };

      // Actualizar agente con nuevo historial y estado
      setAgents(prev => prev.map(a =>
        a.id === request.agentId ? {
          ...a,
          status: 'active' as const,
          lastActivity: new Date().toISOString(),
          conversationHistory: [...a.conversationHistory.slice(-20), userMessage, agentMessage],
          metrics: {
            ...a.metrics,
            tasksCompleted: a.metrics.tasksCompleted + 1,
          }
        } : a
      ));

      const result: AgentInstructionResponse = {
        success: true,
        agentId: request.agentId,
        response: agentMessage.content,
        confidenceScore: agentMessage.confidenceScore || 85,
        executionTimeMs: (responseData?.executionTimeMs as number) || 500,
        recommendations: (responseData?.recommendations as string[]) || [],
      };

      toast.success(`${agent.name} ha procesado la instrucción`);
      return result;
    } catch (error) {
      console.error('[useCRMAgents] sendInstructionToAgent error:', error);
      
      if (isMountedRef.current) {
        setAgents(prev => prev.map(a =>
          a.id === request.agentId ? { ...a, status: 'error' as const } : a
        ));
        toast.error('Error al procesar instrucción');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [agents]);

  // === ENVIAR INSTRUCCIÓN AL SUPERVISOR ===
  const sendInstructionToSupervisor = useCallback(async (
    instruction: string,
    targetAgents?: string[]
  ): Promise<SupervisorCommand | null> => {
    if (!isMountedRef.current || !supervisor) return null;
    setIsLoading(true);

    try {
      setSupervisor(prev => prev ? { ...prev, status: 'coordinating' } : prev);

      const { data, error } = await supabase.functions.invoke('crm-agent-orchestrator', {
        body: {
          action: 'supervisor_instruction',
          instruction,
          targetAgents: targetAgents || supervisor.registeredAgents,
          currentState: {
            agents: agentsRef.current.map(a => ({
              id: a.id,
              moduleType: a.moduleType,
              status: a.status,
              healthScore: a.healthScore,
            })),
          },
        }
      });

      if (error) throw error;
      if (!isMountedRef.current) return null;

      const responseData = data as Record<string, unknown>;

      // Actualizar insights predictivos si los hay
      if (responseData?.insights) {
        setSupervisor(prev => prev ? {
          ...prev,
          status: 'running',
          predictiveInsights: responseData.insights as SupervisorPrediction[],
          decisionsToday: prev.decisionsToday + 1,
        } : prev);
      } else {
        setSupervisor(prev => prev ? { ...prev, status: 'running' } : prev);
      }

      const command: SupervisorCommand = {
        id: `cmd_${Date.now()}`,
        timestamp: new Date().toISOString(),
        commandType: 'instruction',
        content: instruction,
        status: 'executed',
        response: (responseData?.response as string) || 'Instrucción ejecutada.',
        executionTimeMs: (responseData?.executionTimeMs as number) || 1000,
      };

      toast.success('Supervisor ha procesado la instrucción');
      return command;
    } catch (error) {
      console.error('[useCRMAgents] sendInstructionToSupervisor error:', error);
      
      if (isMountedRef.current) {
        setSupervisor(prev => prev ? { ...prev, status: 'idle' } : prev);
        toast.error('Error en instrucción al supervisor');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [supervisor]);

  // === EJECUTAR AGENTE ESPECÍFICO ===
  const executeAgent = useCallback(async (
    agentId: string,
    action: string,
    context?: Record<string, unknown>
  ): Promise<CRMAgentExecutionResult | null> => {
    if (!isMountedRef.current) return null;
    
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return null;

    setIsLoading(true);

    try {
      setAgents(prev => prev.map(a =>
        a.id === agentId ? { ...a, status: 'processing' as const } : a
      ));

      const { data, error } = await supabase.functions.invoke('crm-agent-orchestrator', {
        body: {
          action: 'execute_agent',
          agentId,
          moduleType: agent.moduleType,
          agentAction: action,
          context,
          capabilities: agent.capabilities,
        }
      });

      if (error) throw error;
      if (!isMountedRef.current) return null;

      const responseData = data as Record<string, unknown>;

      // Crear acción en historial
      const newAction: AgentAction = {
        id: `action_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'execute',
        description: action,
        status: 'completed',
        confidenceScore: (responseData?.confidenceScore as number) || 85,
        wasAutonomous: agent.executionMode === 'autonomous',
        result: responseData?.result as Record<string, unknown>,
      };

      setAgents(prev => prev.map(a =>
        a.id === agentId ? {
          ...a,
          status: 'active' as const,
          lastActivity: new Date().toISOString(),
          recentActions: [...a.recentActions.slice(-10), newAction],
          metrics: {
            ...a.metrics,
            tasksCompleted: a.metrics.tasksCompleted + 1,
            autonomousDecisions: agent.executionMode === 'autonomous' 
              ? a.metrics.autonomousDecisions + 1 
              : a.metrics.autonomousDecisions,
          }
        } : a
      ));

      return {
        success: true,
        agentId,
        moduleType: agent.moduleType,
        action,
        result: responseData?.result as Record<string, unknown>,
        recommendations: responseData?.recommendations as string[],
        confidenceScore: newAction.confidenceScore,
        executionTimeMs: (responseData?.executionTimeMs as number) || 500,
      };
    } catch (error) {
      console.error('[useCRMAgents] executeAgent error:', error);
      
      if (isMountedRef.current) {
        setAgents(prev => prev.map(a =>
          a.id === agentId ? { ...a, status: 'error' as const } : a
        ));
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [agents]);

  // === CONFIGURAR AGENTE ===
  const configureAgent = useCallback((
    agentId: string,
    config: Partial<Pick<CRMModuleAgent, 'confidenceThreshold' | 'executionMode' | 'priority' | 'maxActionsPerHour'>>
  ) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, ...config } : a
    ));
    toast.success('Configuración del agente actualizada');
  }, []);

  // === TOGGLE AGENTE ===
  const toggleAgent = useCallback((agentId: string, active: boolean) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { 
        ...a, 
        status: active ? 'idle' as const : 'paused' as const 
      } : a
    ));
    toast.success(active ? 'Agente activado' : 'Agente pausado');
  }, []);

  // === REGISTRAR NUEVO AGENTE (para nuevos módulos) ===
  const registerNewAgent = useCallback((
    moduleType: string,
    config: {
      name: string;
      description: string;
      systemPrompt: string;
      capabilities: CRMModuleAgent['capabilities'];
    }
  ) => {
    const newAgent: CRMModuleAgent = {
      id: `crm_agent_${moduleType}`,
      moduleType: moduleType as CRMModuleType,
      name: config.name,
      description: config.description,
      systemPrompt: config.systemPrompt,
      status: 'idle',
      capabilities: config.capabilities,
      confidenceThreshold: 75,
      executionMode: 'supervised',
      priority: 3,
      maxActionsPerHour: 50,
      metrics: generateDefaultMetrics(),
      healthScore: 100,
      lastActivity: new Date().toISOString(),
      lastLearning: new Date().toISOString(),
      conversationHistory: [],
      recentActions: [],
      collaboratingAgents: [],
    };

    setAgents(prev => [...prev, newAgent]);

    // Registrar en supervisor
    setSupervisor(prev => prev ? {
      ...prev,
      registeredAgents: [...prev.registeredAgents, newAgent.id],
      totalAgentsManaged: prev.totalAgentsManaged + 1,
    } : prev);

    toast.success(`Agente ${config.name} registrado correctamente`);
    return newAgent;
  }, []);

  // === AUTO-REFRESH ESTABLE ===
  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  const initializeAgentsRef = useRef(initializeAgents);
  useEffect(() => {
    initializeAgentsRef.current = initializeAgents;
  }, [initializeAgents]);

  const startAutoRefresh = useCallback((intervalMs = 60000) => {
    stopAutoRefresh();
    initializeAgentsRef.current();
    autoRefreshInterval.current = setInterval(() => {
      if (isMountedRef.current) {
        // Actualizar métricas simuladas
        setAgents(prev => prev.map(a => ({
          ...a,
          metrics: {
            ...a.metrics,
            tasksCompleted: a.metrics.tasksCompleted + Math.floor(Math.random() * 3),
            successRate: Math.min(100, a.metrics.successRate + (Math.random() - 0.3) * 0.5),
          },
          healthScore: Math.min(100, Math.max(70, a.healthScore + (Math.random() - 0.3) * 2)),
        })));
        setLastRefresh(new Date());
      }
    }, intervalMs);
  }, [stopAutoRefresh]);

  // === MODO AUTÓNOMO ===
  const runAutonomousCycle = useCallback(async () => {
    if (!isMountedRef.current || !supervisor) return;
    
    const randomAction = CRM_AUTONOMOUS_ACTIONS[
      Math.floor(Math.random() * CRM_AUTONOMOUS_ACTIONS.length)
    ];
    console.log('[CRM Supervisor Autónomo] Ejecutando:', randomAction);
    await sendInstructionToSupervisor(randomAction);
  }, [supervisor, sendInstructionToSupervisor]);

  const toggleAutonomousMode = useCallback((enabled: boolean, intervalMs = 60000) => {
    if (autonomousInterval.current) {
      clearInterval(autonomousInterval.current);
      autonomousInterval.current = null;
    }

    setSupervisor(prev => prev ? {
      ...prev,
      autonomousMode: enabled,
      autonomousIntervalMs: intervalMs,
    } : prev);

    if (enabled && isMountedRef.current) {
      runAutonomousCycle();
      autonomousInterval.current = setInterval(() => {
        if (isMountedRef.current) {
          runAutonomousCycle();
        }
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
        autonomousInterval.current = null;
      }
    };
  }, [stopAutoRefresh]);

  // === RETURN ===
  return {
    // Estado
    isLoading,
    agents,
    supervisor,
    dashboardStats,
    lastRefresh,
    
    // Acciones de agentes
    initializeAgents,
    sendInstructionToAgent,
    executeAgent,
    configureAgent,
    toggleAgent,
    registerNewAgent,
    
    // Acciones de supervisor
    sendInstructionToSupervisor,
    toggleAutonomousMode,
    
    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useCRMAgents;
