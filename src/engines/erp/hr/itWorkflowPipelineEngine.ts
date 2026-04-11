/**
 * itWorkflowPipelineEngine.ts — Unified IT workflow pipeline
 * P2.2: Workflow IT completo + FDI
 *
 * Normalizes the IT (Incapacidad Temporal) lifecycle into a single,
 * auditable pipeline with transition guards, validation gates,
 * cross-module signaling, checklist, timeline, and FDI integration.
 *
 * Reuses:
 * - it-engine.ts (subsidy rules, milestones, base reguladora)
 * - fdiArtifactEngine.ts (FDI artifact generation)
 * - afiInactivityEngine.ts (AFI inactivity artifacts)
 * - useHRITProcesses.ts (CRUD hooks)
 *
 * NO Supabase, NO React — pure functions only.
 */

import type { HRITProcess, HRITPart, HRITBase, ITProcessType } from '@/types/hr';
import { calculateMilestones, getSubsidyPercentage, getProcessAlerts } from '@/lib/hr/it-engine';
import type { FDIType, FDIArtifact } from './fdiArtifactEngine';

// ── Pipeline States ──

export type ITPipelineState =
  | 'communicated'       // Parte de baja recibido, caso abierto
  | 'active'             // En curso, partes de confirmación llegando
  | 'review_pending'     // Revisión médica / INSS pendiente
  | 'relapsed'           // Recaída vinculada a proceso anterior
  | 'medical_discharge'  // Alta médica recibida
  | 'closed'             // Caso cerrado, nómina ajustada
  | 'cancelled';         // Anulado

export const IT_PIPELINE_STATE_ORDER: ITPipelineState[] = [
  'communicated',
  'active',
  'review_pending',
  'medical_discharge',
  'closed',
];

export const IT_PIPELINE_STATE_META: Record<ITPipelineState, {
  label: string;
  description: string;
  stepIndex: number;
  color: string;
}> = {
  communicated:      { label: 'Comunicada',         description: 'Parte de baja recibido, caso registrado', stepIndex: 0, color: 'bg-amber-500/10 text-amber-700' },
  active:            { label: 'En curso',            description: 'Proceso activo, partes de confirmación registrándose', stepIndex: 1, color: 'bg-blue-500/10 text-blue-700' },
  review_pending:    { label: 'Revisión pendiente',  description: 'Pendiente de revisión médica o INSS', stepIndex: 2, color: 'bg-indigo-500/10 text-indigo-700' },
  relapsed:          { label: 'Recaída',             description: 'Recaída vinculada a proceso anterior', stepIndex: -1, color: 'bg-red-500/10 text-red-700' },
  medical_discharge: { label: 'Alta médica',         description: 'Alta médica recibida, pendiente ajuste nómina', stepIndex: 3, color: 'bg-emerald-500/10 text-emerald-700' },
  closed:            { label: 'Cerrada',             description: 'Caso cerrado y archivado', stepIndex: 4, color: 'bg-green-600/10 text-green-800' },
  cancelled:         { label: 'Anulada',             description: 'Proceso anulado', stepIndex: -1, color: 'bg-red-500/10 text-red-700' },
};

// ── Valid Transitions ──

export const IT_PIPELINE_VALID_TRANSITIONS: Record<ITPipelineState, ITPipelineState[]> = {
  communicated:      ['active', 'cancelled'],
  active:            ['review_pending', 'medical_discharge', 'relapsed', 'cancelled'],
  review_pending:    ['active', 'medical_discharge', 'cancelled'],
  relapsed:          ['active', 'medical_discharge', 'cancelled'],
  medical_discharge: ['closed', 'relapsed', 'cancelled'],
  closed:            [],
  cancelled:         ['communicated'],
};

export function isValidITTransition(current: ITPipelineState, target: ITPipelineState): boolean {
  return (IT_PIPELINE_VALID_TRANSITIONS[current] ?? []).includes(target);
}

// ── Transition Guards ──

export interface ITTransitionGuardResult {
  allowed: boolean;
  blockers: string[];
  warnings: string[];
}

export interface ITPipelineCaseData {
  process: HRITProcess;
  parts: HRITPart[];
  bases: HRITBase[];
  fdiArtifacts: FDIArtifact[];
  pipelineState: ITPipelineState;
}

