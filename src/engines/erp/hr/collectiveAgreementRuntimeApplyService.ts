/**
 * B10D.2 — Pure service for the runtime-apply layer of the collective
 * agreement Registry.
 *
 * Hard contract:
 *  - Pure module: NO Supabase, NO fetch, NO React, NO hooks, NO Deno,
 *    NO service_role, NO DB client. All I/O via injected adapter.
 *  - Does NOT import or read useESPayrollBridge, registryShadowFlag,
 *    agreementSalaryResolver, salaryNormalizer, payrollEngine,
 *    payslipEngine, agreementSafetyGate.
 *  - Does NOT consume runtime_settings from payroll. Activation only
 *    flips a setting row; payroll consumption is reserved for B10E.
 *  - Does NOT reference operational table erp_hr_collective_agreements
 *    (without "_registry"). Only the registry-scoped tables are touched.
 *  - No ".delete(" anywhere. Append-only model. Rollback is a state
 *    transition + new run, not a deletion.
 *  - Does NOT write ready_for_payroll on registry rows.
 *  - Service must NOT read/import the global flag
 *    HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL.
 */

import { computeSha256Hex } from './collectiveAgreementDocumentHasher';

// ===== Statuses & roles =====

export type RuntimeApplyRequestStatus =
  | 'draft'
  | 'pending_second_approval'
  | 'approved_for_runtime'
  | 'activated'
  | 'rejected'
  | 'rolled_back'
  | 'superseded';

export type RuntimeApplyRunOutcome =
  | 'activated'
  | 'blocked_by_invariant'
  | 'rolled_back';

export type RuntimeApplyAuthorizedRole =
  | 'superadmin'
  | 'admin'
  | 'legal_manager'
  | 'payroll_supervisor';

const AUTHORIZED_ROLES: ReadonlyArray<RuntimeApplyAuthorizedRole> = [
  'superadmin',
  'admin',
  'legal_manager',
  'payroll_supervisor',
];

// ===== Actor =====

export interface RuntimeApplyActorContext {
  userId: string;
  roles: string[];
  hasCompanyAccess: (companyId: string) => boolean;
  now?: () => Date;
}

// ===== Mapping / registry summaries =====

export interface RuntimeMappingSummary {
  id: string;
  company_id: string;
  employee_id?: string | null;
  contract_id?: string | null;
  registry_agreement_id: string;
  registry_version_id: string;
  mapping_status: string;
  is_current: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface RuntimeRegistryAgreementSummary {
  id: string;
  ready_for_payroll: boolean;
  requires_human_review: boolean;
  data_completeness: string;
  source_quality: string;
}

export interface RuntimeRegistryVersionSummary {
  id: string;
  agreement_id: string;
  is_current: boolean;
}

// ===== Apply request / run / settings =====

export interface RuntimeApplyRequest {
  id: string;
  mapping_id: string;
  company_id: string;
  employee_id?: string | null;
  contract_id?: string | null;
  request_status: RuntimeApplyRequestStatus;
  requested_by: string;
  requested_at: string;
  second_approved_by?: string | null;
  second_approved_at?: string | null;
  second_approval_acknowledgements?: Record<string, boolean>;
  comparison_report_json?: Record<string, unknown>;
  comparison_critical_diffs_count: number;
  payroll_impact_preview_json?: Record<string, unknown>;
  activation_run_id?: string | null;
  rollback_run_id?: string | null;
  rejection_reason?: string | null;
}

export interface RuntimeSetting {
  id: string;
  mapping_id: string;
  company_id: string;
  employee_id?: string | null;
  contract_id?: string | null;
  use_registry_for_payroll: boolean;
  is_current: boolean;
  activation_run_id: string;
  rollback_run_id?: string | null;
}

// ===== Adapter =====

export interface RuntimeApplyAdapter {
  getMapping(id: string): Promise<RuntimeMappingSummary | null>;
  getRegistryAgreement(
    id: string,
  ): Promise<RuntimeRegistryAgreementSummary | null>;
  getRegistryVersion(
    id: string,
  ): Promise<RuntimeRegistryVersionSummary | null>;

  getApplyRequest(id: string): Promise<RuntimeApplyRequest | null>;
  insertApplyRequest(
    row: Partial<RuntimeApplyRequest>,
  ): Promise<RuntimeApplyRequest>;
  updateApplyRequestStatus(
    id: string,
    patch: Partial<RuntimeApplyRequest>,
  ): Promise<RuntimeApplyRequest>;

