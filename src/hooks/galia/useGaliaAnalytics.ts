import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GaliaKPIs {
  convocatoriasActivas: number;
  solicitudesPendientes: number;
  expedientesEnCurso: number;
  presupuestoTotal: number;
  presupuestoComprometido: number;
  presupuestoEjecutado: number;
  tasaResolucion: number;
  tiempoMedioTramitacion: number;
  alertasPendientes: number;
  interaccionesIA: number;
}

export interface GaliaAnalyticsData {
  expedientesPorEstado: Record<string, number>;
  solicitudesPorMes: Array<{ mes: string; cantidad: number }>;
  importesPorTipo: Array<{ tipo: string; importe: number }>;
  riesgosDetectados: number;
  tasaAutomatizacion: number;
}

interface AnalyticsOptions {
  galId?: string;
  periodo?: 'week' | 'month' | 'quarter' | 'year';
}

export function useGaliaAnalytics(options?: AnalyticsOptions) {
  const [kpis, setKpis] = useState<GaliaKPIs | null>(null);
  const [analyticsData, setAnalyticsData] = useState<GaliaAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch convocatorias activas
      const { count: convocatoriasActivas } = await supabase
        .from('galia_convocatorias')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['publicada', 'abierta']);

      // Fetch solicitudes pendientes
      const { count: solicitudesPendientes } = await supabase
        .from('galia_solicitudes')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['presentada', 'en_revision', 'subsanacion']);

      // Fetch expedientes en curso
      const { count: expedientesEnCurso } = await supabase
        .from('galia_expedientes')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['instruccion', 'evaluacion', 'propuesta', 'justificacion']);

      // Fetch presupuestos
      const { data: presupuestos } = await supabase
        .from('galia_convocatorias')
        .select('presupuesto_total, presupuesto_comprometido, presupuesto_ejecutado');

      const totales = (presupuestos || []).reduce((acc, p) => ({
        total: acc.total + (p.presupuesto_total || 0),
        comprometido: acc.comprometido + (p.presupuesto_comprometido || 0),
        ejecutado: acc.ejecutado + (p.presupuesto_ejecutado || 0),
      }), { total: 0, comprometido: 0, ejecutado: 0 });

      // Fetch alertas pendientes
      const { count: alertasPendientes } = await supabase
        .from('galia_alertas')
        .select('*', { count: 'exact', head: true })
        .eq('resuelta', false);

      // Fetch interacciones IA (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: interaccionesIA } = await supabase
        .from('galia_interacciones_ia')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Calculate tasa de resolución
      const { count: expedientesResueltos } = await supabase
        .from('galia_expedientes')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['concedido', 'denegado', 'cerrado']);

      const { count: totalExpedientes } = await supabase
        .from('galia_expedientes')
        .select('*', { count: 'exact', head: true });

      const tasaResolucion = totalExpedientes ? 
        ((expedientesResueltos || 0) / totalExpedientes) * 100 : 0;

      setKpis({
        convocatoriasActivas: convocatoriasActivas || 0,
        solicitudesPendientes: solicitudesPendientes || 0,
        expedientesEnCurso: expedientesEnCurso || 0,
        presupuestoTotal: totales.total,
        presupuestoComprometido: totales.comprometido,
        presupuestoEjecutado: totales.ejecutado,
        tasaResolucion: Math.round(tasaResolucion),
        tiempoMedioTramitacion: 45, // TODO: Calcular desde datos reales
        alertasPendientes: alertasPendientes || 0,
        interaccionesIA: interaccionesIA || 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar KPIs';
      setError(message);
      console.error('[useGaliaAnalytics] fetchKPIs error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options?.galId]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      // Expedientes por estado
      const { data: expedientes } = await supabase
        .from('galia_expedientes')
        .select('estado');

      const expedientesPorEstado: Record<string, number> = {};
      (expedientes || []).forEach(e => {
        expedientesPorEstado[e.estado] = (expedientesPorEstado[e.estado] || 0) + 1;
      });

      // Expedientes con riesgo alto
      const { count: riesgosDetectados } = await supabase
        .from('galia_expedientes')
        .select('*', { count: 'exact', head: true })
        .gte('scoring_riesgo', 70);

      // Tasa de automatización (interacciones IA resueltas sin técnico)
      const { count: totalInteracciones } = await supabase
        .from('galia_interacciones_ia')
        .select('*', { count: 'exact', head: true });

      const { count: interaccionesResueltas } = await supabase
        .from('galia_interacciones_ia')
        .select('*', { count: 'exact', head: true })
        .eq('derivado_tecnico', false)
        .eq('es_resolucion', true);

      const tasaAutomatizacion = totalInteracciones ? 
        ((interaccionesResueltas || 0) / totalInteracciones) * 100 : 0;

      setAnalyticsData({
        expedientesPorEstado,
        solicitudesPorMes: [], // TODO: Implementar agrupación por mes
        importesPorTipo: [], // TODO: Implementar agrupación por tipo
        riesgosDetectados: riesgosDetectados || 0,
        tasaAutomatizacion: Math.round(tasaAutomatizacion),
      });
    } catch (err) {
      console.error('[useGaliaAnalytics] fetchAnalyticsData error:', err);
    }
  }, [options?.galId]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchKPIs(), fetchAnalyticsData()]);
  }, [fetchKPIs, fetchAnalyticsData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    kpis,
    analyticsData,
    isLoading,
    error,
    refresh,
  };
}

export default useGaliaAnalytics;
