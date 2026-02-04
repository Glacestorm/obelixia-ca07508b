/**
 * useCrossModuleOrchestrator - Fase 10
 * Hook para orquestación IA entre módulos ERP
 * Contexto compartido y decisiones coordinadas
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export type ModuleType = 'hr' | 'legal' | 'fiscal' | 'purchases' | 'treasury' | 'inventory';
export type WorkflowType = 'sequential' | 'parallel' | 'hybrid';
export type StepStatus = 'pending' | 'executing' | 'completed' | 'failed';
export type OrchestrationStatus = 'initiated' | 'in_progress' | 'completed' | 'failed' | 'requires_intervention';

export interface OrchestrationRequest {
  operation: string;
  primaryModule: ModuleType;
  entityId?: string;
  entityType?: string;
  data: Record<string, unknown>;
  options?: {
    dryRun?: boolean;
    skipValidation?: boolean;
    priority?: 'normal' | 'high' | 'critical';
  };
}

export interface WorkflowStep {
  stepId: string;
  agent: string;
  action: string;
  status: StepStatus;
  dependencies: string[];
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  executedAt?: string;
  error?: string;
}

export interface Workflow {
  type: WorkflowType;
  steps: WorkflowStep[];
  currentStep: number;
  progress: number;
}

export interface SharedContext {
  entityId: string;
  entityType: string;
  data: Record<string, unknown>;
  lastUpdatedBy: string;
  version: number;
}

export interface AgentResponse {
  agent: string;
  response: Record<string, unknown>;
  confidence: number;
  timestamp: string;
}

export interface Conflict {
  id: string;
  agents: string[];
  conflictType: 'recommendation' | 'data' | 'priority' | 'action';
  description: string;
  status: 'open' | 'resolved' | 'escalated';
}

export interface Orchestration {
  id: string;
  operation: string;
  status: OrchestrationStatus;
  workflow: Workflow;
  sharedContext: SharedContext;
  agentResponses: AgentResponse[];
  conflicts: Conflict[];
  recommendations: string[];
  estimatedCompletion: string;
}

export interface ModuleContextData {
  module: ModuleType;
  hasData: boolean;
  lastUpdate: string;
  summary: Record<string, unknown>;
}

export interface CrossReference {
  fromModule: string;
  toModule: string;
  relationship: string;
  linkedEntities: string[];
}

export interface PendingSync {
  module: string;
  field: string;
  currentValue: unknown;
  proposedValue: unknown;
  source: string;
}

export interface SharedContextResult {
  entityId: string;
  entityType: string;
  modules: Record<string, ModuleContextData>;
  crossReferences: CrossReference[];
  pendingSync: PendingSync[];
  contextVersion: number;
  lastConsolidation: string;
}

export interface AgentCoordination {
  sessionId: string;
  initiatedAt: string;
  agents: AgentInfo[];
  communicationLog: CommunicationEntry[];
  consolidatedResult: {
    status: 'success' | 'partial' | 'failed';
    outputs: Record<string, unknown>;
    conflicts: Conflict[];
    recommendations: string[];
  };
  performance: {
    totalDuration: number;
    agentDurations: Record<string, number>;
    bottlenecks: string[];
  };
}

export interface AgentInfo {
  agentId: string;
  agentType: string;
  assignedTask: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  priority: number;
  timeout: number;
  retries: number;
}

export interface CommunicationEntry {
  timestamp: string;
  from: string;
  to: string;
  messageType: 'request' | 'response' | 'notification';
  content: Record<string, unknown>;
}

export interface ConflictResolution {
  conflictId: string;
  agents: string[];
  conflictType: string;
  description: string;
  positions: ConflictPosition[];
  resolution: {
    decision: string;
    selectedPosition: string;
    rationale: string;
    appliedRules: string[];
    overrides: Record<string, unknown>;
    compensatingActions: string[];
  };
  escalation: {
    required: boolean;
    level: number;
    assignedTo: string[];
    deadline: string;
  };
  impact: {
    affectedModules: string[];
    riskLevel: string;
    mitigationRequired: boolean;
  };
}

export interface ConflictPosition {
  agent: string;
  position: string;
  rationale: string;
  confidence: number;
  legalBasis: string;
}

export interface DependencyAnalysis {
  operation: string;
  primaryModule: string;
  dependencyGraph: {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
  };
  criticalPath: string[];
  blockers: Blocker[];
  parallelizable: string[][];
  estimatedDuration: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
}

export interface DependencyNode {
  id: string;
  module: string;
  operation: string;
  status: 'completed' | 'pending' | 'blocked';
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'data' | 'process' | 'temporal' | 'legal';
  mandatory: boolean;
  description: string;
}

export interface Blocker {
  nodeId: string;
  reason: string;
  resolution: string;
}

export interface ImpactAnalysis {
  operation: string;
  sourceModule: string;
  impactScore: number;
  impactLevel: 'minimal' | 'moderate' | 'significant' | 'critical';
  directImpacts: DirectImpact[];
  cascadeImpacts: CascadeImpact[];
  futureImpacts: FutureImpact[];
  recommendations: ImpactRecommendation[];
  approvalRequired: {
    required: boolean;
    level: string;
    justification: string;
  };
}

export interface DirectImpact {
  module: string;
  area: string;
  impact: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface CascadeImpact {
  chain: string[];
  description: string;
  probability: number;
  timeframe: string;
}

export interface FutureImpact {
  timeframe: string;
  impact: string;
  preparation: string;
}

export interface ImpactRecommendation {
  priority: number;
  action: string;
  expectedBenefit: string;
}

// === HOOK ===

export function useCrossModuleOrchestrator() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentOrchestration, setCurrentOrchestration] = useState<Orchestration | null>(null);
  const [sharedContext, setSharedContext] = useState<SharedContextResult | null>(null);
  const [agentCoordination, setAgentCoordination] = useState<AgentCoordination | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // === ORQUESTAR OPERACIÓN ===
  const orchestrateOperation = useCallback(async (
    request: OrchestrationRequest
  ): Promise<Orchestration | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'cross-module-orchestrator',
        {
          body: {
            action: 'orchestrate_operation',
            context: request.data,
            params: {
              operation: request.operation,
              primaryModule: request.primaryModule,
              entityId: request.entityId,
              entityType: request.entityType,
              options: request.options
            }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.orchestration) {
        const orchestration = data.data.orchestration as Orchestration;
        setCurrentOrchestration(orchestration);
        
        if (orchestration.status === 'requires_intervention') {
          toast.warning('Orquestación requiere intervención manual');
        } else if (orchestration.status === 'completed') {
          toast.success('Orquestación completada');
        }

        return orchestration;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de orquestación';
      setError(message);
      console.error('[useCrossModuleOrchestrator] orchestrateOperation error:', err);
      toast.error('Error al orquestar operación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER CONTEXTO COMPARTIDO ===
  const fetchSharedContext = useCallback(async (
    entityId: string,
    entityType: string
  ): Promise<SharedContextResult | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'cross-module-orchestrator',
        {
          body: {
            action: 'get_shared_context',
            context: { entityId, entityType }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.sharedContext) {
        const context = data.data.sharedContext as SharedContextResult;
        setSharedContext(context);
        setLastRefresh(new Date());
        return context;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleOrchestrator] fetchSharedContext error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === COORDINAR AGENTES ===
  const coordinateAgents = useCallback(async (
    agents: string[],
    task: Record<string, unknown>
  ): Promise<AgentCoordination | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'cross-module-orchestrator',
        {
          body: {
            action: 'coordinate_agents',
            params: { agents, task }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.coordination) {
        const coordination = data.data.coordination as AgentCoordination;
        setAgentCoordination(coordination);
        return coordination;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleOrchestrator] coordinateAgents error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === RESOLVER CONFLICTO ===
  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution?: string
  ): Promise<ConflictResolution | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'cross-module-orchestrator',
        {
          body: {
            action: 'resolve_conflict',
            params: { conflictId, proposedResolution: resolution }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.conflictResolution) {
        const result = data.data.conflictResolution as ConflictResolution;
        
        setConflicts(prev => 
          prev.filter(c => c.id !== conflictId)
        );
        
        toast.success('Conflicto resuelto');
        return result;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleOrchestrator] resolveConflict error:', err);
      toast.error('Error al resolver conflicto');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANALIZAR DEPENDENCIAS ===
  const analyzeDependencies = useCallback(async (
    operation: string,
    module: ModuleType
  ): Promise<DependencyAnalysis | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'cross-module-orchestrator',
        {
          body: {
            action: 'get_dependencies',
            context: { operation, module }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.dependencyAnalysis) {
        return data.data.dependencyAnalysis as DependencyAnalysis;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleOrchestrator] analyzeDependencies error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANALIZAR IMPACTO ===
  const analyzeImpact = useCallback(async (
    operation: string,
    module: ModuleType,
    context: Record<string, unknown>
  ): Promise<ImpactAnalysis | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'cross-module-orchestrator',
        {
          body: {
            action: 'get_impact_analysis',
            context: { operation, module, ...context }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.impactAnalysis) {
        return data.data.impactAnalysis as ImpactAnalysis;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleOrchestrator] analyzeImpact error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === EJECUTAR WORKFLOW ===
  const executeWorkflow = useCallback(async (
    workflowId: string
  ): Promise<Record<string, unknown> | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'cross-module-orchestrator',
        {
          body: {
            action: 'execute_workflow',
            params: { workflowId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        return data.data;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleOrchestrator] executeWorkflow error:', err);
      toast.error('Error al ejecutar workflow');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === POLLING PARA ORQUESTACIÓN EN CURSO ===
  const startPolling = useCallback((orchestrationId: string, intervalMs = 5000) => {
    stopPolling();

    pollingInterval.current = setInterval(async () => {
      // Aquí iría la lógica de polling para actualizar el estado
      console.log('[useCrossModuleOrchestrator] Polling orchestration:', orchestrationId);
    }, intervalMs);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    // State
    isLoading,
    currentOrchestration,
    sharedContext,
    agentCoordination,
    conflicts,
    error,
    lastRefresh,

    // Actions
    orchestrateOperation,
    fetchSharedContext,
    coordinateAgents,
    resolveConflict,
    analyzeDependencies,
    analyzeImpact,
    executeWorkflow,
    startPolling,
    stopPolling
  };
}

export default useCrossModuleOrchestrator;
