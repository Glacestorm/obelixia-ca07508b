/**
 * monthlyExecutiveReportEngine.ts — V2-ES.7 Paso 6
 * Pure logic engine for Monthly Executive Reporting:
 * - KPIs from closed periods
 * - Period-over-period comparison
 * - Expedient readiness summary
 * - No side-effects, no fetch — deterministic functions only
 */

import type { PeriodClosureSnapshot } from './payrollRunEngine';

// ── Types ──

export interface MonthlyKPIs {
  employee_count: number;
  total_gross: number;
  total_net: number;
  total_employer_cost: number;
  total_company_cost: number; // gross + employer_cost
  avg_gross_per_employee: number;
  avg_net_per_employee: number;
  avg_employer_cost_per_employee: number;
  deductions_ratio: number; // (gross - net) / gross as %
  employer_cost_ratio: number; // employer_cost / gross as %
}

export interface PeriodComparison {
  current: MonthlyKPIs;
  previous: MonthlyKPIs | null;
  deltas: MonthlyKPIDeltas | null;
}

export interface MonthlyKPIDeltas {
  employee_count: number; // absolute delta
  employee_count_pct: number;
  total_gross_delta: number;
  total_gross_pct: number;
  total_net_delta: number;
  total_net_pct: number;
  total_employer_cost_delta: number;
  total_employer_cost_pct: number;
  total_company_cost_delta: number;
  total_company_cost_pct: number;
  avg_gross_delta: number;
  avg_gross_pct: number;
}

export interface ExpedientReadinessSummary {
  ss_status: string | null;
  ss_score: number | null;
  fiscal_status: string | null;
  fiscal_score: number | null;
  overall_readiness: 'complete' | 'partial' | 'pending' | 'none';
}

export interface MonthlyExecutiveReport {
  version: '1.0';
  generated_at: string;
  period_id: string;
  period_year: number;
  period_month: number;
  kpis: MonthlyKPIs;
  comparison: PeriodComparison;
  expedient_readiness: ExpedientReadinessSummary;
  auto_generation: AutoGenerationResult | null;
}

export interface AutoGenerationResult {
  triggered_at: string;
  triggered_by: string;
  ss_generated: boolean;
  fiscal_generated: boolean;
  ss_error?: string;
  fiscal_error?: string;
}

// ── KPI Computation ──

export function computeMonthlyKPIs(
  employeeCount: number,
  totalGross: number,
  totalNet: number,
  totalEmployerCost: number,
): MonthlyKPIs {
  const safeCount = Math.max(employeeCount, 1);
  const safeGross = Math.max(totalGross, 0.01);

  return {
    employee_count: employeeCount,
    total_gross: totalGross,
    total_net: totalNet,
    total_employer_cost: totalEmployerCost,
    total_company_cost: totalGross + totalEmployerCost,
    avg_gross_per_employee: Math.round((totalGross / safeCount) * 100) / 100,
    avg_net_per_employee: Math.round((totalNet / safeCount) * 100) / 100,
    avg_employer_cost_per_employee: Math.round((totalEmployerCost / safeCount) * 100) / 100,
    deductions_ratio: Math.round(((safeGross - totalNet) / safeGross) * 10000) / 100,
    employer_cost_ratio: Math.round((totalEmployerCost / safeGross) * 10000) / 100,
  };
}

export function computeKPIsFromSnapshot(snapshot: PeriodClosureSnapshot): MonthlyKPIs {
  return computeMonthlyKPIs(
    snapshot.employee_count,
    snapshot.totals.gross,
    snapshot.totals.net,
    snapshot.totals.employer_cost,
  );
}

// ── Period Comparison ──

function safePct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
}

export function computePeriodComparison(
  current: MonthlyKPIs,
  previous: MonthlyKPIs | null,
): PeriodComparison {
  if (!previous) {
    return { current, previous: null, deltas: null };
  }

  const deltas: MonthlyKPIDeltas = {
    employee_count: current.employee_count - previous.employee_count,
    employee_count_pct: safePct(current.employee_count, previous.employee_count),
    total_gross_delta: current.total_gross - previous.total_gross,
    total_gross_pct: safePct(current.total_gross, previous.total_gross),
    total_net_delta: current.total_net - previous.total_net,
    total_net_pct: safePct(current.total_net, previous.total_net),
    total_employer_cost_delta: current.total_employer_cost - previous.total_employer_cost,
    total_employer_cost_pct: safePct(current.total_employer_cost, previous.total_employer_cost),
    total_company_cost_delta: current.total_company_cost - previous.total_company_cost,
    total_company_cost_pct: safePct(current.total_company_cost, previous.total_company_cost),
    avg_gross_delta: current.avg_gross_per_employee - previous.avg_gross_per_employee,
    avg_gross_pct: safePct(current.avg_gross_per_employee, previous.avg_gross_per_employee),
  };

  return { current, previous, deltas };
}

// ── Expedient Readiness ──

export function computeExpedientReadiness(
  ssExpedient: { status: string; score: number } | null,
  fiscalExpedient: { status: string; score: number } | null,
): ExpedientReadinessSummary {
  const ssStatus = ssExpedient?.status ?? null;
  const ssScore = ssExpedient?.score ?? null;
  const fiscalStatus = fiscalExpedient?.status ?? null;
  const fiscalScore = fiscalExpedient?.score ?? null;

  const ssOk = ssStatus && ['reconciled', 'reviewed', 'ready_internal', 'finalized_internal'].includes(ssStatus);
  const fiscalOk = fiscalStatus && ['reconciled', 'reviewed', 'ready_internal', 'finalized_internal'].includes(fiscalStatus);

  let overall: ExpedientReadinessSummary['overall_readiness'] = 'none';
  if (ssOk && fiscalOk) overall = 'complete';
  else if (ssOk || fiscalOk) overall = 'partial';
  else if (ssStatus || fiscalStatus) overall = 'pending';

  return { ss_status: ssStatus, ss_score: ssScore, fiscal_status: fiscalStatus, fiscal_score: fiscalScore, overall_readiness: overall };
}

// ── Report Builder ──

export function buildMonthlyExecutiveReport(params: {
  periodId: string;
  periodYear: number;
  periodMonth: number;
  currentKPIs: MonthlyKPIs;
  previousKPIs: MonthlyKPIs | null;
  ssExpedient: { status: string; score: number } | null;
  fiscalExpedient: { status: string; score: number } | null;
  autoGeneration: AutoGenerationResult | null;
}): MonthlyExecutiveReport {
  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    period_id: params.periodId,
    period_year: params.periodYear,
    period_month: params.periodMonth,
    kpis: params.currentKPIs,
    comparison: computePeriodComparison(params.currentKPIs, params.previousKPIs),
    expedient_readiness: computeExpedientReadiness(params.ssExpedient, params.fiscalExpedient),
    auto_generation: params.autoGeneration,
  };
}

// ── Auto-Generation Decision ──

/**
 * Determines if expedients should be auto-generated after period close.
 * Only triggers if period is freshly closed and expedients don't exist yet.
 */
export function shouldAutoGenerateExpedients(
  periodStatus: string,
  existingSS: { status: string } | null,
  existingFiscal: { status: string } | null,
): { ss: boolean; fiscal: boolean } {
  if (periodStatus !== 'closed') return { ss: false, fiscal: false };

  const ssNeeded = !existingSS || existingSS.status === 'draft';
  const fiscalNeeded = !existingFiscal || existingFiscal.status === 'draft';

  return { ss: ssNeeded, fiscal: fiscalNeeded };
}
