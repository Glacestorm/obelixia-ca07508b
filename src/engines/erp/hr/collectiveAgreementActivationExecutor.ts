/**
 * B9 — Collective Agreement Activation Executor (pure, admin-gated).
 *
 * Performs the effective activation of a registry agreement so it
 * becomes ready_for_payroll = true ONLY in the master registry,
 * gated by:
 *   - admin/superadmin role,
 *   - presence of an `approved_for_activation` B8B request,
 *   - a valid second approval (approver != requester),
 *   - a real-time recomputation of the readiness report,
 *   - the existing DB trigger `enforce_ca_registry_ready_for_payroll`
 *     as the last line of defense.
 *
 * HARD SAFETY:
 *  - Pure. No Supabase, no fetch, no React, no payroll imports.
 *  - All I/O via injected adapter.
 *  - NEVER touches the operational table `erp_hr_collective_agreements`
 *    (without `_registry`).
 *  - NEVER imports payslipEngine, payrollEngine, salaryNormalizer,
 *    agreementSalaryResolver or useESPayrollBridge.
 *  - Patch on the registry contains EXACTLY the 6 allowed keys.
 *  - Rollback is admin-only and append-only (uses pre_state snapshot).
 */

import {
  computeActivationReadiness,
  type ActivationReadinessReport,
  type RegistryAgreementLike,
  type RegistryVersionLike,
  type RegistryValidationLike,
  type RegistrySourceLike,
} from './collectiveAgreementActivationReadiness';
import { computeSha256Hex } from './collectiveAgreementDocumentHasher';

// =============================================================
// Types
// =============================================================

export type ExecutorRole = 'admin' | 'superadmin';

export type ActivationRunOutcome =
  | 'activated'
  | 'blocked_by_trigger'
  | 'blocked_by_invariant'
  | 'rolled_back';

export interface ActivationRequestRow {
  id: string;
  agreement_id: string;
  version_id: string;
  validation_id: string;
  requested_by: string;
  requested_role: string;
  activation_status:
    | 'draft'
    | 'pending_second_approval'
    | 'approved_for_activation'
    | 'rejected'
    | 'superseded';
  readiness_passed: boolean;
}

export interface ActivationApprovalRow {
  id: string;
  request_id: string;
  approver_id: string;
  approver_role: string;
  decision: 'approved' | 'rejected';
}

export interface ActivationRunRow {
  id: string;
  request_id: string | null;
  agreement_id: string | null;
  version_id: string | null;
  validation_id: string | null;
  executed_by: string | null;
  executed_at: string | null;
  pre_state_snapshot_json: Record<string, unknown> | null;
  post_state_snapshot_json: Record<string, unknown> | null;
  outcome: ActivationRunOutcome | null;
  error_detail: string | null;
  run_signature_hash: string | null;
}

export interface ActivationRunInsert {
  request_id: string;
  agreement_id: string | null;
  version_id: string | null;
  validation_id: string | null;
  executed_by: string;
  executed_at: string;
  pre_state_snapshot_json: Record<string, unknown> | null;
  post_state_snapshot_json: Record<string, unknown> | null;
  outcome: ActivationRunOutcome;
  error_detail: string | null;
  run_signature_hash: string | null;
}

export interface ReadinessCounts {
  agreement_id: string;
  version_id: string;
}

export interface ActivationExecutorAdapter {
  roleAuthorized(
    userId: string,
    roles: readonly ExecutorRole[],
  ): Promise<boolean>;

  fetchRequest(requestId: string): Promise<ActivationRequestRow | null>;
  fetchApproval(requestId: string): Promise<ActivationApprovalRow | null>;

  fetchAgreement(id: string): Promise<RegistryAgreementLike | null>;
  fetchVersion(id: string): Promise<RegistryVersionLike | null>;
  fetchValidation(id: string): Promise<RegistryValidationLike | null>;
  fetchSource(validationId: string): Promise<RegistrySourceLike | null>;

  countWarnings(input: ReadinessCounts): Promise<number>;
  countDiscardedRows(input: ReadinessCounts): Promise<number>;
  countSalaryTables(input: ReadinessCounts): Promise<number>;
  countRules(input: ReadinessCounts): Promise<number>;

