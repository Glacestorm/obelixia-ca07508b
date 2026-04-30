/**
 * B13.3B.1 — Pure helper to map an extraction finding into a salary table
 * staging row PENDING human review.
 *
 * Hard rules:
 *  - Pure / deterministic. No fetch, no Supabase, no Deno, no React.
 *  - Never invents importes. Numbers must come from finding payload.
 *  - Always sets requires_human_review = true.
 *  - Never sets human_approved_*, ready_for_payroll, salary_tables_loaded,
 *    data_completeness='human_validated'.
 *  - Defaults currency to 'EUR'.
 *  - Preserves the agreement literal in payslip_label.
 *  - Never returns generic labels.
 */

export const ALLOWED_STAGING_FINDING_TYPES = [
  'salary_table_candidate',
  'concept_candidate',
] as const;

export const BLOCKED_STAGING_FINDING_TYPES = [
  'metadata_candidate',
  'classification_candidate',
  'ocr_required',
  'manual_review_required',
  'rule_candidate', // Deferred to a future build; not salary-table staging.
] as const;

export type StagingExtractionMethod = 'ocr' | 'manual_csv' | 'manual_form';

export type StagingApprovalMode =
  | 'ocr_single_human_approval'
  | 'ocr_dual_human_approval'
  | 'manual_upload_single_approval'
  | 'manual_upload_dual_approval';

export type StagingValidationStatus =
  | 'ocr_pending_review'
  | 'manual_pending_review';

export interface ExtractionFindingForMapping {
  id?: string;
  extraction_run_id?: string | null;
  intake_id?: string | null;
  agreement_id: string | null;
  version_id: string | null;
  finding_type: string;
  concept_literal_from_agreement?: string | null;
  normalized_concept_key?: string | null;
  payroll_label?: string | null;
  payslip_label?: string | null;
  source_page?: string | null;
  source_excerpt?: string | null;
  source_article?: string | null;
  source_annex?: string | null;
  raw_text?: string | null;
  confidence?: 'low' | 'medium' | 'high' | null;
  requires_human_review?: boolean;
  finding_status?: string;
  payload_json?: Record<string, unknown> | null;
}

export interface MapFindingToStagingOptions {
  /** Force dual approval; default is single. */
  approvalDual?: boolean;
  /** Override extraction method; defaults inferred from finding. */
  extractionMethod?: StagingExtractionMethod;
  /** Optional document hash from the intake / run; used as source_document fallback. */
  sourceDocumentFromIntake?: string | null;
}

export interface ValidationFailure {
  ok: false;
  code: 'FINDING_NOT_STAGING_READY' | 'APPROVAL_BLOCKED';
  reason: string;
}
export interface ValidationOk {
  ok: true;
}
export type ValidationResult = ValidationOk | ValidationFailure;

const KEYWORDS: Array<[RegExp, RegExp]> = [
  [/transport/, /transport/],
  [/nocturn/, /nocturn/],
  [/festiv/, /festiv/],
  [/antigu?edad|antig/, /antigu?edad|antig/],
  [/dieta/, /dieta/],
  [/kilomet/, /kilomet/],
  [/responsabilidad/, /responsabilidad/],
  [/convenio/, /convenio/],
];

function strip(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function nonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}
function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}
function nonNegativeOrNull(v: unknown): number | null {
  const n = num(v);
  if (n === null) return null;
  if (n < 0) throw new Error('NEGATIVE_AMOUNT');
  return n;
}
function preservesKeyword(literal: string, payslip: string): boolean {
  const l = strip(literal.toLowerCase());
  const p = strip(payslip.toLowerCase());
  for (const [needle, must] of KEYWORDS) {
    if (needle.test(l) && !must.test(p)) return false;
  }
  return true;
}

export function inferExtractionMethodFromFinding(
  f: ExtractionFindingForMapping,
): StagingExtractionMethod {
  const payload = (f.payload_json ?? {}) as Record<string, unknown>;
  const hint = String(payload.extraction_method ?? '').toLowerCase();
  if (hint === 'ocr') return 'ocr';
  if (hint === 'manual_csv') return 'manual_csv';
  if (hint === 'manual_form') return 'manual_form';
  if (f.confidence === 'low' && payload.row_confidence) return 'ocr';
  return 'manual_form';
}

