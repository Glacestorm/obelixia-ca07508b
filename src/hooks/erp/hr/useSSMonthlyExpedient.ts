/**
 * useSSMonthlyExpedient — V2-ES.7 Paso 4
 * Orchestration hook for SS Monthly Expedient:
 * - Generate expedient from closed period
 * - Reconcile payroll vs SS contributions
 * - Manage expedient lifecycle with full traceability
 *
 * NOTA: "finalized_internal" NO equivale a presentación oficial TGSS/SILTRA.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  type SSExpedientStatus,
  type SSExpedientSnapshot,
  type SSExpedientTraceEntry,
  type SSReconciliationResult,
  reconcilePayrollVsSS,
  buildExpedientSnapshot,
  buildTraceEntry,
  canTransitionExpedient,
  canSafelyCancel,
  getAuditEventForTransition,
  SS_EXPEDIENT_STATUS_CONFIG,
} from '@/engines/erp/hr/ssMonthlyExpedientEngine';
import type { PeriodClosureSnapshot } from '@/engines/erp/hr/payrollRunEngine';

// ── Expedient record (stored in erp_hr_ss_contributions.metadata) ──
export interface SSMonthlyExpedient {
  id: string; // erp_hr_ss_contributions.id
  company_id: string;
  period_year: number;
  period_month: number;
  period_id: string | null;
  expedient_status: SSExpedientStatus;
  snapshot: SSExpedientSnapshot | null;
  reconciliation: SSReconciliationResult | null;
  trace: SSExpedientTraceEntry[];
  // Traceability fields
  consolidated_at: string | null;
  consolidated_by: string | null;
  reconciled_at: string | null;
  reconciled_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  ready_internal_at: string | null;
  ready_internal_by: string | null;
  finalized_internal_at: string | null;
  finalized_internal_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  // From ss_contributions row
  total_base_cc: number;
  total_base_at: number;
  cc_company: number;
  cc_worker: number;
  unemployment_company: number;
  unemployment_worker: number;
  fogasa: number;
  fp_company: number;
  fp_worker: number;
  at_ep_company: number;
  total_company: number;
  total_worker: number;
  total_amount: number;
  total_workers: number;
  status: string;
  filing_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSSMonthlyExpedient(companyId: string) {
  const [expedients, setExpedients] = useState<SSMonthlyExpedient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Helper: get current user ──
  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }, []);

  // ── Helper: read fresh metadata from DB ──
  const readFreshMetadata = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('erp_hr_ss_contributions')
      .select('metadata')
      .eq('id', id)
      .single();
    return (data?.metadata || {}) as any;
  }, []);

  // ── Helper: persist metadata update ──
  const persistMetadata = useCallback(async (id: string, meta: any) => {
    const { error } = await supabase
      .from('erp_hr_ss_contributions')
      .update({ metadata: meta as any, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }, []);

  // ── Helper: log to audit trail ──
  const logAuditEvent = useCallback(async (
    action: string,
    entityId: string,
    details: Record<string, any>,
  ) => {
    try {
      const user = await getCurrentUser();
      await supabase.from('erp_hr_audit_log').insert([{
        company_id: companyId,
        table_name: 'erp_hr_ss_contributions',
        record_id: entityId,
        action,
        category: 'ss_expedient',
        user_id: user?.id,
        metadata: details as any,
      }]);
    } catch (err) {
      console.warn('[useSSMonthlyExpedient] audit log failed (non-blocking):', err);
    }
  }, [companyId, getCurrentUser]);

  // ── Fetch SS contributions with expedient metadata ──
  const fetchExpedients = useCallback(async (year?: number) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('erp_hr_ss_contributions')
        .select('*')
        .eq('company_id', companyId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (year) query = query.eq('period_year', year);

      const { data, error } = await query;
      if (error) throw error;

      const mapped: SSMonthlyExpedient[] = (data || []).map((row: any) => {
        const meta = (row.metadata || {}) as any;
        // Backward compat: map old status names to new
        let expStatus = (meta.expedient_status as SSExpedientStatus) || 'draft';
        if (expStatus === 'ready' as any) expStatus = 'ready_internal';
        if (expStatus === 'submitted' as any) expStatus = 'finalized_internal';

        return {
          id: row.id,
          company_id: row.company_id,
          period_year: row.period_year,
          period_month: row.period_month,
          period_id: meta.period_id || null,
          expedient_status: expStatus,
          snapshot: meta.expedient_snapshot || null,
          reconciliation: meta.reconciliation || null,
          trace: meta.trace || [],
          // Traceability
          consolidated_at: meta.consolidated_at || null,
          consolidated_by: meta.consolidated_by || null,
          reconciled_at: meta.reconciled_at || null,
          reconciled_by: meta.reconciled_by || null,
          reviewed_at: meta.reviewed_at || null,
          reviewed_by: meta.reviewed_by || null,
          ready_internal_at: meta.ready_internal_at || meta.ready_at || null,
          ready_internal_by: meta.ready_internal_by || meta.ready_by || null,
          finalized_internal_at: meta.finalized_internal_at || null,
          finalized_internal_by: meta.finalized_internal_by || null,
          cancelled_at: meta.cancelled_at || null,
          cancelled_by: meta.cancelled_by || null,
          // SS data
          total_base_cc: row.total_base_cc || 0,
          total_base_at: row.total_base_at || 0,
          cc_company: row.cc_company || 0,
          cc_worker: row.cc_worker || 0,
          unemployment_company: row.unemployment_company || 0,
          unemployment_worker: row.unemployment_worker || 0,
          fogasa: row.fogasa || 0,
          fp_company: row.fp_company || 0,
          fp_worker: row.fp_worker || 0,
          at_ep_company: row.at_ep_company || 0,
          total_company: row.total_company || 0,
          total_worker: row.total_worker || 0,
          total_amount: row.total_amount || 0,
          total_workers: row.total_workers || 0,
          status: row.status || 'pending',
          filing_reference: row.filing_reference,
          notes: row.notes,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      });

      setExpedients(mapped);
      return mapped;
    } catch (err) {
      console.error('[useSSMonthlyExpedient] fetchExpedients:', err);
      toast.error('Error al cargar expedientes SS');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // ── Consolidate: link period closure to SS contribution ──
  const consolidateExpedient = useCallback(async (
    ssContributionId: string,
    periodId: string,
    closureSnapshot: PeriodClosureSnapshot,
    periodYear: number,
    periodMonth: number,
  ): Promise<boolean> => {
    try {
      const expedient = expedients.find(e => e.id === ssContributionId);
      const currentStatus = expedient?.expedient_status || 'draft';

      if (!canTransitionExpedient(currentStatus, 'consolidated')) {
        toast.error(`No se puede consolidar desde estado "${SS_EXPEDIENT_STATUS_CONFIG[currentStatus].label}"`);
        return false;
      }

      const user = await getCurrentUser();
      const userId = user?.id || '';

      const ssData = expedient ? {
        total_base_cc: expedient.total_base_cc,
        total_base_at: expedient.total_base_at,
        cc_company: expedient.cc_company,
        cc_worker: expedient.cc_worker,
        unemployment_company: expedient.unemployment_company,
        unemployment_worker: expedient.unemployment_worker,
        fogasa: expedient.fogasa,
        fp_company: expedient.fp_company,
        fp_worker: expedient.fp_worker,
        at_ep_company: expedient.at_ep_company,
        total_company: expedient.total_company,
        total_worker: expedient.total_worker,
        total_amount: expedient.total_amount,
        total_workers: expedient.total_workers,
      } : null;

      const snapshot = buildExpedientSnapshot({
        periodId, periodYear, periodMonth,
        closureSnapshot, ssContribution: ssData,
        userId, reconciliation: null,
      });

      const traceEntry = buildTraceEntry('consolidate', currentStatus, 'consolidated', userId, {
        period_id: periodId,
        run_ref: closureSnapshot?.approved_run_id,
      });

      const existingMeta = await readFreshMetadata(ssContributionId);
      const existingTrace = existingMeta.trace || [];

      const newMeta = {
        ...existingMeta,
        period_id: periodId,
        expedient_status: 'consolidated',
        expedient_snapshot: snapshot,
        consolidated_at: new Date().toISOString(),
        consolidated_by: userId,
        trace: [...existingTrace, traceEntry],
      };

      await persistMetadata(ssContributionId, newMeta);

      // Audit trail
      await logAuditEvent('ss_expedient_consolidated', ssContributionId, {
        period_id: periodId, run_ref: closureSnapshot?.approved_run_id,
        from_status: currentStatus, to_status: 'consolidated',
      });

      setExpedients(prev => prev.map(e =>
        e.id === ssContributionId
          ? {
              ...e, period_id: periodId,
              expedient_status: 'consolidated' as SSExpedientStatus,
              snapshot, consolidated_at: newMeta.consolidated_at, consolidated_by: userId,
              trace: newMeta.trace,
            }
          : e
      ));

      toast.success('Expediente SS consolidado con período cerrado');
      return true;
    } catch (err: any) {
      console.error('[useSSMonthlyExpedient] consolidateExpedient:', err);
      toast.error(`Error al consolidar: ${err.message}`);
      return false;
    }
  }, [expedients, getCurrentUser, readFreshMetadata, persistMetadata, logAuditEvent]);

  // ── Reconcile: compare payroll totals vs SS ──
  const reconcileExpedient = useCallback(async (
    ssContributionId: string,
    periodStatus: string,
    closureSnapshot: PeriodClosureSnapshot | null,
  ): Promise<SSReconciliationResult | null> => {
    try {
      const expedient = expedients.find(e => e.id === ssContributionId);
      if (!expedient) { toast.error('Expediente no encontrado'); return null; }

      const payrollTotals = closureSnapshot ? {
        gross: closureSnapshot.totals.gross,
        net: closureSnapshot.totals.net,
        employer_cost: closureSnapshot.totals.employer_cost,
        employee_count: closureSnapshot.employee_count,
      } : { gross: 0, net: 0, employer_cost: 0, employee_count: 0 };

      const ssData = expedient.total_amount > 0 ? {
        total_base_cc: expedient.total_base_cc,
        total_base_at: expedient.total_base_at,
        cc_company: expedient.cc_company,
        cc_worker: expedient.cc_worker,
        unemployment_company: expedient.unemployment_company,
        unemployment_worker: expedient.unemployment_worker,
        fogasa: expedient.fogasa,
        fp_company: expedient.fp_company,
        fp_worker: expedient.fp_worker,
        at_ep_company: expedient.at_ep_company,
        total_company: expedient.total_company,
        total_worker: expedient.total_worker,
        total_amount: expedient.total_amount,
        total_workers: expedient.total_workers,
      } : null;

      const result = reconcilePayrollVsSS({
        payroll: payrollTotals, ss: ssData,
        periodStatus, hasApprovedRun: !!closureSnapshot?.approved_run_id,
      });

      const user = await getCurrentUser();
      const userId = user?.id || '';
      const currentStatus = expedient.expedient_status;
      const newStatus: SSExpedientStatus =
        canTransitionExpedient(currentStatus, 'reconciled') ? 'reconciled' : currentStatus;

      const traceEntry = buildTraceEntry('reconcile', currentStatus, newStatus, userId, {
        notes: `Score: ${result.score}%, Status: ${result.status}`,
      });

      const existingMeta = await readFreshMetadata(ssContributionId);
      const existingTrace = existingMeta.trace || [];

      const newMeta = {
        ...existingMeta,
        expedient_status: newStatus,
        reconciliation: result,
        reconciled_at: new Date().toISOString(),
        reconciled_by: userId,
        trace: [...existingTrace, traceEntry],
      };

      if (newMeta.expedient_snapshot) {
        newMeta.expedient_snapshot.reconciliation = result;
      }

      await persistMetadata(ssContributionId, newMeta);

      await logAuditEvent('ss_expedient_reconciled', ssContributionId, {
        score: result.score, status: result.status,
        passed: result.passed, failed: result.failed, warnings: result.warnings,
        from_status: currentStatus, to_status: newStatus,
      });

      setExpedients(prev => prev.map(e =>
        e.id === ssContributionId
          ? {
              ...e, expedient_status: newStatus, reconciliation: result,
              reconciled_at: newMeta.reconciled_at, reconciled_by: userId,
              trace: newMeta.trace,
            }
          : e
      ));

      if (result.status === 'balanced') {
        toast.success(`Conciliación OK — ${result.score}% (${result.passed}/${result.total_checks} checks)`);
      } else if (result.status === 'incomplete') {
        toast.warning('Conciliación incompleta — faltan datos SS');
      } else {
        toast.warning(`Discrepancias detectadas — ${result.failed} error(es), ${result.warnings} aviso(s)`);
      }

      return result;
    } catch (err: any) {
      console.error('[useSSMonthlyExpedient] reconcileExpedient:', err);
      toast.error(`Error en conciliación: ${err.message}`);
      return null;
    }
  }, [expedients, getCurrentUser, readFreshMetadata, persistMetadata, logAuditEvent]);

  // ── Update expedient status (generic) ──
  const updateExpedientStatus = useCallback(async (
    ssContributionId: string,
    newStatus: SSExpedientStatus,
    notes?: string,
  ): Promise<boolean> => {
    try {
      const expedient = expedients.find(e => e.id === ssContributionId);
      const currentStatus = expedient?.expedient_status || 'draft';

      if (!canTransitionExpedient(currentStatus, newStatus)) {
        toast.error(`Transición no permitida: ${SS_EXPEDIENT_STATUS_CONFIG[currentStatus].label} → ${SS_EXPEDIENT_STATUS_CONFIG[newStatus].label}`);
        return false;
      }

      const user = await getCurrentUser();
      const userId = user?.id || '';

      const traceEntry = buildTraceEntry(
        getAuditEventForTransition(newStatus),
        currentStatus, newStatus, userId,
        { notes, period_id: expedient?.period_id || undefined },
      );

      const existingMeta = await readFreshMetadata(ssContributionId);
      const existingTrace = existingMeta.trace || [];

      const newMeta = {
        ...existingMeta,
        expedient_status: newStatus,
        [`${newStatus}_at`]: new Date().toISOString(),
        [`${newStatus}_by`]: userId,
        trace: [...existingTrace, traceEntry],
        ...(notes ? { status_notes: notes } : {}),
      };

      await persistMetadata(ssContributionId, newMeta);

      await logAuditEvent(getAuditEventForTransition(newStatus), ssContributionId, {
        from_status: currentStatus, to_status: newStatus,
        ...(notes ? { notes } : {}),
      });

      setExpedients(prev => prev.map(e =>
        e.id === ssContributionId
          ? {
              ...e, expedient_status: newStatus,
              [`${newStatus}_at`]: newMeta[`${newStatus}_at`],
              [`${newStatus}_by`]: userId,
              trace: newMeta.trace,
            } as SSMonthlyExpedient
          : e
      ));

      const statusLabel = SS_EXPEDIENT_STATUS_CONFIG[newStatus].label;
      toast.success(`Expediente → ${statusLabel}`);
      return true;
    } catch (err: any) {
      console.error('[useSSMonthlyExpedient] updateStatus:', err);
      toast.error(`Error: ${err.message}`);
      return false;
    }
  }, [expedients, getCurrentUser, readFreshMetadata, persistMetadata, logAuditEvent]);

  // ── Cancel expedient (safe) ──
  const cancelExpedient = useCallback(async (
    ssContributionId: string,
    reason: string,
  ): Promise<boolean> => {
    const expedient = expedients.find(e => e.id === ssContributionId);
    if (!expedient) { toast.error('Expediente no encontrado'); return false; }

    if (!canSafelyCancel(expedient.expedient_status)) {
      toast.error(`No se puede cancelar desde estado "${SS_EXPEDIENT_STATUS_CONFIG[expedient.expedient_status].label}"`);
      return false;
    }

    if (!reason.trim()) {
      toast.error('Motivo de cancelación obligatorio');
      return false;
    }

    return updateExpedientStatus(ssContributionId, 'cancelled', reason);
  }, [expedients, updateExpedientStatus]);

  // ── Finalize internally (NOT official submission) ──
  const finalizeExpedientInternal = useCallback(async (
    ssContributionId: string,
    notes?: string,
  ): Promise<boolean> => {
    return updateExpedientStatus(ssContributionId, 'finalized_internal', notes || 'Finalizado internamente');
  }, [updateExpedientStatus]);

  // ── Create SS contribution for a period (if none exists) ──
  const createExpedientForPeriod = useCallback(async (
    periodYear: number,
    periodMonth: number,
    periodId: string,
  ): Promise<string | null> => {
    try {
      const existing = expedients.find(
        e => e.period_year === periodYear && e.period_month === periodMonth
      );
      if (existing) {
        toast.info('Ya existe un registro SS para este período');
        return existing.id;
      }

      const user = await getCurrentUser();
      const userId = user?.id || '';

      const initialTrace = buildTraceEntry('create', 'draft' as SSExpedientStatus, 'draft', userId, {
        period_id: periodId,
      });

      const { data, error } = await supabase
        .from('erp_hr_ss_contributions')
        .insert([{
          company_id: companyId,
          period_year: periodYear,
          period_month: periodMonth,
          status: 'pending',
          metadata: {
            period_id: periodId,
            expedient_status: 'draft',
            created_by: userId,
            trace: [initialTrace],
          } as any,
        }])
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('ss_expedient_created', data?.id || '', {
        period_year: periodYear, period_month: periodMonth, period_id: periodId,
      });

      await fetchExpedients(periodYear);
      toast.success('Registro SS creado para el período');
      return data?.id || null;
    } catch (err: any) {
      console.error('[useSSMonthlyExpedient] createExpedient:', err);
      toast.error(`Error: ${err.message}`);
      return null;
    }
  }, [companyId, expedients, fetchExpedients, getCurrentUser, logAuditEvent]);

  return {
    expedients,
    isLoading,
    fetchExpedients,
    consolidateExpedient,
    reconcileExpedient,
    updateExpedientStatus,
    cancelExpedient,
    finalizeExpedientInternal,
    createExpedientForPeriod,
  };
}
