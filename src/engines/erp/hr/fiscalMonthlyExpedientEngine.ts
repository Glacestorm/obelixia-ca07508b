/**
 * fiscalMonthlyExpedientEngine.ts — V2-ES.7 Paso 5
 * Pure logic engine for Fiscal Monthly Expedient (Modelo 111/190 preparatorio):
 * - States, transitions, reconciliation checks
 * - Consolidation from closed period + approved run
 * - No side-effects, no fetch — deterministic functions only
 *
 * NOTA: "finalized_internal" NO equivale a presentación oficial ante AEAT.
 * Este motor gestiona exclusivamente el expediente fiscal interno preparatorio.
 */

import type { PeriodClosureSnapshot } from './payrollRunEngine';

// ── Types ──

/**
 * Estado del expediente fiscal interno.
 * Misma semántica que el expediente SS (patrón reutilizado).
 */
export type FiscalExpedientStatus =
  | 'draft'
  | 'consolidated'
  | 'reconciled'
  | 'reviewed'
  | 'ready_internal'
  | 'finalized_internal'
  | 'cancelled'
  | 'error';

/** Traceability record for each state transition */
export interface FiscalExpedientTraceEntry {
  action: string;
  status_from: FiscalExpedientStatus;
  status_to: FiscalExpedientStatus;
  performed_by: string;
  performed_at: string;
  notes?: string;
  period_id?: string;
  run_ref?: string;
}

/** Modelo 111 preparatorio — retenciones IRPF trimestrales/mensuales */
export interface Modelo111Summary {
  /** Rendimientos del trabajo */
  perceptores_trabajo: number;
  importe_percepciones_trabajo: number;
  importe_retenciones_trabajo: number;
  /** Actividades profesionales (si aplica) */
  perceptores_profesionales: number;
  importe_percepciones_profesionales: number;
  importe_retenciones_profesionales: number;
  /** Totales */
  total_perceptores: number;
  total_percepciones: number;
  total_retenciones: number;
}

/** Modelo 190 preparatorio — resumen anual informativo */
export interface Modelo190LineItem {
  employee_id: string;
  employee_name: string;
  nif: string;
  clave_percepcion: string; // A, B, C, etc.
  subclave: string;
  percepciones_integras: number;
  retenciones_practicadas: number;
  percepciones_en_especie: number;
  ingresos_a_cuenta: number;

  // ── C3 · Trazabilidad fiscal y bloqueo de presentación oficial ──
  /** Si true, esta línea no puede ser presentada oficialmente sin revisión humana. */
  requires_human_review?: boolean;
  /** Motivo legible de la revisión requerida. */
  review_reason?: string;
  /** Códigos de concepto que han generado esta línea (trazabilidad). */
  concept_codes?: string[];
  /** Estado de clasificación fiscal frente a Modelo 190. */
  fiscal_classification_status?: 'resolved' | 'pending_review' | 'out_of_scope';
  /** Si true, bloquea explícitamente cualquier intento de envío oficial AEAT. */
  official_submission_blocked?: boolean;
  /** Si la línea usa A/01 como fallback técnico no resuelto. */
  clave_is_fallback?: boolean;
}

export interface FiscalExpedientSnapshot {
  version: '1.0';
  generated_at: string;
  generated_by: string;
  period_id: string;
  period_year: number;
  period_month: number;
  closure_snapshot_ref: string;
  payroll_totals: {
    gross: number;
    net: number;
    employer_cost: number;
    employee_count: number;
  };
  fiscal_totals: {
    total_irpf_base: number;
    total_irpf_retencion: number;
    total_irpf_workers: number;
    avg_irpf_rate: number;
    total_percepciones_especie: number;
    total_ingresos_cuenta: number;
  };
  modelo_111: Modelo111Summary | null;
  reconciliation: FiscalReconciliationResult | null;
}

export interface FiscalReconciliationCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  detail?: string;
  payroll_value?: number;
  fiscal_value?: number;
  diff?: number;
}

export interface FiscalReconciliationResult {
  computed_at: string;
  status: 'balanced' | 'discrepancies' | 'incomplete';
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: FiscalReconciliationCheck[];
  score: number; // 0-100
}

