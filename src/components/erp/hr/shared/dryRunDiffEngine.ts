/**
 * dryRunDiffEngine — V2-ES.8 Tramo 4
 * Pure function engine for comparing two successive dry-run results.
 * Produces a structured diff report with deltas in score, validation, payload, and status.
 *
 * No side effects, no DB access.
 */

import type { DryRunResult } from '@/hooks/erp/hr/useDryRunPersistence';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DiffDirection = 'improved' | 'degraded' | 'unchanged' | 'new' | 'removed';

export interface DiffItem {
  field: string;
  label: string;
  direction: DiffDirection;
  oldValue: unknown;
  newValue: unknown;
  /** Optional human-readable explanation */
  explanation?: string;
}

export interface ValidationDiffSummary {
  scoreOld: number;
  scoreNew: number;
  scoreDelta: number;
  direction: DiffDirection;
  errorsOld: number;
  errorsNew: number;
  warningsOld: number;
  warningsNew: number;
  passedOld: boolean;
  passedNew: boolean;
  /** Checks that changed between runs */
  changedChecks: Array<{
    message: string;
    oldPassed: boolean;
    newPassed: boolean;
    severity: string;
  }>;
}

export interface DryRunDiffReport {
  /** ID of the older (baseline) run */
  baselineId: string;
  /** ID of the newer (comparison) run */
  comparisonId: string;
  /** Domain of the runs */
  domain: string;
  /** Execution numbers */
  baselineExecNumber: number;
  comparisonExecNumber: number;
  /** Timestamps */
  baselineAt: string;
  comparisonAt: string;
  /** Overall direction */
  overallDirection: DiffDirection;
  /** Score delta */
  readinessScoreDelta: number;
  /** Detailed field diffs */
  diffs: DiffItem[];
  /** Validation diff */
  validationDiff: ValidationDiffSummary | null;
  /** Payload structural diff (key-level) */
  payloadKeysDiff: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  /** Human-readable summary */
  summaryText: string;
  /** Generated at */
  generatedAt: string;
}

// ─── Diff computation ───────────────────────────────────────────────────────

function computeDirection(oldVal: number, newVal: number): DiffDirection {
  if (newVal > oldVal) return 'improved';
  if (newVal < oldVal) return 'degraded';
  return 'unchanged';
}

