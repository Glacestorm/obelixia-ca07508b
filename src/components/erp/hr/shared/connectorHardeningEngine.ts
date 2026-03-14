/**
 * connectorHardeningEngine — V2-ES.8 Tramo 4
 * Edge-case guards, retry policies, supersede/invalidation logic
 * for dry-run lifecycle.
 *
 * Pure functions — no side effects, no DB access.
 */

import type { DryRunResult } from '@/hooks/erp/hr/useDryRunPersistence';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SupersedeReason =
  | 'newer_execution'
  | 'config_changed'
  | 'certificate_changed'
  | 'deadline_passed'
  | 'manual_invalidation'
  | 'data_changed';

export interface SupersedeDecision {
  shouldSupersede: boolean;
  reason: SupersedeReason | null;
  explanation: string;
  /** The run that would be superseded */
  supersededRunId: string | null;
  /** The run that supersedes */
  supersedingRunId: string | null;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryableStatuses: string[];
}

export interface RetryDecision {
  canRetry: boolean;
  reason: string;
  nextAttemptNumber: number;
  waitMs: number;
}

export interface DryRunHealthCheck {
  isValid: boolean;
  isStale: boolean;
  isSuperseded: boolean;
  staleSinceMs: number;
  warnings: string[];
  recommendation: 'use' | 'refresh' | 'discard';
}

// ─── Default policies ───────────────────────────────────────────────────────

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffMs: 2000,
  backoffMultiplier: 2,
  maxBackoffMs: 30000,
  retryableStatuses: ['failed', 'partial'],
};

/** Max age before a dry-run is considered stale (7 days) */
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
/** Max age before a dry-run should be discarded (30 days) */
const DISCARD_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Retry logic ────────────────────────────────────────────────────────────

/**
 * Determine if a dry-run can be retried based on policy.
 */
export function evaluateRetry(
  result: DryRunResult,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): RetryDecision {
  const currentAttempt = result.execution_number;

  if (!policy.retryableStatuses.includes(result.status)) {
    return {
      canRetry: false,
      reason: `Estado "${result.status}" no es retriable`,
      nextAttemptNumber: currentAttempt,
      waitMs: 0,
    };
  }

  if (currentAttempt >= policy.maxRetries) {
    return {
      canRetry: false,
      reason: `Máximo de reintentos alcanzado (${policy.maxRetries})`,
      nextAttemptNumber: currentAttempt,
      waitMs: 0,
    };
  }

  const waitMs = Math.min(
    policy.backoffMs * Math.pow(policy.backoffMultiplier, currentAttempt - 1),
    policy.maxBackoffMs,
  );

  return {
    canRetry: true,
    reason: `Reintento ${currentAttempt + 1}/${policy.maxRetries} disponible`,
    nextAttemptNumber: currentAttempt + 1,
    waitMs,
  };
}

// ─── Supersede logic ────────────────────────────────────────────────────────

/**
 * Determine if a newer dry-run supersedes an older one.
 */
export function evaluateSupersede(
  olderRun: DryRunResult,
  newerRun: DryRunResult,
): SupersedeDecision {
  // Must be same domain and type
  if (olderRun.submission_domain !== newerRun.submission_domain ||
      olderRun.submission_type !== newerRun.submission_type) {
    return {
      shouldSupersede: false,
      reason: null,
      explanation: 'Runs de distinto dominio o tipo — no comparables',
      supersededRunId: null,
      supersedingRunId: null,
    };
  }

  // Newer execution number always supersedes
  if (newerRun.execution_number > olderRun.execution_number) {
    return {
      shouldSupersede: true,
      reason: 'newer_execution',
      explanation: `Ejecución #${newerRun.execution_number} reemplaza a #${olderRun.execution_number}`,
      supersededRunId: olderRun.id,
      supersedingRunId: newerRun.id,
    };
  }

  return {
    shouldSupersede: false,
    reason: null,
    explanation: 'El run más reciente no reemplaza al anterior',
    supersededRunId: null,
    supersedingRunId: null,
  };
}

/**
 * Check if configuration changes invalidate an existing dry-run.
 */
export function evaluateConfigInvalidation(
  run: DryRunResult,
  currentConfigHash: string,
  runConfigHash?: string,
): SupersedeDecision {
  const oldHash = runConfigHash || (run.metadata as any)?.configHash;

  if (!oldHash) {
    return {
      shouldSupersede: false,
      reason: null,
      explanation: 'Sin hash de configuración en el run — no se puede evaluar invalidación',
      supersededRunId: null,
      supersedingRunId: null,
    };
  }

  if (oldHash !== currentConfigHash) {
    return {
      shouldSupersede: true,
      reason: 'config_changed',
      explanation: 'La configuración ha cambiado desde este dry-run. Se recomienda re-ejecutar.',
      supersededRunId: run.id,
      supersedingRunId: null,
    };
  }

  return {
    shouldSupersede: false,
    reason: null,
    explanation: 'Configuración sin cambios',
    supersededRunId: null,
    supersedingRunId: null,
  };
}

// ─── Health check ───────────────────────────────────────────────────────────

/**
 * Evaluate the health/validity of a dry-run result.
 */