// ── State Machine ──

const FISCAL_EXPEDIENT_TRANSITIONS: Record<FiscalExpedientStatus, FiscalExpedientStatus[]> = {
  draft:              ['consolidated', 'cancelled'],
  consolidated:       ['reconciled', 'error', 'cancelled'],
  reconciled:         ['reviewed', 'consolidated', 'cancelled'],
  reviewed:           ['ready_internal', 'reconciled', 'cancelled'],
  ready_internal:     ['finalized_internal', 'reviewed', 'cancelled'],
  finalized_internal: ['reviewed'],
  cancelled:          ['draft'],
  error:              ['draft', 'consolidated'],
};

export function canTransitionFiscalExpedient(from: FiscalExpedientStatus, to: FiscalExpedientStatus): boolean {
  return FISCAL_EXPEDIENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidFiscalTransitions(from: FiscalExpedientStatus): FiscalExpedientStatus[] {
  return FISCAL_EXPEDIENT_TRANSITIONS[from] || [];
}

export const FISCAL_EXPEDIENT_STATUS_CONFIG: Record<FiscalExpedientStatus, {
  label: string;
  color: string;
  description: string;
  isTerminal: boolean;
}> = {
  draft: {
    label: 'Borrador',
    color: 'bg-muted text-muted-foreground',
    description: 'Registro fiscal creado, pendiente de vincular a período cerrado',
    isTerminal: false,
  },
  consolidated: {
    label: 'Consolidado',
    color: 'bg-blue-500/10 text-blue-700',
    description: 'Vinculado al período cerrado con datos fiscales extraídos',
    isTerminal: false,
  },
  reconciled: {
    label: 'Conciliado',
    color: 'bg-emerald-500/10 text-emerald-700',
    description: 'Conciliación nómina ↔ fiscal ejecutada',
    isTerminal: false,
  },
  reviewed: {
    label: 'Revisado',
    color: 'bg-indigo-500/10 text-indigo-700',
    description: 'Revisión humana completada',
    isTerminal: false,
  },
  ready_internal: {
    label: 'Listo (interno)',
    color: 'bg-green-500/10 text-green-700',
    description: 'Preparado internamente — NO presentado oficialmente a AEAT',
    isTerminal: false,
  },
  finalized_internal: {
    label: 'Finalizado (interno)',
    color: 'bg-green-600/10 text-green-800',
    description: 'Expediente fiscal interno cerrado — NO equivale a presentación oficial AEAT',
    isTerminal: true,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-muted text-muted-foreground line-through',
    description: 'Expediente fiscal cancelado',
    isTerminal: true,
  },
  error: {
    label: 'Error',
    color: 'bg-destructive/10 text-destructive',
    description: 'Fallo en consolidación o conciliación fiscal',
    isTerminal: false,
  },
};

// ── Audit trail event mapping ──

export function getFiscalAuditEvent(to: FiscalExpedientStatus): string {
  const map: Record<FiscalExpedientStatus, string> = {
    draft: 'fiscal_expedient_reset',
    consolidated: 'fiscal_expedient_consolidated',
    reconciled: 'fiscal_expedient_reconciled',
    reviewed: 'fiscal_expedient_reviewed',
    ready_internal: 'fiscal_expedient_ready',
    finalized_internal: 'fiscal_expedient_finalized',
    cancelled: 'fiscal_expedient_cancelled',
    error: 'fiscal_expedient_error',
  };
  return map[to] || 'fiscal_expedient_status_changed';
}

// ── Reconciliation Engine (pure) ──

export interface FiscalReconciliationInput {
  payroll: {
    gross: number;
    net: number;
    employer_cost: number;
    employee_count: number;
  };
  fiscal: {
    total_irpf_base: number;
    total_irpf_retencion: number;
    total_irpf_workers: number;
    avg_irpf_rate: number;
  } | null;
  periodStatus: string;
  hasApprovedRun: boolean;
}

export function reconcilePayrollVsFiscal(input: FiscalReconciliationInput): FiscalReconciliationResult {
  const checks: FiscalReconciliationCheck[] = [];
  const { payroll, fiscal, periodStatus, hasApprovedRun } = input;

  // 1. Period closed/locked
  checks.push({
    id: 'period_closed',
    label: 'Período cerrado o bloqueado',
    passed: ['closed', 'locked'].includes(periodStatus),
    severity: 'error',
    detail: `Estado actual: ${periodStatus}`,
  });

  // 2. Approved run
  checks.push({
    id: 'approved_run',
    label: 'Run aprobado de referencia',
    passed: hasApprovedRun,
    severity: 'error',
    detail: hasApprovedRun ? 'Run aprobado disponible' : 'Sin run aprobado',
  });

  // 3. Fiscal data exists
  const hasFiscal = fiscal !== null && fiscal.total_irpf_base > 0;
  checks.push({
    id: 'fiscal_data_exists',
    label: 'Datos fiscales disponibles (IRPF)',
    passed: hasFiscal,
    severity: 'warning',
    detail: hasFiscal ? `${fiscal!.total_irpf_workers} perceptores, ${fiscal!.total_irpf_retencion.toFixed(2)}€ retenciones` : 'Sin datos fiscales',
  });

  if (hasFiscal && fiscal) {
    // 4. Worker count match
    checks.push({
      id: 'worker_count',
      label: 'Nº perceptores nómina vs fiscal',
      passed: payroll.employee_count === fiscal.total_irpf_workers,
      severity: 'warning',
      payroll_value: payroll.employee_count,
      fiscal_value: fiscal.total_irpf_workers,
      diff: payroll.employee_count - fiscal.total_irpf_workers,
      detail: payroll.employee_count === fiscal.total_irpf_workers
        ? `${payroll.employee_count} perceptores`
        : `Nómina: ${payroll.employee_count}, Fiscal: ${fiscal.total_irpf_workers}`,
    });

    // 5. IRPF base vs gross coherence
    const baseDiff = Math.abs(fiscal.total_irpf_base - payroll.gross);
    const baseThreshold = payroll.gross * 0.05; // 5% tolerance
    checks.push({
      id: 'irpf_base_vs_gross',
      label: 'Coherencia base IRPF vs bruto nómina',
      passed: baseDiff <= baseThreshold,
      severity: 'warning',
      payroll_value: payroll.gross,
      fiscal_value: fiscal.total_irpf_base,
      diff: baseDiff,
      detail: `Bruto: ${payroll.gross.toFixed(2)}€, Base IRPF: ${fiscal.total_irpf_base.toFixed(2)}€ (dif: ${baseDiff.toFixed(2)}€)`,
    });

    // 6. Retention rate sanity (should be between 0-50%)
    checks.push({
      id: 'irpf_rate_sanity',
      label: 'Tipo medio IRPF razonable (0-50%)',
      passed: fiscal.avg_irpf_rate >= 0 && fiscal.avg_irpf_rate <= 50,
      severity: 'error',
      fiscal_value: fiscal.avg_irpf_rate,
      detail: `Tipo medio: ${fiscal.avg_irpf_rate.toFixed(2)}%`,
    });

    // 7. Retention amount coherence
    const expectedRetention = fiscal.total_irpf_base * (fiscal.avg_irpf_rate / 100);
    const retDiff = Math.abs(expectedRetention - fiscal.total_irpf_retencion);
    const retThreshold = fiscal.total_irpf_retencion * 0.02; // 2% tolerance
    checks.push({
      id: 'retention_coherence',
      label: 'Coherencia retención calculada vs real',
      passed: retDiff <= retThreshold || fiscal.total_irpf_retencion === 0,
      severity: 'warning',
      fiscal_value: fiscal.total_irpf_retencion,
      diff: retDiff,
      detail: `Retención: ${fiscal.total_irpf_retencion.toFixed(2)}€, Esperada: ${expectedRetention.toFixed(2)}€`,
    });

    // 8. Retention vs deductions coherence
    const totalDeductions = payroll.gross - payroll.net;
    checks.push({
      id: 'retention_vs_deductions',
      label: 'Retención IRPF dentro de deducciones totales',
      passed: fiscal.total_irpf_retencion <= totalDeductions && fiscal.total_irpf_retencion > 0,
      severity: 'warning',
      payroll_value: totalDeductions,
      fiscal_value: fiscal.total_irpf_retencion,
      detail: `Deducciones totales: ${totalDeductions.toFixed(2)}€, IRPF: ${fiscal.total_irpf_retencion.toFixed(2)}€`,
    });
  }

  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed && c.severity === 'error').length;
  const warnings = checks.filter(c => !c.passed && c.severity === 'warning').length;
  const score = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0;

  const status: FiscalReconciliationResult['status'] =
    failed > 0 ? 'discrepancies'
      : !hasFiscal ? 'incomplete'
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

export interface FiscalConsolidationInput {
  periodId: string;
  periodYear: number;
  periodMonth: number;
  closureSnapshot: PeriodClosureSnapshot | null;
  fiscalData: {
    total_irpf_base: number;
    total_irpf_retencion: number;
    total_irpf_workers: number;
    avg_irpf_rate: number;
    total_percepciones_especie: number;
    total_ingresos_cuenta: number;
  } | null;
  userId: string;
  reconciliation: FiscalReconciliationResult | null;
}

export function buildFiscalExpedientSnapshot(input: FiscalConsolidationInput): FiscalExpedientSnapshot {
  const { closureSnapshot, fiscalData, reconciliation } = input;

  const fiscalTotals = fiscalData || {
    total_irpf_base: 0,
    total_irpf_retencion: 0,
    total_irpf_workers: 0,
    avg_irpf_rate: 0,
    total_percepciones_especie: 0,
    total_ingresos_cuenta: 0,
  };

  // Build Modelo 111 summary from fiscal data
  const modelo111: Modelo111Summary | null = fiscalData ? {
    perceptores_trabajo: fiscalData.total_irpf_workers,
    importe_percepciones_trabajo: fiscalData.total_irpf_base,
    importe_retenciones_trabajo: fiscalData.total_irpf_retencion,
    perceptores_profesionales: 0,
    importe_percepciones_profesionales: 0,
    importe_retenciones_profesionales: 0,
    total_perceptores: fiscalData.total_irpf_workers,
    total_percepciones: fiscalData.total_irpf_base,
    total_retenciones: fiscalData.total_irpf_retencion,
  } : null;

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
    fiscal_totals: fiscalTotals,
    modelo_111: modelo111,
    reconciliation,
  };
}

