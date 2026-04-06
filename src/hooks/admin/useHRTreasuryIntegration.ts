/**
 * Hook para integración RRHH ↔ Tesorería
 * Genera vencimientos de pago desde nóminas, finiquitos y cotizaciones SS
 * Cumplimiento: Ley 15/2010, ET Art. 29
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { computeDeadlineUrgency, type ComputedDeadline } from '@/shared/legal/compliance/obligationEngine';

// === INTERFACES ===

export interface TreasuryIntegration {
  id: string;
  company_id: string;
  source_type: 'payroll' | 'settlement' | 'ss_contribution' | 'irpf_retention';
  source_id: string;
  source_reference: string | null;
  payable_id: string | null;
  beneficiary_type: 'employee' | 'tgss' | 'aeat';
  beneficiary_id: string | null;
  beneficiary_name: string | null;
  amount: number;
  currency: string;
  due_date: string;
  payment_date: string | null;
  status: 'pending' | 'scheduled' | 'paid' | 'cancelled' | 'failed';
  payment_method: string;
  payment_reference: string | null;
  bank_account_iban: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PayrollPaymentData {
  payrollId: string;
  payrollReference: string;
  employeeId: string;
  employeeName: string;
  netAmount: number;
  dueDate: string;
  bankAccountIban?: string;
}

export interface SSContributionData {
  periodId: string;
  periodReference: string;
  totalAmount: number;
  dueDate: string; // Normalmente día 30 del mes siguiente
}

export interface IRPFRetentionData {
  periodId: string;
  periodReference: string;
  totalAmount: number;
  dueDate: string; // Día 20 del mes siguiente (o trimestral)
}

export interface SettlementPaymentData {
  settlementId: string;
  settlementReference: string;
  employeeId: string;
  employeeName: string;
  netAmount: number;
  dueDate: string;
  bankAccountIban?: string;
}

export interface TreasurySummary {
  totalPending: number;
  pendingCount: number;
  totalScheduled: number;
  scheduledCount: number;
  totalPaid: number;
  paidCount: number;
  overdueCount: number;
  overdueAmount: number;
  upcomingWeek: number;
  upcomingMonth: number;
}

// === HOOK ===

export function useHRTreasuryIntegration() {
  const [isLoading, setIsLoading] = useState(false);
  const [integrations, setIntegrations] = useState<TreasuryIntegration[]>([]);
  const [error, setError] = useState<string | null>(null);

  // === FETCH INTEGRATIONS ===
  const fetchIntegrations = useCallback(async (companyId: string, filters?: {
    sourceType?: string;
    status?: string;
    beneficiaryType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('erp_hr_treasury_integration')
        .select('*')
        .eq('company_id', companyId)
        .order('due_date', { ascending: true })
        .limit(200);

      if (filters?.sourceType) {
        query = query.eq('source_type', filters.sourceType);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.beneficiaryType) {
        query = query.eq('beneficiary_type', filters.beneficiaryType);
      }
      if (filters?.dateFrom) {
        query = query.gte('due_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('due_date', filters.dateTo);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setIntegrations((data || []) as TreasuryIntegration[]);
      return data;
    } catch (err) {
      console.error('[useHRTreasuryIntegration] fetchIntegrations error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar integraciones');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CREATE PAYROLL PAYMENT ===
  const createPayrollPayment = useCallback(async (
    companyId: string,
    data: PayrollPaymentData
  ): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data: result, error: insertError } = await supabase
        .from('erp_hr_treasury_integration')
        .insert({
          company_id: companyId,
          source_type: 'payroll',
          source_id: data.payrollId,
          source_reference: data.payrollReference,
          beneficiary_type: 'employee',
          beneficiary_id: data.employeeId,
          beneficiary_name: data.employeeName,
          amount: data.netAmount,
          due_date: data.dueDate,
          bank_account_iban: data.bankAccountIban,
          status: 'pending',
          payment_method: 'transfer'
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Log de auditoría
      await supabase.from('erp_hr_integration_log').insert({
        company_id: companyId,
        integration_type: 'treasury',
        source_type: 'payroll',
        source_id: data.payrollId,
        action: 'create',
        status: 'success',
        details: {
          integration_id: result.id,
          amount: data.netAmount,
          due_date: data.dueDate,
          beneficiary: data.employeeName
        }
      });

      toast.success(`Vencimiento creado: ${data.employeeName}`);
      return result.id;
    } catch (err) {
      console.error('[useHRTreasuryIntegration] createPayrollPayment error:', err);
      toast.error('Error al crear vencimiento de nómina');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CREATE SETTLEMENT PAYMENT ===
  const createSettlementPayment = useCallback(async (
    companyId: string,
    data: SettlementPaymentData
  ): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data: result, error: insertError } = await supabase
        .from('erp_hr_treasury_integration')
        .insert({
          company_id: companyId,
          source_type: 'settlement',
          source_id: data.settlementId,
          source_reference: data.settlementReference,
          beneficiary_type: 'employee',
          beneficiary_id: data.employeeId,
          beneficiary_name: data.employeeName,
          amount: data.netAmount,
          due_date: data.dueDate,
          bank_account_iban: data.bankAccountIban,
          status: 'pending',
          payment_method: 'transfer',
          notes: 'Finiquito - Pago prioritario según ET Art. 29'
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Log
      await supabase.from('erp_hr_integration_log').insert({
        company_id: companyId,
        integration_type: 'treasury',
        source_type: 'settlement',
        source_id: data.settlementId,
        action: 'create',
        status: 'success',
        details: {
          integration_id: result.id,
          amount: data.netAmount,
          due_date: data.dueDate
        }
      });

      toast.success(`Vencimiento finiquito creado: ${data.employeeName}`);
      return result.id;
    } catch (err) {
      console.error('[useHRTreasuryIntegration] createSettlementPayment error:', err);
      toast.error('Error al crear vencimiento de finiquito');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CREATE SS CONTRIBUTION PAYMENT ===
  const createSSContributionPayment = useCallback(async (
    companyId: string,
    data: SSContributionData
  ): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data: result, error: insertError } = await supabase
        .from('erp_hr_treasury_integration')
        .insert({
          company_id: companyId,
          source_type: 'ss_contribution',
          source_id: data.periodId,
          source_reference: data.periodReference,
          beneficiary_type: 'tgss',
          beneficiary_name: 'Tesorería General de la Seguridad Social',
          amount: data.totalAmount,
          due_date: data.dueDate,
          status: 'pending',
          payment_method: 'sepa',
          notes: 'Liquidación mensual cotizaciones SS - Sistema RED'
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      toast.success(`Vencimiento TGSS creado: ${data.periodReference}`);
      return result.id;
    } catch (err) {
      console.error('[useHRTreasuryIntegration] createSSContributionPayment error:', err);
      toast.error('Error al crear vencimiento de SS');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CREATE IRPF RETENTION PAYMENT ===
  const createIRPFRetentionPayment = useCallback(async (
    companyId: string,
    data: IRPFRetentionData
  ): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data: result, error: insertError } = await supabase
        .from('erp_hr_treasury_integration')
        .insert({
          company_id: companyId,
          source_type: 'irpf_retention',
          source_id: data.periodId,
          source_reference: data.periodReference,
          beneficiary_type: 'aeat',
          beneficiary_name: 'Agencia Estatal de Administración Tributaria',
          amount: data.totalAmount,
          due_date: data.dueDate,
          status: 'pending',
          payment_method: 'transfer',
          notes: 'Modelo 111 - Retenciones e ingresos a cuenta IRPF'
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      toast.success(`Vencimiento AEAT creado: ${data.periodReference}`);
      return result.id;
    } catch (err) {
      console.error('[useHRTreasuryIntegration] createIRPFRetentionPayment error:', err);
      toast.error('Error al crear vencimiento de IRPF');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === UPDATE STATUS ===
  const updatePaymentStatus = useCallback(async (
    integrationId: string,
    status: TreasuryIntegration['status'],
    paymentData?: {
      paymentDate?: string;
      paymentReference?: string;
      payableId?: string;
    }
  ): Promise<boolean> => {
    try {
      const updates: Record<string, unknown> = { status };
      
      if (paymentData?.paymentDate) {
        updates.payment_date = paymentData.paymentDate;
      }
      if (paymentData?.paymentReference) {
        updates.payment_reference = paymentData.paymentReference;
      }
      if (paymentData?.payableId) {
        updates.payable_id = paymentData.payableId;
      }

      const { error: updateError } = await supabase
        .from('erp_hr_treasury_integration')
        .update(updates)
        .eq('id', integrationId);

      if (updateError) throw updateError;

      toast.success(`Estado actualizado: ${status}`);
      return true;
    } catch (err) {
      console.error('[useHRTreasuryIntegration] updatePaymentStatus error:', err);
      toast.error('Error al actualizar estado');
      return false;
    }
  }, []);

  // === MARK AS PAID ===
  const markAsPaid = useCallback(async (
    integrationId: string,
    paymentReference: string
  ): Promise<boolean> => {
    return updatePaymentStatus(integrationId, 'paid', {
      paymentDate: new Date().toISOString().split('T')[0],
      paymentReference
    });
  }, [updatePaymentStatus]);

  // === CANCEL PAYMENT ===
  const cancelPayment = useCallback(async (
    integrationId: string,
    reason: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('erp_hr_treasury_integration')
        .update({
          status: 'cancelled',
          notes: reason
        })
        .eq('id', integrationId);

      if (error) throw error;

      toast.success('Vencimiento cancelado');
      return true;
    } catch (err) {
      console.error('[useHRTreasuryIntegration] cancelPayment error:', err);
      toast.error('Error al cancelar vencimiento');
      return false;
    }
  }, []);

  // === GET SUMMARY ===
  const getTreasurySummary = useCallback(async (companyId: string): Promise<TreasurySummary | null> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('erp_hr_treasury_integration')
        .select('amount, status, due_date')
        .eq('company_id', companyId);

      if (error) throw error;

      const items = data || [];

      const summary: TreasurySummary = {
        pendingCount: items.filter(i => i.status === 'pending').length,
        totalPending: items.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0),
        scheduledCount: items.filter(i => i.status === 'scheduled').length,
        totalScheduled: items.filter(i => i.status === 'scheduled').reduce((sum, i) => sum + i.amount, 0),
        paidCount: items.filter(i => i.status === 'paid').length,
        totalPaid: items.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
        overdueCount: items.filter(i => i.status === 'pending' && i.due_date < today).length,
        overdueAmount: items.filter(i => i.status === 'pending' && i.due_date < today).reduce((sum, i) => sum + i.amount, 0),
        upcomingWeek: items.filter(i => i.status === 'pending' && i.due_date >= today && i.due_date <= nextWeek).reduce((sum, i) => sum + i.amount, 0),
        upcomingMonth: items.filter(i => i.status === 'pending' && i.due_date >= today && i.due_date <= nextMonth).reduce((sum, i) => sum + i.amount, 0)
      };

      return summary;
    } catch (err) {
      console.error('[useHRTreasuryIntegration] getTreasurySummary error:', err);
      return null;
    }
  }, []);

  // === GET OVERDUE ITEMS ===
  const getOverdueItems = useCallback(async (companyId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('erp_hr_treasury_integration')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .lt('due_date', today)
        .order('due_date', { ascending: true });

      if (error) throw error;

      return (data || []) as TreasuryIntegration[];
    } catch (err) {
      console.error('[useHRTreasuryIntegration] getOverdueItems error:', err);
      return [];
    }
  }, []);

  // === GET UPCOMING PAYMENTS ===
  const getUpcomingPayments = useCallback(async (companyId: string, days = 7) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('erp_hr_treasury_integration')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['pending', 'scheduled'])
        .gte('due_date', today)
        .lte('due_date', futureDate)
        .order('due_date', { ascending: true });

      if (error) throw error;

      return (data || []) as TreasuryIntegration[];
    } catch (err) {
      console.error('[useHRTreasuryIntegration] getUpcomingPayments error:', err);
      return [];
    }
  }, []);

  // === BULK CREATE FROM PAYROLL BATCH ===
  const createBulkPayrollPayments = useCallback(async (
    companyId: string,
    payments: PayrollPaymentData[]
  ): Promise<number> => {
    setIsLoading(true);
    let successCount = 0;

    try {
      for (const payment of payments) {
        const result = await createPayrollPayment(companyId, payment);
        if (result) successCount++;
      }

      toast.success(`${successCount} vencimientos de nómina creados`);
      return successCount;
    } catch (err) {
      console.error('[useHRTreasuryIntegration] createBulkPayrollPayments error:', err);
      toast.error('Error en creación masiva de vencimientos');
      return successCount;
    } finally {
      setIsLoading(false);
    }
  }, [createPayrollPayment]);

  return {
    // Estado
    isLoading,
    integrations,
    error,
    // Fetch
    fetchIntegrations,
    // Crear vencimientos
    createPayrollPayment,
    createSettlementPayment,
    createSSContributionPayment,
    createIRPFRetentionPayment,
    createBulkPayrollPayments,
    // Actualizar estado
    updatePaymentStatus,
    markAsPaid,
    cancelPayment,
    // Consultas
    getTreasurySummary,
    getOverdueItems,
    getUpcomingPayments,
    getPaymentUrgencies,
  };
}

// === SHARED LEGAL CORE — Urgency Enrichment (F9) ===

/**
 * @shared-legal-core — Treasury item enriched with computed deadline urgency.
 * Uses `computeDeadlineUrgency` from the Shared Legal Core obligation engine.
 */
export interface TreasuryIntegrationWithUrgency extends TreasuryIntegration {
  urgency: ComputedDeadline;
}

/**
 * Pure function: enriches pending/scheduled treasury items with shared core urgency.
 * Exported for testing; not a hook dependency.
 */
export function enrichWithUrgency(
  items: TreasuryIntegration[],
  referenceDate?: Date
): TreasuryIntegrationWithUrgency[] {
  return items
    .filter(i => i.status === 'pending' || i.status === 'scheduled')
    .map(i => ({
      ...i,
      urgency: computeDeadlineUrgency(i.due_date, referenceDate),
    }));
}

export default useHRTreasuryIntegration;
