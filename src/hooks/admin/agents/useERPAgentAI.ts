/**
 * useERPAgentAI - Hook para conexión con IA real de agentes ERP
 * Incluye análisis, predicciones, orquestación multi-agente y aprendizaje continuo
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AgentDomain, ModuleAgentType } from './erpAgentTypes';

// === TIPOS ===

export interface DomainAnalysis {
  status: 'healthy' | 'warning' | 'critical';
  healthScore: number;
  kpis: Array<{
    name: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
    target: number;
  }>;
  insights: Array<{
    type: 'opportunity' | 'risk' | 'recommendation';
    title: string;
    description: string;
    confidence: number;
    impact: 'high' | 'medium' | 'low';
    suggestedAction?: string;
  }>;
  predictions: Array<{
    metric: string;
    currentValue: number;
    predictedValue: number;
    timeframe: string;
    confidence: number;
  }>;
  alerts: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    actionRequired: boolean;
  }>;
}

export interface MetricPrediction {
  metric: string;
  currentValue: number;
  predictions: Array<{
    timeframe: string;
    value: number;
    confidence: number;
    range: { min: number; max: number };
  }>;
  factors: string[];
  scenarios: {
    optimistic: { value: number; probability: number };
    base: { value: number; probability: number };
    pessimistic: { value: number; probability: number };
  };
}

export interface OrchestrationPlan {
  objective: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedDuration: string;
  steps: Array<{
    stepNumber: number;
    agentDomain: string;
    agentType: string;
    task: string;
    dependencies: number[];
    expectedOutput: string;
    timeout: string;
  }>;
  agentAssignments: Array<{
    agentId: string;
    role: string;
    responsibilities: string[];
    collaboratesWith: string[];
  }>;
  conflictResolution: Array<{
    conflict: string;
    resolution: string;
    impactedAgents: string[];
  }>;
  successCriteria: string[];
  fallbackPlan: string;
}

export interface StrategicInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'prediction' | 'anomaly';
  category: 'revenue' | 'cost' | 'efficiency' | 'compliance' | 'customer';
  title: string;
  summary: string;
  details: string;
  confidence: number;
  impact: {
    type: 'financial' | 'operational' | 'strategic';
    magnitude: 'high' | 'medium' | 'low';
    estimatedValue?: number;
    timeToRealize?: string;
  };
  recommendations: Array<{
    action: string;
    priority: number;
    effort: 'low' | 'medium' | 'high';
    expectedROI?: string;
  }>;
  dataPoints: string[];
  relatedDomains: string[];
}

export interface AgentRanking {
  rank: number;
  agentId: string;
  agentName: string;
  domain: AgentDomain;
  score: number;
  metrics: {
    successRate: number;
    responseTime: number;
    insightsGenerated: number;
    actionsExecuted: number;
    userSatisfaction: number;
  };
  badges: string[];
  trend: 'rising' | 'stable' | 'declining';
  trendPercentage: number;
}

export interface LearningRecord {
  decisionId: string;
  outcome: 'success' | 'partial' | 'failure';
  lessonsLearned: string[];
  patternsIdentified: Array<{
    pattern: string;
    applicability: string;
    confidence: number;
  }>;
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
}

// === HOOK ===

export function useERPAgentAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<DomainAnalysis | null>(null);
  const [predictions, setPredictions] = useState<MetricPrediction[]>([]);
  const [orchestrationPlan, setOrchestrationPlan] = useState<OrchestrationPlan | null>(null);
  const [insights, setInsights] = useState<StrategicInsight[]>([]);
  const [rankings, setRankings] = useState<AgentRanking[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Map<string, ChatMessage[]>>(new Map());

  const abortControllerRef = useRef<AbortController | null>(null);

  // === ANALIZAR DOMINIO ===
  const analyzeDomain = useCallback(async (
    domain: AgentDomain,
    context?: Record<string, unknown>
  ): Promise<DomainAnalysis | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-agent-ai', {
        body: {
          action: 'analyze_domain',
          domain,
          context: context || {
            timestamp: new Date().toISOString(),
            requestType: 'full_analysis'
          }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const analysis = data.data as DomainAnalysis;
        setLastAnalysis(analysis);
        
        // Mostrar alertas críticas
        analysis.alerts?.filter(a => a.severity === 'critical').forEach(alert => {
          toast.error(alert.message, { duration: 10000 });
        });

        return analysis;
      }

      throw new Error('Invalid response from AI');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error analyzing domain';
      setError(message);
      console.error('[useERPAgentAI] analyzeDomain error:', err);
      
      if (message.includes('Rate limit')) {
        toast.error('Límite de solicitudes alcanzado. Intenta de nuevo más tarde.');
      } else if (message.includes('Payment')) {
        toast.error('Créditos de IA insuficientes.');
      } else {
        toast.error('Error al analizar el dominio');
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === PREDECIR MÉTRICAS ===
  const predictMetrics = useCallback(async (
    metricsContext: Record<string, unknown>
  ): Promise<MetricPrediction[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-agent-ai', {
        body: {
          action: 'predict_metrics',
          context: metricsContext
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data?.predictions) {
        const preds = data.data.predictions as MetricPrediction[];
        setPredictions(preds);
        return preds;
      }

      throw new Error('Invalid predictions response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error predicting metrics';
      setError(message);
      console.error('[useERPAgentAI] predictMetrics error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ORQUESTAR MULTI-AGENTE ===
  const orchestrateMultiAgent = useCallback(async (
    objective: string,
    involvedDomains: AgentDomain[],
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): Promise<OrchestrationPlan | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-agent-ai', {
        body: {
          action: 'orchestrate_multi_agent',
          context: {
            objective,
            domains: involvedDomains,
            priority,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data?.orchestrationPlan) {
        const plan = data.data as OrchestrationPlan;
        setOrchestrationPlan(plan);
        toast.success('Plan de orquestación generado');
        return plan;
      }

      throw new Error('Invalid orchestration response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error orchestrating agents';
      setError(message);
      console.error('[useERPAgentAI] orchestrateMultiAgent error:', err);
      toast.error('Error al orquestar agentes');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERAR INSIGHTS ESTRATÉGICOS ===
  const generateStrategicInsights = useCallback(async (
    context: Record<string, unknown>
  ): Promise<StrategicInsight[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-agent-ai', {
        body: {
          action: 'generate_insights',
          context
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data?.insights) {
        const newInsights = data.data.insights as StrategicInsight[];
        setInsights(prev => [...newInsights, ...prev].slice(0, 50));
        
        // Notificar insights de alto impacto
        newInsights
          .filter(i => i.impact.magnitude === 'high')
          .forEach(i => {
            toast.success(i.title, { description: i.summary });
          });

        return newInsights;
      }

      throw new Error('Invalid insights response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generating insights';
      setError(message);
      console.error('[useERPAgentAI] generateStrategicInsights error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === REGISTRAR APRENDIZAJE ===
  const learnFromDecision = useCallback(async (
    decisionData: {
      decisionId: string;
      decision: string;
      outcome: 'success' | 'partial' | 'failure';
      context: Record<string, unknown>;
      feedback?: string;
    }
  ): Promise<LearningRecord | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-agent-ai', {
        body: {
          action: 'learn_from_decision',
          decisionData
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data?.learningRecord) {
        const record = data.data.learningRecord as LearningRecord;
        toast.success('Aprendizaje registrado', {
          description: `${record.lessonsLearned.length} lecciones extraídas`
        });
        return record;
      }

      return null;
    } catch (err) {
      console.error('[useERPAgentAI] learnFromDecision error:', err);
      return null;
    }
  }, []);

  // === OBTENER RANKING COMPETITIVO ===
  const getCompetitiveRanking = useCallback(async (
    agents: Array<{
      id: string;
      name: string;
      domain: AgentDomain;
      metrics: Record<string, number>;
    }>
  ): Promise<AgentRanking[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-agent-ai', {
        body: {
          action: 'competitive_ranking',
          context: { agents }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data?.rankings) {
        const newRankings = data.data.rankings as AgentRanking[];
        setRankings(newRankings);
        return newRankings;
      }

      throw new Error('Invalid rankings response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error getting rankings';
      setError(message);
      console.error('[useERPAgentAI] getCompetitiveRanking error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CHAT CON AGENTE ===
  const chatWithAgent = useCallback(async (
    domain: AgentDomain,
    agentType: ModuleAgentType | string,
    message: string
  ): Promise<string | null> => {
    const conversationKey = `${domain}_${agentType}`;
    const history = conversationHistory.get(conversationKey) || [];

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-agent-ai', {
        body: {
          action: 'chat_with_agent',
          domain,
          agentType,
          message,
          conversationHistory: history.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data?.response) {
        const response = data.data.response as string;
        
        // Actualizar historial
        const newHistory: ChatMessage[] = [
          ...history,
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'agent', content: response, timestamp: new Date().toISOString() }
        ];
        
        setConversationHistory(prev => new Map(prev).set(conversationKey, newHistory));
        
        return response;
      }

      throw new Error('Invalid chat response');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error chatting with agent';
      setError(errorMessage);
      console.error('[useERPAgentAI] chatWithAgent error:', err);
      
      if (errorMessage.includes('Rate limit')) {
        toast.error('Límite de solicitudes alcanzado');
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [conversationHistory]);

  // === LIMPIAR HISTORIAL ===
  const clearConversationHistory = useCallback((domain?: AgentDomain, agentType?: string) => {
    if (domain && agentType) {
      const key = `${domain}_${agentType}`;
      setConversationHistory(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    } else {
      setConversationHistory(new Map());
    }
  }, []);

  // === CANCELAR OPERACIÓN ===
  const cancelOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  return {
    // Estado
    isLoading,
    error,
    lastAnalysis,
    predictions,
    orchestrationPlan,
    insights,
    rankings,
    conversationHistory,

    // Acciones principales
    analyzeDomain,
    predictMetrics,
    orchestrateMultiAgent,
    generateStrategicInsights,
    
    // Aprendizaje y ranking
    learnFromDecision,
    getCompetitiveRanking,
    
    // Chat
    chatWithAgent,
    clearConversationHistory,
    
    // Control
    cancelOperation
  };
}

export default useERPAgentAI;