// ── Formatters ──

export function formatFiscalExpedientLabel(year: number, month: number): string {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

export function getFiscalExpedientReadiness(status: FiscalExpedientStatus): { level: 'none' | 'partial' | 'complete'; percent: number } {
  const progressMap: Record<FiscalExpedientStatus, number> = {
    draft: 0,
    consolidated: 20,
    reconciled: 40,
    reviewed: 60,
    ready_internal: 80,
    finalized_internal: 100,
    cancelled: 0,
    error: 0,
  };
  const percent = progressMap[status];
  return {
    level: percent === 0 ? 'none' : percent === 100 ? 'complete' : 'partial',
    percent,
  };
}

export function buildFiscalTraceEntry(
  action: string,
  from: FiscalExpedientStatus,
  to: FiscalExpedientStatus,
  userId: string,
  extra?: { notes?: string; period_id?: string; run_ref?: string }
): FiscalExpedientTraceEntry {
  return {
    action,
    status_from: from,
    status_to: to,
    performed_by: userId,
    performed_at: new Date().toISOString(),
    ...extra,
  };
}

/** Determine fiscal trimester from month */
export function getFiscalTrimester(month: number): { trimester: number; label: string; months: number[] } {
  const t = Math.ceil(month / 3);
  const months = [t * 3 - 2, t * 3 - 1, t * 3];
  return { trimester: t, label: `${t}T`, months };
}

/** Check if month is end-of-trimester (relevant for Modelo 111 presentation) */
export function isEndOfTrimester(month: number): boolean {
  return [3, 6, 9, 12].includes(month);
}
