/**
 * useGaliaDecisionSupport - Hook for AI-powered Decision Support System
 * 
 * Phase 6 of GALIA 2.0 Strategic Plan:
 * - Multi-criteria application evaluation
 * - Automated scoring with weighted algorithms
 * - Cross-module synchronization (Accounting, Treasury, Legal)
 * - Compliance verification engine
 * - Recommendation system for technicians
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export interface EvaluationCriterion {
  criterioId: string;
  nombre: string;
  puntuacion: number;
  puntuacionPonderada: number;
  justificacion: string;
  evidencias: string[];
  observaciones: string | null;
}

export interface EvaluationResult {
  evaluacion: {
    puntuacionTotal: number;
    puntuacionPonderada: number;
    criteriosEvaluados: EvaluationCriterion[];
    fortalezas: string[];
    debilidades: string[];
    riesgos: string[];
  };
  elegibilidad: {
    cumpleRequisitos: boolean;
    requisitosFaltantes: string[];
    subsanables: string[];
    noSubsanables: string[];
  };
  recomendacion: {
    decision: 'APROBAR' | 'DENEGAR' | 'SUBSANAR' | 'REVISAR';
    confianza: number;
    justificacionTecnica: string;
    condicionesEspeciales: string[];
    plazoSubsanacion: string | null;
  };
  trazabilidad: {
    modeloIA: string;
    versionAlgoritmo: string;
    fechaEvaluacion: string;
    hashEvaluacion: string;
  };
}

export interface ScoringResult {
  scoring: {
    puntuacionFinal: number;
    ranking: 'A' | 'B' | 'C' | 'D';
    percentil: number;
    desglose: Array<{
      criterio: string;
      peso: number;
      puntuacionBruta: number;
      puntuacionPonderada: number;
      detalle: string;
    }>;
  };
  comparativa: {
    mediaConvocatoria: number;
    posicionEstimada: string;
    probabilidadAprobacion: number;
  };
  mejoras: Array<{
    area: string;
    sugerencia: string;
    impactoPotencial: number;
  }>;
}

export interface ComplianceResult {
  cumplimiento: {
    global: boolean;
    porcentaje: number;
    nivel: 'TOTAL' | 'PARCIAL' | 'INCUMPLIMIENTO';
  };
  verificaciones: Array<{
    normativa: string;
    articulo: string;
    requisito: string;
    cumple: boolean;
    evidencia: string | null;
    observacion: string | null;
    subsanable: boolean;
    criticidad: 'ALTA' | 'MEDIA' | 'BAJA';
  }>;
  alertas: Array<{
    tipo: 'BLOQUEO' | 'ADVERTENCIA' | 'INFO';
    mensaje: string;
    accionRequerida: string | null;
  }>;
  minimisDenota: {
    acumulado: number;
    limiteDisponible: number;
    ayudaSolicitada: number;
    superaLimite: boolean;
  };
}

export interface CrossModuleSyncResult {
  sincronizacion: {
    modulo: string;
    estado: 'SINCRONIZADO' | 'PENDIENTE' | 'ERROR';
    ultimaSync: string;
    registrosAfectados: number;
  };
  datosExportados: {
    expedienteId: string;
    campos: Array<{
      origen: string;
      destino: string;
      valor: unknown;
      transformacion: string | null;
    }>;
  };
  contabilidad?: {
    asientosPropuestos: Array<{
      fecha: string;
      cuenta: string;
      debe: number;
      haber: number;
      concepto: string;
    }>;
    presupuestoAfectado: {
      aplicacion: string;
      importe: number;
      tipo: 'COMPROMISO' | 'OBLIGACION' | 'PAGO';
    };
  };
  tesoreria?: {
    ordenPago: {
      beneficiario: string;
      importe: number;
      concepto: string;
      cuentaDestino: string;
    };
  };
  validaciones: Array<{
    campo: string;
    valido: boolean;
    mensaje: string;
  }>;
}

export interface Recommendation {
  id: string;
  tipo: 'ACCION' | 'REVISION' | 'DOCUMENTACION' | 'COMUNICACION';
  prioridad: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';
  titulo: string;
  descripcion: string;
  fundamentoLegal: string | null;
  plazoSugerido: string;
  impactoEstimado: string;
}

export interface RecommendationResult {
  recomendaciones: Recommendation[];
  proximosPasos: Array<{
    orden: number;
    accion: string;
    responsable: string;
    plazo: string;
  }>;
  alertasProactivas: Array<{
    tipo: 'PLAZO' | 'DOCUMENTACION' | 'NORMATIVA' | 'PRESUPUESTO';
    mensaje: string;
    fechaLimite: string | null;
  }>;
  expedientesSimilares: Array<{
    id: string;
    similitud: number;
    decision: string;
    aprendizaje: string;
  }>;
}

export interface ApplicationData {
  proyecto: Record<string, unknown>;
  presupuesto: Record<string, unknown>;
  solicitante: Record<string, unknown>;
  documentacion: string[];
}

export interface EvaluationCriteria {
  id: string;
  nombre: string;
  peso: number;
  descripcion: string;
}

export type ModuleType = 'accounting' | 'treasury' | 'legal' | 'contracting';

// === HOOK ===

export function useGaliaDecisionSupport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [syncResult, setSyncResult] = useState<CrossModuleSyncResult | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);

  // === EVALUATE APPLICATION ===
  const evaluateApplication = useCallback(async (
    applicationData: ApplicationData,
    criterios?: EvaluationCriteria[]
  ): Promise<EvaluationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-decision-support', {
        body: {
          action: 'evaluate_application',
          applicationData,
          criterios
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setEvaluationResult(data.data);
        toast.success('Evaluación completada');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en evaluación';
      setError(message);
      toast.error('Error al evaluar solicitud');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE SCORING ===
  const generateScoring = useCallback(async (
    expedienteId: string,
    applicationData: ApplicationData,
    criterios?: EvaluationCriteria[]
  ): Promise<ScoringResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-decision-support', {
        body: {
          action: 'generate_scoring',
          expedienteId,
          applicationData,
          criterios
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setScoringResult(data.data);
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en scoring';
      setError(message);
      toast.error('Error al generar scoring');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === COMPLIANCE CHECK ===
  const checkCompliance = useCallback(async (
    expedienteId: string,
    applicationData: ApplicationData
  ): Promise<ComplianceResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-decision-support', {
        body: {
          action: 'compliance_check',
          expedienteId,
          applicationData
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setComplianceResult(data.data);
        
        if (data.data.cumplimiento?.global) {
          toast.success('Cumplimiento normativo verificado');
        } else {
          toast.warning('Se detectaron incumplimientos');
        }

        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en verificación';
      setError(message);
      toast.error('Error al verificar cumplimiento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CROSS-MODULE SYNC ===
  const syncWithModule = useCallback(async (
    expedienteId: string,
    moduleType: ModuleType,
    syncData: Record<string, unknown>
  ): Promise<CrossModuleSyncResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-decision-support', {
        body: {
          action: 'cross_module_sync',
          expedienteId,
          moduleType,
          syncData
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setSyncResult(data.data);
        
        const moduleName = {
          accounting: 'Contabilidad',
          treasury: 'Tesorería',
          legal: 'Jurídico',
          contracting: 'Contratación'
        }[moduleType];
        
        toast.success(`Sincronizado con ${moduleName}`);
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en sincronización';
      setError(message);
      toast.error('Error al sincronizar módulo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GET RECOMMENDATIONS ===
  const getRecommendations = useCallback(async (
    expedienteId: string,
    applicationData: ApplicationData
  ): Promise<RecommendationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-decision-support', {
        body: {
          action: 'recommendation_engine',
          expedienteId,
          applicationData
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setRecommendations(data.data);
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en recomendaciones';
      setError(message);
      console.error('[useGaliaDecisionSupport] getRecommendations error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CLEAR STATE ===
  const clearState = useCallback(() => {
    setEvaluationResult(null);
    setScoringResult(null);
    setComplianceResult(null);
    setSyncResult(null);
    setRecommendations(null);
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    evaluationResult,
    scoringResult,
    complianceResult,
    syncResult,
    recommendations,
    // Actions
    evaluateApplication,
    generateScoring,
    checkCompliance,
    syncWithModule,
    getRecommendations,
    clearState
  };
}

export default useGaliaDecisionSupport;
