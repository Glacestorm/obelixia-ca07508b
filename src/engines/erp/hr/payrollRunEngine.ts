/**
 * payrollRunEngine.ts — V2-ES.7 Paso 2
 * Lógica pura para gestión de payroll runs: estados, snapshots, validación, comparación
 * Sin side-effects, sin fetch — solo funciones deterministas
 */

// ── Types ──

export type PayrollRunStatus = 'pending' | 'running' | 'completed' | 'completed_with_warnings' | 'failed' | 'cancelled' | 'superseded';
export type PayrollRunType = 'initial' | 'recalculation' | 'correction' | 'simulation';

export interface PayrollRun {
  id: string;
  company_id: string;
  period_id: string;
  run_number: number;
  run_type: PayrollRunType;
  status: PayrollRunStatus;
  context_snapshot: PayrollRunSnapshot;
  total_employees: number;
  employees_calculated: number;
  employees_skipped: number;
  employees_errored: number;
  total_gross: number;
  total_net: number;
  total_deductions: number;
  total_employer_cost: number;
  warnings: PayrollRunWarning[];
  errors: PayrollRunError[];
  validation_summary: PayrollRunValidationSummary;
  previous_run_id: string | null;
  diff_summary: PayrollRunDiffSummary | null;
  started_at: string | null;
  completed_at: string | null;
  started_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PayrollRunSnapshot {
  version: string;
  captured_at: string;
  period: {
    id: string;
    name: string;
    fiscal_year: number;
    period_number: number;
    start_date: string;
    end_date: string;
    status: string;
  };
  incidents: {
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    pending_count: number;
    validated_count: number;
  };
  concepts: {
    total_active: number;
    earning_count: number;
    deduction_count: number;
  };
  employees: {
    total_in_scope: number;
    employee_ids: string[];
  };
  rates: {
    ss_cc_company: number;
    ss_cc_worker: number;
    fogasa: number;
    fp_company: number;
    fp_worker: number;
    mei: number;
  };
  run_params: Record<string, unknown>;
}

export interface PayrollRunWarning {
  code: string;
  message: string;
  employee_id?: string;
  employee_name?: string;
  severity: 'low' | 'medium' | 'high';
  detail?: string;
}

export interface PayrollRunError {
  code: string;
  message: string;
  employee_id?: string;
  employee_name?: string;
  stack?: string;
}

export interface PayrollRunValidationSummary {
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: PayrollRunCheck[];
}

export interface PayrollRunCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  detail?: string;
}

export interface PayrollRunDiffSummary {
  previous_run_number: number;
  diff_gross: number;
  diff_net: number;
  diff_employer_cost: number;
  employees_changed: number;
  employees_added: number;
  employees_removed: number;
  computed_at: string;
}

// ── Status Labels ──

export const RUN_STATUS_CONFIG: Record<PayrollRunStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pendiente', color: 'bg-muted text-muted-foreground', icon: 'clock' },
  running: { label: 'Calculando...', color: 'bg-blue-500/10 text-blue-700', icon: 'loader' },
  completed: { label: 'Completado', color: 'bg-green-500/10 text-green-700', icon: 'check' },
  completed_with_warnings: { label: 'Completado con avisos', color: 'bg-amber-500/10 text-amber-700', icon: 'alert' },
  failed: { label: 'Fallido', color: 'bg-destructive/10 text-destructive', icon: 'x' },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground', icon: 'x' },
  superseded: { label: 'Sustituido', color: 'bg-muted text-muted-foreground/60', icon: 'archive' },
};

export const RUN_TYPE_LABELS: Record<PayrollRunType, string> = {
  initial: 'Cálculo inicial',
  recalculation: 'Recálculo',
  correction: 'Corrección',
  simulation: 'Simulación',
};

// ── State Machine ──

const VALID_TRANSITIONS: Record<PayrollRunStatus, PayrollRunStatus[]> = {
  pending: ['running', 'cancelled'],
  running: ['completed', 'completed_with_warnings', 'failed'],
  completed: ['superseded'],
  completed_with_warnings: ['superseded'],
  failed: ['pending', 'cancelled'],  // allow retry
  cancelled: [],
  superseded: [],
};