export function inferApprovalModeFromFinding(
  f: ExtractionFindingForMapping,
  options: MapFindingToStagingOptions = {},
): StagingApprovalMode {
  const method = options.extractionMethod ?? inferExtractionMethodFromFinding(f);
  const dual = options.approvalDual === true;
  if (method === 'ocr') return dual ? 'ocr_dual_human_approval' : 'ocr_single_human_approval';
  return dual ? 'manual_upload_dual_approval' : 'manual_upload_single_approval';
}

export function mapFindingPayloadAmounts(
  payload: Record<string, unknown> | null | undefined,
): {
  year: number | null;
  professional_group: string | null;
  level: string | null;
  category: string | null;
  area_code: string | null;
  area_name: string | null;
  salary_base_annual: number | null;
  salary_base_monthly: number | null;
  extra_pay_amount: number | null;
  plus_convenio_annual: number | null;
  plus_convenio_monthly: number | null;
  plus_transport: number | null;
  plus_antiguedad: number | null;
  other_amount: number | null;
  currency: string;
  row_confidence: string | null;
  taxable_irpf_hint: boolean | null;
  cotization_included_hint: boolean | null;
  cra_code_suggested: string | null;
} {
  const p = (payload ?? {}) as Record<string, unknown>;
  const year = num(p.year);
  return {
    year: year !== null ? Math.trunc(year) : null,
    professional_group: nonEmpty(p.professional_group) ? (p.professional_group as string) : null,
    level: nonEmpty(p.level) ? (p.level as string) : null,
    category: nonEmpty(p.category) ? (p.category as string) : null,
    area_code: nonEmpty(p.area_code) ? (p.area_code as string) : null,
    area_name: nonEmpty(p.area_name) ? (p.area_name as string) : null,
    salary_base_annual: nonNegativeOrNull(p.salary_base_annual),
    salary_base_monthly: nonNegativeOrNull(p.salary_base_monthly),
    extra_pay_amount: nonNegativeOrNull(p.extra_pay_amount),
    plus_convenio_annual: nonNegativeOrNull(p.plus_convenio_annual),
    plus_convenio_monthly: nonNegativeOrNull(p.plus_convenio_monthly),
    plus_transport: nonNegativeOrNull(p.plus_transport ?? p.amount_transport),
    plus_antiguedad: nonNegativeOrNull(p.plus_antiguedad),
    other_amount: nonNegativeOrNull(p.other_amount ?? p.amount),
    currency: nonEmpty(p.currency) ? (p.currency as string).toUpperCase() : 'EUR',
    row_confidence: nonEmpty(p.row_confidence) ? (p.row_confidence as string) : null,
    taxable_irpf_hint: typeof p.taxable_irpf_hint === 'boolean' ? p.taxable_irpf_hint : null,
    cotization_included_hint:
      typeof p.cotization_included_hint === 'boolean' ? p.cotization_included_hint : null,
    cra_code_suggested: nonEmpty(p.cra_code_suggested) ? (p.cra_code_suggested as string) : null,
  };
}

export function buildStagingSourceFields(
  f: ExtractionFindingForMapping,
  options: MapFindingToStagingOptions = {},
): {
  source_document: string;
  source_page: string;
  source_excerpt: string;
  source_article: string | null;
  source_annex: string | null;
  ocr_raw_text: string | null;
} {
  const payload = (f.payload_json ?? {}) as Record<string, unknown>;
  const sourceDoc =
    options.sourceDocumentFromIntake ??
    (nonEmpty(payload.source_document) ? (payload.source_document as string) : null) ??
    (nonEmpty(payload.document_hash) ? (payload.document_hash as string) : null) ??
    'extraction_finding';
  return {
    source_document: sourceDoc,
    source_page: String(f.source_page ?? '').trim(),
    source_excerpt: String(f.source_excerpt ?? '').trim(),
    source_article: nonEmpty(f.source_article) ? f.source_article : null,
    source_annex: nonEmpty(f.source_annex) ? f.source_annex : null,
    ocr_raw_text: nonEmpty(f.raw_text) ? f.raw_text : null,
  };
}

/** Stable JSON-string hash basis for a finding-to-staging mapping. */
export function computeFindingToStagingHash(f: ExtractionFindingForMapping): string {
  const subset = {
    finding_id: f.id ?? null,
    agreement_id: f.agreement_id ?? null,
    version_id: f.version_id ?? null,
    finding_type: f.finding_type,
    concept: f.concept_literal_from_agreement ?? null,
    key: f.normalized_concept_key ?? null,
    payslip: f.payslip_label ?? null,
    source_page: f.source_page ?? null,
    payload: f.payload_json ?? null,
  };
  return JSON.stringify(subset);
}

