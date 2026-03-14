/**
 * tgssPreIntegrationReadiness — Unified pre-integration status evaluator
 * V2-ES.5 Paso 3: Combines field readiness, format validation, consistency
 * checks, doc completeness, and deadline status into a single assessment.
 *
 * Pure function — no side effects, no DB access.
 * NOT official TGSS validation — internal preparation assessment.
 */
import type { RegistrationData, RegistrationStatus, DataReadiness } from '@/hooks/erp/hr/useHRRegistrationProcess';
import { buildTGSSPayload, type TGSSPayloadResult } from './tgssPayloadBuilder';
import type { ConsistencyResult } from './tgssConsistencyChecker';
import type { RegistrationDeadlineSummary } from './registrationDeadlineEngine';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Overall pre-integration status */
export type PreIntegrationStatus =
  | 'incomplete'             // Missing required fields
  | 'format_errors'          // Fields present but invalid format
  | 'blocked_by_consistency' // Consistency errors prevent preparation
  | 'ready_internal'         // Data complete + consistent, docs may be pending
  | 'tgss_prepared';         // Fully prepared for future integration

export interface PreIntegrationSummary {
  /** Overall status */
  status: PreIntegrationStatus;
  /** Human-readable label */
  statusLabel: string;
  /** Detailed explanation */
  statusMessage: string;

  /** Sub-signal: field completeness */
  fieldReadiness: {
    requiredFilled: number;
    requiredTotal: number;
    percent: number;
    complete: boolean;
  };
  /** Sub-signal: format validation */
  formatValidation: {
    errorCount: number;
    errors: string[];
    clean: boolean;
  };
  /** Sub-signal: consistency */
  consistency: {
    errorCount: number;
    warningCount: number;
    errors: string[];
    warnings: string[];
    consistent: boolean;
  };
  /** Sub-signal: doc completeness (null if unavailable) */
  docReadiness: {
    percent: number;
    mandatoryComplete: boolean;
  } | null;
  /** Sub-signal: deadline status (null if unavailable) */
  deadlineStatus: {
    hasRisk: boolean;
    urgency: string;
  } | null;

  /** Payload result (from builder) */
  payload: TGSSPayloadResult;

  /** Actionable next steps */
  nextSteps: string[];

  /** Can this process proceed to a future integration step? */
  canProceed: boolean;
}

// ─── Status labels ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PreIntegrationStatus, string> = {
  incomplete: 'Incompleto',
  format_errors: 'Errores de formato',
  blocked_by_consistency: 'Inconsistencias detectadas',
  ready_internal: 'Preparado internamente',
  tgss_prepared: 'Preparado para TGSS',
};

// ─── Evaluator ──────────────────────────────────────────────────────────────

export interface PreIntegrationContext {
  /** Doc completeness percentage (0-100) */
  docReadinessPercent?: number;
  /** Are all mandatory docs present? */
  docMandatoryComplete?: boolean;
  /** Deadline summary from deadline engine */
  deadlineSummary?: RegistrationDeadlineSummary | null;
}

export function evaluatePreIntegrationReadiness(
  data: RegistrationData | null,
  context?: PreIntegrationContext,
): PreIntegrationSummary {
  // Build payload with doc context
  const payload = buildTGSSPayload(data, {
    docReadinessPercent: context?.docReadinessPercent,
  });

  const nextSteps: string[] = [];

  // ── Field readiness ───────────────────────────────────────────────────
  const fieldReadiness = {
    requiredFilled: payload.validations.filter(v => v.required && v.present).length,
    requiredTotal: payload.validations.filter(v => v.required).length,
    percent: payload.readinessPercent,
    complete: payload.missingFields.length === 0,
  };

  // ── Format validation ─────────────────────────────────────────────────
  const formatValidation = {
    errorCount: payload.formatErrors.length,
    errors: payload.formatErrors.map(e => e.error || `${e.label}: formato inválido`),
    clean: payload.formatErrors.length === 0,
  };

  // ── Consistency ───────────────────────────────────────────────────────
  const consistency = {
    errorCount: payload.consistency.errors.length,
    warningCount: payload.consistency.warnings.length,
    errors: payload.consistency.errors.map(e => e.message),
    warnings: payload.consistency.warnings.map(e => e.message),
    consistent: payload.consistency.isConsistent,
  };

  // ── Doc readiness ─────────────────────────────────────────────────────
  const docReadiness = context?.docReadinessPercent != null ? {
    percent: context.docReadinessPercent,
    mandatoryComplete: context.docMandatoryComplete ?? false,
  } : null;

  // ── Deadline status ───────────────────────────────────────────────────
  const deadlineStatus = context?.deadlineSummary ? {
    hasRisk: context.deadlineSummary.hasRisk,
    urgency: context.deadlineSummary.worstUrgency,
  } : null;

  // ── Determine status ──────────────────────────────────────────────────
  let status: PreIntegrationStatus;
  let statusMessage: string;

  if (!fieldReadiness.complete) {
    status = 'incomplete';
    const missing = payload.missingFields.map(f => f.label);
    statusMessage = `Faltan ${missing.length} campo(s) obligatorio(s): ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`;
    nextSteps.push(...missing.map(f => `Completar: ${f}`));
  } else if (!formatValidation.clean) {
    status = 'format_errors';
    statusMessage = `${formatValidation.errorCount} error(es) de formato en campos obligatorios`;
    nextSteps.push(...formatValidation.errors.slice(0, 3));
  } else if (!consistency.consistent) {
    status = 'blocked_by_consistency';
    statusMessage = `${consistency.errorCount} inconsistencia(s) que impiden la preparación`;
    nextSteps.push(...consistency.errors.slice(0, 3));
  } else if (!docReadiness?.mandatoryComplete && docReadiness != null) {
    status = 'ready_internal';
    statusMessage = 'Datos completos y consistentes — documentación obligatoria pendiente';
    nextSteps.push('Completar documentación obligatoria del expediente');
  } else {
    status = 'tgss_prepared';
    statusMessage = 'Proceso preparado para futura integración TGSS';
  }

  // Add warning-level next steps
  if (consistency.warningCount > 0 && status !== 'blocked_by_consistency') {
    nextSteps.push(`Revisar ${consistency.warningCount} advertencia(s) de consistencia`);
  }
  if (deadlineStatus?.hasRisk) {
    nextSteps.push('Atender riesgo temporal del proceso de alta');
  }

  const canProceed = status === 'tgss_prepared' || status === 'ready_internal';

  return {
    status,
    statusLabel: STATUS_LABELS[status],
    statusMessage,
    fieldReadiness,
    formatValidation,
    consistency,
    docReadiness,
    deadlineStatus,
    payload,
    nextSteps,
    canProceed,
  };
}
