/**
 * offboardingPipelineEngine.ts — Unified offboarding pipeline
 * P2.1: Pipeline de baja unificado end-to-end
 *
 * Normalizes the offboarding lifecycle into a single, auditable pipeline
 * with transition guards, validation gates, and cross-module signaling.
 *
 * Reuses:
 * - offboardingOrchestrationEngine.ts (termination types, mappings)
 * - settlementEvidenceEngine.ts (evidence snapshots)
 * - certificaArtifactEngine.ts (certifica status)
 * - afiArtifactEngine.ts (AFI baja)
 *
 * NO Supabase, NO React — pure functions only.
 */

import type { InternalTerminationType, FiniquitoDismissalType } from './offboardingOrchestrationEngine';
import {
  mapTerminationTypeToAFIBaja,
  mapTerminationTypeToCausaBajaSEPE,
  mapTerminationTypeToFiniquito,
} from './offboardingOrchestrationEngine';

// ── Pipeline States ──

export type OffboardingPipelineState =
  | 'draft'
  | 'in_review'
  | 'approved_hr'
  | 'pending_calculation'
  | 'settlement_generated'
  | 'certificate_prepared'
  | 'pending_payment'
  | 'closed'
  | 'cancelled';

export const PIPELINE_STATE_ORDER: OffboardingPipelineState[] = [
  'draft',
  'in_review',
  'approved_hr',
  'pending_calculation',
  'settlement_generated',
  'certificate_prepared',
  'pending_payment',
  'closed',
];

export const PIPELINE_STATE_META: Record<OffboardingPipelineState, {
  label: string;
  description: string;
  stepIndex: number;
  color: string;
}> = {
  draft:                  { label: 'Borrador',              description: 'Caso de baja creado, pendiente de datos completos', stepIndex: 0, color: 'bg-slate-500/10 text-slate-700' },
  in_review:              { label: 'En revisión',           description: 'Datos completos, pendiente de aprobación RRHH', stepIndex: 1, color: 'bg-amber-500/10 text-amber-700' },
  approved_hr:            { label: 'Aprobado RRHH',         description: 'Aprobado por RRHH, pendiente de cálculos', stepIndex: 2, color: 'bg-blue-500/10 text-blue-700' },
  pending_calculation:    { label: 'Pendiente cálculo',     description: 'Calculando finiquito e indemnización', stepIndex: 3, color: 'bg-indigo-500/10 text-indigo-700' },
  settlement_generated:   { label: 'Finiquito generado',    description: 'Finiquito calculado y evidenciado', stepIndex: 4, color: 'bg-purple-500/10 text-purple-700' },
  certificate_prepared:   { label: 'Certificado preparado', description: 'Certificado de empresa y AFI baja preparados', stepIndex: 5, color: 'bg-cyan-500/10 text-cyan-700' },
  pending_payment:        { label: 'Pendiente pago',        description: 'Finiquito pendiente de pago al empleado', stepIndex: 6, color: 'bg-emerald-500/10 text-emerald-700' },
  closed:                 { label: 'Cerrado',               description: 'Caso de baja cerrado y archivado', stepIndex: 7, color: 'bg-green-600/10 text-green-800' },
  cancelled:              { label: 'Anulado',               description: 'Proceso de baja anulado', stepIndex: -1, color: 'bg-red-500/10 text-red-700' },
};

// ── Valid Transitions ──

export const PIPELINE_VALID_TRANSITIONS: Record<OffboardingPipelineState, OffboardingPipelineState[]> = {
  draft:                  ['in_review', 'cancelled'],
  in_review:              ['approved_hr', 'draft', 'cancelled'],
  approved_hr:            ['pending_calculation', 'cancelled'],
  pending_calculation:    ['settlement_generated', 'cancelled'],
  settlement_generated:   ['certificate_prepared', 'cancelled'],
  certificate_prepared:   ['pending_payment', 'cancelled'],
  pending_payment:        ['closed', 'cancelled'],
  closed:                 [],
  cancelled:              ['draft'], // allow reopen
};

