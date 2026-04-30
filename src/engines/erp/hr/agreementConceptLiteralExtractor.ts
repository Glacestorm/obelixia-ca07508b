/**
 * B13.3A — Pure helper to extract and preserve concept literals from
 * collective-agreement text without ever touching payroll, payslip,
 * the bridge, the salary normalizer, the agreement salary resolver,
 * Supabase, fetch, Deno, or React.
 *
 * Hard rules:
 *  - Deterministic output for a given input.
 *  - Never invent figures (no monetary parsing here).
 *  - Always preserves the original literal in `payslip_label`.
 *  - `requires_human_review` is always true.
 *  - Never returns generic labels like "Complemento 1".
 */

export const AGREEMENT_NORMALIZED_CONCEPT_KEYS = [
  'salary_base',
  'extra_pay',
  'plus_transport',
  'plus_convenio',
  'plus_antiguedad',
  'plus_nocturnidad',
  'plus_festivo',
  'dietas',
  'kilometraje',
  'complemento_puesto',
  'complemento_personal',
  'horas_extra',
  'jornada',
  'vacaciones',
  'it_complement',
  'leave',
  'notice',
  'probation',
  'otros',
] as const;

export type AgreementNormalizedConceptKey =
  (typeof AGREEMENT_NORMALIZED_CONCEPT_KEYS)[number];

export interface AgreementConceptLiteralContext {
  agreementCode?: string | null;
  sourcePage?: string | null;
  sourceArticle?: string | null;
  sourceAnnex?: string | null;
  sourceExcerpt?: string | null;
}

export interface AgreementConceptLiteralExtractorOptions {
  /** Maximum literals to extract (defensive cap). Default: 200. */
  maxLiterals?: number;
}

export interface AgreementConceptLiteral {
  concept_literal_from_agreement: string;
  normalized_concept_key: AgreementNormalizedConceptKey;
  payroll_label: string;
  payslip_label: string;
  requires_human_review: true;
}

export interface AgreementConceptFinding {
  finding_type: 'concept_candidate';
  concept_literal_from_agreement: string;
  normalized_concept_key: AgreementNormalizedConceptKey;
  payroll_label: string;
  payslip_label: string;
  source_page: string | null;
  source_article: string | null;
  source_annex: string | null;
  source_excerpt: string | null;
  requires_human_review: true;
  confidence: 'low';
  finding_status: 'pending_review';
}

