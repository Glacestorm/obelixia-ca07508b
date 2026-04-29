/**
 * B10D.3 — Edge function for the controlled runtime-apply layer of the
 * collective agreement Registry mapping.
 *
 * Wraps the pure service B10D.2
 * (`src/engines/erp/hr/collectiveAgreementRuntimeApplyService.ts`). The
 * service algorithms are mirrored INLINE here because Supabase edge
 * functions cannot import from `src/`. Any change to the service
 * contract MUST be mirrored in this file (see static tests).
 *
 * HARD SAFETY:
 *  - Does NOT touch payroll runtime: no payroll/payslip engine, no
 *    bridge, no salary resolver, no salary normalizer, no shadow flag,
 *    no agreement safety gate.
 *  - Does NOT activate `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`. Reading
 *    `runtime_settings` from payroll is reserved for B10E.
 *  - Does NOT reference operational table `erp_hr_collective_agreements`
 *    (without `_registry`).
 *  - SERVICE_ROLE_KEY is read from `Deno.env.get` only and is never
 *    returned to the client.
 *  - Errors are sanitized: no raw error.message, no stack traces.
 *  - No `.delete(` anywhere. Append-only model. Rollback is a state
 *    transition + a new run row, never a deletion.
 *  - No write of `ready_for_payroll`.
 *  - Server-side decides `requested_by`, `requested_at`,
 *    `second_approved_by`, `second_approved_at`, `executed_by`,
 *    `executed_at`, `signature_hash`, `is_current`, `activation_run_id`,
 *    `rollback_run_id`, `request_status`, `use_registry_for_payroll`.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

// ---------------------------------------------------------------
// CORS
// ---------------------------------------------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------
const AUTHORIZED_ROLES = [
  'superadmin',
  'admin',
  'legal_manager',
  'payroll_supervisor',
] as const;

const REQUEST_STATUSES = [
  'draft',
  'pending_second_approval',
  'approved_for_runtime',
  'activated',
  'rejected',
  'rolled_back',
  'superseded',
] as const;

const KNOWN_ACTIONS = [
  'create_request',
  'submit_for_second_approval',
  'second_approve',
  'reject',
  'activate',
  'rollback',
  'list',
] as const;

const REQUIRED_ACKS = [
  'understands_runtime_enable',
  'reviewed_comparison_report',
  'reviewed_payroll_impact',
  'confirms_rollback_available',
] as const;

const SENTINEL_UUID = '00000000-0000-0000-0000-000000000000';

// Anti-tampering: client must NEVER send these. They are server-decided
// or strictly off-limits for this edge.
const FORBIDDEN_PAYLOAD_KEYS = [
  'second_approved_by',
  'second_approved_at',
  'is_current',
  'activation_run_id',
  'rollback_run_id',
  'request_status',
  'use_registry_for_payroll',
  'ready_for_payroll',
  'requires_human_review',
  'data_completeness',
  'salary_tables_loaded',
  'source_quality',
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
  'persisted_priority_apply',
  'C3B3C2',
  'signature_hash',
  'run_signature_hash',
  'executed_by',
  'executed_at',
  'activated_by',
  'activated_at',
  'requested_by',
  'requested_at',
  // snake_case forbidden alias of comparisonCriticalDiffsCount
  'comparison_critical_diffs_count',
] as const;

// ---------------------------------------------------------------
// Zod schemas (.strict — no extra keys allowed)
// ---------------------------------------------------------------
const uuid = z.string().uuid();

const CreateRequestSchema = z
  .object({
    action: z.literal('create_request'),
    mappingId: uuid,
    companyId: uuid,
    comparisonReportJson: z.record(z.unknown()),
    comparisonCriticalDiffsCount: z.number().int().min(0),
    payrollImpactPreviewJson: z.record(z.unknown()).optional(),
  })
  .strict();

const SubmitSecondApprovalSchema = z
  .object({
    action: z.literal('submit_for_second_approval'),
    requestId: uuid,
    companyId: uuid,
  })
  .strict();

const SecondApproveSchema = z
  .object({
    action: z.literal('second_approve'),
    requestId: uuid,
    companyId: uuid,
    acknowledgements: z
      .object({
        understands_runtime_enable: z.literal(true),
        reviewed_comparison_report: z.literal(true),
        reviewed_payroll_impact: z.literal(true),
        confirms_rollback_available: z.literal(true),
      })
      .strict(),
  })
  .strict();

const RejectSchema = z
  .object({
    action: z.literal('reject'),
    requestId: uuid,
    companyId: uuid,
    reason: z.string().min(10).max(2000),
  })
  .strict();

const ActivateSchema = z
  .object({
    action: z.literal('activate'),
    requestId: uuid,
    companyId: uuid,
  })
  .strict();

const RollbackSchema = z
  .object({
    action: z.literal('rollback'),
    requestId: uuid,
    companyId: uuid,
    reason: z.string().min(10).max(2000),
  })
  .strict();

const ListSchema = z
  .object({
    action: z.literal('list'),
    companyId: uuid,
    mappingId: uuid.optional(),
    requestStatus: z.enum(REQUEST_STATUSES).optional(),
  })
  .strict();

// ---------------------------------------------------------------
// Wire helpers
// ---------------------------------------------------------------
function successResponse(action: string, data: unknown): Response {
  return new Response(JSON.stringify({ success: true, action, data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  action?: string,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      action: action ?? null,
      error: { code, message },
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

function pickAuthorizedRole(roles: string[]): string | null {
  for (const r of roles) {
    if ((AUTHORIZED_ROLES as readonly string[]).includes(r)) return r;
  }
  return null;
}

/**
 * mapError — translate service error codes to wire responses.
 * Never returns raw error.message, error.stack or DB messages.
 */
