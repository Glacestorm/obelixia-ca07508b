import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GaliaExpediente, GaliaExpedienteFilters } from './useGaliaExpedientes';

// Extendemos la interfaz original con los nuevos campos de la migración
export interface GaliaExpedienteExtended extends GaliaExpediente {
  sub_estado?: string;
  fase_actual?: string;
  resultado_control?: {
    ultimo: string;
    observaciones?: string;
  };
  fecha_notificacion?: string;
  fecha_aceptacion?: string;
  tipo_pago?: string;
  verificacion_in_situ?: boolean;
  control_contratacion?: boolean;
  historial_transiciones?: Array<{
    de: string;
    a: string;
    resultado: string;
    timestamp: string;
    observaciones?: string;
  }>;
}

// Re-exportamos el hook original pero con el tipo extendido
// En un refactor real, deberíamos fusionar ambos archivos, 
// pero para mantener la compatibilidad con el código existente, extendemos aquí.

export function useGaliaExpedientesExtended(filters?: GaliaExpedienteFilters) {
  const [expedientes, setExpedientes] = useState<GaliaExpedienteExtended[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpediente, setSelectedExpediente] = useState<GaliaExpedienteExtended | null>(null);

  const fetchExpedientes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('galia_expedientes')
        .select(`
          *,
          solicitud:galia_solicitudes(
            titulo_proyecto,
            beneficiario_id,
            presupuesto_total,
            importe_solicitado,
            convocatoria:galia_convocatorias(nombre, codigo),
            beneficiario:galia_beneficiarios(nombre, nif, tipo)
          )
        `)
        .order('fecha_apertura', { ascending: false });

      if (filters?.estado) {
        query = query.eq('estado', filters.estado);
      }

      if (filters?.tecnicoId) {
        query = query.or(`tecnico_instructor_id.eq.${filters.tecnicoId},tecnico_evaluador_id.eq.${filters.tecnicoId}`);
      }

      if (filters?.searchTerm) {
        query = query.ilike('numero_expediente', `%${filters.searchTerm}%`);
      }

      if (filters?.riesgoMinimo) {
        query = query.gte('scoring_riesgo', filters.riesgoMinimo);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Cast seguro porque la DB ya tiene los campos
      setExpedientes(data as unknown as GaliaExpedienteExtended[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar expedientes';
      setError(message);
      console.error('[useGaliaExpedientes] fetchExpedientes error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters?.estado, filters?.tecnicoId, filters?.searchTerm, filters?.riesgoMinimo]);

  const updateExpedienteEstado = useCallback(async (
    id: string, 
    nuevoEstado: string, // String genérico para aceptar los nuevos estados
    notas?: string
  ) => {
    try {
      const updates: Record<string, unknown> = { estado: nuevoEstado };

      if (['resolucion', 'concedido', 'denegado', 'resolucion_revocacion'].includes(nuevoEstado)) {
        updates.fecha_resolucion = new Date().toISOString();
      }

      if (['cerrado', 'terminacion_expediente'].includes(nuevoEstado)) {
        updates.fecha_cierre = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('galia_expedientes')
        .update(updates as any)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success(`Estado actualizado a: ${nuevoEstado}`);
      await fetchExpedientes();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar estado';
      toast.error(message);
      return false;
    }
  }, [fetchExpedientes]);

  const getExpedienteById = useCallback(async (id: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('galia_expedientes')
        .select(`
          *,
          solicitud:galia_solicitudes(
            *,
            convocatoria:galia_convocatorias(*),
            beneficiario:galia_beneficiarios(*)
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      const exp = data as unknown as GaliaExpedienteExtended;
      setSelectedExpediente(exp);
      return exp;
    } catch (err) {
      console.error('[useGaliaExpedientes] getExpedienteById error:', err);
      return null;
    }
  }, []);

  const getEstadisticasPorEstado = useCallback(() => {
    const stats: Record<string, number> = {};
    expedientes.forEach(exp => {
      stats[exp.estado] = (stats[exp.estado] || 0) + 1;
    });
    return stats;
  }, [expedientes]);

  const getExpedientesConRiesgo = useCallback((umbral: number = 50) => {
    return expedientes.filter(exp => (exp.scoring_riesgo || 0) >= umbral);
  }, [expedientes]);

  useEffect(() => {
    fetchExpedientes();
  }, [fetchExpedientes]);

  return {
    expedientes,
    isLoading,
    error,
    selectedExpediente,
    setSelectedExpediente,
    fetchExpedientes,
    updateExpedienteEstado,
    getExpedienteById,
    getEstadisticasPorEstado,
    getExpedientesConRiesgo,
  };
}

export default useGaliaExpedientesExtended;
