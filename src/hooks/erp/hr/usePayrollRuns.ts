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
  validatePreRun,
  classifyRunResult,
  computeRunDiff,
  getNextRunNumber,
  determineRunType,
  canTransition,
  type SnapshotInput,
} from '@/engines/erp/hr/payrollRunEngine';

export function usePayrollRuns(companyId?: string) {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRun, setActiveRun] = useState<PayrollRun | null>(null);

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
    notes?: string
  ): Promise<PayrollRun | null> => {
    if (!companyId) return null;
    try {
      const snapshot = buildSnapshot(snapshotInput);
      const validation = validatePreRun(snapshot);

      // Block if critical errors
      if (validation.failed > 0) {
        const failedChecks = validation.checks.filter(c => !c.passed && c.severity === 'error');
        toast.error(`No se puede iniciar el run: ${failedChecks.map(c => c.label).join(', ')}`);
        return null;
      }

      const runNumber = getNextRunNumber(runs);
      const runType = determineRunType(runs);

      // Mark previous completed runs as superseded
      const latestCompleted = runs.find(r => r.status === 'completed' || r.status === 'completed_with_warnings');
      
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('erp_hr_payroll_runs')
        .insert({
          company_id: companyId,
          period_id: snapshotInput.period.id,
          run_number: runNumber,
          run_type: runType,
          status: 'pending' as string,
          context_snapshot: snapshot as any,
          validation_summary: validation as any,
          previous_run_id: latestCompleted?.id || null,
          started_by: user?.id || null,
          notes: notes || null,
          total_employees: snapshot.employees.total_in_scope,
        } as any)
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

      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'running') {
        updates.started_at = new Date().toISOString();
      }

      if (['completed', 'completed_with_warnings', 'failed'].includes(newStatus)) {
        updates.completed_at = new Date().toISOString();
      }

      if (extras?.warnings) updates.warnings = extras.warnings;
      if (extras?.errors) updates.errors = extras.errors;
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
        .update(updates)
        .eq('id', runId);

      if (error) throw error;

      setRuns(prev => prev.map(r => r.id === runId ? { ...r, ...updates } : r));
      if (activeRun?.id === runId) {
        setActiveRun(prev => prev ? { ...prev, ...updates } : null);
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
        (r.status === 'completed' || r.status === 'completed_with_warnings')
      );

      for (const run of previousCompleted) {
        await supabase
          .from('erp_hr_payroll_runs')
          .update({ status: 'superseded', updated_at: new Date().toISOString() } as any)
          .eq('id', run.id);
      }

      setRuns(prev => prev.map(r => 
        previousCompleted.some(pc => pc.id === r.id) 
          ? { ...r, status: 'superseded' as PayrollRunStatus } 
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
      if (finalStatus === 'completed' || finalStatus === 'completed_with_warnings') {
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

  return {
    runs,
    activeRun,
    isLoading,
    setActiveRun,
    fetchRuns,
    createRun,
    updateRunStatus,
    executeRun,
  };
}

export default usePayrollRuns;