function mapError(err: unknown, action?: string): Response {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  switch (code) {
    case 'UNAUTHORIZED_ROLE':
      return errorResponse(403, 'UNAUTHORIZED_ROLE', 'Not authorized', action);
    case 'NO_COMPANY_ACCESS':
      return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
    case 'MAPPING_NOT_FOUND':
      return errorResponse(404, 'MAPPING_NOT_FOUND', 'Mapping not found', action);
    case 'MAPPING_NOT_APPROVED':
      return errorResponse(400, 'MAPPING_NOT_APPROVED', 'Mapping not approved', action);
    case 'MAPPING_NOT_CURRENT':
      return errorResponse(400, 'MAPPING_NOT_CURRENT', 'Mapping not current', action);
    case 'REGISTRY_AGREEMENT_NOT_FOUND':
      return errorResponse(404, 'REGISTRY_AGREEMENT_NOT_FOUND', 'Registry agreement not found', action);
    case 'REGISTRY_VERSION_NOT_FOUND':
      return errorResponse(404, 'REGISTRY_VERSION_NOT_FOUND', 'Registry version not found', action);
    case 'REGISTRY_NOT_READY':
      return errorResponse(400, 'REGISTRY_NOT_READY', 'Registry not ready', action);
    case 'VERSION_NOT_CURRENT':
      return errorResponse(400, 'VERSION_NOT_CURRENT', 'Version not current', action);
    case 'INVALID_TRANSITION':
      return errorResponse(400, 'INVALID_TRANSITION', 'Invalid transition', action);
    case 'SECOND_APPROVER_REQUIRED':
      return errorResponse(400, 'SECOND_APPROVER_REQUIRED', 'Second approver required', action);
    case 'SELF_APPROVAL_FORBIDDEN':
      return errorResponse(400, 'SELF_APPROVAL_FORBIDDEN', 'Self-approval forbidden', action);
    case 'SECOND_APPROVER_ROLE_NOT_ALLOWED':
      return errorResponse(403, 'SECOND_APPROVER_ROLE_NOT_ALLOWED', 'Second approver role not allowed', action);
    case 'ACKNOWLEDGEMENTS_REQUIRED':
      return errorResponse(400, 'ACKNOWLEDGEMENTS_REQUIRED', 'Acknowledgements required', action);
    case 'COMPARISON_HAS_CRITICAL_DIFFS':
      return errorResponse(400, 'COMPARISON_HAS_CRITICAL_DIFFS', 'Comparison has critical diffs', action);
    case 'REASON_REQUIRED':
      return errorResponse(400, 'REASON_REQUIRED', 'Reason required', action);
    case 'APPLY_REQUEST_NOT_FOUND':
      return errorResponse(404, 'APPLY_REQUEST_NOT_FOUND', 'Apply request not found', action);
    case 'NO_ACTIVE_RUNTIME_SETTING':
      return errorResponse(400, 'NO_ACTIVE_RUNTIME_SETTING', 'No active runtime setting', action);
    case 'ALREADY_ROLLED_BACK':
      return errorResponse(400, 'ALREADY_ROLLED_BACK', 'Already rolled back', action);
    default:
      return errorResponse(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
}

class RuntimeApplyServiceError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = 'RuntimeApplyServiceError';
  }
}