  getCurrentRuntimeSetting(input: {
    company_id: string;
    employee_id?: string | null;
    contract_id?: string | null;
  }): Promise<RuntimeSetting | null>;

  insertRuntimeSetting(
    row: Partial<RuntimeSetting>,
  ): Promise<RuntimeSetting>;
  markRuntimeSettingNotCurrent(
    id: string,
    patch: Partial<RuntimeSetting>,
  ): Promise<RuntimeSetting>;

  insertApplyRun(row: {
    apply_request_id: string;
    mapping_id: string;
    company_id: string;
    executed_by: string;
    executed_at: string;
    outcome: RuntimeApplyRunOutcome;
    pre_state_snapshot_json: Record<string, unknown>;
    post_state_snapshot_json: Record<string, unknown>;
    invariant_check_json: Record<string, unknown>;
    error_detail?: string | null;
    run_signature_hash: string;
  }): Promise<{ id: string }>;

  listApplyRequests(query: {
    company_id: string;
    mapping_id?: string;
    request_status?: RuntimeApplyRequestStatus;
  }): Promise<RuntimeApplyRequest[]>;
}

// ===== Errors =====

export type RuntimeApplyErrorCode =
  | 'UNAUTHORIZED_ROLE'
  | 'NO_COMPANY_ACCESS'
  | 'MAPPING_NOT_FOUND'
  | 'MAPPING_NOT_APPROVED'
  | 'MAPPING_NOT_CURRENT'
  | 'REGISTRY_AGREEMENT_NOT_FOUND'
  | 'REGISTRY_VERSION_NOT_FOUND'
  | 'REGISTRY_NOT_READY'
  | 'VERSION_NOT_CURRENT'
  | 'INVALID_TRANSITION'
  | 'SECOND_APPROVER_REQUIRED'
  | 'SELF_APPROVAL_FORBIDDEN'
  | 'SECOND_APPROVER_ROLE_NOT_ALLOWED'
  | 'ACKNOWLEDGEMENTS_REQUIRED'
  | 'COMPARISON_HAS_CRITICAL_DIFFS'
  | 'REASON_REQUIRED'
  | 'APPLY_REQUEST_NOT_FOUND'
  | 'NO_ACTIVE_RUNTIME_SETTING'
  | 'ALREADY_ROLLED_BACK';

export class RuntimeApplyServiceError extends Error {
  code: RuntimeApplyErrorCode;
  blockers?: string[];
  constructor(
    code: RuntimeApplyErrorCode,
    message?: string,
    blockers?: string[],
  ) {
    super(message ?? code);
    this.code = code;
    this.name = 'RuntimeApplyServiceError';
    this.blockers = blockers;
  }
}

// ===== Helpers =====

const REQUIRED_ACKS = [
  'understands_runtime_enable',
  'reviewed_comparison_report',
  'reviewed_payroll_impact',
  'confirms_rollback_available',
] as const;

function hasAuthorizedRole(roles: string[]): boolean {
  return roles?.some((r) =>
    (AUTHORIZED_ROLES as ReadonlyArray<string>).includes(r),
  );
}

function assertAuthorizedRole(actor: RuntimeApplyActorContext): void {
  if (!hasAuthorizedRole(actor.roles ?? [])) {
    throw new RuntimeApplyServiceError('UNAUTHORIZED_ROLE');
  }
}

function assertCompanyAccess(
  actor: RuntimeApplyActorContext,
  companyId: string,
): void {
  if (!actor.hasCompanyAccess(companyId)) {
    throw new RuntimeApplyServiceError('NO_COMPANY_ACCESS');
  }
}

function nowIso(actor: RuntimeApplyActorContext): string {
  return (actor.now ? actor.now() : new Date()).toISOString();
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => stableStringify(v)).join(',') + ']';
  }
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

async function computeRunSignatureHash(payload: {
  apply_request_id: string;
  mapping_id: string;
  company_id: string;
  outcome: RuntimeApplyRunOutcome;
  pre_state_snapshot_json: Record<string, unknown>;
  post_state_snapshot_json: Record<string, unknown>;
  executed_by: string;
  executed_at: string;
}): Promise<string> {
  const json = stableStringify(payload);
  const bytes = new TextEncoder().encode(json);
  return computeSha256Hex(bytes);
}