  fetchRegistryRow(
    agreementId: string,
  ): Promise<Record<string, unknown> | null>;
  /**
   * Apply the patch on the registry. MUST throw an Error whose `name`
   * or `code` exposes 'check_violation' (Postgres SQLSTATE 23514) when
   * the existing `enforce_ca_registry_ready_for_payroll` trigger blocks
   * the update. Any other error is treated as INTERNAL_ERROR.
   */
  applyRegistryPatch(
    agreementId: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;

  insertRun(row: ActivationRunInsert): Promise<{ id: string }>;
  fetchRun(runId: string): Promise<ActivationRunRow | null>;
  fetchRollbackRunForRequest(
    requestId: string,
  ): Promise<ActivationRunRow | null>;
}

// =============================================================
// Public input/output
// =============================================================

export interface ActivateRegistryInput {
  request_id: string;
  executed_by: string;
}

export interface ActivationExecuteResult {
  outcome: ActivationRunOutcome | 'rejected';
  run_id?: string;
  error_code?:
    | 'INSUFFICIENT_ROLE'
    | 'NOT_FOUND'
    | 'INVALID_STATE'
    | 'NO_VALID_APPROVAL'
    | 'BLOCKED_BY_INVARIANT'
    | 'BLOCKED_BY_TRIGGER'
    | 'INTERNAL_ERROR';
  error_detail?: string;
  registry_patch?: Record<string, unknown>;
  readiness_report?: ActivationReadinessReport;
  pre_state?: Record<string, unknown> | null;
  post_state?: Record<string, unknown> | null;
  run_signature_hash?: string;
}

export interface RollbackActivationInput {
  run_id: string;
  executed_by: string;
}

export interface ActivationRollbackResult {
  outcome: 'rolled_back' | 'rejected';
  run_id?: string;
  error_code?:
    | 'INSUFFICIENT_ROLE'
    | 'NOT_FOUND'
    | 'INVALID_STATE'
    | 'ALREADY_ROLLED_BACK'
    | 'INTERNAL_ERROR';
  error_detail?: string;
  restored_state?: Record<string, unknown>;
  run_signature_hash?: string;
}

// =============================================================
// Constants
// =============================================================

export const ALLOWED_PATCH_KEYS = [
  'data_completeness',
  'requires_human_review',
  'ready_for_payroll',
  'activated_for_payroll_at',
  'activated_by',
  'activation_request_id',
] as const;

export const ROLLBACK_RESTORE_KEYS = [
  'data_completeness',
  'requires_human_review',
  'ready_for_payroll',
  'activated_for_payroll_at',
  'activated_by',
  'activation_request_id',
] as const;

const ADMIN_ROLES: readonly ExecutorRole[] = ['admin', 'superadmin'];

// =============================================================
// Helpers
// =============================================================

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
      .join(',') +
    '}'
  );
}

/**
 * Identify a Postgres `check_violation` (SQLSTATE 23514) raised by the
 * existing `enforce_ca_registry_ready_for_payroll` trigger.
 */
export function isCheckViolation(e: unknown): boolean {
  if (!e) return false;
  const anyE = e as { code?: string; name?: string; message?: string };
  if (anyE.code === '23514') return true;
  const text = `${anyE.name ?? ''} ${anyE.message ?? ''}`.toLowerCase();
  return text.includes('check_violation') || text.includes('ready_for_payroll=true requires');
}

function pickReadinessSnapshotKeys(
  row: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!row) return out;
  for (const k of ROLLBACK_RESTORE_KEYS) {
    out[k] = (row as Record<string, unknown>)[k] ?? null;
  }
  return out;
}

async function loadReadinessForRequest(
  req: ActivationRequestRow,
  adapter: ActivationExecutorAdapter,
): Promise<{
  agreement: RegistryAgreementLike;
  version: RegistryVersionLike;
  validation: RegistryValidationLike;
  source: RegistrySourceLike;
  salaryTablesCount: number;
  rulesCount: number;
  unresolvedCriticalWarningsCount: number;
  discardedCriticalRowsUnresolvedCount: number;
}> {
  const [agreement, version, validation] = await Promise.all([
    adapter.fetchAgreement(req.agreement_id),
    adapter.fetchVersion(req.version_id),
    adapter.fetchValidation(req.validation_id),
  ]);
  if (!agreement || !version || !validation) {
    throw new Error('READINESS_DOMAIN_MISSING');
  }
  const source = await adapter.fetchSource(validation.id);
  if (!source) throw new Error('READINESS_DOMAIN_MISSING');

  const counts = { agreement_id: agreement.id, version_id: version.id };
  const [salaryTablesCount, rulesCount, unresolvedCriticalWarningsCount, discardedCriticalRowsUnresolvedCount] =
    await Promise.all([
      adapter.countSalaryTables(counts),
      adapter.countRules(counts),
      adapter.countWarnings(counts),
      adapter.countDiscardedRows(counts),
    ]);

  return {
    agreement,
    version,
    validation,
    source,
    salaryTablesCount,
    rulesCount,
    unresolvedCriticalWarningsCount,
    discardedCriticalRowsUnresolvedCount,
  };
}