// ---------------------------------------------------------------
// Stable JSON + SHA-256 (mirror of service hashing logic)
// ---------------------------------------------------------------
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

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeRunSignatureHash(payload: {
  apply_request_id: string;
  mapping_id: string;
  company_id: string;
  outcome: string;
  pre_state_snapshot_json: Record<string, unknown>;
  post_state_snapshot_json: Record<string, unknown>;
  executed_by: string;
  executed_at: string;
}): Promise<string> {
  return sha256Hex(stableStringify(payload));
}

// ---------------------------------------------------------------
// Adapter — implements RuntimeApplyAdapter shape from B10D.2.
// Uses adminClient for writes only AFTER role + company access gates.
// No `.delete(` ever. No operational table.
// ---------------------------------------------------------------
function buildAdapter(userClient: any, adminClient: any) {
  return {
    async fetchUserRoles(userId: string): Promise<string[]> {
      const { data, error } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (error) throw new Error('USER_ROLES_FETCH_ERROR');
      return (data ?? []).map((r: { role: string }) => r.role);
    },
    async hasCompanyAccess(companyId: string): Promise<boolean> {
      const { data, error } = await userClient.rpc(
        'user_has_erp_company_access',
        { p_company_id: companyId },
      );
      if (error) return false;
      return data === true;
    },
    async getMapping(id: string) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_mappings')
        .select(
          'id, company_id, employee_id, contract_id, registry_agreement_id, registry_version_id, mapping_status, is_current, approved_by, approved_at',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('MAPPING_FETCH_ERROR');
      return data ?? null;
    },
    async getRegistryAgreement(id: string) {
      const { data, error } = await adminClient
        .from('erp_hr_collective_agreements_registry')
        .select(
          'id, ready_for_payroll, requires_human_review, data_completeness, source_quality',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('REGISTRY_FETCH_ERROR');
      return data ?? null;
    },
    async getRegistryVersion(id: string) {
      const { data, error } = await adminClient
        .from('erp_hr_collective_agreements_registry_versions')
        .select('id, agreement_id, is_current')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('VERSION_FETCH_ERROR');
      return data ?? null;
    },
    async getApplyRequest(id: string) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_apply_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('REQUEST_FETCH_ERROR');
      return data ?? null;
    },
    async insertApplyRequest(row: Record<string, unknown>) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_apply_requests')
        .insert(row)
        .select('*')
        .single();
      if (error) throw new Error('REQUEST_INSERT_ERROR');
      return data;
    },
    async updateApplyRequestStatus(
      id: string,
      patch: Record<string, unknown>,
    ) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_apply_requests')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error('REQUEST_UPDATE_ERROR');
      return data;
    },
    async getCurrentRuntimeSetting(input: {
      company_id: string;
      employee_id?: string | null;
      contract_id?: string | null;
    }) {
      // Use sentinel UUID to match DB partial unique index NULL normalization.
      const emp = input.employee_id ?? SENTINEL_UUID;
      const ctr = input.contract_id ?? SENTINEL_UUID;
      let q = adminClient
        .from('erp_hr_company_agreement_registry_runtime_settings')
        .select('*')
        .eq('company_id', input.company_id)
        .eq('is_current', true);
      if (emp === SENTINEL_UUID) q = q.is('employee_id', null);
      else q = q.eq('employee_id', emp);
      if (ctr === SENTINEL_UUID) q = q.is('contract_id', null);
      else q = q.eq('contract_id', ctr);
      const { data, error } = await q.maybeSingle();
      if (error) throw new Error('SETTING_FETCH_ERROR');
      return data ?? null;
    },
    async insertRuntimeSetting(row: Record<string, unknown>) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_runtime_settings')
        .insert(row)
        .select('*')
        .single();
      if (error) throw new Error('SETTING_INSERT_ERROR');
      return data;
    },
    async markRuntimeSettingNotCurrent(
      id: string,
      patch: Record<string, unknown>,
    ) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_runtime_settings')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error('SETTING_UPDATE_ERROR');
      return data;
    },
    async insertApplyRun(row: Record<string, unknown>) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_apply_runs')
        .insert(row)
        .select('id')
        .single();
      if (error) throw new Error('RUN_INSERT_ERROR');
      return data;
    },
    async listApplyRequests(query: {
      company_id: string;
      mapping_id?: string;
      request_status?: string;
    }) {
      let q = adminClient
        .from('erp_hr_company_agreement_registry_apply_requests')
        .select('*')
        .eq('company_id', query.company_id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (query.mapping_id) q = q.eq('mapping_id', query.mapping_id);
      if (query.request_status) q = q.eq('request_status', query.request_status);
      const { data, error } = await q;
      if (error) throw new Error('REQUEST_LIST_ERROR');
      return data ?? [];
    },
  };
}