export function evaluateDryRunHealth(
  run: DryRunResult,
  newerRuns: DryRunResult[] = [],
): DryRunHealthCheck {
  const warnings: string[] = [];
  const ageMs = Date.now() - new Date(run.created_at).getTime();
  const isStale = ageMs > STALE_THRESHOLD_MS;
  const isVeryOld = ageMs > DISCARD_THRESHOLD_MS;

  // Check if superseded by a newer run in the same domain/type
  const isSuperseded = newerRuns.some(nr =>
    nr.submission_domain === run.submission_domain &&
    nr.submission_type === run.submission_type &&
    nr.execution_number > run.execution_number &&
    nr.status === 'success'
  );

  if (isStale) {
    warnings.push(`Dry-run tiene ${Math.round(ageMs / (1000 * 60 * 60 * 24))} días de antigüedad`);
  }
  if (isSuperseded) {
    warnings.push('Existe un dry-run más reciente con éxito para este dominio');
  }
  if (run.status === 'failed') {
    warnings.push('Este dry-run terminó con errores');
  }
  if (run.status === 'partial') {
    warnings.push('Dry-run con resultado parcial — revisar validación');
  }

  const isValid = run.status !== 'failed' && !isVeryOld;
  let recommendation: DryRunHealthCheck['recommendation'] = 'use';
  if (!isValid || isVeryOld) recommendation = 'discard';
  else if (isStale || isSuperseded) recommendation = 'refresh';

  return {
    isValid,
    isStale,
    isSuperseded,
    staleSinceMs: ageMs,
    warnings,
    recommendation,
  };
}

// ─── Edge-case guards ───────────────────────────────────────────────────────

/**
 * Guard: prevent dry-run execution when in an invalid lifecycle state.
 */
export function canExecuteDryRun(
  currentStatus: string,
  submissionMode: string,
): { allowed: boolean; reason: string } {
  if (submissionMode === 'real') {
    return { allowed: false, reason: 'No se permite dry-run en modo real' };
  }

  const allowedStatuses = ['ready_for_dry_run', 'dry_run_executed', 'validated_internal'];
  if (!allowedStatuses.includes(currentStatus)) {
    return { allowed: false, reason: `Estado "${currentStatus}" no permite ejecución de dry-run` };
  }

  return { allowed: true, reason: 'OK' };
}

// ─── V2-ES.8 T4: Additional hardening guards ───────────────────────────────

/**
 * Guard: prevent dry-run execution without a payload snapshot.
 */
export function hasPayloadForExecution(
  payloadSnapshot: unknown | null,
  payload: Record<string, unknown> | null,
): { allowed: boolean; reason: string } {
  if (!payloadSnapshot && (!payload || Object.keys(payload).length === 0)) {
    return { allowed: false, reason: 'No se puede ejecutar dry-run sin payload generado' };
  }
  return { allowed: true, reason: 'OK' };
}

/**
 * Guard: prevent concurrent dry-run execution on the same submission.
 * Uses a metadata flag to track in-progress state.
 */
export function isConcurrentExecution(
  metadata: Record<string, unknown> | null,
): { blocked: boolean; reason: string } {
  const inProgress = (metadata as any)?.execution_in_progress === true;
  const startedAt = (metadata as any)?.execution_started_at;

  if (inProgress && startedAt) {
    const elapsed = Date.now() - new Date(startedAt).getTime();
    // Auto-release after 5 minutes (stale lock)
    if (elapsed < 5 * 60 * 1000) {
      return { blocked: true, reason: 'Ya hay una ejecución de dry-run en progreso' };
    }
  }

  return { blocked: false, reason: 'OK' };
}

/**
 * Build metadata updates to mark execution start/end for concurrency control.
 */
export function executionLockMetadata(lock: boolean): Record<string, unknown> {
  if (lock) {
    return {
      execution_in_progress: true,
      execution_started_at: new Date().toISOString(),
    };
  }
  return {
    execution_in_progress: false,
    execution_started_at: null,
    execution_finished_at: new Date().toISOString(),
  };
}

/**
 * Mark previous dry-run results as superseded (metadata update, never delete).
 */
export function buildSupersedeMetadata(reason: SupersedeReason, supersedingRunId: string): Record<string, unknown> {
  return {
    superseded: true,
    superseded_at: new Date().toISOString(),
    superseded_by: supersedingRunId,
    supersede_reason: reason,
  };
}

/**
 * Guard: check if a dry-run result is safe to use for decision-making.
 */
export function isDryRunDecisionReady(run: DryRunResult): {
  ready: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];

  if (run.status === 'failed') {
    blockers.push('Dry-run falló — no apto para decisiones');
  }
  if (run.readiness_score < 50) {
    blockers.push(`Score de readiness bajo (${run.readiness_score}%)`);
  }
  if (!run.validation_result) {
    blockers.push('Sin resultado de validación');
  }
  if (!run.payload_snapshot) {
    blockers.push('Sin snapshot de payload');
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}

/**
 * Generate a simple hash from configuration for change detection.
 */
export function hashConfig(config: Record<string, unknown>): string {
  const str = JSON.stringify(config, Object.keys(config).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `cfg_${Math.abs(hash).toString(36)}`;
}