function diffPayloadKeys(
  oldPayload: Record<string, unknown> | null,
  newPayload: Record<string, unknown> | null,
): { added: string[]; removed: string[]; modified: string[] } {
  const oldKeys = new Set(Object.keys(flattenObject(oldPayload || {})));
  const newKeys = new Set(Object.keys(flattenObject(newPayload || {})));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  const flatOld = flattenObject(oldPayload || {});
  const flatNew = flattenObject(newPayload || {});

  for (const k of newKeys) {
    if (!oldKeys.has(k)) {
      added.push(k);
    } else if (JSON.stringify(flatOld[k]) !== JSON.stringify(flatNew[k])) {
      modified.push(k);
    }
  }
  for (const k of oldKeys) {
    if (!newKeys.has(k)) removed.push(k);
  }

  return { added, removed, modified };
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function diffValidation(
  oldVal: Record<string, unknown> | null,
  newVal: Record<string, unknown> | null,
): ValidationDiffSummary | null {
  if (!oldVal && !newVal) return null;

  const scoreOld = (oldVal?.score as number) || 0;
  const scoreNew = (newVal?.score as number) || 0;
  const errorsOld = (oldVal?.errorCount as number) || 0;
  const errorsNew = (newVal?.errorCount as number) || 0;
  const warningsOld = (oldVal?.warningCount as number) || 0;
  const warningsNew = (newVal?.warningCount as number) || 0;
  const passedOld = (oldVal?.passed as boolean) || false;
  const passedNew = (newVal?.passed as boolean) || false;

  // Compare individual checks by message
  const oldChecks = ((oldVal?.checks as any[]) || []);
  const newChecks = ((newVal?.checks as any[]) || []);
  const changedChecks: ValidationDiffSummary['changedChecks'] = [];

  const oldCheckMap = new Map(oldChecks.map(c => [c.message, c]));
  const newCheckMap = new Map(newChecks.map(c => [c.message, c]));

  for (const [msg, newCheck] of newCheckMap) {
    const oldCheck = oldCheckMap.get(msg);
    if (oldCheck && oldCheck.passed !== newCheck.passed) {
      changedChecks.push({
        message: msg,
        oldPassed: oldCheck.passed,
        newPassed: newCheck.passed,
        severity: newCheck.severity || 'info',
      });
    }
  }

  return {
    scoreOld,
    scoreNew,
    scoreDelta: scoreNew - scoreOld,
    direction: computeDirection(scoreOld, scoreNew),
    errorsOld,
    errorsNew,
    warningsOld,
    warningsNew,
    passedOld,
    passedNew,
    changedChecks,
  };
}

// ─── Main diff function ─────────────────────────────────────────────────────

/**
 * Compare two dry-run results and produce a structured diff report.
 * `baseline` is the older run, `comparison` is the newer run.
 */
export function computeDryRunDiff(
  baseline: DryRunResult,
  comparison: DryRunResult,
): DryRunDiffReport {
  const diffs: DiffItem[] = [];

  // Status
  if (baseline.status !== comparison.status) {
    diffs.push({
      field: 'status',
      label: 'Estado',
      direction: comparison.status === 'success' ? 'improved' : comparison.status === 'failed' ? 'degraded' : 'unchanged',
      oldValue: baseline.status,
      newValue: comparison.status,
    });
  }

  // Readiness score
  const scoreDelta = comparison.readiness_score - baseline.readiness_score;
  if (scoreDelta !== 0) {
    diffs.push({
      field: 'readiness_score',
      label: 'Readiness score',
      direction: computeDirection(baseline.readiness_score, comparison.readiness_score),
      oldValue: baseline.readiness_score,
      newValue: comparison.readiness_score,
      explanation: `${scoreDelta > 0 ? '+' : ''}${scoreDelta} puntos`,
    });
  }

  // Duration
  if (baseline.duration_ms && comparison.duration_ms && baseline.duration_ms !== comparison.duration_ms) {
    diffs.push({
      field: 'duration_ms',
      label: 'Duración',
      direction: comparison.duration_ms < baseline.duration_ms ? 'improved' : 'degraded',
      oldValue: `${baseline.duration_ms}ms`,
      newValue: `${comparison.duration_ms}ms`,
    });
  }

  // Execution mode
  if (baseline.execution_mode !== comparison.execution_mode) {
    diffs.push({
      field: 'execution_mode',
      label: 'Modo ejecución',
      direction: 'unchanged',
      oldValue: baseline.execution_mode,
      newValue: comparison.execution_mode,
    });
  }

  // Readiness status
  if (baseline.readiness_status !== comparison.readiness_status) {
    diffs.push({
      field: 'readiness_status',
      label: 'Estado readiness',
      direction: comparison.readiness_status === 'ready' ? 'improved' : 'unchanged',
      oldValue: baseline.readiness_status,
      newValue: comparison.readiness_status,
    });
  }

  // Validation diff
  const validationDiff = diffValidation(
    baseline.validation_result as Record<string, unknown> | null,
    comparison.validation_result as Record<string, unknown> | null,
  );

  // Payload diff
  const payloadOld = (baseline.payload_snapshot as any)?.data || {};
  const payloadNew = (comparison.payload_snapshot as any)?.data || {};
  const payloadKeysDiff = diffPayloadKeys(payloadOld, payloadNew);

  // Compute overall direction
  let overallDirection: DiffDirection = 'unchanged';
  if (scoreDelta > 0 || (validationDiff && validationDiff.direction === 'improved')) {
    overallDirection = 'improved';
  } else if (scoreDelta < 0 || (validationDiff && validationDiff.direction === 'degraded')) {
    overallDirection = 'degraded';
  }

  // Summary text
  const parts: string[] = [];
  if (scoreDelta !== 0) {
    parts.push(`Score: ${scoreDelta > 0 ? '+' : ''}${scoreDelta}%`);
  }
  if (validationDiff) {
    const errorDelta = validationDiff.errorsNew - validationDiff.errorsOld;
    if (errorDelta !== 0) parts.push(`Errores: ${errorDelta > 0 ? '+' : ''}${errorDelta}`);
    if (validationDiff.changedChecks.length > 0) parts.push(`${validationDiff.changedChecks.length} checks cambiados`);
  }
  if (payloadKeysDiff.added.length > 0) parts.push(`+${payloadKeysDiff.added.length} campos`);
  if (payloadKeysDiff.removed.length > 0) parts.push(`-${payloadKeysDiff.removed.length} campos`);
  if (payloadKeysDiff.modified.length > 0) parts.push(`~${payloadKeysDiff.modified.length} campos modificados`);

  return {
    baselineId: baseline.id,
    comparisonId: comparison.id,
    domain: comparison.submission_domain,
    baselineExecNumber: baseline.execution_number,
    comparisonExecNumber: comparison.execution_number,
    baselineAt: baseline.created_at,
    comparisonAt: comparison.created_at,
    overallDirection,
    readinessScoreDelta: scoreDelta,
    diffs,
    validationDiff,
    payloadKeysDiff,
    summaryText: parts.length > 0 ? parts.join(' · ') : 'Sin cambios significativos',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get human-readable label for diff direction.
 */
export function getDiffDirectionLabel(dir: DiffDirection): string {
  const labels: Record<DiffDirection, string> = {
    improved: '↑ Mejorado',
    degraded: '↓ Degradado',
    unchanged: '— Sin cambios',
    new: '+ Nuevo',
    removed: '− Eliminado',
  };
  return labels[dir];
}

/**
 * Get color class for diff direction (using semantic tokens where possible).
 */
export function getDiffDirectionColor(dir: DiffDirection): string {
  const colors: Record<DiffDirection, string> = {
    improved: 'text-green-600',
    degraded: 'text-destructive',
    unchanged: 'text-muted-foreground',
    new: 'text-blue-600',
    removed: 'text-amber-600',
  };
  return colors[dir];
}
