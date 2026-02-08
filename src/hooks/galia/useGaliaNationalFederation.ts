/**
 * useGaliaNationalFederation - Hook para Portal Nacional Federado
 * Fase 10 del Plan Estratégico GALIA 2.0
 * 
 * Agregación y análisis multi-GAL a nivel nacional/regional
 * Interoperabilidad UE y eIDAS 2.0
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NationalKPIs {
  resumen_nacional: {
    total_gals_activos: number;
    total_expedientes_2024: number;
    presupuesto_total_gestionado: number;
    importe_total_concedido: number;
    tasa_ejecucion_media: number;
    empleos_creados: number;
    empleos_mantenidos: number;
    proyectos_mujeres_emprendedoras: number;
    proyectos_jovenes: number;
  };
  por_region: Array<{
    region: string;
    num_gals: number;
    expedientes: number;
    presupuesto_gestionado: number;
    importe_concedido: number;
    tasa_ejecucion: number;
    ranking_eficiencia: number;
  }>;
  top_gals: Array<{
    gal_id: string;
    nombre: string;
    region: string;
    score: number;
  }>;
  tendencias: {
    variacion_interanual: {
      expedientes: number;
      presupuesto: number;
      empleo: number;
    };
    sectores_crecimiento: string[];
    alertas_nacionales: string[];
  };
  fecha_actualizacion: string;
}

export interface BenchmarkResult {
  gals_comparados: string[];
  metricas_comparadas: Array<{
    metrica: string;
    valores: Array<{ gal_id: string; valor: number }>;
    mejor: string;
    peor: string;
  }>;
  ranking_global: Array<{
    gal_id: string;
    puntuacion_total: number;
    posicion: number;
  }>;
  mejores_practicas: Array<{
    gal_id: string;
    practica: string;
    impacto: string;
  }>;
  oportunidades_transferencia: Array<{
    de_gal: string;
    a_gal: string;
    practica: string;
  }>;
  recomendaciones: string[];
}

export interface RegionalAnalysis {
  region: string;
  resumen: string;
  gals_activos: number;
  estadisticas: {
    total_expedientes: number;
    expedientes_aprobados: number;
    expedientes_denegados: number;
    expedientes_en_tramitacion: number;
    presupuesto_asignado: number;
    presupuesto_ejecutado: number;
    tasa_ejecucion: number;
  };
  sectores_principales: Array<{ sector: string; porcentaje: number }>;
  fortalezas: string[];
  debilidades: string[];
  oportunidades: string[];
  amenazas: string[];
  proyectos_destacados: Array<{
    titulo: string;
    impacto: string;
    inversion: number;
  }>;
  recomendaciones: string[];
}

export interface TrendPrediction {
  horizonte_temporal: string;
  predicciones: Array<{
    metrica: string;
    valor_actual: number;
    valor_predicho: number;
    confianza: number;
    factores_influencia: string[];
  }>;
  escenarios: {
    optimista: Record<string, unknown>;
    base: Record<string, unknown>;
    pesimista: Record<string, unknown>;
  };
  alertas_anticipadas: string[];
  recomendaciones_proactivas: Array<{
    accion: string;
    urgencia: string;
    impacto_esperado: string;
  }>;
  oportunidades_emergentes: string[];
}

export interface EUInteropStatus {
  eidas_2_0: {
    status: string;
    progreso: number;
    componentes: Array<{ nombre: string; estado: string }>;
  };
  enrd_network: {
    status: string;
    ultima_sincronizacion: string;
    datos_compartidos: string[];
  };
  open_data_eu: {
    status: string;
    datasets_publicados: number;
    formatos: string[];
    licencia: string;
  };
  gdpr_compliance: {
    status: string;
    dpd_registrado: boolean;
    evaluacion_impacto: string;
  };
  recomendaciones: string[];
}

const REGIONES_ESPANA = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias',
  'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
  'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia',
  'Navarra', 'País Vasco', 'Valencia', 'Ceuta', 'Melilla'
];

export function useGaliaNationalFederation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nationalKPIs, setNationalKPIs] = useState<NationalKPIs | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // === OBTENER KPIs NACIONALES ===
  const getNationalKPIs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-national-federation',
        {
          body: { action: 'get_national_kpis' }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        setNationalKPIs(data.data);
        return data.data as NationalKPIs;
      }

      throw new Error('Error obteniendo KPIs nacionales');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al obtener KPIs nacionales', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANÁLISIS NACIONAL AGREGADO ===
  const getAggregatedAnalysis = useCallback(async (
    period?: { start: string; end: string }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-national-federation',
        {
          body: {
            action: 'aggregate_national',
            period
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data.data;
      }

      throw new Error('Error en análisis nacional');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en análisis nacional', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === BENCHMARK ENTRE GALs ===
  const benchmarkGALs = useCallback(async (
    galIds: string[],
    metrics?: string[]
  ): Promise<BenchmarkResult | null> => {
    if (galIds.length < 2) {
      toast.error('Se necesitan al menos 2 GALs para comparar');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-national-federation',
        {
          body: {
            action: 'benchmark_gals',
            galIds,
            metrics
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Benchmark completado');
        return data.data as BenchmarkResult;
      }

      throw new Error('Error en benchmark');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en benchmark', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANÁLISIS REGIONAL ===
  const getRegionalAnalysis = useCallback(async (
    region: string,
    period?: { start: string; end: string }
  ): Promise<RegionalAnalysis | null> => {
    setIsLoading(true);
    setError(null);
    setSelectedRegion(region);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-national-federation',
        {
          body: {
            action: 'regional_analysis',
            region,
            period
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data.data as RegionalAnalysis;
      }

      throw new Error('Error en análisis regional');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en análisis regional', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === PREDICCIÓN DE TENDENCIAS ===
  const predictTrends = useCallback(async (
    region?: string
  ): Promise<TrendPrediction | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-national-federation',
        {
          body: {
            action: 'predict_trends',
            region
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data.data as TrendPrediction;
      }

      throw new Error('Error en predicción de tendencias');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en predicción', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VERIFICAR INTEROPERABILIDAD UE ===
  const checkEUInteroperability = useCallback(async (): Promise<EUInteropStatus | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-national-federation',
        {
          body: { action: 'eu_interop_check' }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data.data as EUInteropStatus;
      }

      throw new Error('Error verificando interoperabilidad');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en verificación UE', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER LISTA DE REGIONES ===
  const getAvailableRegions = useCallback(() => REGIONES_ESPANA, []);

  return {
    // Estado
    isLoading,
    error,
    nationalKPIs,
    selectedRegion,
    // Acciones
    getNationalKPIs,
    getAggregatedAnalysis,
    benchmarkGALs,
    getRegionalAnalysis,
    predictTrends,
    checkEUInteroperability,
    getAvailableRegions
  };
}

export default useGaliaNationalFederation;
