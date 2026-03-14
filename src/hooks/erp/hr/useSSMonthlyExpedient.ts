/**
 * useSSMonthlyExpedient — V2-ES.7 Paso 4
 * Orchestration hook for SS Monthly Expedient:
 * - Generate expedient from closed period
 * - Reconcile payroll vs SS contributions
 * - Manage expedient lifecycle
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  type SSExpedientStatus,
  type SSExpedientSnapshot,
  type SSReconciliationResult,
  reconcilePayrollVsSS,
  buildExpedientSnapshot,
  canTransitionExpedient,
} from '@/engines/erp/hr/ssMonthlyExpedientEngine';
import type { PeriodClosureSnapshot } from '@/engines/erp/hr/payrollRunEngine';

// ── Expedient record (stored in erp_hr_ss_contributions.metadata) ──
export interface SSMonthlyExpedient {
  id: string; // erp_hr_ss_contributions.id
  company_id: string;
  period_year: number;
  period_month: number;
  period_id: string | null; // linked payroll period
  expedient_status: SSExpedientStatus;
  snapshot: SSExpedientSnapshot | null;
  reconciliation: SSReconciliationResult | null;
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
  status: string; // original row status
  filing_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSSMonthlyExpedient(companyId: string) {
  const [expedients, setExpedients] = useState<SSMonthlyExpedient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        return {
          id: row.id,
          company_id: row.company_id,
          period_year: row.period_year,
          period_month: row.period_month,
          period_id: meta.period_id || null,
          expedient_status: (meta.expedient_status as SSExpedientStatus) || 'draft',
          snapshot: meta.expedient_snapshot || null,
          reconciliation: meta.reconciliation || null,
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
        toast.error(`No se puede consolidar desde estado "${currentStatus}"`);
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Build SS data from existing row
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
        periodId,
        periodYear,
        periodMonth,
        closureSnapshot,
        ssContribution: ssData,
        userId: user?.id || '',
        reconciliation: null,
      });

      const existingMeta = (expedient as any)?.metadata || {};
      const newMeta = {
        ...existingMeta,
        period_id: periodId,
        expedient_status: 'consolidated',
        expedient_snapshot: snapshot,
        consolidated_at: new Date().toISOString(),
        consolidated_by: user?.id,
      };

      const { error } = await supabase
        .from('erp_hr_ss_contributions')
        .update({ metadata: newMeta as any, updated_at: new Date().toISOString() })
        .eq('id', ssContributionId);

      if (error) throw error;

      // Update local state
      setExpedients(prev => prev.map(e =>
        e.id === ssContributionId
          ? { ...e, period_id: periodId, expedient_status: 'consolidated' as SSExpedientStatus, snapshot }
          : e
      ));

      toast.success('Expediente SS consolidado con período cerrado');
      return true;
    } catch (err: any) {
      console.error('[useSSMonthlyExpedient] consolidateExpedient:', err);
      toast.error(`Error al consolidar: ${err.message}`);
      return false;
    }
  }, [expedients]);

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
        payroll: payrollTotals,
        ss: ssData,
        periodStatus,
        hasApprovedRun: !!closureSnapshot?.approved_run_id,
      });

      // Persist reconciliation
      const { data: { user } } = await supabase.auth.getUser();
      const currentStatus = expedient.expedient_status;
      const newStatus: SSExpedientStatus =
        canTransitionExpedient(currentStatus, 'reconciled') ? 'reconciled' : currentStatus;

      const existingRow = await supabase
        .from('erp_hr_ss_contributions')
        .select('metadata')
        .eq('id', ssContributionId)
        .single();

      const existingMeta = (existingRow.data?.metadata || {}) as any;
      const newMeta = {
        ...existingMeta,
        expedient_status: newStatus,
        reconciliation: result,
        reconciled_at: new Date().toISOString(),
        reconciled_by: user?.id,
      };

      // Update snapshot with reconciliation
      if (newMeta.expedient_snapshot) {
        newMeta.expedient_snapshot.reconciliation = result;
      }

      const { error } = await supabase
        .from('erp_hr_ss_contributions')
        .update({ metadata: newMeta as any, updated_at: new Date().toISOString() })
        .eq('id', ssContributionId);

      if (error) throw error;

      setExpedients(prev => prev.map(e =>
        e.id === ssContributionId
          ? { ...e, expedient_status: newStatus, reconciliation: result }
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
  }, [expedients]);

  // ── Update expedient status ──
  const updateExpedientStatus = useCallback(async (
    ssContributionId: string,
    newStatus: SSExpedientStatus,
    notes?: string,
  ): Promise<boolean> => {
    try {
      const expedient = expedients.find(e => e.id === ssContributionId);
      const currentStatus = expedient?.expedient_status || 'draft';

      if (!canTransitionExpedient(currentStatus, newStatus)) {
        toast.error(`Transición no permitida: ${currentStatus} → ${newStatus}`);
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const existingRow = await supabase
        .from('erp_hr_ss_contributions')
        .select('metadata')
        .eq('id', ssContributionId)
        .single();

      const existingMeta = (existingRow.data?.metadata || {}) as any;
      const newMeta = {
        ...existingMeta,
        expedient_status: newStatus,
        [`${newStatus}_at`]: new Date().toISOString(),
        [`${newStatus}_by`]: user?.id,
        ...(notes ? { status_notes: notes } : {}),
      };

      const { error } = await supabase
        .from('erp_hr_ss_contributions')
        .update({ metadata: newMeta as any, updated_at: new Date().toISOString() })
        .eq('id', ssContributionId);

      if (error) throw error;

      setExpedients(prev => prev.map(e =>
        e.id === ssContributionId ? { ...e, expedient_status: newStatus } : e
      ));

      toast.success(`Expediente actualizado a "${newStatus}"`);
      return true;
    } catch (err: any) {
      console.error('[useSSMonthlyExpedient] updateStatus:', err);
      toast.error(`Error: ${err.message}`);
      return false;
    }
  }, [expedients]);

  // ── Create SS contribution for a period (if none exists) ──
  const createExpedientForPeriod = useCallback(async (
    periodYear: number,
    periodMonth: number,
    periodId: string,
  ): Promise<string | null> => {
    try {
      // Check if already exists
      const existing = expedients.find(
        e => e.period_year === periodYear && e.period_month === periodMonth
      );
      if (existing) {
        toast.info('Ya existe un registro SS para este período');
        return existing.id;
      }

      const { data: { user } } = await supabase.auth.getUser();
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
            created_by: user?.id,
          } as any,
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchExpedients(periodYear);
      toast.success('Registro SS creado para el período');
      return data?.id || null;
    } catch (err: any) {
      console.error('[useSSMonthlyExpedient] createExpedient:', err);
      toast.error(`Error: ${err.message}`);
      return null;
    }
  }, [companyId, expedients, fetchExpedients]);

  return {
    expedients,
    isLoading,
    fetchExpedients,
    consolidateExpedient,
    reconcileExpedient,
    updateExpedientStatus,
    createExpedientForPeriod,
  };
}