// ===== Invariants =====

export interface RuntimeApplyInvariantInput {
  mapping: RuntimeMappingSummary | null;
  agreement: RuntimeRegistryAgreementSummary | null;
  version: RuntimeRegistryVersionSummary | null;
  request: RuntimeApplyRequest;
  acknowledgements?: Record<string, boolean>;
  second_approver_user_id?: string | null;
  second_approver_roles?: string[];
}

export interface RuntimeApplyInvariantResult {
  passed: boolean;
  checks: Array<{ key: string; passed: boolean; detail?: string }>;
  blockers: string[];
}

export function evaluateRuntimeApplyInvariants(
  input: RuntimeApplyInvariantInput,
): RuntimeApplyInvariantResult {
  const checks: Array<{ key: string; passed: boolean; detail?: string }> = [];
  const blockers: string[] = [];

  const push = (key: string, passed: boolean, detail?: string) => {
    checks.push({ key, passed, detail });
    if (!passed) blockers.push(key);
  };

  const m = input.mapping;
  push('mapping_exists', !!m);
  push(
    'mapping_status_approved_internal',
    !!m && m.mapping_status === 'approved_internal',
  );
  push('mapping_is_current', !!m && m.is_current === true);
  push(
    'mapping_approval_metadata_present',
    !!m && !!m.approved_by && !!m.approved_at,
  );

  const a = input.agreement;
  push(
    'registry_ready_for_payroll',
    !!a && a.ready_for_payroll === true,
  );
  push(
    'registry_no_human_review_pending',
    !!a && a.requires_human_review === false,
  );
  push(
    'registry_data_completeness_human_validated',
    !!a && a.data_completeness === 'human_validated',
  );
  push(
    'registry_source_quality_official',
    !!a && a.source_quality === 'official',
  );

  const v = input.version;
  push('registry_version_is_current', !!v && v.is_current === true);

  push(
    'comparison_no_critical_diffs',
    (input.request.comparison_critical_diffs_count ?? 0) === 0,
  );

  const sa = input.second_approver_user_id ?? null;
  push(
    'second_approver_distinct_from_requester',
    !!sa && sa !== input.request.requested_by,
  );

  const sr = input.second_approver_roles ?? [];
  push(
    'second_approver_role_allowed',
    sr.some((r) =>
      (AUTHORIZED_ROLES as ReadonlyArray<string>).includes(r),
    ),
  );

  const ack = input.acknowledgements ?? {};
  const ackOk = REQUIRED_ACKS.every((k) => ack[k] === true);
  push(
    'four_acknowledgements_present',
    ackOk,
    ackOk ? undefined : 'one or more required acknowledgements missing',
  );

  return {
    passed: blockers.length === 0,
    checks,
    blockers,
  };
}

// ===== Public functions =====

async function loadRequestOrThrow(
  id: string,
  adapter: RuntimeApplyAdapter,
): Promise<RuntimeApplyRequest> {
  const r = await adapter.getApplyRequest(id);
  if (!r) throw new RuntimeApplyServiceError('APPLY_REQUEST_NOT_FOUND');
  return r;
}

export interface CreateApplyRequestInput {
  mapping_id: string;
  comparison_report_json?: Record<string, unknown>;
  comparison_critical_diffs_count: number;
  payroll_impact_preview_json?: Record<string, unknown>;
}

export async function createApplyRequest(
  input: CreateApplyRequestInput,
  actor: RuntimeApplyActorContext,
  adapter: RuntimeApplyAdapter,
): Promise<RuntimeApplyRequest> {
  assertAuthorizedRole(actor);

  const mapping = await adapter.getMapping(input.mapping_id);
  if (!mapping) throw new RuntimeApplyServiceError('MAPPING_NOT_FOUND');

  assertCompanyAccess(actor, mapping.company_id);

  return adapter.insertApplyRequest({
    mapping_id: mapping.id,
    company_id: mapping.company_id,
    employee_id: mapping.employee_id ?? null,
    contract_id: mapping.contract_id ?? null,
    request_status: 'draft',
    requested_by: actor.userId,
    requested_at: nowIso(actor),
    comparison_report_json: input.comparison_report_json ?? {},
    comparison_critical_diffs_count:
      input.comparison_critical_diffs_count ?? 0,
    payroll_impact_preview_json: input.payroll_impact_preview_json ?? {},
  });
}

