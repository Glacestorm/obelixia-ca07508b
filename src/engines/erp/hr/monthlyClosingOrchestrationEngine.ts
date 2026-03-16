/**
 * monthlyClosingOrchestrationEngine.ts — V2-RRHH-FASE-3
 * Pure orchestration logic for monthly closing flow:
 * - Closing states & transitions
 * - Checklist aggregation (blocking / warning / info)
 * - Closing package definition
 * - No side-effects, no fetch — deterministic functions only
 */

import type { PayrollRunValidationSummary, PayrollRunCheck, PeriodClosureSnapshot } from './payrollRunEngine';
import type { ExpedientReadinessSummary } from './monthlyExecutiveReportEngine';
import type { ClosingIntelligenceReport } from './closingIntelligenceEngine';

// ── Closing Flow States ──

export type MonthlyClosingPhase =
  | 'not_started'    // Period open, no closing initiated
  | 'preparation'    // Gathering data, running pre-checks
  | 'validation'     // Pre-close validation in progress
  | 'ready_to_close' // All blockers cleared, warnings acknowledged
  | 'closing'        // Transition in progress
  | 'closed'         // Period closed, generating artifacts
  | 'post_close'     // Expedients, reports being generated
  | 'completed'      // All done, period locked or fully processed
  | 'reopened';       // Period was reopened

export interface MonthlyClosingState {
  phase: MonthlyClosingPhase;
  periodId: string;
  periodName: string;
  periodYear: number;
  periodMonth: number;
  startedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  lockedAt: string | null;
  reopenedAt: string | null;
}

const PHASE_TRANSITIONS: Record<MonthlyClosingPhase, MonthlyClosingPhase[]> = {
  not_started:    ['preparation'],
  preparation:    ['validation', 'not_started'],
  validation:     ['ready_to_close', 'preparation'],
  ready_to_close: ['closing', 'preparation'],
  closing:        ['closed'],
  closed:         ['post_close', 'reopened'],
  post_close:     ['completed', 'reopened'],
  completed:      ['reopened'],
  reopened:       ['preparation'],
};

