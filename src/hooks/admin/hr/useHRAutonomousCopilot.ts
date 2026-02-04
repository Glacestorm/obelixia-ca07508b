/**
 * Hook: useHRAutonomousCopilot
 * Copiloto IA Autónomo para operaciones de RRHH
 * Fase 5: Credenciales Blockchain y Copilotos IA Autónomos
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export type AutonomyLevel = 'advisory' | 'semi-autonomous' | 'fully-autonomous';

export interface ReviewFinding {
  type: 'info' | 'warning' | 'error';
  field: string;
  issue: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface AutoAction {
  action: string;
  executed: boolean;
  reason: string;
}

export interface DocumentReview {
  documentType: string;
  status: 'approved' | 'needs_revision' | 'rejected';
  confidence: number;
  findings: ReviewFinding[];
  autoActions: AutoAction[];
  humanReviewRequired: boolean;
  escalationReason?: string;
  nextSteps: string[];
}

export interface ProactiveAlert {
  id: string;
  type: 'warning' | 'critical' | 'opportunity';
  category: 'compliance' | 'retention' | 'performance' | 'wellbeing';
  title: string;
  description: string;
  affectedEmployees: string[];
  deadline?: string | null;
  suggestedActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    canAutoExecute: boolean;
  }>;
  estimatedImpact: {
    financial?: string;
    legal?: string;
    reputational?: string;
  };
}

export interface ScheduledEvent {
  id: string;
  type: string;
  title: string;
  participants: string[];
  proposedSlots: Array<{
    start: string;
    end: string;
    availability: number;
    conflicts: string[];
  }>;
  selectedSlot: number;
  autoScheduled: boolean;
  notifications: {
    sent: boolean;
    channels: string[];
  };
}

export interface TaskDelegation {
  taskId: string;
  taskDescription: string;
  assignedTo: {
    id: string;
    name: string;
    matchScore: number;
    reasons: string[];
  };
  alternatives: Array<{
    id: string;
    name: string;
    matchScore: number;
  }>;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  autoAssigned: boolean;
}

export interface Prediction {
  type: string;
  timeframe: string;
  probability: number;
  confidence: number;
  description: string;
  dataPoints: string[];
  recommendedActions: Array<{
    action: string;
    timing: string;
    expectedOutcome: string;
    canAutoExecute: boolean;
  }>;
  costOfInaction: {
    financial?: string;
    operational?: string;
    risk?: string;
  };
}

export interface Optimization {
  area: string;
  currentState: {
    metric: string;
    value: number;
    benchmark: number;
  };
  proposedChanges: Array<{
    change: string;
    impact: 'alto' | 'medio' | 'bajo';
    effort: 'alto' | 'medio' | 'bajo';
    roi: string;
    autoImplementable: boolean;
  }>;
  projectedImprovement: string;
  implementationSteps: string[];
}

// === HOOK ===

export function useHRAutonomousCopilot() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>('advisory');
  
  // Results
  const [documentReview, setDocumentReview] = useState<DocumentReview | null>(null);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [delegations, setDelegations] = useState<TaskDelegation[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);

  // Auto-refresh for alerts
  const alertsInterval = useRef<NodeJS.Timeout | null>(null);

  // === AUTONOMOUS REVIEW ===
  const reviewDocument = useCallback(async (
    document: Record<string, unknown>,
    params?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-autonomous-copilot',
        {
          body: {
            action: 'autonomous_review',
            context: document,
            params,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.review) {
        setDocumentReview(data.data.review);
        
        const status = data.data.review.status;
        if (status === 'approved') {
          toast.success('Documento aprobado automáticamente');
        } else if (status === 'needs_revision') {
          toast.warning('Documento requiere revisión');
        } else {
          toast.error('Documento rechazado');
        }
        
        return data.data.review as DocumentReview;
      }

      throw new Error('Error en revisión automática');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === PROACTIVE ALERTS ===
  const fetchProactiveAlerts = useCallback(async (context?: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-autonomous-copilot',
        {
          body: {
            action: 'proactive_alert',
            context,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.alerts) {
        setAlerts(data.data.alerts);
        
        const critical = data.data.summary?.critical || 0;
        if (critical > 0) {
          toast.error(`${critical} alerta(s) crítica(s) detectada(s)`);
        }
        
        return data.data;
      }

      return { alerts: [], summary: { critical: 0, warning: 0, opportunity: 0 } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === AUTO SCHEDULE ===
  const autoSchedule = useCallback(async (
    tasks: Array<{ type: string; participants: string[]; duration: number }>,
    context?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-autonomous-copilot',
        {
          body: {
            action: 'auto_schedule',
            params: { tasks },
            context,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.scheduledEvents) {
        setScheduledEvents(data.data.scheduledEvents);
        
        const autoScheduled = data.data.scheduledEvents.filter(
          (e: ScheduledEvent) => e.autoScheduled
        ).length;
        
        if (autoScheduled > 0) {
          toast.success(`${autoScheduled} evento(s) programado(s) automáticamente`);
        }
        
        return data.data;
      }

      throw new Error('Error en programación automática');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === SMART DELEGATION ===
  const smartDelegate = useCallback(async (
    tasks: Array<{ id: string; description: string; skills: string[]; deadline: string }>,
    team: Array<{ id: string; name: string; skills: string[]; workload: number }>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-autonomous-copilot',
        {
          body: {
            action: 'smart_delegation',
            params: { tasks },
            context: { team },
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.delegations) {
        setDelegations(data.data.delegations);
        
        const autoAssigned = data.data.delegations.filter(
          (d: TaskDelegation) => d.autoAssigned
        ).length;
        
        if (autoAssigned > 0) {
          toast.success(`${autoAssigned} tarea(s) asignada(s) automáticamente`);
        }
        
        return data.data;
      }

      throw new Error('Error en delegación inteligente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === PREDICTIVE ACTIONS ===
  const getPredictions = useCallback(async (
    context: Record<string, unknown>,
    timeframe = '3 meses'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-autonomous-copilot',
        {
          body: {
            action: 'predictive_action',
            context,
            params: { timeframe },
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.predictions) {
        setPredictions(data.data.predictions);
        return data.data;
      }

      throw new Error('Error en predicciones');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === CONTINUOUS OPTIMIZATION ===
  const getOptimizations = useCallback(async (context: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-autonomous-copilot',
        {
          body: {
            action: 'continuous_optimization',
            context,
            autonomyLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.optimizations) {
        setOptimizations(data.data.optimizations);
        return data.data;
      }

      throw new Error('Error en optimizaciones');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autonomyLevel]);

  // === AUTO-REFRESH ALERTS ===
  const startAlertMonitoring = useCallback((intervalMs = 300000) => { // 5 min
    stopAlertMonitoring();
    fetchProactiveAlerts();
    alertsInterval.current = setInterval(() => {
      fetchProactiveAlerts();
    }, intervalMs);
  }, [fetchProactiveAlerts]);

  const stopAlertMonitoring = useCallback(() => {
    if (alertsInterval.current) {
      clearInterval(alertsInterval.current);
      alertsInterval.current = null;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => stopAlertMonitoring();
  }, [stopAlertMonitoring]);

  return {
    // State
    isLoading,
    error,
    autonomyLevel,
    documentReview,
    alerts,
    scheduledEvents,
    delegations,
    predictions,
    optimizations,
    // Actions
    setAutonomyLevel,
    reviewDocument,
    fetchProactiveAlerts,
    autoSchedule,
    smartDelegate,
    getPredictions,
    getOptimizations,
    startAlertMonitoring,
    stopAlertMonitoring,
  };
}

export default useHRAutonomousCopilot;
