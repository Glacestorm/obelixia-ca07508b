/**
 * B10F.4 — Edge function: append-only audit log for registry pilot
 * payroll decisions.
 *
 * HARD SAFETY:
 *  - Requires JWT (verify_jwt = true). Identity-bound userClient + RLS
 *    rpc gate `user_has_erp_company_access`.
 *  - SERVICE_ROLE_KEY only used server-side after gates; never returned.
 *  - No imports from src/ (bridge, shadow flag, pilot gate, payroll
 *    engine, salary resolver, salary normalizer, payslip engine).
 *  - Does NOT touch operative table erp_hr_collective_agreements.
 *  - Does NOT mutate `ready_for_payroll`, `requires_human_review`,
 *    `data_completeness`, `salary_tables_loaded`, `source_quality`.
 *  - Does NOT modify `apply_runs.outcome` CHECK.
 *  - No `.delete(`. Append-only by table triggers.
 *  - Errors are sanitized: no raw error.message, no .stack.
 *  - Server-side decides: `decided_by`, `decided_at`, `signature_hash`.
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
const LOG_DECISION_ROLES = [
  'superadmin',
  'admin',
  'payroll_supervisor',
  'legal_manager',
] as const;

const LIST_DECISIONS_ROLES = [
  'superadmin',
  'admin',
  'hr_manager',
  'legal_manager',
  'payroll_supervisor',
  'auditor',
] as const;

const KNOWN_ACTIONS = ['log_decision', 'list_decisions'] as const;

const DECISION_OUTCOMES = [
  'pilot_applied',
  'pilot_blocked',
  'pilot_fallback',
] as const;

// Anti-tampering: client must NEVER send these.
const FORBIDDEN_PAYLOAD_KEYS = [
  'signature_hash',
  'decided_by',
  'decided_at',
  'created_at',
  'ready_for_payroll',
  'requires_human_review',
  'data_completeness',
  'salary_tables_loaded',
  'source_quality',
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
  'HR_REGISTRY_PILOT_MODE',
  'REGISTRY_PILOT_SCOPE_ALLOWLIST',
  'persisted_priority_apply',
  'C3B3C2',
  'service_role',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

// ---------------------------------------------------------------
// Zod schemas (.strict — no extra keys)
// ---------------------------------------------------------------
const uuid = z.string().uuid();

const LogDecisionSchema = z
  .object({
    action: z.literal('log_decision'),
    companyId: uuid,
    employeeId: uuid,
    contractId: uuid,
    targetYear: z.number().int().positive(),
    runtimeSettingId: uuid.optional(),
    mappingId: uuid.optional(),
    registryAgreementId: uuid.optional(),
    registryVersionId: uuid.optional(),
    decisionOutcome: z.enum(DECISION_OUTCOMES),
    decisionReason: z.string().min(1).max(500),
    comparisonSummary: z.record(z.unknown()).optional(),
    blockers: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional(),
    trace: z.record(z.unknown()).optional(),
  })
  .strict();

const ListDecisionsSchema = z
  .object({
    action: z.literal('list_decisions'),
    companyId: uuid,
    employeeId: uuid.optional(),
    contractId: uuid.optional(),
    targetYear: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(100).optional(),
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
    case 'FORBIDDEN_PAYLOAD_KEY':
      return errorResponse(400, 'FORBIDDEN_PAYLOAD_KEY', 'Forbidden payload key', action);
    case 'INVALID_PAYLOAD':
      return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
    case 'INVALID_ACTION':
      return errorResponse(400, 'INVALID_ACTION', 'Invalid action', action);
    case 'INSERT_ERROR':
      return errorResponse(500, 'INSERT_ERROR', 'Insert failed', action);
    case 'LIST_ERROR':
      return errorResponse(500, 'LIST_ERROR', 'List failed', action);
    default:
      return errorResponse(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
}

function pickAuthorizedRole(
  roles: string[],
  allowed: readonly string[],
): string | null {
  for (const r of roles) {
    if (allowed.includes(r)) return r;
  }
  return null;
}

function payloadHasForbiddenKey(payload: Record<string, unknown>): boolean {
  for (const k of FORBIDDEN_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, k)) return true;
  }
  return false;
}

// ---------------------------------------------------------------
// Stable JSON + SHA-256
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

async function computeDecisionSignatureHash(payload: {
  company_id: string;
  employee_id: string;
  contract_id: string;
  target_year: number;
  decision_outcome: string;
  decision_reason: string;
  mapping_id: string | null;
  registry_agreement_id: string | null;
  registry_version_id: string | null;
  decided_by: string;
  decided_at: string;
  comparison_summary_json: Record<string, unknown>;
  blockers_json: string[];
  warnings_json: string[];
}): Promise<string> {
  return sha256Hex(stableStringify(payload));
}

// ---------------------------------------------------------------
// Server
// ---------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Auth header
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return errorResponse(401, 'UNAUTHORIZED', 'Missing or invalid Authorization');
  }

  // Env
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return errorResponse(500, 'CONFIG_ERROR', 'Server not configured');
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Identity
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return errorResponse(401, 'UNAUTHORIZED', 'Invalid token');
  }
  const userId = userData.user.id;

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid JSON');
  }
  if (!body || typeof body !== 'object') {
    return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload');
  }

  const bodyObj = body as Record<string, unknown>;

  // Forbidden keys
  if (payloadHasForbiddenKey(bodyObj)) {
    return mapError({ code: 'FORBIDDEN_PAYLOAD_KEY' });
  }

  const action = bodyObj.action;
  if (typeof action !== 'string' || !KNOWN_ACTIONS.includes(action as never)) {
    return mapError({ code: 'INVALID_ACTION' });
  }

  try {
    // Roles
    const { data: rolesData, error: rolesErr } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (rolesErr) {
      return mapError({ code: 'INTERNAL_ERROR' }, action);
    }
    const roles = (rolesData ?? []).map((r: { role: string }) => r.role);

    if (action === 'log_decision') {
      const parsed = LogDecisionSchema.safeParse(bodyObj);
      if (!parsed.success) return mapError({ code: 'INVALID_PAYLOAD' }, action);
      const p = parsed.data;

      if (!pickAuthorizedRole(roles, LOG_DECISION_ROLES)) {
        return mapError({ code: 'UNAUTHORIZED_ROLE' }, action);
      }

      const { data: accessOk, error: accessErr } = await userClient.rpc(
        'user_has_erp_company_access',
        { p_company_id: p.companyId },
      );
      if (accessErr || accessOk !== true) {
        return mapError({ code: 'NO_COMPANY_ACCESS' }, action);
      }

      const decided_at = new Date().toISOString();
      const comparison_summary_json = p.comparisonSummary ?? {};
      const blockers_json = p.blockers ?? [];
      const warnings_json = p.warnings ?? [];
      const trace_json = p.trace ?? {};

      const signature_hash = await computeDecisionSignatureHash({
        company_id: p.companyId,
        employee_id: p.employeeId,
        contract_id: p.contractId,
        target_year: p.targetYear,
        decision_outcome: p.decisionOutcome,
        decision_reason: p.decisionReason,
        mapping_id: p.mappingId ?? null,
        registry_agreement_id: p.registryAgreementId ?? null,
        registry_version_id: p.registryVersionId ?? null,
        decided_by: userId,
        decided_at,
        comparison_summary_json,
        blockers_json,
        warnings_json,
      });

      const row = {
        company_id: p.companyId,
        employee_id: p.employeeId,
        contract_id: p.contractId,
        target_year: p.targetYear,
        runtime_setting_id: p.runtimeSettingId ?? null,
        mapping_id: p.mappingId ?? null,
        registry_agreement_id: p.registryAgreementId ?? null,
        registry_version_id: p.registryVersionId ?? null,
        decision_outcome: p.decisionOutcome,
        decision_reason: p.decisionReason,
        comparison_summary_json,
        blockers_json,
        warnings_json,
        trace_json,
        decided_by: userId,
        decided_at,
        signature_hash,
      };

      const { data: inserted, error: insErr } = await adminClient
        .from('erp_hr_company_agreement_registry_pilot_decision_logs')
        .insert(row)
        .select('id, decided_at, signature_hash')
        .single();
      if (insErr) {
        return mapError({ code: 'INSERT_ERROR' }, action);
      }
      return successResponse(action, inserted);
    }

    if (action === 'list_decisions') {
      const parsed = ListDecisionsSchema.safeParse(bodyObj);
      if (!parsed.success) return mapError({ code: 'INVALID_PAYLOAD' }, action);
      const p = parsed.data;

      if (!pickAuthorizedRole(roles, LIST_DECISIONS_ROLES)) {
        return mapError({ code: 'UNAUTHORIZED_ROLE' }, action);
      }

      const { data: accessOk, error: accessErr } = await userClient.rpc(
        'user_has_erp_company_access',
        { p_company_id: p.companyId },
      );
      if (accessErr || accessOk !== true) {
        return mapError({ code: 'NO_COMPANY_ACCESS' }, action);
      }

      const limit = Math.min(p.limit ?? 50, 100);
      let q = adminClient
        .from('erp_hr_company_agreement_registry_pilot_decision_logs')
        .select('*')
        .eq('company_id', p.companyId)
        .order('decided_at', { ascending: false })
        .limit(limit);
      if (p.employeeId) q = q.eq('employee_id', p.employeeId);
      if (p.contractId) q = q.eq('contract_id', p.contractId);
      if (typeof p.targetYear === 'number') q = q.eq('target_year', p.targetYear);

      const { data: rows, error: listErr } = await q;
      if (listErr) {
        return mapError({ code: 'LIST_ERROR' }, action);
      }
      return successResponse(action, rows ?? []);
    }

    return mapError({ code: 'INVALID_ACTION' }, action);
  } catch {
    return mapError({ code: 'INTERNAL_ERROR' }, action);
  }
});