// =============================================================
// activateRegistry
// =============================================================

export async function activateRegistry(
  input: ActivateRegistryInput,
  adapter: ActivationExecutorAdapter,
  options?: { now?: () => string },
): Promise<ActivationExecuteResult> {
  const nowIso = (options?.now ?? (() => new Date().toISOString()))();

  // 1) Role-check
  const ok = await adapter.roleAuthorized(input.executed_by, ADMIN_ROLES);
  if (!ok) {
    return { outcome: 'rejected', error_code: 'INSUFFICIENT_ROLE' };
  }

  // 2) Request
  const request = await adapter.fetchRequest(input.request_id);
  if (!request) {
    return { outcome: 'rejected', error_code: 'NOT_FOUND', error_detail: 'request' };
  }
  if (request.activation_status !== 'approved_for_activation') {
    return {
      outcome: 'rejected',
      error_code: 'INVALID_STATE',
      error_detail: `status=${request.activation_status}`,
    };
  }

  // 3) Approval
  const approval = await adapter.fetchApproval(request.id);
  if (
    !approval ||
    approval.decision !== 'approved' ||
    approval.approver_id === request.requested_by
  ) {
    return { outcome: 'rejected', error_code: 'NO_VALID_APPROVAL' };
  }

  // 4) Reload domain + recompute readiness
  let readinessInputs;
  try {
    readinessInputs = await loadReadinessForRequest(request, adapter);
  } catch {
    return { outcome: 'rejected', error_code: 'NOT_FOUND', error_detail: 'domain' };
  }
  const report = computeActivationReadiness(readinessInputs);

  if (!report.passed) {
    const detail = report.blocking_failures.join(',');
    const { id: runId } = await adapter.insertRun({
      request_id: request.id,
      agreement_id: request.agreement_id,
      version_id: request.version_id,
      validation_id: request.validation_id,
      executed_by: input.executed_by,
      executed_at: nowIso,
      pre_state_snapshot_json: null,
      post_state_snapshot_json: null,
      outcome: 'blocked_by_invariant',
      error_detail: detail,
      run_signature_hash: null,
    });
    return {
      outcome: 'blocked_by_invariant',
      run_id: runId,
      error_code: 'BLOCKED_BY_INVARIANT',
      error_detail: detail,
      readiness_report: report,
    };
  }

  // 5) Snapshot pre
  const preRow = await adapter.fetchRegistryRow(request.agreement_id);
  const preSnapshot = pickReadinessSnapshotKeys(preRow);

  // 6) Patch (EXACT 6 keys)
  const patch: Record<string, unknown> = {
    data_completeness: 'human_validated',
    requires_human_review: false,
    ready_for_payroll: true,
    activated_for_payroll_at: nowIso,
    activated_by: input.executed_by,
    activation_request_id: request.id,
  };

  // Defensive: ensure no extra key sneaks in
  for (const k of Object.keys(patch)) {
    if (!(ALLOWED_PATCH_KEYS as readonly string[]).includes(k)) {
      return { outcome: 'rejected', error_code: 'INTERNAL_ERROR', error_detail: 'patch_shape' };
    }
  }

  // 7) Apply patch
  let postRow: Record<string, unknown> | null = null;
  try {
    postRow = await adapter.applyRegistryPatch(request.agreement_id, patch);
  } catch (e) {
    if (isCheckViolation(e)) {
      const { id: runId } = await adapter.insertRun({
        request_id: request.id,
        agreement_id: request.agreement_id,
        version_id: request.version_id,
        validation_id: request.validation_id,
        executed_by: input.executed_by,
        executed_at: nowIso,
        pre_state_snapshot_json: preSnapshot,
        post_state_snapshot_json: null,
        outcome: 'blocked_by_trigger',
        error_detail: 'enforce_ca_registry_ready_for_payroll',
        run_signature_hash: null,
      });
      return {
        outcome: 'blocked_by_trigger',
        run_id: runId,
        error_code: 'BLOCKED_BY_TRIGGER',
        error_detail: 'enforce_ca_registry_ready_for_payroll',
        pre_state: preSnapshot,
      };
    }
    return { outcome: 'rejected', error_code: 'INTERNAL_ERROR', error_detail: 'apply_patch' };
  }

  // 8) Snapshot post + signature
  const postSnapshot = pickReadinessSnapshotKeys(postRow);
  const sig = await computeSha256Hex(
    new TextEncoder().encode(
      stableStringify({
        request_id: request.id,
        agreement_id: request.agreement_id,
        pre: preSnapshot,
        post: postSnapshot,
        executed_by: input.executed_by,
        executed_at: nowIso,
        schema_version: 'b9-run-v1',
      }),
    ),
  );

  // 9) Insert run
  const { id: runId } = await adapter.insertRun({
    request_id: request.id,
    agreement_id: request.agreement_id,
    version_id: request.version_id,
    validation_id: request.validation_id,
    executed_by: input.executed_by,
    executed_at: nowIso,
    pre_state_snapshot_json: preSnapshot,
    post_state_snapshot_json: postSnapshot,
    outcome: 'activated',
    error_detail: null,
    run_signature_hash: sig,
  });

  return {
    outcome: 'activated',
    run_id: runId,
    registry_patch: patch,
    pre_state: preSnapshot,
    post_state: postSnapshot,
    run_signature_hash: sig,
    readiness_report: report,
  };
}

