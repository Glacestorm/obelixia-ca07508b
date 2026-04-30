/**
 * B13.3C — Pure helper for strict salary-table candidate extraction.
 *
 * Hard rules:
 *  - No DB / Supabase / fetch / Deno / React.
 *  - No payroll / payslip / bridge / normalizer / resolver imports.
 *  - parseSpanishMoneyStrict NEVER guesses ambiguous figures: when a string
 *    can be interpreted in more than one decimal/thousands convention, the
 *    returned amount is null and a warning is emitted.
 *  - When professional_group / year cannot be detected → warnings/blockers
 *    and the candidate is NOT marked approved.
 *  - source_excerpt and concept_literal are mandatory; payslip_label
 *    preserves the literal (e.g. "transporte" must remain).
 *  - Output is deterministic.
 */

import {
  mapAgreementConceptToNormalizedKey,
  normalizeAgreementConceptLiteral,
  type AgreementNormalizedConceptKey,
} from './agreementConceptLiteralExtractor';

export interface SalaryTableInputRow {
  raw: string;
  page?: string | null;
  amount?: string | number | null;
  professional_group?: string | null;
  level?: string | null;
  category?: string | null;
  area_code?: string | null;
  area_name?: string | null;
  concept_hint?: string | null;
  year?: number | string | null;
}

export interface SalaryTableContext {
  agreementCode?: string | null;
  defaultYear?: number | null;
  sourceDocument?: string | null;
  sourcePageHint?: string | null;
  sourceArticleHint?: string | null;
  sourceAnnexHint?: string | null;
}

export interface SalaryMoneyParseResult {
  amount: number | null;
  ambiguous: boolean;
  warnings: string[];
  raw: string;
}

export interface SalaryTableCandidate {
  finding_type: 'salary_table_candidate';
  concept_literal_from_agreement: string;
  normalized_concept_key: AgreementNormalizedConceptKey;
  payroll_label: string;
  payslip_label: string;
  source_page: string;
  source_excerpt: string;
  source_article: string | null;
  source_annex: string | null;
  raw_text: string;
  confidence: 'low' | 'medium' | 'high';
  finding_status: 'pending_review';
  requires_human_review: true;
  payload_json: {
    extraction_method: 'text' | 'manual_pasted_table';
    source_document: string | null;
    year: number | null;
    professional_group: string | null;
    level: string | null;
    category: string | null;
    area_code: string | null;
    area_name: string | null;
    amount: number | null;
    amount_raw: string | null;
    amount_ambiguous: boolean;
    currency: 'EUR';
    warnings: string[];
    blockers: string[];
    row_confidence: 'low' | 'medium' | 'high';
    requires_manual_amount_review: true;
  };
}

export interface SalaryTableCandidateValidation {
  ok: boolean;
  warnings: string[];
  blockers: string[];
}

/**
 * Strict Spanish-style money parser:
 *   - "1.234,56"  → 1234.56
 *   - "1234,56"   → 1234.56
 *   - "1234.56"   → 1234.56
 *   - "18.245,30 €" → 18245.30
 * Ambiguous cases (e.g. "1.234" with no decimals or "1,234" with no decimals)
 * return amount=null with ambiguous=true.
 */
