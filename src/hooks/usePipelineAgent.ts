/**
 * Hook para el Agente IA de Pipeline
 * Proporciona predicciones, análisis y recomendaciones inteligentes
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOpportunities, Opportunity } from '@/hooks/useOpportunities';
import { usePipelineStages, PipelineStage } from '@/hooks/usePipelineStages';
import { toast } from 'sonner';

// Types
export interface PipelineAnalysis {
  summary: string;
  health_score: number;
  health_status: 'healthy' | 'warning' | 'critical';
  key_insights: string[];
  bottlenecks: Array<{ stage: string; issue: string; impact: string }>;
  opportunities_at_risk: string[];
  quick_wins: Array<{ opportunity_id: string; action: string; potential_value: number }>;
  forecast: { optimistic: number; realistic: number; conservative: number };
}

export interface PredictedClose {
  opportunity_id: string;
  predicted_probability: number;
  confidence: number;
  factors: Array<{ name: string; impact: number; description: string }>;
  predicted_close_date: string;
  risk_level: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface NextBestAction {
  opportunity_id: string;
  opportunity_title: string;
  action_type: 'call' | 'email' | 'meeting' | 'proposal' | 'follow_up' | 'escalate';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  description: string;
  reason: string;
  expected_impact: string;
  deadline: string;
}

export interface PipelineForecast {
  period: string;
  forecast: {
    commit: { value: number; deals: number };
    best_case: { value: number; deals: number };
    pipeline: { value: number; deals: number };
  };
  total_weighted: number;
  risk_factors: string[];
  upside_opportunities: Array<{ opportunity_id: string; potential: number; action: string }>;
}

export interface RiskDetection {
  at_risk_count: number;
  total_value_at_risk: number;
  risks: Array<{
    opportunity_id: string;
    opportunity_title: string;
    risk_level: 'critical' | 'high' | 'medium';
    risk_score: number;
    signals: string[];
    days_stalled: number;
    recommended_action: string;
    save_probability: number;
  }>;
  patterns: string[];
  prevention_tips: string[];
}

export interface CoachingAdvice {
  opportunity_id: string;
  coaching_summary: string;
  strengths: string[];
  challenges: string[];
  sales_strategy: {
    approach: string;
    key_messages: string[];
    objection_handling: Array<{ objection: string; response: string }>;
  };
  next_steps: Array<{ step: number; action: string; timeline: string; expected_outcome: string }>;
  closing_techniques: string[];
  win_probability_if_followed: number;
}

export interface FullAnalysis {
  executive_summary: string;
  health_score: number;
  key_metrics: {
    pipeline_velocity: number;
    average_deal_size: number;
    win_rate: number;
    sales_cycle_days: number;
  };
  top_opportunities: Array<{ id: string; title: string; value: number; probability: number; next_action: string }>;
  at_risk_summary: { count: number; value: number; top_risk: string };
  forecast_summary: { commit: number; best_case: number; pipeline: number };
  recommendations: Array<{ priority: number; action: string; impact: string; effort: string }>;
  quick_wins: Array<{ opportunity_id: string; action: string; value: number }>;
  weekly_focus_areas: string[];
}

type AgentAction = 'analyze_pipeline' | 'predict_close' | 'suggest_actions' | 'forecast' | 'detect_risks' | 'coach' | 'full_analysis';

export function usePipelineAgent() {
  const { opportunities } = useOpportunities();
  const { stages } = usePipelineStages();
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<FullAnalysis | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Build context for AI
  const buildContext = useCallback(() => {
    const now = new Date();
    
    const enrichedOpportunities = opportunities.map(opp => {
      const stage = stages.find(s => s.id === opp.stage_id);
      const createdAt = new Date(opp.created_at);
      const updatedAt = new Date(opp.updated_at);
      const daysInStage = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: opp.id,
        title: opp.title,
        stage_id: opp.stage_id,
        stage_name: stage?.name || opp.stage,
        estimated_value: opp.estimated_value,
        probability: opp.probability,
        created_at: opp.created_at,
        updated_at: opp.updated_at,
        expected_close_date: (opp as any).expected_close_date || null,
        owner_name: opp.owner?.full_name,
        company_name: opp.company?.name,
        days_in_stage: daysInStage,
        last_activity_date: opp.updated_at,
      };
    });

    const enrichedStages = stages.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      probability: s.probability,
      order_position: s.order_position,
      is_terminal: s.is_terminal,
      terminal_type: s.terminal_type,
    }));

    const totalValue = opportunities
      .filter(o => !stages.find(s => s.id === o.stage_id)?.is_terminal)
      .reduce((sum, o) => sum + (o.estimated_value || 0), 0);

    const wonValue = opportunities
      .filter(o => stages.find(s => s.id === o.stage_id)?.terminal_type === 'won')
      .reduce((sum, o) => sum + (o.estimated_value || 0), 0);

    const lostCount = opportunities
      .filter(o => stages.find(s => s.id === o.stage_id)?.terminal_type === 'lost')
      .length;

    return {
      opportunities: enrichedOpportunities,
      stages: enrichedStages,
      totalValue,
      wonValue,
      lostCount,
    };
  }, [opportunities, stages]);

  // Generic invoke function
  const invokeAgent = useCallback(async <T>(
    action: AgentAction,
    options?: { opportunity_id?: string; period?: 'weekly' | 'monthly' | 'quarterly' }
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const context = buildContext();
      
      const { data, error: fnError } = await supabase.functions.invoke('pipeline-ai-agent', {
        body: {
          action,
          context,
          ...options,
        },
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setLastRefresh(new Date());
        return data.data as T;
      }

      if (data?.error) {
        throw new Error(data.message || data.error);
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar agente IA';
      setError(message);
      console.error('[usePipelineAgent] Error:', err);
      
      // Show toast for rate limits
      if (message.includes('Rate limit') || message.includes('429')) {
        toast.error('Demasiadas solicitudes. Intenta en unos segundos.');
      } else if (message.includes('Payment') || message.includes('402')) {
        toast.error('Créditos de IA insuficientes.');
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [buildContext]);

  // Specific action methods
  const analyzePipeline = useCallback(async () => {
    const result = await invokeAgent<PipelineAnalysis>('analyze_pipeline');
    return result;
  }, [invokeAgent]);

  const predictClose = useCallback(async (opportunityId: string) => {
    const result = await invokeAgent<PredictedClose>('predict_close', { opportunity_id: opportunityId });
    return result;
  }, [invokeAgent]);

  const suggestActions = useCallback(async () => {
    const result = await invokeAgent<{ next_best_actions: NextBestAction[]; daily_focus: any[]; weekly_goals: string[] }>('suggest_actions');
    return result;
  }, [invokeAgent]);

  const getForecast = useCallback(async (period: 'weekly' | 'monthly' | 'quarterly' = 'monthly') => {
    const result = await invokeAgent<PipelineForecast>('forecast', { period });
    return result;
  }, [invokeAgent]);

  const detectRisks = useCallback(async () => {
    const result = await invokeAgent<RiskDetection>('detect_risks');
    return result;
  }, [invokeAgent]);

  const getCoaching = useCallback(async (opportunityId: string) => {
    const result = await invokeAgent<CoachingAdvice>('coach', { opportunity_id: opportunityId });
    return result;
  }, [invokeAgent]);

  const getFullAnalysis = useCallback(async () => {
    const result = await invokeAgent<FullAnalysis>('full_analysis');
    if (result) {
      setLastAnalysis(result);
    }
    return result;
  }, [invokeAgent]);

  // Auto-refresh
  const startAutoRefresh = useCallback((intervalMs = 300000) => { // 5 minutes default
    stopAutoRefresh();
    getFullAnalysis();
    autoRefreshInterval.current = setInterval(() => {
      getFullAnalysis();
    }, intervalMs);
  }, [getFullAnalysis]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  return {
    // State
    isLoading,
    lastAnalysis,
    lastRefresh,
    error,
    
    // Actions
    analyzePipeline,
    predictClose,
    suggestActions,
    getForecast,
    detectRisks,
    getCoaching,
    getFullAnalysis,
    
    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
    
    // Context helper
    buildContext,
  };
}

export default usePipelineAgent;
