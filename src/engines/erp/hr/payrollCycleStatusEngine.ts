/**
 * payrollCycleStatusEngine.ts — P1.3
 * Pure engine: derives unified payroll cycle phase from existing data.
 * No side-effects, no fetch — deterministic functions only.
 */

// ── Types ──

export type PayrollCyclePhase =
  | 'collecting_inputs'
  | 'ready_to_calculate'
  | 'calculated'
  | 'validated'
  | 'ready_to_close'
  | 'closed'
  | 'paid'
  | 'archived';

export interface PayrollCycleInput {
  periodStatus: string;
  incidentCounts: { total: number; pending: number; validated: number; applied: number; cancelled: number };
  latestRunStatus: string | null;
  preCloseBlockers: number;
  preCloseWarnings: number;
  paymentStatus: PaymentPhase;
}

export type PaymentPhase = 'not_applicable' | 'pending' | 'partial' | 'paid';

export interface PayrollCycleSummary {
  phase: PayrollCyclePhase;
  phaseLabel: string;
  phaseColor: string;
  incidentReadiness: IncidentReadiness;
  calculationDone: boolean;
  validationScore: number | null;
  paymentPhase: PaymentPhase;
  blockers: string[];
  caseCoverage: CaseCoverageResult;
}

export interface IncidentReadiness {
  total: number;
  pending: number;
  validated: number;
  applied: number;
  isReady: boolean;
}

// ── Phase labels ──

export const CYCLE_PHASE_META: Record<PayrollCyclePhase, { label: string; color: string; stepIndex: number }> = {
  collecting_inputs:  { label: 'Recogida de incidencias',  color: 'bg-blue-500/10 text-blue-700',    stepIndex: 0 },
  ready_to_calculate: { label: 'Listo para calcular',      color: 'bg-indigo-500/10 text-indigo-700', stepIndex: 1 },
  calculated:         { label: 'Calculado',                color: 'bg-cyan-500/10 text-cyan-700',     stepIndex: 2 },
  validated:          { label: 'Validado',                 color: 'bg-emerald-500/10 text-emerald-700', stepIndex: 2 },
  ready_to_close:     { label: 'Listo para cerrar',       color: 'bg-green-500/10 text-green-700',   stepIndex: 3 },
  closed:             { label: 'Cerrado',                  color: 'bg-primary/10 text-primary',       stepIndex: 4 },
  paid:               { label: 'Pagado',                   color: 'bg-emerald-600/10 text-emerald-700', stepIndex: 5 },
  archived:           { label: 'Archivado',                color: 'bg-muted text-muted-foreground',   stepIndex: 5 },
};

// ── Phase derivation ──

export function derivePayrollCyclePhase(input: PayrollCycleInput): PayrollCyclePhase {
  const { periodStatus, incidentCounts, latestRunStatus, preCloseBlockers, paymentStatus } = input;

  // Terminal states
  if (periodStatus === 'locked') {
    return paymentStatus === 'paid' ? 'paid' : 'closed';
  }
  if (periodStatus === 'closed') {
    if (paymentStatus === 'paid') return 'paid';
    return 'closed';
  }

  // Pre-close validated
  if ((periodStatus === 'reviewing' || periodStatus === 'calculated') && preCloseBlockers === 0 && latestRunStatus === 'approved') {
    return 'ready_to_close';
  }

  // Validated (run approved or reviewed)
  if (latestRunStatus === 'approved' || latestRunStatus === 'reviewed') {
    return 'validated';
  }

  // Calculated
  if (latestRunStatus === 'calculated') {
    return 'calculated';
  }

  // Ready to calculate: all incidents validated or applied, none pending
  if (incidentCounts.pending === 0 && (incidentCounts.validated > 0 || incidentCounts.applied > 0 || incidentCounts.total === 0)) {
    return 'ready_to_calculate';
  }

  return 'collecting_inputs';
}

// ── Case coverage ──

