/**
 * Audience Segments Hook - Phase 1
 * Manages dynamic and static audience segmentation
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'between' | 'is_empty' | 'is_not_empty';
  value: string | number | string[];
  logic?: 'AND' | 'OR';
}

export interface AudienceSegment {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  conditions: SegmentCondition[];
  filter_type: 'dynamic' | 'static';
  contact_count: number;
  last_calculated_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SegmentMember {
  id: string;
  segment_id: string;
  contact_id: string;
  added_at: string;
  added_by: string | null;
}

export interface SegmentField {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
}

// === AVAILABLE FIELDS ===
export const SEGMENT_FIELDS: SegmentField[] = [
  { field: 'email', label: 'Email', type: 'text' },
  { field: 'name', label: 'Nombre', type: 'text' },
  { field: 'company', label: 'Empresa', type: 'text' },
  { field: 'phone', label: 'Teléfono', type: 'text' },
  { field: 'city', label: 'Ciudad', type: 'text' },
  { field: 'country', label: 'País', type: 'text' },
  { field: 'source', label: 'Origen', type: 'select', options: [
    { value: 'website', label: 'Web' },
    { value: 'referral', label: 'Referido' },
    { value: 'social', label: 'Redes Sociales' },
    { value: 'ads', label: 'Publicidad' },
    { value: 'event', label: 'Evento' },
  ]},
  { field: 'status', label: 'Estado', type: 'select', options: [
    { value: 'lead', label: 'Lead' },
    { value: 'prospect', label: 'Prospecto' },
    { value: 'customer', label: 'Cliente' },
    { value: 'churned', label: 'Perdido' },
  ]},
  { field: 'tags', label: 'Etiquetas', type: 'text' },
  { field: 'created_at', label: 'Fecha Creación', type: 'date' },
  { field: 'last_activity', label: 'Última Actividad', type: 'date' },
  { field: 'total_spent', label: 'Gasto Total', type: 'number' },
  { field: 'deal_count', label: 'Nº Deals', type: 'number' },
  { field: 'email_opened', label: 'Ha Abierto Email', type: 'boolean' },
  { field: 'email_clicked', label: 'Ha Clickado Email', type: 'boolean' },
];

// === HOOK ===
export function useAudienceSegments(companyId?: string) {
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === FETCH SEGMENTS ===
  const fetchSegments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('crm_audience_segments')
        .select('*')
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped = (data || []).map(row => ({
        ...row,
        conditions: (row.conditions || []) as unknown as SegmentCondition[],
        filter_type: row.filter_type as 'dynamic' | 'static',
      })) as AudienceSegment[];

      setSegments(mapped);
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching segments';
      setError(message);
      console.error('[useAudienceSegments] fetchSegments error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // === CREATE SEGMENT ===
  const createSegment = useCallback(async (
    segment: Partial<AudienceSegment>
  ): Promise<AudienceSegment | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('crm_audience_segments')
        .insert([{
          name: segment.name,
          description: segment.description,
          company_id: segment.company_id || companyId,
          created_by: userData.user?.id,
          conditions: JSON.parse(JSON.stringify(segment.conditions || [])),
          filter_type: segment.filter_type || 'dynamic',
          is_active: true,
          contact_count: 0,
        }] as any)
        .select()
        .single();

      if (insertError) throw insertError;

      const newSegment = {
        ...data,
        conditions: (data.conditions || []) as unknown as SegmentCondition[],
        filter_type: data.filter_type as 'dynamic' | 'static',
      } as AudienceSegment;
      setSegments(prev => [newSegment, ...prev]);
      toast.success('Segmento creado correctamente');
      return newSegment;
    } catch (err) {
      console.error('[useAudienceSegments] createSegment error:', err);
      toast.error('Error al crear el segmento');
      return null;
    }
  }, [companyId]);

  // === UPDATE SEGMENT ===
  const updateSegment = useCallback(async (
    id: string,
    updates: Partial<AudienceSegment>
  ): Promise<boolean> => {
    try {
      const updateData = updates.conditions 
        ? { ...updates, conditions: JSON.parse(JSON.stringify(updates.conditions)) }
        : updates;
      
      const { error: updateError } = await supabase
        .from('crm_audience_segments')
        .update(updateData as any)
        .eq('id', id);

      if (updateError) throw updateError;

      setSegments(prev => prev.map(s => 
        s.id === id ? { ...s, ...updates } : s
      ));
      toast.success('Segmento actualizado');
      return true;
    } catch (err) {
      console.error('[useAudienceSegments] updateSegment error:', err);
      toast.error('Error al actualizar el segmento');
      return false;
    }
  }, []);

  // === DELETE SEGMENT ===
  const deleteSegment = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('crm_audience_segments')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSegments(prev => prev.filter(s => s.id !== id));
      toast.success('Segmento eliminado');
      return true;
    } catch (err) {
      console.error('[useAudienceSegments] deleteSegment error:', err);
      toast.error('Error al eliminar el segmento');
      return false;
    }
  }, []);

  // === CALCULATE SEGMENT (AI) ===
  const calculateSegment = useCallback(async (id: string): Promise<number> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'crm-audience-segmentation',
        {
          body: { action: 'calculate', segmentId: id }
        }
      );

      if (fnError) throw fnError;

      const count = data?.contact_count || 0;
      
      await updateSegment(id, { 
        contact_count: count,
        last_calculated_at: new Date().toISOString()
      });

      toast.success(`Segmento calculado: ${count} contactos`);
      return count;
    } catch (err) {
      console.error('[useAudienceSegments] calculateSegment error:', err);
      toast.error('Error al calcular el segmento');
      return 0;
    }
  }, [updateSegment]);

  // === ADD CONDITION ===
  const addCondition = useCallback(async (
    segmentId: string,
    condition: SegmentCondition
  ): Promise<boolean> => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return false;

    return updateSegment(segmentId, {
      conditions: [...segment.conditions, condition],
    });
  }, [segments, updateSegment]);

  // === REMOVE CONDITION ===
  const removeCondition = useCallback(async (
    segmentId: string,
    index: number
  ): Promise<boolean> => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return false;

    const updatedConditions = segment.conditions.filter((_, i) => i !== index);
    return updateSegment(segmentId, { conditions: updatedConditions });
  }, [segments, updateSegment]);

  // === ADD MEMBERS (STATIC) ===
  const addMembers = useCallback(async (
    segmentId: string,
    contactIds: string[]
  ): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const members = contactIds.map(contactId => ({
        segment_id: segmentId,
        contact_id: contactId,
        added_by: userData.user?.id,
      }));

      const { error: insertError } = await supabase
        .from('crm_segment_members')
        .upsert(members, { onConflict: 'segment_id,contact_id' });

      if (insertError) throw insertError;

      toast.success(`${contactIds.length} contactos añadidos al segmento`);
      return true;
    } catch (err) {
      console.error('[useAudienceSegments] addMembers error:', err);
      toast.error('Error al añadir contactos');
      return false;
    }
  }, []);

  // === REMOVE MEMBERS ===
  const removeMembers = useCallback(async (
    segmentId: string,
    contactIds: string[]
  ): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('crm_segment_members')
        .delete()
        .eq('segment_id', segmentId)
        .in('contact_id', contactIds);

      if (deleteError) throw deleteError;

      toast.success(`${contactIds.length} contactos eliminados del segmento`);
      return true;
    } catch (err) {
      console.error('[useAudienceSegments] removeMembers error:', err);
      toast.error('Error al eliminar contactos');
      return false;
    }
  }, []);

  // === GET PRESET SEGMENTS ===
  const getPresetSegments = useCallback((): Partial<AudienceSegment>[] => {
    return [
      {
        name: 'Leads Nuevos (7 días)',
        description: 'Contactos creados en los últimos 7 días',
        filter_type: 'dynamic',
        conditions: [
          { field: 'created_at', operator: 'greater', value: '7_days_ago' },
          { field: 'status', operator: 'equals', value: 'lead' },
        ],
      },
      {
        name: 'Clientes Activos',
        description: 'Clientes con actividad reciente',
        filter_type: 'dynamic',
        conditions: [
          { field: 'status', operator: 'equals', value: 'customer' },
          { field: 'last_activity', operator: 'greater', value: '30_days_ago' },
        ],
      },
      {
        name: 'Alto Valor',
        description: 'Clientes con gasto superior a 10.000€',
        filter_type: 'dynamic',
        conditions: [
          { field: 'total_spent', operator: 'greater', value: 10000 },
        ],
      },
      {
        name: 'En Riesgo',
        description: 'Clientes sin actividad en 60 días',
        filter_type: 'dynamic',
        conditions: [
          { field: 'status', operator: 'equals', value: 'customer' },
          { field: 'last_activity', operator: 'less', value: '60_days_ago' },
        ],
      },
      {
        name: 'Email Engaged',
        description: 'Han abierto emails recientemente',
        filter_type: 'dynamic',
        conditions: [
          { field: 'email_opened', operator: 'equals', value: 'true' },
        ],
      },
    ];
  }, []);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  return {
    segments,
    isLoading,
    error,
    segmentFields: SEGMENT_FIELDS,
    fetchSegments,
    createSegment,
    updateSegment,
    deleteSegment,
    calculateSegment,
    addCondition,
    removeCondition,
    addMembers,
    removeMembers,
    getPresetSegments,
  };
}

export default useAudienceSegments;
