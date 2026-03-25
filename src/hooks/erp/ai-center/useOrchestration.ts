/**
 * useOrchestration — Phase 6: Orchestration & Simulation
 * Manages agent pipelines, workflow chains, and what-if simulations.
 */

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AgentRegistryItem } from './useAICommandCenter';

// === TYPES ===

export interface PipelineStep {
  agentCode: string;
  agentName: string;
  order: number;
  condition?: string;       // e.g. "confidence < 0.7 → escalate"
  fallbackAgent?: string;
  maxRetries: number;
  timeoutMs: number;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  domain: string;
  trigger: string;          // event that starts this pipeline
  steps: PipelineStep[];
  status: 'active' | 'paused' | 'draft';
  totalExecutions: number;
  avgDurationMs: number;
  successRate: number;
  lastRun: string | null;
  createdAt: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  pipelineId: string;
  inputPayload: Record<string, unknown>;
  modifiedParams: Record<string, unknown>;   // what-if overrides
  status: 'pending' | 'running' | 'completed' | 'failed';
  result: SimulationResult | null;
  createdAt: string;
}

export interface SimulationResult {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  escalations: number;
  totalDurationMs: number;
  costEstimate: number;
  stepResults: StepResult[];
  recommendation: string;
}

export interface StepResult {
  agentCode: string;
  agentName: string;
  status: 'success' | 'failed' | 'skipped' | 'escalated';
  durationMs: number;
  confidence: number;
  output: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'sequential' | 'fallback' | 'escalation';
}

// === HOOK ===

