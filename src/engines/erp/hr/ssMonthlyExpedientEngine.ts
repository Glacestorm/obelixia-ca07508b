/**
 * ssMonthlyExpedientEngine.ts — V2-ES.7 Paso 4
 * Pure logic engine for SS Monthly Expedient:
 * - States, transitions, reconciliation checks
 * - Consolidation from closed period + approved run
 * - No side-effects, no fetch — deterministic functions only
 */

import type { PeriodClosureSnapshot } from './payrollRunEngine';

// ── Types ──

export type SSExpedientStatus = 'draft' | 'consolidated' | 'reconciled' | 'reviewed' | 'ready' | 'submitted' | 'error';

export interface SSExpedientSnapshot {
  version: '1.0';
  generated_at: string;
  generated_by: string;
  period_id: string;
  period_year: number;
  period_month: number;
  closure_snapshot_ref: string; // approved_run_id from closure
  payroll_totals: {
    gross: number;
    net: number;
    employer_cost: number;
    employee_count: number;
  };
  ss_totals: {
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
  };
  reconciliation: SSReconciliationResult | null;
}

export interface SSReconciliationCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  detail?: string;
  payroll_value?: number;
  ss_value?: number;
  diff?: number;
}

export interface SSReconciliationResult {
  computed_at: string;
  status: 'balanced' | 'discrepancies' | 'incomplete';
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: SSReconciliationCheck[];
  score: number; // 0-100
}

// ── State Machine ──

const SS_EXPEDIENT_TRANSITIONS: Record<SSExpedientStatus, SSExpedientStatus[]> = {
  draft:        ['consolidated'],
  consolidated: ['reconciled', 'error'],
  reconciled:   ['reviewed', 'consolidated'], // allow re-consolidation
  reviewed:     ['ready', 'reconciled'],       // allow re-reconciliation
  ready:        ['submitted', 'reviewed'],     // allow rollback to reviewed
  submitted:    [],                             // terminal (for future integration)
  error:        ['draft', 'consolidated'],      // allow retry
};

