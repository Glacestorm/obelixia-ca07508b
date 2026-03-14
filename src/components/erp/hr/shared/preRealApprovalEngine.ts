/**
 * preRealApprovalEngine — V2-ES.8 Tramo 5
 * Pure engine for pre-real approval workflow.
 * 
 * Defines eligibility checks, approval states, checklist requirements,
 * and role-based authorization for approving submissions before any
 * future real submission phase.
 * 
 * Key invariants:
 * - approved ≠ enviado (approval does NOT trigger real submission)
 * - ready_for_real ≠ autorizado (readiness ≠ authorization)
 * - isRealSubmissionBlocked() remains true regardless of approval status
 */

import type {
  PreparatorySubmissionStatus,
  SubmissionDomain,
  SubmissionValidationResult,
  PayloadSnapshot,
} from './preparatorySubmissionEngine';

// ─── Approval Status ────────────────────────────────────────────────────────

export type ApprovalStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'correction_requested'
  | 'cancelled'
  | 'expired';

export interface ApprovalStatusMeta {
  label: string;
  description: string;
  color: 'amber' | 'green' | 'red' | 'muted' | 'blue';
  icon: string;
  isTerminal: boolean;
}

const APPROVAL_STATUS_META: Record<ApprovalStatus, ApprovalStatusMeta> = {
  pending_approval: {
    label: 'Pendiente de aprobación',
    description: 'Solicitud enviada, esperando decisión del aprobador',
    color: 'amber',
    icon: 'Clock',
    isTerminal: false,
  },
  approved: {
    label: 'Aprobado',
    description: 'Aprobación pre-real concedida (NO implica envío real)',
    color: 'green',
    icon: 'CheckCircle',
    isTerminal: true,
  },
  rejected: {
    label: 'Rechazado',
    description: 'Aprobación denegada — requiere correcciones',
    color: 'red',
    icon: 'XCircle',
    isTerminal: true,
  },
  correction_requested: {
    label: 'Corrección solicitada',
    description: 'El aprobador solicita correcciones antes de aprobar',
    color: 'blue',
    icon: 'Edit',
    isTerminal: false,
  },
  cancelled: {
    label: 'Cancelada',
    description: 'Solicitud de aprobación cancelada',
    color: 'muted',
    icon: 'XCircle',
    isTerminal: true,
  },
  expired: {
    label: 'Expirada',
    description: 'Solicitud de aprobación expirada sin decisión',
    color: 'muted',
    icon: 'Clock',
    isTerminal: true,
  },
};

export function getApprovalStatusMeta(status: ApprovalStatus): ApprovalStatusMeta {
  return APPROVAL_STATUS_META[status] || APPROVAL_STATUS_META.pending_approval;
}

// ─── Approval Roles ─────────────────────────────────────────────────────────

export type ApprovalRole =
  | 'hr_director'
  | 'hr_manager'
  | 'compliance_officer'
  | 'cfo'
  | 'admin';

export interface ApprovalRoleMeta {
  label: string;
  description: string;
  level: number; // higher = more authority
}

const APPROVAL_ROLES: Record<ApprovalRole, ApprovalRoleMeta> = {
  hr_director: {
    label: 'Director de RRHH',
    description: 'Aprobación estándar para envíos regulatorios',
    level: 3,
  },
  hr_manager: {
    label: 'Responsable de RRHH',
    description: 'Aprobación para envíos de bajo riesgo',
    level: 2,
  },
  compliance_officer: {
    label: 'Responsable de Cumplimiento',
    description: 'Revisión de compliance regulatorio',
    level: 3,
  },
  cfo: {
    label: 'Director Financiero',
    description: 'Aprobación para envíos fiscales (AEAT)',
    level: 4,
  },
  admin: {
    label: 'Administrador',
    description: 'Aprobación con máximos privilegios',
    level: 5,
  },
};

export function getApprovalRoleMeta(role: ApprovalRole): ApprovalRoleMeta {
  return APPROVAL_ROLES[role] || APPROVAL_ROLES.hr_director;
}

export function getApprovalRoles(): ApprovalRole[] {
  return Object.keys(APPROVAL_ROLES) as ApprovalRole[];
}

