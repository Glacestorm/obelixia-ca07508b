/**
 * B8B — Collective Agreement Activation Service (pure, admin-gated).
 *
 * Orchestrates the proposal workflow:
 *   create_request → submit_for_second_approval → second_approve / reject / supersede
 *
 * HARD SAFETY:
 *  - NEVER patches `erp_hr_collective_agreements_registry`
 *    (no `ready_for_payroll`, no `data_completeness`, no
 *    `requires_human_review`, no `salary_tables_loaded`).
 *  - NEVER touches the operational table
 *    `erp_hr_collective_agreements` (without `_registry`).
 *  - NEVER imports payroll engines, payslip, salary normalizer or
 *    the agreement salary resolver.
 *  - All I/O delegated to an injected adapter.
 *  - The internal signature is NOT a qualified eIDAS signature.
 */

import {
  computeActivationReadiness,
  type ActivationReadinessReport,
  type ComputeReadinessInput,
  type RegistryAgreementLike,
  type RegistryVersionLike,
  type RegistryValidationLike,
  type RegistrySourceLike,
} from './collectiveAgreementActivationReadiness';
import { computeSha256Hex } from './collectiveAgreementDocumentHasher';

// =============================================================
// Constants
// =============================================================

/** Roles authorised to CREATE a request (first validator side). */
const REQUEST_AUTHORIZED_ROLES = [
  'admin',
  'superadmin',
  'hr_manager',
  'legal_manager',
  'payroll_supervisor',
] as const;

/** Roles authorised to perform the SECOND APPROVAL. */
const SECOND_APPROVAL_ROLES = [
  'admin',
  'superadmin',
  'payroll_supervisor',
  'legal_manager',
] as const;

export const ACTIVATION_CHECKLIST_KEYS_V1 = [
  'reviewed_readiness_report',
  'accepts_payroll_registry_enablement_future',
  'verified_legal_validity_and_sha',
] as const;

export type ActivationChecklistKey =
  (typeof ACTIVATION_CHECKLIST_KEYS_V1)[number];

export type ActivationStatus =
  | 'draft'
  | 'pending_second_approval'
  | 'approved_for_activation'
  | 'rejected'
  | 'superseded';

// =============================================================
// Adapter row types
// =============================================================

export interface ActivationRequestRow {
  id: string;
  agreement_id: string;
  version_id: string;
  validation_id: string;
  requested_by: string;
  requested_role: string;
  readiness_report_json: ActivationReadinessReport | Record<string, unknown>;
  readiness_passed: boolean;
  activation_status: ActivationStatus;
  request_signature_hash: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================================
// Adapter args
// =============================================================

export interface InsertActivationRequestArgs {
  agreement_id: string;
  version_id: string;
  validation_id: string;
  requested_by: string;
  requested_role: string;
  readiness_report_json: ActivationReadinessReport;
  readiness_passed: boolean;
  activation_status: ActivationStatus;
  request_signature_hash: string;
}

export interface UpdateActivationRequestArgs {
  id: string;
  patch: Partial<{
    activation_status: ActivationStatus;
    readiness_report_json: ActivationReadinessReport;
    readiness_passed: boolean;
    request_signature_hash: string;
  }>;
}

export interface InsertActivationApprovalArgs {
  request_id: string;
  approver_id: string;
  approver_role: string;
  decision: 'approved' | 'rejected';
  decision_reason?: string | null;
  activation_checklist_json: Record<ActivationChecklistKey, boolean>;
  approval_signature_hash: string;
}

// =============================================================
// Adapter
// =============================================================

export interface ActivationServiceAdapter {
  fetchAgreement(id: string): Promise<RegistryAgreementLike | null>;
  fetchVersion(id: string): Promise<RegistryVersionLike | null>;
  fetchValidation(id: string): Promise<RegistryValidationLike | null>;
  fetchSource(id: string): Promise<RegistrySourceLike | null>;
  countSalaryTables(agreementId: string, versionId: string): Promise<number>;
  countRules(agreementId: string, versionId: string): Promise<number>;
  fetchUnresolvedCriticalWarningsCount(
    agreementId: string,
    versionId: string,
  ): Promise<number>;
  fetchDiscardedCriticalRowsUnresolvedCount(
    agreementId: string,
    versionId: string,
  ): Promise<number>;
  fetchCurrentLiveRequest(
    agreementId: string,
  ): Promise<ActivationRequestRow | null>;
  fetchRequest(id: string): Promise<ActivationRequestRow | null>;
  fetchUserRoles(userId: string): Promise<string[]>;

