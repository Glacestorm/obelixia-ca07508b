/**
 * useLegalAutonomousCopilot Hook
 * Phase 9: AI agent with proactive task execution and legal workflow automation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export type AutonomyLevel = 'advisor' | 'semi_autonomous' | 'fully_autonomous';

export interface SituationAnalysis {
  situationSummary: string;
  keyIssues: Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    urgency: 'low' | 'medium' | 'high' | 'immediate';
    area: string;
  }>;
  stakeholders: Array<{
    party: string;
    role: string;
    interests: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  legalFramework: {
    applicableLaws: string[];
    jurisdiction: string;
    keyProvisions: string[];
  };
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    financialExposure: number;
    reputationalRisk: 'low' | 'medium' | 'high';
    complianceRisk: 'low' | 'medium' | 'high';
  };
  recommendedStrategy: {
    approach: string;
    timeline: string;
    resources: string[];
  };
  immediateActions: string[];
  confidenceLevel: number;
}

export interface SuggestedAction {
  actionId: string;
  title: string;
  description: string;
  priority: number;
  category: 'compliance' | 'contract' | 'litigation' | 'advisory' | 'documentation';
  estimatedEffort: {
    hours: number;
    complexity: 'simple' | 'moderate' | 'complex';
  };
  estimatedCost: number;
  expectedBenefit: string;
  deadline: string;
  dependencies: string[];
  canAutomate: boolean;
  riskIfNotDone: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
}

export interface TaskExecution {
  taskExecution: {
    taskId: string;
    status: 'completed' | 'pending_approval' | 'blocked' | 'in_progress';
    autonomyUsed: AutonomyLevel;
    stepsCompleted: Array<{
      step: number;
      action: string;
      result: string;
      automated: boolean;
    }>;
    pendingSteps: Array<{
      step: number;
      action: string;
      requiresApproval: boolean;
      reason: string;
    }>;
  };
  output: {
    type: 'document' | 'analysis' | 'notification' | 'data';
    content: string;
    attachments: string[];
  };
  auditTrail: Array<{
    timestamp: string;
    action: string;
    actor: 'ai_copilot' | 'human';
    details: string;
  }>;
  nextSteps: string[];
  alerts: string[];
}

export interface ComplianceReview {
  complianceReview: {
    scope: string;
    date: string;
    overallStatus: 'compliant' | 'partially_compliant' | 'non_compliant';
    score: number;
  };
  findings: Array<{
    id: string;
    regulation: string;
    requirement: string;
    status: 'compliant' | 'gap' | 'violation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    evidence: string;
    remediation: string;
    deadline: string;
  }>;
  riskExposure: {
    financialPenalties: number;
    reputationalDamage: 'low' | 'medium' | 'high';
    operationalImpact: 'low' | 'medium' | 'high';
  };
  actionPlan: Array<{
    priority: number;
    action: string;
    responsible: string;
    deadline: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  certificationReadiness: number;
}

export interface DeadlineMonitor {
  deadlineMonitor: {
    asOfDate: string;
    totalActive: number;
    overdue: number;
    dueThisWeek: number;
    dueThisMonth: number;
  };
  criticalDeadlines: Array<{
    id: string;
    matter: string;
    deadline: string;
    daysRemaining: number;
    businessDaysRemaining: number;
    type: 'procedural' | 'contractual' | 'regulatory' | 'internal';
    consequence: string;
    status: 'on_track' | 'at_risk' | 'overdue';
    requiredActions: string[];
  }>;
  upcomingMilestones: Array<{
    milestone: string;
    date: string;
    matter: string;
  }>;
  recommendations: string[];
}

export interface QueryAnswer {
  query: string;
  answer: {
    summary: string;
    detailedResponse: string;
    legalBasis: Array<{
      source: string;
      reference: string;
      relevance: string;
    }>;
  };
  considerations: string[];
  risks: string[];
  alternatives: Array<{
    option: string;
    pros: string[];
    cons: string[];
  }>;
  recommendedActions: string[];
  confidence: number;
  requiresSpecialist: boolean;
  specialistType?: string;
}

// === HOOK ===
export function useLegalAutonomousCopilot() {
  const [isLoading, setIsLoading] = useState(false);
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>('advisor');
  const [analysis, setAnalysis] = useState<SituationAnalysis | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [taskExecution, setTaskExecution] = useState<TaskExecution | null>(null);
  const [complianceReview, setComplianceReview] = useState<ComplianceReview | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineMonitor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === ANALYZE SITUATION ===
  const analyzeSituation = useCallback(async (context: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-autonomous-copilot',
        {
          body: {
            action: 'analyze_situation',
            context,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setAnalysis(fnData.data);
        setLastRefresh(new Date());
        return fnData.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAutonomousCopilot] analyzeSituation error:', err);
      toast.error('Error al analizar situación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === SUGGEST ACTIONS ===
  const suggestActions = useCallback(async (context: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-autonomous-copilot',
        {
          body: {
            action: 'suggest_actions',
            context,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data?.suggestedActions) {
        setSuggestedActions(fnData.data.suggestedActions);
        setLastRefresh(new Date());
        return fnData.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAutonomousCopilot] suggestActions error:', err);
      toast.error('Error al sugerir acciones');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === EXECUTE TASK ===
  const executeTask = useCallback(async (taskDetails: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-autonomous-copilot',
        {
          body: {
            action: 'execute_task',
            params: taskDetails,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setTaskExecution(fnData.data);
        setLastRefresh(new Date());
        toast.success('Tarea ejecutada');
        return fnData.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAutonomousCopilot] executeTask error:', err);
      toast.error('Error al ejecutar tarea');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === DRAFT DOCUMENT ===
  const draftDocument = useCallback(async (documentSpec: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-autonomous-copilot',
        {
          body: {
            action: 'draft_document',
            params: documentSpec,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Documento redactado');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useLegalAutonomousCopilot] draftDocument error:', err);
      toast.error('Error al redactar documento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === REVIEW COMPLIANCE ===
  const reviewCompliance = useCallback(async (scope: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-autonomous-copilot',
        {
          body: {
            action: 'review_compliance',
            params: scope,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setComplianceReview(fnData.data);
        setLastRefresh(new Date());
        return fnData.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAutonomousCopilot] reviewCompliance error:', err);
      toast.error('Error al revisar cumplimiento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === MONITOR DEADLINES ===
  const monitorDeadlines = useCallback(async (context?: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-autonomous-copilot',
        {
          body: {
            action: 'monitor_deadlines',
            context,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setDeadlines(fnData.data);
        setLastRefresh(new Date());
        return fnData.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAutonomousCopilot] monitorDeadlines error:', err);
      toast.error('Error al monitorear plazos');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === GENERATE REPORT ===
  const generateReport = useCallback(async (reportSpec: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-autonomous-copilot',
        {
          body: {
            action: 'generate_report',
            params: reportSpec,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Informe generado');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useLegalAutonomousCopilot] generateReport error:', err);
      toast.error('Error al generar informe');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === ANSWER QUERY ===
  const answerQuery = useCallback(async (query: string, context?: Record<string, unknown>): Promise<QueryAnswer | null> => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-autonomous-copilot',
        {
          body: {
            action: 'answer_query',
            params: { query, ...context },
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useLegalAutonomousCopilot] answerQuery error:', err);
      toast.error('Error al responder consulta');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === PRIORITIZE WORKLOAD ===
  const prioritizeWorkload = useCallback(async (tasks: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-autonomous-copilot',
        {
          body: {
            action: 'prioritize_workload',
            params: tasks,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Carga de trabajo priorizada');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useLegalAutonomousCopilot] prioritizeWorkload error:', err);
      toast.error('Error al priorizar carga');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === DELEGATE TASK ===
  const delegateTask = useCallback(async (taskDetails: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-autonomous-copilot',
        {
          body: {
            action: 'delegate_task',
            params: taskDetails,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Tarea delegada');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useLegalAutonomousCopilot] delegateTask error:', err);
      toast.error('Error al delegar tarea');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === CLEANUP ===
  useEffect(() => {
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []);

  return {
    isLoading,
    autonomyLevel,
    setAutonomyLevel,
    analysis,
    suggestedActions,
    taskExecution,
    complianceReview,
    deadlines,
    error,
    lastRefresh,
    analyzeSituation,
    suggestActions,
    executeTask,
    draftDocument,
    reviewCompliance,
    monitorDeadlines,
    generateReport,
    answerQuery,
    prioritizeWorkload,
    delegateTask,
  };
}

export default useLegalAutonomousCopilot;