export interface SubmitApplyRequestInput {
  request_id: string;
}

export async function submitApplyRequest(
  input: SubmitApplyRequestInput,
  actor: RuntimeApplyActorContext,
  adapter: RuntimeApplyAdapter,
): Promise<RuntimeApplyRequest> {
  assertAuthorizedRole(actor);
  const request = await loadRequestOrThrow(input.request_id, adapter);
  assertCompanyAccess(actor, request.company_id);

  if (request.request_status !== 'draft') {
    throw new RuntimeApplyServiceError('INVALID_TRANSITION');
  }

  return adapter.updateApplyRequestStatus(request.id, {
    request_status: 'pending_second_approval',
  });
}

export interface SecondApproveApplyRequestInput {
  request_id: string;
  acknowledgements: Record<string, boolean>;
}

export async function secondApproveApplyRequest(
  input: SecondApproveApplyRequestInput,
  actor: RuntimeApplyActorContext,
  adapter: RuntimeApplyAdapter,
): Promise<RuntimeApplyRequest> {
  assertAuthorizedRole(actor);
  const request = await loadRequestOrThrow(input.request_id, adapter);
  assertCompanyAccess(actor, request.company_id);

  if (request.request_status !== 'pending_second_approval') {
    throw new RuntimeApplyServiceError('INVALID_TRANSITION');
  }

  if (actor.userId === request.requested_by) {
    throw new RuntimeApplyServiceError('SELF_APPROVAL_FORBIDDEN');
  }

  if (!hasAuthorizedRole(actor.roles ?? [])) {
    throw new RuntimeApplyServiceError('SECOND_APPROVER_ROLE_NOT_ALLOWED');
  }

  const acks = input.acknowledgements ?? {};
  if (!REQUIRED_ACKS.every((k) => acks[k] === true)) {
    throw new RuntimeApplyServiceError('ACKNOWLEDGEMENTS_REQUIRED');
  }

  // Load context to evaluate invariants.
  const mapping = await adapter.getMapping(request.mapping_id);
  if (!mapping) throw new RuntimeApplyServiceError('MAPPING_NOT_FOUND');
  if (mapping.mapping_status !== 'approved_internal') {
    throw new RuntimeApplyServiceError('MAPPING_NOT_APPROVED');
  }
  if (!mapping.is_current) {
    throw new RuntimeApplyServiceError('MAPPING_NOT_CURRENT');
  }

  const agreement = await adapter.getRegistryAgreement(
    mapping.registry_agreement_id,
  );
  if (!agreement) {
    throw new RuntimeApplyServiceError('REGISTRY_AGREEMENT_NOT_FOUND');
  }
  const registryReady =
    agreement.ready_for_payroll === true &&
    agreement.requires_human_review === false &&
    agreement.data_completeness === 'human_validated' &&
    agreement.source_quality === 'official';
  if (!registryReady) {
    throw new RuntimeApplyServiceError('REGISTRY_NOT_READY');
  }

  const version = await adapter.getRegistryVersion(
    mapping.registry_version_id,
  );
  if (!version) {
    throw new RuntimeApplyServiceError('REGISTRY_VERSION_NOT_FOUND');
  }
  if (!version.is_current) {
    throw new RuntimeApplyServiceError('VERSION_NOT_CURRENT');
  }

  if ((request.comparison_critical_diffs_count ?? 0) > 0) {
    throw new RuntimeApplyServiceError('COMPARISON_HAS_CRITICAL_DIFFS');
  }

  const inv = evaluateRuntimeApplyInvariants({
    mapping,
    agreement,
    version,
    request,
    acknowledgements: acks,
    second_approver_user_id: actor.userId,
    second_approver_roles: actor.roles,
  });
  if (!inv.passed) {
    throw new RuntimeApplyServiceError(
      'INVALID_TRANSITION',
      'invariants failed: ' + inv.blockers.join(','),
      inv.blockers,
    );
  }

  return adapter.updateApplyRequestStatus(request.id, {
    request_status: 'approved_for_runtime',
    second_approved_by: actor.userId,
    second_approved_at: nowIso(actor),
    second_approval_acknowledgements: acks,
  });
}

