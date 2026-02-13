/**
 * GALIA - Hook de Detección de Fraude
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FraudIndicator {
  tipo: string;
  nivel: 'critico' | 'alto' | 'medio' | 'bajo';
  titulo: string;
  descripcion: string;
  evidencia: string;
  accionRequerida: string;
  articuloNormativo?: string;
}

export interface FraudAlert {
  tipo: 'bloqueo' | 'revision' | 'seguimiento';
  mensaje: string;
  urgencia: 'inmediata' | '24h' | 'semanal';
}

export interface FraudAnalysisResult {
  riesgoGlobal: 'critico' | 'alto' | 'medio' | 'bajo';
  puntuacionRiesgo: number;
  indicadores: FraudIndicator[];
  alertas: FraudAlert[];
  recomendaciones: string[];
  resumen: string;
}

export interface ExpedienteDataForFraud {
  beneficiario_nif: string;
  beneficiario_nombre: string;
  importe_solicitado: number;
  partidas: Array<{ concepto: string; importe: number; proveedor?: string; nif_proveedor?: string }>;
  proveedores?: Array<{ nombre: string; nif: string; importe: number }>;
}

export function useGaliaFraudDetection() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FraudAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeExpediente = useCallback(async (
    expedienteData: ExpedienteDataForFraud,
    action: 'analyze_fraud' | 'check_splitting' | 'check_duplicates' | 'full_scan' = 'full_scan'
  ) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-fraud-detection', {
        body: { action, expedienteData }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const analysisResult = data.data as FraudAnalysisResult;
        setResult(analysisResult);

        const criticalCount = analysisResult.indicadores?.filter(i => i.nivel === 'critico').length || 0;
        if (criticalCount > 0) {
          toast.error(`⚠️ ${criticalCount} indicador(es) CRÍTICO(s) detectado(s)`);
        } else if (analysisResult.riesgoGlobal === 'alto') {
          toast.warning('Riesgo ALTO detectado - Revisión necesaria');
        } else {
          toast.success(`Análisis completado - Riesgo: ${analysisResult.riesgoGlobal}`);
        }

        return analysisResult;
      }

      throw new Error('Respuesta inválida del servicio');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(`Error en análisis de fraude: ${message}`);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    result,
    error,
    analyzeExpediente,
    clearResult,
  };
}

export default useGaliaFraudDetection;
