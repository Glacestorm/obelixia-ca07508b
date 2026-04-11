/**
 * payrollPreflightEngine.ts — P1.7C
 * Pure aggregator engine: derives transversal preflight status for a payroll cycle.
 * Reads states from existing engines — NO business logic duplication.
 * No side-effects, no fetch — deterministic functions only.
 *
 * P1.7C additions:
 * - targetContext per step for deep-link navigation
 * - crossDomainBlockers with explanation + suggestedFix
 * - lastMileStatus integration for institutional steps
 */

// ── Types ──

export type PreflightStepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'overdue';
export type Semaphore = 'green' | 'amber' | 'red';
export type OverallStatus = 'on_track' | 'at_risk' | 'blocked' | 'overdue';

export interface StepTargetContext {
  periodId?: string;
  tab?: string;
  artifactType?: string;
  submissionId?: string;
}

export interface LastMileStepStatus {
  handoff: string;
  format: string;
  credential: string;
  sandbox: string;
}

export interface PreflightStep {
  id: string;
  index: number;
  label: string;
  description: string;
  status: PreflightStepStatus;
  semaphore: Semaphore;
  targetModule: string;
  targetContext?: StepTargetContext;
  targetAction?: string;
  icon: string; // lucide icon name
  blockReason?: string;
  blockDomain?: string;
  suggestedFix?: string;
  deadline?: string;
  isInstitutional: boolean;
  lastMileStatus?: LastMileStepStatus;
}

export interface CrossDomainBlocker {
  id: string;
  blockDomain: string;
  affectedStepId: string;
  affectedStepLabel: string;
  dependsOnStepId: string;
  dependsOnStepLabel: string;
  reason: string;
  suggestedFix: string;
  suggestedTarget: string;
  suggestedTargetContext?: StepTargetContext;
  severity: 'critical' | 'high' | 'medium';
}

export interface LegalDeadlineAlert {
  id: string;
  stepId: string;
  label: string;
  deadline: string;
  daysRemaining: number;
  semaphore: Semaphore;
  description: string;
  regulatoryBasis?: string;
  problemType?: string;
}

export interface NextAction {
  label: string;
  targetModule: string;
  targetContext?: StepTargetContext;
  description: string;
  stepId: string;
}

export interface PreflightResult {
  steps: PreflightStep[];
  offboardingSteps: PreflightStep[];
  currentStepIndex: number;
  completedCount: number;
  totalCount: number;
  completionScore: number;
  firstPendingStep: PreflightStep | null;
  firstBlockedStep: PreflightStep | null;
  nextRecommendedAction: NextAction;
  legalAlerts: LegalDeadlineAlert[];
  crossDomainBlockers: CrossDomainBlocker[];
  overallStatus: OverallStatus;
  hasTerminations: boolean;
}

// ── Input (aggregated from existing engines/hooks) ──

export interface MobilityPreflightData {
  activeAssignmentCount: number;
  worstSupportLevel: 'supported_production' | 'supported_with_review' | 'out_of_scope';
  highestRiskScore: number;
  reviewRequired: boolean;
  summary: string;
}

export interface PreflightInput {
  // From payrollCycleStatusEngine
  periodStatus: string;
  periodId?: string;
  incidentCounts: { total: number; pending: number; validated: number; applied: number };
  latestRunStatus: string | null;
  preCloseBlockers: number;
  preCloseWarnings: number;
  paymentPhase: string;

  // From SS domain
  fanGenerated: boolean;
  fanSubmitted: boolean;
  rlcConfirmed: boolean;
  rntConfirmed: boolean;
  craGenerated: boolean;
  craSubmitted: boolean;
  ssAllConfirmed: boolean;

  // From fiscal/IRPF domain
  modelo145Updated: boolean;
  irpfCalculated: boolean;
  modelo111Generated: boolean;
  modelo111Submitted: boolean;
  modelo190Generated: boolean;

  // Archive / evidence
  closurePackageCreated: boolean;

  // Offboarding (conditional)
  hasTerminations: boolean;
  terminationBajaCompleted?: boolean;
  terminationAFICompleted?: boolean;
  terminationFiniquitoCompleted?: boolean;
  terminationCertificadoCompleted?: boolean;