export function isValidPipelineTransition(
  current: OffboardingPipelineState,
  target: OffboardingPipelineState,
): boolean {
  return PIPELINE_VALID_TRANSITIONS[current]?.includes(target) ?? false;
}

// ── Unified Case ──

export interface OffboardingCase {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;

  // Core data
  terminationType: InternalTerminationType;
  effectiveDate: string;
  reason: string;
  causaClave: string; // mapped from terminationType

  // Notice / preaviso
  noticePeriodDays: number;
  noticeGiven: boolean;
  noticeDate: string | null;

  // Vacation
  pendingVacationDays: number;
  vacationCompensationAmount: number | null;

  // Settlement
  finiquitoComputed: boolean;
  finiquitoTotal: number | null;
  finiquitoSubtotal: number | null;

  // Indemnización
  indemnizacionApplicable: boolean;
  indemnizacionAmount: number | null;
  indemnizacionDaysPerYear: number | null;
  indemnizacionLegalBasis: string | null;

  // Documents
  afiBajaGenerated: boolean;
  afiBajaStatus: string | null;
  certificaGenerated: boolean;
  certificaStatus: string | null;

  // Pipeline
  pipelineState: OffboardingPipelineState;
  legalReviewRequired: boolean;

  // Payroll impact
  payrollPeriodId: string | null;
  payrollImpactRegistered: boolean;

  // Observations
  observations: string;

