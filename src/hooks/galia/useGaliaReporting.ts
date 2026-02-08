/**
 * useGaliaReporting - Hook para generación automática de informes
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReportPeriodo {
  inicio: string;
  fin: string;
}

export interface MemoriaAnual {
  titulo: string;
  periodo: string;
  resumen_ejecutivo: string;
  secciones: Array<{
    titulo: string;
    contenido: string;
    datos_clave: Array<{ metrica: string; valor: string }>;
    graficos_sugeridos: string[];
  }>;
  indicadores_feder: {
    productividad: Array<{ indicador: string; objetivo: number; logrado: number }>;
    resultado: Array<{ indicador: string; objetivo: number; logrado: number }>;
  };
  conclusiones: string;
  recomendaciones: string[];
  anexos_sugeridos: string[];
}

export interface InformeFEDER {
  informe_id: string;
  periodo_referencia: string;
  tipo_informe: 'seguimiento' | 'anual' | 'final';
  ejecucion_financiera: {
    presupuesto_aprobado: number;
    comprometido: number;
    pagado: number;
    porcentaje_ejecucion: number;
    desviacion: number;
  };
  indicadores: {
    productividad: Array<{
      codigo: string;
      nombre: string;
      unidad: string;
      objetivo: number;
      realizado: number;
      porcentaje: number;
    }>;
    resultado: Array<{
      codigo: string;
      nombre: string;
      unidad: string;
      base: number;
      objetivo: number;
      valor_actual: number;
    }>;
  };
  objetivos_transversales: {
    igualdad_genero: { descripcion: string; acciones: string[] };
    desarrollo_sostenible: { descripcion: string; acciones: string[] };
    digitalizacion: { descripcion: string; acciones: string[] };
  };
  proyectos_destacados: Array<{ titulo: string; importe: number; impacto: string }>;
  conclusiones: string;
  proximos_pasos: string[];
}

export interface CuadroMando {
  titulo: string;
  fecha_generacion: string;
  periodo: string;
  kpis_principales: Array<{
    nombre: string;
    valor: number;
    unidad: string;
    objetivo: number;
    estado: 'verde' | 'amarillo' | 'rojo';
    tendencia: 'subiendo' | 'estable' | 'bajando';
    variacion_periodo_anterior: number;
  }>;
  resumen_financiero: {
    presupuesto_total: number;
    ejecutado: number;
    pendiente: number;
    porcentaje_ejecucion: number;
  };
  pipeline_expedientes: {
    en_tramite: number;
    pendiente_resolucion: number;
    aprobados_mes: number;
    rechazados_mes: number;
  };
  alertas_activas: Array<{
    tipo: string;
    mensaje: string;
    prioridad: 'alta' | 'media' | 'baja';
  }>;
  insights: string[];
}

export interface InformeSeguimiento {
  titulo: string;
  periodo: string;
  resumen: string;
  estado_expedientes: {
    total: number;
    por_estado: Array<{ estado: string; cantidad: number; porcentaje: number }>;
  };
  expedientes_criticos: Array<{
    numero: string;
    motivo: string;
    accion_requerida: string;
    plazo: string;
  }>;
  logros_periodo: string[];
  acciones_proximas: Array<{
    accion: string;
    responsable: string;
    fecha_limite: string;
  }>;
}

export function useGaliaReporting() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMemoriaAnual = useCallback(async (
    periodo: ReportPeriodo,
    data: { expedientes: unknown[]; convocatorias: unknown[]; kpis: unknown }
  ): Promise<MemoriaAnual | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('galia-reporting-engine', {
        body: {
          action: 'generate_memoria_anual',
          periodo,
          expedientesData: data.expedientes,
          convocatoriasData: data.convocatorias,
          kpisData: data.kpis
        }
      });

      if (fnError) throw fnError;

      if (result?.success && result?.data) {
        toast.success('Memoria anual generada');
        return result.data as MemoriaAnual;
      }

      throw new Error(result?.error || 'Error generando memoria');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al generar memoria', { description: message });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateInformeFEDER = useCallback(async (
    periodo: ReportPeriodo,
    data: { expedientes: unknown[]; convocatorias: unknown[]; kpis: unknown }
  ): Promise<InformeFEDER | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('galia-reporting-engine', {
        body: {
          action: 'generate_informe_feder',
          periodo,
          expedientesData: data.expedientes,
          convocatoriasData: data.convocatorias,
          kpisData: data.kpis
        }
      });

      if (fnError) throw fnError;

      if (result?.success && result?.data) {
        toast.success('Informe FEDER generado');
        return result.data as InformeFEDER;
      }

      throw new Error(result?.error || 'Error generando informe');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al generar informe FEDER', { description: message });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateCuadroMando = useCallback(async (
    periodo: ReportPeriodo,
    data: { expedientes: unknown[]; convocatorias: unknown[]; kpis: unknown }
  ): Promise<CuadroMando | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('galia-reporting-engine', {
        body: {
          action: 'generate_cuadro_mando',
          periodo,
          expedientesData: data.expedientes,
          convocatoriasData: data.convocatorias,
          kpisData: data.kpis
        }
      });

      if (fnError) throw fnError;

      if (result?.success && result?.data) {
        toast.success('Cuadro de mando generado');
        return result.data as CuadroMando;
      }

      throw new Error(result?.error || 'Error generando cuadro');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al generar cuadro de mando', { description: message });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateInformeSeguimiento = useCallback(async (
    periodo: ReportPeriodo,
    data: { expedientes: unknown[]; kpis: unknown }
  ): Promise<InformeSeguimiento | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('galia-reporting-engine', {
        body: {
          action: 'generate_informe_seguimiento',
          periodo,
          expedientesData: data.expedientes,
          kpisData: data.kpis
        }
      });

      if (fnError) throw fnError;

      if (result?.success && result?.data) {
        toast.success('Informe de seguimiento generado');
        return result.data as InformeSeguimiento;
      }

      throw new Error(result?.error || 'Error generando informe');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al generar informe de seguimiento', { description: message });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    isGenerating,
    error,
    generateMemoriaAnual,
    generateInformeFEDER,
    generateCuadroMando,
    generateInformeSeguimiento,
  };
}

export default useGaliaReporting;