export interface ActivateApplyRequestInput {
  request_id: string;
}

export interface ActivateApplyRequestResult {
  request: RuntimeApplyRequest;
  setting?: RuntimeSetting;
  run_id: string;
  outcome: RuntimeApplyRunOutcome;
  invariants: RuntimeApplyInvariantResult;
}

export async function activateApplyRequest(
  input: ActivateApplyRequestInput,
  actor: RuntimeApplyActorContext,
  adapter: RuntimeApplyAdapter,
): Promise<ActivateApplyRequestResult> {
  assertAuthorizedRole(actor);
  const request = await loadRequestOrThrow(input.request_id, adapter);
  assertCompanyAccess(actor, request.company_id);

  if (request.request_status !== 'approved_for_runtime') {
    throw new RuntimeApplyServiceError('INVALID_TRANSITION');
  }

  const mapping = await adapter.getMapping(request.mapping_id);
  const agreement = mapping
    ? await adapter.getRegistryAgreement(mapping.registry_agreement_id)
    : null;
  const version = mapping
    ? await adapter.getRegistryVersion(mapping.registry_version_id)
    : null;

  const inv = evaluateRuntimeApplyInvariants({
    mapping,
    agreement,
    version,
    request,
    acknowledgements: request.second_approval_acknowledgements ?? {},
    second_approver_user_id: request.second_approved_by ?? null,
    second_approver_roles: actor.roles, // actor activating; second_approver role checked via request metadata downstream
  });

  const executed_at = nowIso(actor);

  if (!inv.passed) {
    const pre = await adapter.getCurrentRuntimeSetting({
      company_id: request.company_id,
      employee_id: request.employee_id ?? null,
      contract_id: request.contract_id ?? null,
    });
    const pre_state = pre
      ? (pre as unknown as Record<string, unknown>)
      : {};
    const post_state: Record<string, unknown> = {};
    const sig = await computeRunSignatureHash({
      apply_request_id: request.id,
      mapping_id: request.mapping_id,
      company_id: request.company_id,
      outcome: 'blocked_by_invariant',
      pre_state_snapshot_json: pre_state,
      post_state_snapshot_json: post_state,
      executed_by: actor.userId,
      executed_at,
    });
    const run = await adapter.insertApplyRun({
      apply_request_id: request.id,
      mapping_id: request.mapping_id,
      company_id: request.company_id,
      executed_by: actor.userId,
      executed_at,
      outcome: 'blocked_by_invariant',
      pre_state_snapshot_json: pre_state,
      post_state_snapshot_json: post_state,
      invariant_check_json: inv as unknown as Record<string, unknown>,
      error_detail: inv.blockers.join(','),
      run_signature_hash: sig,
    });
    return {
      request,
      run_id: run.id,
      outcome: 'blocked_by_invariant',
      invariants: inv,
    };
  }

  // Pre snapshot
  const preSetting = await adapter.getCurrentRuntimeSetting({
    company_id: request.company_id,
    employee_id: request.employee_id ?? null,
    contract_id: request.contract_id ?? null,
  });
  const pre_state_snapshot_json = preSetting
    ? (preSetting as unknown as Record<string, unknown>)
    : {};

  // Compute deterministic post snapshot before insert (we know the
  // shape we are about to insert). Setting id is unknown yet, but we
  // hash by the deterministic content of the activation, not by the
  // generated row id.
  const post_state_snapshot_json: Record<string, unknown> = {
    mapping_id: request.mapping_id,
    company_id: request.company_id,
    employee_id: request.employee_id ?? null,
    contract_id: request.contract_id ?? null,
    use_registry_for_payroll: true,
    is_current: true,
  };

  const sig = await computeRunSignatureHash({
    apply_request_id: request.id,
    mapping_id: request.mapping_id,
    company_id: request.company_id,
    outcome: 'activated',
    pre_state_snapshot_json,
    post_state_snapshot_json,
    executed_by: actor.userId,
    executed_at,
  });

  const run = await adapter.insertApplyRun({
    apply_request_id: request.id,
    mapping_id: request.mapping_id,
    company_id: request.company_id,
    executed_by: actor.userId,
    executed_at,
    outcome: 'activated',
    pre_state_snapshot_json,
    post_state_snapshot_json,
    invariant_check_json: inv as unknown as Record<string, unknown>,
    run_signature_hash: sig,
  });

  // Mark previous current setting (if any) as not current.
  if (preSetting) {
    await adapter.markRuntimeSettingNotCurrent(preSetting.id, {
      is_current: false,
    });
  }

  const setting = await adapter.insertRuntimeSetting({
    mapping_id: request.mapping_id,
    company_id: request.company_id,
    employee_id: request.employee_id ?? null,
    contract_id: request.contract_id ?? null,
    use_registry_for_payroll: true,
    is_current: true,
    activation_run_id: run.id,
  });

  const updated = await adapter.updateApplyRequestStatus(request.id, {
    request_status: 'activated',
    activation_run_id: run.id,
  });

  return {
    request: updated,
    setting,
    run_id: run.id,
    outcome: 'activated',
    invariants: inv,
  };
}

