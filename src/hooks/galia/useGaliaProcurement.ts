/**
 * GALIA - Hook de Contratación Pública (LCSP)
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProcurementContract {
  id: string;
  title: string;
  contract_type: 'menor' | 'abierto' | 'negociado' | 'restringido';
  budget_base: number;
  contractor: string | null;
  status: 'preparacion' | 'licitacion' | 'valoracion' | 'adjudicacion' | 'ejecucion' | 'finalizado';
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  deliverables: Array<{ name: string; status: string; due_date?: string }>;
  documents_checklist: Record<string, boolean>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CHECKLIST: Record<string, boolean> = {
  'Pliego técnico': false,
  'Pliego administrativo': false,
  'Informe valoración': false,
  'Resolución adjudicación': false,
  'Contrato formalizado': false,
  'Acta recepción': false,
};

const STATUS_ORDER = ['preparacion', 'licitacion', 'valoracion', 'adjudicacion', 'ejecucion', 'finalizado'];

export function useGaliaProcurement() {
  const [contracts, setContracts] = useState<ProcurementContract[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('galia_procurement')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts((data || []) as unknown as ProcurementContract[]);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Error al cargar contratos');
    } finally {
      setLoading(false);
    }
  }, []);

  const createContract = useCallback(async (contract: Partial<ProcurementContract>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('galia_procurement')
        .insert([{
          title: contract.title || 'Nuevo contrato',
          contract_type: contract.contract_type || 'menor',
          budget_base: contract.budget_base || 0,
          contractor: contract.contractor,
          status: 'preparacion',
          start_date: contract.start_date,
          end_date: contract.end_date,
          description: contract.description,
          deliverables: contract.deliverables || [],
          documents_checklist: DEFAULT_CHECKLIST,
          notes: contract.notes,
          created_by: user?.id,
        }] as any)
        .select()
        .single();

      if (error) throw error;
      const newContract = data as unknown as ProcurementContract;
      setContracts(prev => [newContract, ...prev]);
      toast.success('Contrato creado');
      return newContract;
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('Error al crear contrato');
      return null;
    }
  }, []);

  const updateContract = useCallback(async (id: string, updates: Partial<ProcurementContract>) => {
    try {
      const { error } = await supabase
        .from('galia_procurement')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
      setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      toast.success('Contrato actualizado');
      return true;
    } catch (error) {
      console.error('Error updating contract:', error);
      toast.error('Error al actualizar');
      return false;
    }
  }, []);

  const deleteContract = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('galia_procurement')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setContracts(prev => prev.filter(c => c.id !== id));
      toast.success('Contrato eliminado');
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('Error al eliminar');
    }
  }, []);

  const getAlerts = useCallback(() => {
    const now = new Date();
    return contracts.filter(c => {
      if (c.end_date) {
        const end = new Date(c.end_date);
        const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 30 && diff > 0 && c.status !== 'finalizado';
      }
      return false;
    });
  }, [contracts]);

  const getByStatus = useCallback((status: string) => {
    return contracts.filter(c => c.status === status);
  }, [contracts]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  return {
    contracts,
    loading,
    fetchContracts,
    createContract,
    updateContract,
    deleteContract,
    getAlerts,
    getByStatus,
    STATUS_ORDER,
    DEFAULT_CHECKLIST,
  };
}

export default useGaliaProcurement;
