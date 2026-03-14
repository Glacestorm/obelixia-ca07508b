/**
 * useFiscalMonthlyExpedient — V2-ES.7 Paso 5
 * Orchestration hook for Fiscal Monthly Expedient:
 * - Generate expedient from closed period
 * - Extract IRPF data from payroll lines
 * - Reconcile payroll vs fiscal
 * - Manage lifecycle with full traceability
 *
 * NOTA: "finalized_internal" NO equivale a presentación oficial AEAT.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  type FiscalExpedientStatus,
  type FiscalExpedientSnapshot,
  type FiscalExpedientTraceEntry,
  type FiscalReconciliationResult,
  reconcilePayrollVsFiscal,
  buildFiscalExpedientSnapshot,
  buildFiscalTraceEntry,
  canTransitionFiscalExpedient,
  getFiscalAuditEvent,
  FISCAL_EXPEDIENT_STATUS_CONFIG,
} from '@/engines/erp/hr/fiscalMonthlyExpedientEngine';
import type { PeriodClosureSnapshot } from '@/engines/erp/hr/payrollRunEngine';

// ── Types ──
export interface FiscalMonthlyExpedient {
  id: string; // synthetic id = period-based key
  company_id: string;
  period_year: number;
  period_month: number;
  period_id: string | null;
  expedient_status: FiscalExpedientStatus;
  snapshot: FiscalExpedientSnapshot | null;
  reconciliation: FiscalReconciliationResult | null;
  trace: FiscalExpedientTraceEntry[];
  // Traceability
  consolidated_at: string | null;
  consolidated_by: string | null;
  reconciled_at: string | null;
  reconciled_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  finalized_internal_at: string | null;
  finalized_internal_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  // Fiscal data
  total_irpf_base: number;
  total_irpf_retencion: number;
  total_irpf_workers: number;
  avg_irpf_rate: number;
}

/**
 * Storage: we use hr_payroll_periods.metadata.fiscal_expedient as the storage
 * location for fiscal expedient data, since there's no dedicated fiscal table.
 * This keeps it zero-migration and linked to the period.
 */