export interface RollbackApplyRequestInput {
  request_id: string;
  reason: string;
}

export async function rollbackApplyRequest(
  input: RollbackApplyRequestInput,
  actor: RuntimeApplyActorContext,
  adapter: RuntimeApplyAdapter,
): Promise<{
  request: RuntimeApplyRequest;
  setting: RuntimeSetting;
  run_id: string;
}> {
  assertAuthorizedRole(actor);

  if (
    typeof input.reason !== 'string' ||
    input.reason.trim().length < 10
  ) {
    throw new RuntimeApplyServiceError('REASON_REQUIRED');
  }

  const request = await loadRequestOrThrow(input.request_id, adapter);
  assertCompanyAccess(actor, request.company_id);

  if (request.request_status !== 'activated') {
    throw new RuntimeApplyServiceError('INVALID_TRANSITION');
  }

  if (request.rollback_run_id) {
    throw new RuntimeApplyServiceError('ALREADY_ROLLED_BACK');
  }

  const current = await adapter.getCurrentRuntimeSetting({
    company_id: request.company_id,
    employee_id: request.employee_id ?? null,
    contract_id: request.contract_id ?? null,
  });
  if (!current || current.mapping_id !== request.mapping_id) {
    throw new RuntimeApplyServiceError('NO_ACTIVE_RUNTIME_SETTING');
  }

  const executed_at = nowIso(actor);
  const pre_state_snapshot_json = current as unknown as Record<
    string,
    unknown
  >;
  const post_state_snapshot_json: Record<string, unknown> = {
    ...(pre_state_snapshot_json as Record<string, unknown>),
    is_current: false,
    rollback_reason: input.reason,
  };

  const sig = await computeRunSignatureHash({
    apply_request_id: request.id,
    mapping_id: request.mapping_id,
    company_id: request.company_id,
    outcome: 'rolled_back',
    pre_state_snapshot_json,
    post_state_snapshot_json,
    executed_by: actor.userId,
    executed_at,
  });

  const run = await adapter.insertApplyRun({
    apply_request_id: request.id,
    mapping_id: request.mapping_id,
    company_id: request.company_id,
    executed_by: actor.userId,
    executed_at,
    outcome: 'rolled_back',
    pre_state_snapshot_json,
    post_state_snapshot_json,
    invariant_check_json: { rollback_reason: input.reason },
    run_signature_hash: sig,
  });

  const updatedSetting = await adapter.markRuntimeSettingNotCurrent(
    current.id,
    {
      is_current: false,
      rollback_run_id: run.id,
    },
  );

  const updatedRequest = await adapter.updateApplyRequestStatus(request.id, {
    request_status: 'rolled_back',
    rollback_run_id: run.id,
  });

  return {
    request: updatedRequest,
    setting: updatedSetting,
    run_id: run.id,
  };
}

export interface ListApplyRequestsInput {
  company_id: string;
  mapping_id?: string;
  request_status?: RuntimeApplyRequestStatus;
}

export async function listApplyRequests(
  input: ListApplyRequestsInput,
  actor: RuntimeApplyActorContext,
  adapter: RuntimeApplyAdapter,
): Promise<RuntimeApplyRequest[]> {
  assertAuthorizedRole(actor);
  assertCompanyAccess(actor, input.company_id);
  return adapter.listApplyRequests({
    company_id: input.company_id,
    mapping_id: input.mapping_id,
    request_status: input.request_status,
  });
}
