/**
 * useCRMAgentAI - Hook para IA real de agentes CRM
 * Conexión directa con Lovable AI para análisis, predicciones y aprendizaje
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TIPOS ===
export interface CRMDomainAnalysis {
  domainHealth: number;
  trend: 'improving' | 'stable' | 'declining';
  keyMetrics: Array<{
    name: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
    target: number;
  }>;
  insights: Array<{
    type: 'opportunity' | 'risk' | 'recommendation';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    confidence: number;
  }>;
  agents: Array<{
    id: string;
    name: string;
    status: 'active' | 'idle' | 'processing';
    performance: number;
    tasksCompleted: number;
  }>;
  recommendations: string[];
  alerts: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
  }>;
}

export interface LeadScoreResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  conversionProbability: number;
  estimatedValue: number;
  timeToConvert: string;
  strengths: string[];
  weaknesses: string[];
  nextBestActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: number;
  }>;
  signals: Array<{
    type: 'positive' | 'negative';
    signal: string;
    weight: number;
  }>;
}

export interface ChurnPrediction {
  churnProbability: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  churnTimeframe: string;
  lifetimeValue: number;
  revenueAtRisk: number;
  signals: Array<{
    signal: string;
    weight: number;
    trend: 'worsening' | 'stable' | 'improving';
  }>;
  retentionStrategies: Array<{
    strategy: string;
    effectiveness: number;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  }>;
  healthIndicators: {
    productUsage: number;
    engagement: number;
    satisfaction: number;
    relationship: number;
  };
}

export interface UpsellOpportunity {
  upsellScore: number;
  opportunities: Array<{
    product: string;
    type: 'upsell' | 'cross-sell' | 'expansion';
    probability: number;
    potentialValue: number;
    effort: 'low' | 'medium' | 'high';
    signals: string[];
    approach: string;
  }>;
  totalPotentialMRR: number;
  bestTiming: string;
  buyerReadiness: {
    budget: number;
    authority: number;
    need: number;
    timeline: number;
  };
}

export interface PipelineOptimization {
  pipelineHealth: number;
  totalValue: number;
  weightedValue: number;
  averageDealSize: number;
  averageCycleTime: number;
  stages: Array<{
    name: string;
    deals: number;
    value: number;
    avgDaysInStage: number;
    conversionRate: number;
    bottleneck: boolean;
  }>;
  atRiskDeals: Array<{
    dealName: string;
    value: number;
    riskLevel: number;
    daysStuck: number;
    reason: string;
  }>;
  recommendations: Array<{
    type: 'acceleration' | 'conversion' | 'qualification' | 'closure';
    recommendation: string;
    impactedValue: number;
  }>;
  forecast: {
    thisMonth: number;
    nextMonth: number;
    thisQuarter: number;
    confidence: number;
  };
}

export interface CRMStrategicInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'trend' | 'action';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  urgency: 'immediate' | 'this_week' | 'this_month';
  confidence: number;
  potentialValue: number;
  suggestedActions: string[];
  affectedEntities: string[];
}

export interface CRMAgentRanking {
  rank: number;
  agentId: string;
  agentName: string;
  overallScore: number;
  metrics: {
    accuracy: number;
    valueGenerated: number;
    responseTime: number;
    successRate: number;
    userSatisfaction: number;
  };
  trend: 'rising' | 'stable' | 'falling';
  achievements: string[];
  areasToImprove: string[];
}

export interface CRMLearningRecord {
  timestamp: string;
  agentId: string;
  type: 'success_pattern' | 'failure_analysis' | 'optimization' | 'new_insight';
  lesson: string;
  confidenceChange: number;
  impactedModels: string[];
  recommendations: string[];
}

export interface CRMChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// === HOOK ===
export function useCRMAgentAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<CRMDomainAnalysis | null>(null);
  const [insights, setInsights] = useState<CRMStrategicInsight[]>([]);
  const [rankings, setRankings] = useState<CRMAgentRanking[]>([]);
  const [learningHistory, setLearningHistory] = useState<CRMLearningRecord[]>([]);
  const [chatHistory, setChatHistory] = useState<CRMChatMessage[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // === LLAMADA BASE A LA EDGE FUNCTION ===
  const callCRMAgentAI = useCallback(async (
    action: string,
    params: Record<string, unknown> = {}
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-agent-ai', {
        body: { action, ...params }
      });

      if (fnError) throw fnError;

      if (!data?.success) {
        throw new Error(data?.error || 'Error en respuesta de IA');
      }

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error(`[useCRMAgentAI] ${action} error:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANÁLISIS DE DOMINIO ===
  const analyzeDomain = useCallback(async (
    domain: string,
    context?: Record<string, unknown>
  ): Promise<CRMDomainAnalysis | null> => {
    try {
      const result = await callCRMAgentAI('analyze_domain', { domain, context });
      setLastAnalysis(result);
      return result;
    } catch {
      toast.error('Error al analizar dominio CRM');
      return null;
    }
  }, [callCRMAgentAI]);

  // === LEAD SCORING ===
  const scoreLead = useCallback(async (
    leadData: Record<string, unknown>
  ): Promise<LeadScoreResult | null> => {
    try {
      const result = await callCRMAgentAI('score_lead', { leadData });
      toast.success(`Lead puntuado: ${result.grade} (${result.score}/100)`);
      return result;
    } catch {
      toast.error('Error al puntuar lead');
      return null;
    }
  }, [callCRMAgentAI]);

  // === PREDICCIÓN DE CHURN ===
  const predictChurn = useCallback(async (
    customerData: Record<string, unknown>
  ): Promise<ChurnPrediction | null> => {
    try {
      const result = await callCRMAgentAI('predict_churn', { customerData });
      if (result.churnProbability > 70) {
        toast.warning(`Alto riesgo de churn detectado: ${result.churnProbability}%`);
      }
      return result;
    } catch {
      toast.error('Error al predecir churn');
      return null;
    }
  }, [callCRMAgentAI]);

  // === DETECCIÓN DE UPSELL ===
  const detectUpsell = useCallback(async (
    customerData: Record<string, unknown>
  ): Promise<UpsellOpportunity | null> => {
    try {
      const result = await callCRMAgentAI('detect_upsell', { customerData });
      if (result.upsellScore > 70) {
        toast.success(`Oportunidad de upsell: €${result.totalPotentialMRR.toLocaleString()}/mes`);
      }
      return result;
    } catch {
      toast.error('Error al detectar upsell');
      return null;
    }
  }, [callCRMAgentAI]);

  // === OPTIMIZACIÓN DE PIPELINE ===
  const optimizePipeline = useCallback(async (
    pipelineData: Record<string, unknown>
  ): Promise<PipelineOptimization | null> => {
    try {
      const result = await callCRMAgentAI('optimize_pipeline', { pipelineData });
      return result;
    } catch {
      toast.error('Error al optimizar pipeline');
      return null;
    }
  }, [callCRMAgentAI]);

  // === PREDICCIÓN DE MÉTRICAS ===
  const predictMetrics = useCallback(async (
    context: Record<string, unknown>
  ) => {
    try {
      return await callCRMAgentAI('predict_metrics', { context });
    } catch {
      toast.error('Error al predecir métricas');
      return null;
    }
  }, [callCRMAgentAI]);

  // === ORQUESTACIÓN ===
  const orchestrate = useCallback(async (
    context: Record<string, unknown>
  ) => {
    try {
      return await callCRMAgentAI('orchestrate', { context });
    } catch {
      toast.error('Error en orquestación');
      return null;
    }
  }, [callCRMAgentAI]);

  // === OBTENER INSIGHTS ===
  const getInsights = useCallback(async (
    context?: Record<string, unknown>
  ): Promise<CRMStrategicInsight[]> => {
    try {
      const result = await callCRMAgentAI('get_insights', { context });
      if (result?.insights) {
        setInsights(result.insights);
        return result.insights;
      }
      return [];
    } catch {
      toast.error('Error al obtener insights');
      return [];
    }
  }, [callCRMAgentAI]);

  // === RANKING DE AGENTES ===
  const getRankings = useCallback(async (
    context?: Record<string, unknown>
  ): Promise<CRMAgentRanking[]> => {
    try {
      const result = await callCRMAgentAI('rank_agents', { context });
      if (result?.rankings) {
        setRankings(result.rankings);
        return result.rankings;
      }
      return [];
    } catch {
      toast.error('Error al obtener rankings');
      return [];
    }
  }, [callCRMAgentAI]);

  // === APRENDIZAJE CONTINUO ===
  const learn = useCallback(async (
    context: Record<string, unknown>
  ): Promise<CRMLearningRecord | null> => {
    try {
      const result = await callCRMAgentAI('learn', { context });
      if (result?.learningRecord) {
        setLearningHistory(prev => [result.learningRecord, ...prev.slice(0, 49)]);
        return result.learningRecord;
      }
      return null;
    } catch {
      console.error('Error en aprendizaje');
      return null;
    }
  }, [callCRMAgentAI]);

  // === CHAT CON AGENTE ===
  const chat = useCallback(async (
    message: string,
    agentId?: string
  ): Promise<string | null> => {
    try {
      const userMessage: CRMChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, userMessage]);

      const conversationHistory = chatHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error: fnError } = await supabase.functions.invoke('crm-agent-ai', {
        body: {
          action: 'chat',
          agentId,
          message,
          conversationHistory
        }
      });

      if (fnError) throw fnError;

      if (data?.response) {
        const assistantMessage: CRMChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, assistantMessage]);
        return data.response;
      }

      return null;
    } catch (err) {
      console.error('[useCRMAgentAI] chat error:', err);
      toast.error('Error en chat con agente');
      return null;
    }
  }, [chatHistory]);

  // === LIMPIAR CHAT ===
  const clearChat = useCallback(() => {
    setChatHistory([]);
  }, []);

  // === CANCELAR OPERACIÓN ===
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  // === RETURN ===
  return {
    // Estado
    isLoading,
    error,
    lastAnalysis,
    insights,
    rankings,
    learningHistory,
    chatHistory,

    // Acciones CRM específicas
    analyzeDomain,
    scoreLead,
    predictChurn,
    detectUpsell,
    optimizePipeline,
    predictMetrics,
    orchestrate,
    getInsights,
    getRankings,
    learn,
    chat,
    clearChat,
    cancel,
  };
}

export default useCRMAgentAI;
