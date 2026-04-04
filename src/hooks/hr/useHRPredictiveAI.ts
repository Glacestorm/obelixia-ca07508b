/**
 * useHRPredictiveAI — Hook para predicciones HR con IA real via Lovable AI
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PredictionResult {
  id: string;
  title: string;
  prediction: string;
  confidence: number;
  risk: 'high' | 'medium' | 'low';
  category: string;
  detail: string;
  norm?: string;
  suggestedAction?: string;
}

export interface CrossValidationAIResult {
  artifact: string;
  field: string;
  status: 'ok' | 'warning' | 'error';
  diff: string;
  detail?: string;
}

export function useHRPredictiveAI() {
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [crossValidations, setCrossValidations] = useState<CrossValidationAIResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPredictions = useCallback(async (context: {
    employees?: Array<{ id: string; name: string; cie10?: string; cno?: string; itDays?: number; contractType?: string; contractEnd?: string; ssGroup?: number; irpfRate?: number; baseCotizacion?: number }>;
    companyId?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('payroll-calculation-engine', {
        body: {
          action: 'predict_risks',
          context: {
            employees: context.employees || [],
            companyId: context.companyId,
            analysisType: 'comprehensive',
            categories: ['it', 'pluriempleo', 'irpf', 'contratos', 'validacion', 'compliance'],
          },
        },
      });

      if (fnError) throw fnError;

      if (data?.predictions) {
        setPredictions(data.predictions);
      } else if (data?.data?.predictions) {
        setPredictions(data.data.predictions);
      }

      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error en predicción';
      setError(msg);
      toast.error('Error al ejecutar análisis predictivo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runCrossValidation = useCallback(async (context: {
    periodMonth: number;
    periodYear: number;
    companyId?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('payroll-calculation-engine', {
        body: {
          action: 'cross_validate',
          context,
        },
      });

      if (fnError) throw fnError;

      if (data?.validations) {
        setCrossValidations(data.validations);
      }

      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error en validación';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    predictions,
    crossValidations,
    isLoading,
    error,
    runPredictions,
    runCrossValidation,
  };
}
