/**
 * useGaliaAIAnalysis - Hook para análisis inteligente de expedientes GALIA
 * Integra IA para scoring de riesgo, asignación, predicción y alertas
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { GaliaExpediente } from './useGaliaExpedientes';

// === INTERFACES ===

export interface RiskAnalysisResult {
  scoring_riesgo: number;
  nivel_riesgo: 'bajo' | 'medio' | 'alto' | 'critico';
  factores_riesgo: Array<{
    factor: string;
    peso: number;
    descripcion: string;
  }>;
  recomendaciones: string[];
  acciones_prioritarias: string[];
  probabilidad_incidencia: number;
}

export interface SmartAssignmentResult {
  tecnico_recomendado_id: string;
  tecnico_recomendado_nombre: string;
  puntuacion_match: number;
  justificacion: string;
  alternativas: Array<{
    tecnico_id: string;
    nombre: string;
    puntuacion: number;
    razon: string;
  }>;
  carga_resultante: number;
}

export interface DeadlinePredictionResult {
  fecha_estimada_resolucion: string;
  dias_estimados: number;
  confianza: number;
  hitos_intermedios: Array<{
    estado: string;
    fecha_estimada: string;
    dias: number;
  }>;
  factores_retraso: string[];
  factores_aceleracion: string[];
  escenarios: {
    optimista: { dias: number; fecha: string };
    probable: { dias: number; fecha: string };
    pesimista: { dias: number; fecha: string };
  };
}

export interface ProactiveAlert {
  expediente_id: string;
  numero_expediente: string;
  tipo: 'vencimiento' | 'desviacion' | 'documentacion' | 'estancamiento' | 'normativo';
  severidad: 'info' | 'warning' | 'error' | 'critical';
  titulo: string;
  descripcion: string;
  accion_recomendada: string;
  fecha_limite: string | null;
  dias_restantes: number | null;
}

export interface ProactiveAlertsResult {
  alertas: ProactiveAlert[];
  resumen: {
    total_alertas: number;
    criticas: number;
    warnings: number;
    info: number;
  };
  recomendacion_general: string;
}

export interface FullAnalysisResult {
  riesgo: {
    scoring: number;
    nivel: 'bajo' | 'medio' | 'alto' | 'critico';
    factores_principales: string[];
  };
  asignacion: {
    tecnico_recomendado: string | null;
    justificacion: string;
  };
  plazos: {
    fecha_estimada_resolucion: string;
    dias_estimados: number;
    confianza: number;
  };
  alertas_activas: Array<{
    tipo: string;
    severidad: string;
    mensaje: string;
  }>;
  puntuacion_salud: number;
  resumen_ejecutivo: string;
  proximos_pasos: string[];
}

export interface TecnicoData {
  id: string;
  nombre: string;
  expedientes_asignados: number;
  especialidad?: string[];
  carga_trabajo: number;
}

// === HOOK ===

export function useGaliaAIAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<FullAnalysisResult | null>(null);
  const [lastRiskAnalysis, setLastRiskAnalysis] = useState<RiskAnalysisResult | null>(null);
  const [lastAlerts, setLastAlerts] = useState<ProactiveAlertsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preparar datos del expediente para la IA
  const prepareExpedienteData = useCallback((expediente: GaliaExpediente) => {
    const fechaApertura = new Date(expediente.fecha_apertura);
    const diasEnEstado = Math.floor((Date.now() - fechaApertura.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: expediente.id,
      numero_expediente: expediente.numero_expediente,
      estado: expediente.estado,
      fecha_apertura: expediente.fecha_apertura,
      importe_solicitado: expediente.solicitud?.importe_solicitado,
      importe_concedido: expediente.importe_concedido,
      presupuesto_total: expediente.solicitud?.presupuesto_total,
      scoring_riesgo: expediente.scoring_riesgo,
      titulo_proyecto: expediente.solicitud?.titulo_proyecto,
      beneficiario: expediente.solicitud?.beneficiario,
      tecnico_instructor_id: expediente.tecnico_instructor_id,
      dias_en_estado: diasEnEstado,
    };
  }, []);

  // Análisis de riesgo
  const analyzeRisk = useCallback(async (expediente: GaliaExpediente): Promise<RiskAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-ai-analysis', {
        body: {
          action: 'risk_analysis',
          expedienteData: prepareExpedienteData(expediente),
        },
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setLastRiskAnalysis(data.data);
        return data.data;
      }

      throw new Error(data?.error || 'Error en análisis de riesgo');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al analizar riesgo');
      console.error('[useGaliaAIAnalysis] analyzeRisk error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [prepareExpedienteData]);

  // Asignación inteligente
  const getSmartAssignment = useCallback(async (
    expediente: GaliaExpediente,
    tecnicos: TecnicoData[]
  ): Promise<SmartAssignmentResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-ai-analysis', {
        body: {
          action: 'smart_assignment',
          expedienteData: prepareExpedienteData(expediente),
          tecnicos,
        },
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        return data.data;
      }

      throw new Error(data?.error || 'Error en asignación inteligente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al obtener asignación');
      console.error('[useGaliaAIAnalysis] getSmartAssignment error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [prepareExpedienteData]);

  // Predicción de plazos
  const predictDeadlines = useCallback(async (expediente: GaliaExpediente): Promise<DeadlinePredictionResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-ai-analysis', {
        body: {
          action: 'deadline_prediction',
          expedienteData: prepareExpedienteData(expediente),
        },
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        return data.data;
      }

      throw new Error(data?.error || 'Error en predicción de plazos');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al predecir plazos');
      console.error('[useGaliaAIAnalysis] predictDeadlines error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [prepareExpedienteData]);

  // Alertas proactivas
  const getProactiveAlerts = useCallback(async (expedientes: GaliaExpediente[]): Promise<ProactiveAlertsResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const preparedExpedientes = expedientes.map(prepareExpedienteData);

      const { data, error: fnError } = await supabase.functions.invoke('galia-ai-analysis', {
        body: {
          action: 'proactive_alerts',
          expedientes: preparedExpedientes,
        },
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setLastAlerts(data.data);
        return data.data;
      }

      throw new Error(data?.error || 'Error en alertas proactivas');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al obtener alertas');
      console.error('[useGaliaAIAnalysis] getProactiveAlerts error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [prepareExpedienteData]);

  // Análisis completo
  const getFullAnalysis = useCallback(async (
    expediente: GaliaExpediente,
    tecnicos?: TecnicoData[]
  ): Promise<FullAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-ai-analysis', {
        body: {
          action: 'full_analysis',
          expedienteData: prepareExpedienteData(expediente),
          tecnicos,
        },
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setLastAnalysis(data.data);
        return data.data;
      }

      throw new Error(data?.error || 'Error en análisis completo');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al realizar análisis completo');
      console.error('[useGaliaAIAnalysis] getFullAnalysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [prepareExpedienteData]);

  // Limpiar estado
  const clearAnalysis = useCallback(() => {
    setLastAnalysis(null);
    setLastRiskAnalysis(null);
    setLastAlerts(null);
    setError(null);
  }, []);

  return {
    // Estado
    isAnalyzing,
    error,
    lastAnalysis,
    lastRiskAnalysis,
    lastAlerts,
    // Acciones
    analyzeRisk,
    getSmartAssignment,
    predictDeadlines,
    getProactiveAlerts,
    getFullAnalysis,
    clearAnalysis,
  };
}

export default useGaliaAIAnalysis;