export function canTransitionPhase(from: MonthlyClosingPhase, to: MonthlyClosingPhase): boolean {
  return PHASE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function derivePhaseFromPeriodStatus(
  periodStatus: string,
  hasClosureSnapshot: boolean,
  expedientReadiness: ExpedientReadinessSummary | null,
): MonthlyClosingPhase {
  switch (periodStatus) {
    case 'draft':
    case 'open':
      return 'not_started';
    case 'calculating':
      return 'preparation';
    case 'calculated':
    case 'reviewing':
      return 'validation';
    case 'closing':
      return 'closing';
    case 'closed':
      if (expedientReadiness?.overall_readiness === 'complete') return 'completed';
      if (hasClosureSnapshot) return 'post_close';
      return 'closed';
    case 'locked':
      return 'completed';
    default:
      return 'not_started';
  }
}

// ── Phase labels ──

export const CLOSING_PHASE_CONFIG: Record<MonthlyClosingPhase, {
  label: string;
  description: string;
  color: string;
  icon: string;
  step: number;
}> = {
  not_started:    { label: 'Sin iniciar',      description: 'El período está abierto. Inicie el proceso de cierre.',          color: 'bg-muted text-muted-foreground',        icon: 'circle',         step: 0 },
  preparation:    { label: 'Preparación',       description: 'Recopilando datos y ejecutando validaciones previas.',           color: 'bg-blue-500/10 text-blue-700',          icon: 'clipboard-list', step: 1 },
  validation:     { label: 'Validación',        description: 'Checklist pre-cierre en curso. Resuelva bloqueantes.',           color: 'bg-amber-500/10 text-amber-700',        icon: 'shield-check',   step: 2 },
  ready_to_close: { label: 'Listo para cerrar', description: 'Sin errores bloqueantes. Puede proceder al cierre.',            color: 'bg-emerald-500/10 text-emerald-700',    icon: 'check-circle',   step: 3 },
  closing:        { label: 'Cerrando',          description: 'Proceso de cierre en curso...',                                 color: 'bg-indigo-500/10 text-indigo-700',       icon: 'loader',         step: 4 },
  closed:         { label: 'Cerrado',           description: 'Período cerrado. Generando artefactos post-cierre.',            color: 'bg-green-500/10 text-green-700',        icon: 'lock',           step: 5 },
  post_close:     { label: 'Post-cierre',       description: 'Generando expedientes y paquete de cierre.',                    color: 'bg-green-600/10 text-green-800',        icon: 'package',        step: 6 },
  completed:      { label: 'Completado',        description: 'Cierre completado con todos los artefactos generados.',         color: 'bg-green-700/10 text-green-900',        icon: 'check-circle-2', step: 7 },
  reopened:       { label: 'Reabierto',         description: 'Período reabierto — requiere nuevo ciclo de cierre.',           color: 'bg-orange-500/10 text-orange-700',      icon: 'rotate-ccw',     step: -1 },
};

// ── Checklist aggregation ──

export type CheckSeverity = 'blocker' | 'warning' | 'info' | 'ok';

export interface ClosingCheckItem {
  id: string;
  label: string;
  severity: CheckSeverity;
  detail?: string;
  category: 'payroll' | 'incidents' | 'runs' | 'records' | 'expedients' | 'data' | 'dates';
  passed: boolean;
}

export interface ClosingChecklist {
  items: ClosingCheckItem[];
  blockers: number;
  warnings: number;
  infos: number;
  passed: number;
  total: number;
  canProceed: boolean;
  overallScore: number; // 0-100
}

/**
 * Aggregate pre-close validation checks + expedient readiness + extra checks
 * into a unified closing checklist.
 */
export function buildClosingChecklist(params: {
  preCloseValidation: PayrollRunValidationSummary | null;
  expedientReadiness: ExpedientReadinessSummary | null;
  periodStatus: string;
  paymentDate: string | null;
  employeeCount: number;
  totalGross: number;
  hasPendingIncidents: boolean;
  pendingIncidentCount: number;
}): ClosingChecklist {
  const items: ClosingCheckItem[] = [];

  // 1. Map pre-close validation checks
  if (params.preCloseValidation) {
    for (const check of params.preCloseValidation.checks) {
      items.push({
        id: check.id,
        label: check.label,
        severity: check.passed ? 'ok' : (check.severity === 'error' ? 'blocker' : 'warning'),
        detail: check.detail,
        category: mapCheckCategory(check.id),
        passed: check.passed,
      });
    }
  } else {
    // No validation run yet — add synthetic blockers
    items.push({
      id: 'no_validation',
      label: 'Validación pre-cierre no ejecutada',
      severity: 'blocker',
      detail: 'Ejecute la validación antes de cerrar',
      category: 'payroll',
      passed: false,
    });
  }

  // 2. Period in closable state
  const isClosable = ['reviewing', 'calculated'].includes(params.periodStatus);
  items.push({
    id: 'period_closable_state',
    label: 'Período en estado válido para cierre',
    severity: isClosable ? 'ok' : 'blocker',
    detail: `Estado actual: ${params.periodStatus}`,
    category: 'payroll',
    passed: isClosable,
  });

  // 3. Payment date
  items.push({
    id: 'payment_date_check',
    label: 'Fecha de pago definida',
    severity: params.paymentDate ? 'ok' : 'warning',
    detail: params.paymentDate || 'Sin fecha de pago',
    category: 'dates',
    passed: !!params.paymentDate,
  });

  // 4. Employee count
  items.push({
    id: 'employee_count_check',
    label: 'Empleados en el período',
    severity: params.employeeCount > 0 ? 'ok' : 'blocker',
    detail: `${params.employeeCount} empleados`,
    category: 'data',
    passed: params.employeeCount > 0,
  });

  // 5. Total gross
  items.push({
    id: 'total_gross_check',
    label: 'Bruto total calculado',
    severity: params.totalGross > 0 ? 'ok' : 'blocker',
    detail: params.totalGross > 0 ? `${params.totalGross.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}` : 'Sin importes',
    category: 'payroll',
    passed: params.totalGross > 0,
  });

  // 6. Pending incidents
  items.push({
    id: 'pending_incidents_check',
    label: 'Sin incidencias pendientes',
    severity: params.hasPendingIncidents ? 'warning' : 'ok',
    detail: params.hasPendingIncidents ? `${params.pendingIncidentCount} incidencias pendientes` : 'Sin pendientes',
    category: 'incidents',
    passed: !params.hasPendingIncidents,
  });

  // 7. Expedient readiness (non-blocking, informative)
  if (params.expedientReadiness) {
    const er = params.expedientReadiness;
    items.push({
      id: 'expedient_ss_check',
      label: 'Expediente SS preparado',
      severity: er.ss_status && ['reconciled', 'reviewed', 'ready_internal', 'finalized_internal'].includes(er.ss_status) ? 'ok' : 'info',
      detail: er.ss_status ? `Estado: ${er.ss_status}` : 'No generado',
      category: 'expedients',
      passed: !!er.ss_status && er.ss_status !== 'draft',
    });
    items.push({
      id: 'expedient_fiscal_check',
      label: 'Expediente Fiscal preparado',
      severity: er.fiscal_status && ['reconciled', 'reviewed', 'ready_internal', 'finalized_internal'].includes(er.fiscal_status) ? 'ok' : 'info',
      detail: er.fiscal_status ? `Estado: ${er.fiscal_status}` : 'No generado',
      category: 'expedients',
      passed: !!er.fiscal_status && er.fiscal_status !== 'draft',
    });
  }

  // Deduplicate by id (preCloseValidation may overlap with our synthetic checks)
  const seen = new Set<string>();
  const deduped = items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  const blockers = deduped.filter(i => i.severity === 'blocker').length;
  const warnings = deduped.filter(i => i.severity === 'warning').length;
  const infos = deduped.filter(i => i.severity === 'info').length;
  const passed = deduped.filter(i => i.passed).length;
  const total = deduped.length;
  const overallScore = total > 0 ? Math.round((passed / total) * 100) : 0;

  return {
    items: deduped,
    blockers,
    warnings,
    infos,
    passed,
    total,
    canProceed: blockers === 0,
    overallScore,
  };
}

function mapCheckCategory(checkId: string): ClosingCheckItem['category'] {
  if (checkId.includes('period')) return 'payroll';
  if (checkId.includes('run')) return 'runs';
  if (checkId.includes('record') || checkId.includes('employee')) return 'records';
  if (checkId.includes('incident')) return 'incidents';
  if (checkId.includes('payment') || checkId.includes('date')) return 'dates';
  if (checkId.includes('snapshot') || checkId.includes('totals')) return 'data';
  return 'payroll';
}

// ── Closing Package ──

export interface ClosingPackage {
  version: '1.0';
  generatedAt: string;
  periodId: string;
  periodName: string;
  periodYear: number;
  periodMonth: number;
  phase: MonthlyClosingPhase;
  closureSnapshot: PeriodClosureSnapshot | null;
  checklist: ClosingChecklist;
  intelligenceReport: ClosingIntelligenceReport | null;
  expedientReadiness: ExpedientReadinessSummary | null;
  outputs: ClosingOutput[];
  ledgerEventIds: string[];
  versionRegistryId: string | null;
}

export interface ClosingOutput {
  id: string;
  type: 'closure_snapshot' | 'ss_expedient' | 'fiscal_expedient' | 'executive_report' | 'intelligence_report';
  label: string;
  status: 'pending' | 'generated' | 'error';
  generatedAt: string | null;
  entityRef?: string;
}

export function buildClosingOutputs(params: {
  hasClosureSnapshot: boolean;
  ssExpedientStatus: string | null;
  fiscalExpedientStatus: string | null;
  hasIntelligenceReport: boolean;
}): ClosingOutput[] {
  const outputs: ClosingOutput[] = [];
  const now = new Date().toISOString();

  outputs.push({
    id: 'closure_snapshot',
    type: 'closure_snapshot',
    label: 'Snapshot de cierre',
    status: params.hasClosureSnapshot ? 'generated' : 'pending',
    generatedAt: params.hasClosureSnapshot ? now : null,
  });

  outputs.push({
    id: 'ss_expedient',
    type: 'ss_expedient',
    label: 'Expediente SS mensual',
    status: params.ssExpedientStatus && params.ssExpedientStatus !== 'draft' ? 'generated' : 'pending',
    generatedAt: params.ssExpedientStatus && params.ssExpedientStatus !== 'draft' ? now : null,
  });

  outputs.push({
    id: 'fiscal_expedient',
    type: 'fiscal_expedient',
    label: 'Expediente Fiscal mensual',
    status: params.fiscalExpedientStatus && params.fiscalExpedientStatus !== 'draft' ? 'generated' : 'pending',
    generatedAt: params.fiscalExpedientStatus && params.fiscalExpedientStatus !== 'draft' ? now : null,
  });

  outputs.push({
    id: 'intelligence_report',
    type: 'intelligence_report',
    label: 'Informe de inteligencia de cierre',
    status: params.hasIntelligenceReport ? 'generated' : 'pending',
    generatedAt: params.hasIntelligenceReport ? now : null,
  });

  return outputs;
}

// ── Closing timeline event (for UI display, not ledger) ──

export interface ClosingTimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  phase: MonthlyClosingPhase;
  actor?: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

export function buildPhaseTimelineEvent(
  phase: MonthlyClosingPhase,
  action: string,
  description: string,
  actor?: string,
): ClosingTimelineEvent {
  return {
    id: `${phase}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action,
    description,
    phase,
    actor,
    severity: phase === 'reopened' ? 'warning' : phase === 'completed' ? 'success' : 'info',
  };
}