  // Regulatory deadlines (dynamic from regulatoryCalendarEngine)
  regulatoryDeadlines: Array<{
    id: string;
    label: string;
    deadline: string;
    domain: string;
    regulatoryBasis?: string;
  }>;

  // Last-mile readiness by organism (from LM3)
  lastMileReadiness?: Record<string, LastMileStepStatus>;

  // Current date for semaphore calculation
  now: Date;
}

// ── Step definitions ──

const MAIN_STEPS: Array<{
  id: string;
  label: string;
  description: string;
  targetModule: string;
  icon: string;
  isInstitutional: boolean;
  defaultTab?: string;
  defaultAction?: string;
  lastMileKey?: string;
}> = [
  { id: 'incidents', label: 'Variables e incidencias', description: 'Registrar y validar incidencias del período', targetModule: 'payroll-engine', icon: 'ClipboardList', isInstitutional: false, defaultAction: 'resolve_incidents' },
  { id: 'calculation', label: 'Cálculo de nómina', description: 'Ejecutar cálculo masivo de nóminas', targetModule: 'payroll-engine', icon: 'Calculator', isInstitutional: false, defaultAction: 'run_calculation' },
  { id: 'pre_close_validation', label: 'Validación previa al cierre', description: 'Resolver blockers y warnings de pre-cierre', targetModule: 'payroll-engine', icon: 'ShieldCheck', isInstitutional: false, defaultAction: 'validate_pre_close' },
  { id: 'close_and_pay', label: 'Cierre y pago', description: 'Cerrar período y registrar pagos', targetModule: 'payroll-engine', icon: 'Lock', isInstitutional: false, defaultAction: 'close_period' },
  { id: 'ss_bases', label: 'Bases / liquidación SS', description: 'Generar FAN y ficheros de cotización', targetModule: 'ss', icon: 'Landmark', isInstitutional: true, defaultTab: 'fan', lastMileKey: 'tgss' },
  { id: 'ss_confirmation', label: 'Confirmación / RLC / RNT', description: 'Confirmar liquidación y recibos oficiales', targetModule: 'ss', icon: 'FileCheck', isInstitutional: true, defaultTab: 'rlc', lastMileKey: 'tgss' },
  { id: 'cra', label: 'CRA', description: 'Certificado de Retenciones y Anticipos', targetModule: 'ss', icon: 'FileText', isInstitutional: true, defaultTab: 'cra', lastMileKey: 'tgss' },
  { id: 'irpf_111', label: 'IRPF / Modelo 111', description: 'Generar y presentar Modelo 111', targetModule: 'irpf-motor', icon: 'Calculator', isInstitutional: true, defaultTab: 'modelo111', lastMileKey: 'aeat' },
  { id: 'irpf_190', label: 'Modelo 190 / certificados fiscales', description: 'Modelo 190 anual y certificados de retenciones', targetModule: 'irpf-motor', icon: 'FileText', isInstitutional: true, defaultTab: 'modelo190', lastMileKey: 'aeat' },
  { id: 'archive', label: 'Archivo / evidencias', description: 'Generar paquete de cierre y evidencias', targetModule: 'compliance-evidence', icon: 'Archive', isInstitutional: false },
];

const OFFBOARDING_STEPS: Array<{
  id: string;
  label: string;
  description: string;
  targetModule: string;
  icon: string;
  defaultAction?: string;
  lastMileKey?: string;
}> = [
  { id: 'off_baja', label: 'Baja', description: 'Comunicar baja del trabajador', targetModule: 'offboarding', icon: 'UserMinus', defaultAction: 'process_baja' },
  { id: 'off_afi', label: 'AFI Baja', description: 'Generar AFI de baja en TGSS', targetModule: 'official-submissions', icon: 'Send', lastMileKey: 'tgss' },
  { id: 'off_finiquito', label: 'Finiquito', description: 'Calcular y generar finiquito', targetModule: 'settlements', icon: 'Euro' },
  { id: 'off_certificado', label: 'Certificado empresa', description: 'Generar certificado empresa para SEPE', targetModule: 'official-submissions', icon: 'FileCheck', lastMileKey: 'sepe' },
];

// ── Cross-domain dependency map ──

