/**
 * useGaliaFederation - Hook para Portal Nacional Federado
 * Agregación y análisis multi-GAL a nivel regional/nacional
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FederationKPIs {
  gals_incluidos: number;
  kpis_nacionales: {
    total_expedientes: number;
    total_presupuesto_solicitado: number;
    total_importe_concedido: number;
    tasa_ejecucion: number;
    expedientes_por_estado: Record<string, number>;
    convocatorias_activas: number;
  };
  metricas_por_gal: Array<{
    gal_id: string;
    gal_nombre: string;
    region: string;
    total_expedientes: number;
    presupuesto_gestionado: number;
    importe_concedido: number;
    tasa_concesion: number;
  }>;
  ranking: Array<{
    gal_id: string;
    gal_nombre: string;
    importe_concedido: number;
  }>;
}

export interface RegionalData {
  region: string;
  num_gals: number;
  total_expedientes: number;
  importe_total: number;
  tasa_ejecucion: number;
}

export interface NationalDashboard {
  nivel: string;
  fecha_actualizacion: string;
  resumen: {
    total_gals: number;
    total_regiones: number;
    total_expedientes: number;
    presupuesto_total_ejecutado: number;
  };
  datos_por_region: RegionalData[];
  mapa_calor: Array<{
    region: string;
    intensidad: number;
    valor: number;
  }>;
}

export interface ComparisonResult {
  gals_comparados: string[];
  datos_base: Array<{
    gal_id: string;
    total_solicitudes: number;
    tasa_concesion: string;
  }>;
  analisis_ia: {
    comparativa?: Array<{
      gal_id: string;
      fortalezas: string[];
      areas_mejora: string[];
      score_eficiencia: number;
    }>;
    mejor_practica?: { gal_id: string; motivo: string };
    recomendaciones_cruzadas?: string[];
    tendencia_general?: string;
  };
}

export function useGaliaFederation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<FederationKPIs | null>(null);
  const [nationalDashboard, setNationalDashboard] = useState<NationalDashboard | null>(null);

  // === AGREGAR KPIs ===
  const aggregateKPIs = useCallback(async (
    region?: string,
    galIds?: string[],
    period?: { start: string; end: string }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-federation',
        {
          body: {
            action: 'aggregate_kpis',
            region,
            gal_ids: galIds,
            period
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        setKpis(data.data);
        return data.data as FederationKPIs;
      }

      throw new Error('Error agregando KPIs');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al agregar KPIs', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === COMPARAR GALs ===
  const compareGALs = useCallback(async (galIds: string[]) => {
    if (galIds.length < 2) {
      toast.error('Se necesitan al menos 2 GALs para comparar');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-federation',
        {
          body: {
            action: 'compare_gals',
            gal_ids: galIds
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data.data as ComparisonResult;
      }

      throw new Error('Error comparando GALs');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en comparación', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === DASHBOARD NACIONAL ===
  const getNationalDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-federation',
        {
          body: {
            action: 'national_dashboard'
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        setNationalDashboard(data.data);
        return data.data as NationalDashboard;
      }

      throw new Error('Error obteniendo dashboard nacional');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en dashboard nacional', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === INFORME REGIONAL ===
  const getRegionalReport = useCallback(async (
    region: string,
    period?: { start: string; end: string }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-federation',
        {
          body: {
            action: 'regional_report',
            region,
            period
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data.data;
      }

      throw new Error('Error generando informe regional');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en informe regional', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANÁLISIS DE BENCHMARKING ===
  const runBenchmarkAnalysis = useCallback(async (
    galIds?: string[],
    metrics?: string[]
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-federation',
        {
          body: {
            action: 'benchmark_analysis',
            gal_ids: galIds,
            metrics
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Análisis de benchmark completado');
        return data.data;
      }

      throw new Error('Error en análisis de benchmark');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en benchmark', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === PREDICCIÓN DE TENDENCIAS ===
  const predictTrends = useCallback(async (
    region?: string,
    period?: { start: string; end: string }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-federation',
        {
          body: {
            action: 'trend_prediction',
            region,
            period
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data.data;
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

  // === REGIONES DISPONIBLES ===
  const getAvailableRegions = useCallback(() => {
    return [
      'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias',
      'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
      'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia',
      'Navarra', 'País Vasco', 'Valencia'
    ];
  }, []);

  return {
    isLoading,
    error,
    kpis,
    nationalDashboard,
    // Acciones
    aggregateKPIs,
    compareGALs,
    getNationalDashboard,
    getRegionalReport,
    runBenchmarkAnalysis,
    predictTrends,
    getAvailableRegions
  };
}

export default useGaliaFederation;
