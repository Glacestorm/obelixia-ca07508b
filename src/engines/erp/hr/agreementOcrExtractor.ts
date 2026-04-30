/**
 * B13.3C — Pure helper for controlled OCR / text extraction of collective
 * agreement documents into review-only findings.
 *
 * Hard rules (mirrored across edge):
 *  - No DB, no Supabase, no fetch, no Deno, no React/hooks.
 *  - No payroll / payslip / bridge / normalizer / resolver imports.
 *  - Never invents importes (no monetary parsing here; numbers come from the
 *    salary table candidate extractor when amounts are unambiguous).
 *  - Every finding emitted has:
 *      requires_human_review = true
 *      finding_status = 'pending_review'
 *      confidence ∈ 'low' | 'medium' | 'high'
 *      source_excerpt + raw_text preserved.
 *  - Deterministic output for a given input.
 */

import {
  extractConceptLiteralsFromText,
  mapAgreementConceptToNormalizedKey,
  normalizeAgreementConceptLiteral,
  type AgreementNormalizedConceptKey,
} from './agreementConceptLiteralExtractor';

export type OcrFindingType =
  | 'salary_table_candidate'
  | 'concept_candidate'
  | 'rule_candidate'
  | 'ocr_required'
  | 'manual_review_required';

export type OcrFindingConfidence = 'low' | 'medium' | 'high';

export interface OcrExtractionContext {
  agreementCode?: string | null;
  sourcePageHint?: string | null;
  sourceArticleHint?: string | null;
  sourceAnnexHint?: string | null;
  sourceDocument?: string | null;
}

export interface OcrExtractionOptions {
  /** Defensive cap on findings emitted. Default 400. */
  maxFindings?: number;
  /** Defensive cap on chunks produced. Default 800. */
  maxChunks?: number;
}

export interface OcrFindingCandidate {
  finding_type: OcrFindingType;
  concept_literal_from_agreement: string | null;
  normalized_concept_key: AgreementNormalizedConceptKey | null;
  payroll_label: string | null;
  payslip_label: string | null;
  source_page: string | null;
  source_article: string | null;
  source_annex: string | null;
  source_excerpt: string | null;
  raw_text: string | null;
  confidence: OcrFindingConfidence;
  finding_status: 'pending_review';
  requires_human_review: true;
  payload_json: Record<string, unknown>;
}

export interface OcrEvidenceChunk {
  index: number;
  page: string | null;
  text: string;
}

/**
 * Light-weight OCR text normalization. Collapses repeated whitespace, fixes
 * common ligatures and joins hyphenated line breaks. Never strips digits or
 * monetary symbols.
 */
