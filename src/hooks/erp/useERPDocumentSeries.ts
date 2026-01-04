import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ERPDocumentSeries {
  id: string;
  company_id: string;
  module: string;
  document_type: string;
  code: string;
  name: string;
  prefix: string | null;
  suffix: string | null;
  next_number: number;
  padding_length: number;
  reset_annually: boolean;
  reset_monthly: boolean;
  is_default: boolean;
  is_active: boolean;
  fiscal_year_id: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ERPDocumentNumber {
  id: string;
  series_id: string;
  company_id: string;
  document_number: string;
  sequence_number: number;
  entity_type: string;
  entity_id: string;
  issued_at: string;
  fiscal_year_id: string | null;
}

export const DOCUMENT_MODULES = [
  { value: 'sales', label: 'Ventas' },
  { value: 'purchases', label: 'Compras' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'accounting', label: 'Contabilidad' },
  { value: 'treasury', label: 'Tesorería' },
];

export const DOCUMENT_TYPES = {
  sales: [
    { value: 'invoice', label: 'Factura' },
    { value: 'order', label: 'Pedido' },
    { value: 'delivery_note', label: 'Albarán' },
    { value: 'quotation', label: 'Presupuesto' },
  ],
  purchases: [
    { value: 'invoice', label: 'Factura' },
    { value: 'order', label: 'Pedido' },
    { value: 'goods_receipt', label: 'Entrada' },
  ],
  inventory: [
    { value: 'movement', label: 'Movimiento' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'count', label: 'Inventario' },
  ],
  accounting: [
    { value: 'journal_entry', label: 'Asiento' },
  ],
  treasury: [
    { value: 'payment', label: 'Pago' },
    { value: 'receipt', label: 'Cobro' },
    { value: 'remittance', label: 'Remesa' },
  ],
};

export function useERPDocumentSeries(companyId?: string) {
  const [series, setSeries] = useState<ERPDocumentSeries[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all series for company
  const fetchSeries = useCallback(async () => {
    if (!companyId) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_document_series')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('module, document_type, code');

      if (error) throw error;

      setSeries(data as ERPDocumentSeries[]);
      return data;
    } catch (error) {
      console.error('Error fetching series:', error);
      toast.error('Error al cargar series documentales');
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Create series
  const createSeries = useCallback(async (input: Partial<ERPDocumentSeries>) => {
    if (!companyId) return null;

    try {
      const { data, error } = await supabase
        .from('erp_document_series')
        .insert([{
          company_id: companyId,
          module: input.module,
          document_type: input.document_type,
          code: input.code,
          name: input.name,
          prefix: input.prefix,
          suffix: input.suffix,
          next_number: input.next_number || 1,
          padding_length: input.padding_length || 6,
          reset_annually: input.reset_annually ?? true,
          reset_monthly: input.reset_monthly ?? false,
          is_default: input.is_default ?? false,
        }])
        .select()
        .single();

      if (error) throw error;

      setSeries(prev => [...prev, data as ERPDocumentSeries]);
      toast.success('Serie creada correctamente');
      return data;
    } catch (error: any) {
      console.error('Error creating series:', error);
      toast.error(error.message || 'Error al crear serie');
      return null;
    }
  }, [companyId]);

  // Update series
  const updateSeries = useCallback(async (id: string, updates: Partial<ERPDocumentSeries>) => {
    try {
      const { data, error } = await supabase
        .from('erp_document_series')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSeries(prev => prev.map(s => s.id === id ? data as ERPDocumentSeries : s));
      toast.success('Serie actualizada');
      return data;
    } catch (error: any) {
      console.error('Error updating series:', error);
      toast.error(error.message || 'Error al actualizar serie');
      return null;
    }
  }, []);

  // Delete series (soft delete)
  const deleteSeries = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('erp_document_series')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setSeries(prev => prev.filter(s => s.id !== id));
      toast.success('Serie eliminada');
      return true;
    } catch (error: any) {
      console.error('Error deleting series:', error);
      toast.error(error.message || 'Error al eliminar serie');
      return false;
    }
  }, []);

  // Get next number (preview without consuming)
  const previewNextNumber = useCallback((seriesId: string): string => {
    const s = series.find(ser => ser.id === seriesId);
    if (!s) return '';

    const prefix = s.prefix || '';
    const suffix = s.suffix || '';
    const paddedNum = String(s.next_number).padStart(s.padding_length, '0');
    
    return `${prefix}${paddedNum}${suffix}`;
  }, [series]);

  // Get default series for module/type
  const getDefaultSeries = useCallback((module: string, documentType: string): ERPDocumentSeries | undefined => {
    return series.find(s => 
      s.module === module && 
      s.document_type === documentType && 
      s.is_default
    );
  }, [series]);

  // Set series as default
  const setAsDefault = useCallback(async (id: string, module: string, documentType: string) => {
    if (!companyId) return false;

    try {
      // Remove default from other series of same module/type
      await supabase
        .from('erp_document_series')
        .update({ is_default: false })
        .eq('company_id', companyId)
        .eq('module', module)
        .eq('document_type', documentType);

      // Set new default
      const { error } = await supabase
        .from('erp_document_series')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      setSeries(prev => prev.map(s => ({
        ...s,
        is_default: s.id === id ? true : 
          (s.module === module && s.document_type === documentType ? false : s.is_default)
      })));

      toast.success('Serie establecida como predeterminada');
      return true;
    } catch (error: any) {
      console.error('Error setting default series:', error);
      toast.error(error.message || 'Error al establecer serie predeterminada');
      return false;
    }
  }, [companyId]);

  // Initial load
  useEffect(() => {
    if (companyId) {
      fetchSeries();
    }
  }, [companyId, fetchSeries]);

  return {
    series,
    loading,
    fetchSeries,
    createSeries,
    updateSeries,
    deleteSeries,
    previewNextNumber,
    getDefaultSeries,
    setAsDefault,
    DOCUMENT_MODULES,
    DOCUMENT_TYPES,
  };
}

export default useERPDocumentSeries;
