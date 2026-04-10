/**
 * usePaymentTracking — P1.3
 * Hook for managing payroll payment lifecycle.
 * Supports period-level (batch) and individual record payment marking.
 * Creates ledger events and evidence for audit trail.
 * 
 * SEPA CT generation: NOT YET IMPLEMENTED (documented gap).
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHRLedgerWriter } from './useHRLedgerWriter';
import type { PaymentPhase } from '@/engines/erp/hr/payrollCycleStatusEngine';

export type PaymentMethod = 'transferencia' | 'cheque' | 'efectivo' | 'otro';

export interface PaymentRegistration {
  paymentDate: string;
  paymentReference: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface PeriodPaymentStatus {
  phase: PaymentPhase;
  totalRecords: number;
  paidRecords: number;
  paymentDate: string | null;
  paymentReference: string | null;
}

export function usePaymentTracking(companyId: string) {
  const { writeLedger, writeLedgerWithEvidence } = useHRLedgerWriter(companyId, 'payroll_payment');

  /**
   * Mark an entire period as paid (batch).
   * Updates period metadata + all unpaid records + creates ledger + evidence.
   */
  const markPeriodAsPaid = useCallback(async (
    periodId: string,
    registration: PaymentRegistration,
  ): Promise<boolean> => {
    try {
      // 1. Update period payment_date and metadata
      const { error: periodError } = await supabase
        .from('hr_payroll_periods')
        .update({
          payment_date: registration.paymentDate,
          metadata: {
            payment_registered: true,
            payment_reference: registration.paymentReference,
            payment_method: registration.paymentMethod,
            payment_notes: registration.notes || null,
            payment_registered_at: new Date().toISOString(),
          },
        } as any)
        .eq('id', periodId);

      if (periodError) throw periodError;

      // 2. Update all records for this period to paid
      const now = new Date().toISOString();
      const { data: updatedRecords, error: recordsError } = await supabase
        .from('hr_payroll_records')
        .update({
          status: 'paid',
          paid_at: now,
          payment_reference: registration.paymentReference,
        } as any)
        .eq('payroll_period_id', periodId)
        .neq('status', 'paid')
        .select('id');

      if (recordsError) {
        console.error('[usePaymentTracking] records update error (non-blocking):', recordsError);
      }

      const recordCount = updatedRecords?.length ?? 0;

      // 3. Ledger + evidence
      await writeLedgerWithEvidence(
        {
          eventType: 'payroll_payment_executed' as any,
          eventLabel: 'Pago de nómina registrado',
          entityType: 'payroll_period',
          entityId: periodId,
          afterSnapshot: {
            payment_date: registration.paymentDate,
            payment_reference: registration.paymentReference,
            payment_method: registration.paymentMethod,
            records_updated: recordCount,
          },
          metadata: {
            scope: 'period_batch',
            sepa_generated: false,
            sepa_gap: 'SEPA CT generation not yet implemented',
          },
        },
        [
          {
            evidenceType: 'system_generated',
            evidenceLabel: 'Registro de pago de nómina',
            refEntityType: 'payroll_period',
            refEntityId: periodId,
            evidenceSnapshot: {
              payment_date: registration.paymentDate,
              payment_reference: registration.paymentReference,
              payment_method: registration.paymentMethod,
              records_updated: recordCount,
            },
            metadata: {
              description: `Pago registrado: ${registration.paymentReference} (${registration.paymentMethod}) — ${recordCount} nóminas`,
            },
          },
        ],
      );

      toast.success(`Pago registrado: ${recordCount} nómina(s) marcadas como pagadas`);
      return true;
    } catch (err) {
      console.error('[usePaymentTracking] markPeriodAsPaid error:', err);
      toast.error('Error al registrar el pago');
      return false;
    }
  }, [companyId, writeLedgerWithEvidence]);

  /**
   * Mark a single record as paid (individual).
   */
  const markRecordAsPaid = useCallback(async (
    recordId: string,
    paymentReference: string,
    paymentDate?: string,
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('hr_payroll_records')
        .update({
          status: 'paid',
          paid_at: paymentDate || new Date().toISOString(),
          payment_reference: paymentReference,
        } as any)
        .eq('id', recordId);

      if (error) throw error;

      await writeLedger({
        eventType: 'payroll_payment_executed' as any,
        eventLabel: 'Pago individual registrado',
        entityType: 'payroll_record',
        entityId: recordId,
        afterSnapshot: {
          payment_reference: paymentReference,
          payment_date: paymentDate,
        },
        metadata: { scope: 'individual_record' },
      });

      return true;
    } catch (err) {
      console.error('[usePaymentTracking] markRecordAsPaid error:', err);
      toast.error('Error al registrar pago individual');
      return false;
    }
  }, [writeLedger]);

  /**
   * Derive payment status for a period from its records.
   */
  const getPaymentStatus = useCallback(async (periodId: string): Promise<PeriodPaymentStatus> => {
    try {
      const { data: records } = await supabase
        .from('hr_payroll_records')
        .select('id, status, paid_at, payment_reference')
        .eq('payroll_period_id', periodId);

      const total = records?.length ?? 0;
      const paid = records?.filter((r: any) => r.status === 'paid').length ?? 0;

      const { data: period } = await supabase
        .from('hr_payroll_periods')
        .select('payment_date, metadata')
        .eq('id', periodId)
        .single();

      let phase: PaymentPhase = 'pending';
      if (total === 0) phase = 'not_applicable';
      else if (paid === total) phase = 'paid';
      else if (paid > 0) phase = 'partial';

      return {
        phase,
        totalRecords: total,
        paidRecords: paid,
        paymentDate: (period as any)?.payment_date ?? null,
        paymentReference: (period as any)?.metadata?.payment_reference ?? null,
      };
    } catch (err) {
      console.error('[usePaymentTracking] getPaymentStatus error:', err);
      return { phase: 'pending', totalRecords: 0, paidRecords: 0, paymentDate: null, paymentReference: null };
    }
  }, []);

  /**
   * Generate a payment summary for the period (placeholder for SEPA).
   */
  const generatePaymentSummary = useCallback(async (periodId: string) => {
    try {
      const { data: records } = await supabase
        .from('hr_payroll_records')
        .select('id, employee_id, net_salary, status, payment_reference')
        .eq('payroll_period_id', periodId)
        .neq('status', 'cancelled');

      const totalNet = (records ?? []).reduce((s: number, r: any) => s + (r.net_salary ?? 0), 0);
      const unpaid = (records ?? []).filter((r: any) => r.status !== 'paid');

      return {
        totalRecords: records?.length ?? 0,
        totalNet,
        unpaidCount: unpaid.length,
        unpaidTotal: unpaid.reduce((s: number, r: any) => s + (r.net_salary ?? 0), 0),
        sepaReady: false, // GAP: SEPA CT generation not yet implemented
      };
    } catch (err) {
      console.error('[usePaymentTracking] generatePaymentSummary error:', err);
      return null;
    }
  }, []);

  return {
    markPeriodAsPaid,
    markRecordAsPaid,
    getPaymentStatus,
    generatePaymentSummary,
  };
}
