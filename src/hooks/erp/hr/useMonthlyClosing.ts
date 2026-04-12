/**
 * useMonthlyClosing — V2-RRHH-FASE-3
 * Orchestration hook for monthly closing flow.
 * Connects: usePayrollEngine, useSSMonthlyExpedient, useFiscalMonthlyExpedient,
 *           closingIntelligenceEngine, ledger, evidence, version registry.
 *
 * This hook does NOT duplicate payroll engine logic — it coordinates existing
 * hooks and adds the closing-specific orchestration layer.
 */

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  derivePhaseFromPeriodStatus,
  buildClosingChecklist,
  buildClosingOutputs,
  buildPhaseTimelineEvent,
  type MonthlyClosingPhase,
  type ClosingChecklist,
  type ClosingOutput,
  type ClosingTimelineEvent,
} from '@/engines/erp/hr/monthlyClosingOrchestrationEngine';
import {
  buildClosingIntelligenceReport,
  type ClosingIntelligenceReport,
} from '@/engines/erp/hr/closingIntelligenceEngine';
import {
  computeMonthlyKPIs,
  computeExpedientReadiness,
  type ExpedientReadinessSummary,
  type MonthlyKPIs,
  type MonthlyKPIDeltas,
} from '@/engines/erp/hr/monthlyExecutiveReportEngine';
import {
  validatePreClose as validatePreCloseEngine,
  type PreCloseInput,
  type PayrollRunValidationSummary,
  type PeriodClosureSnapshot,
} from '@/engines/erp/hr/payrollRunEngine';
import { useHRLedgerWriter } from './useHRLedgerWriter';
import type { PayrollPeriod } from './usePayrollEngine';

// ── Types ──

export interface MonthlyClosingData {
  phase: MonthlyClosingPhase;
  checklist: ClosingChecklist | null;
  outputs: ClosingOutput[];
  intelligenceReport: ClosingIntelligenceReport | null;
  expedientReadiness: ExpedientReadinessSummary | null;
  kpis: MonthlyKPIs | null;
  timeline: ClosingTimelineEvent[];
  preCloseValidation: PayrollRunValidationSummary | null;
  closureSnapshot: PeriodClosureSnapshot | null;
  versionId: string | null;
}

const INITIAL_DATA: MonthlyClosingData = {
  phase: 'not_started',
  checklist: null,
  outputs: [],
  intelligenceReport: null,
  expedientReadiness: null,
  kpis: null,
  timeline: [],
  preCloseValidation: null,
  closureSnapshot: null,
  versionId: null,
};