export function normalizeOcrText(text: string): string {
  let t = String(text ?? '');
  if (!t) return '';
  // Common OCR ligatures
  t = t.replace(/\uFB00/g, 'ff').replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl');
  // Soft hyphens
  t = t.replace(/\u00AD/g, '');
  // Join hyphenated end-of-line breaks: "trans-\nporte" -> "transporte"
  t = t.replace(/(\p{L})-\n(\p{L})/gu, '$1$2');
  // CRLF -> LF
  t = t.replace(/\r\n?/g, '\n');
  // Collapse intra-line whitespace but preserve newlines
  t = t
    .split('\n')
    .map((l) => l.replace(/[\t\v\f ]+/g, ' ').trim())
    .join('\n');
  // Collapse 3+ blank lines to 2
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

/**
 * Splits text into evidence chunks of bounded size while preserving an optional
 * page hint detected in the text (e.g., "Página 12" / "Page 12").
 */
export function splitTextIntoEvidenceChunks(
  text: string,
  options: { maxChars?: number; maxChunks?: number } = {},
): OcrEvidenceChunk[] {
  const max = options.maxChars ?? 1200;
  const cap = options.maxChunks ?? 800;
  const norm = normalizeOcrText(text);
  if (!norm) return [];
  const lines = norm.split('\n');
  const out: OcrEvidenceChunk[] = [];
  let buf: string[] = [];
  let bufLen = 0;
  let currentPage: string | null = null;

  const flush = () => {
    if (buf.length === 0) return;
    out.push({
      index: out.length,
      page: currentPage,
      text: buf.join('\n').trim(),
    });
    buf = [];
    bufLen = 0;
  };

  for (const line of lines) {
    if (out.length >= cap) break;
    const pageMatch = /^\s*(?:p[áa]gina|page)\s+(\d{1,4})\b/i.exec(line);
    if (pageMatch) {
      flush();
      currentPage = pageMatch[1];
      continue;
    }
    if (bufLen + line.length + 1 > max && buf.length > 0) {
      flush();
    }
    buf.push(line);
    bufLen += line.length + 1;
  }
  flush();
  return out;
}

export function detectSourcePageFromChunk(chunk: OcrEvidenceChunk): string | null {
  if (chunk.page) return chunk.page;
  const m = /\bp[áa]gina\s+(\d{1,4})\b/i.exec(chunk.text);
  return m ? m[1] : null;
}

export function buildSourceExcerpt(chunkOrText: OcrEvidenceChunk | string, max = 280): string {
  const t = typeof chunkOrText === 'string' ? chunkOrText : chunkOrText.text;
  const norm = normalizeOcrText(t).replace(/\n+/g, ' ').trim();
  if (norm.length <= max) return norm;
  return norm.slice(0, max - 1).trimEnd() + '…';
}

/**
 * Detects "salary-like" lines: lines that contain a concept keyword AND at
 * least one number with a money-style format. We never parse the figure here
 * (the salary table candidate extractor does that, strictly).
 */
export function extractSalaryLikeLines(
  text: string,
  _options: { maxLines?: number } = {},
): Array<{ line: string; page: string | null }> {
  const norm = normalizeOcrText(text);
  if (!norm) return [];
  const max = _options.maxLines ?? 400;
  const out: Array<{ line: string; page: string | null }> = [];
  let currentPage: string | null = null;
  for (const raw of norm.split('\n')) {
    if (out.length >= max) break;
    const pm = /^\s*(?:p[áa]gina|page)\s+(\d{1,4})\b/i.exec(raw);
    if (pm) {
      currentPage = pm[1];
      continue;
    }
    const line = raw.trim();
    if (line.length < 6 || line.length > 400) continue;
    if (!/(salario|sueldo|base|paga\s+extra|plus|antig|transport|nocturn|festiv|complemento|tabla|nivel|grupo|categor[ií]a)/i.test(line)) {
      continue;
    }
    if (!/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+[.,]\d{1,2})/.test(line)) {
      continue;
    }
    out.push({ line, page: currentPage });
  }
  return out;
}

/**
 * Detects "concept-like" lines (literal concept names) without amounts.
 * Used to build concept_candidate findings even when no figure is detected.
 */
export function extractConceptLikeLines(
  text: string,
  _options: { maxLines?: number } = {},
): Array<{ line: string; page: string | null }> {
  const norm = normalizeOcrText(text);
  if (!norm) return [];
  const max = _options.maxLines ?? 400;
  const out: Array<{ line: string; page: string | null }> = [];
  let currentPage: string | null = null;
  for (const raw of norm.split('\n')) {
    if (out.length >= max) break;
    const pm = /^\s*(?:p[áa]gina|page)\s+(\d{1,4})\b/i.exec(raw);
    if (pm) {
      currentPage = pm[1];
      continue;
    }
    const line = raw.trim();
    if (line.length < 4 || line.length > 200) continue;
    if (
      !/(plus|complemento|antig|transport|nocturn|festiv|dieta|kilomet|salario\s+base|sueldo\s+base|paga\s+extra|gratificacion|jornada|vacacion|permiso|licencia|preaviso|prueba|incapacidad|\bit\b|horas?\s+extra|responsabilidad|convenio)/i.test(
        line,
      )
    ) {
      continue;
    }
    out.push({ line, page: currentPage });
  }
  return out;
}

/**
 * Detects "rule-like" lines (jornada, vacaciones, permisos, preaviso, periodo
 * de prueba, IT/incapacidad, horas extra). These lines are evidence of rules
 * that humans must validate; we do NOT parse the rule semantics here.
 */