/** Suggested approval role by domain */
export function getSuggestedApprovalRole(domain: SubmissionDomain): ApprovalRole {
  switch (domain) {
    case 'AEAT_111':
    case 'AEAT_190':
      return 'cfo';
    case 'TGSS':
    case 'CONTRATA':
    case 'CERTIFICA2':
      return 'hr_director';
    case 'DELTA':
      return 'compliance_officer';
    default:
      return 'hr_director';
  }
}

// ─── Eligibility Checks ────────────────────────────────────────────────────

export interface EligibilityCheck {
  checkId: string;
  label: string;
  passed: boolean;
  required: boolean;
  severity: 'blocker' | 'warning' | 'info';
  message: string;
  category: 'dry_run' | 'validation' | 'data' | 'certificate' | 'evidence' | 'status';
}

export type EligibilityLevel = 'eligible' | 'partially_eligible' | 'not_eligible';

export interface EligibilityResult {
  eligible: boolean;
  level: EligibilityLevel;
  levelLabel: string;
  checks: EligibilityCheck[];
  blockers: string[];
  warnings: string[];
  infos: string[];
  score: number; // 0-100
  summary: string;
}

const ELIGIBILITY_LABELS: Record<EligibilityLevel, string> = {
  eligible: 'Elegible para aprobación',
  partially_eligible: 'Parcialmente elegible — revisar advertencias',
  not_eligible: 'No elegible — resolver bloqueantes',
};

/**
 * Evaluate if a submission is eligible for pre-real approval request.
 * Returns a 3-tier result: eligible, partially_eligible, not_eligible.
 *
 * Extended checks (V2-ES.8 T5 P3):
 * - Dry-run + validation + payload (blockers)
 * - Readiness score, evidence, certificates (warnings)
 * - Submission status validity, multiple dry-runs (info)
 */