export function parseSpanishMoneyStrict(value: unknown): SalaryMoneyParseResult {
  const raw = String(value ?? '').trim();
  const result: SalaryMoneyParseResult = { amount: null, ambiguous: false, warnings: [], raw };
  if (!raw) {
    result.warnings.push('empty_value');
    return result;
  }
  // Strip currency symbol and spaces
  let s = raw
    .replace(/€/g, '')
    .replace(/EUR/gi, '')
    .replace(/\s+/g, '')
    .trim();
  if (!s) {
    result.warnings.push('empty_value_after_currency_strip');
    return result;
  }
  // Allowed chars
  if (!/^[+-]?[\d.,]+$/.test(s)) {
    result.warnings.push('non_numeric_chars');
    return result;
  }
  const sign = s.startsWith('-') ? -1 : 1;
  s = s.replace(/^[+-]/, '');

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  // Both separators present
  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    // Whichever appears last is the decimal separator.
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandsSep = decimalSep === ',' ? '.' : ',';
    const parts = s.split(decimalSep);
    if (parts.length !== 2) {
      result.warnings.push('multiple_decimal_separators');
      return result;
    }
    const intPart = parts[0].split(thousandsSep).join('');
    const decPart = parts[1];
    if (!/^\d+$/.test(intPart) || !/^\d{1,2}$/.test(decPart)) {
      result.warnings.push('invalid_decimal_format');
      return result;
    }
    const n = Number(`${intPart}.${decPart}`);
    if (!Number.isFinite(n)) {
      result.warnings.push('non_finite_number');
      return result;
    }
    result.amount = sign * n;
    return result;
  }

  // Only comma → Spanish decimal (e.g. "1234,56") OR ambiguous thousands ("1,234").
  if (hasComma && !hasDot) {
    const parts = s.split(',');
    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
      result.amount = sign * Number(`${parts[0]}.${parts[1]}`);
      return result;
    }
    // "1,234" (3 digits after comma) → ambiguous (could be thousands en-US).
    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d{3}$/.test(parts[1])) {
      result.ambiguous = true;
      result.warnings.push('ambiguous_comma_three_digits');
      return result;
    }
    result.warnings.push('invalid_comma_format');
    return result;
  }

  // Only dot → en-US decimal ("1234.56") OR ambiguous Spanish thousands ("1.234").
  if (hasDot && !hasComma) {
    const parts = s.split('.');
    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
      result.amount = sign * Number(`${parts[0]}.${parts[1]}`);
      return result;
    }
    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d{3}$/.test(parts[1])) {
      result.ambiguous = true;
      result.warnings.push('ambiguous_dot_three_digits');
      return result;
    }
    if (parts.length > 2 && parts.every((p) => /^\d{1,3}$/.test(p))) {
      // "1.234.567" thousands-only Spanish format → integer amount.
      const joined = parts.join('');
      result.amount = sign * Number(joined);
      return result;
    }
    result.warnings.push('invalid_dot_format');
    return result;
  }

  // Plain integer
  if (/^\d+$/.test(s)) {
    result.amount = sign * Number(s);
    return result;
  }

  result.warnings.push('unrecognized_format');
  return result;
}

export function detectYearFromSalaryContext(text: string): number | null {
  const t = String(text ?? '');
  const matches = t.match(/\b(20\d{2})\b/g);
  if (!matches || matches.length === 0) return null;
  // Use the most recent one (last occurrence) to avoid stale citations.
  const year = Number(matches[matches.length - 1]);
  if (!Number.isFinite(year)) return null;
  if (year < 2000 || year > 2099) return null;
  return year;
}

export function detectProfessionalGroupFromText(text: string): string | null {
  const t = String(text ?? '');
  const m =
    /\bgrupo\s+(?:profesional\s+)?([A-ZÁÉÍÓÚÑ0-9][\wáéíóúñ.\- ]{0,40})/i.exec(t) ||
    /\b(grupo\s+\d+)\b/i.exec(t) ||
    /\bnivel\s+([A-Z0-9][\w.\- ]{0,30})/i.exec(t);
  if (!m) return null;
  return normalizeAgreementConceptLiteral(m[1]).slice(0, 60) || null;
}

export function detectAreaFromText(text: string): { area_code: string | null; area_name: string | null } {
  const t = String(text ?? '');
  const codeMatch = /\b(?:[áa]rea|zona)\s+([A-Z0-9][A-Z0-9\-]{0,15})\b/i.exec(t);
  const nameMatch = /\b(?:[áa]rea|zona)\s+(?:[A-Z0-9][A-Z0-9\-]{0,15}\s+)?([A-ZÁÉÍÓÚÑa-záéíóúñ ]{3,40})\b/i.exec(t);
  return {
    area_code: codeMatch ? codeMatch[1] : null,
    area_name: nameMatch ? normalizeAgreementConceptLiteral(nameMatch[1]).slice(0, 60) : null,
  };
}