  // Timeline
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

// ── Transition Guards ──

export interface TransitionGuardResult {
  allowed: boolean;
  blockers: string[];
}

export function evaluateTransitionGuard(
  caseData: OffboardingCase,
  targetState: OffboardingPipelineState,
): TransitionGuardResult {
  const blockers: string[] = [];

  // Base: must be a valid transition
  if (!isValidPipelineTransition(caseData.pipelineState, targetState)) {
    blockers.push(`Transición no válida: ${caseData.pipelineState} → ${targetState}`);
    return { allowed: false, blockers };
  }

  switch (targetState) {
    case 'in_review':
      if (!caseData.effectiveDate) blockers.push('Fecha efectiva de baja requerida');
      if (!caseData.terminationType) blockers.push('Tipo de extinción requerido');
      break;

    case 'approved_hr':
      if (!caseData.effectiveDate) blockers.push('Fecha efectiva requerida');
      if (caseData.legalReviewRequired && !caseData.observations) {
        blockers.push('Caso con revisión legal requiere observaciones');
      }
      break;

    case 'pending_calculation':
      // No extra guards — approved_hr is sufficient
      break;

    case 'settlement_generated':
      if (!caseData.finiquitoComputed) blockers.push('Finiquito no calculado');
      if (caseData.finiquitoTotal === null) blockers.push('Total de finiquito no disponible');
      break;

    case 'certificate_prepared':
      if (!caseData.finiquitoComputed) blockers.push('Finiquito no calculado');
      // AFI and certifica are prepared in this step, not required beforehand
      break;

    case 'pending_payment':
      if (!caseData.finiquitoComputed) blockers.push('Finiquito no calculado');
      // certificado is not blocking payment
      break;

    case 'closed':
      if (!caseData.finiquitoComputed) blockers.push('Finiquito no calculado');
      if (!caseData.effectiveDate) blockers.push('Fecha efectiva requerida para cierre');
      break;

    case 'cancelled':
      // Always allowed from valid source states
      break;
  }

  return { allowed: blockers.length === 0, blockers };
}

// ── Pipeline Checklist ──

export interface PipelineChecklistItem {
  key: string;
  label: string;
  completed: boolean;
  required: boolean;
  detail?: string;
  relatedState: OffboardingPipelineState;
}

export function computePipelineChecklist(caseData: OffboardingCase): {
  items: PipelineChecklistItem[];
  completedCount: number;
  totalRequired: number;
  readinessPercent: number;
} {
  const items: PipelineChecklistItem[] = [
    {
      key: 'termination_type',
      label: 'Tipo de extinción definido',
      completed: !!caseData.terminationType,
      required: true,
      relatedState: 'draft',
    },
    {
      key: 'effective_date',
      label: 'Fecha efectiva de baja',
      completed: !!caseData.effectiveDate,
      required: true,
      relatedState: 'draft',
    },
    {
      key: 'notice_period',
      label: 'Preaviso gestionado',
      completed: caseData.noticeGiven || caseData.noticePeriodDays === 0,
      required: caseData.noticePeriodDays > 0,
      detail: caseData.noticeGiven ? `Preaviso dado el ${caseData.noticeDate}` : `${caseData.noticePeriodDays} días de preaviso pendiente`,
      relatedState: 'in_review',
    },
    {
      key: 'hr_approval',
      label: 'Aprobación RRHH',
      completed: PIPELINE_STATE_ORDER.indexOf(caseData.pipelineState) >= PIPELINE_STATE_ORDER.indexOf('approved_hr'),
      required: true,
      relatedState: 'approved_hr',
    },
    {
      key: 'finiquito',
      label: 'Finiquito calculado',
      completed: caseData.finiquitoComputed,
      required: true,
      detail: caseData.finiquitoTotal !== null ? `€${caseData.finiquitoTotal.toLocaleString('es-ES')}` : undefined,
      relatedState: 'settlement_generated',
    },
    {
      key: 'indemnizacion',
      label: 'Indemnización calculada',
      completed: !caseData.indemnizacionApplicable || caseData.indemnizacionAmount !== null,
      required: caseData.indemnizacionApplicable,
      detail: caseData.indemnizacionLegalBasis ?? (caseData.indemnizacionApplicable ? 'Pendiente' : 'No aplica'),
      relatedState: 'settlement_generated',
    },
    {
      key: 'vacation_pending',
      label: 'Vacaciones pendientes resueltas',
      completed: caseData.pendingVacationDays === 0 || caseData.vacationCompensationAmount !== null,
      required: caseData.pendingVacationDays > 0,
      detail: caseData.pendingVacationDays > 0 ? `${caseData.pendingVacationDays} días pendientes` : 'Sin vacaciones pendientes',
      relatedState: 'settlement_generated',
    },
    {
      key: 'afi_baja',
      label: 'AFI de baja preparada',
      completed: caseData.afiBajaGenerated,
      required: true,
      detail: caseData.afiBajaStatus ?? undefined,
      relatedState: 'certificate_prepared',
    },
    {
      key: 'certifica',
      label: 'Certificado empresa preparado',
      completed: caseData.certificaGenerated,
      required: true,
      detail: caseData.certificaStatus ?? undefined,
      relatedState: 'certificate_prepared',
    },
    {
      key: 'payroll_impact',
      label: 'Impacto en nómina registrado',
      completed: caseData.payrollImpactRegistered,
      required: true,
      detail: caseData.payrollPeriodId ? `Periodo: ${caseData.payrollPeriodId}` : 'Sin periodo asignado',
      relatedState: 'pending_payment',
    },
    {
      key: 'payment',
      label: 'Pago ejecutado',
      completed: caseData.pipelineState === 'closed',
      required: true,
      relatedState: 'closed',
    },
  ];

  const requiredItems = items.filter(i => i.required);
  const completedRequired = requiredItems.filter(i => i.completed).length;

  return {
    items,
    completedCount: items.filter(i => i.completed).length,
    totalRequired: requiredItems.length,
    readinessPercent: requiredItems.length > 0
      ? Math.round((completedRequired / requiredItems.length) * 100)
      : 0,
  };
}

// ── Cross-Module Signals ──

export interface OffboardingSignals {
  // HR
  employeeStatusChange: 'active' | 'leaving' | 'terminated';
  contractEndRequired: boolean;

  // Payroll
  finalPayrollRequired: boolean;
  extraPayProration: boolean;
  vacationLiquidation: boolean;