export function evaluateITTransitionGuard(
  caseData: ITPipelineCaseData,
  targetState: ITPipelineState,
): ITTransitionGuardResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const { process, parts, bases, fdiArtifacts, pipelineState } = caseData;

  if (!isValidITTransition(pipelineState, targetState)) {
    blockers.push(`Transición ${pipelineState} → ${targetState} no permitida`);
    return { allowed: false, blockers, warnings };
  }

  // communicated → active: must have at least baja part
  if (targetState === 'active') {
    const hasBaja = parts.some(p => p.part_type === 'baja');
    if (!hasBaja) blockers.push('Se requiere parte de baja para activar el proceso');
  }

  // → medical_discharge: must have alta part
  if (targetState === 'medical_discharge') {
    const hasAlta = parts.some(p => p.part_type === 'alta' || p.part_type === 'alta_propuesta');
    if (!hasAlta) blockers.push('Se requiere parte de alta médica');
    if (!process.end_date) warnings.push('Fecha de fin no registrada en el proceso');
  }

  // → closed: must have base calculated, alta part, end_date
  if (targetState === 'closed') {
    if (bases.length === 0) blockers.push('Base reguladora no calculada');
    if (!process.end_date) blockers.push('Fecha de fin no registrada');
    const hasAlta = parts.some(p => p.part_type === 'alta' || p.part_type === 'alta_propuesta');
    if (!hasAlta) blockers.push('Parte de alta no registrado');
    // FDI baja should exist
    const hasFdiBaja = fdiArtifacts.some(a => a.type === 'baja_it' || a.type === 'baja_at');
    if (!hasFdiBaja) warnings.push('FDI de baja no generado — recomendado antes de cierre');
  }

  // → relapsed: must set relapse_of_id
  if (targetState === 'relapsed') {
    if (!process.has_relapse && !process.relapse_of_id) {
      warnings.push('No se ha vinculado proceso original de recaída');
    }
  }

  return { allowed: blockers.length === 0, blockers, warnings };
}

// ── Checklist ──

export interface ITChecklistItem {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  required: boolean;
  category: 'medical' | 'administrative' | 'payroll' | 'fdi' | 'documentary';
  norm?: string;
}

export function deriveITChecklist(caseData: ITPipelineCaseData): ITChecklistItem[] {
  const { process, parts, bases, fdiArtifacts } = caseData;
  const hasBaja = parts.some(p => p.part_type === 'baja');
  const hasAlta = parts.some(p => p.part_type === 'alta' || p.part_type === 'alta_propuesta');
  const hasConfirmation = parts.some(p => p.part_type === 'confirmacion');
  const hasBase = bases.length > 0;
  const hasFdiBaja = fdiArtifacts.some(a => a.type === 'baja_it' || a.type === 'baja_at');
  const hasFdiAlta = fdiArtifacts.some(a => a.type === 'alta_it' || a.type === 'alta_at');

  return [
    {
      key: 'parte_baja', label: 'Parte de baja recibido', description: 'Registrar parte médico de baja',
      completed: hasBaja, required: true, category: 'medical', norm: 'RD 625/2014 Art. 2',
    },
    {
      key: 'fdi_baja', label: 'FDI de baja generado', description: 'Generar fichero FDI de comunicación de baja a INSS',
      completed: hasFdiBaja, required: true, category: 'fdi', norm: 'Orden ESS/1187/2015',
    },
    {
      key: 'base_calculated', label: 'Base reguladora calculada', description: 'Calcular base reguladora según contingencia',
      completed: hasBase, required: true, category: 'payroll', norm: 'LGSS Art. 169-171',
    },
    {
      key: 'confirmation_part', label: 'Parte de confirmación', description: 'Registrar parte(s) de confirmación según clasificación',
      completed: hasConfirmation, required: process.status === 'active', category: 'medical', norm: 'RD 625/2014 Art. 2',
    },
    {
      key: 'payroll_adjusted', label: 'Nómina ajustada', description: 'Ajustar nómina con días IT, prestación y complemento empresa',
      completed: false, required: true, category: 'payroll',
    },
    {
      key: 'parte_alta', label: 'Parte de alta recibido', description: 'Registrar parte médico de alta',
      completed: hasAlta, required: false, category: 'medical', norm: 'RD 625/2014 Art. 4',
    },
    {
      key: 'fdi_alta', label: 'FDI de alta generado', description: 'Generar fichero FDI de comunicación de alta a INSS',
      completed: hasFdiAlta, required: false, category: 'fdi', norm: 'Orden ESS/1187/2015',
    },
    {
      key: 'end_date_set', label: 'Fecha de fin registrada', description: 'Registrar fecha de fin del proceso IT',
      completed: !!process.end_date, required: false, category: 'administrative',
    },
  ];
}

// ── Timeline Events ──