export function detectLevelFromText(text: string): string | null {
  const m = /\bnivel\s+([A-Z0-9][\w.\- ]{0,20})/i.exec(String(text ?? ''));
  if (!m) return null;
  return normalizeAgreementConceptLiteral(m[1]).slice(0, 40) || null;
}

export function validateSalaryTableCandidate(
  c: SalaryTableCandidate,
): SalaryTableCandidateValidation {
  const warnings: string[] = [];
  const blockers: string[] = [];
  if (!c.concept_literal_from_agreement) blockers.push('missing_concept_literal');
  if (!c.payslip_label) blockers.push('missing_payslip_label');
  if (!c.source_page) blockers.push('missing_source_page');
  if (!c.source_excerpt) blockers.push('missing_source_excerpt');
  if (c.requires_human_review !== true) blockers.push('requires_human_review_must_be_true');
  if (c.finding_status !== 'pending_review') blockers.push('finding_status_must_be_pending_review');
  const p = c.payload_json;
  if (p.year === null) warnings.push('missing_year');
  if (!p.professional_group) warnings.push('missing_professional_group');
  if (p.amount === null) warnings.push('missing_amount');
  if (p.amount_ambiguous) warnings.push('amount_ambiguous');
  return { ok: blockers.length === 0, warnings: [...warnings, ...p.warnings], blockers };
}

export function buildSalaryTableFindingPayload(
  candidate: SalaryTableCandidate,
): Record<string, unknown> {
  // Mirror to a finding-row shape suitable for insertion in
  // erp_hr_collective_agreement_extraction_findings.
  return {
    finding_type: candidate.finding_type,
    concept_literal_from_agreement: candidate.concept_literal_from_agreement,
    normalized_concept_key: candidate.normalized_concept_key,
    payroll_label: candidate.payroll_label,
    payslip_label: candidate.payslip_label,
    source_page: candidate.source_page,
    source_article: candidate.source_article,
    source_annex: candidate.source_annex,
    source_excerpt: candidate.source_excerpt,
    raw_text: candidate.raw_text,
    confidence: candidate.confidence,
    finding_status: candidate.finding_status,
    requires_human_review: true,
    payload_json: { ...candidate.payload_json },
  };
}

function literalForRow(row: SalaryTableInputRow): string {
  if (row.concept_hint && row.concept_hint.trim()) {
    return normalizeAgreementConceptLiteral(row.concept_hint);
  }
  return normalizeAgreementConceptLiteral(row.raw).slice(0, 200) || 'tabla salarial';
}

/**
 * Build candidates from manual / structured rows (e.g. pasted table). Only
 * rows with unambiguous money strings produce a final amount; otherwise they
 * still emit a candidate but with amount=null + warnings.
 */
