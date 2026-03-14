/**
 * registrationClosureEngine — Operational closure evaluation and snapshot builder
 * V2-ES.5 Paso 4: Evaluates closure readiness and builds immutable closure evidence
 *
 * Pure functions — no side effects, no DB access.
 * NOT official TGSS closure — internal operational closure only.
 */
import type { RegistrationData } from '@/hooks/erp/hr/useHRRegistrationProcess';
import {
  evaluatePreIntegrationReadiness,
  type PreIntegrationSummary,
  type PreIntegrationContext,
} from './tgssPreIntegrationReadiness';
import type { TGSSPayload } from './tgssPayloadBuilder';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Closure snapshot version */
export const CLOSURE_SNAPSHOT_VERSION = '1.0' as const;

/** Immutable snapshot captured at closure time */
export interface ClosureSnapshot {
  version: typeof CLOSURE_SNAPSHOT_VERSION;
  closed_at: string;
  pre_integration: {
    status: string;
    readiness_percent: number;
    consistency_errors: number;
    consistency_warnings: number;
  };
  payload: TGSSPayload | null;
  field_readiness: {
    required_filled: number;
    required_total: number;
    percent: number;
  };
  doc_readiness: {
    percent: number;
    mandatory_complete: boolean;
  } | null;
  deadline_status: {
    has_risk: boolean;
    urgency: string;
  } | null;
}

/** A single reason why closure is blocked */
export interface ClosureBlocker {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

/** Result of evaluating whether a process can be closed */
export interface ClosureReadinessResult {
  /** Can the process be closed right now? */
  canClose: boolean;
  /** Blocking issues that prevent closure */
  blockers: ClosureBlocker[];
  /** Non-blocking warnings */
  warnings: ClosureBlocker[];
  /** Is the process already closed? */
  alreadyClosed: boolean;
  /** Is the process already confirmed (no need for internal closure)? */
  alreadyConfirmed: boolean;
  /** Pre-integration summary used for evaluation */
  preIntegration: PreIntegrationSummary;
}

// ─── Closure readiness evaluator ────────────────────────────────────────────

export function evaluateClosureReadiness(
  data: RegistrationData | null,
  context?: PreIntegrationContext,
): ClosureReadinessResult {
  const preIntegration = evaluatePreIntegrationReadiness(data, context);
  const blockers: ClosureBlocker[] = [];
  const warnings: ClosureBlocker[] = [];

  // No data at all
  if (!data) {
    blockers.push({
      code: 'NO_DATA',
      message: 'No existe proceso de alta para evaluar',
      severity: 'error',
    });
    return { canClose: false, blockers, warnings, alreadyClosed: false, alreadyConfirmed: false, preIntegration };
  }

  // Already closed?
  const alreadyClosed = (data as any).closure_status === 'closed';
  const alreadyConfirmed = data.registration_status === 'confirmed';

  if (alreadyClosed) {
    return { canClose: false, blockers, warnings, alreadyClosed: true, alreadyConfirmed, preIntegration };
  }

  if (alreadyConfirmed) {
    return { canClose: false, blockers, warnings, alreadyClosed: false, alreadyConfirmed: true, preIntegration };
  }

  // Gate: pre-integration must allow proceeding
  if (!preIntegration.canProceed) {
    // Translate pre-integration status to closure blockers
    if (preIntegration.status === 'incomplete') {
      blockers.push({
        code: 'INCOMPLETE_FIELDS',
        message: `Faltan ${preIntegration.fieldReadiness.requiredTotal - preIntegration.fieldReadiness.requiredFilled} campo(s) obligatorio(s)`,
        severity: 'error',
      });
    }
    if (preIntegration.status === 'format_errors') {
      blockers.push({
        code: 'FORMAT_ERRORS',
        message: `${preIntegration.formatValidation.errorCount} error(es) de formato`,
        severity: 'error',
      });
    }
    if (preIntegration.status === 'blocked_by_consistency') {
      blockers.push({
        code: 'CONSISTENCY_ERRORS',
        message: `${preIntegration.consistency.errorCount} inconsistencia(s) bloqueante(s)`,
        severity: 'error',
      });
    }
  }

  // Non-blocking warnings
  if (preIntegration.consistency.warningCount > 0) {
    warnings.push({
      code: 'CONSISTENCY_WARNINGS',
      message: `${preIntegration.consistency.warningCount} advertencia(s) de consistencia`,
      severity: 'warning',
    });
  }
  if (preIntegration.deadlineStatus?.hasRisk) {
    warnings.push({
      code: 'DEADLINE_RISK',
      message: 'El proceso tiene riesgo temporal',
      severity: 'warning',
    });
  }
  if (preIntegration.docReadiness && !preIntegration.docReadiness.mandatoryComplete) {
    // Doc incompleteness is a warning at closure (data is ready, docs may trail)
    warnings.push({
      code: 'DOCS_INCOMPLETE',
      message: 'Documentación obligatoria pendiente',
      severity: 'warning',
    });
  }

  const canClose = blockers.length === 0;

  return { canClose, blockers, warnings, alreadyClosed, alreadyConfirmed, preIntegration };
}

// ─── Closure snapshot builder ───────────────────────────────────────────────

export function buildClosureSnapshot(
  preIntegration: PreIntegrationSummary,
): ClosureSnapshot {
  return {
    version: CLOSURE_SNAPSHOT_VERSION,
    closed_at: new Date().toISOString(),
    pre_integration: {
      status: preIntegration.status,
      readiness_percent: preIntegration.payload.readinessPercent,
      consistency_errors: preIntegration.consistency.errorCount,
      consistency_warnings: preIntegration.consistency.warningCount,
    },
    payload: preIntegration.payload.payload,
    field_readiness: {
      required_filled: preIntegration.fieldReadiness.requiredFilled,
      required_total: preIntegration.fieldReadiness.requiredTotal,
      percent: preIntegration.fieldReadiness.percent,
    },
    doc_readiness: preIntegration.docReadiness
      ? { percent: preIntegration.docReadiness.percent, mandatory_complete: preIntegration.docReadiness.mandatoryComplete }
      : null,
    deadline_status: preIntegration.deadlineStatus
      ? { has_risk: preIntegration.deadlineStatus.hasRisk, urgency: preIntegration.deadlineStatus.urgency }
      : null,
  };
}