export function extractRuleLikeLines(
  text: string,
  _options: { maxLines?: number } = {},
): Array<{ line: string; page: string | null; ruleHint: string }> {
  const norm = normalizeOcrText(text);
  if (!norm) return [];
  const max = _options.maxLines ?? 200;
  const out: Array<{ line: string; page: string | null; ruleHint: string }> = [];
  let currentPage: string | null = null;
  const HINTS: Array<[RegExp, string]> = [
    [/\bjornada\b/i, 'jornada'],
    [/\bvacacion/i, 'vacaciones'],
    [/\bpermiso|\blicencia/i, 'permisos'],
    [/\bpreaviso/i, 'preaviso'],
    [/\bprueba\b|periodo\s+de\s+prueba/i, 'periodo_prueba'],
    [/\bincapacidad|\bit\b|\bbaja\b/i, 'incapacidad_temporal'],
    [/\bhoras?\s+extra/i, 'horas_extra'],
  ];
  for (const raw of norm.split('\n')) {
    if (out.length >= max) break;
    const pm = /^\s*(?:p[áa]gina|page)\s+(\d{1,4})\b/i.exec(raw);
    if (pm) {
      currentPage = pm[1];
      continue;
    }
    const line = raw.trim();
    if (line.length < 6 || line.length > 400) continue;
    for (const [rx, hint] of HINTS) {
      if (rx.test(line)) {
        out.push({ line, page: currentPage, ruleHint: hint });
        break;
      }
    }
  }
  return out;
}

function isOcrLikelyRequired(text: string): boolean {
  const t = String(text ?? '');
  if (t.length < 200) return false;
  let printable = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t.charAt(i);
    if (/[\p{L}\p{N}\s.,;:€%·\-/()]/u.test(c)) printable++;
  }
  return printable / t.length < 0.6;
}

export function classifyExtractionConfidence(
  candidate: Pick<OcrFindingCandidate, 'finding_type' | 'payload_json' | 'source_excerpt'>,
): OcrFindingConfidence {
  if (candidate.finding_type === 'ocr_required' || candidate.finding_type === 'manual_review_required') {
    return 'low';
  }
  const payload = candidate.payload_json ?? {};
  const hasNumber = typeof (payload as { has_number?: unknown }).has_number === 'boolean'
    ? (payload as { has_number: boolean }).has_number
    : /\d/.test(String(candidate.source_excerpt ?? ''));
  if (candidate.finding_type === 'salary_table_candidate') {
    return hasNumber ? 'medium' : 'low';
  }
  if (candidate.finding_type === 'concept_candidate') {
    return 'low';
  }
  if (candidate.finding_type === 'rule_candidate') {
    return 'low';
  }
  return 'low';
}

/**
 * Top-level builder: consumes raw text and produces deterministic finding
 * candidates. NEVER returns rows with finding_status other than
 * 'pending_review' or with requires_human_review !== true.
 */