export function extractSalaryTableCandidatesFromRows(
  rows: SalaryTableInputRow[],
  context: SalaryTableContext = {},
): SalaryTableCandidate[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const out: SalaryTableCandidate[] = [];
  for (const row of rows) {
    const literal = literalForRow(row);
    const key = mapAgreementConceptToNormalizedKey(literal);
    const parsed = parseSpanishMoneyStrict(row.amount ?? '');
    const yearDetected =
      typeof row.year === 'number' && Number.isFinite(row.year)
        ? Math.trunc(row.year)
        : typeof row.year === 'string' && /^\d{4}$/.test(row.year)
          ? Number(row.year)
          : context.defaultYear ?? detectYearFromSalaryContext(row.raw ?? '');
    const pg =
      (row.professional_group && normalizeAgreementConceptLiteral(row.professional_group).slice(0, 60)) ||
      detectProfessionalGroupFromText(row.raw ?? '');
    const level =
      (row.level && normalizeAgreementConceptLiteral(row.level).slice(0, 40)) ||
      detectLevelFromText(row.raw ?? '');
    const area = detectAreaFromText(row.raw ?? '');
    const sourcePage = String(row.page ?? context.sourcePageHint ?? '').trim() || 'unknown';
    const excerpt = normalizeAgreementConceptLiteral(row.raw ?? literal).slice(0, 280);

    const warnings: string[] = [...parsed.warnings];
    const blockers: string[] = [];
    if (!literal) blockers.push('missing_concept_literal');
    if (yearDetected === null) warnings.push('year_undetected');
    if (!pg) warnings.push('professional_group_undetected');
    if (parsed.ambiguous) warnings.push('amount_ambiguous');
    if (parsed.amount === null) warnings.push('amount_unparsed');

    const candidate: SalaryTableCandidate = {
      finding_type: 'salary_table_candidate',
      concept_literal_from_agreement: literal,
      normalized_concept_key: key,
      payroll_label: literal,
      payslip_label: literal,
      source_page: sourcePage,
      source_excerpt: excerpt || literal,
      source_article: context.sourceArticleHint ?? null,
      source_annex: context.sourceAnnexHint ?? null,
      raw_text: row.raw,
      confidence: parsed.amount !== null && pg && yearDetected !== null ? 'medium' : 'low',
      finding_status: 'pending_review',
      requires_human_review: true,
      payload_json: {
        extraction_method: 'manual_pasted_table',
        source_document: context.sourceDocument ?? null,
        year: yearDetected ?? null,
        professional_group: pg ?? row.professional_group ?? null,
        level: level ?? row.level ?? null,
        category: row.category ?? null,
        area_code: row.area_code ?? area.area_code,
        area_name: row.area_name ?? area.area_name,
        amount: parsed.amount,
        amount_raw: parsed.raw || null,
        amount_ambiguous: parsed.ambiguous,
        currency: 'EUR',
        warnings,
        blockers,
        row_confidence: parsed.amount !== null && pg && yearDetected !== null ? 'medium' : 'low',
        requires_manual_amount_review: true,
      },
    };
    out.push(candidate);
  }
  return out;
}

/**
 * Build candidates from a free-text body. Uses the salary-like line detector
 * to locate plausible rows, attempts to parse the trailing money token, and
 * emits a candidate per row with strict warnings.
 */
export function extractSalaryTableCandidatesFromText(
  text: string,
  context: SalaryTableContext = {},
): SalaryTableCandidate[] {
  const t = String(text ?? '');
  if (!t.trim()) return [];
  const out: SalaryTableCandidate[] = [];
  const lines = t.split(/\r?\n/);
  let currentPage: string | null = context.sourcePageHint ?? null;
  for (const raw of lines) {
    const pm = /^\s*(?:p[áa]gina|page)\s+(\d{1,4})\b/i.exec(raw);
    if (pm) {
      currentPage = pm[1];
      continue;
    }
    const line = raw.trim();
    if (line.length < 6 || line.length > 400) continue;
    if (
      !/(salario|sueldo|base|paga\s+extra|plus|antig|transport|nocturn|festiv|complemento|tabla|nivel|grupo|categor[ií]a)/i.test(
        line,
      )
    ) {
      continue;
    }
    const moneyMatch = line.match(/(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{1,2}|-?\d+[.,]\d{1,2}|-?\d{4,})/g);
    if (!moneyMatch || moneyMatch.length === 0) continue;
    // Use last token (typically the salary column).
    const moneyToken = moneyMatch[moneyMatch.length - 1];
    const candidates = extractSalaryTableCandidatesFromRows(
      [
        {
          raw: line,
          page: currentPage,
          amount: moneyToken,
        },
      ],
      context,
    );
    for (const c of candidates) {
      // Switch extraction_method to text when coming from text body.
      c.payload_json.extraction_method = 'text';
      out.push(c);
    }
  }
  return out;
}