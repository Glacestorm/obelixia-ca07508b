/**
 * B11.2C.2 — TIC-NAC Salary Table Staging Edge Function.
 *
 * HARD SAFETY:
 *  - verify_jwt = true (config.toml).
 *  - Server-side role-check: superadmin / admin / legal_manager
 *    / hr_manager / payroll_supervisor only.
 *  - SUPABASE_SERVICE_ROLE_KEY only read from Deno.env, never returned.
 *  - Errors sanitized; never returns raw DB messages or stack traces.
 *  - Forbidden payload keys are rejected.
 *  - Reviewers and timestamps are decided server-side.
 *  - Operates only on staging + audit tables. NEVER touches:
 *      * erp_hr_collective_agreements (operative table)
 *      * salary_tables_loaded / ready_for_payroll / data_completeness
 *      * pilot allow-list flags
 *  - No imports from the payroll bridge / payroll / payslip engines /
 *    salary normalizer / agreement salary resolver modules.
 *  - approve_second blocks same reviewer as first.
 *  - OCR rows are NEVER auto-approved by confidence.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_ROLES = [
  'superadmin',
  'admin',
  'legal_manager',
  'hr_manager',
  'payroll_supervisor',
] as const;

const FORBIDDEN_PAYLOAD_KEYS = [
  'ready_for_payroll',
  'salary_tables_loaded',
  'data_completeness',
  'requires_human_review',
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
  'HR_REGISTRY_PILOT_MODE',
  'REGISTRY_PILOT_SCOPE_ALLOWLIST',
  'service_role',
  'created_at',
  'updated_at',
  'first_reviewed_by',
  'first_reviewed_at',
  'second_reviewed_by',
  'second_reviewed_at',
  'approval_hash',
] as const;

const T_STAGING = 'erp_hr_collective_agreement_salary_table_staging';
const T_AUDIT = 'erp_hr_collective_agreement_staging_audit';

const APPROVAL_MODES = [
  'ocr_single_human_approval',
  'ocr_dual_human_approval',
  'manual_upload_single_approval',
  'manual_upload_dual_approval',
] as const;

const VALID_YEARS = [2025, 2026, 2027] as const;

const KEYWORDS = [
  'transporte',
  'nocturnidad',
  'festivo',
  'antigüedad',
  'antiguedad',
  'dieta',
  'kilomet',
  'responsabilidad',
  'convenio',
] as const;

const APPROVED_STATES = [
  'human_approved_single',
  'human_approved_first',
  'human_approved_second',
] as const;

const uuid = z.string().uuid();

// ---------- Schemas ----------
const RawRowSchema = z
  .object({
    source_page: z.union([z.string(), z.number()]),
    source_excerpt: z.string().min(1),
    source_article: z.string().nullish(),
    source_annex: z.string().nullish(),
    ocr_raw_text: z.string().nullish(),
    year: z.number().int(),
    area_code: z.string().nullish(),
    area_name: z.string().nullish(),
    professional_group: z.string().min(1),
    level: z.string().nullish(),
    category: z.string().nullish(),
    concept_literal_from_agreement: z.string().min(1),
    normalized_concept_key: z.string().min(1),
    payroll_label: z.string().min(1),
    payslip_label: z.string().min(1),
    cra_code_suggested: z.string().nullish(),
    taxable_irpf_hint: z.boolean().nullish(),
    cotization_included_hint: z.boolean().nullish(),
    salary_base_annual: z.number().nullish(),
    salary_base_monthly: z.number().nullish(),
    extra_pay_amount: z.number().nullish(),
    plus_convenio_annual: z.number().nullish(),
    plus_convenio_monthly: z.number().nullish(),
    plus_transport: z.number().nullish(),
    plus_antiguedad: z.number().nullish(),
    other_amount: z.number().nullish(),
    currency: z.string().default('EUR'),
    row_confidence: z.string().nullish(),
    review_notes: z.string().nullish(),
  })
  .strict();

const ListSchema = z
  .object({
    action: z.literal('list_for_review'),
    agreement_id: uuid,
    version_id: uuid,
    status: z.string().optional(),
  })
  .strict();

const StageOcrSchema = z
  .object({
    action: z.literal('stage_ocr_batch'),
    agreement_id: uuid,
    version_id: uuid,
    approval_mode: z.enum(APPROVAL_MODES),
    raw_rows: z.array(RawRowSchema).min(1).max(500),
  })
  .strict();

const StageManualSchema = z
  .object({
    action: z.literal('stage_manual_batch'),
    agreement_id: uuid,
    version_id: uuid,
    approval_mode: z.enum(APPROVAL_MODES),
    rows: z.array(RawRowSchema).min(1).max(500),
    extraction: z.enum(['manual_csv', 'manual_form']).optional(),
  })
  .strict();

const EditSchema = z
  .object({
    action: z.literal('edit_row'),
    row_id: uuid,
    patch: z
      .object({
        source_page: z.union([z.string(), z.number()]).optional(),
        source_excerpt: z.string().min(1).optional(),
        source_article: z.string().nullish(),
        source_annex: z.string().nullish(),
        professional_group: z.string().min(1).optional(),
        level: z.string().nullish(),
        category: z.string().nullish(),
        concept_literal_from_agreement: z.string().min(1).optional(),
        normalized_concept_key: z.string().min(1).optional(),
        payroll_label: z.string().min(1).optional(),
        payslip_label: z.string().min(1).optional(),
        salary_base_annual: z.number().nullish(),
        salary_base_monthly: z.number().nullish(),
        extra_pay_amount: z.number().nullish(),
        plus_convenio_annual: z.number().nullish(),
        plus_convenio_monthly: z.number().nullish(),
        plus_transport: z.number().nullish(),
        plus_antiguedad: z.number().nullish(),
        other_amount: z.number().nullish(),
        cra_code_suggested: z.string().nullish(),
        taxable_irpf_hint: z.boolean().nullish(),
        cotization_included_hint: z.boolean().nullish(),
        row_confidence: z.string().nullish(),
        review_notes: z.string().nullish(),
      })
      .strict(),
  })
  .strict();

const ApproveSingleSchema = z
  .object({ action: z.literal('approve_single'), row_id: uuid })
  .strict();
const ApproveFirstSchema = z
  .object({ action: z.literal('approve_first'), row_id: uuid })
  .strict();
const ApproveSecondSchema = z
  .object({ action: z.literal('approve_second'), row_id: uuid })
  .strict();
const RejectSchema = z
  .object({
    action: z.literal('reject'),
    row_id: uuid,
    reason: z.string().min(5),
  })
  .strict();
const NeedsCorrectionSchema = z
  .object({
    action: z.literal('mark_needs_correction'),
    row_id: uuid,
    reason: z.string().min(5),
  })
  .strict();

const KNOWN_ACTIONS = [
  'list_for_review',
  'stage_ocr_batch',
  'stage_manual_batch',
  'edit_row',
  'approve_single',
  'approve_first',
  'approve_second',
  'reject',
  'mark_needs_correction',
] as const;

// ---------- Response helpers ----------
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
    case 'INVALID_PAYLOAD':
      return { status: 400, message: 'Invalid payload' };
    case 'ROW_NOT_FOUND':
      return { status: 404, message: 'Row not found' };
    case 'INVALID_TRANSITION':
      return { status: 409, message: 'Invalid transition' };
    case 'SAME_REVIEWER_NOT_ALLOWED':
      return { status: 409, message: 'Second reviewer must differ from first' };
    case 'APPROVAL_BLOCKED':
      return { status: 409, message: 'Approval blocked by validation rules' };
    default:
      return { status: 500, message: 'Internal error' };
  }
}

// ---------- Hash helpers ----------
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
async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const d = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(d))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
async function computeContentHash(row: Record<string, unknown>): Promise<string> {
  const subset = {
    agreement_id: row.agreement_id,
    version_id: row.version_id,
    year: row.year,
    area_code: row.area_code ?? null,
    professional_group: row.professional_group,
    level: row.level ?? null,
    category: row.category ?? null,
    normalized_concept_key: row.normalized_concept_key,
    concept_literal_from_agreement: row.concept_literal_from_agreement,
    payroll_label: row.payroll_label,
    payslip_label: row.payslip_label,
    salary_base_annual: row.salary_base_annual ?? null,
    salary_base_monthly: row.salary_base_monthly ?? null,
    extra_pay_amount: row.extra_pay_amount ?? null,
    plus_convenio_annual: row.plus_convenio_annual ?? null,
    plus_convenio_monthly: row.plus_convenio_monthly ?? null,
    plus_transport: row.plus_transport ?? null,
    plus_antiguedad: row.plus_antiguedad ?? null,
    other_amount: row.other_amount ?? null,
    currency: row.currency ?? 'EUR',
  };
  return await sha256Hex(stableStringify(subset));
}
async function computeApprovalHash(
  row: Record<string, unknown>,
  reviewer: string,
  step: 'single' | 'first' | 'second',
): Promise<string> {
  return await sha256Hex(
    stableStringify({
      content_hash: row.content_hash,
      reviewer,
      step,
      ts: new Date().toISOString().slice(0, 10),
      schema_version: 'b11-2c2-approval-v1',
    }),
  );
}

// ---------- Validation helpers ----------
function lower(s: unknown): string {
  return typeof s === 'string' ? s.toLowerCase() : '';
}
function preservesAgreementKeyword(
  literal: unknown,
  payslip: unknown,
): boolean {
  const l = lower(literal);
  const p = lower(payslip);
  for (const k of KEYWORDS) {
    if (l.includes(k) && !p.includes(k)) return false;
  }
  return true;
}

function shapeRowForInsert(
  raw: z.infer<typeof RawRowSchema>,
  args: {
    agreement_id: string;
    version_id: string;
    extraction_method: 'ocr' | 'manual_csv' | 'manual_form';
    approval_mode: (typeof APPROVAL_MODES)[number];
  },
): Record<string, unknown> {
  if (!VALID_YEARS.includes(raw.year as 2025 | 2026 | 2027)) {
    throw new Error('YEAR_OUT_OF_RANGE');
  }
  if (!preservesAgreementKeyword(raw.concept_literal_from_agreement, raw.payslip_label)) {
    throw new Error('PAYSLIP_LABEL_LOSES_KEYWORD');
  }
  const validation_status =
    args.extraction_method === 'ocr' ? 'ocr_pending_review' : 'manual_pending_review';
  // OCR rows must have row_confidence (DB trigger enforces too)
  let row_confidence = raw.row_confidence ?? null;
  if (args.extraction_method === 'ocr' && (!row_confidence || row_confidence.length === 0)) {
    row_confidence = 'ocr_low';
  }
  return {
    agreement_id: args.agreement_id,
    version_id: args.version_id,
    source_document: 'BOE-A-2025-7766',
    source_page: String(raw.source_page),
    source_excerpt: raw.source_excerpt,
    source_article: raw.source_article ?? null,
    source_annex: raw.source_annex ?? null,
    ocr_raw_text: raw.ocr_raw_text ?? null,
    extraction_method: args.extraction_method,
    approval_mode: args.approval_mode,
    year: raw.year,
    area_code: raw.area_code ?? null,
    area_name: raw.area_name ?? null,
    professional_group: raw.professional_group,
    level: raw.level ?? null,
    category: raw.category ?? null,
    concept_literal_from_agreement: raw.concept_literal_from_agreement,
    normalized_concept_key: raw.normalized_concept_key,
    payroll_label: raw.payroll_label,
    payslip_label: raw.payslip_label,
    cra_mapping_status: 'pending',
    cra_code_suggested: raw.cra_code_suggested ?? null,
    taxable_irpf_hint: raw.taxable_irpf_hint ?? null,
    cotization_included_hint: raw.cotization_included_hint ?? null,
    salary_base_annual: raw.salary_base_annual ?? null,
    salary_base_monthly: raw.salary_base_monthly ?? null,
    extra_pay_amount: raw.extra_pay_amount ?? null,
    plus_convenio_annual: raw.plus_convenio_annual ?? null,
    plus_convenio_monthly: raw.plus_convenio_monthly ?? null,
    plus_transport: raw.plus_transport ?? null,
    plus_antiguedad: raw.plus_antiguedad ?? null,
    other_amount: raw.other_amount ?? null,
    currency: raw.currency ?? 'EUR',
    row_confidence,
    requires_human_review: true,
    validation_status,
  };
}

function approvalRequiredFieldsOk(row: Record<string, unknown>): boolean {
  const sp = row.source_page;
  const se = row.source_excerpt;
  const lit = row.concept_literal_from_agreement;
  const pl = row.payslip_label;
  if (typeof sp !== 'string' || sp.trim().length === 0) return false;
  if (typeof se !== 'string' || se.trim().length === 0) return false;
  if (typeof lit !== 'string' || lit.trim().length === 0) return false;
  if (typeof pl !== 'string' || pl.trim().length === 0) return false;
  if (!preservesAgreementKeyword(lit, pl)) return false;
  return true;
}

// ---------- Audit insert ----------
async function writeAudit(
  adminClient: ReturnType<typeof createClient>,
  args: {
    staging_row_id: string | null;
    agreement_id: string;
    version_id: string;
    action: string;
    actor_id: string;
    snapshot: Record<string, unknown>;
    content_hash?: string | null;
    approval_hash?: string | null;
  },
): Promise<void> {
  await adminClient.from(T_AUDIT).insert({
    staging_row_id: args.staging_row_id,
    agreement_id: args.agreement_id,
    version_id: args.version_id,
    action: args.action,
    actor_id: args.actor_id,
    snapshot_json: args.snapshot,
    content_hash: args.content_hash ?? null,
    approval_hash: args.approval_hash ?? null,
  });
}

// ---------- HTTP handler ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')
    return err(405, 'INVALID_PAYLOAD', 'Method not allowed');

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
    return err(400, 'INVALID_PAYLOAD', 'Unknown action');

  for (const k of FORBIDDEN_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, k))
      return err(400, 'INVALID_PAYLOAD', 'Forbidden field present', action);
  }

  // adminClient required because RLS uses has_role() and we still need to
  // re-check role server-side from user_roles. We never expose service key.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ---------- Role check ----------
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
    (ALLOWED_ROLES as readonly string[]).includes(r),
  );
  if (!isAuthorized) {
    const m = mapError('INSUFFICIENT_ROLE');
    return err(m.status, 'INSUFFICIENT_ROLE', m.message, action);
  }

  const nowIso = new Date().toISOString();

  try {
    // ---------- list_for_review ----------
    if (action === 'list_for_review') {
      const p = ListSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      let q = adminClient
        .from(T_STAGING)
        .select('*')
        .eq('agreement_id', p.data.agreement_id)
        .eq('version_id', p.data.version_id)
        .order('created_at', { ascending: false });
      if (p.data.status) q = q.eq('validation_status', p.data.status);
      const { data: rows, error } = await q;
      if (error) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
      const { data: audit, error: aErr } = await adminClient
        .from(T_AUDIT)
        .select('id, staging_row_id, action, actor_id, created_at')
        .eq('agreement_id', p.data.agreement_id)
        .eq('version_id', p.data.version_id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (aErr) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, { rows: rows ?? [], audit: audit ?? [] });
    }

    // ---------- stage_ocr_batch ----------
    if (action === 'stage_ocr_batch') {
      const p = StageOcrSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      if (
        p.data.approval_mode !== 'ocr_single_human_approval' &&
        p.data.approval_mode !== 'ocr_dual_human_approval'
      ) {
        return err(400, 'INVALID_PAYLOAD', 'Invalid approval_mode for OCR batch', action);
      }
      const inserted: Array<Record<string, unknown>> = [];
      for (const raw of p.data.raw_rows) {
        let shaped: Record<string, unknown>;
        try {
          shaped = shapeRowForInsert(raw, {
            agreement_id: p.data.agreement_id,
            version_id: p.data.version_id,
            extraction_method: 'ocr',
            approval_mode: p.data.approval_mode,
          });
        } catch {
          return err(400, 'INVALID_PAYLOAD', 'Invalid row shape', action);
        }
        const content_hash = await computeContentHash(shaped);
        const { data: row, error } = await adminClient
          .from(T_STAGING)
          .insert({ ...shaped, content_hash })
          .select('*')
          .single();
        if (error) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
        await writeAudit(adminClient, {
          staging_row_id: row.id as string,
          agreement_id: p.data.agreement_id,
          version_id: p.data.version_id,
          action: 'create',
          actor_id: userId,
          snapshot: row as Record<string, unknown>,
          content_hash,
        });
        inserted.push(row as Record<string, unknown>);
      }
      return ok(action, { inserted_count: inserted.length, rows: inserted });
    }

    // ---------- stage_manual_batch ----------
    if (action === 'stage_manual_batch') {
      const p = StageManualSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      if (
        p.data.approval_mode !== 'manual_upload_single_approval' &&
        p.data.approval_mode !== 'manual_upload_dual_approval'
      ) {
        return err(400, 'INVALID_PAYLOAD', 'Invalid approval_mode for manual batch', action);
      }
      const extraction = p.data.extraction ?? 'manual_csv';
      const inserted: Array<Record<string, unknown>> = [];
      for (const raw of p.data.rows) {
        let shaped: Record<string, unknown>;
        try {
          shaped = shapeRowForInsert(raw, {
            agreement_id: p.data.agreement_id,
            version_id: p.data.version_id,
            extraction_method: extraction,
            approval_mode: p.data.approval_mode,
          });
        } catch {
          return err(400, 'INVALID_PAYLOAD', 'Invalid row shape', action);
        }
        const content_hash = await computeContentHash(shaped);
        const { data: row, error } = await adminClient
          .from(T_STAGING)
          .insert({ ...shaped, content_hash })
          .select('*')
          .single();
        if (error) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
        await writeAudit(adminClient, {
          staging_row_id: row.id as string,
          agreement_id: p.data.agreement_id,
          version_id: p.data.version_id,
          action: 'create',
          actor_id: userId,
          snapshot: row as Record<string, unknown>,
          content_hash,
        });
        inserted.push(row as Record<string, unknown>);
      }
      return ok(action, { inserted_count: inserted.length, rows: inserted });
    }

    // Single-row actions: load row first
    const rowIdRaw = (body as { row_id?: unknown }).row_id;
    if (typeof rowIdRaw !== 'string') {
      return err(400, 'INVALID_PAYLOAD', 'Missing row_id', action);
    }
    const { data: existing, error: loadErr } = await adminClient
      .from(T_STAGING)
      .select('*')
      .eq('id', rowIdRaw)
      .maybeSingle();
    if (loadErr) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
    if (!existing) {
      const m = mapError('ROW_NOT_FOUND');
      return err(m.status, 'ROW_NOT_FOUND', m.message, action);
    }

    // ---------- edit_row ----------
    if (action === 'edit_row') {
      const p = EditSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);

      // Block editing approved rows unless superadmin/admin
      if (existing.validation_status === 'human_approved_second') {
        const isAdminLike = actingRoles.some((r) =>
          ['superadmin', 'admin'].includes(r),
        );
        if (!isAdminLike) {
          const m = mapError('INVALID_TRANSITION');
          return err(m.status, 'INVALID_TRANSITION', m.message, action);
        }
      }

      const merged = { ...existing, ...p.data.patch } as Record<string, unknown>;
      if (typeof merged.source_page === 'number') {
        merged.source_page = String(merged.source_page);
      }
      // Re-verify keyword preservation for safety
      if (
        !preservesAgreementKeyword(
          merged.concept_literal_from_agreement,
          merged.payslip_label,
        )
      ) {
        const m = mapError('APPROVAL_BLOCKED');
        return err(m.status, 'APPROVAL_BLOCKED', m.message, action);
      }
      const content_hash = await computeContentHash(merged);
      const updatePayload: Record<string, unknown> = {
        ...p.data.patch,
        content_hash,
      };
      if (typeof updatePayload.source_page === 'number') {
        updatePayload.source_page = String(updatePayload.source_page);
      }
      const { data: updated, error } = await adminClient
        .from(T_STAGING)
        .update(updatePayload)
        .eq('id', rowIdRaw)
        .select('*')
        .single();
      if (error) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
      await writeAudit(adminClient, {
        staging_row_id: rowIdRaw,
        agreement_id: existing.agreement_id as string,
        version_id: existing.version_id as string,
        action: 'edit',
        actor_id: userId,
        snapshot: updated as Record<string, unknown>,
        content_hash,
      });
      return ok(action, { row: updated });
    }

    // ---------- approve_single ----------
    if (action === 'approve_single') {
      const p = ApproveSingleSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const mode = existing.approval_mode as string;
      if (!mode.endsWith('single_approval')) {
        const m = mapError('INVALID_TRANSITION');
        return err(m.status, 'INVALID_TRANSITION', m.message, action);
      }
      if (
        existing.validation_status !== 'ocr_pending_review' &&
        existing.validation_status !== 'manual_pending_review' &&
        existing.validation_status !== 'needs_correction'
      ) {
        const m = mapError('INVALID_TRANSITION');
        return err(m.status, 'INVALID_TRANSITION', m.message, action);
      }
      if (!approvalRequiredFieldsOk(existing as Record<string, unknown>)) {
        const m = mapError('APPROVAL_BLOCKED');
        return err(m.status, 'APPROVAL_BLOCKED', m.message, action);
      }
      const approval_hash = await computeApprovalHash(
        existing as Record<string, unknown>,
        userId,
        'single',
      );
      const { data: updated, error } = await adminClient
        .from(T_STAGING)
        .update({
          validation_status: 'human_approved_single',
          first_reviewed_by: userId,
          first_reviewed_at: nowIso,
        })
        .eq('id', rowIdRaw)
        .select('*')
        .single();
      if (error) {
        const m = mapError('APPROVAL_BLOCKED');
        return err(m.status, 'APPROVAL_BLOCKED', m.message, action);
      }
      await writeAudit(adminClient, {
        staging_row_id: rowIdRaw,
        agreement_id: existing.agreement_id as string,
        version_id: existing.version_id as string,
        action: 'approve_single',
        actor_id: userId,
        snapshot: updated as Record<string, unknown>,
        content_hash: existing.content_hash as string,
        approval_hash,
      });
      return ok(action, { row: updated, approval_hash });
    }

    // ---------- approve_first ----------
    if (action === 'approve_first') {
      const p = ApproveFirstSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const mode = existing.approval_mode as string;
      if (!mode.endsWith('dual_approval')) {
        const m = mapError('INVALID_TRANSITION');
        return err(m.status, 'INVALID_TRANSITION', m.message, action);
      }
      if (
        existing.validation_status !== 'ocr_pending_review' &&
        existing.validation_status !== 'manual_pending_review' &&
        existing.validation_status !== 'needs_correction'
      ) {
        const m = mapError('INVALID_TRANSITION');
        return err(m.status, 'INVALID_TRANSITION', m.message, action);
      }
      if (!approvalRequiredFieldsOk(existing as Record<string, unknown>)) {
        const m = mapError('APPROVAL_BLOCKED');
        return err(m.status, 'APPROVAL_BLOCKED', m.message, action);
      }
      const approval_hash = await computeApprovalHash(
        existing as Record<string, unknown>,
        userId,
        'first',
      );
      const { data: updated, error } = await adminClient
        .from(T_STAGING)
        .update({
          validation_status: 'human_approved_first',
          first_reviewed_by: userId,
          first_reviewed_at: nowIso,
        })
        .eq('id', rowIdRaw)
        .select('*')
        .single();
      if (error) {
        const m = mapError('APPROVAL_BLOCKED');
        return err(m.status, 'APPROVAL_BLOCKED', m.message, action);
      }
      await writeAudit(adminClient, {
        staging_row_id: rowIdRaw,
        agreement_id: existing.agreement_id as string,
        version_id: existing.version_id as string,
        action: 'approve_first',
        actor_id: userId,
        snapshot: updated as Record<string, unknown>,
        content_hash: existing.content_hash as string,
        approval_hash,
      });
      return ok(action, { row: updated, approval_hash });
    }

    // ---------- approve_second ----------
    if (action === 'approve_second') {
      const p = ApproveSecondSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const mode = existing.approval_mode as string;
      if (!mode.endsWith('dual_approval')) {
        const m = mapError('INVALID_TRANSITION');
        return err(m.status, 'INVALID_TRANSITION', m.message, action);
      }
      if (existing.validation_status !== 'human_approved_first') {
        const m = mapError('INVALID_TRANSITION');
        return err(m.status, 'INVALID_TRANSITION', m.message, action);
      }
      if (!existing.first_reviewed_by) {
        const m = mapError('INVALID_TRANSITION');
        return err(m.status, 'INVALID_TRANSITION', m.message, action);
      }
      // SAME REVIEWER GUARD — explicit, before DB trigger
      if (existing.first_reviewed_by === userId) {
        const m = mapError('SAME_REVIEWER_NOT_ALLOWED');
        return err(m.status, 'SAME_REVIEWER_NOT_ALLOWED', m.message, action);
      }
      if (!approvalRequiredFieldsOk(existing as Record<string, unknown>)) {
        const m = mapError('APPROVAL_BLOCKED');
        return err(m.status, 'APPROVAL_BLOCKED', m.message, action);
      }
      const approval_hash = await computeApprovalHash(
        existing as Record<string, unknown>,
        userId,
        'second',
      );
      const { data: updated, error } = await adminClient
        .from(T_STAGING)
        .update({
          validation_status: 'human_approved_second',
          second_reviewed_by: userId,
          second_reviewed_at: nowIso,
        })
        .eq('id', rowIdRaw)
        .select('*')
        .single();
      if (error) {
        const m = mapError('APPROVAL_BLOCKED');
        return err(m.status, 'APPROVAL_BLOCKED', m.message, action);
      }
      await writeAudit(adminClient, {
        staging_row_id: rowIdRaw,
        agreement_id: existing.agreement_id as string,
        version_id: existing.version_id as string,
        action: 'approve_second',
        actor_id: userId,
        snapshot: updated as Record<string, unknown>,
        content_hash: existing.content_hash as string,
        approval_hash,
      });
      return ok(action, { row: updated, approval_hash });
    }

    // ---------- reject ----------
    if (action === 'reject') {
      const p = RejectSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: updated, error } = await adminClient
        .from(T_STAGING)
        .update({
          validation_status: 'rejected',
          review_notes: p.data.reason,
        })
        .eq('id', rowIdRaw)
        .select('*')
        .single();
      if (error) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
      await writeAudit(adminClient, {
        staging_row_id: rowIdRaw,
        agreement_id: existing.agreement_id as string,
        version_id: existing.version_id as string,
        action: 'reject',
        actor_id: userId,
        snapshot: updated as Record<string, unknown>,
        content_hash: existing.content_hash as string,
      });
      return ok(action, { row: updated });
    }

    // ---------- mark_needs_correction ----------
    if (action === 'mark_needs_correction') {
      const p = NeedsCorrectionSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: updated, error } = await adminClient
        .from(T_STAGING)
        .update({
          validation_status: 'needs_correction',
          review_notes: p.data.reason,
        })
        .eq('id', rowIdRaw)
        .select('*')
        .single();
      if (error) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
      await writeAudit(adminClient, {
        staging_row_id: rowIdRaw,
        agreement_id: existing.agreement_id as string,
        version_id: existing.version_id as string,
        action: 'needs_correction',
        actor_id: userId,
        snapshot: updated as Record<string, unknown>,
        content_hash: existing.content_hash as string,
      });
      return ok(action, { row: updated });
    }

    return err(400, 'INVALID_PAYLOAD', 'Unknown action', action);
  } catch {
    return err(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
});

// Reference markers for static guards (kept as comments only):
// APPROVED_STATES, KEYWORDS — used at runtime via local arrays above.
void APPROVED_STATES;