import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergyInvoice {
  id: string;
  case_id: string;
  billing_start: string | null;
  billing_end: string | null;
  days: number | null;
  consumption_total_kwh: number | null;
  consumption_p1_kwh: number | null;
  consumption_p2_kwh: number | null;
  consumption_p3_kwh: number | null;
  power_cost: number | null;
  energy_cost: number | null;
  meter_rental: number | null;
  electricity_tax: number | null;
  vat: number | null;
  other_costs: number | null;
  total_amount: number | null;
  document_url: string | null;
  is_validated: boolean;
  created_at: string;
  updated_at: string;
}

export function useEnergyInvoices(caseId: string | null) {
  const [invoices, setInvoices] = useState<EnergyInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!caseId) { setInvoices([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_invoices').select('*').eq('case_id', caseId)
        .order('billing_start', { ascending: false });
      if (error) throw error;
      setInvoices((data as EnergyInvoice[]) || []);
    } catch (err) {
      console.error('[useEnergyInvoices] error:', err);
      toast.error('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const createInvoice = useCallback(async (values: Partial<EnergyInvoice>) => {
    if (!caseId) return null;
    try {
      const { data, error } = await supabase
        .from('energy_invoices').insert([{ ...values, case_id: caseId }] as any).select().single();
      if (error) throw error;
      const inv = data as EnergyInvoice;
      setInvoices(prev => [inv, ...prev]);
      toast.success('Factura registrada');
      return inv;
    } catch (err) {
      toast.error('Error al crear factura');
      return null;
    }
  }, [caseId]);

  const updateInvoice = useCallback(async (id: string, values: Partial<EnergyInvoice>) => {
    try {
      const { data, error } = await supabase
        .from('energy_invoices').update(values).eq('id', id).select().single();
      if (error) throw error;
      const updated = data as EnergyInvoice;
      setInvoices(prev => prev.map(i => i.id === id ? updated : i));
      toast.success('Factura actualizada');
      return updated;
    } catch (err) {
      toast.error('Error al actualizar factura');
      return null;
    }
  }, []);

  const deleteInvoice = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('energy_invoices').delete().eq('id', id);
      if (error) throw error;
      setInvoices(prev => prev.filter(i => i.id !== id));
      toast.success('Factura eliminada');
    } catch (err) {
      toast.error('Error al eliminar');
    }
  }, []);

  const uploadPdf = useCallback(async (file: File, invoiceId: string) => {
    if (!caseId) return null;
    const path = `invoices/${caseId}/${invoiceId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('energy-documents').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Error subiendo PDF'); return null; }

    // Store internal path (not a public URL)
    await updateInvoice(invoiceId, { document_url: path });

    // Register in document audit trail
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('energy_document_registry' as any).insert([{
      case_id: caseId,
      document_type: 'invoice',
      file_path: path,
      file_name: file.name,
      file_size_bytes: file.size,
      mime_type: file.type || 'application/pdf',
      uploaded_by: user?.id,
      linked_entity_id: invoiceId,
      linked_entity_type: 'energy_invoices',
      status: 'active',
    }]);

    return path;
  }, [caseId, updateInvoice]);

  /** Get a short-lived signed URL for a document */
  const getSignedUrl = useCallback(async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('energy-documents')
      .createSignedUrl(filePath, 300); // 5 min expiry
    if (error) { console.error('[getSignedUrl] error:', error); return null; }
    return data.signedUrl;
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  return { invoices, loading, fetchInvoices, createInvoice, updateInvoice, deleteInvoice, uploadPdf, getSignedUrl };
}
