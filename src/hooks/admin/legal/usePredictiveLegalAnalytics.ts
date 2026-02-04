/**
 * usePredictiveLegalAnalytics Hook
 * Phase 9: AI-powered litigation prediction, cost estimation, and jurisprudence analysis
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface LitigationPrediction {
  prediction: {
    outcome: 'favorable' | 'unfavorable' | 'settlement_likely' | 'uncertain';
    probability: number;
    confidenceInterval: { low: number; high: number };
  };
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    explanation: string;
  }>;
  precedents: Array<{
    caseId: string;
    jurisdiction: string;
    outcome: string;
    similarity: number;
    keyLearning: string;
  }>;
  risks: string[];
  recommendations: string[];
  estimatedDuration: {
    minMonths: number;
    maxMonths: number;
    mostLikelyMonths: number;
  };
}

export interface LegalCostEstimate {
  totalEstimate: {
    low: number;
    expected: number;
    high: number;
    currency: string;
  };
  breakdown: Array<{
    concept: string;
    phase: string;
    amount: number;
    percentageOfTotal: number;
    variability: 'fixed' | 'variable' | 'contingent';
  }>;
  timeline: Array<{
    phase: string;
    expectedCost: number;
    startMonth: number;
    endMonth: number;
  }>;
  riskFactors: Array<{
    risk: string;
    potentialImpact: number;
    probability: number;
  }>;
  marketBenchmark: {
    averageCost: number;
    percentile: number;
    comparison: 'below' | 'average' | 'above';
  };
  costOptimizations: Array<{
    suggestion: string;
    potentialSavings: number;
    feasibility: 'easy' | 'medium' | 'difficult';
  }>;
}

export interface JurisprudenceTrend {
  trends: Array<{
    area: string;
    trend: 'restrictive' | 'expansive' | 'stable' | 'volatile';
    direction: string;
    confidence: number;
    timeframe: string;
    impactLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  keyDecisions: Array<{
    caseReference: string;
    court: string;
    date: string;
    doctrine: string;
    impact: string;
  }>;
  jurisdictionalDivergences: Array<{
    issue: string;
    positions: Array<{
      jurisdiction: string;
      position: string;
    }>;
  }>;
  upcomingChanges: Array<{
    topic: string;
    expectedChange: string;
    timeline: string;
    probability: number;
  }>;
  recommendations: string[];
}

export interface SettlementRecommendation {
  recommendation: 'settle' | 'litigate' | 'negotiate_further';
  analysis: {
    settlementValue: {
      proposed: number;
      recommended: number;
      walkawayPoint: number;
    };
    litigationValue: {
      expectedValue: number;
      bestCase: number;
      worstCase: number;
      probability: number;
    };
    valueDifference: number;
    riskAdjustedRecommendation: string;
  };
  negotiationStrategy: {
    openingPosition: number;
    targetSettlement: number;
    minimumAcceptable: number;
    concessionStrategy: string[];
  };
  confidenceLevel: number;
}

export interface ProactiveRisk {
  identifiedRisks: Array<{
    riskId: string;
    category: string;
    description: string;
    probability: number;
    impact: 'low' | 'medium' | 'high' | 'critical';
    expectedCost: number;
    timeToMaterialization: string;
    earlyWarningSignals: string[];
    mitigationActions: Array<{
      action: string;
      cost: number;
      effectiveness: number;
      implementationTime: string;
    }>;
  }>;
  riskMatrix: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  totalExposure: number;
  recommendedBudget: number;
  prioritizedActions: string[];
}

// === HOOK ===
export function usePredictiveLegalAnalytics() {
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<LitigationPrediction | null>(null);
  const [costEstimate, setCostEstimate] = useState<LegalCostEstimate | null>(null);
  const [trends, setTrends] = useState<JurisprudenceTrend | null>(null);
  const [settlementRec, setSettlementRec] = useState<SettlementRecommendation | null>(null);
  const [risks, setRisks] = useState<ProactiveRisk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === PREDICT LITIGATION OUTCOME ===
  const predictLitigationOutcome = useCallback(async (caseDetails: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-predictive-analytics',
        {
          body: {
            action: 'predict_litigation_outcome',
            params: caseDetails
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setPrediction(fnData.data);
        setLastRefresh(new Date());
        return fnData.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[usePredictiveLegalAnalytics] predictLitigationOutcome error:', err);
      toast.error('Error al predecir resultado del litigio');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ESTIMATE LEGAL COSTS ===
  const estimateLegalCosts = useCallback(async (caseDetails: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-predictive-analytics',
        {
          body: {
            action: 'estimate_legal_costs',
            params: caseDetails
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setCostEstimate(fnData.data);
        setLastRefresh(new Date());
        return fnData.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[usePredictiveLegalAnalytics] estimateLegalCosts error:', err);
      toast.error('Error al estimar costes legales');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANALYZE JURISPRUDENCE TRENDS ===
  const analyzeJurisprudenceTrends = useCallback(async (topic: string, jurisdiction?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-predictive-analytics',
        {
          body: {
            action: 'analyze_jurisprudence_trends',
            params: { topic, jurisdiction }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setTrends(fnData.data);
        setLastRefresh(new Date());
        return fnData.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[usePredictiveLegalAnalytics] analyzeJurisprudenceTrends error:', err);
      toast.error('Error al analizar tendencias jurisprudenciales');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === SETTLEMENT RECOMMENDATION ===
  const getSettlementRecommendation = useCallback(async (caseDetails: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-predictive-analytics',
        {
          body: {
            action: 'settlement_recommendation',
            params: caseDetails
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setSettlementRec(fnData.data);
        setLastRefresh(new Date());
        return fnData.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[usePredictiveLegalAnalytics] getSettlementRecommendation error:', err);
      toast.error('Error al obtener recomendación de acuerdo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === IDENTIFY PROACTIVE RISKS ===
  const identifyProactiveRisks = useCallback(async (context: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-predictive-analytics',
        {
          body: {
            action: 'identify_proactive_risks',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setRisks(fnData.data);
        setLastRefresh(new Date());
        return fnData.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[usePredictiveLegalAnalytics] identifyProactiveRisks error:', err);
      toast.error('Error al identificar riesgos proactivos');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === BENCHMARK CLAUSES ===
  const benchmarkClauses = useCallback(async (clauses: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-predictive-analytics',
        {
          body: {
            action: 'benchmark_clauses',
            params: clauses
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Análisis de cláusulas completado');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[usePredictiveLegalAnalytics] benchmarkClauses error:', err);
      toast.error('Error al analizar cláusulas');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CASE SIMILARITY ANALYSIS ===
  const findSimilarCases = useCallback(async (caseDetails: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-predictive-analytics',
        {
          body: {
            action: 'case_similarity_analysis',
            params: caseDetails
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Casos similares encontrados');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[usePredictiveLegalAnalytics] findSimilarCases error:', err);
      toast.error('Error al buscar casos similares');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === LEGAL TIMELINE FORECAST ===
  const forecastTimeline = useCallback(async (caseDetails: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'legal-predictive-analytics',
        {
          body: {
            action: 'legal_timeline_forecast',
            params: caseDetails
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Pronóstico de timeline generado');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[usePredictiveLegalAnalytics] forecastTimeline error:', err);
      toast.error('Error al pronosticar timeline');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    prediction,
    costEstimate,
    trends,
    settlementRec,
    risks,
    error,
    lastRefresh,
    predictLitigationOutcome,
    estimateLegalCosts,
    analyzeJurisprudenceTrends,
    getSettlementRecommendation,
    identifyProactiveRisks,
    benchmarkClauses,
    findSimilarCases,
    forecastTimeline,
  };
}

export default usePredictiveLegalAnalytics;