export interface ITTimelineEvent {
  date: string;
  type: 'state_change' | 'part_received' | 'base_calculated' | 'fdi_generated' | 'milestone' | 'alert' | 'payroll_impact';
  label: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  metadata?: Record<string, unknown>;
}

export function buildITTimeline(caseData: ITPipelineCaseData): ITTimelineEvent[] {
  const { process, parts, bases } = caseData;
  const events: ITTimelineEvent[] = [];

  // Process creation
  events.push({
    date: process.created_at,
    type: 'state_change',
    label: 'Proceso IT creado',
    description: `Tipo: ${process.process_type}, inicio: ${process.start_date}`,
    severity: 'info',
  });

  // Parts
  for (const part of parts) {
    events.push({
      date: part.issue_date,
      type: 'part_received',
      label: `Parte de ${part.part_type} recibido`,
      description: `Parte #${part.part_number ?? '—'}, emisión: ${part.issue_date}`,
      severity: 'info',
    });
  }

  // Bases
  for (const base of bases) {
    events.push({
      date: base.calculation_date,
      type: 'base_calculated',
      label: 'Base reguladora calculada',
      description: `Base: ${base.total_base_reguladora}€/día, subsidio: ${base.pct_subsidy}%`,
      severity: 'info',
    });
  }

  // Milestones
  const milestones = calculateMilestones(process.start_date);
  for (const m of milestones.detailedMilestones) {
    if (m.reached) {
      events.push({
        date: m.date,
        type: 'milestone',
        label: m.label,
        description: m.description,
        severity: m.day >= 365 ? 'critical' : m.day >= 180 ? 'warning' : 'info',
      });
    }
  }

  // Alerts
  const alerts = getProcessAlerts(process);
  for (const alert of alerts) {
    events.push({
      date: new Date().toISOString(),
      type: 'alert',
      label: alert.code,
      description: alert.message,
      severity: alert.type === 'critical' ? 'critical' : alert.type === 'warning' ? 'warning' : 'info',
    });
  }

  // End date
  if (process.end_date) {
    events.push({
      date: process.end_date,
      type: 'state_change',
      label: 'Alta médica / fin de proceso',
      description: `Proceso cerrado el ${process.end_date}`,
      severity: 'info',
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// ── Cross-module Signals ──

export interface ITCrossModuleSignals {
  hr: {
    employee_on_leave: boolean;
    leave_type: string;
    expected_return: string | null;
  };
  payroll: {
    days_affected: number;
    subsidy_percentage: number;
    subsidy_payer: string;
    employer_complement: number;
    base_reguladora: number;
    split_month: boolean;
    gross_impact_estimated: number;
  };
  fiscal: {
    ss_deduction_adjustment: boolean;
    irpf_recalculation: boolean;
  };
  compliance: {
    fdi_pending: boolean;
    milestone_alerts: number;
    documentation_gaps: string[];
    overdue_confirmations: boolean;
  };
  reporting: {
    process_count_active: number;
    average_duration_days: number;
    employer_cost_monthly: number;
  };
}

export function deriveITCrossModuleSignals(
  caseData: ITPipelineCaseData,
  allProcesses?: HRITProcess[],
): ITCrossModuleSignals {
  const { process, parts, bases, fdiArtifacts } = caseData;
  const milestones = calculateMilestones(process.start_date);
  const alerts = getProcessAlerts(process);
  const latestBase = bases.length > 0 ? bases[bases.length - 1] : null;
  const subsidy = getSubsidyPercentage(process.process_type as any, milestones.daysElapsed);

  const hasFdiBaja = fdiArtifacts.some(a => a.type === 'baja_it' || a.type === 'baja_at');
  const hasFdiAlta = fdiArtifacts.some(a => a.type === 'alta_it' || a.type === 'alta_at');

  // Check overdue confirmations
  const lastConfirmation = parts
    .filter(p => p.part_type === 'confirmacion')
    .sort((a, b) => b.issue_date.localeCompare(a.issue_date))[0];
  const overdue = lastConfirmation?.next_review_date
    ? new Date(lastConfirmation.next_review_date) < new Date()
    : false;

  // Documentation gaps
  const docGaps: string[] = [];
  if (!hasFdiBaja) docGaps.push('FDI baja no generado');
  if (process.end_date && !hasFdiAlta) docGaps.push('FDI alta no generado');
  if (parts.length === 0) docGaps.push('Sin partes registrados');

  // Active processes for reporting
  const activeProcesses = allProcesses?.filter(p => p.status === 'active') ?? [];
  const avgDuration = activeProcesses.length > 0
    ? activeProcesses.reduce((sum, p) => sum + calculateMilestones(p.start_date).daysElapsed, 0) / activeProcesses.length
    : milestones.daysElapsed;

  const monthlyComplement = latestBase
    ? (latestBase.employer_complement ?? 0) * 30
    : 0;

  return {
    hr: {
      employee_on_leave: process.status === 'active' || process.status === 'extended',
      leave_type: process.process_type,
      expected_return: process.expected_end_date,
    },
    payroll: {
      days_affected: milestones.daysElapsed,
      subsidy_percentage: subsidy.percentage,
      subsidy_payer: subsidy.payer,
      employer_complement: latestBase?.employer_complement ?? 0,
      base_reguladora: latestBase?.total_base_reguladora ?? 0,
      split_month: milestones.daysElapsed < 30,
      gross_impact_estimated: latestBase
        ? Math.round(latestBase.daily_subsidy * Math.min(milestones.daysElapsed, 30) * 100) / 100
        : 0,
    },
    fiscal: {
      ss_deduction_adjustment: process.status === 'active',
      irpf_recalculation: milestones.daysElapsed > 30,
    },
    compliance: {
      fdi_pending: !hasFdiBaja || (!!process.end_date && !hasFdiAlta),
      milestone_alerts: alerts.length,
      documentation_gaps: docGaps,
      overdue_confirmations: overdue,
    },
    reporting: {
      process_count_active: activeProcesses.length || 1,
      average_duration_days: Math.round(avgDuration),
      employer_cost_monthly: monthlyComplement,
    },
  };
}

// ── Payroll Impact Calculator ──

export interface ITPayrollImpact {
  daysWorked: number;
  daysIT: number;
  subsidyDaily: number;
  subsidyTotal: number;
  employerComplementDaily: number;
  employerComplementTotal: number;
  grossReduction: number;
  ssAdjustment: number;
  netImpactEstimate: number;
  method: string;
  norm: string;
}

export function calculateITPayrollImpact(params: {
  process: HRITProcess;
  base: HRITBase | null;
  periodDays: number;
  periodStartDate: string;
  periodEndDate: string;
  grossSalaryMonthly: number;
}): ITPayrollImpact {
  const { process, base, periodDays, grossSalaryMonthly } = params;
  if (!base) {
    return {
      daysWorked: periodDays, daysIT: 0, subsidyDaily: 0, subsidyTotal: 0,
      employerComplementDaily: 0, employerComplementTotal: 0, grossReduction: 0,
      ssAdjustment: 0, netImpactEstimate: 0, method: 'no_base', norm: 'N/A',
    };
  }

  const periodStart = new Date(params.periodStartDate);
  const periodEnd = new Date(params.periodEndDate);
  const itStart = new Date(process.start_date);
  const itEnd = process.end_date ? new Date(process.end_date) : periodEnd;

  const effectiveStart = itStart > periodStart ? itStart : periodStart;
  const effectiveEnd = itEnd < periodEnd ? itEnd : periodEnd;
  const daysIT = Math.max(0, Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const daysWorked = periodDays - daysIT;

  const subsidyDaily = base.daily_subsidy ?? 0;
  const complementDaily = base.employer_complement ?? 0;
  const dailySalary = grossSalaryMonthly / periodDays;

  return {
    daysWorked,
    daysIT,
    subsidyDaily,
    subsidyTotal: Math.round(subsidyDaily * daysIT * 100) / 100,
    employerComplementDaily: complementDaily,
    employerComplementTotal: Math.round(complementDaily * daysIT * 100) / 100,
    grossReduction: Math.round(dailySalary * daysIT * 100) / 100,
    ssAdjustment: Math.round((dailySalary - subsidyDaily - complementDaily) * daysIT * 100) / 100,
    netImpactEstimate: Math.round((subsidyDaily + complementDaily - dailySalary) * daysIT * 100) / 100,
    method: `IT ${process.process_type} — ${daysIT} días en período`,
    norm: 'LGSS Arts. 169-176',
  };
}

// ── FDI Checklist ──

export interface FDIChecklistItem {
  fdiType: FDIType;
  label: string;
  required: boolean;
  generated: boolean;
  status: FDIArtifact['status'] | 'not_generated';
  plazo: string;
  norm: string;
}

export function deriveFDIChecklist(caseData: ITPipelineCaseData): FDIChecklistItem[] {
  const { process, fdiArtifacts } = caseData;
  const isAT = process.process_type === 'AT';
  const bajaType: FDIType = isAT ? 'baja_at' : 'baja_it';
  const altaType: FDIType = isAT ? 'alta_at' : 'alta_it';

  const fdiBaja = fdiArtifacts.find(a => a.type === bajaType);
  const fdiAlta = fdiArtifacts.find(a => a.type === altaType);
  const fdiConf = fdiArtifacts.find(a => a.type === 'confirmacion_it');
  const fdiRecaida = fdiArtifacts.find(a => a.type === 'recaida');

  const items: FDIChecklistItem[] = [
    {
      fdiType: bajaType, label: `FDI Baja ${isAT ? 'AT' : 'IT'}`,
      required: true, generated: !!fdiBaja, status: fdiBaja?.status ?? 'not_generated',
      plazo: 'Inmediato tras recepción del parte', norm: 'Orden ESS/1187/2015',
    },
    {
      fdiType: 'confirmacion_it', label: 'FDI Confirmación',
      required: process.status === 'active', generated: !!fdiConf, status: fdiConf?.status ?? 'not_generated',
      plazo: '5 días hábiles', norm: 'RD 625/2014 Art. 2',
    },
    {
      fdiType: altaType, label: `FDI Alta ${isAT ? 'AT' : 'IT'}`,
      required: !!process.end_date, generated: !!fdiAlta, status: fdiAlta?.status ?? 'not_generated',
      plazo: 'Inmediato tras recepción del parte', norm: 'Orden ESS/1187/2015',
    },
  ];

  if (process.has_relapse) {
    items.push({
      fdiType: 'recaida', label: 'FDI Recaída',
      required: true, generated: !!fdiRecaida, status: fdiRecaida?.status ?? 'not_generated',
      plazo: 'Inmediato', norm: 'LGSS Art. 169',
    });
  }

  return items;
}

// ── IT Reporting Aggregates ──

export interface ITReportingKPIs {
  totalActive: number;
  totalClosed: number;
  totalRelapsed: number;
  averageDurationDays: number;
  totalEmployerCostMonthly: number;
  totalSubsidyMonthly: number;
  byType: Record<string, number>;
  pendingFDI: number;
  overdueConfirmations: number;
  milestoneAlerts: number;
}

export function calculateITReportingKPIs(
  processes: HRITProcess[],
  bases: HRITBase[],
): ITReportingKPIs {
  const active = processes.filter(p => p.status === 'active');
  const closed = processes.filter(p => p.status === 'closed');
  const relapsed = processes.filter(p => p.status === 'relapsed' || p.has_relapse);

  const durations = active.map(p => calculateMilestones(p.start_date).daysElapsed);
  const avgDuration = durations.length > 0
    ? durations.reduce((s, d) => s + d, 0) / durations.length
    : 0;

  const byType: Record<string, number> = {};
  for (const p of processes) {
    byType[p.process_type] = (byType[p.process_type] ?? 0) + 1;
  }

  // Employer cost from bases
  const activeBaseMap = new Map<string, HRITBase>();
  for (const b of bases) {
    activeBaseMap.set(b.process_id, b);
  }
  let totalEmployerCost = 0;
  let totalSubsidy = 0;
  for (const p of active) {
    const b = activeBaseMap.get(p.id);
    if (b) {
      totalEmployerCost += (b.employer_complement ?? 0) * 30;
      totalSubsidy += (b.daily_subsidy ?? 0) * 30;
    }
  }

  // Milestone alerts
  let milestoneAlerts = 0;
  for (const p of active) {
    milestoneAlerts += getProcessAlerts(p).length;
  }

  return {
    totalActive: active.length,
    totalClosed: closed.length,
    totalRelapsed: relapsed.length,
    averageDurationDays: Math.round(avgDuration),
    totalEmployerCostMonthly: Math.round(totalEmployerCost * 100) / 100,
    totalSubsidyMonthly: Math.round(totalSubsidy * 100) / 100,
    byType,
    pendingFDI: 0, // filled by caller with FDI data
    overdueConfirmations: 0, // filled by caller
    milestoneAlerts,
  };
}

// ── Map DB status to pipeline state ──

export function mapProcessStatusToPipelineState(process: HRITProcess, parts: HRITPart[]): ITPipelineState {
  if (process.status === 'closed') return 'closed';
  if (process.status === 'relapsed' || process.has_relapse) return 'relapsed';

  const hasAlta = parts.some(p => p.part_type === 'alta' || p.part_type === 'alta_propuesta');
  if (hasAlta || process.end_date) return 'medical_discharge';

  const hasBaja = parts.some(p => p.part_type === 'baja');
  if (!hasBaja) return 'communicated';

  const milestones = calculateMilestones(process.start_date);
  if (milestones.isNear365 || milestones.isPast365) return 'review_pending';

  return 'active';
}