const DEPENDENCY_MAP: Array<{
  stepId: string;
  dependsOn: string;
  domain: string;
  reason: string;
  fix: string;
}> = [
  { stepId: 'calculation', dependsOn: 'incidents', domain: 'payroll', reason: 'Incidencias pendientes impiden cálculo de nómina', fix: 'Validar o resolver todas las incidencias del período' },
  { stepId: 'pre_close_validation', dependsOn: 'calculation', domain: 'payroll', reason: 'Validación requiere cálculo previo completado', fix: 'Ejecutar cálculo masivo de nóminas primero' },
  { stepId: 'close_and_pay', dependsOn: 'pre_close_validation', domain: 'payroll', reason: 'Cierre requiere validación previa sin bloqueos', fix: 'Resolver todos los blockers de pre-cierre' },
  { stepId: 'ss_bases', dependsOn: 'close_and_pay', domain: 'payroll→ss', reason: 'Cotización SS requiere período cerrado con nóminas pagadas', fix: 'Completar cierre y pago del período' },
  { stepId: 'ss_confirmation', dependsOn: 'ss_bases', domain: 'ss', reason: 'Confirmación RLC/RNT requiere FAN generado', fix: 'Generar FAN de cotización primero' },
  { stepId: 'cra', dependsOn: 'ss_confirmation', domain: 'ss', reason: 'CRA requiere confirmación SS completa', fix: 'Confirmar liquidación y recibir RLC/RNT' },
  { stepId: 'irpf_111', dependsOn: 'close_and_pay', domain: 'payroll→fiscal', reason: 'IRPF requiere nóminas cerradas para retenciones correctas', fix: 'Cerrar período de nómina primero' },
  { stepId: 'irpf_190', dependsOn: 'irpf_111', domain: 'fiscal', reason: 'Modelo 190 requiere al menos Modelo 111 generado', fix: 'Generar Modelo 111 del trimestre' },
  { stepId: 'archive', dependsOn: 'close_and_pay', domain: 'payroll→archive', reason: 'Archivo requiere período cerrado', fix: 'Completar cierre del período' },
  { stepId: 'off_afi', dependsOn: 'off_baja', domain: 'offboarding→tgss', reason: 'AFI baja requiere comunicación de baja previa', fix: 'Comunicar baja del trabajador primero' },
  { stepId: 'off_certificado', dependsOn: 'off_finiquito', domain: 'offboarding→sepe', reason: 'Certificado empresa requiere finiquito calculado', fix: 'Calcular y generar finiquito del trabajador' },
];

// ── Step status derivation ──