export function evaluateApprovalEligibility(params: {
  submissionStatus: PreparatorySubmissionStatus;
  validationResult: SubmissionValidationResult | null;
  payloadSnapshot: PayloadSnapshot | null;
  dryRunCount: number;
  hasCertificate: boolean;
  domain: SubmissionDomain;
  /** Extended context — all optional for graceful degradation */
  readinessPercent?: number;
  hasLinkedEvidence?: boolean;
  evidenceCount?: number;
  certificateStatus?: 'valid' | 'expiring' | 'expired' | 'not_configured';
  submissionCancelled?: boolean;
}): EligibilityResult {
  const checks: EligibilityCheck[] = [];

  // ─── BLOCKERS (required) ────────────────────────────────────────────

  // 1. Submission not cancelled/invalid
  const isValidStatus = !params.submissionCancelled &&
    !['cancelled', 'failed', 'rejected'].includes(params.submissionStatus);
  checks.push({
    checkId: 'submission_valid',
    label: 'Submission activa',
    passed: isValidStatus,
    required: true,
    severity: 'blocker',
    category: 'status',
    message: isValidStatus
      ? 'La submission está en un estado válido'
      : 'La submission está cancelada, fallida o rechazada',
  });

  // 2. Dry-run ejecutado
  const dryRunDone = params.submissionStatus === 'dry_run_executed' ||
    params.submissionStatus === 'pending_approval';
  checks.push({
    checkId: 'dry_run_executed',
    label: 'Dry-run ejecutado',
    passed: dryRunDone,
    required: true,
    severity: 'blocker',
    category: 'dry_run',
    message: dryRunDone
      ? 'Al menos un dry-run completado exitosamente'
      : 'Se requiere al menos un dry-run ejecutado',
  });

  // 3. Validación superada
  const validationPassed = params.validationResult?.passed === true;
  checks.push({
    checkId: 'validation_passed',
    label: 'Validación interna superada',
    passed: validationPassed,
    required: true,
    severity: 'blocker',
    category: 'validation',
    message: validationPassed
      ? `Validación superada (${params.validationResult?.score || 0}%)`
      : 'Se requiere validación interna superada',
  });

  // 4. Payload generado
  checks.push({
    checkId: 'payload_exists',
    label: 'Payload generado',
    passed: !!params.payloadSnapshot,
    required: true,
    severity: 'blocker',
    category: 'data',
    message: params.payloadSnapshot
      ? 'Payload snapshot disponible para revisión'
      : 'Se requiere payload generado',
  });

  // 5. Score ≥ 70%
  const scoreOk = (params.validationResult?.score || 0) >= 70;
  checks.push({
    checkId: 'score_threshold',
    label: 'Score mínimo (≥70%)',
    passed: scoreOk,
    required: true,
    severity: 'blocker',
    category: 'validation',
    message: scoreOk
      ? `Score: ${params.validationResult?.score}%`
      : `Score insuficiente: ${params.validationResult?.score || 0}% (mínimo 70%)`,
  });

  // 6. Sin errores de validación
  const noErrors = (params.validationResult?.errorCount || 0) === 0;
  checks.push({
    checkId: 'no_errors',
    label: 'Sin errores de validación',
    passed: noErrors,
    required: true,
    severity: 'blocker',
    category: 'validation',
    message: noErrors
      ? 'Sin errores de validación'
      : `${params.validationResult?.errorCount} error(es) pendiente(s)`,
  });

  // ─── WARNINGS (recommended, not blocking) ──────────────────────────

  // 7. Certificado digital
  const certOk = params.hasCertificate ||
    (params.certificateStatus && params.certificateStatus !== 'not_configured' && params.certificateStatus !== 'expired');
  const certExpiring = params.certificateStatus === 'expiring';
  checks.push({
    checkId: 'certificate_configured',
    label: 'Certificado digital',
    passed: !!certOk,
    required: false,
    severity: 'warning',
    category: 'certificate',
    message: certExpiring
      ? 'Certificado digital próximo a expirar — renovar antes de envío real'
      : certOk
        ? 'Certificado digital configurado y vigente'
        : 'Certificado digital no configurado — requerido para envío real futuro',
  });

  // 8. Readiness score (if available)
  if (params.readinessPercent !== undefined) {
    const readinessOk = params.readinessPercent >= 60;
    checks.push({
      checkId: 'readiness_adequate',
      label: 'Readiness del conector (≥60%)',
      passed: readinessOk,
      required: false,
      severity: 'warning',
      category: 'data',
      message: readinessOk
        ? `Readiness: ${params.readinessPercent}%`
        : `Readiness insuficiente: ${params.readinessPercent}% — revisar datos y configuración`,
    });
  }

  // 9. Evidencia documental vinculada
  if (params.hasLinkedEvidence !== undefined) {
    checks.push({
      checkId: 'evidence_linked',
      label: 'Evidencia documental vinculada',
      passed: params.hasLinkedEvidence,
      required: false,
      severity: 'warning',
      category: 'evidence',
      message: params.hasLinkedEvidence
        ? `${params.evidenceCount || 1} evidencia(s) vinculada(s)`
        : 'Sin evidencia documental vinculada — recomendado para trazabilidad',
    });
  }

  // ─── INFO (nice-to-have) ───────────────────────────────────────────

  // 10. Múltiples dry-runs
  checks.push({
    checkId: 'multiple_dry_runs',
    label: 'Múltiples dry-runs',
    passed: params.dryRunCount >= 2,
    required: false,
    severity: 'info',
    category: 'dry_run',
    message: params.dryRunCount >= 2
      ? `${params.dryRunCount} dry-runs ejecutados`
      : 'Se recomienda ≥2 dry-runs para mayor confianza',
  });

  // ─── Compute results ──────────────────────────────────────────────

  const blockers = checks.filter(c => !c.passed && c.required).map(c => c.message);
  const warnings = checks.filter(c => !c.passed && !c.required && c.severity === 'warning').map(c => c.message);
  const infos = checks.filter(c => !c.passed && c.severity === 'info').map(c => c.message);
  const passedRequired = checks.filter(c => c.required && c.passed).length;
  const totalRequired = checks.filter(c => c.required).length;
  const passedAll = checks.filter(c => c.passed).length;
  const score = checks.length > 0 ? Math.round((passedAll / checks.length) * 100) : 0;

  // 3-tier level
  let level: EligibilityLevel;
  if (blockers.length > 0) {
    level = 'not_eligible';
  } else if (warnings.length > 0) {
    level = 'partially_eligible';
  } else {
    level = 'eligible';
  }

  const summary = level === 'eligible'
    ? `Todos los checks superados (${passedAll}/${checks.length})`
    : level === 'partially_eligible'
      ? `${blockers.length} bloqueante(s), ${warnings.length} advertencia(s)`
      : `${blockers.length} bloqueante(s) impiden la aprobación`;

  return {
    eligible: blockers.length === 0,
    level,
    levelLabel: ELIGIBILITY_LABELS[level],
    checks,
    blockers,
    warnings,
    infos,
    score,
    summary,
  };
}

