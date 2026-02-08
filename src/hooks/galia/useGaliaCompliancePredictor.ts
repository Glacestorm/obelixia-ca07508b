/**
 * useGaliaCompliancePredictor - Predicción de Cumplimiento con ML
 * Fase 7: Excelencia Operacional
 * Predice riesgos de incumplimiento y sugiere acciones preventivas
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ComplianceRisk {
  id: string;
  expedienteId: string;
  riskType: 'deadline' | 'documentation' | 'financial' | 'regulatory' | 'procedural';
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  probability: number;
  impact: number;
  riskScore: number;
  description: string;
  predictedDate?: string;
  mitigationActions: string[];
  factors: Array<{ factor: string; weight: number; value: string }>;
  trend: 'worsening' | 'stable' | 'improving';
}

export interface ComplianceForecast {
  period: string;
  overallComplianceRate: number;
  predictedRisks: number;
  criticalRisks: number;
  expectedResolutions: number;
  confidence: number;
  breakdown: {
    byCategory: Record<string, number>;
    byConvocatoria: Record<string, number>;
    byTecnico: Record<string, number>;
  };
}

export interface PreventiveAction {
  id: string;
  actionType: 'reminder' | 'escalation' | 'documentation_request' | 'review' | 'intervention';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  targetExpedienteId: string;
  description: string;
  suggestedDeadline: string;
  estimatedEffort: string;
  expectedImpact: string;
  automatable: boolean;
}

export interface ComplianceTrend {
  metric: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  forecast: number[];
  forecastLabels: string[];
}

export function useGaliaCompliancePredictor() {
  const [isLoading, setIsLoading] = useState(false);
  const [risks, setRisks] = useState<ComplianceRisk[]>([]);
  const [forecast, setForecast] = useState<ComplianceForecast | null>(null);
  const [actions, setActions] = useState<PreventiveAction[]>([]);
  const [trends, setTrends] = useState<ComplianceTrend[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Predict compliance risks
  const predictRisks = useCallback(async (params?: {
    expedienteIds?: string[];
    convocatoriaId?: string;
    horizon?: 'week' | 'month' | 'quarter';
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-compliance-predictor', {
        body: {
          action: 'predict_risks',
          params: params || {}
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setRisks(data.risks || []);
        return data.risks as ComplianceRisk[];
      }

      throw new Error(data?.error || 'Error en predicción');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al predecir riesgos');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate compliance forecast
  const generateForecast = useCallback(async (months: number = 3) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-compliance-predictor', {
        body: {
          action: 'generate_forecast',
          months
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data.forecast) {
        setForecast(data.forecast);
        return data.forecast as ComplianceForecast;
      }

      return null;
    } catch (err) {
      toast.error('Error al generar pronóstico');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get preventive actions
  const getPreventiveActions = useCallback(async (expedienteId?: string) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-compliance-predictor', {
        body: {
          action: 'get_preventive_actions',
          expedienteId
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setActions(data.actions || []);
        return data.actions as PreventiveAction[];
      }

      return [];
    } catch (err) {
      console.error('[CompliancePredictor] Actions error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Execute preventive action
  const executeAction = useCallback(async (actionId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-compliance-predictor', {
        body: {
          action: 'execute_action',
          actionId
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setActions(prev => prev.filter(a => a.id !== actionId));
        toast.success('Acción preventiva ejecutada');
        return true;
      }

      return false;
    } catch (err) {
      toast.error('Error al ejecutar acción');
      return false;
    }
  }, []);

  // Analyze compliance trends
  const analyzeTrends = useCallback(async (period: 'month' | 'quarter' | 'year' = 'quarter') => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-compliance-predictor', {
        body: {
          action: 'analyze_trends',
          period
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setTrends(data.trends || []);
        return data.trends as ComplianceTrend[];
      }

      return [];
    } catch (err) {
      console.error('[CompliancePredictor] Trends error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get risk score for specific expediente
  const getRiskScore = useCallback(async (expedienteId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-compliance-predictor', {
        body: {
          action: 'get_risk_score',
          expedienteId
        }
      });

      if (fnError) throw fnError;

      return data?.success ? data.score : null;
    } catch (err) {
      console.error('[CompliancePredictor] Risk score error:', err);
      return null;
    }
  }, []);

  return {
    isLoading,
    risks,
    forecast,
    actions,
    trends,
    error,
    predictRisks,
    generateForecast,
    getPreventiveActions,
    executeAction,
    analyzeTrends,
    getRiskScore
  };
}

export default useGaliaCompliancePredictor;