export function canTransitionExpedient(from: SSExpedientStatus, to: SSExpedientStatus): boolean {
  return SS_EXPEDIENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export const SS_EXPEDIENT_STATUS_CONFIG: Record<SSExpedientStatus, { label: string; color: string }> = {
  draft:        { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  consolidated: { label: 'Consolidado', color: 'bg-blue-500/10 text-blue-700' },
  reconciled:   { label: 'Conciliado', color: 'bg-emerald-500/10 text-emerald-700' },
  reviewed:     { label: 'Revisado', color: 'bg-indigo-500/10 text-indigo-700' },
  ready:        { label: 'Listo', color: 'bg-green-500/10 text-green-700' },
  submitted:    { label: 'Presentado', color: 'bg-green-600/10 text-green-800' },
  error:        { label: 'Error', color: 'bg-destructive/10 text-destructive' },
};

// ── Reconciliation Engine (pure) ──

export interface SSReconciliationInput {
  /** Totals from the closed period (closure snapshot) */
  payroll: {
    gross: number;
    net: number;
    employer_cost: number;
    employee_count: number;
  };
  /** Totals from SS contributions record */
  ss: {
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
  } | null;
  /** Whether period is actually closed/locked */
  periodStatus: string;
  /** Whether an approved run exists */
  hasApprovedRun: boolean;
}

export function reconcilePayrollVsSS(input: SSReconciliationInput): SSReconciliationResult {
  const checks: SSReconciliationCheck[] = [];
  const { payroll, ss, periodStatus, hasApprovedRun } = input;

  // 1. Period must be closed or locked
  checks.push({
    id: 'period_closed',
    label: 'Período cerrado o bloqueado',
    passed: ['closed', 'locked'].includes(periodStatus),
    severity: 'error',
    detail: `Estado actual: ${periodStatus}`,
  });

  // 2. Approved run exists
  checks.push({
    id: 'approved_run',
    label: 'Run aprobado de referencia',
    passed: hasApprovedRun,
    severity: 'error',
    detail: hasApprovedRun ? 'Run aprobado disponible' : 'Sin run aprobado',
  });

  // 3. SS data exists
  const hasSS = ss !== null && ss.total_amount > 0;
  checks.push({
    id: 'ss_data_exists',
    label: 'Datos de cotización SS disponibles',
    passed: hasSS,
    severity: 'warning',
    detail: hasSS ? `${ss!.total_workers} trabajadores, ${ss!.total_amount.toFixed(2)}€ total` : 'Sin datos de cotización',
  });

  if (hasSS && ss) {
    // 4. Employee count match
    checks.push({
      id: 'employee_count',
      label: 'Nº trabajadores nómina vs SS',
      passed: payroll.employee_count === ss.total_workers,
      severity: 'warning',
      payroll_value: payroll.employee_count,
      ss_value: ss.total_workers,
      diff: payroll.employee_count - ss.total_workers,
      detail: payroll.employee_count === ss.total_workers
        ? `${payroll.employee_count} trabajadores`
        : `Nómina: ${payroll.employee_count}, SS: ${ss.total_workers}`,
    });

    // 5. Employer cost vs SS total company (approximate — SS company cost should be a portion of employer_cost)
    const ssTotalCompany = ss.total_company;
    const tolerance = payroll.employer_cost * 0.05; // 5% tolerance
    const diffCompany = Math.abs(payroll.employer_cost - payroll.gross - ssTotalCompany);
    checks.push({
      id: 'employer_cost_coherence',
      label: 'Coherencia coste empresa vs cuota patronal SS',
      passed: ssTotalCompany > 0 && ssTotalCompany <= payroll.employer_cost,
      severity: 'warning',
      payroll_value: payroll.employer_cost,
      ss_value: ssTotalCompany,
      detail: ssTotalCompany > 0
        ? `Coste empresa: ${payroll.employer_cost.toFixed(2)}€, Cuota patronal: ${ssTotalCompany.toFixed(2)}€`
        : 'Sin datos',
    });

    // 6. SS worker deductions coherence (cc_worker should be part of gross-net difference)
    const totalDeductions = payroll.gross - payroll.net;
    const ssWorkerTotal = ss.total_worker;
    checks.push({
      id: 'worker_deductions_coherence',
      label: 'Coherencia deducciones trabajador vs cuota obrera SS',
      passed: ssWorkerTotal <= totalDeductions && ssWorkerTotal > 0,
      severity: 'warning',
      payroll_value: totalDeductions,
      ss_value: ssWorkerTotal,
      detail: `Deducciones totales: ${totalDeductions.toFixed(2)}€, Cuota obrera SS: ${ssWorkerTotal.toFixed(2)}€`,
    });

    // 7. Base CC > 0
    checks.push({
      id: 'base_cc_positive',
      label: 'Base de cotización CC positiva',
      passed: ss.total_base_cc > 0,
      severity: 'warning',
      ss_value: ss.total_base_cc,
      detail: ss.total_base_cc > 0 ? `${ss.total_base_cc.toFixed(2)}€` : 'Base CC = 0',
    });

    // 8. Internal SS coherence: total = company + worker
    const ssTotalCalc = ss.total_company + ss.total_worker;
    const ssDiff = Math.abs(ssTotalCalc - ss.total_amount);
    checks.push({
      id: 'ss_internal_coherence',
      label: 'Coherencia interna SS (empresa + obrera = total)',
      passed: ssDiff < 0.02,
      severity: 'error',
      ss_value: ss.total_amount,
      diff: ssDiff,
      detail: ssDiff < 0.02
        ? `Total: ${ss.total_amount.toFixed(2)}€ ✓`
        : `Descuadre: ${ssDiff.toFixed(2)}€`,
    });
  }

  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed && c.severity === 'error').length;
  const warnings = checks.filter(c => !c.passed && c.severity === 'warning').length;
  const score = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0;

  const status: SSReconciliationResult['status'] =
    failed > 0 ? 'discrepancies'
      : !hasSS ? 'incomplete'
        : 'balanced';

  return {
    computed_at: new Date().toISOString(),
    status,
    total_checks: checks.length,
    passed,
    failed,
    warnings,
    checks,
    score,
  };
}

// ── Consolidation Builder ──

export interface SSConsolidationInput {
  periodId: string;
  periodYear: number;
  periodMonth: number;
  closureSnapshot: PeriodClosureSnapshot | null;
  ssContribution: {
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
  } | null;
  userId: string;
  reconciliation: SSReconciliationResult | null;
}

export function buildExpedientSnapshot(input: SSConsolidationInput): SSExpedientSnapshot {
  const { closureSnapshot, ssContribution, reconciliation } = input;

  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    generated_by: input.userId,
    period_id: input.periodId,
    period_year: input.periodYear,
    period_month: input.periodMonth,
    closure_snapshot_ref: closureSnapshot?.approved_run_id || '',
    payroll_totals: {
      gross: closureSnapshot?.totals.gross || 0,
      net: closureSnapshot?.totals.net || 0,
      employer_cost: closureSnapshot?.totals.employer_cost || 0,
      employee_count: closureSnapshot?.employee_count || 0,
    },
    ss_totals: ssContribution || {
      total_base_cc: 0, total_base_at: 0,
      cc_company: 0, cc_worker: 0,
      unemployment_company: 0, unemployment_worker: 0,
      fogasa: 0, fp_company: 0, fp_worker: 0,
      at_ep_company: 0,
      total_company: 0, total_worker: 0,
      total_amount: 0, total_workers: 0,
    },
    reconciliation,
  };
}

// ── Formatters ──

export function formatExpedientLabel(year: number, month: number): string {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

export function getExpedientReadiness(status: SSExpedientStatus): { level: 'none' | 'partial' | 'complete'; percent: number } {
  const progressMap: Record<SSExpedientStatus, number> = {
    draft: 0,
    consolidated: 25,
    reconciled: 50,
    reviewed: 75,
    ready: 100,
    submitted: 100,
    error: 0,
  };
  const percent = progressMap[status];
  return {
    level: percent === 0 ? 'none' : percent === 100 ? 'complete' : 'partial',
    percent,
  };
}
