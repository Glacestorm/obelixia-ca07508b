/**
 * payrollPreflightEngine.ts — P1.7
 * Pure aggregator engine: derives transversal preflight status for a payroll cycle.
 * Reads states from existing engines — NO business logic duplication.
 * No side-effects, no fetch — deterministic functions only.
 */

// ── Types ──

export type PreflightStepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'overdue';
export type Semaphore = 'green' | 'amber' | 'red';
export type OverallStatus = 'on_track' | 'at_risk' | 'blocked' | 'overdue';

export interface PreflightStep {
  id: string;
  index: number;
  label: string;
  description: string;
  status: PreflightStepStatus;
  semaphore: Semaphore;
  targetModule: string;
  icon: string; // lucide icon name
  blockReason?: string;
  deadline?: string;
  isInstitutional: boolean;
}

export interface LegalDeadlineAlert {
  id: string;
  stepId: string;
  label: string;
  deadline: string;
  daysRemaining: number;
  semaphore: Semaphore;
  description: string;
}

export interface NextAction {
  label: string;
  targetModule: string;
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
  overallStatus: OverallStatus;
  hasTerminations: boolean;
}

// ── Input (aggregated from existing engines/hooks) ──

export interface PreflightInput {
  // From payrollCycleStatusEngine
  periodStatus: string;
  incidentCounts: { total: number; pending: number; validated: number; applied: number };
  latestRunStatus: string | null;
  preCloseBlockers: number;
  preCloseWarnings: number;
  paymentPhase: string; // 'not_applicable' | 'pending' | 'partial' | 'paid'

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

  // Regulatory deadlines
  regulatoryDeadlines: Array<{
    id: string;
    label: string;
    deadline: string;
    domain: string;
  }>;

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
}> = [
  { id: 'incidents', label: 'Variables e incidencias', description: 'Registrar y validar incidencias del período', targetModule: 'payroll-engine', icon: 'ClipboardList', isInstitutional: false },
  { id: 'calculation', label: 'Cálculo de nómina', description: 'Ejecutar cálculo masivo de nóminas', targetModule: 'payroll-engine', icon: 'Calculator', isInstitutional: false },
  { id: 'pre_close_validation', label: 'Validación previa al cierre', description: 'Resolver blockers y warnings de pre-cierre', targetModule: 'payroll-engine', icon: 'ShieldCheck', isInstitutional: false },
  { id: 'close_and_pay', label: 'Cierre y pago', description: 'Cerrar período y registrar pagos', targetModule: 'payroll-engine', icon: 'Lock', isInstitutional: false },
  { id: 'ss_bases', label: 'Bases / liquidación SS', description: 'Generar FAN y ficheros de cotización', targetModule: 'ss', icon: 'Landmark', isInstitutional: true },
  { id: 'ss_confirmation', label: 'Confirmación / RLC / RNT', description: 'Confirmar liquidación y recibos oficiales', targetModule: 'ss', icon: 'FileCheck', isInstitutional: true },
  { id: 'cra', label: 'CRA', description: 'Certificado de Retenciones y Anticipos', targetModule: 'ss', icon: 'FileText', isInstitutional: true },
  { id: 'irpf_111', label: 'IRPF / Modelo 111', description: 'Generar y presentar Modelo 111', targetModule: 'irpf-motor', icon: 'Calculator', isInstitutional: true },
  { id: 'irpf_190', label: 'Modelo 190 / certificados fiscales', description: 'Modelo 190 anual y certificados de retenciones', targetModule: 'irpf-motor', icon: 'FileText', isInstitutional: true },
  { id: 'archive', label: 'Archivo / evidencias', description: 'Generar paquete de cierre y evidencias', targetModule: 'compliance-evidence', icon: 'Archive', isInstitutional: false },
];

const OFFBOARDING_STEPS: Array<{
  id: string;
  label: string;
  description: string;
  targetModule: string;
  icon: string;
}> = [
  { id: 'off_baja', label: 'Baja', description: 'Comunicar baja del trabajador', targetModule: 'offboarding', icon: 'UserMinus' },
  { id: 'off_afi', label: 'AFI Baja', description: 'Generar AFI de baja en TGSS', targetModule: 'official-submissions', icon: 'Send' },
  { id: 'off_finiquito', label: 'Finiquito', description: 'Calcular y generar finiquito', targetModule: 'settlements', icon: 'Euro' },
  { id: 'off_certificado', label: 'Certificado empresa', description: 'Generar certificado empresa para SEPE', targetModule: 'official-submissions', icon: 'FileCheck' },
];

// ── Step status derivation ──