  // Fiscal
  irpfRegularization: boolean;

  // Compliance
  afiBajaRequired: boolean;
  certificaRequired: boolean;
  sepeNotificationRequired: boolean;

  // Audit
  evidenceSnapshotRequired: boolean;
  ledgerEventRequired: boolean;
}

export function deriveOffboardingSignals(caseData: OffboardingCase): OffboardingSignals {
  const stateIndex = PIPELINE_STATE_ORDER.indexOf(caseData.pipelineState);

  return {
    employeeStatusChange: stateIndex >= PIPELINE_STATE_ORDER.indexOf('approved_hr')
      ? (caseData.pipelineState === 'closed' ? 'terminated' : 'leaving')
      : 'active',
    contractEndRequired: stateIndex >= PIPELINE_STATE_ORDER.indexOf('approved_hr'),
    finalPayrollRequired: stateIndex >= PIPELINE_STATE_ORDER.indexOf('settlement_generated'),
    extraPayProration: true, // always prorate extra pay on termination
    vacationLiquidation: caseData.pendingVacationDays > 0,
    irpfRegularization: stateIndex >= PIPELINE_STATE_ORDER.indexOf('settlement_generated'),
    afiBajaRequired: true,
    certificaRequired: true,
    sepeNotificationRequired: caseData.terminationType !== 'voluntary',
    evidenceSnapshotRequired: stateIndex >= PIPELINE_STATE_ORDER.indexOf('settlement_generated'),
    ledgerEventRequired: true,
  };
}

// ── Notice Period Helper ──

const NOTICE_PERIOD_DAYS: Partial<Record<InternalTerminationType, number>> = {
  voluntary: 15,
  objective: 15,
  collective: 30,
  end_contract: 15,
  retirement: 15,
};

export function getDefaultNoticePeriod(type: InternalTerminationType): number {
  return NOTICE_PERIOD_DAYS[type] ?? 0;
}

// ── Indemnización Applicability ──

export function isIndemnizacionApplicable(type: InternalTerminationType): boolean {
  return ['objective', 'disciplinary', 'collective', 'end_contract', 'mutual'].includes(type);
}

// ── Timeline Event ──

export interface PipelineTimelineEvent {
  timestamp: string;
  state: OffboardingPipelineState;
  label: string;
  detail?: string;
  actor?: string;
}

export function buildTimelineEvent(
  state: OffboardingPipelineState,
  detail?: string,
  actor?: string,
): PipelineTimelineEvent {
  return {
    timestamp: new Date().toISOString(),
    state,
    label: PIPELINE_STATE_META[state].label,
    detail,
    actor,
  };
}

// ── Factory ──

export function createOffboardingCase(params: {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  terminationType: InternalTerminationType;
  effectiveDate: string;
  reason?: string;
  legalReviewRequired?: boolean;
}): OffboardingCase {
  const noticeDays = getDefaultNoticePeriod(params.terminationType);

  return {
    id: params.id,
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    companyId: params.companyId,
    terminationType: params.terminationType,
    effectiveDate: params.effectiveDate,
    reason: params.reason ?? '',
    causaClave: mapTerminationTypeToCausaBajaSEPE(params.terminationType),
    noticePeriodDays: noticeDays,
    noticeGiven: false,
    noticeDate: null,
    pendingVacationDays: 0,
    vacationCompensationAmount: null,
    finiquitoComputed: false,
    finiquitoTotal: null,
    finiquitoSubtotal: null,
    indemnizacionApplicable: isIndemnizacionApplicable(params.terminationType),
    indemnizacionAmount: null,
    indemnizacionDaysPerYear: null,
    indemnizacionLegalBasis: null,
    afiBajaGenerated: false,
    afiBajaStatus: null,
    certificaGenerated: false,
    certificaStatus: null,
    pipelineState: 'draft',
    legalReviewRequired: params.legalReviewRequired ?? false,
    payrollPeriodId: null,
    payrollImpactRegistered: false,
    observations: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedAt: null,
  };
}
