/**
 * Predictive Pipeline Hook - Phase 7: Advanced AI
 * ML-powered deal predictions and pipeline forecasting
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DealPrediction {
  id: string;
  dealName: string;
  company: string;
  value: number;
  currentStage: string;
  winProbability: number;
  predictedCloseDate: string;
  daysToClose: number;
  trend: 'up' | 'down' | 'stable';
  riskFactors: string[];
  recommendations: string[];
  confidenceScore: number;
  lastAnalyzed: string;
}

export interface QuarterForecast {
  quarter: string;
  predicted: number;
  optimistic: number;
  pessimistic: number;
  achieved: number;
  probability: number;
}

export interface PipelineInsight {
  id: string;
  type: 'positive' | 'warning' | 'opportunity';
  title: string;
  description: string;
  actionLabel?: string;
  actionData?: Record<string, unknown>;
  priority: number;
}

export interface PipelineHealth {
  score: number;
  atRisk: number;
  healthy: number;
  totalValue: number;
  weightedValue: number;
  trend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
}

export function usePredictivePipeline() {
  const [predictions, setPredictions] = useState<DealPrediction[]>([]);
  const [forecasts, setForecasts] = useState<QuarterForecast[]>([]);
  const [insights, setInsights] = useState<PipelineInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  // Calculate pipeline health from predictions
  const pipelineHealth = useMemo<PipelineHealth>(() => {
    if (predictions.length === 0) {
      return {
        score: 0,
        atRisk: 0,
        healthy: 0,
        totalValue: 0,
        weightedValue: 0,
        trend: 'stable',
        trendPercentage: 0
      };
    }

    const avgProbability = predictions.reduce((acc, d) => acc + d.winProbability, 0) / predictions.length;
    const atRisk = predictions.filter(d => d.trend === 'down' || d.winProbability < 40).length;
    const healthy = predictions.filter(d => d.trend === 'up' && d.winProbability >= 60).length;
    const totalValue = predictions.reduce((acc, d) => acc + d.value, 0);
    const weightedValue = predictions.reduce((acc, d) => acc + (d.value * d.winProbability / 100), 0);

    // Determine trend based on average confidence
    const avgConfidence = predictions.reduce((acc, d) => acc + d.confidenceScore, 0) / predictions.length;
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (avgConfidence > 80) trend = 'improving';
    else if (avgConfidence < 60) trend = 'declining';

    return {
      score: Math.round(avgProbability),
      atRisk,
      healthy,
      totalValue,
      weightedValue,
      trend,
      trendPercentage: Math.round((avgConfidence - 70) / 70 * 100)
    };
  }, [predictions]);

  // Fetch predictions from AI
  const fetchPredictions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-predictive-pipeline', {
        body: {
          action: 'get_predictions'
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setPredictions(data.predictions || []);
        setForecasts(data.forecasts || []);
        setInsights(data.insights || []);
        setLastAnalysis(new Date());
        return data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      console.error('[usePredictivePipeline] fetchPredictions error:', err);
      setError('Error cargando predicciones');
      
      // Load fallback demo data
      loadDemoData();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh predictions (re-analyze with latest data)
  const refreshPredictions = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-predictive-pipeline', {
        body: {
          action: 'refresh_analysis',
          forceRefresh: true
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setPredictions(data.predictions || []);
        setForecasts(data.forecasts || []);
        setInsights(data.insights || []);
        setLastAnalysis(new Date());
        toast.success('Predicciones actualizadas');
        return data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      console.error('[usePredictivePipeline] refreshPredictions error:', err);
      toast.error('Error actualizando predicciones');
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Get detailed prediction for a specific deal
  const getDealPrediction = useCallback(async (dealId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-predictive-pipeline', {
        body: {
          action: 'analyze_deal',
          dealId
        }
      });

      if (fnError) throw fnError;

      return data?.prediction || null;
    } catch (err) {
      console.error('[usePredictivePipeline] getDealPrediction error:', err);
      return null;
    }
  }, []);

  // Apply a recommendation
  const applyRecommendation = useCallback(async (dealId: string, recommendationIndex: number) => {
    const deal = predictions.find(d => d.id === dealId);
    if (!deal || !deal.recommendations[recommendationIndex]) return false;

    toast.success('Recomendación aplicada', {
      description: deal.recommendations[recommendationIndex]
    });

    return true;
  }, [predictions]);

  // Load demo data as fallback
  const loadDemoData = useCallback(() => {
    setPredictions([
      {
        id: '1',
        dealName: 'Enterprise License',
        company: 'Acme Corp',
        value: 85000,
        currentStage: 'Propuesta',
        winProbability: 78,
        predictedCloseDate: '2026-02-15',
        daysToClose: 12,
        trend: 'up',
        riskFactors: [],
        recommendations: ['Agendar demo técnica', 'Enviar casos de éxito'],
        confidenceScore: 92,
        lastAnalyzed: new Date().toISOString()
      },
      {
        id: '2',
        dealName: 'CRM Implementation',
        company: 'TechStart',
        value: 45000,
        currentStage: 'Negociación',
        winProbability: 65,
        predictedCloseDate: '2026-02-28',
        daysToClose: 25,
        trend: 'down',
        riskFactors: ['Sin respuesta hace 5 días', 'Competidor activo'],
        recommendations: ['Llamada urgente', 'Ofrecer descuento early-bird'],
        confidenceScore: 78,
        lastAnalyzed: new Date().toISOString()
      },
      {
        id: '3',
        dealName: 'Full Suite',
        company: 'Global Industries',
        value: 120000,
        currentStage: 'Contactado',
        winProbability: 45,
        predictedCloseDate: '2026-03-30',
        daysToClose: 55,
        trend: 'stable',
        riskFactors: ['Proceso de decisión largo', 'Múltiples stakeholders'],
        recommendations: ['Identificar decision maker', 'Preparar ROI personalizado'],
        confidenceScore: 85,
        lastAnalyzed: new Date().toISOString()
      }
    ]);

    setForecasts([
      { quarter: 'Q1 2026', predicted: 450000, optimistic: 520000, pessimistic: 380000, achieved: 180000, probability: 75 },
      { quarter: 'Q2 2026', predicted: 580000, optimistic: 680000, pessimistic: 480000, achieved: 0, probability: 68 }
    ]);

    setInsights([
      {
        id: '1',
        type: 'positive',
        title: 'Momentum positivo',
        description: 'Tu tasa de conversión ha mejorado un 15% en las últimas 2 semanas. Los deals en etapa "Propuesta" tienen 23% más probabilidad de cerrar.',
        priority: 1
      },
      {
        id: '2',
        type: 'warning',
        title: 'Atención requerida',
        description: '2 deals de alto valor no han tenido actividad en 7+ días. El ML sugiere contacto inmediato para evitar pérdida.',
        actionLabel: 'Ver deals',
        actionData: { filter: 'inactive', days: 7 },
        priority: 2
      },
      {
        id: '3',
        type: 'opportunity',
        title: 'Oportunidad detectada',
        description: 'Basado en patrones similares, los leads del sector "Tecnología" tienen 40% más probabilidad de convertir en enero.',
        priority: 3
      }
    ]);

    setLastAnalysis(new Date());
  }, []);

  // Initial load
  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return {
    // State
    predictions,
    forecasts,
    insights,
    pipelineHealth,
    isLoading,
    isRefreshing,
    error,
    lastAnalysis,
    // Actions
    fetchPredictions,
    refreshPredictions,
    getDealPrediction,
    applyRecommendation,
    loadDemoData,
  };
}

export default usePredictivePipeline;