type Adapter = ReturnType<typeof buildAdapter>;

// ---------------------------------------------------------------
// Service mirror (collectiveAgreementRuntimeApplyService B10D.2).
// Keep in sync. Static tests verify forbidden imports / invariants.
// ---------------------------------------------------------------
function evaluateInvariants(input: {
  mapping: any;
  agreement: any;
  version: any;
  request: any;
  acknowledgements?: Record<string, boolean>;
  second_approver_user_id?: string | null;
  second_approver_roles?: string[];
}) {
  const checks: Array<{ key: string; passed: boolean }> = [];
  const blockers: string[] = [];
  const push = (key: string, passed: boolean) => {
    checks.push({ key, passed });
    if (!passed) blockers.push(key);
  };
  const m = input.mapping;
  push('mapping_exists', !!m);
  push('mapping_status_approved_internal', !!m && m.mapping_status === 'approved_internal');
  push('mapping_is_current', !!m && m.is_current === true);
  push('mapping_approved_by_present', !!m && !!m.approved_by);
  push('mapping_approved_at_present', !!m && !!m.approved_at);
  const a = input.agreement;
  push('registry_ready_for_payroll', !!a && a.ready_for_payroll === true);
  push('registry_no_human_review_pending', !!a && a.requires_human_review === false);
  push('registry_data_completeness_human_validated', !!a && a.data_completeness === 'human_validated');
  push('registry_source_quality_official', !!a && a.source_quality === 'official');
  const v = input.version;
  push('registry_version_is_current', !!v && v.is_current === true);
  push('comparison_no_critical_diffs', (input.request.comparison_critical_diffs_count ?? 0) === 0);
  const sa = input.second_approver_user_id ?? null;
  push('second_approver_distinct_from_requester', !!sa && sa !== input.request.requested_by);
  const sr = input.second_approver_roles ?? [];
  push('second_approver_role_allowed', sr.some((r) => (AUTHORIZED_ROLES as readonly string[]).includes(r)));
  const ack = input.acknowledgements ?? {};
  push('four_acknowledgements_present', REQUIRED_ACKS.every((k) => ack[k] === true));
  return { passed: blockers.length === 0, checks, blockers };
}