export function canTransition(from: PayrollRunStatus, to: PayrollRunStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextRunNumber(existingRuns: Pick<PayrollRun, 'run_number'>[]): number {
  if (existingRuns.length === 0) return 1;
  return Math.max(...existingRuns.map(r => r.run_number)) + 1;
}

export function determineRunType(existingRuns: Pick<PayrollRun, 'status' | 'run_type'>[]): PayrollRunType {
  const completedRuns = existingRuns.filter(r => r.status === 'completed' || r.status === 'completed_with_warnings');
  if (completedRuns.length === 0) return 'initial';
  return 'recalculation';
}

// ── Snapshot Builder ──

export interface SnapshotInput {
  period: {
    id: string;
    period_name: string;
    fiscal_year: number;
    period_number: number;
    start_date: string;
    end_date: string;
    status: string;
  };
  incidents: Array<{
    status: string;
    incident_type: string;
  }>;
  conceptCount: number;
  earningCount: number;
  deductionCount: number;
  employeeIds: string[];
  runParams?: Record<string, unknown>;
}

export function buildSnapshot(input: SnapshotInput): PayrollRunSnapshot {
  const incidentsByStatus: Record<string, number> = {};
  const incidentsByType: Record<string, number> = {};
  let pendingCount = 0;
  let validatedCount = 0;

  for (const inc of input.incidents) {
    incidentsByStatus[inc.status] = (incidentsByStatus[inc.status] || 0) + 1;
    incidentsByType[inc.incident_type] = (incidentsByType[inc.incident_type] || 0) + 1;
    if (inc.status === 'pending') pendingCount++;
    if (inc.status === 'validated') validatedCount++;
  }

  return {
    version: '2.0',
    captured_at: new Date().toISOString(),
    period: {
      id: input.period.id,
      name: input.period.period_name,
      fiscal_year: input.period.fiscal_year,
      period_number: input.period.period_number,
      start_date: input.period.start_date,
      end_date: input.period.end_date,
      status: input.period.status,
    },
    incidents: {
      total: input.incidents.length,
      by_status: incidentsByStatus,
      by_type: incidentsByType,
      pending_count: pendingCount,
      validated_count: validatedCount,
    },
    concepts: {
      total_active: input.conceptCount,
      earning_count: input.earningCount,
      deduction_count: input.deductionCount,
    },
    employees: {
      total_in_scope: input.employeeIds.length,
      employee_ids: input.employeeIds,
    },
    rates: {
      ss_cc_company: 23.60,
      ss_cc_worker: 4.70,
      fogasa: 0.20,
      fp_company: 0.60,
      fp_worker: 0.10,
      mei: 0.58,
    },
    run_params: input.runParams || {},
  };
}

// ── Pre-Run Validation ──

export function validatePreRun(snapshot: PayrollRunSnapshot): PayrollRunValidationSummary {
  const checks: PayrollRunCheck[] = [];

  // 1. Period must be open
  checks.push({
    id: 'period_open',
    label: 'Período abierto o en cálculo',
    passed: ['open', 'calculating', 'calculated', 'reviewing'].includes(snapshot.period.status),
    severity: 'error',
    detail: `Estado actual: ${snapshot.period.status}`,
  });

  // 2. Employees in scope
  checks.push({
    id: 'employees_in_scope',
    label: 'Empleados en el alcance',
    passed: snapshot.employees.total_in_scope > 0,
    severity: 'error',
    detail: `${snapshot.employees.total_in_scope} empleados`,
  });

  // 3. No pending incidents
  const hasPending = snapshot.incidents.pending_count > 0;
  checks.push({
    id: 'no_pending_incidents',
    label: 'Sin incidencias pendientes',
    passed: !hasPending,
    severity: 'warning',
    detail: hasPending ? `${snapshot.incidents.pending_count} incidencias pendientes` : 'OK',
  });

  // 4. Active concepts exist
  checks.push({
    id: 'concepts_available',
    label: 'Conceptos de nómina disponibles',
    passed: snapshot.concepts.total_active > 0,
    severity: 'error',
    detail: `${snapshot.concepts.total_active} conceptos activos`,
  });

  // 5. Dates coherent
  const startDate = new Date(snapshot.period.start_date);
  const endDate = new Date(snapshot.period.end_date);
  checks.push({
    id: 'dates_coherent',
    label: 'Fechas de período coherentes',
    passed: startDate < endDate,
    severity: 'error',
  });

  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed && c.severity === 'error').length;
  const warnings = checks.filter(c => !c.passed && c.severity === 'warning').length;

  return {
    total_checks: checks.length,
    passed,
    failed,
    warnings,
    checks,
  };
}

// ── Diff Computation ──

export function computeRunDiff(
  currentRun: Pick<PayrollRun, 'run_number' | 'total_gross' | 'total_net' | 'total_employer_cost'>,
  previousRun: Pick<PayrollRun, 'run_number' | 'total_gross' | 'total_net' | 'total_employer_cost' | 'context_snapshot'>,
  currentEmployeeIds: string[],
  previousEmployeeIds: string[]
): PayrollRunDiffSummary {
  const currentSet = new Set(currentEmployeeIds);
  const previousSet = new Set(previousEmployeeIds);
  const added = currentEmployeeIds.filter(id => !previousSet.has(id)).length;
  const removed = previousEmployeeIds.filter(id => !currentSet.has(id)).length;
  const changed = currentEmployeeIds.filter(id => previousSet.has(id)).length; // simplified

  return {
    previous_run_number: previousRun.run_number,
    diff_gross: currentRun.total_gross - previousRun.total_gross,
    diff_net: currentRun.total_net - previousRun.total_net,
    diff_employer_cost: currentRun.total_employer_cost - previousRun.total_employer_cost,
    employees_changed: changed,
    employees_added: added,
    employees_removed: removed,
    computed_at: new Date().toISOString(),
  };
}

// ── Result Classification ──

export function classifyRunResult(
  employeesCalculated: number,
  employeesErrored: number,
  warnings: PayrollRunWarning[]
): PayrollRunStatus {
  if (employeesCalculated === 0 && employeesErrored > 0) return 'failed';
  if (employeesErrored > 0 || warnings.length > 0) return 'completed_with_warnings';
  return 'completed';
}

// ── Formatters ──

export function formatRunLabel(run: Pick<PayrollRun, 'run_number' | 'run_type' | 'status'>): string {
  const typeLabel = RUN_TYPE_LABELS[run.run_type] || run.run_type;
  return `Run #${run.run_number} — ${typeLabel}`;
}

export function isRunTerminal(status: PayrollRunStatus): boolean {
  return ['completed', 'completed_with_warnings', 'failed', 'cancelled', 'superseded'].includes(status);
}

export function isRunActive(status: PayrollRunStatus): boolean {
  return status === 'pending' || status === 'running';
}

export function getLatestCompletedRun(runs: PayrollRun[]): PayrollRun | null {
  return runs
    .filter(r => r.status === 'completed' || r.status === 'completed_with_warnings')
    .sort((a, b) => b.run_number - a.run_number)[0] || null;
}
