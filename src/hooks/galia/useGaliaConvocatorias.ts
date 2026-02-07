import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GaliaConvocatoria {
  id: string;
  gal_id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  presupuesto_total: number;
  presupuesto_comprometido: number;
  presupuesto_ejecutado: number;
  fecha_publicacion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_resolucion: string | null;
  estado: 'borrador' | 'publicada' | 'abierta' | 'cerrada' | 'resuelta' | 'archivada';
  requisitos: Record<string, unknown>[];
  criterios_valoracion: Record<string, unknown>[];
  documentacion_requerida: Record<string, unknown>[];
  importe_minimo: number | null;
  importe_maximo: number | null;
  porcentaje_ayuda_max: number;
  bases_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GaliaConvocatoriaFilters {
  galId?: string;
  estado?: GaliaConvocatoria['estado'];
  searchTerm?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export function useGaliaConvocatorias(filters?: GaliaConvocatoriaFilters) {
  const [convocatorias, setConvocatorias] = useState<GaliaConvocatoria[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchConvocatorias = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('galia_convocatorias')
        .select('*', { count: 'exact' })
        .order('fecha_inicio', { ascending: false });

      if (filters?.galId) {
        query = query.eq('gal_id', filters.galId);
      }

      if (filters?.estado) {
        query = query.eq('estado', filters.estado);
      }

      if (filters?.searchTerm) {
        query = query.or(`nombre.ilike.%${filters.searchTerm}%,codigo.ilike.%${filters.searchTerm}%`);
      }

      if (filters?.fechaDesde) {
        query = query.gte('fecha_inicio', filters.fechaDesde);
      }

      if (filters?.fechaHasta) {
        query = query.lte('fecha_fin', filters.fechaHasta);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setConvocatorias(data as GaliaConvocatoria[]);
      setTotalCount(count || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar convocatorias';
      setError(message);
      console.error('[useGaliaConvocatorias] fetchConvocatorias error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters?.galId, filters?.estado, filters?.searchTerm, filters?.fechaDesde, filters?.fechaHasta]);

  const createConvocatoria = useCallback(async (data: Partial<GaliaConvocatoria>) => {
    try {
      const { data: newConvocatoria, error: createError } = await supabase
        .from('galia_convocatorias')
        .insert([data as any])
        .select()
        .single();

      if (createError) throw createError;

      toast.success('Convocatoria creada correctamente');
      await fetchConvocatorias();
      return newConvocatoria as GaliaConvocatoria;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear convocatoria';
      toast.error(message);
      return null;
    }
  }, [fetchConvocatorias]);

  const updateConvocatoria = useCallback(async (id: string, updates: Partial<GaliaConvocatoria>) => {
    try {
      const { error: updateError } = await supabase
        .from('galia_convocatorias')
        .update(updates as any)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Convocatoria actualizada');
      await fetchConvocatorias();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar convocatoria';
      toast.error(message);
      return false;
    }
  }, [fetchConvocatorias]);

  const getConvocatoriaById = useCallback(async (id: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('galia_convocatorias')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return data as GaliaConvocatoria;
    } catch (err) {
      console.error('[useGaliaConvocatorias] getConvocatoriaById error:', err);
      return null;
    }
  }, []);

  const getPresupuestoStats = useCallback(() => {
    const total = convocatorias.reduce((sum, c) => sum + (c.presupuesto_total || 0), 0);
    const comprometido = convocatorias.reduce((sum, c) => sum + (c.presupuesto_comprometido || 0), 0);
    const ejecutado = convocatorias.reduce((sum, c) => sum + (c.presupuesto_ejecutado || 0), 0);
    const disponible = total - comprometido;

    return { total, comprometido, ejecutado, disponible };
  }, [convocatorias]);

  useEffect(() => {
    fetchConvocatorias();
  }, [fetchConvocatorias]);

  return {
    convocatorias,
    isLoading,
    error,
    totalCount,
    fetchConvocatorias,
    createConvocatoria,
    updateConvocatoria,
    getConvocatoriaById,
    getPresupuestoStats,
  };
}

export default useGaliaConvocatorias;
