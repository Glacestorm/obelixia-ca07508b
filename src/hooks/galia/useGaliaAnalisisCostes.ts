/**
 * Hook para gestión de análisis de costes GALIA
 * Integración con Moderador de Costes IA
 * 
 * Nota: Los análisis se almacenan en metadata de expedientes
 * hasta que se cree la tabla galia_analisis_costes
 */

import { useState, useCallback} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GaliaAnalisisCoste {
  id: string;
  expediente_id: string;
  concepto: string;
  categoria: 'maquinaria' | 'obra_civil' | 'equipamiento' | 'servicios' | 'otros';
  importe_declarado: number;
  importe_referencia: number | null;
  desviacion_porcentaje: number | null;
  clasificacion: 'ok' | 'alerta' | 'critico';
  requiere_ofertas: boolean;
  numero_ofertas_requeridas: number;
  justificacion_ia: string | null;
  recomendaciones: string[];
  fecha_analisis: string;
  estado_revision: 'pendiente' | 'aceptado' | 'rechazado' | 'modificado';
}

export interface AnalisisCostesResult {
  items: GaliaAnalisisCoste[];
  resumen: {
    total: number;
    ok: number;
    alertas: number;
    criticos: number;
    requierenOfertas: number;
    importeTotalDeclarado: number;
    desviacionGlobal: number;
  };
}

/**
 * Hook para análisis de costes - almacena en memoria/metadata
 * La persistencia se hace via metadata del expediente
 */
export function useGaliaAnalisisCostes(expedienteId?: string) {
  const [analisis, setAnalisis] = useState<GaliaAnalisisCoste[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analizarCostes = useCallback(async (
    presupuestoText: string
  ): Promise<GaliaAnalisisCoste[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-moderador-costes', {
        body: { presupuesto: presupuestoText }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.items) {
        const items: GaliaAnalisisCoste[] = data.items.map((item: any, idx: number) => ({
          id: `analisis-${Date.now()}-${idx}`,
          expediente_id: expedienteId || '',
          concepto: item.concepto,
          categoria: item.categoria || 'otros',
          importe_declarado: item.importe,
          importe_referencia: item.precio_referencia,
          desviacion_porcentaje: item.desviacion,
          clasificacion: item.clasificacion,
          requiere_ofertas: item.requiere_ofertas,
          numero_ofertas_requeridas: item.requiere_ofertas ? 3 : 0,
          justificacion_ia: item.justificacion,
          recomendaciones: item.recomendaciones || [],
          fecha_analisis: new Date().toISOString(),
          estado_revision: 'pendiente' as const,
        }));

        setAnalisis(items);
        return items;
      }

      throw new Error('Respuesta inválida del moderador de costes');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al analizar costes';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [expedienteId]);

  const guardarEnExpediente = useCallback(async (
    expId: string,
    items: GaliaAnalisisCoste[]
  ) => {
    try {
      // Convertir a JSON serializable
      const analisisJson = items.map(item => ({
        id: item.id,
        expediente_id: item.expediente_id,
        concepto: item.concepto,
        categoria: item.categoria,
        importe_declarado: item.importe_declarado,
        importe_referencia: item.importe_referencia,
        desviacion_porcentaje: item.desviacion_porcentaje,
        clasificacion: item.clasificacion,
        requiere_ofertas: item.requiere_ofertas,
        numero_ofertas_requeridas: item.numero_ofertas_requeridas,
        justificacion_ia: item.justificacion_ia,
        recomendaciones: item.recomendaciones,
        fecha_analisis: item.fecha_analisis,
        estado_revision: item.estado_revision,
      }));

      // Guardar análisis en metadata del expediente
      const { error: updateError } = await supabase
        .from('galia_expedientes')
        .update({
          metadata: {
            analisis_costes: analisisJson,
            fecha_analisis_costes: new Date().toISOString(),
          }
        } as any)
        .eq('id', expId);

      if (updateError) throw updateError;

      toast.success('Análisis guardado en expediente');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar análisis';
      toast.error(message);
      return false;
    }
  }, []);

  const getResumen = useCallback(() => {
    const total = analisis.length;
    const ok = analisis.filter(a => a.clasificacion === 'ok').length;
    const alertas = analisis.filter(a => a.clasificacion === 'alerta').length;
    const criticos = analisis.filter(a => a.clasificacion === 'critico').length;
    const requierenOfertas = analisis.filter(a => a.requiere_ofertas).length;
    
    const importeTotalDeclarado = analisis.reduce((sum, a) => sum + a.importe_declarado, 0);
    const importeTotalReferencia = analisis.reduce((sum, a) => sum + (a.importe_referencia || 0), 0);
    const desviacionGlobal = importeTotalReferencia > 0
      ? ((importeTotalDeclarado - importeTotalReferencia) / importeTotalReferencia) * 100
      : 0;

    return {
      total,
      ok,
      alertas,
      criticos,
      requierenOfertas,
      importeTotalDeclarado,
      importeTotalReferencia,
      desviacionGlobal: Math.round(desviacionGlobal * 100) / 100,
    };
  }, [analisis]);

  const actualizarEstadoRevision = useCallback((
    itemId: string,
    nuevoEstado: 'aceptado' | 'rechazado' | 'modificado'
  ) => {
    setAnalisis(prev => prev.map(item => 
      item.id === itemId ? { ...item, estado_revision: nuevoEstado } : item
    ));
  }, []);

  const limpiarAnalisis = useCallback(() => {
    setAnalisis([]);
    setError(null);
  }, []);

  return {
    analisis,
    isLoading,
    error,
    analizarCostes,
    guardarEnExpediente,
    getResumen,
    actualizarEstadoRevision,
    limpiarAnalisis,
  };
}

export default useGaliaAnalisisCostes;
