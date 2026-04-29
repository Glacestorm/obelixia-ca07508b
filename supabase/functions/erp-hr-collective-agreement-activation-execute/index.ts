/**
 * B9 — Admin-gated edge wrapper for the Activation Executor service.
 *
 * Exposes:
 *   { action: 'activate', request_id }
 *   { action: 'rollback', run_id }
 *
 * HARD SAFETY:
 *  - verify_jwt = true (config.toml).
 *  - Server-side role-check: only admin or superadmin.
 *  - SERVICE_ROLE_KEY only read from Deno.env, never returned.
 *  - Errors sanitized; no DB raw messages or stack traces.
 *  - Patch on the registry contains EXACTLY the 6 allowed keys.
 *  - Existing trigger enforce_ca_registry_ready_for_payroll is the
 *    last line of DB defense.
 *  - Forbidden payload keys are rejected (ready_for_payroll, ...).
 *  - The legacy operational table is NOT referenced. No payroll imports.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EXECUTE_ROLES = ['admin', 'superadmin'] as const;

const FORBIDDEN_PAYLOAD_KEYS = [
  'ready_for_payroll',
  'data_completeness',
  'requires_human_review',
  'salary_tables_loaded',
  'official_submission_blocked',
  'activated_by',
  'activated_for_payroll_at',
  'activation_request_id',
  'readiness_report_json',
  'readiness_passed',
  'request_signature_hash',
  'approval_signature_hash',
] as const;

const T_REGISTRY = 'erp_hr_collective_agreements_registry';
const T_VERSIONS = 'erp_hr_collective_agreements_registry_versions';
const T_SOURCES = 'erp_hr_collective_agreements_registry_sources';
const T_SALARY_TABLES = 'erp_hr_collective_agreements_registry_salary_tables';
const T_RULES = 'erp_hr_collective_agreements_registry_rules';
const T_VALIDATIONS = 'erp_hr_collective_agreement_registry_validations';
const T_REQUESTS =
  'erp_hr_collective_agreement_registry_activation_requests';
const T_APPROVALS =
  'erp_hr_collective_agreement_registry_activation_approvals';
const T_RUNS = 'erp_hr_collective_agreement_registry_activation_runs';

const uuid = z.string().uuid();

const ActivateSchema = z
  .object({ action: z.literal('activate'), request_id: uuid })
  .strict();
const RollbackSchema = z
  .object({ action: z.literal('rollback'), run_id: uuid })
  .strict();

const KNOWN_ACTIONS = ['activate', 'rollback'] as const;

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

function mapError(code: string): { status: number; message: string } {
  switch (code) {
    case 'UNAUTHORIZED':
      return { status: 401, message: 'Unauthorized' };
    case 'INSUFFICIENT_ROLE':
      return { status: 403, message: 'Not authorized' };
    case 'NOT_FOUND':
      return { status: 404, message: 'Not found' };
    case 'INVALID_STATE':
      return { status: 409, message: 'Invalid state' };
    case 'NO_VALID_APPROVAL':
      return { status: 409, message: 'No valid second approval' };
    case 'BLOCKED_BY_INVARIANT':
      return { status: 409, message: 'Readiness invariants failed' };
    case 'BLOCKED_BY_TRIGGER':
      return { status: 409, message: 'DB trigger refused activation' };
    case 'ALREADY_ROLLED_BACK':
      return { status: 409, message: 'Already rolled back' };
    case 'INVALID_PAYLOAD':
      return { status: 400, message: 'Invalid payload' };
    case 'INVALID_ACTION':
      return { status: 400, message: 'Unknown action' };
    default:
      return { status: 500, message: 'Internal error' };
  }
}

function isCheckViolation(e: unknown): boolean {
  if (!e) return false;
  const anyE = e as { code?: string; message?: string };
  if (anyE.code === '23514') return true;
  const text = (anyE.message ?? '').toLowerCase();
  return (
    text.includes('check_violation') ||
    text.includes('ready_for_payroll=true requires')
  );
}

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
}): { passed: boolean; blocking_failures: string[] } {
  const v = input.validation;
  const ver = input.version;
  const ag = input.agreement;
  const src = input.source;
  const failures: string[] = [];
  const must = (id: string, ok: boolean) => { if (!ok) failures.push(id); };

  must('validation_approved_internal', v.validation_status === 'approved_internal');
  must('validation_is_current', v.is_current === true);
  const scope = new Set<string>(v.validation_scope ?? []);
  for (const r of REQUIRED_SCOPES) must(`validation_scope_${r}`, scope.has(r));
  must('version_is_current', ver.is_current === true);
  must('version_belongs_to_agreement', ver.agreement_id === ag.id);
  must('source_belongs_to_agreement', src.agreement_id === ag.id);

  const vh = ver.source_hash ?? '';
  const sh = src.document_hash ?? '';
  const ah = v.sha256_hash ?? '';
  must('sha256_alignment', /^[a-f0-9]{64}$/.test(ah) && vh === ah && sh === ah);
  must('source_quality_official', src.source_quality === 'official');
  must('agreement_salary_tables_loaded', ag.salary_tables_loaded === true);
  must('agreement_data_completeness_min', ALLOWED_DATA_COMPLETENESS.has(ag.data_completeness));
  must('agreement_status_vigente_or_ultra', ALLOWED_AGREEMENT_STATUS.has(ag.status));
  must('no_unresolved_critical_warnings', (input.unresolvedCriticalWarningsCount ?? 0) === 0);
  must('no_unresolved_discarded_critical_rows', (input.discardedCriticalRowsUnresolvedCount ?? 0) === 0);
  must('salary_tables_count_gt_zero', (input.salaryTablesCount ?? 0) > 0);
  must('rules_count_gt_zero', (input.rulesCount ?? 0) > 0);

  return { passed: failures.length === 0, blocking_failures: failures };
}

const SNAPSHOT_KEYS = [
  'data_completeness',
  'requires_human_review',
  'ready_for_payroll',
  'activated_for_payroll_at',
  'activated_by',
  'activation_request_id',
] as const;

function pickSnapshot(row: Record<string, unknown> | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!row) return out;
  for (const k of SNAPSHOT_KEYS) out[k] = row[k] ?? null;
  return out;
}

// ----------------- HTTP handler -----------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return err(405, 'INVALID_ACTION', 'Method not allowed');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const m = mapError('UNAUTHORIZED');
    return err(m.status, 'UNAUTHORIZED', m.message);
  }
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
    if (error || !data?.claims?.sub) return err(401, 'UNAUTHORIZED', 'Invalid token');
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
  if (typeof action !== 'string' || !(KNOWN_ACTIONS as readonly string[]).includes(action))
    return err(400, 'INVALID_ACTION', 'Unknown action');

  for (const k of FORBIDDEN_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, k))
      return err(400, 'INVALID_PAYLOAD', 'Forbidden field present', action);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Role-check (admin or superadmin only)
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
  const isAuthorized = actingRoles.some((r) =>
    (EXECUTE_ROLES as readonly string[]).includes(r),
  );
  if (!isAuthorized) {
    const m = mapError('INSUFFICIENT_ROLE');
    return err(m.status, 'INSUFFICIENT_ROLE', m.message, action);
  }

  const nowIso = new Date().toISOString();

  try {
    if (action === 'activate') {
      const p = ActivateSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);

      // Load request
      const { data: r } = await adminClient
        .from(T_REQUESTS)
        .select('*')
        .eq('id', p.data.request_id)
        .maybeSingle();
      if (!r) {
        const m = mapError('NOT_FOUND');
        return err(m.status, 'NOT_FOUND', m.message, action);
      }
      if (r.activation_status !== 'approved_for_activation') {
        const m = mapError('INVALID_STATE');
        return err(m.status, 'INVALID_STATE', m.message, action);
      }

      // Approval validation
      const { data: approval } = await adminClient
        .from(T_APPROVALS)
        .select('*')
        .eq('request_id', r.id)
        .eq('decision', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!approval || approval.approver_id === r.requested_by) {
        const m = mapError('NO_VALID_APPROVAL');
        return err(m.status, 'NO_VALID_APPROVAL', m.message, action);
      }

      // Reload domain
      const [{ data: ag }, { data: ver }, { data: val }] = await Promise.all([
        adminClient.from(T_REGISTRY).select('id, status, source_quality, data_completeness, salary_tables_loaded').eq('id', r.agreement_id).maybeSingle(),
        adminClient.from(T_VERSIONS).select('id, agreement_id, is_current, source_hash').eq('id', r.version_id).maybeSingle(),
        adminClient.from(T_VALIDATIONS).select('*').eq('id', r.validation_id).maybeSingle(),
      ]);
      if (!ag || !ver || !val) {
        const m = mapError('NOT_FOUND');
        return err(m.status, 'NOT_FOUND', m.message, action);
      }
      const { data: src } = await adminClient
        .from(T_SOURCES)
        .select('id, agreement_id, document_hash, source_quality')
        .eq('id', val.source_id)
        .maybeSingle();
      if (!src) {
        const m = mapError('NOT_FOUND');
        return err(m.status, 'NOT_FOUND', m.message, action);
      }

      const [{ count: stCount }, { count: rCount }] = await Promise.all([
        adminClient.from(T_SALARY_TABLES).select('id', { count: 'exact', head: true }).eq('agreement_id', ag.id).eq('version_id', ver.id),
        adminClient.from(T_RULES).select('id', { count: 'exact', head: true }).eq('agreement_id', ag.id).eq('version_id', ver.id),
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

      if (!report.passed) {
        const detail = report.blocking_failures.join(',');
        await adminClient.from(T_RUNS).insert({
          request_id: r.id,
          agreement_id: r.agreement_id,
          version_id: r.version_id,
          validation_id: r.validation_id,
          executed_by: userId,
          executed_at: nowIso,
          pre_state_snapshot_json: null,
          post_state_snapshot_json: null,
          outcome: 'blocked_by_invariant',
          error_detail: detail,
          run_signature_hash: null,
        });
        const m = mapError('BLOCKED_BY_INVARIANT');
        return err(m.status, 'BLOCKED_BY_INVARIANT', m.message, action);
      }

      // Snapshot pre
      const { data: preRow } = await adminClient
        .from(T_REGISTRY)
        .select('data_completeness, requires_human_review, ready_for_payroll, activated_for_payroll_at, activated_by, activation_request_id')
        .eq('id', r.agreement_id)
        .maybeSingle();
      const preSnapshot = pickSnapshot(preRow);

      // Patch (EXACT 6 keys)
      const patch = {
        data_completeness: 'human_validated',
        requires_human_review: false,
        ready_for_payroll: true,
        activated_for_payroll_at: nowIso,
        activated_by: userId,
        activation_request_id: r.id,
      };

      const { data: postRow, error: upErr } = await adminClient
        .from(T_REGISTRY)
        .update(patch)
        .eq('id', r.agreement_id)
        .select('data_completeness, requires_human_review, ready_for_payroll, activated_for_payroll_at, activated_by, activation_request_id')
        .maybeSingle();
      if (upErr) {
        if (isCheckViolation(upErr)) {
          await adminClient.from(T_RUNS).insert({
            request_id: r.id,
            agreement_id: r.agreement_id,
            version_id: r.version_id,
            validation_id: r.validation_id,
            executed_by: userId,
            executed_at: nowIso,
            pre_state_snapshot_json: preSnapshot,
            post_state_snapshot_json: null,
            outcome: 'blocked_by_trigger',
            error_detail: 'enforce_ca_registry_ready_for_payroll',
            run_signature_hash: null,
          });
          const m = mapError('BLOCKED_BY_TRIGGER');
          return err(m.status, 'BLOCKED_BY_TRIGGER', m.message, action);
        }
        return err(500, 'INTERNAL_ERROR', 'Internal error', action);
      }

      const postSnapshot = pickSnapshot(postRow);
      const sig = await sha256Hex(
        new TextEncoder().encode(
          stableStringify({
            request_id: r.id,
            agreement_id: r.agreement_id,
            pre: preSnapshot,
            post: postSnapshot,
            executed_by: userId,
            executed_at: nowIso,
            schema_version: 'b9-run-v1',
          }),
        ),
      );

      const { data: runIns, error: runErr } = await adminClient
        .from(T_RUNS)
        .insert({
          request_id: r.id,
          agreement_id: r.agreement_id,
          version_id: r.version_id,
          validation_id: r.validation_id,
          executed_by: userId,
          executed_at: nowIso,
          pre_state_snapshot_json: preSnapshot,
          post_state_snapshot_json: postSnapshot,
          outcome: 'activated',
          error_detail: null,
          run_signature_hash: sig,
        })
        .select('id')
        .single();
      if (runErr) return err(500, 'INTERNAL_ERROR', 'Internal error', action);

      return ok(action, {
        run_id: runIns.id,
        outcome: 'activated',
        run_signature_hash: sig,
      });
    }

    if (action === 'rollback') {
      const p = RollbackSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);

      const { data: run } = await adminClient
        .from(T_RUNS)
        .select('*')
        .eq('id', p.data.run_id)
        .maybeSingle();
      if (!run) {
        const m = mapError('NOT_FOUND');
        return err(m.status, 'NOT_FOUND', m.message, action);
      }
      if (run.outcome !== 'activated') {
        const m = mapError('INVALID_STATE');
        return err(m.status, 'INVALID_STATE', m.message, action);
      }
      if (!run.pre_state_snapshot_json || !run.agreement_id || !run.request_id) {
        const m = mapError('INVALID_STATE');
        return err(m.status, 'INVALID_STATE', m.message, action);
      }

      const { data: prev } = await adminClient
        .from(T_RUNS)
        .select('id')
        .eq('request_id', run.request_id)
        .eq('outcome', 'rolled_back')
        .maybeSingle();
      if (prev) {
        const m = mapError('ALREADY_ROLLED_BACK');
        return err(m.status, 'ALREADY_ROLLED_BACK', m.message, action);
      }

      const restorePatch: Record<string, unknown> = {};
      for (const k of SNAPSHOT_KEYS) {
        restorePatch[k] = (run.pre_state_snapshot_json as Record<string, unknown>)[k] ?? null;
      }

      const { error: upErr } = await adminClient
        .from(T_REGISTRY)
        .update(restorePatch)
        .eq('id', run.agreement_id);
      if (upErr) return err(500, 'INTERNAL_ERROR', 'Internal error', action);

      const sig = await sha256Hex(
        new TextEncoder().encode(
          stableStringify({
            original_run_id: run.id,
            request_id: run.request_id,
            agreement_id: run.agreement_id,
            pre: run.post_state_snapshot_json ?? null,
            post: run.pre_state_snapshot_json,
            executed_by: userId,
            executed_at: nowIso,
            schema_version: 'b9-rollback-v1',
          }),
        ),
      );

      const { data: newRun, error: insErr } = await adminClient
        .from(T_RUNS)
        .insert({
          request_id: run.request_id,
          agreement_id: run.agreement_id,
          version_id: run.version_id,
          validation_id: run.validation_id,
          executed_by: userId,
          executed_at: nowIso,
          pre_state_snapshot_json: run.post_state_snapshot_json ?? null,
          post_state_snapshot_json: run.pre_state_snapshot_json,
          outcome: 'rolled_back',
          error_detail: `rolled_back_run=${run.id}`,
          run_signature_hash: sig,
        })
        .select('id')
        .single();
      if (insErr) return err(500, 'INTERNAL_ERROR', 'Internal error', action);

      return ok(action, {
        run_id: newRun.id,
        outcome: 'rolled_back',
        run_signature_hash: sig,
      });
    }
  } catch {
    return err(500, 'INTERNAL_ERROR', 'Internal error', action);
  }

  return err(400, 'INVALID_ACTION', 'Unknown action', action);
});