function deriveStepStatus(stepId: string, input: PreflightInput): { status: PreflightStepStatus; blockReason?: string; blockDomain?: string; suggestedFix?: string } {
  switch (stepId) {
    case 'incidents': {
      if (input.incidentCounts.pending === 0 && (input.incidentCounts.validated > 0 || input.incidentCounts.applied > 0 || input.incidentCounts.total === 0))
        return { status: 'completed' };
      if (input.incidentCounts.pending > 0)
        return { status: 'in_progress', blockReason: `${input.incidentCounts.pending} incidencia(s) pendiente(s)`, blockDomain: 'payroll', suggestedFix: 'Revisar y validar las incidencias pendientes' };
      return { status: 'pending' };
    }
    case 'calculation': {
      if (['calculated', 'approved', 'reviewed'].includes(input.latestRunStatus ?? ''))
        return { status: 'completed' };
      if (input.incidentCounts.pending > 0)
        return { status: 'blocked', blockReason: 'Incidencias pendientes de validar', blockDomain: 'payroll', suggestedFix: 'Validar todas las incidencias antes de calcular' };
      if (input.latestRunStatus === 'running')
        return { status: 'in_progress' };
      return { status: 'pending' };
    }
    case 'pre_close_validation': {
      if (!['calculated', 'approved', 'reviewed'].includes(input.latestRunStatus ?? ''))
        return { status: 'blocked', blockReason: 'Cálculo no completado', blockDomain: 'payroll', suggestedFix: 'Ejecutar cálculo masivo primero' };
      if (input.preCloseBlockers === 0 && input.preCloseWarnings === 0)
        return { status: 'completed' };
      if (input.preCloseBlockers > 0)
        return { status: 'in_progress', blockReason: `${input.preCloseBlockers} blocker(s) de pre-cierre`, blockDomain: 'payroll', suggestedFix: 'Resolver los blockers de validación previa' };
      return { status: 'completed' };
    }
    case 'close_and_pay': {
      if (['closed', 'locked'].includes(input.periodStatus) && input.paymentPhase === 'paid')
        return { status: 'completed' };
      if (['closed', 'locked'].includes(input.periodStatus))
        return { status: 'in_progress', blockReason: 'Pago pendiente', blockDomain: 'payroll', suggestedFix: 'Registrar el pago de nóminas' };
      if (input.preCloseBlockers > 0)
        return { status: 'blocked', blockReason: 'Validación previa no superada', blockDomain: 'payroll', suggestedFix: 'Resolver blockers de pre-cierre primero' };
      if (!['calculated', 'approved', 'reviewed'].includes(input.latestRunStatus ?? ''))
        return { status: 'blocked', blockReason: 'Cálculo no completado', blockDomain: 'payroll', suggestedFix: 'Ejecutar cálculo masivo primero' };
      return { status: 'pending' };
    }
    case 'ss_bases': {
      if (input.fanGenerated) return { status: input.fanSubmitted ? 'completed' : 'in_progress', suggestedFix: !input.fanSubmitted ? 'Enviar FAN a TGSS (modo handoff)' : undefined };
      if (!['closed', 'locked'].includes(input.periodStatus))
        return { status: 'blocked', blockReason: 'Período no cerrado', blockDomain: 'payroll', suggestedFix: 'Cerrar período de nómina primero' };
      return { status: 'pending' };
    }
    case 'ss_confirmation': {
      if (input.rlcConfirmed && input.rntConfirmed) return { status: 'completed' };
      if (!input.fanGenerated)
        return { status: 'blocked', blockReason: 'FAN no generado', blockDomain: 'ss', suggestedFix: 'Generar FAN de cotización primero' };
      return { status: 'in_progress', suggestedFix: 'Confirmar RLC y RNT desde la TGSS' };
    }
    case 'cra': {
      if (input.craSubmitted) return { status: 'completed' };
      if (input.craGenerated) return { status: 'in_progress', suggestedFix: 'Enviar CRA a TGSS (modo handoff)' };
      if (!input.ssAllConfirmed)
        return { status: 'blocked', blockReason: 'Confirmación SS pendiente', blockDomain: 'ss', suggestedFix: 'Completar confirmación RLC/RNT primero' };
      return { status: 'pending' };
    }
    case 'irpf_111': {
      if (input.modelo111Submitted) return { status: 'completed' };
      if (input.modelo111Generated) return { status: 'in_progress', suggestedFix: 'Presentar Modelo 111 en AEAT (modo handoff)' };
      if (!input.irpfCalculated)
        return { status: 'blocked', blockReason: 'IRPF no calculado', blockDomain: 'fiscal', suggestedFix: 'Ejecutar cálculo IRPF del período' };
      return { status: 'pending' };
    }
    case 'irpf_190': {
      if (input.modelo190Generated) return { status: 'completed' };
      if (!input.modelo111Generated)
        return { status: 'blocked', blockReason: 'Modelo 111 no generado', blockDomain: 'fiscal', suggestedFix: 'Generar Modelo 111 del trimestre primero' };
      return { status: 'pending' };
    }
    case 'archive': {
      if (input.closurePackageCreated) return { status: 'completed' };
      if (!['closed', 'locked'].includes(input.periodStatus))
        return { status: 'blocked', blockReason: 'Período no cerrado', blockDomain: 'payroll', suggestedFix: 'Cerrar período de nómina primero' };
      return { status: 'pending' };
    }
    // Offboarding
    case 'off_baja':
      return { status: input.terminationBajaCompleted ? 'completed' : 'in_progress', suggestedFix: !input.terminationBajaCompleted ? 'Comunicar baja del trabajador' : undefined };
    case 'off_afi':
      return { status: input.terminationAFICompleted ? 'completed' : (input.terminationBajaCompleted ? 'pending' : 'blocked'), blockReason: !input.terminationBajaCompleted ? 'Baja no comunicada' : undefined, blockDomain: !input.terminationBajaCompleted ? 'offboarding' : undefined, suggestedFix: !input.terminationBajaCompleted ? 'Comunicar baja primero' : undefined };
    case 'off_finiquito':
      return { status: input.terminationFiniquitoCompleted ? 'completed' : 'pending' };
    case 'off_certificado':
      return { status: input.terminationCertificadoCompleted ? 'completed' : (input.terminationFiniquitoCompleted ? 'pending' : 'blocked'), blockReason: !input.terminationFiniquitoCompleted ? 'Finiquito no calculado' : undefined, blockDomain: !input.terminationFiniquitoCompleted ? 'offboarding' : undefined, suggestedFix: !input.terminationFiniquitoCompleted ? 'Calcular finiquito primero' : undefined };
    default:
      return { status: 'pending' };
  }
}