export function useFiscalMonthlyExpedient(companyId: string) {
  const [expedients, setExpedients] = useState<FiscalMonthlyExpedient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }, []);

  // ── Log audit event ──
  const logAuditEvent = useCallback(async (
    action: string, entityId: string, details: Record<string, any>,
  ) => {
    try {
      const user = await getCurrentUser();
      await supabase.from('erp_hr_audit_log').insert([{
        company_id: companyId,
        table_name: 'hr_payroll_periods',
        record_id: entityId,
        action,
        category: 'fiscal_expedient',
        user_id: user?.id,
        metadata: details as any,
      }]);
    } catch (err) {
      console.warn('[useFiscalMonthlyExpedient] audit log failed:', err);
    }
  }, [companyId, getCurrentUser]);

  // ── Extract fiscal data from payroll lines ──
  const extractFiscalData = useCallback(async (periodId: string) => {
    try {
      // Get payroll records for this period
      const { data: records } = await (supabase
        .from('hr_payroll_records')
        .select('id, employee_id')
        .eq('company_id', companyId)
        .eq('period_id', periodId) as any);

      if (!records || records.length === 0) return null;

      const recordIds = records.map(r => r.id);

      // Get taxable lines (IRPF)
      const { data: lines } = await supabase
        .from('hr_payroll_record_lines')
        .select('amount, line_type, is_taxable, concept_code, percentage')
        .in('payroll_record_id', recordIds);

      if (!lines) return null;

      // Aggregate: sum taxable earnings as IRPF base, find IRPF retention lines
      let totalBase = 0;
      let totalRetencion = 0;

      for (const line of lines) {
        if (line.line_type === 'earning' && line.is_taxable) {
          totalBase += Math.abs(line.amount || 0);
        }
        // IRPF retention lines (concept codes containing 'irpf' or specific deduction)
        if (line.line_type === 'deduction' && (
          line.concept_code?.toLowerCase().includes('irpf') ||
          line.concept_code === 'IRPF' ||
          line.concept_code === 'retencion_irpf'
        )) {
          totalRetencion += Math.abs(line.amount || 0);
        }
      }

      const workerCount = records.length;
      const avgRate = totalBase > 0 ? (totalRetencion / totalBase) * 100 : 0;

      return {
        total_irpf_base: totalBase,
        total_irpf_retencion: totalRetencion,
        total_irpf_workers: workerCount,
        avg_irpf_rate: Math.round(avgRate * 100) / 100,
        total_percepciones_especie: 0,
        total_ingresos_cuenta: 0,
      };
    } catch (err) {
      console.error('[useFiscalMonthlyExpedient] extractFiscalData:', err);
      return null;
    }
  }, [companyId]);

  // ── Fetch expedients from period metadata ──
  const fetchExpedients = useCallback(async (year?: number) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('hr_payroll_periods')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['closed', 'locked'])
        .order('fiscal_year', { ascending: false })
        .order('period_number', { ascending: false });

      if (year) query = query.eq('fiscal_year', year);

      const { data, error } = await query;
      if (error) throw error;

      const mapped: FiscalMonthlyExpedient[] = (data || []).map((period: any) => {
        const meta = (period.metadata || {}) as any;
        const fe = meta.fiscal_expedient || {};

        return {
          id: period.id,
          company_id: period.company_id,
          period_year: period.fiscal_year,
          period_month: period.period_number,
          period_id: period.id,
          expedient_status: (fe.status as FiscalExpedientStatus) || 'draft',
          snapshot: fe.snapshot || null,
          reconciliation: fe.reconciliation || null,
          trace: fe.trace || [],
          consolidated_at: fe.consolidated_at || null,
          consolidated_by: fe.consolidated_by || null,
          reconciled_at: fe.reconciled_at || null,
          reconciled_by: fe.reconciled_by || null,
          reviewed_at: fe.reviewed_at || null,
          reviewed_by: fe.reviewed_by || null,
          finalized_internal_at: fe.finalized_internal_at || null,
          finalized_internal_by: fe.finalized_internal_by || null,
          cancelled_at: fe.cancelled_at || null,
          cancelled_by: fe.cancelled_by || null,
          total_irpf_base: fe.snapshot?.fiscal_totals?.total_irpf_base || 0,
          total_irpf_retencion: fe.snapshot?.fiscal_totals?.total_irpf_retencion || 0,
          total_irpf_workers: fe.snapshot?.fiscal_totals?.total_irpf_workers || 0,
          avg_irpf_rate: fe.snapshot?.fiscal_totals?.avg_irpf_rate || 0,
        };
      });

      setExpedients(mapped);
      return mapped;
    } catch (err) {
      console.error('[useFiscalMonthlyExpedient] fetch:', err);
      toast.error('Error al cargar expedientes fiscales');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // ── Helper: read/write fiscal_expedient in period metadata ──
  const readPeriodMeta = useCallback(async (periodId: string) => {
    const { data } = await supabase
      .from('hr_payroll_periods')
      .select('metadata')
      .eq('id', periodId)
      .single();
    return (data?.metadata || {}) as any;
  }, []);

  const writePeriodMeta = useCallback(async (periodId: string, meta: any) => {
    const { error } = await supabase
      .from('hr_payroll_periods')
      .update({ metadata: meta as any })
      .eq('id', periodId);
    if (error) throw error;
  }, []);

  // ── Consolidate ──
  const consolidateExpedient = useCallback(async (
    periodId: string,
    closureSnapshot: PeriodClosureSnapshot | null,
    periodYear: number,
    periodMonth: number,
  ): Promise<boolean> => {
    try {
      const user = await getCurrentUser();
      const userId = user?.id || '';
      const periodMeta = await readPeriodMeta(periodId);
      const fe = periodMeta.fiscal_expedient || {};
      const currentStatus = (fe.status as FiscalExpedientStatus) || 'draft';

      if (!canTransitionFiscalExpedient(currentStatus, 'consolidated')) {
        toast.error(`No se puede consolidar desde "${FISCAL_EXPEDIENT_STATUS_CONFIG[currentStatus].label}"`);
        return false;
      }

      // Extract fiscal data from payroll lines
      const fiscalData = await extractFiscalData(periodId);

      const snapshot = buildFiscalExpedientSnapshot({
        periodId, periodYear, periodMonth,
        closureSnapshot, fiscalData, userId,
        reconciliation: null,
      });

      const traceEntry = buildFiscalTraceEntry('consolidate', currentStatus, 'consolidated', userId, {
        period_id: periodId, run_ref: closureSnapshot?.approved_run_id,
      });

      const newFe = {
        ...fe,
        status: 'consolidated',
        snapshot,
        consolidated_at: new Date().toISOString(),
        consolidated_by: userId,
        trace: [...(fe.trace || []), traceEntry],
      };

      await writePeriodMeta(periodId, { ...periodMeta, fiscal_expedient: newFe });

      await logAuditEvent('fiscal_expedient_consolidated', periodId, {
        period_year: periodYear, period_month: periodMonth,
        irpf_base: fiscalData?.total_irpf_base || 0,
        irpf_retencion: fiscalData?.total_irpf_retencion || 0,
      });

      await fetchExpedients();
      toast.success('Expediente fiscal consolidado');
      return true;
    } catch (err: any) {
      console.error('[useFiscalMonthlyExpedient] consolidate:', err);
      toast.error(`Error: ${err.message}`);
      return false;
    }
  }, [getCurrentUser, readPeriodMeta, writePeriodMeta, extractFiscalData, fetchExpedients, logAuditEvent]);

  // ── Reconcile ──
  const reconcileExpedient = useCallback(async (
    periodId: string,
    periodStatus: string,
    closureSnapshot: PeriodClosureSnapshot | null,
  ): Promise<FiscalReconciliationResult | null> => {
    try {
      const user = await getCurrentUser();
      const userId = user?.id || '';
      const periodMeta = await readPeriodMeta(periodId);
      const fe = periodMeta.fiscal_expedient || {};
      const currentStatus = (fe.status as FiscalExpedientStatus) || 'draft';

      const payrollTotals = closureSnapshot ? {
        gross: closureSnapshot.totals.gross,
        net: closureSnapshot.totals.net,
        employer_cost: closureSnapshot.totals.employer_cost,
        employee_count: closureSnapshot.employee_count,
      } : { gross: 0, net: 0, employer_cost: 0, employee_count: 0 };

      const fiscalData = fe.snapshot?.fiscal_totals || null;

      const result = reconcilePayrollVsFiscal({
        payroll: payrollTotals,
        fiscal: fiscalData,
        periodStatus,
        hasApprovedRun: !!closureSnapshot?.approved_run_id,
      });

      const newStatus: FiscalExpedientStatus =
        canTransitionFiscalExpedient(currentStatus, 'reconciled') ? 'reconciled' : currentStatus;

      const traceEntry = buildFiscalTraceEntry('reconcile', currentStatus, newStatus, userId, {
        notes: `Score: ${result.score}%, Status: ${result.status}`,
      });

      const newFe = {
        ...fe,
        status: newStatus,
        reconciliation: result,
        reconciled_at: new Date().toISOString(),
        reconciled_by: userId,
        trace: [...(fe.trace || []), traceEntry],
      };
      if (newFe.snapshot) newFe.snapshot.reconciliation = result;

      await writePeriodMeta(periodId, { ...periodMeta, fiscal_expedient: newFe });

      await logAuditEvent('fiscal_expedient_reconciled', periodId, {
        score: result.score, status: result.status,
        passed: result.passed, failed: result.failed,
      });

      await fetchExpedients();

      if (result.status === 'balanced') {
        toast.success(`Conciliación fiscal OK — ${result.score}%`);
      } else if (result.status === 'incomplete') {
        toast.warning('Conciliación fiscal incompleta — faltan datos IRPF');
      } else {
        toast.warning(`Discrepancias fiscales — ${result.failed} error(es)`);
      }

      return result;
    } catch (err: any) {
      console.error('[useFiscalMonthlyExpedient] reconcile:', err);
      toast.error(`Error: ${err.message}`);
      return null;
    }
  }, [getCurrentUser, readPeriodMeta, writePeriodMeta, fetchExpedients, logAuditEvent]);

  // ── Update status (generic) ──
  const updateExpedientStatus = useCallback(async (
    periodId: string, newStatus: FiscalExpedientStatus, notes?: string,
  ): Promise<boolean> => {
    try {
      const user = await getCurrentUser();
      const userId = user?.id || '';
      const periodMeta = await readPeriodMeta(periodId);
      const fe = periodMeta.fiscal_expedient || {};
      const currentStatus = (fe.status as FiscalExpedientStatus) || 'draft';

      if (!canTransitionFiscalExpedient(currentStatus, newStatus)) {
        toast.error(`Transición no permitida: ${FISCAL_EXPEDIENT_STATUS_CONFIG[currentStatus].label} → ${FISCAL_EXPEDIENT_STATUS_CONFIG[newStatus].label}`);
        return false;
      }

      const traceEntry = buildFiscalTraceEntry(
        getFiscalAuditEvent(newStatus), currentStatus, newStatus, userId,
        { notes, period_id: periodId },
      );

      const newFe = {
        ...fe,
        status: newStatus,
        [`${newStatus}_at`]: new Date().toISOString(),
        [`${newStatus}_by`]: userId,
        trace: [...(fe.trace || []), traceEntry],
        ...(notes ? { status_notes: notes } : {}),
      };

      await writePeriodMeta(periodId, { ...periodMeta, fiscal_expedient: newFe });

      await logAuditEvent(getFiscalAuditEvent(newStatus), periodId, {
        from_status: currentStatus, to_status: newStatus,
        ...(notes ? { notes } : {}),
      });

      await fetchExpedients();
      toast.success(`Expediente fiscal → ${FISCAL_EXPEDIENT_STATUS_CONFIG[newStatus].label}`);
      return true;
    } catch (err: any) {
      console.error('[useFiscalMonthlyExpedient] updateStatus:', err);
      toast.error(`Error: ${err.message}`);
      return false;
    }
  }, [getCurrentUser, readPeriodMeta, writePeriodMeta, fetchExpedients, logAuditEvent]);

  const cancelExpedient = useCallback(async (periodId: string, reason: string) => {
    if (!reason.trim()) { toast.error('Motivo obligatorio'); return false; }
    return updateExpedientStatus(periodId, 'cancelled', reason);
  }, [updateExpedientStatus]);

  const finalizeExpedientInternal = useCallback(async (periodId: string, notes?: string) => {
    return updateExpedientStatus(periodId, 'finalized_internal', notes || 'Finalizado internamente');
  }, [updateExpedientStatus]);

  return {
    expedients, isLoading,
    fetchExpedients, consolidateExpedient, reconcileExpedient,
    updateExpedientStatus, cancelExpedient, finalizeExpedientInternal,
  };
}