// =============================================================
// rollbackActivation
// =============================================================

export async function rollbackActivation(
  input: RollbackActivationInput,
  adapter: ActivationExecutorAdapter,
  options?: { now?: () => string },
): Promise<ActivationRollbackResult> {
  const nowIso = (options?.now ?? (() => new Date().toISOString()))();

  // 1) Role-check
  const ok = await adapter.roleAuthorized(input.executed_by, ADMIN_ROLES);
  if (!ok) {
    return { outcome: 'rejected', error_code: 'INSUFFICIENT_ROLE' };
  }

  // 2) Run lookup
  const run = await adapter.fetchRun(input.run_id);
  if (!run) {
    return { outcome: 'rejected', error_code: 'NOT_FOUND', error_detail: 'run' };
  }
  if (run.outcome !== 'activated') {
    return {
      outcome: 'rejected',
      error_code: 'INVALID_STATE',
      error_detail: `outcome=${run.outcome}`,
    };
  }

  // 3) No prior rollback for the same request
  if (run.request_id) {
    const prev = await adapter.fetchRollbackRunForRequest(run.request_id);
    if (prev) {
      return { outcome: 'rejected', error_code: 'ALREADY_ROLLED_BACK' };
    }
  }

  if (!run.pre_state_snapshot_json || !run.agreement_id || !run.request_id) {
    return { outcome: 'rejected', error_code: 'INVALID_STATE', error_detail: 'snapshot' };
  }

  // 4) Restore SOLO the allowed keys from pre_state
  const restorePatch: Record<string, unknown> = {};
  for (const k of ROLLBACK_RESTORE_KEYS) {
    restorePatch[k] = (run.pre_state_snapshot_json as Record<string, unknown>)[k] ?? null;
  }

  // Defensive: only allowed keys
  for (const k of Object.keys(restorePatch)) {
    if (!(ROLLBACK_RESTORE_KEYS as readonly string[]).includes(k)) {
      return { outcome: 'rejected', error_code: 'INTERNAL_ERROR', error_detail: 'restore_shape' };
    }
  }

  let restoredRow: Record<string, unknown> | null = null;
  try {
    restoredRow = await adapter.applyRegistryPatch(run.agreement_id, restorePatch);
  } catch {
    return { outcome: 'rejected', error_code: 'INTERNAL_ERROR', error_detail: 'apply_restore' };
  }

  const restoredSnapshot = pickReadinessSnapshotKeys(restoredRow);

  // 5) Insert rollback run (pre/post inverted vs original)
  const sig = await computeSha256Hex(
    new TextEncoder().encode(
      stableStringify({
        original_run_id: run.id,
        request_id: run.request_id,
        agreement_id: run.agreement_id,
        pre: run.post_state_snapshot_json ?? null,
        post: run.pre_state_snapshot_json,
        executed_by: input.executed_by,
        executed_at: nowIso,
        schema_version: 'b9-rollback-v1',
      }),
    ),
  );

  const { id: newRunId } = await adapter.insertRun({
    request_id: run.request_id,
    agreement_id: run.agreement_id,
    version_id: run.version_id,
    validation_id: run.validation_id,
    executed_by: input.executed_by,
    executed_at: nowIso,
    pre_state_snapshot_json:
      (run.post_state_snapshot_json as Record<string, unknown>) ?? null,
    post_state_snapshot_json:
      (run.pre_state_snapshot_json as Record<string, unknown>) ?? null,
    outcome: 'rolled_back',
    error_detail: `rolled_back_run=${run.id}`,
    run_signature_hash: sig,
  });

  return {
    outcome: 'rolled_back',
    run_id: newRunId,
    restored_state: restoredSnapshot,
    run_signature_hash: sig,
  };
}