export type PayrollCaseType =
  | 'solo_tabla_salarial'
  | 'tabla_con_incidencias'
  | 'pnr'
  | 'suspension'
  | 'it_cc'
  | 'it_at'
  | 'paternidad_maternidad';

export interface CaseCoverageItem {
  caseType: PayrollCaseType;
  label: string;
  description: string;
  isSupported: boolean;
  supportLevel: 'full' | 'partial' | 'engine_ready';
}

export interface CaseCoverageResult {
  cases: CaseCoverageItem[];
  supported: number;
  total: number;
}

/**
 * Evaluates which of the 7 mandatory payroll cases are supported by the system.
 * This is a static assessment based on known engine capabilities.
 */
export function evaluateCaseCoverage(): CaseCoverageResult {
  const cases: CaseCoverageItem[] = [
    {
      caseType: 'solo_tabla_salarial',
      label: 'Solo tabla salarial',
      description: 'Nómina con conceptos fijos de tabla, sin incidencias',
      isSupported: true,
      supportLevel: 'full',
    },
    {
      caseType: 'tabla_con_incidencias',
      label: 'Tabla salarial + incidencias',
      description: 'Conceptos fijos más variables/horas extra/bonus',
      isSupported: true,
      supportLevel: 'full',
    },
    {
      caseType: 'pnr',
      label: 'Permiso No Retribuido (PNR)',
      description: 'Ausencia sin retribución con descuento proporcional',
      isSupported: true,
      supportLevel: 'full',
    },
    {
      caseType: 'suspension',
      label: 'Suspensión de empleo y sueldo',
      description: 'Suspensión disciplinaria o regulatoria',
      isSupported: true,
      supportLevel: 'engine_ready',
    },
    {
      caseType: 'it_cc',
      label: 'Incapacidad Temporal (Contingencia Común)',
      description: 'Baja médica por enfermedad común con FDI',
      isSupported: true,
      supportLevel: 'full',
    },
    {
      caseType: 'it_at',
      label: 'Incapacidad Temporal (Accidente de Trabajo)',
      description: 'Baja por accidente laboral con base reguladora AT',
      isSupported: true,
      supportLevel: 'full',
    },
    {
      caseType: 'paternidad_maternidad',
      label: 'Paternidad / Maternidad',
      description: 'Permiso con pago directo por la Seguridad Social',
      isSupported: true,
      supportLevel: 'partial',
    },
  ];

  return {
    cases,
    supported: cases.filter(c => c.isSupported).length,
    total: cases.length,
  };
}

// ── Cycle summary builder ──

export function buildCycleSummary(input: PayrollCycleInput): PayrollCycleSummary {
  const phase = derivePayrollCyclePhase(input);
  const meta = CYCLE_PHASE_META[phase];

  const incidentReadiness: IncidentReadiness = {
    total: input.incidentCounts.total,
    pending: input.incidentCounts.pending,
    validated: input.incidentCounts.validated,
    applied: input.incidentCounts.applied,
    isReady: input.incidentCounts.pending === 0,
  };

  const blockers: string[] = [];
  if (input.incidentCounts.pending > 0) {
    blockers.push(`${input.incidentCounts.pending} incidencia(s) pendiente(s) de validar`);
  }
  if (input.preCloseBlockers > 0) {
    blockers.push(`${input.preCloseBlockers} validación(es) de pre-cierre bloqueante(s)`);
  }

  const totalChecks = input.preCloseBlockers + input.preCloseWarnings;
  const validationScore = totalChecks > 0 ? Math.round(((totalChecks - input.preCloseBlockers) / totalChecks) * 100) : null;

  return {
    phase,
    phaseLabel: meta.label,
    phaseColor: meta.color,
    incidentReadiness,
    calculationDone: ['calculated', 'reviewed', 'approved'].includes(input.latestRunStatus ?? ''),
    validationScore,
    paymentPhase: input.paymentStatus,
    blockers,
    caseCoverage: evaluateCaseCoverage(),
  };
}