async function svcCreateRequest(
  input: {
    mapping_id: string;
    comparison_report_json: Record<string, unknown>;
    comparison_critical_diffs_count: number;
    payroll_impact_preview_json?: Record<string, unknown>;
    actor_user_id: string;
  },
  adapter: Adapter,
) {
  const mapping = await adapter.getMapping(input.mapping_id);
  if (!mapping) throw new RuntimeApplyServiceError('MAPPING_NOT_FOUND');
  return adapter.insertApplyRequest({
    mapping_id: mapping.id,
    company_id: mapping.company_id,
    employee_id: mapping.employee_id ?? null,
    contract_id: mapping.contract_id ?? null,
    request_status: 'draft',
    requested_by: input.actor_user_id,
    requested_at: new Date().toISOString(),
    comparison_report_json: input.comparison_report_json ?? {},
    comparison_critical_diffs_count: input.comparison_critical_diffs_count ?? 0,
    payroll_impact_preview_json: input.payroll_impact_preview_json ?? {},
  });
}

async function svcSubmit(requestId: string, adapter: Adapter) {
  const r = await adapter.getApplyRequest(requestId);
  if (!r) throw new RuntimeApplyServiceError('APPLY_REQUEST_NOT_FOUND');
  if (r.request_status !== 'draft') {
    throw new RuntimeApplyServiceError('INVALID_TRANSITION');
  }
  return adapter.updateApplyRequestStatus(r.id, {
    request_status: 'pending_second_approval',
  });
}

async function svcSecondApprove(
  input: {
    request_id: string;
    acknowledgements: Record<string, boolean>;
    actor_user_id: string;
    actor_roles: string[];
  },
  adapter: Adapter,
) {
  const r = await adapter.getApplyRequest(input.request_id);
  if (!r) throw new RuntimeApplyServiceError('APPLY_REQUEST_NOT_FOUND');
  if (r.request_status !== 'pending_second_approval') {
    throw new RuntimeApplyServiceError('INVALID_TRANSITION');
  }
  if (input.actor_user_id === r.requested_by) {
    throw new RuntimeApplyServiceError('SELF_APPROVAL_FORBIDDEN');
  }
  if (!REQUIRED_ACKS.every((k) => input.acknowledgements[k] === true)) {
    throw new RuntimeApplyServiceError('ACKNOWLEDGEMENTS_REQUIRED');
  }
  const mapping = await adapter.getMapping(r.mapping_id);
  if (!mapping) throw new RuntimeApplyServiceError('MAPPING_NOT_FOUND');
  if (mapping.mapping_status !== 'approved_internal') {
    throw new RuntimeApplyServiceError('MAPPING_NOT_APPROVED');
  }
  if (!mapping.is_current) {
    throw new RuntimeApplyServiceError('MAPPING_NOT_CURRENT');
  }
  const agreement = await adapter.getRegistryAgreement(mapping.registry_agreement_id);
  if (!agreement) throw new RuntimeApplyServiceError('REGISTRY_AGREEMENT_NOT_FOUND');
  const ready =
    agreement.ready_for_payroll === true &&
    agreement.requires_human_review === false &&
    agreement.data_completeness === 'human_validated' &&
    agreement.source_quality === 'official';
  if (!ready) throw new RuntimeApplyServiceError('REGISTRY_NOT_READY');
  const version = await adapter.getRegistryVersion(mapping.registry_version_id);
  if (!version) throw new RuntimeApplyServiceError('REGISTRY_VERSION_NOT_FOUND');
  if (!version.is_current) throw new RuntimeApplyServiceError('VERSION_NOT_CURRENT');
  if ((r.comparison_critical_diffs_count ?? 0) > 0) {
    throw new RuntimeApplyServiceError('COMPARISON_HAS_CRITICAL_DIFFS');
  }
  const inv = evaluateInvariants({
    mapping,
    agreement,
    version,
    request: r,
    acknowledgements: input.acknowledgements,
    second_approver_user_id: input.actor_user_id,
    second_approver_roles: input.actor_roles,
  });
  if (!inv.passed) throw new RuntimeApplyServiceError('INVALID_TRANSITION');
  return adapter.updateApplyRequestStatus(r.id, {
    request_status: 'approved_for_runtime',
    second_approved_by: input.actor_user_id,
    second_approved_at: new Date().toISOString(),
    second_approval_acknowledgements: input.acknowledgements,
  });
}

