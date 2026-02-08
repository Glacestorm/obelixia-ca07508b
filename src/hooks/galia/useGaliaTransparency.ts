/**
 * useGaliaTransparency - Hook para sistema de transparencia y explicabilidad IA
 * Portal público, trazabilidad de decisiones y auditoría
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface PublicDataFilters {
  year?: number;
  status?: string;
  gal_id?: string;
}

export interface PublicStatistics {
  totalProyectos: number;
  importeConcedido: number;
  empleoGenerado: number;
  distribucionSectorial: Record<string, number>;
}

export interface PublicData {
  convocatorias: Array<{
    id: string;
    titulo: string;
    año: number;
    presupuesto: number;
    proyectosAprobados: number;
  }>;
  estadisticas: PublicStatistics;
  indicadores: {
    tiempoMedioResolucion: number;
    tasaAprobacion: number;
    inversionPrivadaMovilizada: number;
  };
}

export interface DecisionFactor {
  factor: string;
  peso: number;
  impacto: 'positivo' | 'negativo' | 'neutro';
  explicacion: string;
}

export interface DecisionExplanation {
  decision: {
    tipo: string;
    resultado: string;
    fecha: string;
  };
  explicacion: {
    resumenEjecutivo: string;
    factoresDeterminantes: DecisionFactor[];
    criteriosAplicados: string[];
    alternativasConsideradas: string[];
    limitaciones: string[];
  };
  trazabilidad: {
    modeloIA: string;
    versionAlgoritmo: string;
    datosUtilizados: string[];
    fechaAnalisis: string;
  };
  derechosUsuario: {
    recurso: string;
    plazo: string;
    contacto: string;
  };
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  accion: string;
  actor: {
    tipo: 'usuario' | 'sistema' | 'ia';
    id: string;
    rol: string;
  };
  detalles: {
    descripcion: string;
    datosAntes?: Record<string, unknown>;
    datosDespues?: Record<string, unknown>;
    justificacion?: string;
  };
  verificacion: {
    hash: string;
    integridad: 'verificado' | 'pendiente';
  };
}

export interface AuditTrail {
  expedienteId: string;
  trailCompleto: AuditTrailEntry[];
  resumen: {
    totalAcciones: number;
    accionesPorTipo: Record<string, number>;
    tiempoTotal: string;
    participantes: number;
  };
  certificacion: {
    fechaGeneracion: string;
    validezHasta: string;
    codigoVerificacion: string;
  };
}

export interface PublicReport {
  informe: {
    titulo: string;
    periodo: string;
    fechaPublicacion: string;
  };
  contenido: {
    resumenEjecutivo: string;
    datosAgregados: {
      solicitudesRecibidas: number;
      solicitudesAprobadas: number;
      importeTotal: number;
      empleoComprometido: number;
    };
    desgloseSectorial: Array<{ sector: string; cantidad: number; importe: number }>;
    desgloseGeografico: Array<{ zona: string; cantidad: number; importe: number }>;
    indicadoresImpacto: Array<{ indicador: string; valor: number; unidad: string }>;
  };
  graficos: Array<{
    tipo: 'bar' | 'pie' | 'line';
    titulo: string;
    datos: Array<{ label: string; value: number }>;
  }>;
  metodologia: string;
}

// === HOOK ===
export function useGaliaTransparency() {
  const [isLoading, setIsLoading] = useState(false);
  const [publicData, setPublicData] = useState<PublicData | null>(null);
  const [decisionExplanation, setDecisionExplanation] = useState<DecisionExplanation | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);
  const [publicReport, setPublicReport] = useState<PublicReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // === OBTENER DATOS PÚBLICOS ===
  const fetchPublicData = useCallback(async (filters?: PublicDataFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-transparency', {
        body: {
          action: 'get_public_data',
          filters
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data?.publicData) {
        setPublicData(data.data.publicData);
        return data.data.publicData;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener datos públicos';
      setError(message);
      console.error('[useGaliaTransparency] fetchPublicData error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === EXPLICAR DECISIÓN ===
  const explainDecision = useCallback(async (expedienteId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-transparency', {
        body: {
          action: 'explain_decision',
          expediente_id: expedienteId
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const explanation = data.data as DecisionExplanation;
        setDecisionExplanation(explanation);
        return explanation;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al explicar decisión';
      setError(message);
      console.error('[useGaliaTransparency] explainDecision error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER TRAIL DE AUDITORÍA ===
  const fetchAuditTrail = useCallback(async (expedienteId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-transparency', {
        body: {
          action: 'get_audit_trail',
          expediente_id: expedienteId
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const trail = data.data as AuditTrail;
        setAuditTrail(trail);
        return trail;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener auditoría';
      setError(message);
      console.error('[useGaliaTransparency] fetchAuditTrail error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERAR INFORME PÚBLICO ===
  const generatePublicReport = useCallback(async (year?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-transparency', {
        body: {
          action: 'generate_public_report',
          filters: { year }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const report = data.data as PublicReport;
        setPublicReport(report);
        toast.success('Informe público generado');
        return report;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar informe';
      setError(message);
      console.error('[useGaliaTransparency] generatePublicReport error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === RESET ===
  const reset = useCallback(() => {
    setPublicData(null);
    setDecisionExplanation(null);
    setAuditTrail(null);
    setPublicReport(null);
    setError(null);
  }, []);

  return {
    // Estado
    isLoading,
    error,
    publicData,
    decisionExplanation,
    auditTrail,
    publicReport,
    // Acciones
    fetchPublicData,
    explainDecision,
    fetchAuditTrail,
    generatePublicReport,
    reset,
  };
}

export default useGaliaTransparency;
