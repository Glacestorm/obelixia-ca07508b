/**
 * B13.2 — Legal Document Intake Queue Edge Function.
 *
 * HARD SAFETY:
 *  - verify_jwt = true (config.toml).
 *  - Server-side role-check: superadmin / admin / legal_manager
 *    / hr_manager / payroll_supervisor only.
 *  - SUPABASE_SERVICE_ROLE_KEY only read from Deno.env, never returned.
 *  - Forbidden payload keys are rejected (cannot smuggle activation flags,
 *    pilot flags, allow-list, or runtime-setting tokens).
 *  - Operates ONLY on:
 *      * erp_hr_collective_agreement_document_intake (own table)
 *      * erp_hr_collective_agreement_source_watch_queue (read-only, B13.1)
 *      * user_roles (role check)
 *  - NEVER touches:
 *      * erp_hr_collective_agreements (operative legacy table)
 *      * salary_tables_loaded / ready_for_payroll / data_completeness
 *      * pilot allow-list flags
 *      * payroll bridge / payroll engine / payslip engine /
 *        salaryNormalizer / agreementSalaryResolver
 *  - `promote_to_extraction` ONLY flips status to 'ready_for_extraction'.
 *    It does NOT trigger OCR, does NOT extract, does NOT write staging.
 *  - `dismiss` does NOT physically delete rows.
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
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
  'HR_REGISTRY_PILOT_MODE',
  'REGISTRY_PILOT_SCOPE_ALLOWLIST',
  'use_registry_for_payroll',
  'activation_run_id',
  'runtime_setting',
  'payroll',
  'payslip',
  'service_role',
] as const;

const T_INTAKE = 'erp_hr_collective_agreement_document_intake';
const T_WATCH = 'erp_hr_collective_agreement_source_watch_queue';

const SOURCE_TYPES = [
  'boe',
  'regcon',
  'boletin_autonomico',
  'bop_provincial',
  'manual_official_url',
  'other_official',
] as const;

const STATUSES = [
  'pending_review',
  'claimed_for_review',
  'classified',
  'duplicate',
  'blocked',
  'ready_for_extraction',
  'dismissed',
] as const;

const CLASSIFICATIONS = [
  'new_agreement',
  'salary_revision',
  'errata',
  'paritaria_act',
  'scope_clarification',
  'unknown',
] as const;

const uuid = z.string().uuid();

const ListSchema = z
  .object({
    action: z.literal('list'),
    status: z.enum(STATUSES).optional(),
    source_type: z.enum(SOURCE_TYPES).optional(),
    classification: z.enum(CLASSIFICATIONS).optional(),
    candidate_registry_agreement_id: uuid.optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    text: z.string().min(1).max(200).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .strict();

const CreateFromWatchSchema = z
  .object({
    action: z.literal('create_from_watch_hit'),
    watch_queue_id: uuid,
    source_type: z.enum(SOURCE_TYPES),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const ClaimSchema = z
  .object({
    action: z.literal('claim_for_review'),
    id: uuid,
  })
  .strict();

const ClassifySchema = z
  .object({
    action: z.literal('classify'),
    id: uuid,
    classification: z.enum(CLASSIFICATIONS),
    candidate_registry_agreement_id: uuid.nullish(),
    candidate_registry_version_id: uuid.nullish(),
    notes: z.string().max(2000).nullish(),
  })
  .strict();

const MarkDuplicateSchema = z
  .object({
    action: z.literal('mark_duplicate'),
    id: uuid,
    duplicate_of: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

const MarkBlockedSchema = z
  .object({
    action: z.literal('mark_blocked'),
    id: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

const PromoteSchema = z
  .object({
    action: z.literal('promote_to_extraction'),
    id: uuid,
  })
  .strict();

const DismissSchema = z
  .object({
    action: z.literal('dismiss'),
    id: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

const KNOWN_ACTIONS = [
  'list',
  'create_from_watch_hit',
  'claim_for_review',
  'classify',
  'mark_duplicate',
  'mark_blocked',
  'promote_to_extraction',
  'dismiss',
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
function mapError(
  status: number,
  code: string,
  message: string,
  action: string | null = null,
): Response {
  // Sanitized error envelope. Never returns raw error.message or stack.
  return jsonResponse(status, {
    success: false,
    error: { code, message },
    meta: { timestamp: new Date().toISOString(), action: action ?? 'unknown' },
  });
}

function appendNote(prev: string | null, addition: string): string {
  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${addition}`;
  return prev && prev.length > 0 ? `${prev}\n${line}` : line;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')
    return mapError(405, 'INVALID_PAYLOAD', 'Method not allowed');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return mapError(401, 'UNAUTHORIZED', 'Unauthorized');
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return mapError(401, 'UNAUTHORIZED', 'Missing token');

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY)
    return mapError(500, 'INTERNAL_ERROR', 'Server misconfigured');

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  let userId: string;
  try {
    const { data, error } = await userClient.auth.getClaims(token);
    if (error || !data?.claims?.sub) return mapError(401, 'UNAUTHORIZED', 'Invalid token');
    userId = data.claims.sub as string;
  } catch {
    return mapError(401, 'UNAUTHORIZED', 'Invalid token');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return mapError(400, 'INVALID_PAYLOAD', 'Invalid JSON');
  }
  if (!body || typeof body !== 'object')
    return mapError(400, 'INVALID_PAYLOAD', 'Body must be object');

  const action = (body as { action?: unknown }).action;
  if (typeof action !== 'string' || !(KNOWN_ACTIONS as readonly string[]).includes(action))
    return mapError(400, 'INVALID_PAYLOAD', 'Unknown action');

  for (const k of FORBIDDEN_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, k))
      return mapError(400, 'INVALID_PAYLOAD', 'Forbidden field present', action);
  }

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
    if (error) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
    actingRoles = (data ?? []).map((r: { role: string }) => r.role);
  } catch {
    return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
  const isAuthorized = actingRoles.some((r) =>
    (ALLOWED_ROLES as readonly string[]).includes(r),
  );
  if (!isAuthorized) {
    return mapError(403, 'INSUFFICIENT_ROLE', 'Not authorized', action);
  }

  const nowIso = new Date().toISOString();

  try {
    // ---------- list ----------
    if (action === 'list') {
      const p = ListSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      let q = adminClient
        .from(T_INTAKE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(p.data.limit ?? 200);
      if (p.data.status) q = q.eq('status', p.data.status);
      if (p.data.source_type) q = q.eq('source_type', p.data.source_type);
      if (p.data.classification) q = q.eq('classification', p.data.classification);
      if (p.data.candidate_registry_agreement_id)
        q = q.eq('candidate_registry_agreement_id', p.data.candidate_registry_agreement_id);
      if (p.data.date_from) q = q.gte('publication_date', p.data.date_from);
      if (p.data.date_to) q = q.lte('publication_date', p.data.date_to);
      if (p.data.text)
        q = q.or(
          `detected_agreement_name.ilike.%${p.data.text}%,detected_regcon.ilike.%${p.data.text}%`,
        );
      const { data, error } = await q;
      if (error) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, { items: data ?? [] });
    }

    // ---------- create_from_watch_hit ----------
    if (action === 'create_from_watch_hit') {
      const p = CreateFromWatchSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: hit, error: hErr } = await adminClient
        .from(T_WATCH)
        .select(
          'id, source, source_url, document_url, jurisdiction, publication_date, document_hash, detected_agreement_name, detected_regcon, detected_cnae, confidence',
        )
        .eq('id', p.data.watch_queue_id)
        .maybeSingle();
      if (hErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!hit) return mapError(404, 'ROW_NOT_FOUND', 'Watch hit not found', action);

      const insertRow: Record<string, unknown> = {
        watch_queue_id: hit.id,
        source_type: p.data.source_type,
        source_url: hit.source_url,
        document_url: hit.document_url ?? null,
        jurisdiction: hit.jurisdiction ?? null,
        publication_date: hit.publication_date ?? null,
        document_hash: hit.document_hash ?? null,
        detected_agreement_name: hit.detected_agreement_name ?? null,
        detected_regcon: hit.detected_regcon ?? null,
        detected_cnae: hit.detected_cnae ?? null,
        confidence:
          hit.confidence !== null && hit.confidence !== undefined
            ? Math.round(Number(hit.confidence) * 10000) / 100 // 0..1 -> 0..100
            : null,
        notes: p.data.notes ?? null,
        status: 'pending_review',
      };

      const { data: inserted, error: insErr } = await adminClient
        .from(T_INTAKE)
        .insert(insertRow)
        .select('id, status, document_hash, source_type, created_at, duplicate_of')
        .single();
      if (insErr) {
        if ((insErr as { code?: string }).code === '23505') {
          return ok(action, { duplicate_race: true });
        }
        return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      }
      return ok(action, { item: inserted });
    }

    // ---------- claim_for_review ----------
    if (action === 'claim_for_review') {
      const p = ClaimSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: existing, error: selErr } = await adminClient
        .from(T_INTAKE)
        .select('id, status')
        .eq('id', p.data.id)
        .maybeSingle();
      if (selErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!existing) return mapError(404, 'ROW_NOT_FOUND', 'Intake not found', action);
      if (existing.status !== 'pending_review')
        return mapError(409, 'INVALID_TRANSITION', 'Only pending_review can be claimed', action);
      const { error: updErr } = await adminClient
        .from(T_INTAKE)
        .update({
          status: 'claimed_for_review',
          human_reviewer: userId,
          claimed_at: nowIso,
        })
        .eq('id', p.data.id);
      if (updErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, { id: p.data.id, status: 'claimed_for_review' });
    }

    // ---------- classify ----------
    if (action === 'classify') {
      const p = ClassifySchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      if (
        p.data.classification === 'salary_revision' &&
        !p.data.candidate_registry_agreement_id
      ) {
        return mapError(
          400,
          'MISSING_CANDIDATE_AGREEMENT',
          'salary_revision requires candidate_registry_agreement_id',
          action,
        );
      }
      const { data: existing, error: selErr } = await adminClient
        .from(T_INTAKE)
        .select('id, status, notes')
        .eq('id', p.data.id)
        .maybeSingle();
      if (selErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!existing) return mapError(404, 'ROW_NOT_FOUND', 'Intake not found', action);
      if (!['pending_review', 'claimed_for_review'].includes(existing.status))
        return mapError(409, 'INVALID_TRANSITION', 'Cannot classify in current status', action);

      const update: Record<string, unknown> = {
        status: 'classified',
        classification: p.data.classification,
        classified_by: userId,
        classified_at: nowIso,
      };
      if (p.data.candidate_registry_agreement_id !== undefined)
        update.candidate_registry_agreement_id = p.data.candidate_registry_agreement_id ?? null;
      if (p.data.candidate_registry_version_id !== undefined)
        update.candidate_registry_version_id = p.data.candidate_registry_version_id ?? null;
      if (p.data.notes)
        update.notes = appendNote(existing.notes ?? null, `classify: ${p.data.notes}`);

      const { error: updErr } = await adminClient
        .from(T_INTAKE)
        .update(update)
        .eq('id', p.data.id);
      if (updErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, {
        id: p.data.id,
        status: 'classified',
        classification: p.data.classification,
      });
    }

    // ---------- mark_duplicate ----------
    if (action === 'mark_duplicate') {
      const p = MarkDuplicateSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      if (p.data.id === p.data.duplicate_of)
        return mapError(400, 'INVALID_PAYLOAD', 'Cannot duplicate-of self', action);
      const { data: existing, error: selErr } = await adminClient
        .from(T_INTAKE)
        .select('id, status, notes')
        .eq('id', p.data.id)
        .maybeSingle();
      if (selErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!existing) return mapError(404, 'ROW_NOT_FOUND', 'Intake not found', action);
      const { data: target, error: tErr } = await adminClient
        .from(T_INTAKE)
        .select('id')
        .eq('id', p.data.duplicate_of)
        .maybeSingle();
      if (tErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!target) return mapError(404, 'ROW_NOT_FOUND', 'duplicate_of target not found', action);
      const { error: updErr } = await adminClient
        .from(T_INTAKE)
        .update({
          status: 'duplicate',
          duplicate_of: p.data.duplicate_of,
          notes: appendNote(existing.notes ?? null, `duplicate: ${p.data.reason}`),
        })
        .eq('id', p.data.id);
      if (updErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, { id: p.data.id, status: 'duplicate' });
    }

    // ---------- mark_blocked ----------
    if (action === 'mark_blocked') {
      const p = MarkBlockedSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: existing, error: selErr } = await adminClient
        .from(T_INTAKE)
        .select('id, status')
        .eq('id', p.data.id)
        .maybeSingle();
      if (selErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!existing) return mapError(404, 'ROW_NOT_FOUND', 'Intake not found', action);
      const { error: updErr } = await adminClient
        .from(T_INTAKE)
        .update({
          status: 'blocked',
          blocked_by: userId,
          blocked_at: nowIso,
          block_reason: p.data.reason,
        })
        .eq('id', p.data.id);
      if (updErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, { id: p.data.id, status: 'blocked' });
    }

    // ---------- promote_to_extraction ----------
    // SAFETY: only changes status. Does NOT trigger OCR / extraction / staging.
    if (action === 'promote_to_extraction') {
      const p = PromoteSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: existing, error: selErr } = await adminClient
        .from(T_INTAKE)
        .select(
          'id, status, classification, source_url, document_url, document_hash, notes',
        )
        .eq('id', p.data.id)
        .maybeSingle();
      if (selErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!existing) return mapError(404, 'ROW_NOT_FOUND', 'Intake not found', action);
      if (existing.status !== 'classified')
        return mapError(409, 'INVALID_TRANSITION', 'Only classified can be promoted', action);
      if (
        !existing.classification ||
        ![
          'new_agreement',
          'salary_revision',
          'errata',
          'paritaria_act',
          'scope_clarification',
        ].includes(existing.classification)
      ) {
        return mapError(
          409,
          'INVALID_CLASSIFICATION',
          'Classification not eligible for extraction',
          action,
        );
      }
      if (!existing.source_url && !existing.document_url) {
        return mapError(409, 'MISSING_SOURCE', 'A source_url or document_url is required', action);
      }
      if (!existing.document_hash) {
        const hasHashNote =
          (existing.notes ?? '').toLowerCase().includes('document_hash') ||
          (existing.notes ?? '').toLowerCase().includes('no hash');
        if (!hasHashNote) {
          return mapError(
            409,
            'MISSING_DOCUMENT_HASH',
            'document_hash required, or document its absence in notes',
            action,
          );
        }
      }
      const { error: updErr } = await adminClient
        .from(T_INTAKE)
        .update({ status: 'ready_for_extraction' })
        .eq('id', p.data.id);
      if (updErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, {
        id: p.data.id,
        status: 'ready_for_extraction',
        note: 'Status only. B13.3 extraction pipeline NOT executed.',
      });
    }

    // ---------- dismiss ----------
    // SAFETY: never deletes rows.
    if (action === 'dismiss') {
      const p = DismissSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: existing, error: selErr } = await adminClient
        .from(T_INTAKE)
        .select('id, status, notes')
        .eq('id', p.data.id)
        .maybeSingle();
      if (selErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!existing) return mapError(404, 'ROW_NOT_FOUND', 'Intake not found', action);
      if (existing.status === 'dismissed')
        return mapError(409, 'ALREADY_DISMISSED', 'Already dismissed', action);
      const { error: updErr } = await adminClient
        .from(T_INTAKE)
        .update({
          status: 'dismissed',
          notes: appendNote(existing.notes ?? null, `dismiss: ${p.data.reason}`),
        })
        .eq('id', p.data.id);
      if (updErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, { id: p.data.id, status: 'dismissed' });
    }

    return mapError(400, 'INVALID_PAYLOAD', 'Unknown action', action);
  } catch {
    return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
});