async function svcReject(
  input: { request_id: string; reason: string },
  adapter: Adapter,
) {
  if (typeof input.reason !== 'string' || input.reason.trim().length < 10) {
    throw new RuntimeApplyServiceError('REASON_REQUIRED');
  }
  const r = await adapter.getApplyRequest(input.request_id);
  if (!r) throw new RuntimeApplyServiceError('APPLY_REQUEST_NOT_FOUND');
  if (
    r.request_status !== 'draft' &&
    r.request_status !== 'pending_second_approval' &&
    r.request_status !== 'approved_for_runtime'
  ) {
    throw new RuntimeApplyServiceError('INVALID_TRANSITION');
  }
  return adapter.updateApplyRequestStatus(r.id, {
    request_status: 'rejected',
    rejection_reason: input.reason,
  });
}

async function svcActivate(
  input: { request_id: string; actor_user_id: string; actor_roles: string[] },
  adapter: Adapter,
) {
  const r = await adapter.getApplyRequest(input.request_id);
  if (!r) throw new RuntimeApplyServiceError('APPLY_REQUEST_NOT_FOUND');
  if (r.request_status !== 'approved_for_runtime') {
    throw new RuntimeApplyServiceError('INVALID_TRANSITION');
  }
  const mapping = await adapter.getMapping(r.mapping_id);
  const agreement = mapping
    ? await adapter.getRegistryAgreement(mapping.registry_agreement_id)
    : null;
  const version = mapping
    ? await adapter.getRegistryVersion(mapping.registry_version_id)
    : null;
  const inv = evaluateInvariants({
    mapping,
    agreement,
    version,
    request: r,
    acknowledgements: r.second_approval_acknowledgements ?? {},
    second_approver_user_id: r.second_approved_by ?? null,
    second_approver_roles: input.actor_roles,
  });
  const executed_at = new Date().toISOString();

  if (!inv.passed) {
    const pre = await adapter.getCurrentRuntimeSetting({
      company_id: r.company_id,
      employee_id: r.employee_id ?? null,
      contract_id: r.contract_id ?? null,
    });
    const pre_state = pre ? (pre as Record<string, unknown>) : {};
    const post_state: Record<string, unknown> = {};
    const sig = await computeRunSignatureHash({
      apply_request_id: r.id,
      mapping_id: r.mapping_id,
      company_id: r.company_id,
      outcome: 'blocked_by_invariant',
      pre_state_snapshot_json: pre_state,
      post_state_snapshot_json: post_state,
      executed_by: input.actor_user_id,
      executed_at,
    });
    const run = await adapter.insertApplyRun({
      apply_request_id: r.id,
      mapping_id: r.mapping_id,
      company_id: r.company_id,
      executed_by: input.actor_user_id,
      executed_at,
      outcome: 'blocked_by_invariant',
      pre_state_snapshot_json: pre_state,
      post_state_snapshot_json: post_state,
      invariant_check_json: inv,
      error_detail: inv.blockers.join(','),
      run_signature_hash: sig,
    });
    return {
      request: r,
      run_id: run.id,
      outcome: 'blocked_by_invariant',
      invariants: inv,
    };
  }

  const preSetting = await adapter.getCurrentRuntimeSetting({
    company_id: r.company_id,
    employee_id: r.employee_id ?? null,
    contract_id: r.contract_id ?? null,
  });
  const pre_state_snapshot_json = preSetting
    ? (preSetting as Record<string, unknown>)
    : {};
  const post_state_snapshot_json: Record<string, unknown> = {
    mapping_id: r.mapping_id,
    company_id: r.company_id,
    employee_id: r.employee_id ?? null,
    contract_id: r.contract_id ?? null,
    use_registry_for_payroll: true,
    is_current: true,
  };
  const sig = await computeRunSignatureHash({
    apply_request_id: r.id,
    mapping_id: r.mapping_id,
    company_id: r.company_id,
    outcome: 'activated',
    pre_state_snapshot_json,
    post_state_snapshot_json,
    executed_by: input.actor_user_id,
    executed_at,
  });
  const run = await adapter.insertApplyRun({
    apply_request_id: r.id,
    mapping_id: r.mapping_id,
    company_id: r.company_id,
    executed_by: input.actor_user_id,
    executed_at,
    outcome: 'activated',
    pre_state_snapshot_json,
    post_state_snapshot_json,
    invariant_check_json: inv,
    run_signature_hash: sig,
  });
  if (preSetting) {
    await adapter.markRuntimeSettingNotCurrent(preSetting.id, {
      is_current: false,
    });
  }
  const setting = await adapter.insertRuntimeSetting({
    mapping_id: r.mapping_id,
    company_id: r.company_id,
    employee_id: r.employee_id ?? null,
    contract_id: r.contract_id ?? null,
    use_registry_for_payroll: true,
    is_current: true,
    activation_run_id: run.id,
  });
  const updated = await adapter.updateApplyRequestStatus(r.id, {
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

async function svcRollback(
  input: { request_id: string; reason: string; actor_user_id: string },
  adapter: Adapter,
) {
  if (typeof input.reason !== 'string' || input.reason.trim().length < 10) {
    throw new RuntimeApplyServiceError('REASON_REQUIRED');
  }
  const r = await adapter.getApplyRequest(input.request_id);
  if (!r) throw new RuntimeApplyServiceError('APPLY_REQUEST_NOT_FOUND');
  if (r.request_status !== 'activated') {
    throw new RuntimeApplyServiceError('INVALID_TRANSITION');
  }
  if (r.rollback_run_id) {
    throw new RuntimeApplyServiceError('ALREADY_ROLLED_BACK');
  }
  const current = await adapter.getCurrentRuntimeSetting({
    company_id: r.company_id,
    employee_id: r.employee_id ?? null,
    contract_id: r.contract_id ?? null,
  });
  if (!current || current.mapping_id !== r.mapping_id) {
    throw new RuntimeApplyServiceError('NO_ACTIVE_RUNTIME_SETTING');
  }
  const executed_at = new Date().toISOString();
  const pre_state_snapshot_json = current as Record<string, unknown>;
  const post_state_snapshot_json: Record<string, unknown> = {
    ...pre_state_snapshot_json,
    is_current: false,
    rollback_reason: input.reason,
  };
  const sig = await computeRunSignatureHash({
    apply_request_id: r.id,
    mapping_id: r.mapping_id,
    company_id: r.company_id,
    outcome: 'rolled_back',
    pre_state_snapshot_json,
    post_state_snapshot_json,
    executed_by: input.actor_user_id,
    executed_at,
  });
  const run = await adapter.insertApplyRun({
    apply_request_id: r.id,
    mapping_id: r.mapping_id,
    company_id: r.company_id,
    executed_by: input.actor_user_id,
    executed_at,
    outcome: 'rolled_back',
    pre_state_snapshot_json,
    post_state_snapshot_json,
    invariant_check_json: { rollback_reason: input.reason },
    run_signature_hash: sig,
  });
  const updatedSetting = await adapter.markRuntimeSettingNotCurrent(current.id, {
    is_current: false,
    rollback_run_id: run.id,
  });
  const updatedRequest = await adapter.updateApplyRequestStatus(r.id, {
    request_status: 'rolled_back',
    rollback_run_id: run.id,
  });
  return { request: updatedRequest, setting: updatedSetting, run_id: run.id };
}

async function svcList(
  input: { company_id: string; mapping_id?: string; request_status?: string },
  adapter: Adapter,
) {
  return adapter.listApplyRequests(input);
}

// ---------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')
    return errorResponse(405, 'INVALID_ACTION', 'Method not allowed');

  // 1) Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return errorResponse(401, 'UNAUTHORIZED', 'Missing or invalid Authorization');
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return errorResponse(401, 'UNAUTHORIZED', 'Missing token');

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY)
    return errorResponse(500, 'INTERNAL_ERROR', 'Server misconfigured');

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  let userId: string;
  try {
    const { data, error } = await userClient.auth.getClaims(token);
    if (error || !data?.claims?.sub)
      return errorResponse(401, 'UNAUTHORIZED', 'Invalid token');
    userId = data.claims.sub as string;
  } catch {
    return errorResponse(401, 'UNAUTHORIZED', 'Invalid token');
  }

  // 2) Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid JSON');
  }
  if (!body || typeof body !== 'object')
    return errorResponse(400, 'INVALID_PAYLOAD', 'Body must be an object');

  const action = (body as { action?: unknown }).action;
  if (
    typeof action !== 'string' ||
    !(KNOWN_ACTIONS as readonly string[]).includes(action)
  )
    return errorResponse(400, 'INVALID_ACTION', 'Unknown action');

  // 3) Anti-tampering: reject any forbidden keys
  for (const k of FORBIDDEN_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, k))
      return errorResponse(400, 'INVALID_PAYLOAD', 'Forbidden field present', action);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const adapter = buildAdapter(userClient, adminClient);

  // 4) Role gate
  let roles: string[];
  try {
    roles = await adapter.fetchUserRoles(userId);
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
  if (!pickAuthorizedRole(roles))
    return errorResponse(403, 'UNAUTHORIZED_ROLE', 'Not authorized', action);

  // 5) Dispatch
  try {
    switch (action) {
      case 'create_request': {
        const p = CreateRequestSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcCreateRequest(
          {
            mapping_id: p.data.mappingId,
            comparison_report_json: p.data.comparisonReportJson,
            comparison_critical_diffs_count: p.data.comparisonCriticalDiffsCount,
            payroll_impact_preview_json: p.data.payrollImpactPreviewJson,
            actor_user_id: userId,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'submit_for_second_approval': {
        const p = SubmitSecondApprovalSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcSubmit(p.data.requestId, adapter);
        return successResponse(action, data);
      }
      case 'second_approve': {
        const p = SecondApproveSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcSecondApprove(
          {
            request_id: p.data.requestId,
            acknowledgements: p.data.acknowledgements,
            actor_user_id: userId,
            actor_roles: roles,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'reject': {
        const p = RejectSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcReject(
          { request_id: p.data.requestId, reason: p.data.reason },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'activate': {
        const p = ActivateSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcActivate(
          {
            request_id: p.data.requestId,
            actor_user_id: userId,
            actor_roles: roles,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'rollback': {
        const p = RollbackSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcRollback(
          {
            request_id: p.data.requestId,
            reason: p.data.reason,
            actor_user_id: userId,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'list': {
        const p = ListSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcList(
          {
            company_id: p.data.companyId,
            mapping_id: p.data.mappingId,
            request_status: p.data.requestStatus,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      default:
        return errorResponse(400, 'INVALID_ACTION', 'Unknown action', action);
    }
  } catch (err) {
    return mapError(err, action);
  }
});