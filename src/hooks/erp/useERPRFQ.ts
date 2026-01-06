/**
 * Hook para gestión de RFQ (Request for Quotation)
 * Fase 1: CRUD básico para solicitudes y cotizaciones
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from './useERPContext';
import { toast } from 'sonner';

// === INTERFACES ===
export interface RFQ {
  id: string;
  company_id: string;
  rfq_number: string;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'in_progress' | 'evaluated' | 'awarded' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  request_date: string;
  response_deadline?: string;
  expected_delivery_date?: string;
  invited_suppliers?: string[];
  evaluation_criteria?: {
    price: number;
    quality: number;
    delivery: number;
    service: number;
  };
  notes?: string;
  created_by?: string;
  awarded_to?: string;
  awarded_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  quotes_count?: number;
  lines_count?: number;
}

export interface RFQLine {
  id: string;
  rfq_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit: string;
  target_price?: number;
  specifications?: string;
  is_required: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  // Joined
  product_name?: string;
}

export interface SupplierQuote {
  id: string;
  rfq_id: string;
  supplier_id: string;
  quote_number?: string;
  quote_date: string;
  validity_date?: string;
  currency: string;
  payment_terms?: string;
  delivery_days?: number;
  delivery_terms?: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  status: 'received' | 'evaluated' | 'accepted' | 'rejected';
  notes?: string;
  attachments?: unknown[];
  score_price?: number;
  score_quality?: number;
  score_delivery?: number;
  score_service?: number;
  score_total?: number;
  is_winner: boolean;
  evaluated_by?: string;
  evaluated_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  supplier_name?: string;
  lines_count?: number;
}

export interface SupplierQuoteLine {
  id: string;
  quote_id: string;
  rfq_line_id?: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  subtotal: number;
  notes?: string;
  is_alternative: boolean;
  alternative_description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRFQInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  response_deadline?: string;
  expected_delivery_date?: string;
  invited_suppliers?: string[];
  notes?: string;
  lines?: Omit<RFQLine, 'id' | 'rfq_id' | 'created_at' | 'updated_at'>[];
}

export interface CreateQuoteInput {
  rfq_id: string;
  supplier_id: string;
  quote_number?: string;
  quote_date?: string;
  validity_date?: string;
  payment_terms?: string;
  delivery_days?: number;
  delivery_terms?: string;
  notes?: string;
  lines?: Omit<SupplierQuoteLine, 'id' | 'quote_id' | 'created_at' | 'updated_at'>[];
}

// === HOOK ===
export function useERPRFQ() {
  const { currentCompany } = useERPContext();
  const [isLoading, setIsLoading] = useState(false);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [currentRFQ, setCurrentRFQ] = useState<RFQ | null>(null);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);

  // === GENERAR NÚMERO RFQ ===
  const generateRFQNumber = useCallback(async (): Promise<string> => {
    const year = new Date().getFullYear();
    const prefix = `RFQ-${year}-`;
    
    const { data, error } = await supabase
      .from('erp_rfq')
      .select('rfq_number')
      .like('rfq_number', `${prefix}%`)
      .order('rfq_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error generating RFQ number:', error);
      return `${prefix}0001`;
    }

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].rfq_number.replace(prefix, '')) || 0;
      return `${prefix}${String(lastNumber + 1).padStart(4, '0')}`;
    }

    return `${prefix}0001`;
  }, []);

  // === FETCH RFQs ===
  const fetchRFQs = useCallback(async (status?: string): Promise<RFQ[]> => {
    if (!currentCompany) return [];
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('erp_rfq')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rfqsData = (data || []) as RFQ[];
      setRfqs(rfqsData);
      return rfqsData;
    } catch (error) {
      console.error('[useERPRFQ] fetchRFQs error:', error);
      toast.error('Error al cargar solicitudes de cotización');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany]);

  // === FETCH RFQ DETAILS ===
  const fetchRFQDetails = useCallback(async (rfqId: string): Promise<RFQ | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_rfq')
        .select('*')
        .eq('id', rfqId)
        .single();

      if (error) throw error;

      const rfq = data as RFQ;
      setCurrentRFQ(rfq);
      return rfq;
    } catch (error) {
      console.error('[useERPRFQ] fetchRFQDetails error:', error);
      toast.error('Error al cargar detalles del RFQ');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH RFQ LINES ===
  const fetchRFQLines = useCallback(async (rfqId: string): Promise<RFQLine[]> => {
    try {
      const { data, error } = await supabase
        .from('erp_rfq_lines')
        .select('*')
        .eq('rfq_id', rfqId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data || []) as RFQLine[];
    } catch (error) {
      console.error('[useERPRFQ] fetchRFQLines error:', error);
      return [];
    }
  }, []);

  // === CREATE RFQ ===
  const createRFQ = useCallback(async (input: CreateRFQInput): Promise<RFQ | null> => {
    if (!currentCompany) {
      toast.error('Selecciona una empresa');
      return null;
    }

    setIsLoading(true);
    try {
      const rfqNumber = await generateRFQNumber();
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('erp_rfq')
        .insert([{
          company_id: currentCompany.id,
          rfq_number: rfqNumber,
          title: input.title,
          description: input.description,
          priority: input.priority || 'medium',
          status: 'draft',
          request_date: new Date().toISOString().split('T')[0],
          response_deadline: input.response_deadline,
          expected_delivery_date: input.expected_delivery_date,
          invited_suppliers: input.invited_suppliers || [],
          notes: input.notes,
          created_by: userData?.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      const newRFQ = data as RFQ;

      // Crear líneas si existen
      if (input.lines && input.lines.length > 0) {
        const linesToInsert = input.lines.map((line, index) => ({
          rfq_id: newRFQ.id,
          description: line.description,
          quantity: line.quantity || 1,
          unit: line.unit || 'UND',
          target_price: line.target_price,
          specifications: line.specifications,
          is_required: line.is_required ?? true,
          order_index: index,
          product_id: line.product_id
        }));

        const { error: linesError } = await supabase
          .from('erp_rfq_lines')
          .insert(linesToInsert);

        if (linesError) {
          console.error('Error creating RFQ lines:', linesError);
        }
      }

      toast.success(`RFQ ${rfqNumber} creado`);
      await fetchRFQs();
      return newRFQ;
    } catch (error) {
      console.error('[useERPRFQ] createRFQ error:', error);
      toast.error('Error al crear solicitud');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany, generateRFQNumber, fetchRFQs]);

  // === UPDATE RFQ STATUS ===
  const updateRFQStatus = useCallback(async (
    rfqId: string, 
    status: RFQ['status']
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('erp_rfq')
        .update({ status })
        .eq('id', rfqId);

      if (error) throw error;

      toast.success(`Estado actualizado a ${status}`);
      await fetchRFQs();
      return true;
    } catch (error) {
      console.error('[useERPRFQ] updateRFQStatus error:', error);
      toast.error('Error al actualizar estado');
      return false;
    }
  }, [fetchRFQs]);

  // === FETCH QUOTES BY RFQ ===
  const fetchQuotesByRFQ = useCallback(async (rfqId: string): Promise<SupplierQuote[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_supplier_quotes')
        .select(`
          *,
          erp_suppliers!inner(name)
        `)
        .eq('rfq_id', rfqId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const quotesData = (data || []).map((q: Record<string, unknown>) => ({
        ...q,
        supplier_name: (q.erp_suppliers as { name?: string })?.name
      })) as SupplierQuote[];

      setQuotes(quotesData);
      return quotesData;
    } catch (error) {
      console.error('[useERPRFQ] fetchQuotesByRFQ error:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CREATE QUOTE ===
  const createQuote = useCallback(async (input: CreateQuoteInput): Promise<SupplierQuote | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_supplier_quotes')
        .insert([{
          rfq_id: input.rfq_id,
          supplier_id: input.supplier_id,
          quote_number: input.quote_number,
          quote_date: input.quote_date || new Date().toISOString().split('T')[0],
          validity_date: input.validity_date,
          payment_terms: input.payment_terms,
          delivery_days: input.delivery_days,
          delivery_terms: input.delivery_terms,
          notes: input.notes,
          status: 'received'
        }])
        .select()
        .single();

      if (error) throw error;

      const newQuote = data as SupplierQuote;

      // Crear líneas y calcular totales
      if (input.lines && input.lines.length > 0) {
        let subtotal = 0;
        let taxAmount = 0;

        const linesToInsert = input.lines.map(line => {
          const lineSubtotal = line.quantity * line.unit_price * (1 - (line.discount_percent || 0) / 100);
          const lineTax = lineSubtotal * (line.tax_rate || 21) / 100;
          subtotal += lineSubtotal;
          taxAmount += lineTax;

          return {
            quote_id: newQuote.id,
            rfq_line_id: line.rfq_line_id,
            product_id: line.product_id,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit || 'UND',
            unit_price: line.unit_price,
            discount_percent: line.discount_percent || 0,
            tax_rate: line.tax_rate || 21,
            subtotal: lineSubtotal,
            is_alternative: line.is_alternative || false,
            alternative_description: line.alternative_description
          };
        });

        const { error: linesError } = await supabase
          .from('erp_supplier_quote_lines')
          .insert(linesToInsert);

        if (linesError) {
          console.error('Error creating quote lines:', linesError);
        }

        // Actualizar totales
        await supabase
          .from('erp_supplier_quotes')
          .update({
            subtotal,
            tax_amount: taxAmount,
            total: subtotal + taxAmount
          })
          .eq('id', newQuote.id);
      }

      toast.success('Cotización registrada');
      return newQuote;
    } catch (error) {
      console.error('[useERPRFQ] createQuote error:', error);
      toast.error('Error al registrar cotización');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === DELETE RFQ ===
  const deleteRFQ = useCallback(async (rfqId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('erp_rfq')
        .delete()
        .eq('id', rfqId);

      if (error) throw error;

      toast.success('Solicitud eliminada');
      await fetchRFQs();
      return true;
    } catch (error) {
      console.error('[useERPRFQ] deleteRFQ error:', error);
      toast.error('Error al eliminar solicitud');
      return false;
    }
  }, [fetchRFQs]);

  return {
    // State
    isLoading,
    rfqs,
    currentRFQ,
    quotes,
    // RFQ Actions
    fetchRFQs,
    fetchRFQDetails,
    fetchRFQLines,
    createRFQ,
    updateRFQStatus,
    deleteRFQ,
    // Quote Actions
    fetchQuotesByRFQ,
    createQuote,
    // Utils
    generateRFQNumber,
    setCurrentRFQ
  };
}

export default useERPRFQ;
