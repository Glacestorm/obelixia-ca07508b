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
  'human_approved_single',
  'human_approved_first',
  'human_approved_second',
  'approved_by',
  'approved_at',
] as const;

const T_RUNS = 'erp_hr_collective_agreement_extraction_runs';
const T_FINDINGS = 'erp_hr_collective_agreement_extraction_findings';
const T_INTAKE = 'erp_hr_collective_agreement_document_intake';
const T_STAGING = 'erp_hr_collective_agreement_salary_table_staging';
const T_STAGING_AUDIT = 'erp_hr_collective_agreement_staging_audit';

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
    options: z
      .object({
        approval_dual: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const RejectFindingSchema = z
  .object({
    action: z.literal('reject_finding'),
    finding_id: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

// B13.3C — controlled OCR / text extraction action.
const ManualPastedRowSchema = z
  .object({
    raw: z.string().min(1).max(2000),
    page: z.string().max(50).optional(),
    amount: z.union([z.string().max(60), z.number()]).optional(),
    professional_group: z.string().max(120).optional(),
    level: z.string().max(120).optional(),
    category: z.string().max(120).optional(),
    area_code: z.string().max(40).optional(),
    area_name: z.string().max(120).optional(),
    concept_hint: z.string().max(200).optional(),
    year: z.union([z.number().int().min(2000).max(2099), z.string().regex(/^\d{4}$/)]).optional(),
  })
  .strict();

const RunOcrOrTextSchema = z.discriminatedUnion('extraction_input_type', [
  z
    .object({
      action: z.literal('run_ocr_or_text_extraction'),
      run_id: uuid,
      extraction_input_type: z.literal('text_content'),
      text_content: z.string().min(1).max(400000),
      source_page: z.string().max(50).optional(),
      source_article: z.string().max(120).optional(),
      source_annex: z.string().max(120).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('run_ocr_or_text_extraction'),
      run_id: uuid,
      extraction_input_type: z.literal('document_url'),
      document_url: z.string().url().max(2000),
      source_page: z.string().max(50).optional(),
      source_article: z.string().max(120).optional(),
      source_annex: z.string().max(120).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('run_ocr_or_text_extraction'),
      run_id: uuid,
      extraction_input_type: z.literal('manual_pasted_table'),
      rows: z.array(ManualPastedRowSchema).min(1).max(500),
      source_page: z.string().max(50).optional(),
      source_article: z.string().max(120).optional(),
      source_annex: z.string().max(120).optional(),
    })
    .strict(),
]);

const KNOWN_ACTIONS = [
  'list_runs',
  'create_run',
  'run_metadata_extraction',
  'run_text_extraction',
  'mark_run_blocked',
  'accept_finding_to_staging',
  'reject_finding',
  'run_ocr_or_text_extraction',
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

// ---------------------------------------------------------------
// B13.3C — Inline mirror of agreementOcrExtractor +
// agreementSalaryTableCandidateExtractor (edges cannot import src/).
// ---------------------------------------------------------------
function normalizeOcrTextInline(text: string): string {
  let t = String(text ?? '');
  if (!t) return '';
  t = t.replace(/\uFB00/g, 'ff').replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl');
  t = t.replace(/\u00AD/g, '');
  t = t.replace(/(\p{L})-\n(\p{L})/gu, '$1$2');
  t = t.replace(/\r\n?/g, '\n');
  t = t
    .split('\n')
    .map((l) => l.replace(/[\t\v\f ]+/g, ' ').trim())
    .join('\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}
function buildExcerptInline(text: string, max = 280): string {
  const norm = normalizeOcrTextInline(text).replace(/\n+/g, ' ').trim();
  if (norm.length <= max) return norm;
  return norm.slice(0, max - 1).trimEnd() + '…';
}
function parseSpanishMoneyInline(value: unknown): { amount: number | null; ambiguous: boolean; warnings: string[]; raw: string } {
  const raw = String(value ?? '').trim();
  const out = { amount: null as number | null, ambiguous: false, warnings: [] as string[], raw };
  if (!raw) { out.warnings.push('empty_value'); return out; }
  let s = raw.replace(/€/g, '').replace(/EUR/gi, '').replace(/\s+/g, '').trim();
  if (!s) { out.warnings.push('empty_value_after_currency_strip'); return out; }
  if (!/^[+-]?[\d.,]+$/.test(s)) { out.warnings.push('non_numeric_chars'); return out; }
  const sign = s.startsWith('-') ? -1 : 1;
  s = s.replace(/^[+-]/, '');
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    const dec = lastComma > lastDot ? ',' : '.';
    const tho = dec === ',' ? '.' : ',';
    const parts = s.split(dec);
    if (parts.length !== 2) { out.warnings.push('multiple_decimal_separators'); return out; }
    const intP = parts[0].split(tho).join('');
    const decP = parts[1];
    if (!/^\d+$/.test(intP) || !/^\d{1,2}$/.test(decP)) { out.warnings.push('invalid_decimal_format'); return out; }
    out.amount = sign * Number(`${intP}.${decP}`);
    return out;
  }
  if (hasComma && !hasDot) {
    const parts = s.split(',');
    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
      out.amount = sign * Number(`${parts[0]}.${parts[1]}`); return out;
    }
    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d{3}$/.test(parts[1])) {
      out.ambiguous = true; out.warnings.push('ambiguous_comma_three_digits'); return out;
    }
    out.warnings.push('invalid_comma_format'); return out;
  }
  if (hasDot && !hasComma) {
    const parts = s.split('.');
    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
      out.amount = sign * Number(`${parts[0]}.${parts[1]}`); return out;
    }
    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d{3}$/.test(parts[1])) {
      out.ambiguous = true; out.warnings.push('ambiguous_dot_three_digits'); return out;
    }
    if (parts.length > 2 && parts.every((p) => /^\d{1,3}$/.test(p))) {
      out.amount = sign * Number(parts.join('')); return out;
    }
    out.warnings.push('invalid_dot_format'); return out;
  }
  if (/^\d+$/.test(s)) { out.amount = sign * Number(s); return out; }
  out.warnings.push('unrecognized_format'); return out;
}
function detectYearInline(t: string): number | null {
  const m = String(t ?? '').match(/\b(20\d{2})\b/g);
  if (!m || m.length === 0) return null;
  const y = Number(m[m.length - 1]);
  return Number.isFinite(y) && y >= 2000 && y <= 2099 ? y : null;
}
function detectGroupInline(t: string): string | null {
  const m = /\bgrupo\s+(?:profesional\s+)?([A-ZÁÉÍÓÚÑ0-9][\wáéíóúñ.\- ]{0,40})/i.exec(String(t ?? ''))
    || /\b(grupo\s+\d+)\b/i.exec(String(t ?? ''))
    || /\bnivel\s+([A-Z0-9][\w.\- ]{0,30})/i.exec(String(t ?? ''));
  return m ? normLit(m[1]).slice(0, 60) || null : null;
}
function buildOcrFindingsInline(
  norm: string,
  ctx: { sourcePage: string | null; sourceArticle: string | null; sourceAnnex: string | null; sourceDocument: string | null },
): Array<Record<string, unknown>> {
  const findings: Array<Record<string, unknown>> = [];
  // Concept candidates
  const literals = extractLiterals(norm);
  for (const lit of literals) {
    findings.push({
      finding_type: 'concept_candidate',
      concept_literal_from_agreement: lit.literal,
      normalized_concept_key: lit.key,
      payroll_label: lit.literal,
      payslip_label: lit.literal,
      source_page: ctx.sourcePage,
      source_article: ctx.sourceArticle,
      source_annex: ctx.sourceAnnex,
      source_excerpt: buildExcerptInline(lit.literal),
      raw_text: lit.literal,
      confidence: 'low',
      finding_status: 'pending_review',
      requires_human_review: true,
      payload_json: {
        extraction_method: 'text',
        source_document: ctx.sourceDocument,
      },
    });
  }
  // Salary table candidates from text
  const lines = norm.split('\n');
  let curPage: string | null = ctx.sourcePage;
  for (const raw of lines) {
    const pm = /^\s*(?:p[áa]gina|page)\s+(\d{1,4})\b/i.exec(raw);
    if (pm) { curPage = pm[1]; continue; }
    const line = raw.trim();
    if (line.length < 6 || line.length > 400) continue;
    if (!/(salario|sueldo|base|paga\s+extra|plus|antig|transport|nocturn|festiv|complemento|tabla|nivel|grupo|categor[ií]a)/i.test(line)) continue;
    const moneyMatches = line.match(/(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{1,2}|-?\d+[.,]\d{1,2}|-?\d{4,})/g);
    if (!moneyMatches || moneyMatches.length === 0) continue;
    const token = moneyMatches[moneyMatches.length - 1];
    const parsed = parseSpanishMoneyInline(token);
    const literal = normLit(line).slice(0, 200) || 'tabla salarial';
    const key = mapKey(literal);
    const year = detectYearInline(line) ?? detectYearInline(norm);
    const group = detectGroupInline(line) ?? detectGroupInline(norm);
    const warnings = [...parsed.warnings];
    if (year === null) warnings.push('year_undetected');
    if (!group) warnings.push('professional_group_undetected');
    if (parsed.ambiguous) warnings.push('amount_ambiguous');
    if (parsed.amount === null) warnings.push('amount_unparsed');
    findings.push({
      finding_type: 'salary_table_candidate',
      concept_literal_from_agreement: literal,
      normalized_concept_key: key,
      payroll_label: literal,
      payslip_label: literal,
      source_page: curPage ?? ctx.sourcePage ?? 'unknown',
      source_article: ctx.sourceArticle,
      source_annex: ctx.sourceAnnex,
      source_excerpt: buildExcerptInline(line),
      raw_text: line,
      confidence: parsed.amount !== null && group && year !== null ? 'medium' : 'low',
      finding_status: 'pending_review',
      requires_human_review: true,
      payload_json: {
        extraction_method: 'text',
        source_document: ctx.sourceDocument,
        year,
        professional_group: group,
        amount: parsed.amount,
        amount_raw: parsed.raw,
        amount_ambiguous: parsed.ambiguous,
        currency: 'EUR',
        warnings,
        row_confidence: parsed.amount !== null && group && year !== null ? 'medium' : 'low',
        requires_manual_amount_review: true,
      },
    });
  }
  // Rule candidates
  const ruleHints: Array<[RegExp, string]> = [
    [/\bjornada\b/i, 'jornada'],
    [/\bvacacion/i, 'vacaciones'],
    [/\bpermiso|\blicencia/i, 'permisos'],
    [/\bpreaviso/i, 'preaviso'],
    [/\bprueba\b|periodo\s+de\s+prueba/i, 'periodo_prueba'],
    [/\bincapacidad|\bit\b|\bbaja\b/i, 'incapacidad_temporal'],
    [/\bhoras?\s+extra/i, 'horas_extra'],
  ];
  curPage = ctx.sourcePage;
  for (const raw of lines) {
    const pm = /^\s*(?:p[áa]gina|page)\s+(\d{1,4})\b/i.exec(raw);
    if (pm) { curPage = pm[1]; continue; }
    const line = raw.trim();
    if (line.length < 6 || line.length > 400) continue;
    for (const [rx, hint] of ruleHints) {
      if (rx.test(line)) {
        findings.push({
          finding_type: 'rule_candidate',
          concept_literal_from_agreement: normLit(line).slice(0, 200),
          normalized_concept_key: mapKey(line),
          payroll_label: normLit(line).slice(0, 200),
          payslip_label: normLit(line).slice(0, 200),
          source_page: curPage ?? ctx.sourcePage,
          source_article: ctx.sourceArticle,
          source_annex: ctx.sourceAnnex,
          source_excerpt: buildExcerptInline(line),
          raw_text: line,
          confidence: 'low',
          finding_status: 'pending_review',
          requires_human_review: true,
          payload_json: {
            extraction_method: 'text',
            source_document: ctx.sourceDocument,
            rule_hint: hint,
          },
        });
        break;
      }
    }
  }
  // OCR-required marker
  if (looksOcrRequired(norm)) {
    findings.push({
      finding_type: 'ocr_required',
      source_page: ctx.sourcePage,
      source_article: ctx.sourceArticle,
      source_annex: ctx.sourceAnnex,
      source_excerpt: buildExcerptInline(norm.slice(0, 280)),
      confidence: 'low',
      finding_status: 'pending_review',
      requires_human_review: true,
      payload_json: {
        extraction_method: 'text',
        source_document: ctx.sourceDocument,
        detector: 'low_printable_ratio',
      },
    });
  }
  return findings;
}
function buildManualRowsFindingsInline(
  rows: Array<Record<string, unknown>>,
  ctx: { sourcePage: string | null; sourceArticle: string | null; sourceAnnex: string | null; sourceDocument: string | null },
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    const raw = String(r.raw ?? '').trim();
    if (!raw) continue;
    const literal = (typeof r.concept_hint === 'string' && r.concept_hint.trim())
      ? normLit(r.concept_hint as string)
      : normLit(raw).slice(0, 200) || 'tabla salarial';
    const key = mapKey(literal);
    const parsed = parseSpanishMoneyInline(r.amount ?? '');
    const year =
      typeof r.year === 'number' ? Math.trunc(r.year)
      : typeof r.year === 'string' && /^\d{4}$/.test(r.year) ? Number(r.year)
      : detectYearInline(raw);
    const group = (typeof r.professional_group === 'string' && r.professional_group.trim())
      ? normLit(r.professional_group).slice(0, 60)
      : detectGroupInline(raw);
    const warnings = [...parsed.warnings];
    if (year === null) warnings.push('year_undetected');
    if (!group) warnings.push('professional_group_undetected');
    if (parsed.ambiguous) warnings.push('amount_ambiguous');
    if (parsed.amount === null) warnings.push('amount_unparsed');
    out.push({
      finding_type: 'salary_table_candidate',
      concept_literal_from_agreement: literal,
      normalized_concept_key: key,
      payroll_label: literal,
      payslip_label: literal,
      source_page: String(r.page ?? ctx.sourcePage ?? '').trim() || 'unknown',
      source_article: ctx.sourceArticle,
      source_annex: ctx.sourceAnnex,
      source_excerpt: buildExcerptInline(raw),
      raw_text: raw,
      confidence: parsed.amount !== null && group && year !== null ? 'medium' : 'low',
      finding_status: 'pending_review',
      requires_human_review: true,
      payload_json: {
        extraction_method: 'manual_pasted_table',
        source_document: ctx.sourceDocument,
        year,
        professional_group: group ?? null,
        level: typeof r.level === 'string' ? normLit(r.level).slice(0, 40) : null,
        category: typeof r.category === 'string' ? normLit(r.category).slice(0, 60) : null,
        area_code: typeof r.area_code === 'string' ? r.area_code : null,
        area_name: typeof r.area_name === 'string' ? normLit(r.area_name).slice(0, 60) : null,
        amount: parsed.amount,
        amount_raw: parsed.raw,
        amount_ambiguous: parsed.ambiguous,
        currency: 'EUR',
        warnings,
        row_confidence: parsed.amount !== null && group && year !== null ? 'medium' : 'low',
        requires_manual_amount_review: true,
      },
    });
  }
  return out;
}
async function sha256HexBytesInline(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function appendJsonArray(prev: unknown, item: unknown): unknown[] {
  const arr = Array.isArray(prev) ? prev.slice() : [];
  arr.push(item);
  return arr;
}

// ---------------------------------------------------------------
// B13.3B.1 — Inline mirror of agreementFindingToStagingMapper.ts
// (edges cannot import from src/). Pure & deterministic.
// Hard rules: no inventar importes, no human_approved, no
// ready_for_payroll, no salary_tables_loaded.
// ---------------------------------------------------------------
const ALLOWED_STAGING_FINDING_TYPES = ['salary_table_candidate', 'concept_candidate'] as const;

function nonEmptyStr(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}
function nonNeg(v: unknown): number | null {
  const n = toNum(v);
  if (n === null) return null;
  if (n < 0) throw new Error('NEGATIVE_AMOUNT');
  return n;
}
const KEYWORDS_INLINE: Array<[RegExp, RegExp]> = [
  [/transport/, /transport/],
  [/nocturn/, /nocturn/],
  [/festiv/, /festiv/],
  [/antigu?edad|antig/, /antigu?edad|antig/],
  [/dieta/, /dieta/],
  [/kilomet/, /kilomet/],
  [/responsabilidad/, /responsabilidad/],
  [/convenio/, /convenio/],
];
function preservesKeywordInline(literal: string, payslip: string): boolean {
  const l = strip(literal.toLowerCase());
  const p = strip(payslip.toLowerCase());
  for (const [needle, must] of KEYWORDS_INLINE) {
    if (needle.test(l) && !must.test(p)) return false;
  }
  return true;
}
function inferMethodInline(f: Record<string, unknown>): 'ocr' | 'manual_csv' | 'manual_form' {
  const payload = (f.payload_json ?? {}) as Record<string, unknown>;
  const hint = String(payload.extraction_method ?? '').toLowerCase();
  if (hint === 'ocr') return 'ocr';
  if (hint === 'manual_csv') return 'manual_csv';
  if (hint === 'manual_form') return 'manual_form';
  if (f.confidence === 'low' && payload.row_confidence) return 'ocr';
  return 'manual_form';
}
function mapAmountsInline(payload: Record<string, unknown> | null | undefined) {
  const p = (payload ?? {}) as Record<string, unknown>;
  const yearN = toNum(p.year);
  return {
    year: yearN !== null ? Math.trunc(yearN) : null,
    professional_group: nonEmptyStr(p.professional_group) ? (p.professional_group as string) : null,
    level: nonEmptyStr(p.level) ? (p.level as string) : null,
    category: nonEmptyStr(p.category) ? (p.category as string) : null,
    area_code: nonEmptyStr(p.area_code) ? (p.area_code as string) : null,
    area_name: nonEmptyStr(p.area_name) ? (p.area_name as string) : null,
    salary_base_annual: nonNeg(p.salary_base_annual),
    salary_base_monthly: nonNeg(p.salary_base_monthly),
    extra_pay_amount: nonNeg(p.extra_pay_amount),
    plus_convenio_annual: nonNeg(p.plus_convenio_annual),
    plus_convenio_monthly: nonNeg(p.plus_convenio_monthly),
    plus_transport: nonNeg((p as { plus_transport?: unknown; amount_transport?: unknown }).plus_transport ?? (p as { amount_transport?: unknown }).amount_transport),
    plus_antiguedad: nonNeg(p.plus_antiguedad),
    other_amount: nonNeg((p as { other_amount?: unknown; amount?: unknown }).other_amount ?? (p as { amount?: unknown }).amount),
    currency: nonEmptyStr(p.currency) ? (p.currency as string).toUpperCase() : 'EUR',
    row_confidence: nonEmptyStr(p.row_confidence) ? (p.row_confidence as string) : null,
    taxable_irpf_hint: typeof p.taxable_irpf_hint === 'boolean' ? p.taxable_irpf_hint : null,
    cotization_included_hint:
      typeof p.cotization_included_hint === 'boolean' ? p.cotization_included_hint : null,
    cra_code_suggested: nonEmptyStr(p.cra_code_suggested) ? (p.cra_code_suggested as string) : null,
  };
}
function validateFindingForStagingInline(
  f: Record<string, unknown>,
): { ok: true } | { ok: false; code: string; reason: string } {
  const t = String(f.finding_type ?? '');
  if (!(ALLOWED_STAGING_FINDING_TYPES as readonly string[]).includes(t)) {
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'finding_type_not_allowed' };
  }
  const status = String(f.finding_status ?? '');
  if (status !== 'pending_review' && status !== 'needs_correction') {
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'finding_status_not_review_ready' };
  }
  if (!nonEmptyStr(f.agreement_id))
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_agreement_id' };
  if (!nonEmptyStr(f.version_id))
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_version_id' };
  if (!nonEmptyStr(f.source_page))
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_source_page' };
  if (!nonEmptyStr(f.source_excerpt))
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_source_excerpt' };
  if (!nonEmptyStr(f.concept_literal_from_agreement))
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_concept_literal' };
  if (!nonEmptyStr(f.normalized_concept_key))
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_normalized_key' };
  if (!nonEmptyStr(f.payslip_label))
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_payslip_label' };
  if (f.requires_human_review !== true)
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'requires_human_review_must_be_true' };
  if (!preservesKeywordInline(String(f.concept_literal_from_agreement), String(f.payslip_label)))
    return { ok: false, code: 'APPROVAL_BLOCKED', reason: 'literal_not_preserved' };
  let amounts;
  try {
    amounts = mapAmountsInline((f.payload_json ?? {}) as Record<string, unknown>);
  } catch {
    return { ok: false, code: 'APPROVAL_BLOCKED', reason: 'negative_amount' };
  }
  if (amounts.year === null)
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_year' };
  if (!amounts.professional_group)
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_professional_group' };
  const hasAny =
    amounts.salary_base_annual !== null ||
    amounts.salary_base_monthly !== null ||
    amounts.extra_pay_amount !== null ||
    amounts.plus_convenio_annual !== null ||
    amounts.plus_convenio_monthly !== null ||
    amounts.plus_transport !== null ||
    amounts.plus_antiguedad !== null ||
    amounts.other_amount !== null;
  if (!hasAny)
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_amount_field' };
  const method = inferMethodInline(f);
  if (method === 'ocr' && !nonEmptyStr(amounts.row_confidence))
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'ocr_missing_row_confidence' };
  return { ok: true };
}
function mapFindingToStagingInline(
  f: Record<string, unknown>,
  options: { approval_dual?: boolean; sourceDocumentFromIntake?: string | null } = {},
): Record<string, unknown> {
  const method = inferMethodInline(f);
  const dual = options.approval_dual === true;
  const approval_mode =
    method === 'ocr'
      ? dual
        ? 'ocr_dual_human_approval'
        : 'ocr_single_human_approval'
      : dual
        ? 'manual_upload_dual_approval'
        : 'manual_upload_single_approval';
  const validation_status = method === 'ocr' ? 'ocr_pending_review' : 'manual_pending_review';
  const amounts = mapAmountsInline((f.payload_json ?? {}) as Record<string, unknown>);
  const payload = (f.payload_json ?? {}) as Record<string, unknown>;
  const sourceDoc =
    options.sourceDocumentFromIntake ??
    (nonEmptyStr(payload.source_document) ? (payload.source_document as string) : null) ??
    (nonEmptyStr(payload.document_hash) ? (payload.document_hash as string) : null) ??
    'extraction_finding';
  let row_confidence = amounts.row_confidence;
  if (method === 'ocr' && (!row_confidence || row_confidence.length === 0)) {
    row_confidence = 'ocr_low';
  }
  return {
    agreement_id: f.agreement_id,
    version_id: f.version_id,
    source_document: sourceDoc,
    source_page: String(f.source_page ?? '').trim(),
    source_excerpt: String(f.source_excerpt ?? '').trim(),
    source_article: nonEmptyStr(f.source_article) ? f.source_article : null,
    source_annex: nonEmptyStr(f.source_annex) ? f.source_annex : null,
    ocr_raw_text: nonEmptyStr((f as { raw_text?: unknown }).raw_text)
      ? (f as { raw_text: string }).raw_text
      : null,
    extraction_method: method,
    approval_mode,
    year: amounts.year,
    area_code: amounts.area_code,
    area_name: amounts.area_name,
    professional_group: amounts.professional_group,
    level: amounts.level,
    category: amounts.category,
    concept_literal_from_agreement: f.concept_literal_from_agreement,
    normalized_concept_key: f.normalized_concept_key,
    payroll_label: nonEmptyStr(f.payroll_label)
      ? f.payroll_label
      : f.concept_literal_from_agreement,
    payslip_label: f.payslip_label,
    cra_mapping_status: 'pending',
    cra_code_suggested: amounts.cra_code_suggested,
    taxable_irpf_hint: amounts.taxable_irpf_hint,
    cotization_included_hint: amounts.cotization_included_hint,
    salary_base_annual: amounts.salary_base_annual,
    salary_base_monthly: amounts.salary_base_monthly,
    extra_pay_amount: amounts.extra_pay_amount,
    plus_convenio_annual: amounts.plus_convenio_annual,
    plus_convenio_monthly: amounts.plus_convenio_monthly,
    plus_transport: amounts.plus_transport,
    plus_antiguedad: amounts.plus_antiguedad,
    other_amount: amounts.other_amount,
    currency: amounts.currency || 'EUR',
    row_confidence,
    requires_human_review: true,
    validation_status,
  };
}
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}
async function sha256HexInline(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const d = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(d))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
async function computeStagingContentHash(row: Record<string, unknown>): Promise<string> {
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
  return await sha256HexInline(stableStringify(subset));
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
      // (Handled below)
    }

    // ---------- run_ocr_or_text_extraction (B13.3C) ----------
    // Controlled OCR / text extraction. Three explicit input modes:
    //   - text_content (caller provides the text directly)
    //   - document_url (must equal run.document_url or intake.document_url)
    //   - manual_pasted_table (rows aportadas, NO OCR)
    // Findings created are ALWAYS pending_review + requires_human_review=true.
    // Never writes salary_tables real, never sets ready_for_payroll, never
    // calls B11.3B / B8A / B8B / B9.
    if (action === 'run_ocr_or_text_extraction') {
      const p = RunOcrOrTextSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
      const { data: run, error: rErr } = await adminClient
        .from(T_RUNS)
        .select('*')
        .eq('id', p.data.run_id)
        .maybeSingle();
      if (rErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!run) return mapError(404, 'ROW_NOT_FOUND', 'Run not found', action);

      const allowedRunStatuses = ['queued', 'running', 'failed', 'blocked', 'completed_with_warnings'];
      if (!allowedRunStatuses.includes(run.run_status)) {
        return mapError(409, 'INVALID_TRANSITION', 'Run not runnable', action);
      }

      const { data: intake, error: iErr } = await adminClient
        .from(T_INTAKE)
        .select('id, status, document_url, document_hash, source_url')
        .eq('id', run.intake_id)
        .maybeSingle();
      if (iErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!intake) return mapError(404, 'ROW_NOT_FOUND', 'Intake not found', action);
      if (intake.status !== 'ready_for_extraction') {
        return mapError(409, 'INVALID_TRANSITION', 'Intake must be ready_for_extraction', action);
      }

      const ALLOWED_MODES = ['html_text', 'pdf_text', 'ocr_assisted', 'manual_csv', 'metadata_only'];
      if (!ALLOWED_MODES.includes(run.extraction_mode)) {
        return mapError(409, 'INVALID_TRANSITION', 'Run extraction_mode not compatible', action);
      }

      // Mark running
      await adminClient
        .from(T_RUNS)
        .update({ run_status: 'running', started_at: run.started_at ?? nowIso })
        .eq('id', run.id);

      const ctx = {
        sourcePage: (p.data as { source_page?: string }).source_page ?? null,
        sourceArticle: (p.data as { source_article?: string }).source_article ?? null,
        sourceAnnex: (p.data as { source_annex?: string }).source_annex ?? null,
        sourceDocument: intake.document_hash ?? intake.document_url ?? null,
      };

      let findingsToInsert: Array<Record<string, unknown>> = [];
      const warnings: string[] = [];
      const blockers: Array<Record<string, unknown>> = [];
      let runOutcome: 'completed' | 'completed_with_warnings' | 'blocked' = 'completed';

      if (p.data.extraction_input_type === 'text_content') {
        const norm = normalizeOcrTextInline(p.data.text_content);
        findingsToInsert = buildOcrFindingsInline(norm, ctx);
      } else if (p.data.extraction_input_type === 'manual_pasted_table') {
        findingsToInsert = buildManualRowsFindingsInline(
          p.data.rows as Array<Record<string, unknown>>,
          ctx,
        );
      } else {
        // document_url branch
        const requested = p.data.document_url;
        const expected = run.document_url ?? intake.document_url ?? null;
        if (!expected || requested !== expected) {
          await adminClient
            .from(T_RUNS)
            .update({
              run_status: 'blocked',
              completed_at: nowIso,
              blockers_json: appendJsonArray(run.blockers_json, {
                code: 'document_url_mismatch',
                requested,
                expected,
                at: nowIso,
              }),
            })
            .eq('id', run.id);
          return mapError(409, 'INVALID_TRANSITION', 'document_url must match run/intake', action);
        }
        // Attempt to fetch document bytes; if anything fails or hash cannot
        // be verified when intake.document_hash is set → blocker.
        try {
          const resp = await fetch(requested, { method: 'GET' });
          if (!resp.ok) throw new Error(`fetch_status_${resp.status}`);
          const buf = new Uint8Array(await resp.arrayBuffer());
          if (intake.document_hash) {
            const h = await sha256HexBytesInline(buf);
            if (h !== intake.document_hash) {
              blockers.push({ code: 'document_hash_unverified', at: nowIso });
              runOutcome = 'blocked';
            }
          } else {
            warnings.push('document_hash_missing_on_intake');
          }
          if (runOutcome !== 'blocked') {
            // Best-effort UTF-8 decode (binary PDFs will yield low printable
            // ratio → ocr_required marker by detector).
            const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
            const norm = normalizeOcrTextInline(text);
            findingsToInsert = buildOcrFindingsInline(norm, ctx);
          }
        } catch {
          blockers.push({ code: 'document_fetch_failed', at: nowIso });
          runOutcome = 'blocked';
        }
      }

      if (findingsToInsert.length === 0 && runOutcome !== 'blocked') {
        warnings.push('no_findings_detected');
      }

      // Stamp run + intake into every finding.
      const stamped = findingsToInsert.map((f) => ({
        ...f,
        extraction_run_id: run.id,
        intake_id: run.intake_id,
        agreement_id: run.agreement_id,
        version_id: run.version_id,
      }));

      if (stamped.length > 0) {
        const { error: fInsErr } = await adminClient.from(T_FINDINGS).insert(stamped);
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

      let finalStatus: 'completed' | 'completed_with_warnings' | 'blocked';
      if (runOutcome === 'blocked') finalStatus = 'blocked';
      else if (warnings.length > 0) finalStatus = 'completed_with_warnings';
      else finalStatus = 'completed';

      await adminClient
        .from(T_RUNS)
        .update({
          run_status: finalStatus,
          completed_at: nowIso,
          summary_json: {
            findings_count: stamped.length,
            extraction_input_type: p.data.extraction_input_type,
          },
          warnings_json: warnings.map((w) => ({ code: w, at: nowIso })),
          blockers_json:
            blockers.length > 0
              ? appendJsonArray(run.blockers_json, ...blockers as unknown[])
              : run.blockers_json,
        })
        .eq('id', run.id);

      return ok(action, {
        run_id: run.id,
        run_status: finalStatus,
        findings_count: stamped.length,
      });
    }

    // ---------- mark_run_blocked (real handler) ----------
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
    // B13.3B.1: maps a reviewable finding into a salary-table staging row
    // PENDING human review. Never writes salary_tables real, never sets
    // ready_for_payroll, never auto-approves OCR by confidence.
    if (action === 'accept_finding_to_staging') {
      const p = AcceptFindingSchema.safeParse(body);
      if (!p.success) return mapError(400, 'INVALID_PAYLOAD', 'Invalid payload', action);

      const { data: finding, error: fErr } = await adminClient
        .from(T_FINDINGS)
        .select('*')
        .eq('id', p.data.finding_id)
        .maybeSingle();
      if (fErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);
      if (!finding) return mapError(404, 'ROW_NOT_FOUND', 'Finding not found', action);

      // Try to enrich source_document from intake document_hash if available.
      let sourceDocFromIntake: string | null = null;
      if (finding.intake_id) {
        const { data: intake } = await adminClient
          .from(T_INTAKE)
          .select('document_hash')
          .eq('id', finding.intake_id)
          .maybeSingle();
        if (intake?.document_hash && typeof intake.document_hash === 'string') {
          sourceDocFromIntake = intake.document_hash;
        }
      }

      const validation = validateFindingForStagingInline(finding as Record<string, unknown>);
      if (!validation.ok) {
        const status = validation.code === 'APPROVAL_BLOCKED' ? 409 : 422;
        return mapError(status, validation.code, validation.reason, action);
      }

      let stagingShape: Record<string, unknown>;
      try {
        stagingShape = mapFindingToStagingInline(finding as Record<string, unknown>, {
          approval_dual: p.data.options?.approval_dual === true,
          sourceDocumentFromIntake: sourceDocFromIntake,
        });
      } catch {
        return mapError(409, 'APPROVAL_BLOCKED', 'mapper_error', action);
      }

      const content_hash = await computeStagingContentHash(stagingShape);
      const { data: insertedRow, error: insErr } = await adminClient
        .from(T_STAGING)
        .insert({ ...stagingShape, content_hash })
        .select('*')
        .single();
      if (insErr) return mapError(500, 'INTERNAL_ERROR', 'Internal error', action);

      // Audit insert (append-only).
      await adminClient.from(T_STAGING_AUDIT).insert({
        staging_row_id: (insertedRow as { id: string }).id,
        agreement_id: finding.agreement_id,
        version_id: finding.version_id,
        action: 'create',
        actor_id: userId,
        snapshot_json: insertedRow as Record<string, unknown>,
        content_hash,
      });

      // Update finding status (status flip only, no delete).
      const newPayload =
        finding.payload_json && typeof finding.payload_json === 'object' && !Array.isArray(finding.payload_json)
          ? { ...(finding.payload_json as Record<string, unknown>) }
          : {};
      (newPayload as Record<string, unknown>).accepted_to_staging = {
        staging_row_id: (insertedRow as { id: string }).id,
        by: userId,
        at: nowIso,
      };
      await adminClient
        .from(T_FINDINGS)
        .update({
          finding_status: 'accepted_to_staging',
          payload_json: newPayload,
        })
        .eq('id', finding.id);

      return ok(action, {
        finding_id: finding.id,
        staging_row_id: (insertedRow as { id: string }).id,
        validation_status: stagingShape.validation_status,
        approval_mode: stagingShape.approval_mode,
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