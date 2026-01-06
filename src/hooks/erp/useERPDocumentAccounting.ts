/**
 * useERPDocumentAccounting Hook
 * Integración de contabilización automática para documentos de compra/venta
 * Genera asientos contables vinculados automáticamente al confirmar documentos
 */

import { useCallback } from 'react';
import { useERPContext } from './useERPContext';
import { useERPAutoAccounting } from './useERPAutoAccounting';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tipos de documentos soportados
export type DocumentType = 
  | 'sales_invoice' 
  | 'supplier_invoice' 
  | 'sales_credit_note' 
  | 'purchase_credit_note'
  | 'payment_received'
  | 'payment_made';

export interface DocumentAccountingData {
  documentType: DocumentType;
  documentId: string;
  documentNumber?: string;
  documentDate: string;
  partnerId: string;
  partnerName: string;
  partnerTaxId?: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  currency?: string;
  lines?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    accountCode?: string;
  }>;
  paymentMethod?: string;
  bankAccountId?: string;
}

export interface LinkedEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference?: string;
  total_debit: number;
  total_credit: number;
  is_posted: boolean;
  is_reversed: boolean;
  journal_name?: string;
  created_at: string;
}

// Mapeo de tipos de documento a categorías de operación
const DOCUMENT_TO_OPERATION_MAP: Record<DocumentType, {
  category: string;
  operationType: string;
  transactionType: string;
  journalType: string;
}> = {
  sales_invoice: {
    category: 'sales',
    operationType: 'invoice',
    transactionType: 'issue',
    journalType: 'sales'
  },
  supplier_invoice: {
    category: 'purchases',
    operationType: 'invoice',
    transactionType: 'receipt',
    journalType: 'purchases'
  },
  sales_credit_note: {
    category: 'sales',
    operationType: 'credit_note',
    transactionType: 'issue',
    journalType: 'sales'
  },
  purchase_credit_note: {
    category: 'purchases',
    operationType: 'credit_note',
    transactionType: 'receipt',
    journalType: 'purchases'
  },
  payment_received: {
    category: 'treasury',
    operationType: 'payment',
    transactionType: 'collection',
    journalType: 'bank'
  },
  payment_made: {
    category: 'treasury',
    operationType: 'payment',
    transactionType: 'disbursement',
    journalType: 'bank'
  }
};

