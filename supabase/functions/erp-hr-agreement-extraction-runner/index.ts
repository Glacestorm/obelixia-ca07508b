/**
 * B13.3A — Extraction Runner Edge Function for Curated Collective Agreements.
 *
 * HARD SAFETY:
 *  - verify_jwt = true (config.toml).
 *  - Roles allowed: superadmin / admin / legal_manager / hr_manager / payroll_supervisor.
 *  - SUPABASE_SERVICE_ROLE_KEY only read from Deno.env, never returned.
 *  - Forbidden payload keys are rejected (no smuggling activation flags).
 *  - Operates ONLY on:
 *      * erp_hr_collective_agreement_extraction_runs
 *      * erp_hr_collective_agreement_extraction_findings
 *      * erp_hr_collective_agreement_document_intake (read-only)
 *      * user_roles (role check)
 *  - NEVER touches:
 *      * erp_hr_collective_agreements (operative legacy)
 *      * salary_tables (real)
 *      * salary_tables_loaded / ready_for_payroll / data_completeness
 *      * pilot allow-list / runtime settings
 *      * payroll bridge / payroll engine / payslip engine /
 *        salaryNormalizer / agreementSalaryResolver
 *  - run_text_extraction uses ONLY text_content provided by the caller.
 *  - run_text_extraction does NOT call OCR.
 *  - accept_finding_to_staging is DEFERRED to B13.3B.
 *  - reject_finding does NOT delete (status flip only).
 *  - No row is ever physically deleted.
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
  'apply_to_payroll',
  'human_validated',
] as const;

const T_RUNS = 'erp_hr_collective_agreement_extraction_runs';
const T_FINDINGS = 'erp_hr_collective_agreement_extraction_findings';
const T_INTAKE = 'erp_hr_collective_agreement_document_intake';

const EXTRACTION_MODES = [
  'html_text',
  'pdf_text',
  'ocr_assisted',
  'manual_csv',
  'metadata_only',
] as const;

const RUN_STATUSES = [
  'queued',
  'running',
  'completed',
  'completed_with_warnings',
  'failed',
  'blocked',
] as const;

const FINDING_TYPES = [
  'salary_table_candidate',
  'rule_candidate',
  'concept_candidate',
  'classification_candidate',
  'metadata_candidate',
  'ocr_required',
  'manual_review_required',
] as const;

const uuid = z.string().uuid();

const ListRunsSchema = z
  .object({
    action: z.literal('list_runs'),
    intake_id: uuid.optional(),
    run_status: z.enum(RUN_STATUSES).optional(),
    extraction_mode: z.enum(EXTRACTION_MODES).optional(),
    limit: z.number().int().min(1).max(500).optional(),
    include_findings: z.boolean().optional(),
  })
  .strict();

const CreateRunSchema = z
  .object({
    action: z.literal('create_run'),
    intake_id: uuid,
    extraction_mode: z.enum(EXTRACTION_MODES),
  })
  .strict();

const RunMetadataSchema = z
  .object({
    action: z.literal('run_metadata_extraction'),
    run_id: uuid,
  })
  .strict();

const RunTextSchema = z
  .object({
    action: z.literal('run_text_extraction'),
    run_id: uuid,
    text_content: z.string().min(1).max(200000),
    source_page: z.string().max(50).optional(),
    source_article: z.string().max(120).optional(),
    source_annex: z.string().max(120).optional(),
  })
  .strict();

const MarkRunBlockedSchema = z
  .object({
    action: z.literal('mark_run_blocked'),
    run_id: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

const AcceptFindingSchema = z
  .object({
    action: z.literal('accept_finding_to_staging'),
    finding_id: uuid,
  })
  .strict();

const RejectFindingSchema = z
  .object({
    action: z.literal('reject_finding'),
    finding_id: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

const KNOWN_ACTIONS = [
  'list_runs',
  'create_run',
  'run_metadata_extraction',
  'run_text_extraction',
  'mark_run_blocked',
  'accept_finding_to_staging',
  'reject_finding',
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

// ---------------------------------------------------------------
// Inline pure helper (mirrors src/engines/erp/hr/agreementConceptLiteralExtractor.ts).
// Kept inline because edges cannot import from src/.
// ---------------------------------------------------------------
function normLit(s: string): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}
function strip(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function mapKey(literal: string): string {
  const lower = strip(String(literal ?? '').toLowerCase());
  if (!lower) return 'otros';
  if (/\btransport/.test(lower)) return 'plus_transport';
  if (/\bnocturn/.test(lower)) return 'plus_nocturnidad';
  if (/\bfestiv/.test(lower)) return 'plus_festivo';
  if (/\bantigu?edad\b|\bantig\b/.test(lower)) return 'plus_antiguedad';
  if (/\bdieta/.test(lower)) return 'dietas';
  if (/\bkilomet|\bkm\b/.test(lower)) return 'kilometraje';
  if (/\bhoras?\s+extra/.test(lower)) return 'horas_extra';
  if (/\bvacacion/.test(lower)) return 'vacaciones';
  if (/\bjornada/.test(lower)) return 'jornada';
  if (/\bincapacidad|\bit\b|\bbaja\b/.test(lower)) return 'it_complement';
  if (/\bpermiso|\blicencia\b/.test(lower)) return 'leave';
  if (/\bpreaviso/.test(lower)) return 'notice';
  if (/\bprueba\b|\bperiodo\s+de\s+prueba/.test(lower)) return 'probation';
  if (/\bpaga\s+extra|\bextra\s+de\b|\bgratificacion/.test(lower)) return 'extra_pay';
  if (/\bsalario\s+base|\bbase\s+salarial|\bsueldo\s+base/.test(lower)) return 'salary_base';
  if (/\bresponsabilidad/.test(lower)) return 'complemento_puesto';
  if (/\bpersonal\b/.test(lower)) return 'complemento_personal';
  if (/\bpuesto\b/.test(lower)) return 'complemento_puesto';
  if (/\bconvenio\b/.test(lower)) return 'plus_convenio';
  return 'otros';
}
function extractLiterals(text: string): Array<{ literal: string; key: string }> {
  const segments = String(text ?? '')
    .split(/\r?\n|;|•|\u2022|\t/g)
    .map(normLit)
    .filter((s) => s.length >= 3 && s.length <= 160);
  const KEY =
    /(transport|nocturn|festiv|antigu?edad|antig|dieta|kilomet|km|responsabilidad|convenio|salario\s+base|sueldo\s+base|paga\s+extra|extra\s+de|horas?\s+extra|vacacion|jornada|incapacidad|preaviso|prueba|permiso|licencia|complemento|plus\b|gratificacion)/i;
  const seen = new Set<string>();
  const out: Array<{ literal: string; key: string }> = [];
  for (const seg of segments) {
    if (out.length >= 200) break;
    const dec = strip(seg.toLowerCase());
    if (!KEY.test(dec)) continue;
    if (/^complemento\s+\d+$/i.test(seg)) continue;
    if (seen.has(dec)) continue;
    seen.add(dec);
    out.push({ literal: seg, key: mapKey(seg) });
  }
  return out;
}
function looksLikeSalaryTable(text: string): boolean {
  // Very conservative heuristic: presence of column-like rows with numeric tokens.
  // We do NOT parse figures here.
  const lines = String(text ?? '').split(/\r?\n/).slice(0, 4000);
  let candidates = 0;
  for (const l of lines) {
    if (/(grupo|nivel|categor[ií]a|tabla\s+salarial)/i.test(l) && /\d/.test(l)) {
      candidates++;
      if (candidates >= 2) return true;
    }
  }
  return false;
}
function looksOcrRequired(text: string): boolean {
  const t = String(text ?? '');
  const printableRatio =
    t.length === 0
      ? 0
      : (t.replace(/[\s\S]/g, (c) => (/[\p{L}\p{N}\s.,;:€%·\-/()]/u.test(c) ? c : '')).length) / t.length;
  return t.length > 200 && printableRatio < 0.6;
}

function appendJsonArray(prev: unknown, item: unknown): unknown[] {
  const arr = Array.isArray(prev) ? prev.slice() : [];
  arr.push(item);
  return arr;
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
    // ---------- list_runs ----------
    if (action === 'list_runs') {
      const p = ListRunsSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      let q = adminClient
        .from(T_RUNS)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(p.data.limit ?? 100);
      if (p.data.intake_id) q = q.eq('intake_id', p.data.intake_id);
      if (p.data.run_status) q = q.eq('run_status', p.data.run_status);
      if (p.data.extraction_mode) q = q.eq('extraction_mode', p.data.extraction_mode);
      const { data: runs, error } = await q;
      if (error) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      let findings: unknown[] = [];
      if (p.data.include_findings && runs && runs.length > 0) {
        const ids = runs.map((r: { id: string }) => r.id);
        const { data: f, error: fe } = await adminClient
          .from(T_FINDINGS)
          .select('*')
          .in('extraction_run_id', ids)
          .order('created_at', { ascending: false })
          .limit(2000);
        if (fe) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
        findings = f ?? [];
      }
      return ok(action, { runs: runs ?? [], findings });
    }

    // ---------- create_run ----------
    if (action === 'create_run') {
      const p = CreateRunSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: intake, error: iErr } = await adminClient
        .from(T_INTAKE)
        .select(
          'id, status, source_url, document_url, document_hash, candidate_registry_agreement_id, candidate_registry_version_id',
        )
        .eq('id', p.data.intake_id)
        .maybeSingle();
      if (iErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!intake) return mapError(404, 'ROW_NOT_FOUND', 'Intake not found', action);
      if (intake.status !== 'ready_for_extraction') {
        return mapError(
          409,
          'INVALID_TRANSITION',
          'Intake must be ready_for_extraction',
          action,
        );
      }
      if (!intake.source_url) {
        return mapError(400, 'MISSING_SOURCE_URL', 'Intake has no source_url', action);
      }

      const insertRow = {
        intake_id: intake.id,
        agreement_id: intake.candidate_registry_agreement_id ?? null,
        version_id: intake.candidate_registry_version_id ?? null,
        run_status: 'queued',
        extraction_mode: p.data.extraction_mode,
        source_url: intake.source_url,
        document_url: intake.document_url ?? null,
        document_hash: intake.document_hash ?? null,
        started_by: userId,
        summary_json: { created_by_action: 'create_run' },
      } as Record<string, unknown>;

      const { data: inserted, error: insErr } = await adminClient
        .from(T_RUNS)
        .insert(insertRow)
        .select('*')
        .single();
      if (insErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, { run: inserted });
    }

    // ---------- run_metadata_extraction ----------
    // Safety: NO OCR, NO salary_tables write. Only metadata + classification candidates.
    if (action === 'run_metadata_extraction') {
      const p = RunMetadataSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: run, error: rErr } = await adminClient
        .from(T_RUNS)
        .select('*')
        .eq('id', p.data.run_id)
        .maybeSingle();
      if (rErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!run) return mapError(404, 'ROW_NOT_FOUND', 'Run not found', action);
      if (!['queued', 'running'].includes(run.run_status)) {
        return mapError(409, 'INVALID_TRANSITION', 'Run not runnable', action);
      }

      const { data: intake, error: iErr } = await adminClient
        .from(T_INTAKE)
        .select('*')
        .eq('id', run.intake_id)
        .maybeSingle();
      if (iErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!intake) return mapError(404, 'ROW_NOT_FOUND', 'Intake not found', action);

      // Mark running
      await adminClient
        .from(T_RUNS)
        .update({ run_status: 'running', started_at: nowIso })
        .eq('id', run.id);

      const findings: Array<Record<string, unknown>> = [];
      const warnings: string[] = [];

      // metadata_candidate
      findings.push({
        extraction_run_id: run.id,
        intake_id: run.intake_id,
        agreement_id: run.agreement_id,
        version_id: run.version_id,
        finding_type: 'metadata_candidate',
        normalized_concept_key: null,
        payload_json: {
          source_url: intake.source_url,
          document_url: intake.document_url,
          jurisdiction: intake.jurisdiction,
          publication_date: intake.publication_date,
          detected_agreement_name: intake.detected_agreement_name,
          detected_regcon: intake.detected_regcon,
          detected_cnae: intake.detected_cnae,
        },
        confidence: 'low',
        finding_status: 'pending_review',
        requires_human_review: true,
      });

      // classification_candidate
      if (intake.classification) {
        findings.push({
          extraction_run_id: run.id,
          intake_id: run.intake_id,
          agreement_id: run.agreement_id,
          version_id: run.version_id,
          finding_type: 'classification_candidate',
          payload_json: { classification: intake.classification },
          confidence: 'low',
          finding_status: 'pending_review',
          requires_human_review: true,
        });
      } else {
        warnings.push('intake_missing_classification');
      }

      const { error: fInsErr } = await adminClient.from(T_FINDINGS).insert(findings);
      if (fInsErr) {
        await adminClient
          .from(T_RUNS)
          .update({
            run_status: 'failed',
            completed_at: nowIso,
            blockers_json: [{ code: 'findings_insert_failed', at: nowIso }],
          })
          .eq('id', run.id);
        return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      }

      const finalStatus = warnings.length > 0 ? 'completed_with_warnings' : 'completed';
      await adminClient
        .from(T_RUNS)
        .update({
          run_status: finalStatus,
          completed_at: nowIso,
          summary_json: { findings_count: findings.length },
          warnings_json: warnings.map((w) => ({ code: w, at: nowIso })),
        })
        .eq('id', run.id);

      return ok(action, {
        run_id: run.id,
        run_status: finalStatus,
        findings_count: findings.length,
      });
    }

    // ---------- run_text_extraction ----------
    // Uses ONLY caller-provided text_content. NEVER calls OCR.
    if (action === 'run_text_extraction') {
      const p = RunTextSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: run, error: rErr } = await adminClient
        .from(T_RUNS)
        .select('*')
        .eq('id', p.data.run_id)
        .maybeSingle();
      if (rErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!run) return mapError(404, 'ROW_NOT_FOUND', 'Run not found', action);
      if (!['queued', 'running'].includes(run.run_status)) {
        return mapError(409, 'INVALID_TRANSITION', 'Run not runnable', action);
      }

      await adminClient
        .from(T_RUNS)
        .update({ run_status: 'running', started_at: run.started_at ?? nowIso })
        .eq('id', run.id);

      const literals = extractLiterals(p.data.text_content);
      const findings: Array<Record<string, unknown>> = literals.map((lit) => ({
        extraction_run_id: run.id,
        intake_id: run.intake_id,
        agreement_id: run.agreement_id,
        version_id: run.version_id,
        finding_type: 'concept_candidate',
        concept_literal_from_agreement: lit.literal,
        normalized_concept_key: lit.key,
        payroll_label: lit.literal,
        payslip_label: lit.literal,
        source_page: p.data.source_page ?? null,
        source_article: p.data.source_article ?? null,
        source_annex: p.data.source_annex ?? null,
        confidence: 'low',
        finding_status: 'pending_review',
        requires_human_review: true,
      }));

      // Heuristic: if salary table-like content is detected, register a candidate
      // marker (NOT a parsed table) and require human review.
      if (looksLikeSalaryTable(p.data.text_content)) {
        findings.push({
          extraction_run_id: run.id,
          intake_id: run.intake_id,
          agreement_id: run.agreement_id,
          version_id: run.version_id,
          finding_type: 'salary_table_candidate',
          source_page: p.data.source_page ?? null,
          source_article: p.data.source_article ?? null,
          source_annex: p.data.source_annex ?? null,
          payload_json: { detector: 'heuristic', requires_manual_extraction: true },
          confidence: 'low',
          finding_status: 'pending_review',
          requires_human_review: true,
        });
      }

      const warnings: string[] = [];
      if (looksOcrRequired(p.data.text_content)) {
        findings.push({
          extraction_run_id: run.id,
          intake_id: run.intake_id,
          agreement_id: run.agreement_id,
          version_id: run.version_id,
          finding_type: 'ocr_required',
          payload_json: { detector: 'low_printable_ratio' },
          confidence: 'low',
          finding_status: 'pending_review',
          requires_human_review: true,
        });
        warnings.push('ocr_required_detected');
      }

      if (findings.length === 0) {
        warnings.push('no_concept_literals_detected');
      }

      if (findings.length > 0) {
        const { error: fInsErr } = await adminClient.from(T_FINDINGS).insert(findings);
        if (fInsErr) {
          await adminClient
            .from(T_RUNS)
            .update({
              run_status: 'failed',
              completed_at: nowIso,
              blockers_json: appendJsonArray(run.blockers_json, {
                code: 'findings_insert_failed',
                at: nowIso,
              }),
            })
            .eq('id', run.id);
          return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
        }
      }

      const finalStatus = warnings.length > 0 ? 'completed_with_warnings' : 'completed';
      await adminClient
        .from(T_RUNS)
        .update({
          run_status: finalStatus,
          completed_at: nowIso,
          summary_json: {
            findings_count: findings.length,
            literals_count: literals.length,
          },
          warnings_json: warnings.map((w) => ({ code: w, at: nowIso })),
        })
        .eq('id', run.id);

      return ok(action, {
        run_id: run.id,
        run_status: finalStatus,
        findings_count: findings.length,
      });
    }

    // ---------- mark_run_blocked ----------
    if (action === 'mark_run_blocked') {
      const p = MarkRunBlockedSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: run, error: rErr } = await adminClient
        .from(T_RUNS)
        .select('id, blockers_json, run_status')
        .eq('id', p.data.run_id)
        .maybeSingle();
      if (rErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!run) return mapError(404, 'ROW_NOT_FOUND', 'Run not found', action);
      const { error: updErr } = await adminClient
        .from(T_RUNS)
        .update({
          run_status: 'blocked',
          blockers_json: appendJsonArray(run.blockers_json, {
            code: 'manual_block',
            reason: p.data.reason,
            by: userId,
            at: nowIso,
          }),
        })
        .eq('id', run.id);
      if (updErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, { run_id: run.id, run_status: 'blocked' });
    }

    // ---------- accept_finding_to_staging ----------
    // SAFETY: deferred to B13.3B. Never writes staging in B13.3A.
    if (action === 'accept_finding_to_staging') {
      const p = AcceptFindingSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      return ok(action, {
        deferred: true,
        code: 'ACCEPT_TO_STAGING_DEFERRED_TO_B13_3B',
        finding_id: p.data.finding_id,
        message:
          'accept_finding_to_staging is intentionally deferred to B13.3B; no staging row was created.',
      });
    }

    // ---------- reject_finding ----------
    // Status-only flip. Never deletes.
    if (action === 'reject_finding') {
      const p = RejectFindingSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: f, error: fErr } = await adminClient
        .from(T_FINDINGS)
        .select('id, payload_json, finding_status')
        .eq('id', p.data.finding_id)
        .maybeSingle();
      if (fErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!f) return mapError(404, 'ROW_NOT_FOUND', 'Finding not found', action);
      if (f.finding_status === 'rejected') {
        return ok(action, { finding_id: f.id, finding_status: 'rejected', already: true });
      }
      const newPayload =
        f.payload_json && typeof f.payload_json === 'object' && !Array.isArray(f.payload_json)
          ? { ...(f.payload_json as Record<string, unknown>) }
          : {};
      const history = Array.isArray(
        (newPayload as { rejection_history?: unknown[] }).rejection_history,
      )
        ? ((newPayload as { rejection_history: unknown[] }).rejection_history.slice() as unknown[])
        : [];
      history.push({ reason: p.data.reason, by: userId, at: nowIso });
      (newPayload as Record<string, unknown>).rejection_history = history;

      const { error: uErr } = await adminClient
        .from(T_FINDINGS)
        .update({
          finding_status: 'rejected',
          payload_json: newPayload,
        })
        .eq('id', f.id);
      if (uErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      return ok(action, { finding_id: f.id, finding_status: 'rejected' });
    }

    return mapError(400, 'INVALID_PAYLOAD', 'Unhandled action', action);
  } catch {
    return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
});