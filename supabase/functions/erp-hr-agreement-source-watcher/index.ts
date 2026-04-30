/**
 * B13.1 — Collective Agreement Source Watcher Edge Function.
 *
 * HARD SAFETY:
 *  - verify_jwt = true (config.toml).
 *  - Server-side role-check: superadmin / admin / legal_manager
 *    / hr_manager / payroll_supervisor only.
 *  - SUPABASE_SERVICE_ROLE_KEY only read from Deno.env, never returned.
 *  - Forbidden payload keys are rejected (cannot smuggle activation flags).
 *  - Operates ONLY on `erp_hr_collective_agreement_source_watch_queue`.
 *  - NEVER touches:
 *      * erp_hr_collective_agreements (operative table)
 *      * salary_tables_loaded / ready_for_payroll / data_completeness
 *      * pilot allow-list flags
 *      * payroll bridge / payroll engine / payslip engine / normalizer / resolver
 *  - `scan_now` is a SAFE STUB until B13.1.x adds real BOE/REGCON adapters.
 *    It returns WATCHER_ADAPTERS_PENDING and writes nothing.
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
  'discovered_at',
  'dismissed_by',
  'dismissed_at',
] as const;

const T_QUEUE = 'erp_hr_collective_agreement_source_watch_queue';

const SOURCES = [
  'BOE','REGCON','BOIB','BOCM','DOGC','DOGV','BOJA','BOPV','DOG','BOC','BOR','BON','BOPA','BOCYL','DOE','DOCM','BOP','MANUAL','OTHER',
] as const;

const STATUSES = [
  'pending_intake',
  'duplicate_candidate',
  'official_source_found',
  'needs_human_classification',
  'blocked_no_source',
  'dismissed',
] as const;

const uuid = z.string().uuid();

const ScanNowSchema = z.object({ action: z.literal('scan_now') }).strict();

const ListHitsSchema = z
  .object({
    action: z.literal('list_hits'),
    status: z.enum(STATUSES).optional(),
    source: z.enum(SOURCES).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .strict();

const DismissHitSchema = z
  .object({
    action: z.literal('dismiss_hit'),
    hit_id: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

const AddManualSourceSchema = z
  .object({
    action: z.literal('add_manual_source'),
    source: z.enum(SOURCES),
    source_url: z.string().url().max(2000),
    document_url: z.string().url().max(2000).nullish(),
    jurisdiction: z.string().max(64).nullish(),
    publication_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    document_hash: z.string().regex(/^[0-9a-f]{64}$/).nullish(),
    detected_agreement_name: z.string().max(500).nullish(),
    detected_regcon: z.string().max(64).nullish(),
    detected_cnae: z.array(z.string().max(16)).max(20).nullish(),
    confidence: z.number().min(0).max(1).nullish(),
    notes: z.string().max(4000).nullish(),
  })
  .strict();

const KNOWN_ACTIONS = [
  'scan_now',
  'list_hits',
  'dismiss_hit',
  'add_manual_source',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')
    return err(405, 'INVALID_PAYLOAD', 'Method not allowed');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return err(401, 'UNAUTHORIZED', 'Unauthorized');
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
    return err(403, 'INSUFFICIENT_ROLE', 'Not authorized', action);
  }

  const nowIso = new Date().toISOString();

  try {
    // ---------- scan_now (SAFE STUB) ----------
    if (action === 'scan_now') {
      const p = ScanNowSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      // Real BOE/REGCON/BOIB/BOP adapters are NOT wired yet.
      // This stub MUST NOT insert any rows, MUST NOT touch any other table,
      // MUST NOT activate anything.
      return ok(action, {
        scanned: 0,
        inserted: 0,
        duplicates: 0,
        adapters_status: 'WATCHER_ADAPTERS_PENDING',
        note:
          'Source adapters (BOE/REGCON/BOIB/BOPs) are not yet wired. ' +
          'Use add_manual_source to enqueue documents until B13.1.x ships adapters.',
        timestamp: nowIso,
      });
    }

    // ---------- list_hits ----------
    if (action === 'list_hits') {
      const p = ListHitsSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      let q = adminClient
        .from(T_QUEUE)
        .select('*')
        .order('discovered_at', { ascending: false })
        .limit(p.data.limit ?? 200);
      if (p.data.status) q = q.eq('status', p.data.status);
      if (p.data.source) q = q.eq('source', p.data.source);
      const { data, error } = await q;
      if (error) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, { hits: data ?? [] });
    }

    // ---------- dismiss_hit ----------
    if (action === 'dismiss_hit') {
      const p = DismissHitSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: existing, error: selErr } = await adminClient
        .from(T_QUEUE)
        .select('id, status')
        .eq('id', p.data.hit_id)
        .maybeSingle();
      if (selErr) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!existing) return err(404, 'ROW_NOT_FOUND', 'Hit not found', action);
      if (existing.status === 'dismissed')
        return err(409, 'ALREADY_DISMISSED', 'Hit already dismissed', action);
      const { error: updErr } = await adminClient
        .from(T_QUEUE)
        .update({
          status: 'dismissed',
          dismissed_by: userId,
          dismissed_at: nowIso,
          dismissed_reason: p.data.reason,
        })
        .eq('id', p.data.hit_id);
      if (updErr) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, { hit_id: p.data.hit_id, status: 'dismissed' });
    }

    // ---------- add_manual_source ----------
    if (action === 'add_manual_source') {
      const p = AddManualSourceSchema.safeParse(body);
      if (!p.success) return err(400, 'INVALID_PAYLOAD', 'Invalid payload', action);

      // Server-side dedupe by document_hash when present.
      let dedupeStatus: 'pending_intake' | 'duplicate_candidate' = 'pending_intake';
      if (p.data.document_hash) {
        const { data: dup, error: dupErr } = await adminClient
          .from(T_QUEUE)
          .select('id')
          .eq('document_hash', p.data.document_hash)
          .limit(1)
          .maybeSingle();
        if (dupErr) return err(500, 'INTERNAL_ERROR', 'Internal error', action);
        if (dup) dedupeStatus = 'duplicate_candidate';
      }

      const baseRow: Record<string, unknown> = {
        source: p.data.source,
        source_url: p.data.source_url,
        document_url: p.data.document_url ?? null,
        jurisdiction: p.data.jurisdiction ?? null,
        publication_date: p.data.publication_date ?? null,
        document_hash: p.data.document_hash ?? null,
        detected_agreement_name: p.data.detected_agreement_name ?? null,
        detected_regcon: p.data.detected_regcon ?? null,
        detected_cnae: p.data.detected_cnae ?? null,
        confidence: p.data.confidence ?? null,
        notes: p.data.notes ?? null,
        status: dedupeStatus,
      };

      // If dedupe says duplicate_candidate, do NOT insert a duplicate hash row
      // (would violate the unique partial index). Insert without hash and tag.
      const insertRow =
        dedupeStatus === 'duplicate_candidate'
          ? { ...baseRow, document_hash: null }
          : baseRow;

      const { data: inserted, error: insErr } = await adminClient
        .from(T_QUEUE)
        .insert(insertRow)
        .select('id, status, document_hash, source, discovered_at')
        .single();
      if (insErr) {
        // Race-condition: another insert won the unique index.
        if ((insErr as { code?: string }).code === '23505') {
          return ok(action, { duplicate_race: true });
        }
        return err(500, 'INTERNAL_ERROR', 'Internal error', action);
      }
      return ok(action, { hit: inserted });
    }

    return err(400, 'INVALID_PAYLOAD', 'Unknown action', action);
  } catch {
    return err(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
});