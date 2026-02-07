import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GaliaExpediente {
  id: string;
  solicitud_id: string;
  numero_expediente: string;
  estado: 'instruccion' | 'evaluacion' | 'propuesta' | 'resolucion' | 'concedido' | 'denegado' | 'renunciado' | 'justificacion' | 'cerrado';
  fecha_apertura: string;
  fecha_resolucion: string | null;
  fecha_cierre: string | null;
  importe_concedido: number | null;
  importe_justificado: number;
  importe_pagado: number;
  porcentaje_ayuda_final: number | null;
  tecnico_instructor_id: string | null;
  tecnico_evaluador_id: string | null;
  informe_tecnico: string | null;
  scoring_riesgo: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  solicitud?: {
    titulo_proyecto: string;
    beneficiario_id: string;
    presupuesto_total: number;
    importe_solicitado: number;
    convocatoria?: {
      nombre: string;
      codigo: string;
    };
    beneficiario?: {
      nombre: string;
      nif: string;
      tipo: string;
    };
  };
}

export interface GaliaExpedienteFilters {
  galId?: string;
  estado?: GaliaExpediente['estado'];
  tecnicoId?: string;
  searchTerm?: string;
  riesgoMinimo?: number;
}

export function useGaliaExpedientes(filters?: GaliaExpedienteFilters) {
  const [expedientes, setExpedientes] = useState<GaliaExpediente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpediente, setSelectedExpediente] = useState<GaliaExpediente | null>(null);

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

      setExpedientes(data as GaliaExpediente[]);
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
    nuevoEstado: GaliaExpediente['estado'],
    notas?: string
  ) => {
    try {
      const updates: Partial<GaliaExpediente> = { estado: nuevoEstado };

      if (nuevoEstado === 'resolucion' || nuevoEstado === 'concedido' || nuevoEstado === 'denegado') {
        updates.fecha_resolucion = new Date().toISOString();
      }

      if (nuevoEstado === 'cerrado') {
        updates.fecha_cierre = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('galia_expedientes')
        .update(updates)
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
      
      setSelectedExpediente(data as GaliaExpediente);
      return data as GaliaExpediente;
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

export default useGaliaExpedientes;