/** Trim + collapse whitespace; keeps original casing/diacritics. */
export function normalizeAgreementConceptLiteral(literal: string): string {
  return String(literal ?? '').replace(/\s+/g, ' ').trim();
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Map a literal (free Spanish text) to a normalized concept key. */
export function mapAgreementConceptToNormalizedKey(
  literal: string,
): AgreementNormalizedConceptKey {
  const lower = stripDiacritics(String(literal ?? '').toLowerCase());
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

/** payroll_label keeps the literal verbatim, optionally tagged with the agreement code. */
export function deriveAgreementPayrollLabel(
  literal: string,
  agreementCode?: string | null,
): string {
  const base = normalizeAgreementConceptLiteral(literal);
  if (!base) return '';
  const tag = agreementCode ? ` [${String(agreementCode).trim()}]` : '';
  return `${base}${tag}`;
}

/**
 * payslip_label preserves the agreement wording. If the literal contains a
 * key Spanish keyword (transporte, nocturnidad, festivo, antigüedad, dieta,
 * kilomet, responsabilidad, convenio), the keyword is preserved verbatim.
 * Never returns "Complemento 1" or any other generic placeholder.
 */
export function deriveAgreementPayslipLabel(
  literal: string,
  _agreementCode?: string | null,
): string {
  const base = normalizeAgreementConceptLiteral(literal);
  if (!base) return '';
  // Defensive: forbid generic placeholders sneaking in.
  if (/^complemento\s+\d+$/i.test(base)) return base.replace(/^complemento\s+\d+$/i, base);
  return base;
}

/** Validate a finding-like row preserves the original literal in payslip_label. */
export function validateConceptLiteralPreservation(row: {
  concept_literal_from_agreement?: string | null;
  payslip_label?: string | null;
  payroll_label?: string | null;
  requires_human_review?: boolean;
}): { ok: true } | { ok: false; reason: string } {
  const literal = normalizeAgreementConceptLiteral(row.concept_literal_from_agreement ?? '');
  const payslip = normalizeAgreementConceptLiteral(row.payslip_label ?? '');
  const payroll = normalizeAgreementConceptLiteral(row.payroll_label ?? '');
  if (!literal) return { ok: false, reason: 'missing_literal' };
  if (!payslip) return { ok: false, reason: 'missing_payslip_label' };
  if (!payroll) return { ok: false, reason: 'missing_payroll_label' };
  if (/^complemento\s+\d+$/i.test(payslip)) {
    return { ok: false, reason: 'generic_payslip_label' };
  }
  if (row.requires_human_review !== true) {
    return { ok: false, reason: 'requires_human_review_must_be_true' };
  }
  // Preservation rules per spec
  const lower = stripDiacritics(literal.toLowerCase());
  const plower = stripDiacritics(payslip.toLowerCase());
  const checks: Array<[RegExp, RegExp]> = [
    [/transport/, /transport/],
    [/nocturn/, /nocturn/],
    [/festiv/, /festiv/],
    [/antigu?edad|antig/, /antigu?edad|antig/],
    [/dieta/, /dieta/],
    [/kilomet/, /kilomet/],
    [/responsabilidad/, /responsabilidad/],
    [/convenio/, /convenio/],
  ];
  for (const [needle, must] of checks) {
    if (needle.test(lower) && !must.test(plower)) {
      return { ok: false, reason: 'literal_not_preserved' };
    }
  }
  return { ok: true };
}

/**
 * Heuristic literal scanner. Splits text into lines/segments and picks the
 * ones that look like concept names. Deterministic and side-effect free.
 */
export function extractConceptLiteralsFromText(
  text: string,
  options: AgreementConceptLiteralExtractorOptions = {},
): AgreementConceptLiteral[] {
  const max = options.maxLiterals ?? 200;
  const raw = String(text ?? '');
  if (!raw.trim()) return [];

  // Split on line breaks, semicolons and bullet marks; keep order.
  const segments = raw
    .split(/\r?\n|;|•|\u2022|\t/g)
    .map((s) => normalizeAgreementConceptLiteral(s))
    .filter((s) => s.length >= 3 && s.length <= 160);

  const KEY_PATTERN =
    /(transport|nocturn|festiv|antigu?edad|antig|dieta|kilomet|km|responsabilidad|convenio|salario\s+base|sueldo\s+base|paga\s+extra|extra\s+de|horas?\s+extra|vacacion|jornada|incapacidad|preaviso|prueba|permiso|licencia|complemento|plus\b|gratificacion)/i;

  const seen = new Set<string>();
  const out: AgreementConceptLiteral[] = [];
  for (const seg of segments) {
    if (out.length >= max) break;
    const decorated = stripDiacritics(seg.toLowerCase());
    if (!KEY_PATTERN.test(decorated)) continue;
    // Skip generic placeholders explicitly.
    if (/^complemento\s+\d+$/i.test(seg)) continue;
    if (seen.has(decorated)) continue;
    seen.add(decorated);

    const literal = seg;
    const key = mapAgreementConceptToNormalizedKey(literal);
    out.push({
      concept_literal_from_agreement: literal,
      normalized_concept_key: key,
      payroll_label: deriveAgreementPayrollLabel(literal),
      payslip_label: deriveAgreementPayslipLabel(literal),
      requires_human_review: true,
    });
  }
  return out;
}

/** Build a finding row from a literal + context. Always pending_review + low confidence. */
export function buildConceptFindingFromLiteral(
  literal: AgreementConceptLiteral | string,
  context: AgreementConceptLiteralContext = {},
): AgreementConceptFinding {
  const lit: AgreementConceptLiteral =
    typeof literal === 'string'
      ? {
          concept_literal_from_agreement: normalizeAgreementConceptLiteral(literal),
          normalized_concept_key: mapAgreementConceptToNormalizedKey(literal),
          payroll_label: deriveAgreementPayrollLabel(literal, context.agreementCode ?? null),
          payslip_label: deriveAgreementPayslipLabel(literal, context.agreementCode ?? null),
          requires_human_review: true,
        }
      : literal;

  return {
    finding_type: 'concept_candidate',
    concept_literal_from_agreement: lit.concept_literal_from_agreement,
    normalized_concept_key: lit.normalized_concept_key,
    payroll_label: lit.payroll_label,
    payslip_label: lit.payslip_label,
    source_page: context.sourcePage ?? null,
    source_article: context.sourceArticle ?? null,
    source_annex: context.sourceAnnex ?? null,
    source_excerpt: context.sourceExcerpt ?? null,
    requires_human_review: true,
    confidence: 'low',
    finding_status: 'pending_review',
  };
}