function deriveStepStatus(stepId: string, input: PreflightInput): { status: PreflightStepStatus; blockReason?: string } {
  switch (stepId) {
    case 'incidents': {
      if (input.incidentCounts.pending === 0 && (input.incidentCounts.validated > 0 || input.incidentCounts.applied > 0 || input.incidentCounts.total === 0))
        return { status: 'completed' };
      if (input.incidentCounts.pending > 0)
        return { status: 'in_progress', blockReason: `${input.incidentCounts.pending} incidencia(s) pendiente(s)` };
      return { status: 'pending' };
    }

    case 'calculation': {
      if (['calculated', 'approved', 'reviewed'].includes(input.latestRunStatus ?? ''))
        return { status: 'completed' };
      if (input.incidentCounts.pending > 0)
        return { status: 'blocked', blockReason: 'Incidencias pendientes de validar' };
      if (input.latestRunStatus === 'running')
        return { status: 'in_progress' };
      return { status: 'pending' };
    }

    case 'pre_close_validation': {
      if (!['calculated', 'approved', 'reviewed'].includes(input.latestRunStatus ?? ''))
        return { status: 'blocked', blockReason: 'Cálculo no completado' };
      if (input.preCloseBlockers === 0 && input.preCloseWarnings === 0)
        return { status: 'completed' };
      if (input.preCloseBlockers > 0)
        return { status: 'in_progress', blockReason: `${input.preCloseBlockers} blocker(s) de pre-cierre` };
      return { status: 'completed' }; // warnings only = completed
    }

    case 'close_and_pay': {
      if (['closed', 'locked'].includes(input.periodStatus) && input.paymentPhase === 'paid')
        return { status: 'completed' };
      if (['closed', 'locked'].includes(input.periodStatus))
        return { status: 'in_progress', blockReason: 'Pago pendiente' };
      if (input.preCloseBlockers > 0)
        return { status: 'blocked', blockReason: 'Validación previa no superada' };
      if (!['calculated', 'approved', 'reviewed'].includes(input.latestRunStatus ?? ''))
        return { status: 'blocked', blockReason: 'Cálculo no completado' };
      return { status: 'pending' };
    }

    case 'ss_bases': {
      if (input.fanGenerated) return { status: input.fanSubmitted ? 'completed' : 'in_progress' };
      if (!['closed', 'locked'].includes(input.periodStatus))
        return { status: 'blocked', blockReason: 'Período no cerrado' };
      return { status: 'pending' };
    }

    case 'ss_confirmation': {
      if (input.rlcConfirmed && input.rntConfirmed) return { status: 'completed' };
      if (!input.fanGenerated)
        return { status: 'blocked', blockReason: 'FAN no generado' };
      return { status: 'in_progress' };
    }

    case 'cra': {
      if (input.craSubmitted) return { status: 'completed' };
      if (input.craGenerated) return { status: 'in_progress' };
      if (!input.ssAllConfirmed)
        return { status: 'blocked', blockReason: 'Confirmación SS pendiente' };
      return { status: 'pending' };
    }

    case 'irpf_111': {
      if (input.modelo111Submitted) return { status: 'completed' };
      if (input.modelo111Generated) return { status: 'in_progress' };
      if (!input.irpfCalculated)
        return { status: 'blocked', blockReason: 'IRPF no calculado' };
      return { status: 'pending' };
    }

    case 'irpf_190': {
      if (input.modelo190Generated) return { status: 'completed' };
      if (!input.modelo111Generated)
        return { status: 'blocked', blockReason: 'Modelo 111 no generado' };
      return { status: 'pending' };
    }

    case 'archive': {
      if (input.closurePackageCreated) return { status: 'completed' };
      if (!['closed', 'locked'].includes(input.periodStatus))
        return { status: 'blocked', blockReason: 'Período no cerrado' };
      return { status: 'pending' };
    }

    // Offboarding
    case 'off_baja':
      return { status: input.terminationBajaCompleted ? 'completed' : 'in_progress' };
    case 'off_afi':
      return { status: input.terminationAFICompleted ? 'completed' : (input.terminationBajaCompleted ? 'pending' : 'blocked'), blockReason: !input.terminationBajaCompleted ? 'Baja no comunicada' : undefined };
    case 'off_finiquito':
      return { status: input.terminationFiniquitoCompleted ? 'completed' : 'pending' };
    case 'off_certificado':
      return { status: input.terminationCertificadoCompleted ? 'completed' : (input.terminationFiniquitoCompleted ? 'pending' : 'blocked'), blockReason: !input.terminationFiniquitoCompleted ? 'Finiquito no calculado' : undefined };

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
    };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);
}

// ── Main builder ──

export function buildPreflightResult(input: PreflightInput): PreflightResult {
  // Build main steps
  const steps: PreflightStep[] = MAIN_STEPS.map((def, idx) => {
    const { status, blockReason } = deriveStepStatus(def.id, input);
    const matchingDeadline = input.regulatoryDeadlines.find(d => d.domain === def.id);
    let deadlineDays: number | undefined;
    if (matchingDeadline) {
      deadlineDays = Math.ceil((new Date(matchingDeadline.deadline).getTime() - input.now.getTime()) / (1000 * 60 * 60 * 24));
    }
    const finalStatus: PreflightStepStatus = status === 'pending' && deadlineDays !== undefined && deadlineDays < 0 ? 'overdue' : status;

    return {
      id: def.id,
      index: idx,
      label: def.label,
      description: def.description,
      status: finalStatus,
      semaphore: computeStepSemaphore(finalStatus, deadlineDays),
      targetModule: def.targetModule,
      icon: def.icon,
      blockReason,
      deadline: matchingDeadline?.deadline,
      isInstitutional: def.isInstitutional,
    };
  });

  // Build offboarding steps
  const offboardingSteps: PreflightStep[] = input.hasTerminations
    ? OFFBOARDING_STEPS.map((def, idx) => {
        const { status, blockReason } = deriveStepStatus(def.id, input);
        return {
          id: def.id,
          index: 10 + idx,
          label: def.label,
          description: def.description,
          status,
          semaphore: computeStepSemaphore(status),
          targetModule: def.targetModule,
          icon: def.icon,
          blockReason,
          isInstitutional: ['off_afi', 'off_certificado'].includes(def.id),
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

  // Determine next recommended action
  const actionStep = firstPending ?? firstBlocked ?? steps[steps.length - 1];
  const nextRecommendedAction: NextAction = {
    label: actionStep.status === 'blocked'
      ? `Resolver: ${actionStep.blockReason ?? actionStep.label}`
      : `Continuar: ${actionStep.label}`,
    targetModule: actionStep.targetModule,
    description: actionStep.description,
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
    overallStatus,
    hasTerminations: input.hasTerminations,
  };
}