export function useOrchestration(agents: AgentRegistryItem[]) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [simulations, setSimulations] = useState<SimulationScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Build pipelines from invocation patterns
  const loadPipelines = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch invocation chains to infer pipelines
      const { data: invocations } = await supabase
        .from('erp_ai_agent_invocations')
        .select('agent_code, task_type, escalated_to, execution_time_ms, confidence_score, outcome_status, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      const inv = invocations || [];

      // Group by task_type to form pipelines
      const taskGroups = new Map<string, typeof inv>();
      inv.forEach(i => {
        const key = i.task_type || 'general';
        if (!taskGroups.has(key)) taskGroups.set(key, []);
        taskGroups.get(key)!.push(i);
      });

      const agentMap = new Map(agents.map(a => [a.code, a]));

      const builtPipelines: Pipeline[] = [];
      let idx = 0;

      taskGroups.forEach((records, taskType) => {
        // Identify unique agents in this task type
        const agentCodes = [...new Set(records.map(r => r.agent_code))];
        if (agentCodes.length === 0) return;

        // Build steps
        const steps: PipelineStep[] = agentCodes.map((code, order) => {
          const agent = agentMap.get(code);
          const escalations = records.filter(r => r.agent_code === code && r.escalated_to);
          return {
            agentCode: code,
            agentName: agent?.name || code,
            order,
            condition: escalations.length > 0 ? `Escalation rate: ${Math.round((escalations.length / records.filter(r => r.agent_code === code).length) * 100)}%` : undefined,
            fallbackAgent: escalations[0]?.escalated_to || undefined,
            maxRetries: 2,
            timeoutMs: 30000,
          };
        });

        const execTimes = records.filter(r => r.execution_time_ms).map(r => r.execution_time_ms!);
        const successes = records.filter(r => r.outcome_status === 'success').length;

        builtPipelines.push({
          id: `pipeline-${idx++}`,
          name: `Pipeline: ${taskType.replace(/_/g, ' ')}`,
          description: `Flujo automático para tareas de tipo "${taskType}" con ${agentCodes.length} agente(s)`,
          domain: agentMap.get(agentCodes[0])?.module_domain || 'general',
          trigger: `event:${taskType}`,
          steps,
          status: 'active',
          totalExecutions: records.length,
          avgDurationMs: execTimes.length > 0 ? Math.round(execTimes.reduce((a, b) => a + b, 0) / execTimes.length) : 0,
          successRate: records.length > 0 ? Math.round((successes / records.length) * 100) : 0,
          lastRun: records[0]?.created_at || null,
          createdAt: records[records.length - 1]?.created_at || new Date().toISOString(),
        });
      });

      setPipelines(builtPipelines.sort((a, b) => b.totalExecutions - a.totalExecutions));
    } catch (err) {
      console.error('[useOrchestration] loadPipelines error:', err);
    } finally {
      setLoading(false);
    }
  }, [agents]);

  // Run a what-if simulation
  const runSimulation = useCallback(async (
    pipeline: Pipeline,
    overrides: Record<string, unknown> = {}
  ): Promise<SimulationScenario> => {
    setSimulating(true);

    const scenario: SimulationScenario = {
      id: `sim-${Date.now()}`,
      name: `Simulación: ${pipeline.name}`,
      description: `What-if para pipeline "${pipeline.name}" con ${Object.keys(overrides).length} override(s)`,
      pipelineId: pipeline.id,
      inputPayload: { pipeline: pipeline.name, steps: pipeline.steps.length },
      modifiedParams: overrides,
      status: 'running',
      result: null,
      createdAt: new Date().toISOString(),
    };

    setSimulations(prev => [scenario, ...prev]);

    // Simulate each step with randomized outcomes
    await new Promise(r => setTimeout(r, 1500));

    const stepResults: StepResult[] = pipeline.steps.map(step => {
      const baseConfidence = pipeline.successRate / 100;
      const override = overrides[step.agentCode] as number | undefined;
      const adjustedConfidence = override != null
        ? Math.min(1, Math.max(0, baseConfidence + (override / 100)))
        : baseConfidence;

      const succeeded = Math.random() < adjustedConfidence;
      const escalated = !succeeded && step.fallbackAgent;

      return {
        agentCode: step.agentCode,
        agentName: step.agentName,
        status: succeeded ? 'success' : escalated ? 'escalated' : 'failed',
        durationMs: Math.round(pipeline.avgDurationMs / pipeline.steps.length * (0.5 + Math.random())),
        confidence: Math.round(adjustedConfidence * 100),
        output: succeeded
          ? 'Paso completado satisfactoriamente'
          : escalated
            ? `Escalado a ${step.fallbackAgent}`
            : 'Fallo en ejecución',
      };
    });

    const completed = stepResults.filter(s => s.status === 'success').length;
    const failed = stepResults.filter(s => s.status === 'failed').length;
    const escalations = stepResults.filter(s => s.status === 'escalated').length;
    const totalDuration = stepResults.reduce((a, s) => a + s.durationMs, 0);

    const result: SimulationResult = {
      totalSteps: stepResults.length,
      completedSteps: completed,
      failedSteps: failed,
      escalations,
      totalDurationMs: totalDuration,
      costEstimate: stepResults.length * 0.003,
      stepResults,
      recommendation: failed === 0
        ? '✅ Pipeline estable — todos los pasos completados o escalados correctamente.'
        : failed <= 1
          ? '⚠️ Pipeline con riesgo moderado — considerar ajustar umbrales de confianza.'
          : '🔴 Pipeline inestable — se recomienda revisión manual y ajuste de agentes.',
    };

    const completedScenario: SimulationScenario = {
      ...scenario,
      status: 'completed',
      result,
    };

    setSimulations(prev => prev.map(s => s.id === scenario.id ? completedScenario : s));
    setSimulating(false);

    return completedScenario;
  }, []);

  // Compute dependency graph from pipelines
  const dependencyGraph = useMemo((): DependencyEdge[] => {
    const edges: DependencyEdge[] = [];
    pipelines.forEach(p => {
      for (let i = 0; i < p.steps.length - 1; i++) {
        edges.push({
          from: p.steps[i].agentCode,
          to: p.steps[i + 1].agentCode,
          type: 'sequential',
        });
      }
      p.steps.forEach(step => {
        if (step.fallbackAgent) {
          edges.push({
            from: step.agentCode,
            to: step.fallbackAgent,
            type: 'fallback',
          });
        }
      });
    });
    // Deduplicate
    const seen = new Set<string>();
    return edges.filter(e => {
      const key = `${e.from}-${e.to}-${e.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [pipelines]);

  // KPIs
  const orchestrationKPIs = useMemo(() => {
    const total = pipelines.length;
    const active = pipelines.filter(p => p.status === 'active').length;
    const avgSuccess = total > 0 ? Math.round(pipelines.reduce((a, p) => a + p.successRate, 0) / total) : 0;
    const totalExecs = pipelines.reduce((a, p) => a + p.totalExecutions, 0);
    const avgLatency = total > 0 ? Math.round(pipelines.reduce((a, p) => a + p.avgDurationMs, 0) / total) : 0;
    const multiStepPipelines = pipelines.filter(p => p.steps.length > 1).length;

    return { total, active, avgSuccess, totalExecs, avgLatency, multiStepPipelines };
  }, [pipelines]);

  return {
    pipelines,
    simulations,
    dependencyGraph,
    orchestrationKPIs,
    loading,
    simulating,
    loadPipelines,
    runSimulation,
  };
}

export default useOrchestration;