export function useMonthlyClosing(companyId: string) {
  const [data, setData] = useState<MonthlyClosingData>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const { writeLedger, writeLedgerWithEvidence, writeVersion } = useHRLedgerWriter(companyId, 'monthly-closing');

  // ── Load closing context for a period ──

  const loadClosingContext = useCallback(async (period: PayrollPeriod) => {
    setIsLoading(true);
    try {
      // Fetch runs, records, incidents in parallel
      const [runsRes, recsRes, incRes] = await Promise.all([
        supabase.from('erp_hr_payroll_runs')
          .select('id, run_number, status, run_type, total_gross, total_net, total_employer_cost, total_employees, employees_errored, warnings_count, snapshot_hash, completed_at')
          .eq('period_id', period.id).eq('company_id', companyId),
        supabase.from('hr_payroll_records')
          .select('id, status, gross_salary, net_salary, employer_cost')
          .eq('payroll_period_id', period.id),
        supabase.from('erp_hr_payroll_incidents')
          .select('id, status')
          .eq('company_id', companyId).eq('period_id', period.id),
      ]);

      const runs = (runsRes.data || []) as any[];
      const records = (recsRes.data || []) as any[];
      const incidents = (incRes.data || []) as any[];

      // Pre-close validation
      const preCloseInput: PreCloseInput = {
        period: { id: period.id, status: period.status, payment_date: period.payment_date },
        runs,
        records,
        incidents,
      };
      const preCloseValidation = validatePreCloseEngine(preCloseInput);

      // Fetch expedient readiness (SS + Fiscal metadata)
      // NOTE: erp_hr_fiscal_withholdings does NOT exist in DB — query always returns null.
      // Cast retained because table is planned but not yet created. Fails silently.
      const [ssRes, fiscalRes] = await Promise.all([
        supabase.from('erp_hr_ss_contributions')
          .select('metadata')
          .eq('company_id', companyId)
          .eq('period_year', period.fiscal_year)
          .eq('period_month', period.period_number)
          .maybeSingle(),
        (supabase.from('erp_hr_fiscal_withholdings' as any) as any)
          .select('metadata')
          .eq('company_id', companyId)
          .eq('period_year', period.fiscal_year)
          .eq('period_month', period.period_number)
          .maybeSingle(),
      ]);

      const ssMeta = ssRes.data?.metadata as Record<string, unknown> | null;
      const ssStatus = (ssMeta?.expedient_status as string) || null;
      const ssScore = ssStatus ? 50 : null; // Simplified score
      const fiscalMeta = (fiscalRes.data?.metadata as Record<string, unknown> | null);
      const fiscalStatus = (fiscalMeta?.expedient_status as string) || null;
      const fiscalScore = fiscalStatus ? 50 : null;

      const expedientReadiness = computeExpedientReadiness(
        ssStatus ? { status: ssStatus, score: ssScore! } : null,
        fiscalStatus ? { status: fiscalStatus, score: fiscalScore! } : null,
      );

      // Closure snapshot from metadata
      const periodMeta = (period.metadata ?? {}) as Record<string, unknown>;
      const closureSnapshot = (periodMeta.closure_snapshot as PeriodClosureSnapshot | null) ?? null;

      // Derive phase
      const phase = derivePhaseFromPeriodStatus(
        period.status,
        !!closureSnapshot,
        expedientReadiness,
      );

      // Pending incidents
      const pendingIncidents = incidents.filter(i => i.status === 'pending');

      // Build checklist
      const approvedRun = runs.find(r => r.status === 'approved');
      const checklist = buildClosingChecklist({
        preCloseValidation,
        expedientReadiness,
        periodStatus: period.status,
        paymentDate: period.payment_date || null,
        employeeCount: approvedRun?.total_employees || period.employee_count || 0,
        totalGross: approvedRun?.total_gross || period.total_gross || 0,
        hasPendingIncidents: pendingIncidents.length > 0,
        pendingIncidentCount: pendingIncidents.length,
      });

      // Build KPIs
      const kpis = computeMonthlyKPIs(
        approvedRun?.total_employees || period.employee_count || 0,
        approvedRun?.total_gross || period.total_gross || 0,
        approvedRun?.total_net || period.total_net || 0,
        approvedRun?.total_employer_cost || period.total_employer_cost || 0,
      );

      // Build intelligence report
      let intelligenceReport: ClosingIntelligenceReport | null = null;
      if (['closed', 'locked', 'reviewing', 'calculated'].includes(period.status)) {
        intelligenceReport = buildClosingIntelligenceReport({
          periodId: period.id,
          periodName: period.period_name,
          periodStatus: period.status,
          metadata: period.metadata || {},
          snapshot: closureSnapshot,
          kpis,
          deltas: null, // Would need previous period data
          expedientReadiness,
          paymentDate: period.payment_date || null,
        });
      }

      // Build outputs
      const outputs = buildClosingOutputs({
        hasClosureSnapshot: !!closureSnapshot,
        ssExpedientStatus: ssStatus,
        fiscalExpedientStatus: fiscalStatus,
        hasIntelligenceReport: !!intelligenceReport,
      });

      // Build initial timeline
      const timeline: ClosingTimelineEvent[] = [];
      if (period.opened_at) {
        timeline.push(buildPhaseTimelineEvent('not_started', 'Período abierto', `Período ${period.period_name} abierto`));
      }
      if (period.closed_at) {
        timeline.push(buildPhaseTimelineEvent('closed', 'Período cerrado', `Cierre ejecutado`, period.closed_by || undefined));
      }
      if (period.locked_at) {
        timeline.push(buildPhaseTimelineEvent('completed', 'Período bloqueado', 'Período bloqueado definitivamente'));
      }
      const reopenHistory = (periodMeta.reopen_history as Array<{ reason?: string; reopened_by?: string }>) || [];
      for (const reopen of reopenHistory) {
        timeline.push(buildPhaseTimelineEvent('reopened', 'Período reabierto', reopen.reason || 'Reapertura controlada', reopen.reopened_by));
      }

      setData({
        phase,
        checklist,
        outputs,
        intelligenceReport,
        expedientReadiness,
        kpis,
        timeline: timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        preCloseValidation,
        closureSnapshot,
        versionId: null,
      });

      // NOTE: No ledger write on view load — avoids noise (V2-RRHH-FASE-3B)

    } catch (err) {
      console.error('[useMonthlyClosing] loadClosingContext error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, writeLedger]);

  // ── Execute close with full ledger + evidence + version ──

  const executeClosingWithAudit = useCallback(async (
    period: PayrollPeriod,
    closePeriodFn: (periodId: string) => Promise<{ success: boolean; snapshot?: PeriodClosureSnapshot }>,
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      // 1. Validate checklist
      if (data.checklist && !data.checklist.canProceed) {
        console.error('[useMonthlyClosing] Cannot close: blockers present');
        return false;
      }

      // 2. Execute actual close via payroll engine
      //    NOTE: closePeriodFn already writes `period_closed` to ledger — no duplicate here (V2-RRHH-FASE-3B)
      const result = await closePeriodFn(period.id);
      if (!result.success) {
        setIsLoading(false);
        return false;
      }

      // 3. Write evidence for closure package (separate event, not duplicating period_closed)
      if (result.snapshot) {
        await writeLedgerWithEvidence(
          {
            eventType: 'expedient_action',
            entityType: 'closing_package',
            entityId: period.id,
            afterSnapshot: {
              snapshot_hash: result.snapshot.version,
              employee_count: result.snapshot.employee_count,
              totals: result.snapshot.totals,
            },
            metadata: { action: 'closure_package_created' },
          },
          [{
            evidenceType: 'closure_package',
            evidenceLabel: `Paquete de cierre ${period.period_name}`,
            refEntityType: 'payroll_period',
            refEntityId: period.id,
            evidenceSnapshot: result.snapshot as unknown as Record<string, unknown>,
          }],
        );
      }

      // 5. Create version registry entry
      const versionId = await writeVersion({
        entityType: 'monthly_closing',
        entityId: period.id,
        state: 'closed',
        contentSnapshot: result.snapshot as unknown as Record<string, unknown>,
        metadata: {
          period_name: period.period_name,
          period_year: period.fiscal_year,
          period_month: period.period_number,
          checklist_score: data.checklist?.overallScore,
        },
      });

      // 6. Add timeline event
      const closedEvent = buildPhaseTimelineEvent('closed', 'Período cerrado', `Cierre ejecutado con score ${data.checklist?.overallScore || 0}%`);

      setData(prev => ({
        ...prev,
        phase: 'closed',
        versionId,
        closureSnapshot: result.snapshot || null,
        timeline: [...prev.timeline, closedEvent],
      }));

      return true;
    } catch (err) {
      console.error('[useMonthlyClosing] executeClosingWithAudit error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [data.checklist, data.phase, writeLedger, writeLedgerWithEvidence, writeVersion]);

  // ── Record reopen in ledger ──

  /**
   * Handle post-reopen cleanup: invalidate previous evidence & supersede version.
   * NOTE: The ledger event `period_reopened` is already written by `reopenPeriod()` in usePayrollEngine.
   *       We do NOT duplicate it here (V2-RRHH-FASE-3B).
   */
  const recordReopenInLedger = useCallback(async (periodId: string, reason: string) => {
    // 1. Supersede the version registry entry if it exists
    if (data.versionId) {
      try {
        const { data: currentVersion } = await supabase
          .from('erp_hr_version_registry')
          .select('state')
          .eq('id', data.versionId)
          .single();

        if (currentVersion?.state === 'closed') {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase
            .from('erp_hr_version_registry')
            .update({
              state: 'reopened' as import('@/integrations/supabase/types').Database['public']['Enums']['hr_version_state'],
              previous_state: 'closed',
              state_changed_by: user?.id ?? null,
              state_change_reason: reason,
            })
            .eq('id', data.versionId);
        }
      } catch (err) {
        console.error('[useMonthlyClosing] version transition on reopen error:', err);
      }
    }

    // 2. Invalidate closure evidence linked to this period
    try {
      const { data: evidenceRows } = await supabase
        .from('erp_hr_evidence')
        .select('id')
        .eq('ref_entity_type', 'payroll_period')
        .eq('ref_entity_id', periodId)
        .eq('evidence_type', 'closure_package')
        .eq('is_valid', true);

      if (evidenceRows && evidenceRows.length > 0) {
        for (const row of evidenceRows) {
          await supabase
            .from('erp_hr_evidence')
            .update({
              is_valid: false,
              invalidated_at: new Date().toISOString(),
              invalidation_reason: `Reapertura: ${reason}`,
            })
            .eq('id', row.id);
        }
      }
    } catch (err) {
      console.error('[useMonthlyClosing] evidence invalidation on reopen error:', err);
    }

    // 3. Write a single evidence record for the reopen action itself
    await writeLedgerWithEvidence(
      {
        eventType: 'expedient_action',
        entityType: 'closing_package',
        entityId: periodId,
        beforeSnapshot: { phase: data.phase, versionId: data.versionId },
        afterSnapshot: { phase: 'reopened', reason },
        isReopening: true,
        metadata: { action: 'closure_invalidated_by_reopen', reason },
      },
      [{
        evidenceType: 'snapshot',
        evidenceLabel: `Reapertura de cierre — ${reason}`,
        refEntityType: 'payroll_period',
        refEntityId: periodId,
        evidenceSnapshot: {
          reopened_from_phase: data.phase,
          previous_version_id: data.versionId,
          reason,
          reopened_at: new Date().toISOString(),
        },
      }],
    );

    const reopenEvent = buildPhaseTimelineEvent('reopened', 'Período reabierto', reason);
    setData(prev => ({
      ...prev,
      phase: 'reopened',
      versionId: null,
      timeline: [...prev.timeline, reopenEvent],
    }));
  }, [data.phase, data.versionId, writeLedgerWithEvidence]);

  // ── Record lock in ledger ──

  /**
   * Post-lock: transition version to 'validated' (final) and update timeline.
   * NOTE: The ledger event `period_locked` is now written by `lockPeriod()` in usePayrollEngine (V2-RRHH-FASE-3B).
   */
  const recordLockInLedger = useCallback(async (periodId: string) => {
    // Transition version to 'validated' (final, immutable) if exists
    if (data.versionId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from('erp_hr_version_registry')
          .update({
            state: 'validated' as import('@/integrations/supabase/types').Database['public']['Enums']['hr_version_state'],
            previous_state: 'closed',
            state_changed_by: user?.id ?? null,
            state_change_reason: 'Período bloqueado definitivamente',
          })
          .eq('id', data.versionId);
      } catch (err) {
        console.error('[useMonthlyClosing] version transition on lock error:', err);
      }
    }

    const lockEvent = buildPhaseTimelineEvent('completed', 'Período bloqueado', 'Cierre definitivo — sin más cambios permitidos');
    setData(prev => ({
      ...prev,
      phase: 'completed',
      timeline: [...prev.timeline, lockEvent],
    }));
  }, [data.phase, data.versionId]);

  // ── Reset ──

  const reset = useCallback(() => {
    setData(INITIAL_DATA);
  }, []);

  return {
    data,
    isLoading,
    loadClosingContext,
    executeClosingWithAudit,
    recordReopenInLedger,
    recordLockInLedger,
    reset,
  };
}
