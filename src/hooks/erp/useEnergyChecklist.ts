import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ChecklistItem {
  id: string;
  case_id: string;
  item_key: string;
  label: string;
  checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_CHECKLIST_ITEMS = [
  { item_key: 'factura_recibida', label: 'Factura recibida', sort_order: 0 },
  { item_key: 'contrato_recibido', label: 'Contrato recibido', sort_order: 1 },
  { item_key: 'cups_validado', label: 'CUPS validado', sort_order: 2 },
  { item_key: 'titular_validado', label: 'Titular validado', sort_order: 3 },
  { item_key: 'documentacion_firmada', label: 'Documentación firmada', sort_order: 4 },
  { item_key: 'propuesta_enviada', label: 'Propuesta enviada', sort_order: 5 },
  { item_key: 'aceptacion_recibida', label: 'Aceptación recibida', sort_order: 6 },
  { item_key: 'cambio_solicitado', label: 'Cambio solicitado', sort_order: 7 },
  { item_key: 'primera_factura_revisada', label: 'Primera factura revisada', sort_order: 8 },
];

export function useEnergyChecklist(caseId: string | null) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchChecklist = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_checklists')
        .select('*')
        .eq('case_id', caseId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setItems((data || []) as ChecklistItem[]);
    } catch (err) {
      console.error('[useEnergyChecklist] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const initializeChecklist = useCallback(async () => {
    if (!caseId || items.length > 0) return;
    try {
      const rows = DEFAULT_CHECKLIST_ITEMS.map(item => ({
        case_id: caseId,
        ...item,
        checked: false,
      }));
      const { data, error } = await supabase
        .from('energy_checklists')
        .insert(rows as any)
        .select();
      if (error) throw error;
      setItems((data || []) as ChecklistItem[]);
    } catch (err) {
      console.error('[useEnergyChecklist] init error:', err);
    }
  }, [caseId, items.length]);

  const toggleItem = useCallback(async (itemId: string, checked: boolean) => {
    try {
      const updates: any = {
        checked,
        checked_at: checked ? new Date().toISOString() : null,
        checked_by: checked ? user?.id || null : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('energy_checklists')
        .update(updates)
        .eq('id', itemId);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));
    } catch (err) {
      toast.error('Error al actualizar checklist');
    }
  }, [user?.id]);

  const progress = items.length > 0
    ? Math.round((items.filter(i => i.checked).length / items.length) * 100)
    : 0;

  useEffect(() => { fetchChecklist(); }, [fetchChecklist]);

  return {
    items, loading, progress,
    fetchChecklist, initializeChecklist, toggleItem,
  };
}