export function validateFindingStagingReadiness(
  f: ExtractionFindingForMapping,
): ValidationResult {
  if (!ALLOWED_STAGING_FINDING_TYPES.includes(f.finding_type as 'concept_candidate')) {
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'finding_type_not_allowed' };
  }
  if (
    f.finding_status !== 'pending_review' &&
    f.finding_status !== 'needs_correction'
  ) {
    return {
      ok: false,
      code: 'FINDING_NOT_STAGING_READY',
      reason: 'finding_status_not_review_ready',
    };
  }
  if (!nonEmpty(f.agreement_id)) {
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_agreement_id' };
  }
  if (!nonEmpty(f.version_id)) {
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_version_id' };
  }
  if (!nonEmpty(f.source_page)) {
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_source_page' };
  }
  if (!nonEmpty(f.source_excerpt)) {
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_source_excerpt' };
  }
  if (!nonEmpty(f.concept_literal_from_agreement)) {
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_concept_literal' };
  }
  if (!nonEmpty(f.normalized_concept_key)) {
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_normalized_key' };
  }
  if (!nonEmpty(f.payslip_label)) {
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_payslip_label' };
  }
  if (f.requires_human_review !== true) {
    return {
      ok: false,
      code: 'FINDING_NOT_STAGING_READY',
      reason: 'requires_human_review_must_be_true',
    };
  }
  if (
    !preservesKeyword(
      String(f.concept_literal_from_agreement),
      String(f.payslip_label),
    )
  ) {
    return { ok: false, code: 'APPROVAL_BLOCKED', reason: 'literal_not_preserved' };
  }

  const payload = (f.payload_json ?? {}) as Record<string, unknown>;
  const amounts = (() => {
    try {
      return mapFindingPayloadAmounts(payload);
    } catch (e) {
      return null;
    }
  })();
  if (amounts === null) {
    return { ok: false, code: 'APPROVAL_BLOCKED', reason: 'negative_amount' };
  }
  if (amounts.year === null) {
    return { ok: false, code: 'FINDING_NOT_STAGING_READY', reason: 'missing_year' };
  }
  if (!amounts.professional_group) {
    return {
      ok: false,
      code: 'FINDING_NOT_STAGING_READY',
      reason: 'missing_professional_group',
    };
  }
  const hasAnyAmount =
    amounts.salary_base_annual !== null ||
    amounts.salary_base_monthly !== null ||
    amounts.extra_pay_amount !== null ||
    amounts.plus_convenio_annual !== null ||
    amounts.plus_convenio_monthly !== null ||
    amounts.plus_transport !== null ||
    amounts.plus_antiguedad !== null ||
    amounts.other_amount !== null;
  if (!hasAnyAmount) {
    return {
      ok: false,
      code: 'FINDING_NOT_STAGING_READY',
      reason: 'missing_amount_field',
    };
  }

  const method = inferExtractionMethodFromFinding(f);
  if (method === 'ocr' && !nonEmpty(amounts.row_confidence)) {
    return {
      ok: false,
      code: 'FINDING_NOT_STAGING_READY',
      reason: 'ocr_missing_row_confidence',
    };
  }

  return { ok: true };
}

export function mapExtractionFindingToSalaryStagingRow(
  f: ExtractionFindingForMapping,
  options: MapFindingToStagingOptions = {},
): Record<string, unknown> {
  const validation = validateFindingStagingReadiness(f);
  if (!validation.ok) {
    throw new Error(`${validation.code}:${validation.reason}`);
  }
  const method = options.extractionMethod ?? inferExtractionMethodFromFinding(f);
  const approval_mode = inferApprovalModeFromFinding(f, options);
  const validation_status: StagingValidationStatus =
    method === 'ocr' ? 'ocr_pending_review' : 'manual_pending_review';

  const amounts = mapFindingPayloadAmounts(f.payload_json ?? {});
  const sources = buildStagingSourceFields(f, options);

  let row_confidence = amounts.row_confidence;
  if (method === 'ocr' && (!row_confidence || row_confidence.length === 0)) {
    row_confidence = 'ocr_low';
  }

  return {
    agreement_id: f.agreement_id,
    version_id: f.version_id,
    source_document: sources.source_document,
    source_page: sources.source_page,
    source_excerpt: sources.source_excerpt,
    source_article: sources.source_article,
    source_annex: sources.source_annex,
    ocr_raw_text: sources.ocr_raw_text,
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
    payroll_label:
      nonEmpty(f.payroll_label) ? f.payroll_label : f.concept_literal_from_agreement,
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
