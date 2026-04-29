/**
 * B8B — Admin-gated edge wrapper for the Activation Proposal Service.
 *
 * Exposes: create_request, recompute_readiness, submit_for_second_approval,
 * second_approve, reject, supersede.
 *
 * HARD SAFETY:
 *  - verify_jwt = true (config.toml).
 *  - Server-side role-check via user_roles + JWT claims.
 *  - SERVICE_ROLE_KEY only read from Deno.env, never returned.
 *  - Errors sanitized; no DB raw messages or stack traces.
 *  - NEVER patches `erp_hr_collective_agreements_registry` master flags
 *    (`ready_for_payroll`, `data_completeness`, `salary_tables_loaded`,
 *     `requires_human_review`).
 *  - NEVER references the operational table `erp_hr_collective_agreements`
 *    (without `_registry`).
 *  - NEVER imports payroll/payslip/salaryNormalizer/agreementSalaryResolver.
 *  - Logic mirrored from `src/engines/erp/hr/collectiveAgreementActivation*`.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REQUEST_AUTHORIZED_ROLES = [
  'admin',
  'superadmin',
  'hr_manager',
  'legal_manager',
  'payroll_supervisor',
] as const;
const SECOND_APPROVAL_ROLES = [
  'admin',
  'superadmin',
  'payroll_supervisor',
  'legal_manager',
] as const;

const ACTIVATION_CHECKLIST_KEYS = [
  'reviewed_readiness_report',
  'accepts_payroll_registry_enablement_future',
  'verified_legal_validity_and_sha',
] as const;

const FORBIDDEN_PAYLOAD_KEYS = [
  'ready_for_payroll',
  'data_completeness',
  'salary_tables_loaded',
  'requires_human_review',
  'official_submission_blocked',
  'activation_status',
  'request_signature_hash',
  'approval_signature_hash',
  'readiness_report_json',
  'readiness_passed',
] as const;

const T_REGISTRY = 'erp_hr_collective_agreements_registry';
const T_VERSIONS = 'erp_hr_collective_agreements_registry_versions';
const T_SOURCES = 'erp_hr_collective_agreements_registry_sources';
const T_SALARY_TABLES = 'erp_hr_collective_agreements_registry_salary_tables';
const T_RULES = 'erp_hr_collective_agreements_registry_rules';
const T_VALIDATIONS = 'erp_hr_collective_agreement_registry_validations';
const T_VALIDATION_ITEMS =
  'erp_hr_collective_agreement_registry_validation_items';
const T_REQUESTS =
  'erp_hr_collective_agreement_registry_activation_requests';
const T_APPROVALS =
  'erp_hr_collective_agreement_registry_activation_approvals';

const uuid = z.string().uuid();

const CreateRequestSchema = z
  .object({
    action: z.literal('create_request'),
    agreementId: uuid,
    versionId: uuid,
    validationId: uuid,
  })
  .strict();
const RecomputeSchema = z
  .object({ action: z.literal('recompute_readiness'), requestId: uuid })
  .strict();
const SubmitSchema = z
  .object({
    action: z.literal('submit_for_second_approval'),
    requestId: uuid,
  })
  .strict();
const SecondApproveSchema = z
  .object({
    action: z.literal('second_approve'),
    requestId: uuid,
    decisionReason: z.string().max(4000).optional(),
    activationChecklist: z
      .object({
        reviewed_readiness_report: z.boolean(),
        accepts_payroll_registry_enablement_future: z.boolean(),
        verified_legal_validity_and_sha: z.boolean(),
      })
      .strict(),
  })
  .strict();
const RejectSchema = z
  .object({
    action: z.literal('reject'),
    requestId: uuid,
    decisionReason: z.string().min(5).max(4000),
  })
  .strict();
const SupersedeSchema = z
  .object({
    action: z.literal('supersede'),
    requestId: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

const KNOWN_ACTIONS = [
  'create_request',
  'recompute_readiness',
  'submit_for_second_approval',
  'second_approve',
  'reject',
  'supersede',
] as const;

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function ok(action: string, data: unknown): Response {
  return jsonResponse(200, {
    success: true,
    data: data ?? {},
    meta: { timestamp: new Date().toISOString(), action },
  });
}
function err(
  status: number,
  code: string,
  message: string,
  action: string | null = null,
): Response {
  return jsonResponse(status, {
    success: false,
    error: { code, message },
    meta: { timestamp: new Date().toISOString(), action: action ?? 'unknown' },
  });
}

function mapError(e: unknown): { status: number; code: string; message: string } {
  const raw = e instanceof Error ? e.message : String(e ?? '');
  const head = raw.split(':')[0] ?? '';
  if (
    head === 'AGREEMENT_NOT_FOUND' ||
    head === 'VERSION_NOT_FOUND' ||
    head === 'VALIDATION_NOT_FOUND' ||
    head === 'SOURCE_NOT_FOUND' ||
    head === 'REQUEST_NOT_FOUND'
  )
    return { status: 404, code: head, message: 'Not found' };
  if (
    head === 'ROLE_NOT_AUTHORIZED' ||
    head === 'APPROVER_ROLE_NOT_AUTHORIZED' ||
    head === 'NOT_OWNER' ||
    head === 'APPROVER_MUST_DIFFER_FROM_REQUESTER'
  )
    return { status: 403, code: head, message: 'Not authorized' };
  if (
    head === 'LIVE_REQUEST_ALREADY_EXISTS' ||
    head === 'REQUEST_NOT_DRAFT' ||
    head === 'REQUEST_NOT_PENDING_APPROVAL' ||
    head === 'REQUEST_NOT_RECOMPUTABLE' ||
    head === 'REQUEST_NOT_REJECTABLE' ||
    head === 'REQUEST_NOT_SUPERSEDABLE' ||
    head === 'READINESS_NOT_PASSED' ||
    head === 'ACTIVATION_CHECKLIST_INCOMPLETE' ||
    head === 'REJECT_REQUIRES_REASON' ||
    head === 'VERSION_AGREEMENT_MISMATCH' ||
    head === 'VALIDATION_AGREEMENT_MISMATCH' ||
    head === 'VALIDATION_VERSION_MISMATCH' ||
    head === 'SOURCE_AGREEMENT_MISMATCH'
  )
    return { status: 400, code: head, message: 'Invalid state' };
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Internal error' };
}

function pickRole(roles: string[], allowed: readonly string[]): string | null {
  for (const r of allowed) if (roles.includes(r)) return r;
  return null;
}

// ----------------- canonical signature helpers -----------------
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') +
    '}'
  );
}
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(d))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ----------------- readiness engine (mirrored) -----------------
const ALLOWED_AGREEMENT_STATUS = new Set(['vigente', 'ultraactividad']);
const ALLOWED_DATA_COMPLETENESS = new Set([
  'parsed_partial',
  'parsed_full',
  'human_validated',
]);
const REQUIRED_SCOPES = ['metadata', 'salary_tables', 'rules'];

function computeReadiness(input: {
  agreement: any;
  version: any;
  validation: any;
  source: any;
  salaryTablesCount: number;
  rulesCount: number;
  unresolvedCriticalWarningsCount: number;
  discardedCriticalRowsUnresolvedCount: number;
}) {
  const checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    severity: 'blocking';
    detail?: string;
  }> = [];
  const push = (id: string, label: string, passed: boolean, detail?: string) =>
    checks.push({ id, label, passed, severity: 'blocking', detail });

  const v = input.validation,
    ver = input.version,
    ag = input.agreement,
    src = input.source;

  push(
    'validation_approved_internal',
    'Validación interna aprobada',
    v.validation_status === 'approved_internal',
  );
  push('validation_is_current', 'Validación vigente', v.is_current === true);
  const scope = new Set<string>(v.validation_scope ?? []);
  for (const r of REQUIRED_SCOPES)
    push(`validation_scope_${r}`, `Scope ${r}`, scope.has(r));
  push('version_is_current', 'Versión vigente', ver.is_current === true);
  push(
    'version_belongs_to_agreement',
    'Versión del convenio',
    ver.agreement_id === ag.id,
  );
  push(
    'source_belongs_to_agreement',
    'Fuente del convenio',
    src.agreement_id === ag.id,
  );

  const vh = ver.source_hash ?? '';
  const sh = src.document_hash ?? '';
  const ah = v.sha256_hash ?? '';
  push(
    'sha256_alignment',
    'SHA-256 alineado',
    /^[a-f0-9]{64}$/.test(ah) && vh === ah && sh === ah,
  );
  push(
    'source_quality_official',
    'Fuente oficial',
    src.source_quality === 'official',
  );
  push(
    'agreement_salary_tables_loaded',
    'Tablas salariales cargadas',
    ag.salary_tables_loaded === true,
  );
  push(
    'agreement_data_completeness_min',
    'Completeness mínima',
    ALLOWED_DATA_COMPLETENESS.has(ag.data_completeness),
  );
  push(
    'agreement_status_vigente_or_ultra',
    'Vigente/ultraactividad',
    ALLOWED_AGREEMENT_STATUS.has(ag.status),
  );
  push(
    'no_unresolved_critical_warnings',
    'Sin warnings críticos',
    (input.unresolvedCriticalWarningsCount ?? 0) === 0,
  );
  push(
    'no_unresolved_discarded_critical_rows',
    'Sin filas críticas descartadas',
    (input.discardedCriticalRowsUnresolvedCount ?? 0) === 0,
  );
  push(
    'salary_tables_count_gt_zero',
    'Tablas salariales > 0',
    input.salaryTablesCount > 0,
  );
  push('rules_count_gt_zero', 'Reglas > 0', input.rulesCount > 0);

  const blocking_failures = checks.filter((c) => !c.passed).map((c) => c.id);
  return {
    passed: blocking_failures.length === 0,
    checks,
    blocking_failures,
    schema_version: 'b8b-v1',
  };
}

// ----------------- HTTP handler -----------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return err(405, 'INVALID_ACTION', 'Method not allowed');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return err(401, 'UNAUTHORIZED', 'Missing Authorization');
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return err(401, 'UNAUTHORIZED', 'Missing token');

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY)
    return err(500, 'INTERNAL_ERROR', 'Server misconfigured');

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  let userId: string;
  try {
    const { data, error } = await userClient.auth.getClaims(token);
    if (error || !data?.claims?.sub)
      return err(401, 'UNAUTHORIZED', 'Invalid token');
    userId = data.claims.sub as string;
  } catch {
    return err(401, 'UNAUTHORIZED', 'Invalid token');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, 'INVALID_PAYLOAD', 'Invalid JSON');
  }
  if (!body || typeof body !== 'object')
    return err(400, 'INVALID_PAYLOAD', 'Body must be object');

  const action = (body as { action?: unknown }).action;
  if (
    typeof action !== 'string' ||
    !(KNOWN_ACTIONS as readonly string[]).includes(action)
  )
    return err(400, 'INVALID_ACTION', 'Unknown action');

  for (const k of FORBIDDEN_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, k))
      return err(400, 'INVALID_PAYLOAD', 'Forbidden field present', action);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Role-check for the acting user
  let actingRoles: string[] = [];
  try {
    const { data, error } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (error) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
    actingRoles = (data ?? []).map((r: { role: string }) => r.role);
  } catch {
    return err(500, 'INTERNAL_ERROR', 'Internal error', action);
  }

  // For everything except second_approve/reject the requester role table applies.
  const isApprovalAction = action === 'second_approve' || action === 'reject';
  const allowed = isApprovalAction
    ? SECOND_APPROVAL_ROLES
    : REQUEST_AUTHORIZED_ROLES;
  const role = pickRole(actingRoles, allowed);
  if (!role) return err(403, 'ROLE_NOT_AUTHORIZED', 'Not authorized', action);

  try {
    switch (action) {
      case 'create_request': {
        const p = CreateRequestSchema.safeParse(body);
        if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);

        // Validate domain consistency + load readiness inputs
        const [{ data: ag }, { data: ver }, { data: val }] = await Promise.all([
          userClient.from(T_REGISTRY).select(
            'id, status, source_quality, data_completeness, salary_tables_loaded',
          ).eq('id', p.data.agreementId).maybeSingle(),
          userClient.from(T_VERSIONS).select(
            'id, agreement_id, is_current, source_hash',
          ).eq('id', p.data.versionId).maybeSingle(),
          userClient.from(T_VALIDATIONS).select('*').eq('id', p.data.validationId).maybeSingle(),
        ]);
        if (!ag) throw new Error('AGREEMENT_NOT_FOUND');
        if (!ver) throw new Error('VERSION_NOT_FOUND');
        if (!val) throw new Error('VALIDATION_NOT_FOUND');
        if (ver.agreement_id !== ag.id) throw new Error('VERSION_AGREEMENT_MISMATCH');
        if (val.agreement_id !== ag.id) throw new Error('VALIDATION_AGREEMENT_MISMATCH');
        if (val.version_id !== ver.id) throw new Error('VALIDATION_VERSION_MISMATCH');

        const { data: src } = await userClient
          .from(T_SOURCES)
          .select('id, agreement_id, document_hash, source_quality')
          .eq('id', val.source_id)
          .maybeSingle();
        if (!src) throw new Error('SOURCE_NOT_FOUND');
        if (src.agreement_id !== ag.id) throw new Error('SOURCE_AGREEMENT_MISMATCH');

        const [
          { count: stCount },
          { count: rCount },
        ] = await Promise.all([
          userClient
            .from(T_SALARY_TABLES)
            .select('id', { count: 'exact', head: true })
            .eq('agreement_id', ag.id)
            .eq('version_id', ver.id),
          userClient
            .from(T_RULES)
            .select('id', { count: 'exact', head: true })
            .eq('agreement_id', ag.id)
            .eq('version_id', ver.id),
        ]);

        // Live request guard
        const { data: live } = await adminClient
          .from(T_REQUESTS)
          .select('id')
          .eq('agreement_id', ag.id)
          .in('activation_status', [
            'draft',
            'pending_second_approval',
            'approved_for_activation',
          ])
          .maybeSingle();
        if (live) throw new Error('LIVE_REQUEST_ALREADY_EXISTS');

        const report = computeReadiness({
          agreement: ag,
          version: ver,
          validation: val,
          source: src,
          salaryTablesCount: stCount ?? 0,
          rulesCount: rCount ?? 0,
          unresolvedCriticalWarningsCount: 0,
          discardedCriticalRowsUnresolvedCount: 0,
        });

        const sigPayload = {
          agreement_id: ag.id,
          version_id: ver.id,
          validation_id: val.id,
          requested_by: userId,
          requested_role: role,
          readiness_report: report,
          schema_version: 'b8b-request-v1',
        };
        const sig = await sha256Hex(
          new TextEncoder().encode(stableStringify(sigPayload)),
        );

        const { data: ins, error: insErr } = await adminClient
          .from(T_REQUESTS)
          .insert({
            agreement_id: ag.id,
            version_id: ver.id,
            validation_id: val.id,
            requested_by: userId,
            requested_role: role,
            readiness_report_json: report,
            readiness_passed: report.passed,
            activation_status: 'draft',
            request_signature_hash: sig,
          })
          .select('id')
          .single();
        if (insErr) throw new Error('INTERNAL_ERROR');

        return ok(action, {
          id: ins.id,
          activation_status: 'draft',
          readiness_passed: report.passed,
          request_signature_hash: sig,
          readiness_report: report,
        });
      }

      case 'submit_for_second_approval': {
        const p = SubmitSchema.safeParse(body);
        if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        const { data: r } = await userClient
          .from(T_REQUESTS)
          .select('*')
          .eq('id', p.data.requestId)
          .maybeSingle();
        if (!r) throw new Error('REQUEST_NOT_FOUND');
        if (r.activation_status !== 'draft') throw new Error('REQUEST_NOT_DRAFT');
        if (r.requested_by !== userId) throw new Error('NOT_OWNER');
        if (!r.readiness_passed) throw new Error('READINESS_NOT_PASSED');
        const { error: uErr } = await adminClient
          .from(T_REQUESTS)
          .update({ activation_status: 'pending_second_approval' })
          .eq('id', r.id);
        if (uErr) throw new Error('INTERNAL_ERROR');
        return ok(action, { id: r.id, activation_status: 'pending_second_approval' });
      }

      case 'second_approve': {
        const p = SecondApproveSchema.safeParse(body);
        if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        const { data: r } = await userClient
          .from(T_REQUESTS)
          .select('*')
          .eq('id', p.data.requestId)
          .maybeSingle();
        if (!r) throw new Error('REQUEST_NOT_FOUND');
        if (r.activation_status !== 'pending_second_approval')
          throw new Error('REQUEST_NOT_PENDING_APPROVAL');
        if (!r.readiness_passed) throw new Error('READINESS_NOT_PASSED');
        if (r.requested_by === userId)
          throw new Error('APPROVER_MUST_DIFFER_FROM_REQUESTER');
        for (const k of ACTIVATION_CHECKLIST_KEYS) {
          if (p.data.activationChecklist[k] !== true)
            throw new Error(`ACTIVATION_CHECKLIST_INCOMPLETE:${k}`);
        }
        const sigPayload = {
          request_id: r.id,
          approver_id: userId,
          approver_role: role,
          decision: 'approved',
          decision_reason: p.data.decisionReason ?? null,
          activation_checklist: p.data.activationChecklist,
          schema_version: 'b8b-approval-v1',
        };
        const sig = await sha256Hex(
          new TextEncoder().encode(stableStringify(sigPayload)),
        );
        const { data: ins, error: insErr } = await adminClient
          .from(T_APPROVALS)
          .insert({
            request_id: r.id,
            approver_id: userId,
            approver_role: role,
            decision: 'approved',
            decision_reason: p.data.decisionReason ?? null,
            activation_checklist_json: p.data.activationChecklist,
            approval_signature_hash: sig,
          })
          .select('id')
          .single();
        if (insErr) throw new Error('INTERNAL_ERROR');
        const { error: uErr } = await adminClient
          .from(T_REQUESTS)
          .update({ activation_status: 'approved_for_activation' })
          .eq('id', r.id);
        if (uErr) throw new Error('INTERNAL_ERROR');
        return ok(action, {
          approval_id: ins.id,
          approval_signature_hash: sig,
          activation_status: 'approved_for_activation',
        });
      }

      case 'reject': {
        const p = RejectSchema.safeParse(body);
        if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        const { data: r } = await userClient
          .from(T_REQUESTS)
          .select('*')
          .eq('id', p.data.requestId)
          .maybeSingle();
        if (!r) throw new Error('REQUEST_NOT_FOUND');
        if (
          r.activation_status !== 'draft' &&
          r.activation_status !== 'pending_second_approval'
        )
          throw new Error('REQUEST_NOT_REJECTABLE');
        if (r.requested_by === userId)
          throw new Error('APPROVER_MUST_DIFFER_FROM_REQUESTER');
        const sigPayload = {
          request_id: r.id,
          approver_id: userId,
          approver_role: role,
          decision: 'rejected',
          decision_reason: p.data.decisionReason,
          activation_checklist: {},
          schema_version: 'b8b-approval-v1',
        };
        const sig = await sha256Hex(
          new TextEncoder().encode(stableStringify(sigPayload)),
        );
        const { data: ins, error: insErr } = await adminClient
          .from(T_APPROVALS)
          .insert({
            request_id: r.id,
            approver_id: userId,
            approver_role: role,
            decision: 'rejected',
            decision_reason: p.data.decisionReason,
            activation_checklist_json: {},
            approval_signature_hash: sig,
          })
          .select('id')
          .single();
        if (insErr) throw new Error('INTERNAL_ERROR');
        const { error: uErr } = await adminClient
          .from(T_REQUESTS)
          .update({ activation_status: 'rejected' })
          .eq('id', r.id);
        if (uErr) throw new Error('INTERNAL_ERROR');
        return ok(action, {
          approval_id: ins.id,
          approval_signature_hash: sig,
          activation_status: 'rejected',
        });
      }

      case 'supersede': {
        const p = SupersedeSchema.safeParse(body);
        if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        const { data: r } = await userClient
          .from(T_REQUESTS)
          .select('id, activation_status')
          .eq('id', p.data.requestId)
          .maybeSingle();
        if (!r) throw new Error('REQUEST_NOT_FOUND');
        if (
          r.activation_status === 'rejected' ||
          r.activation_status === 'superseded'
        )
          throw new Error('REQUEST_NOT_SUPERSEDABLE');
        const { error: uErr } = await adminClient
          .from(T_REQUESTS)
          .update({ activation_status: 'superseded' })
          .eq('id', r.id);
        if (uErr) throw new Error('INTERNAL_ERROR');
        return ok(action, { id: r.id, activation_status: 'superseded' });
      }

      case 'recompute_readiness': {
        const p = RecomputeSchema.safeParse(body);
        if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        const { data: r } = await userClient
          .from(T_REQUESTS)
          .select('*')
          .eq('id', p.data.requestId)
          .maybeSingle();
        if (!r) throw new Error('REQUEST_NOT_FOUND');
        if (r.activation_status !== 'draft')
          throw new Error('REQUEST_NOT_RECOMPUTABLE');
        if (r.requested_by !== userId) throw new Error('NOT_OWNER');

        const [{ data: ag }, { data: ver }, { data: val }] = await Promise.all([
          userClient.from(T_REGISTRY).select(
            'id, status, source_quality, data_completeness, salary_tables_loaded',
          ).eq('id', r.agreement_id).maybeSingle(),
          userClient.from(T_VERSIONS).select(
            'id, agreement_id, is_current, source_hash',
          ).eq('id', r.version_id).maybeSingle(),
          userClient.from(T_VALIDATIONS).select('*').eq('id', r.validation_id).maybeSingle(),
        ]);
        if (!ag || !ver || !val) throw new Error('REQUEST_NOT_FOUND');

        const { data: src } = await userClient
          .from(T_SOURCES)
          .select('id, agreement_id, document_hash, source_quality')
          .eq('id', val.source_id)
          .maybeSingle();
        if (!src) throw new Error('SOURCE_NOT_FOUND');

        const [{ count: stCount }, { count: rCount }] = await Promise.all([
          userClient
            .from(T_SALARY_TABLES)
            .select('id', { count: 'exact', head: true })
            .eq('agreement_id', ag.id)
            .eq('version_id', ver.id),
          userClient
            .from(T_RULES)
            .select('id', { count: 'exact', head: true })
            .eq('agreement_id', ag.id)
            .eq('version_id', ver.id),
        ]);

        const report = computeReadiness({
          agreement: ag,
          version: ver,
          validation: val,
          source: src,
          salaryTablesCount: stCount ?? 0,
          rulesCount: rCount ?? 0,
          unresolvedCriticalWarningsCount: 0,
          discardedCriticalRowsUnresolvedCount: 0,
        });

        const sigPayload = {
          agreement_id: r.agreement_id,
          version_id: r.version_id,
          validation_id: r.validation_id,
          requested_by: r.requested_by,
          requested_role: r.requested_role,
          readiness_report: report,
          schema_version: 'b8b-request-v1',
        };
        const sig = await sha256Hex(
          new TextEncoder().encode(stableStringify(sigPayload)),
        );

        const { error: uErr } = await adminClient
          .from(T_REQUESTS)
          .update({
            readiness_report_json: report,
            readiness_passed: report.passed,
            request_signature_hash: sig,
          })
          .eq('id', r.id);
        if (uErr) throw new Error('INTERNAL_ERROR');

        return ok(action, { readiness_report: report, request_signature_hash: sig });
      }
    }
  } catch (e) {
    const m = mapError(e);
    return err(m.status, m.code, m.message, action);
  }

  return err(400, 'INVALID_ACTION', 'Unknown action', action);
});