export function buildFindingCandidatesFromText(
  text: string,
  context: OcrExtractionContext = {},
  options: OcrExtractionOptions = {},
): OcrFindingCandidate[] {
  const max = options.maxFindings ?? 400;
  const norm = normalizeOcrText(text);
  if (!norm.trim()) return [];

  const out: OcrFindingCandidate[] = [];

  // 1) Concept candidates from literals (deduped by literal).
  const concepts = extractConceptLiteralsFromText(norm);
  for (const c of concepts) {
    if (out.length >= max) break;
    const sourceExcerpt = buildSourceExcerpt(c.concept_literal_from_agreement);
    const candidate: OcrFindingCandidate = {
      finding_type: 'concept_candidate',
      concept_literal_from_agreement: c.concept_literal_from_agreement,
      normalized_concept_key: c.normalized_concept_key,
      payroll_label: c.payroll_label,
      payslip_label: c.payslip_label,
      source_page: context.sourcePageHint ?? null,
      source_article: context.sourceArticleHint ?? null,
      source_annex: context.sourceAnnexHint ?? null,
      source_excerpt: sourceExcerpt,
      raw_text: c.concept_literal_from_agreement,
      confidence: 'low',
      finding_status: 'pending_review',
      requires_human_review: true,
      payload_json: {
        extraction_method: 'text',
        source_document: context.sourceDocument ?? null,
        has_number: false,
      },
    };
    out.push(candidate);
  }

  // 2) Salary-like lines → salary_table_candidate (markers, no amounts).
  const salaryLines = extractSalaryLikeLines(norm);
  for (const sl of salaryLines) {
    if (out.length >= max) break;
    const literal = normalizeAgreementConceptLiteral(sl.line);
    const key = mapAgreementConceptToNormalizedKey(literal);
    const candidate: OcrFindingCandidate = {
      finding_type: 'salary_table_candidate',
      concept_literal_from_agreement: literal,
      normalized_concept_key: key,
      payroll_label: literal,
      payslip_label: literal,
      source_page: sl.page ?? context.sourcePageHint ?? null,
      source_article: context.sourceArticleHint ?? null,
      source_annex: context.sourceAnnexHint ?? null,
      source_excerpt: buildSourceExcerpt(sl.line),
      raw_text: sl.line,
      confidence: 'medium',
      finding_status: 'pending_review',
      requires_human_review: true,
      payload_json: {
        extraction_method: 'text',
        source_document: context.sourceDocument ?? null,
        detector: 'salary_like_line',
        has_number: true,
        requires_manual_amount_review: true,
      },
    };
    out.push(candidate);
  }

  // 3) Rule-like lines → rule_candidate.
  const ruleLines = extractRuleLikeLines(norm);
  for (const rl of ruleLines) {
    if (out.length >= max) break;
    const literal = normalizeAgreementConceptLiteral(rl.line);
    const candidate: OcrFindingCandidate = {
      finding_type: 'rule_candidate',
      concept_literal_from_agreement: literal,
      normalized_concept_key: mapAgreementConceptToNormalizedKey(literal),
      payroll_label: literal,
      payslip_label: literal,
      source_page: rl.page ?? context.sourcePageHint ?? null,
      source_article: context.sourceArticleHint ?? null,
      source_annex: context.sourceAnnexHint ?? null,
      source_excerpt: buildSourceExcerpt(rl.line),
      raw_text: rl.line,
      confidence: 'low',
      finding_status: 'pending_review',
      requires_human_review: true,
      payload_json: {
        extraction_method: 'text',
        source_document: context.sourceDocument ?? null,
        rule_hint: rl.ruleHint,
      },
    };
    out.push(candidate);
  }

  // 4) OCR required marker if printable ratio is low.
  if (isOcrLikelyRequired(norm)) {
    out.push({
      finding_type: 'ocr_required',
      concept_literal_from_agreement: null,
      normalized_concept_key: null,
      payroll_label: null,
      payslip_label: null,
      source_page: context.sourcePageHint ?? null,
      source_article: context.sourceArticleHint ?? null,
      source_annex: context.sourceAnnexHint ?? null,
      source_excerpt: buildSourceExcerpt(norm.slice(0, 280)),
      raw_text: null,
      confidence: 'low',
      finding_status: 'pending_review',
      requires_human_review: true,
      payload_json: {
        extraction_method: 'text',
        source_document: context.sourceDocument ?? null,
        detector: 'low_printable_ratio',
      },
    });
  }

  // Defensive: nothing detected → manual_review_required marker.
  if (out.length === 0) {
    out.push({
      finding_type: 'manual_review_required',
      concept_literal_from_agreement: null,
      normalized_concept_key: null,
      payroll_label: null,
      payslip_label: null,
      source_page: context.sourcePageHint ?? null,
      source_article: context.sourceArticleHint ?? null,
      source_annex: context.sourceAnnexHint ?? null,
      source_excerpt: buildSourceExcerpt(norm.slice(0, 280)),
      raw_text: null,
      confidence: 'low',
      finding_status: 'pending_review',
      requires_human_review: true,
      payload_json: {
        extraction_method: 'text',
        source_document: context.sourceDocument ?? null,
        detector: 'no_findings_detected',
      },
    });
  }

  return out;
}

/**
 * Convenience wrapper that accepts a polymorphic input (text or chunks) and
 * returns deterministic candidates. Provided to keep the edge symmetrical.
 */
export function extractAgreementTextCandidates(
  input: string | OcrEvidenceChunk[],
  options: OcrExtractionOptions & { context?: OcrExtractionContext } = {},
): OcrFindingCandidate[] {
  const ctx = options.context ?? {};
  if (typeof input === 'string') {
    return buildFindingCandidatesFromText(input, ctx, options);
  }
  if (!Array.isArray(input) || input.length === 0) return [];
  const joined = input.map((c) => c.text).join('\n\n');
  return buildFindingCandidatesFromText(joined, ctx, options);
}