/**
 * usePayrollRuns — V2-ES.7 Paso 2
 * CRUD + orquestación de payroll runs con snapshots y trazabilidad
 * Se apoya en useESPayrollBridge para el cálculo real
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  type PayrollRun,
  type PayrollRunStatus,
  type PayrollRunType,
  type PayrollRunSnapshot,
  type PayrollRunWarning,
  type PayrollRunError,
  type PayrollRunDiffSummary,
  buildSnapshot,
  computeSnapshotHash,
  validatePreRun,
  classifyRunResult,
  computeRunDiff,
  getNextRunNumber,
  determineRunType,
  canTransition,
  isPeriodWritable,
  type SnapshotInput,
} from '@/engines/erp/hr/payrollRunEngine';
import { useHRLedgerWriter } from './useHRLedgerWriter';

export function usePayrollRuns(companyId?: string) {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRun, setActiveRun] = useState<PayrollRun | null>(null);
  const { writeLedger, writeVersion } = useHRLedgerWriter(companyId || '', 'payroll_runs');

  // ── Fetch runs for a period ──
  const fetchRuns = useCallback(async (periodId: string) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_payroll_runs')
        .select('*')
        .eq('company_id', companyId)
        .eq('period_id', periodId)
        .order('run_number', { ascending: false });
      if (error) throw error;
      setRuns((data || []) as unknown as PayrollRun[]);
    } catch (e: any) {
      console.error('[usePayrollRuns] fetchRuns:', e);
      toast.error('Error cargando ejecuciones de nómina');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // ── Create a new run ──
  const createRun = useCallback(async (
    snapshotInput: SnapshotInput,
    options?: { notes?: string; runType?: PayrollRunType }
  ): Promise<PayrollRun | null> => {
    if (!companyId) return null;
    try {
      // Guard: reject if period is closed or locked
      const periodStatus = snapshotInput.period.status;
      if (!isPeriodWritable(periodStatus)) {
        toast.error(`Período ${periodStatus === 'locked' ? 'bloqueado' : 'cerrado'} — no se pueden crear nuevos runs`);
        return null;
      }

      const snapshot = buildSnapshot(snapshotInput);
      const snapshotHash = computeSnapshotHash(snapshot);
      const validation = validatePreRun(snapshot);

      // Block if critical errors
      if (validation.failed > 0) {
        const failedChecks = validation.checks.filter(c => !c.passed && c.severity === 'error');
        toast.error(`No se puede iniciar el run: ${failedChecks.map(c => c.label).join(', ')}`);
        return null;
      }

      const runNumber = getNextRunNumber(runs);
      const runType = determineRunType(runs, options?.runType);

      // Find latest completed run for reference
      const latestCompleted = runs.find(r =>
        r.status === 'calculated' || r.status === 'reviewed' || r.status === 'approved'
      );

      const { data: { user } } = await supabase.auth.getUser();

      const insertPayload: Record<string, unknown> = {
        company_id: companyId,
        period_id: snapshotInput.period.id,
        period_year: snapshotInput.period.fiscal_year,
        period_month: snapshotInput.period.period_number,
        run_number: runNumber,
        run_type: runType,
        version: runNumber, // version tracks the iteration
        status: 'draft',
        context_snapshot: snapshot,
        snapshot_hash: snapshotHash,
        validation_summary: validation,
        previous_run_id: latestCompleted?.id || null,
        recalculation_reference: runType === 'recalculation' ? (latestCompleted?.id || null) : null,
        started_by: user?.id || null,
        notes: options?.notes || null,
        total_employees: snapshot.employees.total_in_scope,
        warnings_count: validation.warnings,
        errors_count: 0,
      };

      const { data, error } = await supabase
        .from('erp_hr_payroll_runs')
        .insert(insertPayload as any)
        .select()
        .single();

      if (error) throw error;

      const newRun = data as unknown as PayrollRun;
      setRuns(prev => [newRun, ...prev]);
      setActiveRun(newRun);
      toast.success(`Run #${runNumber} creado (${runType})`);
      return newRun;
    } catch (e: any) {
      console.error('[usePayrollRuns] createRun:', e);
      toast.error(`Error creando run: ${e.message}`);
      return null;
    }
  }, [companyId, runs]);

  // ── Update run status ──
  const updateRunStatus = useCallback(async (
    runId: string,
    newStatus: PayrollRunStatus,
    extras?: {
      warnings?: PayrollRunWarning[];
      errors?: PayrollRunError[];
      totals?: { gross: number; net: number; deductions: number; employer_cost: number };
      calculated?: number;
      skipped?: number;
      errored?: number;
      diff?: PayrollRunDiffSummary;
    }
  ) => {
    try {
      const run = runs.find(r => r.id === runId);
      if (run && !canTransition(run.status, newStatus)) {
        toast.error(`Transición no permitida: ${run.status} → ${newStatus}`);
        return false;
      }

      // Guard: reject mutations on locked period runs
      if (run) {
        const { data: periodData } = await supabase
          .from('hr_payroll_periods')
          .select('status')
          .eq('id', run.period_id)
          .single();
        if (periodData?.status === 'locked') {
          toast.error('Período bloqueado — no se puede modificar el estado del run');
          return false;
        }
      }

      const updates: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'running') {
        updates.started_at = new Date().toISOString();
      }

      if (['calculated', 'failed'].includes(newStatus)) {
        updates.completed_at = new Date().toISOString();
      }

      if (newStatus === 'approved') {
        updates.locked_at = new Date().toISOString();
      }

      if (extras?.warnings) {
        updates.warnings = extras.warnings;
        updates.warnings_count = extras.warnings.length;
      }
      if (extras?.errors) {
        updates.errors = extras.errors;
        updates.errors_count = extras.errors.length;
      }
      if (extras?.totals) {
        updates.total_gross = extras.totals.gross;
        updates.total_net = extras.totals.net;
        updates.total_deductions = extras.totals.deductions;
        updates.total_employer_cost = extras.totals.employer_cost;
      }
      if (extras?.calculated !== undefined) updates.employees_calculated = extras.calculated;
      if (extras?.skipped !== undefined) updates.employees_skipped = extras.skipped;
      if (extras?.errored !== undefined) updates.employees_errored = extras.errored;
      if (extras?.diff) updates.diff_summary = extras.diff;

      const { error } = await supabase
        .from('erp_hr_payroll_runs')
        .update(updates as any)
        .eq('id', runId);

      if (error) throw error;

      setRuns(prev => prev.map(r => r.id === runId ? { ...r, ...updates } as PayrollRun : r));
      if (activeRun?.id === runId) {
        setActiveRun(prev => prev ? { ...prev, ...updates } as PayrollRun : null);
      }

      return true;
    } catch (e: any) {
      console.error('[usePayrollRuns] updateRunStatus:', e);
      toast.error(`Error actualizando run: ${e.message}`);
      return false;
    }
  }, [runs, activeRun]);

  // ── Supersede previous runs ──
  const supersedePreviousRuns = useCallback(async (periodId: string, currentRunId: string) => {
    try {
      const previousCompleted = runs.filter(
        r => r.period_id === periodId &&
        r.id !== currentRunId &&
        (r.status === 'calculated' || r.status === 'reviewed' || r.status === 'approved')
      );

      for (const run of previousCompleted) {
        await supabase
          .from('erp_hr_payroll_runs')
          .update({
            status: 'superseded',
            superseded_by: currentRunId,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', run.id);
      }

      setRuns(prev => prev.map(r =>
        previousCompleted.some(pc => pc.id === r.id)
          ? { ...r, status: 'superseded' as PayrollRunStatus, superseded_by: currentRunId }
          : r
      ));
    } catch (e: any) {
      console.error('[usePayrollRuns] supersedePreviousRuns:', e);
    }
  }, [runs]);

  // ── Execute run (orchestrates bridge calculation + updates) ──
  const executeRun = useCallback(async (
    runId: string,
    calculateFn: (periodId: string) => Promise<{ calculated: number; skipped: number; errors: number } | null>
  ) => {
    const run = runs.find(r => r.id === runId);
    if (!run) return false;

    // 1. Mark as running
    await updateRunStatus(runId, 'running');

    try {
      // 2. Execute calculation via bridge
      const result = await calculateFn(run.period_id);

      if (!result) {
        await updateRunStatus(runId, 'failed', {
          errors: [{ code: 'CALC_FAILED', message: 'El motor de cálculo no devolvió resultados' }],
        });
        return false;
      }

      // 3. Fetch resulting records to compute totals
      const { data: records } = await supabase
        .from('hr_payroll_records')
        .select('gross_salary, net_salary, total_deductions, employer_cost')
        .eq('payroll_period_id', run.period_id)
        .eq('company_id', run.company_id);

      const totals = (records || []).reduce(
        (acc, r: any) => ({
          gross: acc.gross + (r.gross_salary || 0),
          net: acc.net + (r.net_salary || 0),
          deductions: acc.deductions + (r.total_deductions || 0),
          employer_cost: acc.employer_cost + (r.employer_cost || 0),
        }),
        { gross: 0, net: 0, deductions: 0, employer_cost: 0 }
      );

      // 4. Link records to this run
      await supabase
        .from('hr_payroll_records')
        .update({ run_id: runId } as any)
        .eq('payroll_period_id', run.period_id)
        .eq('company_id', run.company_id);

      // 5. Build warnings
      const warnings: PayrollRunWarning[] = [];
      if (result.skipped > 0) {
        warnings.push({
          code: 'EMPLOYEES_SKIPPED',
          message: `${result.skipped} empleados omitidos (ya calculados o sin datos)`,
          severity: 'medium',
        });
      }

      // 6. Compute diff vs previous
      let diff: PayrollRunDiffSummary | undefined;
      if (run.previous_run_id) {
        const prevRun = runs.find(r => r.id === run.previous_run_id);
        if (prevRun) {
          const snapshot = run.context_snapshot as PayrollRunSnapshot;
          const prevSnapshot = prevRun.context_snapshot as PayrollRunSnapshot;
          diff = computeRunDiff(
            { run_number: run.run_number, total_gross: totals.gross, total_net: totals.net, total_employer_cost: totals.employer_cost },
            { run_number: prevRun.run_number, total_gross: prevRun.total_gross, total_net: prevRun.total_net, total_employer_cost: prevRun.total_employer_cost, context_snapshot: prevSnapshot },
            snapshot.employees?.employee_ids || [],
            prevSnapshot.employees?.employee_ids || []
          );
        }
      }

      // 7. Classify and finalize
      const finalStatus = classifyRunResult(result.calculated, result.errors, warnings);
      await updateRunStatus(runId, finalStatus, {
        warnings,
        totals,
        calculated: result.calculated,
        skipped: result.skipped,
        errored: result.errors,
        diff,
      });

      // 8. Supersede previous completed runs
      if (finalStatus === 'calculated') {
        await supersedePreviousRuns(run.period_id, runId);
      }

      toast.success(`Run #${run.run_number} completado: ${result.calculated} nóminas calculadas`);
      return true;
    } catch (e: any) {
      console.error('[usePayrollRuns] executeRun:', e);
      await updateRunStatus(runId, 'failed', {
        errors: [{ code: 'UNEXPECTED', message: e.message || 'Error inesperado' }],
      });
      return false;
    }
  }, [runs, updateRunStatus, supersedePreviousRuns]);

  // ── Review / Approve helpers ──
  const reviewRun = useCallback(async (runId: string) => {
    return updateRunStatus(runId, 'reviewed');
  }, [updateRunStatus]);

  const approveRun = useCallback(async (runId: string) => {
    return updateRunStatus(runId, 'approved');
  }, [updateRunStatus]);

  // ── Link a recalculation to a run ──
  const linkRecalculationToRun = useCallback(async (
    recalculationId: string,
    runId: string,
    sourceRunId?: string
  ) => {
    try {
      const updates: Record<string, unknown> = { run_id: runId };
      if (sourceRunId) updates.source_run_id = sourceRunId;

      const { error } = await supabase
        .from('erp_hr_payroll_recalculations')
        .update(updates as any)
        .eq('id', recalculationId);

      if (error) throw error;
      return true;
    } catch (e: any) {
      console.error('[usePayrollRuns] linkRecalculationToRun:', e);
      return false;
    }
  }, []);

  // ── Fetch recalculations linked to a run ──
  const fetchLinkedRecalculations = useCallback(async (runId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_payroll_recalculations')
        .select('id, employee_id, status, total_difference, differences, created_at, run_id, source_run_id')
        .eq('run_id', runId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        employee_id: string;
        status: string;
        total_difference: number | null;
        differences: Record<string, unknown> | null;
        created_at: string;
        run_id: string | null;
        source_run_id: string | null;
      }>;
    } catch (e: any) {
      console.error('[usePayrollRuns] fetchLinkedRecalculations:', e);
      return [];
    }
  }, []);

  // ── Create a recalculation run from an existing run ──
  const createRecalculationRun = useCallback(async (
    sourceRunId: string,
    snapshotInput: SnapshotInput,
    notes?: string
  ) => {
    const run = await createRun(snapshotInput, {
      notes: notes || `Recálculo basado en Run anterior`,
      runType: 'recalculation',
    });

    if (run) {
      // Update the recalculation_reference to point to the source
      await supabase
        .from('erp_hr_payroll_runs')
        .update({ recalculation_reference: sourceRunId } as any)
        .eq('id', run.id);
    }

    return run;
  }, [createRun]);

  return {
    runs,
    activeRun,
    isLoading,
    setActiveRun,
    fetchRuns,
    createRun,
    updateRunStatus,
    executeRun,
    reviewRun,
    approveRun,
    linkRecalculationToRun,
    fetchLinkedRecalculations,
    createRecalculationRun,
  };
}

export default usePayrollRuns;