// ── Semaphore derivation ──

function computeStepSemaphore(step: PreflightStepStatus, deadlineDaysRemaining?: number): Semaphore {
  if (step === 'completed') return 'green';
  if (step === 'overdue') return 'red';
  if (step === 'blocked') return 'red';
  if (deadlineDaysRemaining !== undefined) {
    if (deadlineDaysRemaining < 0) return 'red';
    if (deadlineDaysRemaining <= 5) return 'amber';
  }
  if (step === 'in_progress') return 'amber';
  return 'green';
}

// ── Cross-domain blockers ──

function deriveCrossDomainBlockers(steps: PreflightStep[], _input: PreflightInput): CrossDomainBlocker[] {
  const blockers: CrossDomainBlocker[] = [];
  const stepMap = new Map(steps.map(s => [s.id, s]));

  for (const dep of DEPENDENCY_MAP) {
    const step = stepMap.get(dep.stepId);
    const depStep = stepMap.get(dep.dependsOn);
    if (!step || !depStep) continue;

    // Blocker: step is blocked AND its dependency is not completed
    if (step.status === 'blocked' && depStep.status !== 'completed') {
      blockers.push({
        id: `xblock_${dep.stepId}_${dep.dependsOn}`,
        blockDomain: dep.domain,
        affectedStepId: dep.stepId,
        affectedStepLabel: step.label,
        dependsOnStepId: dep.dependsOn,
        dependsOnStepLabel: depStep.label,
        reason: dep.reason,
        suggestedFix: dep.fix,
        suggestedTarget: depStep.targetModule,
        suggestedTargetContext: depStep.targetContext,
        severity: step.semaphore === 'red' ? 'critical' : 'high',
      });
    }
  }

  return blockers;
}

// ── Legal alerts ──

