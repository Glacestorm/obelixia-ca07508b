/**
 * contractClosureEngine — Operational closure evaluation and snapshot builder
 * V2-ES.6 Paso 3: Evaluates closure readiness and builds immutable closure evidence
 *
 * Mirrors registrationClosureEngine.ts pattern (alta/afiliación).
 * Pure functions — no side effects, no DB access.
 * NOT official SEPE closure — internal operational closure only.
 */
import type { ContractProcessData } from '@/hooks/erp/hr/useHRContractProcess';
import {
  evaluateContrataPreIntegrationReadiness,
  type ContrataPreIntegrationSummary,
  type ContrataPreIntegrationContext,
} from './contrataPreIntegrationReadiness';
import type { ContrataPayload } from './contrataPayloadBuilder';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Closure snapshot version */
export const CONTRACT_CLOSURE_SNAPSHOT_VERSION = '1.0' as const;

/** Immutable snapshot captured at closure time */
export interface ContractClosureSnapshot {
  version: typeof CONTRACT_CLOSURE_SNAPSHOT_VERSION;
  closed_at: string;
  pre_integration: {
    status: string;
    readiness_percent: number;
    consistency_errors: number;
    consistency_warnings: number;
  };
  payload: ContrataPayload | null;
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
  contract_summary: {
    type_code: string | null;
    start_date: string | null;
    end_date: string | null;
    duration_type: string | null;
    working_hours_type: string | null;
    is_conversion: boolean;
  };
}

/** A single reason why closure is blocked */
export interface ContractClosureBlocker {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

/** Result of evaluating whether a contract process can be closed */
export interface ContractClosureReadinessResult {
  canClose: boolean;
  blockers: ContractClosureBlocker[];
  warnings: ContractClosureBlocker[];
  alreadyClosed: boolean;
  alreadyConfirmed: boolean;
  preIntegration: ContrataPreIntegrationSummary;
}

// ─── Closure readiness evaluator ────────────────────────────────────────────

export function evaluateContractClosureReadiness(
  data: ContractProcessData | null,
  context?: ContrataPreIntegrationContext,
): ContractClosureReadinessResult {
  const preIntegration = evaluateContrataPreIntegrationReadiness(data, context);
  const blockers: ContractClosureBlocker[] = [];
  const warnings: ContractClosureBlocker[] = [];

  if (!data) {
    blockers.push({
      code: 'NO_DATA',
      message: 'No existe proceso de contratación para evaluar',
      severity: 'error',
    });
    return { canClose: false, blockers, warnings, alreadyClosed: false, alreadyConfirmed: false, preIntegration };
  }

  const alreadyClosed = data.closure_status === 'closed';
  const alreadyConfirmed = data.contract_process_status === 'confirmed';

  if (alreadyClosed) {
    return { canClose: false, blockers, warnings, alreadyClosed: true, alreadyConfirmed, preIntegration };
  }

  if (alreadyConfirmed) {
    return { canClose: false, blockers, warnings, alreadyClosed: false, alreadyConfirmed: true, preIntegration };
  }

  // Gate: pre-integration must allow proceeding
  if (!preIntegration.canProceed) {
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

export function buildContractClosureSnapshot(
  preIntegration: ContrataPreIntegrationSummary,
  data: ContractProcessData | null,
): ContractClosureSnapshot {
  return {
    version: CONTRACT_CLOSURE_SNAPSHOT_VERSION,
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
    contract_summary: {
      type_code: data?.contract_type_code ?? null,
      start_date: data?.contract_start_date ?? null,
      end_date: data?.contract_end_date ?? null,
      duration_type: data?.contract_duration_type ?? null,
      working_hours_type: data?.working_hours_type ?? null,
      is_conversion: data?.is_conversion ?? false,
    },
  };
}