  insertActivationRequest(
    args: InsertActivationRequestArgs,
  ): Promise<{ id: string }>;
  updateActivationRequest(args: UpdateActivationRequestArgs): Promise<void>;
  insertActivationApproval(
    args: InsertActivationApprovalArgs,
  ): Promise<{ id: string }>;
  supersedeActivationRequest(id: string): Promise<void>;
}

// =============================================================
// Public input types
// =============================================================

export interface CreateActivationRequestInput {
  agreement_id: string;
  version_id: string;
  validation_id: string;
  requested_by: string;
}

export interface CreateActivationRequestResult {
  id: string;
  activation_status: ActivationStatus;
  readiness_passed: boolean;
  request_signature_hash: string;
  readiness_report: ActivationReadinessReport;
}

export interface SubmitForSecondApprovalInput {
  request_id: string;
  acting_user_id: string;
}

export interface SecondApproveActivationInput {
  request_id: string;
  approver_user_id: string;
  decision_reason?: string | null;
  activation_checklist: Record<ActivationChecklistKey, boolean>;
}

export interface SecondApproveActivationResult {
  approval_id: string;
  approval_signature_hash: string;
  approver_role: string;
}

export interface RejectActivationRequestInput {
  request_id: string;
  approver_user_id: string;
  decision_reason: string;
}

export interface SupersedeActivationRequestInput {
  request_id: string;
}

export interface RecomputeActivationReadinessInput {
  request_id: string;
  acting_user_id: string;
}

// =============================================================
// Helpers
// =============================================================

function pickRole(roles: string[], allowed: readonly string[]): string | null {
  for (const r of allowed) if (roles.includes(r)) return r;
  return null;
}

function ensureRole(
  roles: string[],
  allowed: readonly string[],
  errorCode = 'ROLE_NOT_AUTHORIZED',
): string {
  const r = pickRole(roles, allowed);
  if (!r) throw new Error(errorCode);
  return r;
}

/** Stable JSON: keys sorted lexicographically; arrays preserved in order. */
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

export interface RequestSignaturePayload {
  agreement_id: string;
  version_id: string;
  validation_id: string;
  requested_by: string;
  requested_role: string;
  readiness_report: ActivationReadinessReport;
  schema_version: 'b8b-request-v1';
}

export interface ApprovalSignaturePayload {
  request_id: string;
  approver_id: string;
  approver_role: string;
  decision: 'approved' | 'rejected';
  decision_reason: string | null;
  activation_checklist: Record<string, boolean>;
  schema_version: 'b8b-approval-v1';
}

export async function computeRequestSignatureHash(
  payload: RequestSignaturePayload,
): Promise<string> {
  const canonical = stableStringify(payload);
  return computeSha256Hex(new TextEncoder().encode(canonical));
}

export async function computeApprovalSignatureHash(
  payload: ApprovalSignaturePayload,
): Promise<string> {
  const canonical = stableStringify(payload);
  return computeSha256Hex(new TextEncoder().encode(canonical));
}

async function loadReadinessInputs(
  request: { agreement_id: string; version_id: string; validation_id: string },
  adapter: ActivationServiceAdapter,
): Promise<ComputeReadinessInput> {
  const [agreement, version, validation] = await Promise.all([
    adapter.fetchAgreement(request.agreement_id),
    adapter.fetchVersion(request.version_id),
    adapter.fetchValidation(request.validation_id),
  ]);
  if (!agreement) throw new Error('AGREEMENT_NOT_FOUND');
  if (!version) throw new Error('VERSION_NOT_FOUND');
  if (version.agreement_id !== agreement.id)
    throw new Error('VERSION_AGREEMENT_MISMATCH');
  if (!validation) throw new Error('VALIDATION_NOT_FOUND');
  if (validation.agreement_id !== agreement.id)
    throw new Error('VALIDATION_AGREEMENT_MISMATCH');
  if (validation.version_id !== version.id)
    throw new Error('VALIDATION_VERSION_MISMATCH');

  // Source: we resolve a candidate source from the agreement domain.
  // The adapter must return THE source associated with the validation
  // (B8A persists `source_id` in the validation row, but for the
  // readiness engine we accept it via adapter.fetchSource using
  // validation context).
  const source = await adapter.fetchSource(
    (validation as unknown as { source_id?: string }).source_id ?? '',
  );
  if (!source) throw new Error('SOURCE_NOT_FOUND');
  if (source.agreement_id !== agreement.id)
    throw new Error('SOURCE_AGREEMENT_MISMATCH');

  const [
    salaryTablesCount,
    rulesCount,
    unresolvedCriticalWarningsCount,
    discardedCriticalRowsUnresolvedCount,
  ] = await Promise.all([
    adapter.countSalaryTables(agreement.id, version.id),
    adapter.countRules(agreement.id, version.id),
    adapter.fetchUnresolvedCriticalWarningsCount(agreement.id, version.id),
    adapter.fetchDiscardedCriticalRowsUnresolvedCount(agreement.id, version.id),
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
// Service functions
// =============================================================

export async function createActivationRequest(
  input: CreateActivationRequestInput,
  adapter: ActivationServiceAdapter,
): Promise<CreateActivationRequestResult> {
  const roles = await adapter.fetchUserRoles(input.requested_by);
  const role = ensureRole(roles, REQUEST_AUTHORIZED_ROLES);

  // No live duplicate request for this agreement.
  const live = await adapter.fetchCurrentLiveRequest(input.agreement_id);
  if (live) throw new Error('LIVE_REQUEST_ALREADY_EXISTS');

  const readinessInputs = await loadReadinessInputs(
    {
      agreement_id: input.agreement_id,
      version_id: input.version_id,
      validation_id: input.validation_id,
    },
    adapter,
  );
  const report = computeActivationReadiness(readinessInputs);

  const sigPayload: RequestSignaturePayload = {
    agreement_id: input.agreement_id,
    version_id: input.version_id,
    validation_id: input.validation_id,
    requested_by: input.requested_by,
    requested_role: role,
    readiness_report: report,
    schema_version: 'b8b-request-v1',
  };
  const requestSig = await computeRequestSignatureHash(sigPayload);

  // A request is ALWAYS born in `draft`. The validator must explicitly
  // submit it for second approval afterwards, even if readiness passed.
  const initialStatus: ActivationStatus = 'draft';

  const { id } = await adapter.insertActivationRequest({
    agreement_id: input.agreement_id,
    version_id: input.version_id,
    validation_id: input.validation_id,
    requested_by: input.requested_by,
    requested_role: role,
    readiness_report_json: report,
    readiness_passed: report.passed,
    activation_status: initialStatus,
    request_signature_hash: requestSig,
  });

  return {
    id,
    activation_status: initialStatus,
    readiness_passed: report.passed,
    request_signature_hash: requestSig,
    readiness_report: report,
  };
}

export async function recomputeActivationReadiness(
  input: RecomputeActivationReadinessInput,
  adapter: ActivationServiceAdapter,
): Promise<ActivationReadinessReport> {
  const req = await adapter.fetchRequest(input.request_id);
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.activation_status !== 'draft')
    throw new Error('REQUEST_NOT_RECOMPUTABLE');
  if (req.requested_by !== input.acting_user_id) throw new Error('NOT_OWNER');

  const inputs = await loadReadinessInputs(req, adapter);
  const report = computeActivationReadiness(inputs);

  const sigPayload: RequestSignaturePayload = {
    agreement_id: req.agreement_id,
    version_id: req.version_id,
    validation_id: req.validation_id,
    requested_by: req.requested_by,
    requested_role: req.requested_role,
    readiness_report: report,
    schema_version: 'b8b-request-v1',
  };
  const requestSig = await computeRequestSignatureHash(sigPayload);

  await adapter.updateActivationRequest({
    id: req.id,
    patch: {
      readiness_report_json: report,
      readiness_passed: report.passed,
      request_signature_hash: requestSig,
    },
  });

  return report;
}

export async function submitForSecondApproval(
  input: SubmitForSecondApprovalInput,
  adapter: ActivationServiceAdapter,
): Promise<void> {
  const req = await adapter.fetchRequest(input.request_id);
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.activation_status !== 'draft')
    throw new Error('REQUEST_NOT_DRAFT');
  if (req.requested_by !== input.acting_user_id) throw new Error('NOT_OWNER');
  if (!req.readiness_passed) throw new Error('READINESS_NOT_PASSED');

  await adapter.updateActivationRequest({
    id: req.id,
    patch: { activation_status: 'pending_second_approval' },
  });
}

export async function secondApproveActivation(
  input: SecondApproveActivationInput,
  adapter: ActivationServiceAdapter,
): Promise<SecondApproveActivationResult> {
  const req = await adapter.fetchRequest(input.request_id);
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.activation_status !== 'pending_second_approval')
    throw new Error('REQUEST_NOT_PENDING_APPROVAL');
  if (!req.readiness_passed) throw new Error('READINESS_NOT_PASSED');

  if (req.requested_by === input.approver_user_id)
    throw new Error('APPROVER_MUST_DIFFER_FROM_REQUESTER');

  const roles = await adapter.fetchUserRoles(input.approver_user_id);
  const approverRole = ensureRole(
    roles,
    SECOND_APPROVAL_ROLES,
    'APPROVER_ROLE_NOT_AUTHORIZED',
  );

  // Activation checklist must be fully verified.
  for (const k of ACTIVATION_CHECKLIST_KEYS_V1) {
    if (input.activation_checklist?.[k] !== true)
      throw new Error(`ACTIVATION_CHECKLIST_INCOMPLETE:${k}`);
  }

  const sigPayload: ApprovalSignaturePayload = {
    request_id: req.id,
    approver_id: input.approver_user_id,
    approver_role: approverRole,
    decision: 'approved',
    decision_reason: input.decision_reason ?? null,
    activation_checklist: input.activation_checklist as Record<string, boolean>,
    schema_version: 'b8b-approval-v1',
  };
  const approvalSig = await computeApprovalSignatureHash(sigPayload);

  const { id } = await adapter.insertActivationApproval({
    request_id: req.id,
    approver_id: input.approver_user_id,
    approver_role: approverRole,
    decision: 'approved',
    decision_reason: input.decision_reason ?? null,
    activation_checklist_json: input.activation_checklist,
    approval_signature_hash: approvalSig,
  });

  await adapter.updateActivationRequest({
    id: req.id,
    patch: { activation_status: 'approved_for_activation' },
  });

  return {
    approval_id: id,
    approval_signature_hash: approvalSig,
    approver_role: approverRole,
  };
}

export async function rejectActivationRequest(
  input: RejectActivationRequestInput,
  adapter: ActivationServiceAdapter,
): Promise<{ approval_id: string; approval_signature_hash: string }> {
  if (!input.decision_reason || input.decision_reason.trim().length < 5)
    throw new Error('REJECT_REQUIRES_REASON');

  const req = await adapter.fetchRequest(input.request_id);
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (
    req.activation_status !== 'draft' &&
    req.activation_status !== 'pending_second_approval'
  )
    throw new Error('REQUEST_NOT_REJECTABLE');

  if (req.requested_by === input.approver_user_id)
    throw new Error('APPROVER_MUST_DIFFER_FROM_REQUESTER');

  const roles = await adapter.fetchUserRoles(input.approver_user_id);
  const approverRole = ensureRole(
    roles,
    SECOND_APPROVAL_ROLES,
    'APPROVER_ROLE_NOT_AUTHORIZED',
  );

  const sigPayload: ApprovalSignaturePayload = {
    request_id: req.id,
    approver_id: input.approver_user_id,
    approver_role: approverRole,
    decision: 'rejected',
    decision_reason: input.decision_reason,
    activation_checklist: {},
    schema_version: 'b8b-approval-v1',
  };
  const approvalSig = await computeApprovalSignatureHash(sigPayload);

  const { id } = await adapter.insertActivationApproval({
    request_id: req.id,
    approver_id: input.approver_user_id,
    approver_role: approverRole,
    decision: 'rejected',
    decision_reason: input.decision_reason,
    activation_checklist_json: {} as Record<ActivationChecklistKey, boolean>,
    approval_signature_hash: approvalSig,
  });

  await adapter.updateActivationRequest({
    id: req.id,
    patch: { activation_status: 'rejected' },
  });

  return { approval_id: id, approval_signature_hash: approvalSig };
}

export async function supersedeActivationRequest(
  input: SupersedeActivationRequestInput,
  adapter: ActivationServiceAdapter,
): Promise<void> {
  const req = await adapter.fetchRequest(input.request_id);
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (
    req.activation_status === 'rejected' ||
    req.activation_status === 'superseded'
  )
    throw new Error('REQUEST_NOT_SUPERSEDABLE');
  await adapter.supersedeActivationRequest(req.id);
}