export function deriveLegalAlerts(deadlines: PreflightInput['regulatoryDeadlines'], now: Date): LegalDeadlineAlert[] {
  return deadlines.map(d => {
    const deadlineDate = new Date(d.deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const semaphore: Semaphore = daysRemaining < 0 ? 'red' : daysRemaining <= 5 ? 'amber' : 'green';

    return {
      id: d.id,
      stepId: d.domain,
      label: d.label,
      deadline: d.deadline,
      daysRemaining,
      semaphore,
      description: daysRemaining < 0
        ? `Vencido hace ${Math.abs(daysRemaining)} día(s)`
        : daysRemaining === 0
          ? 'Vence hoy'
          : `Faltan ${daysRemaining} día(s)`,
      regulatoryBasis: d.regulatoryBasis,
      problemType: daysRemaining < 0 ? 'deadline_vencido' : daysRemaining <= 5 ? 'deadline_próximo' : 'en_plazo',
    };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);
}

// ── Main builder ──

export function buildPreflightResult(input: PreflightInput): PreflightResult {
  const periodId = input.periodId;

  // Build main steps
  const steps: PreflightStep[] = MAIN_STEPS.map((def, idx) => {
    const { status, blockReason, blockDomain, suggestedFix } = deriveStepStatus(def.id, input);
    const matchingDeadline = input.regulatoryDeadlines.find(d => d.domain === def.id);
    let deadlineDays: number | undefined;
    if (matchingDeadline) {
      deadlineDays = Math.ceil((new Date(matchingDeadline.deadline).getTime() - input.now.getTime()) / (1000 * 60 * 60 * 24));
    }
    const finalStatus: PreflightStepStatus = status === 'pending' && deadlineDays !== undefined && deadlineDays < 0 ? 'overdue' : status;

    // Build target context for deep-links
    const targetContext: StepTargetContext = {
      ...(periodId && { periodId }),
      ...(def.defaultTab && { tab: def.defaultTab }),
    };

    // Attach last-mile status for institutional steps
    const lastMileStatus = def.lastMileKey && input.lastMileReadiness?.[def.lastMileKey]
      ? input.lastMileReadiness[def.lastMileKey]
      : undefined;

    return {
      id: def.id,
      index: idx,
      label: def.label,
      description: def.description,
      status: finalStatus,
      semaphore: computeStepSemaphore(finalStatus, deadlineDays),
      targetModule: def.targetModule,
      targetContext: Object.keys(targetContext).length > 0 ? targetContext : undefined,
      targetAction: def.defaultAction,
      icon: def.icon,
      blockReason,
      blockDomain,
      suggestedFix,
      deadline: matchingDeadline?.deadline,
      isInstitutional: def.isInstitutional,
      lastMileStatus,
    };
  });

  // Build offboarding steps
  const offboardingSteps: PreflightStep[] = input.hasTerminations
    ? OFFBOARDING_STEPS.map((def, idx) => {
        const { status, blockReason, blockDomain, suggestedFix } = deriveStepStatus(def.id, input);
        const lastMileStatus = def.lastMileKey && input.lastMileReadiness?.[def.lastMileKey]
          ? input.lastMileReadiness[def.lastMileKey]
          : undefined;
        return {
          id: def.id,
          index: 10 + idx,
          label: def.label,
          description: def.description,
          status,
          semaphore: computeStepSemaphore(status),
          targetModule: def.targetModule,
          targetContext: periodId ? { periodId } : undefined,
          targetAction: def.defaultAction,
          icon: def.icon,
          blockReason,
          blockDomain,
          suggestedFix,
          isInstitutional: ['off_afi', 'off_certificado'].includes(def.id),
          lastMileStatus,
        };
      })
    : [];

  const allSteps = [...steps, ...offboardingSteps];
  const completedCount = allSteps.filter(s => s.status === 'completed').length;
  const totalCount = allSteps.length;
  const completionScore = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const firstPending = allSteps.find(s => s.status === 'pending' || s.status === 'in_progress') ?? null;
  const firstBlocked = allSteps.find(s => s.status === 'blocked') ?? null;
  const currentStepIndex = firstPending?.index ?? (firstBlocked?.index ?? (completedCount === totalCount ? totalCount - 1 : 0));

  // Cross-domain blockers
  const crossDomainBlockers = deriveCrossDomainBlockers(allSteps, input);

  // Determine next recommended action
  const actionStep = firstPending ?? firstBlocked ?? steps[steps.length - 1];
  const nextRecommendedAction: NextAction = {
    label: actionStep.status === 'blocked'
      ? `Resolver: ${actionStep.blockReason ?? actionStep.label}`
      : `Continuar: ${actionStep.label}`,
    targetModule: actionStep.targetModule,
    targetContext: actionStep.targetContext,
    description: actionStep.suggestedFix || actionStep.description,
    stepId: actionStep.id,
  };

  // Legal alerts
  const legalAlerts = deriveLegalAlerts(input.regulatoryDeadlines, input.now);

  // Overall status
  let overallStatus: OverallStatus = 'on_track';
  if (allSteps.some(s => s.status === 'overdue') || legalAlerts.some(a => a.semaphore === 'red')) {
    overallStatus = 'overdue';
  } else if (allSteps.some(s => s.status === 'blocked')) {
    overallStatus = 'blocked';
  } else if (legalAlerts.some(a => a.semaphore === 'amber') || allSteps.some(s => s.semaphore === 'amber')) {
    overallStatus = 'at_risk';
  }

  return {
    steps,
    offboardingSteps,
    currentStepIndex,
    completedCount,
    totalCount,
    completionScore,
    firstPendingStep: firstPending,
    firstBlockedStep: firstBlocked,
    nextRecommendedAction,
    legalAlerts,
    crossDomainBlockers,
    overallStatus,
    hasTerminations: input.hasTerminations,
  };
}