// ─── Approval Checklist ─────────────────────────────────────────────────────

export interface ApprovalChecklistItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
  category: 'data' | 'compliance' | 'review' | 'authorization';
  checked: boolean;
}

/**
 * Generate the default approval checklist for a domain.
 * The approver must check these items before approving.
 */
export function getDefaultApprovalChecklist(domain: SubmissionDomain): ApprovalChecklistItem[] {
  const common: ApprovalChecklistItem[] = [
    {
      id: 'data_reviewed',
      label: 'Datos revisados',
      description: 'He revisado los datos del payload y son correctos',
      required: true,
      category: 'data',
      checked: false,
    },
    {
      id: 'validation_reviewed',
      label: 'Validación revisada',
      description: 'He verificado que la validación interna no muestra errores',
      required: true,
      category: 'review',
      checked: false,
    },
    {
      id: 'dry_run_reviewed',
      label: 'Resultado dry-run revisado',
      description: 'He revisado el resultado de la simulación (dry-run)',
      required: true,
      category: 'review',
      checked: false,
    },
    {
      id: 'compliance_confirmed',
      label: 'Cumplimiento normativo',
      description: 'Los datos cumplen los requisitos normativos del organismo',
      required: true,
      category: 'compliance',
      checked: false,
    },
    {
      id: 'authorization_granted',
      label: 'Autorización interna',
      description: 'Autorizo internamente este envío como preparado para una futura transmisión real',
      required: true,
      category: 'authorization',
      checked: false,
    },
  ];

  const domainSpecific: Record<string, ApprovalChecklistItem[]> = {
    TGSS: [{
      id: 'tgss_ccc_verified',
      label: 'CCC verificado',
      description: 'El Código de Cuenta de Cotización es correcto',
      required: true,
      category: 'data',
      checked: false,
    }],
    AEAT_111: [{
      id: 'aeat_period_verified',
      label: 'Período fiscal verificado',
      description: 'El trimestre fiscal corresponde al período correcto',
      required: true,
      category: 'compliance',
      checked: false,
    }],
    AEAT_190: [{
      id: 'aeat_annual_verified',
      label: 'Resumen anual verificado',
      description: 'El resumen anual de retenciones cuadra con los trimestrales',
      required: true,
      category: 'compliance',
      checked: false,
    }],
    CONTRATA: [{
      id: 'contract_data_verified',
      label: 'Datos contractuales verificados',
      description: 'Los datos del contrato (tipo, jornada, duración) son correctos',
      required: true,
      category: 'data',
      checked: false,
    }],
  };

  return [...common, ...(domainSpecific[domain] || [])];
}

/**
 * Check if all required checklist items are completed.
 */
export function isChecklistComplete(checklist: ApprovalChecklistItem[]): boolean {
  return checklist.filter(c => c.required).every(c => c.checked);
}

// ─── Approval Transitions ───────────────────────────────────────────────────

const APPROVAL_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  pending_approval: ['approved', 'rejected', 'correction_requested', 'cancelled', 'expired'],
  approved: [],  // terminal
  rejected: [],  // terminal — resubmission creates a new approval
  correction_requested: ['pending_approval', 'cancelled'],
  cancelled: [],  // terminal
  expired: [],    // terminal
};

export function isValidApprovalTransition(from: ApprovalStatus, to: ApprovalStatus): boolean {
  return APPROVAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidApprovalNextStatuses(current: ApprovalStatus): ApprovalStatus[] {
  return APPROVAL_TRANSITIONS[current] || [];
}

// ─── Disclaimers ────────────────────────────────────────────────────────────

export const APPROVAL_DISCLAIMERS = {
  request: 'Esta solicitud de aprobación es un gate interno preparatorio. La aprobación NO implica envío real al organismo ni transmisión oficial.',
  approval: 'Aprobación interna concedida. Este estado marca la submission como internamente autorizada pero NO activa envío real ni firma digital.',
  rejection: 'La solicitud ha sido rechazada internamente. Puede corregirse y re-enviarse para aprobación.',
  correction: 'Se solicitan correcciones antes de poder aprobar. Una vez corregido, se puede re-enviar la solicitud.',
  global: 'El workflow de aprobación pre-real es un mecanismo interno de control. isRealSubmissionBlocked() permanece activo en todo momento.',
} as const;