export function useERPDocumentAccounting() {
  const { currentCompany } = useERPContext();
  const { generateEntry, createAndLinkJournalEntry, getLinkedEntries } = useERPAutoAccounting();

  // Función para obtener diarios
  const fetchJournals = useCallback(async () => {
    const { data, error } = await supabase
      .from('erp_journals')
      .select('id, name, journal_type')
      .eq('company_id', currentCompany?.id || '')
      .eq('is_active', true);
    
    if (error) return [];
    return data || [];
  }, [currentCompany?.id]);

  /**
   * Genera asiento contable para un documento
   */
  const generateDocumentEntry = useCallback(async (
    data: DocumentAccountingData
  ) => {
    if (!currentCompany?.id) {
      toast.error('No hay empresa seleccionada');
      return null;
    }

    const mapping = DOCUMENT_TO_OPERATION_MAP[data.documentType];
    if (!mapping) {
      toast.error('Tipo de documento no soportado para contabilización');
      return null;
    }

    try {
      const result = await generateEntry(
        mapping.category,
        mapping.operationType,
        mapping.transactionType,
        {
          document_id: data.documentId,
          document_number: data.documentNumber,
          document_date: data.documentDate,
          partner_id: data.partnerId,
          partner_name: data.partnerName,
          partner_tax_id: data.partnerTaxId,
          subtotal: data.subtotal,
          tax_total: data.taxTotal,
          total: data.total,
          currency: data.currency || 'EUR',
          lines: data.lines,
          payment_method: data.paymentMethod,
          bank_account_id: data.bankAccountId
        }
      );

      return result;
    } catch (err) {
      console.error('[useERPDocumentAccounting] generateDocumentEntry error:', err);
      toast.error('Error al generar asiento');
      return null;
    }
  }, [currentCompany?.id, generateEntry]);

  /**
   * Contabiliza un documento creando y vinculando el asiento
   */
  const postDocument = useCallback(async (
    data: DocumentAccountingData,
    options?: {
      autoPost?: boolean;
      journalId?: string;
      periodId?: string;
      fiscalYearId?: string;
    }
  ): Promise<{ entryId: string; entryNumber: string } | null> => {
    if (!currentCompany?.id) {
      toast.error('No hay empresa seleccionada');
      return null;
    }

    try {
      // 1. Generar el asiento
      const entryResult = await generateDocumentEntry(data);
      if (!entryResult?.entry) {
        throw new Error('No se pudo generar el asiento');
      }

      // 2. Obtener el diario correcto si no se especificó
      let journalId = options?.journalId;
      if (!journalId) {
        const journals = await fetchJournals();
        const mapping = DOCUMENT_TO_OPERATION_MAP[data.documentType];
        const journal = journals.find(j => j.journal_type === mapping.journalType);
        journalId = journal?.id;
      }

      // 3. Crear y vincular el asiento
      const sourceType = data.documentType;
      const sourceId = data.documentId;

      const result = await createAndLinkJournalEntry(
        entryResult.entry,
        sourceType,
        sourceId,
        {
          autoPost: options?.autoPost ?? entryResult.auto_post,
          journalId,
          periodId: options?.periodId,
          fiscalYearId: options?.fiscalYearId
        }
      );

      if (!result) {
        throw new Error('No se pudo crear el asiento vinculado');
      }

      return {
        entryId: result.entry_id,
        entryNumber: result.entry_number
      };
    } catch (err) {
      console.error('[useERPDocumentAccounting] postDocument error:', err);
      toast.error('Error al contabilizar documento');
      return null;
    }
  }, [currentCompany?.id, generateDocumentEntry, fetchJournals, createAndLinkJournalEntry]);

  /**
   * Obtiene los asientos vinculados a un documento
   */
  const getDocumentEntries = useCallback(async (
    documentType: DocumentType,
    documentId: string
  ): Promise<LinkedEntry[]> => {
    return getLinkedEntries(documentType, documentId) as Promise<LinkedEntry[]>;
  }, [getLinkedEntries]);

  /**
   * Verifica si un documento ya está contabilizado
   */
  const isDocumentPosted = useCallback(async (
    documentType: DocumentType,
    documentId: string
  ): Promise<boolean> => {
    const entries = await getDocumentEntries(documentType, documentId);
    return entries.some(e => e.is_posted && !e.is_reversed);
  }, [getDocumentEntries]);

  /**
   * Contabiliza factura de venta
   */
  const postSalesInvoice = useCallback(async (
    invoiceId: string,
    options?: { autoPost?: boolean }
  ) => {
    if (!currentCompany?.id) return null;

    try {
      // Obtener datos de la factura
      const { data: invoice, error } = await supabase
        .from('erp_sales_invoices')
        .select(`
          *,
          customer:erp_customers(name, tax_id),
          lines:erp_sales_invoice_lines(*)
        `)
        .eq('id', invoiceId)
        .single();

      if (error || !invoice) {
        toast.error('Factura no encontrada');
        return null;
      }

      return postDocument({
        documentType: 'sales_invoice',
        documentId: invoiceId,
        documentNumber: invoice.invoice_number,
        documentDate: invoice.invoice_date,
        partnerId: invoice.customer_id,
        partnerName: invoice.customer?.name || '',
        partnerTaxId: invoice.customer?.tax_id,
        subtotal: invoice.subtotal,
        taxTotal: invoice.tax_amount,
        total: invoice.total_amount,
        currency: invoice.currency,
        lines: (invoice.lines || []).map((l: Record<string, unknown>) => ({
          description: l.description as string || '',
          quantity: l.quantity as number,
          unitPrice: l.unit_price as number,
          taxRate: l.tax_rate as number || 21,
          accountCode: l.account_code as string
        }))
      }, options);
    } catch (err) {
      console.error('[useERPDocumentAccounting] postSalesInvoice error:', err);
      return null;
    }
  }, [currentCompany?.id, postDocument]);

  /**
   * Contabiliza factura de proveedor
   */
  const postSupplierInvoice = useCallback(async (
    invoiceId: string,
    options?: { autoPost?: boolean }
  ) => {
    if (!currentCompany?.id) return null;

    try {
      // Obtener datos de la factura
      const { data: invoice, error } = await supabase
        .from('erp_supplier_invoices')
        .select(`
          *,
          supplier:erp_suppliers(name, tax_id),
          lines:erp_supplier_invoice_lines(*)
        `)
        .eq('id', invoiceId)
        .single();

      if (error || !invoice) {
        toast.error('Factura no encontrada');
        return null;
      }

      return postDocument({
        documentType: 'supplier_invoice',
        documentId: invoiceId,
        documentNumber: invoice.document_number || invoice.supplier_invoice_number,
        documentDate: invoice.invoice_date,
        partnerId: invoice.supplier_id || '',
        partnerName: invoice.supplier?.name || '',
        partnerTaxId: invoice.supplier?.tax_id,
        subtotal: invoice.subtotal,
        taxTotal: invoice.tax_total,
        total: invoice.total,
        currency: invoice.currency,
        lines: (invoice.lines || []).map((l: Record<string, unknown>) => ({
          description: l.description as string || '',
          quantity: l.quantity as number,
          unitPrice: l.unit_price as number,
          taxRate: l.tax_rate as number || 21,
          accountCode: l.account_code as string
        }))
      }, options);
    } catch (err) {
      console.error('[useERPDocumentAccounting] postSupplierInvoice error:', err);
      return null;
    }
  }, [currentCompany?.id, postDocument]);

  /**
   * Contabiliza cobro de cliente
   */
  const postPaymentReceived = useCallback(async (
    paymentData: {
      paymentId: string;
      invoiceId?: string;
      customerId: string;
      customerName: string;
      amount: number;
      paymentDate: string;
      paymentMethod: string;
      bankAccountId?: string;
      reference?: string;
    },
    options?: { autoPost?: boolean }
  ) => {
    return postDocument({
      documentType: 'payment_received',
      documentId: paymentData.paymentId,
      documentNumber: paymentData.reference,
      documentDate: paymentData.paymentDate,
      partnerId: paymentData.customerId,
      partnerName: paymentData.customerName,
      subtotal: paymentData.amount,
      taxTotal: 0,
      total: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      bankAccountId: paymentData.bankAccountId
    }, options);
  }, [postDocument]);

  /**
   * Contabiliza pago a proveedor
   */
  const postPaymentMade = useCallback(async (
    paymentData: {
      paymentId: string;
      invoiceId?: string;
      supplierId: string;
      supplierName: string;
      amount: number;
      paymentDate: string;
      paymentMethod: string;
      bankAccountId?: string;
      reference?: string;
    },
    options?: { autoPost?: boolean }
  ) => {
    return postDocument({
      documentType: 'payment_made',
      documentId: paymentData.paymentId,
      documentNumber: paymentData.reference,
      documentDate: paymentData.paymentDate,
      partnerId: paymentData.supplierId,
      partnerName: paymentData.supplierName,
      subtotal: paymentData.amount,
      taxTotal: 0,
      total: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      bankAccountId: paymentData.bankAccountId
    }, options);
  }, [postDocument]);

  /**
   * Contabilización masiva de documentos
   */
  const batchPostDocuments = useCallback(async (
    documents: Array<{ type: DocumentType; id: string }>,
    options?: { autoPost?: boolean }
  ): Promise<{ success: number; failed: number; results: Array<{ id: string; entryId?: string; error?: string }> }> => {
    const results: Array<{ id: string; entryId?: string; error?: string }> = [];
    let success = 0;
    let failed = 0;

    for (const doc of documents) {
      try {
        let result: { entryId: string; entryNumber: string } | null = null;

        switch (doc.type) {
          case 'sales_invoice':
            result = await postSalesInvoice(doc.id, options);
            break;
          case 'supplier_invoice':
            result = await postSupplierInvoice(doc.id, options);
            break;
          default:
            throw new Error(`Tipo de documento no implementado: ${doc.type}`);
        }

        if (result) {
          success++;
          results.push({ id: doc.id, entryId: result.entryId });
        } else {
          failed++;
          results.push({ id: doc.id, error: 'Error al contabilizar' });
        }
      } catch (err) {
        failed++;
        results.push({ 
          id: doc.id, 
          error: err instanceof Error ? err.message : 'Error desconocido' 
        });
      }
    }

    if (success > 0) {
      toast.success(`${success} documento(s) contabilizado(s)`);
    }
    if (failed > 0) {
      toast.error(`${failed} documento(s) fallido(s)`);
    }

    return { success, failed, results };
  }, [postSalesInvoice, postSupplierInvoice]);

  return {
    // Funciones principales
    generateDocumentEntry,
    postDocument,
    getDocumentEntries,
    isDocumentPosted,
    
    // Funciones específicas por tipo
    postSalesInvoice,
    postSupplierInvoice,
    postPaymentReceived,
    postPaymentMade,
    
    // Contabilización masiva
    batchPostDocuments
  };
}

export default useERPDocumentAccounting;
