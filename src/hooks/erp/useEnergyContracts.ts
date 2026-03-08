import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergyContract {
  id: string;
  case_id: string;
  supplier: string | null;
  tariff_name: string | null;
  start_date: string | null;
  end_date: string | null;
  has_renewal: boolean;
  has_permanence: boolean;
  early_exit_penalty_text: string | null;
  signed_document_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useEnergyContracts(caseId: string | null) {
  const [contracts, setContracts] = useState<EnergyContract[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContracts = useCallback(async () => {
    if (!caseId) { setContracts([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_contracts').select('*').eq('case_id', caseId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      setContracts((data as EnergyContract[]) || []);
    } catch (err) {
      console.error('[useEnergyContracts] error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const createContract = useCallback(async (values: Partial<EnergyContract>) => {
    if (!caseId) return null;
    try {
      const { data, error } = await supabase
        .from('energy_contracts').insert([{ ...values, case_id: caseId }] as any).select().single();
      if (error) throw error;
      const c = data as EnergyContract;
      setContracts(prev => [c, ...prev]);
      toast.success('Contrato registrado');
      return c;
    } catch (err) {
      toast.error('Error al crear contrato');
      return null;
    }
  }, [caseId]);

  const updateContract = useCallback(async (id: string, values: Partial<EnergyContract>) => {
    try {
      const { data, error } = await supabase
        .from('energy_contracts').update(values).eq('id', id).select().single();
      if (error) throw error;
      const updated = data as EnergyContract;
      setContracts(prev => prev.map(c => c.id === id ? updated : c));
      toast.success('Contrato actualizado');
      return updated;
    } catch (err) {
      toast.error('Error al actualizar contrato');
      return null;
    }
  }, []);

  const deleteContract = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('energy_contracts').delete().eq('id', id);
      if (error) throw error;
      setContracts(prev => prev.filter(c => c.id !== id));
      toast.success('Contrato eliminado');
    } catch (err) {
      toast.error('Error al eliminar');
    }
  }, []);

  const uploadPdf = useCallback(async (file: File, contractId: string) => {
    const path = `contracts/${caseId}/${contractId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('energy-documents').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Error subiendo PDF'); return null; }
    const { data: urlData } = supabase.storage.from('energy-documents').getPublicUrl(path);
    await updateContract(contractId, { signed_document_url: urlData.publicUrl });
    return urlData.publicUrl;
  }, [caseId, updateContract]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  return { contracts, loading, fetchContracts, createContract, updateContract, deleteContract, uploadPdf };
}
