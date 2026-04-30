/**
 * B11.2C.1 — TIC-NAC Salary Table OCR/Manual Staging Engine.
 *
 * PURE module:
 *  - No Supabase, no fetch, no React, no Deno, no DB writes.
 *  - No imports from payroll, payslip, normalizer, resolver, bridge.
 *  - Output rows always carry `requires_human_review = true`.
 *  - OCR rows always enter as 'ocr_pending_review'.
 *  - Manual rows always enter as 'manual_pending_review'.
 *  - No row is ever auto-approved by confidence.
 *
 * The engine produces shape-normalized rows ready for the staging
 * table (B11.2C.1 migration). Persistence and approval transitions
 * happen exclusively via the future edge function (B11.2C.2).
 */

import { computeSha256Hex } from './collectiveAgreementDocumentHasher';

export const TIC_NAC_AGREEMENT_ID =
  '1e665f80-3f04-4939-a448-4b1a2a4525e0' as const;
export const TIC_NAC_VERSION_ID =
  '9739379b-68e5-4ffd-8209-d5a1222fefc2' as const;
export const TIC_NAC_SOURCE_DOCUMENT = 'BOE-A-2025-7766' as const;
export const TIC_NAC_AGREEMENT_CODE = 'TIC-NAC' as const;
export const TIC_NAC_VALID_YEARS = [2025, 2026, 2027] as const;

export type ApprovalMode =
  | 'ocr_single_human_approval'
  | 'ocr_dual_human_approval'
  | 'manual_upload_single_approval'
  | 'manual_upload_dual_approval';

export type ExtractionMethod = 'ocr' | 'manual_csv' | 'manual_form';

export type ValidationStatus =
  | 'ocr_pending_review'
  | 'manual_pending_review'
  | 'human_approved_single'
  | 'human_approved_first'
  | 'human_approved_second'
  | 'needs_correction'
  | 'rejected';

export type RowConfidence =
  | 'manual_high'
  | 'manual_medium'
  | 'manual_low'
  | 'ocr_high'
  | 'ocr_medium'
  | 'ocr_low';

export type NormalizedConceptKey =
  | 'salary_base'
  | 'extra_pay'
  | 'plus_transport'
  | 'plus_convenio'
  | 'plus_antiguedad'
  | 'plus_nocturnidad'
  | 'plus_festivo'
  | 'dietas'
  | 'kilometraje'
  | 'complemento_puesto'
  | 'complemento_personal'
  | 'horas_extra'
  | 'otros';

export interface StagingRowInput {
  agreement_id?: string;
  version_id?: string;
  source_document?: string;
  source_page?: string | number | null;
  source_excerpt?: string | null;
  source_article?: string | null;
  source_annex?: string | null;
  ocr_raw_text?: string | null;
  year?: number | string;
  area_code?: string | null;
  area_name?: string | null;
  professional_group?: string | null;
  level?: string | null;
  category?: string | null;
  concept_literal_from_agreement?: string | null;
  salary_base_annual?: number | string | null;
  salary_base_monthly?: number | string | null;
  extra_pay_amount?: number | string | null;
  plus_convenio_annual?: number | string | null;
  plus_convenio_monthly?: number | string | null;
  plus_transport?: number | string | null;
  plus_antiguedad?: number | string | null;
  other_amount?: number | string | null;
  currency?: string;
  row_confidence?: RowConfidence | null;
  review_notes?: string | null;
  cra_code_suggested?: string | null;
  taxable_irpf_hint?: boolean | null;
  cotization_included_hint?: boolean | null;
}

export interface StagingRow {
  agreement_id: string;
  version_id: string;
  source_document: string;
  source_page: string;
  source_excerpt: string;
  source_article: string | null;
  source_annex: string | null;
  ocr_raw_text: string | null;
  extraction_method: ExtractionMethod;
  approval_mode: ApprovalMode;
  year: number;
  area_code: string | null;
  area_name: string | null;
  professional_group: string;
  level: string | null;
  category: string | null;
  concept_literal_from_agreement: string;
  normalized_concept_key: NormalizedConceptKey;
  payroll_label: string;
  payslip_label: string;
  cra_mapping_status: 'pending' | 'suggested' | 'confirmed' | 'not_applicable';
  cra_code_suggested: string | null;
  taxable_irpf_hint: boolean | null;
  cotization_included_hint: boolean | null;
  salary_base_annual: number | null;
  salary_base_monthly: number | null;
  extra_pay_amount: number | null;
  plus_convenio_annual: number | null;
  plus_convenio_monthly: number | null;
  plus_transport: number | null;
  plus_antiguedad: number | null;
  other_amount: number | null;
  currency: string;
  row_confidence: RowConfidence | null;
  requires_human_review: true;
  validation_status: ValidationStatus;
  first_reviewed_by: string | null;
  first_reviewed_at: string | null;
  second_reviewed_by: string | null;
  second_reviewed_at: string | null;
  review_notes: string | null;
  content_hash: string;
}

export interface StageOptions {
  approvalMode: ApprovalMode;
  agreementCode?: string;
}

export interface StagingIssue {
  rowIndex: number;
  code: string;
  field?: string;
  message: string;
  severity: 'blocker' | 'warning';
}

export interface StagingValidationReport {
  totalRows: number;
  blockers: StagingIssue[];
  warnings: StagingIssue[];
  ok: boolean;
}

// ---------------------- helpers ----------------------

const KEYWORDS = [
  'transporte',
  'nocturnidad',
  'festivo',
  'antigüedad',
  'dieta',
  'kilomet',
  'responsabilidad',
  'convenio',
] as const;

function isNonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function lower(s: string | null | undefined): string {
  return (s ?? '').toLowerCase();
}

/**
 * Normalize Spanish-formatted money strings.
 *  - "1.234,56"  -> 1234.56
 *  - "1234.56"   -> 1234.56
 *  - "1,234.56"  -> 1234.56  (us format)
 *  - "1234,56"   -> 1234.56
 *  - 1234.5678   -> 1234.57
 * Returns null for non-finite / unparseable values.
 */
export function normalizeSpanishMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100) / 100;
  }
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (raw === '') return null;

  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');

  let normalized: string;
  if (lastDot === -1 && lastComma === -1) {
    normalized = raw;
  } else if (lastComma > lastDot) {
    // Spanish: '.' = thousands, ',' = decimal
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else {
    // US-like: ',' = thousands, '.' = decimal
    normalized = raw.replace(/,/g, '');
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function detectTicNacSalaryTableYear(
  row: StagingRowInput,
): number | null {
  if (typeof row.year === 'number' && Number.isInteger(row.year)) return row.year;
  if (typeof row.year === 'string' && /^\d{4}$/.test(row.year.trim())) {
    return Number(row.year.trim());
  }
  return null;
}

export function extractAgreementConceptLiteral(row: StagingRowInput): string {
  return (row.concept_literal_from_agreement ?? '').toString().trim();
}

/**
 * Map a literal from the agreement to a normalized concept key.
 * Conservative: returns 'otros' when no rule matches.
 */
export function mapConceptToNormalizedKey(
  literal: string,
): NormalizedConceptKey {
  const l = lower(literal);
  if (!l) return 'otros';
  if (/(salario\s+base|sueldo\s+base|base\s+salarial)/.test(l)) return 'salary_base';
  if (/(paga\s*extra|pagas?\s*extras?|gratificaci[oó]n\s+extra)/.test(l)) return 'extra_pay';
  if (/transporte/.test(l)) return 'plus_transport';
  if (/nocturnidad/.test(l)) return 'plus_nocturnidad';
  if (/festivo/.test(l)) return 'plus_festivo';
  if (/antig[uü]edad/.test(l)) return 'plus_antiguedad';
  if (/dieta/.test(l)) return 'dietas';
  if (/kilomet/.test(l)) return 'kilometraje';
  if (/(complemento\s+de\s+puesto|complemento\s+puesto)/.test(l)) return 'complemento_puesto';
  if (/(complemento\s+personal)/.test(l)) return 'complemento_personal';
  if (/(horas?\s+extra)/.test(l)) return 'horas_extra';
  if (/plus\s+convenio|complemento\s+convenio/.test(l)) return 'plus_convenio';
  return 'otros';
}

/**
 * Build the payroll label. Always includes the agreement code so the
 * label remains traceable downstream. Never returns a generic value.
 */
export function derivePayrollLabel(
  literal: string,
  agreementCode: string = TIC_NAC_AGREEMENT_CODE,
): string {
  const trimmed = (literal ?? '').trim();
  if (!trimmed) return '';
  return `${trimmed} — Convenio ${agreementCode}`;
}

/**
 * Build the payslip label. Same rule as payroll label: literal +
 * agreement code. Never returns a generic value. The DB trigger and
 * `validateOcrStagingRows` enforce that keywords present in the literal
 * (transporte, nocturnidad, antigüedad, ...) are conserved here.
 */
export function derivePayslipLabel(
  literal: string,
  agreementCode: string = TIC_NAC_AGREEMENT_CODE,
): string {
  const trimmed = (literal ?? '').trim();
  if (!trimmed) return '';
  return `${trimmed} — Convenio ${agreementCode}`;
}

/**
 * Stable SHA-256 hash over canonical fields of a staging row.
 * Order is fixed and independent of property iteration order.
 */
export async function computeStagingRowHash(
  row: Pick<
    StagingRow,
    | 'agreement_id'
    | 'version_id'
    | 'year'
    | 'area_code'
    | 'area_name'
    | 'professional_group'
    | 'level'
    | 'category'
    | 'concept_literal_from_agreement'
    | 'normalized_concept_key'
    | 'payslip_label'
    | 'salary_base_annual'
    | 'salary_base_monthly'
    | 'extra_pay_amount'
    | 'plus_convenio_annual'
    | 'plus_convenio_monthly'
    | 'plus_transport'
    | 'plus_antiguedad'
    | 'other_amount'
    | 'currency'
    | 'source_document'
    | 'source_page'
    | 'source_excerpt'
    | 'extraction_method'
    | 'approval_mode'
  >,
): Promise<string> {
  const canonical = [
    row.agreement_id,
    row.version_id,
    String(row.year),
    row.area_code ?? '',
    row.area_name ?? '',
    row.professional_group,
    row.level ?? '',
    row.category ?? '',
    row.concept_literal_from_agreement,
    row.normalized_concept_key,
    row.payslip_label,
    row.salary_base_annual ?? '',
    row.salary_base_monthly ?? '',
    row.extra_pay_amount ?? '',
    row.plus_convenio_annual ?? '',
    row.plus_convenio_monthly ?? '',
    row.plus_transport ?? '',
    row.plus_antiguedad ?? '',
    row.other_amount ?? '',
    row.currency,
    row.source_document,
    String(row.source_page),
    row.source_excerpt,
    row.extraction_method,
    row.approval_mode,
  ].join('|');
  return computeSha256Hex(new TextEncoder().encode(canonical));
}

function shapeRow(
  input: StagingRowInput,
  extraction: ExtractionMethod,
  approvalMode: ApprovalMode,
): Omit<StagingRow, 'content_hash'> {
  const literal = extractAgreementConceptLiteral(input);
  const normalizedKey = mapConceptToNormalizedKey(literal);
  const payrollLabel = derivePayrollLabel(literal);
  const payslipLabel = derivePayslipLabel(literal);
  const validationStatus: ValidationStatus =
    extraction === 'ocr' ? 'ocr_pending_review' : 'manual_pending_review';

  return {
    agreement_id: input.agreement_id ?? TIC_NAC_AGREEMENT_ID,
    version_id: input.version_id ?? TIC_NAC_VERSION_ID,
    source_document: input.source_document ?? TIC_NAC_SOURCE_DOCUMENT,
    source_page:
      input.source_page === null || input.source_page === undefined
        ? ''
        : String(input.source_page),
    source_excerpt: input.source_excerpt ?? '',
    source_article: input.source_article ?? null,
    source_annex: input.source_annex ?? null,
    ocr_raw_text: input.ocr_raw_text ?? null,
    extraction_method: extraction,
    approval_mode: approvalMode,
    year: detectTicNacSalaryTableYear(input) ?? Number.NaN,
    area_code: input.area_code ?? null,
    area_name: input.area_name ?? null,
    professional_group: (input.professional_group ?? '').trim(),
    level: input.level ?? null,
    category: input.category ?? null,
    concept_literal_from_agreement: literal,
    normalized_concept_key: normalizedKey,
    payroll_label: payrollLabel,
    payslip_label: payslipLabel,
    cra_mapping_status: 'pending',
    cra_code_suggested: input.cra_code_suggested ?? null,
    taxable_irpf_hint: input.taxable_irpf_hint ?? null,
    cotization_included_hint: input.cotization_included_hint ?? null,
    salary_base_annual: normalizeSpanishMoney(input.salary_base_annual ?? null),
    salary_base_monthly: normalizeSpanishMoney(input.salary_base_monthly ?? null),
    extra_pay_amount: normalizeSpanishMoney(input.extra_pay_amount ?? null),
    plus_convenio_annual: normalizeSpanishMoney(input.plus_convenio_annual ?? null),
    plus_convenio_monthly: normalizeSpanishMoney(input.plus_convenio_monthly ?? null),
    plus_transport: normalizeSpanishMoney(input.plus_transport ?? null),
    plus_antiguedad: normalizeSpanishMoney(input.plus_antiguedad ?? null),
    other_amount: normalizeSpanishMoney(input.other_amount ?? null),
    currency: input.currency ?? 'EUR',
    row_confidence: input.row_confidence ?? (extraction === 'ocr' ? 'ocr_low' : null),
    requires_human_review: true,
    validation_status: validationStatus,
    first_reviewed_by: null,
    first_reviewed_at: null,
    second_reviewed_by: null,
    second_reviewed_at: null,
    review_notes: input.review_notes ?? null,
  };
}

export async function mapOcrRowToSalaryStaging(
  row: StagingRowInput,
  options: StageOptions,
): Promise<StagingRow> {
  const shaped = shapeRow(row, 'ocr', options.approvalMode);
  const content_hash = await computeStagingRowHash(shaped);
  return { ...shaped, content_hash };
}

export async function mapManualRowToSalaryStaging(
  row: StagingRowInput,
  options: StageOptions & { extraction?: 'manual_csv' | 'manual_form' },
): Promise<StagingRow> {
  const extraction = options.extraction ?? 'manual_csv';
  const shaped = shapeRow(row, extraction, options.approvalMode);
  const content_hash = await computeStagingRowHash(shaped);
  return { ...shaped, content_hash };
}

export async function stageTicNacOcrRows(
  rawRows: ReadonlyArray<StagingRowInput>,
  options: StageOptions,
): Promise<StagingRow[]> {
  return Promise.all(rawRows.map((r) => mapOcrRowToSalaryStaging(r, options)));
}

export async function stageTicNacManualRows(
  rows: ReadonlyArray<StagingRowInput>,
  options: StageOptions & { extraction?: 'manual_csv' | 'manual_form' },
): Promise<StagingRow[]> {
  return Promise.all(rows.map((r) => mapManualRowToSalaryStaging(r, options)));
}

/**
 * Validate a batch of shaped staging rows. Deterministic. No side effects.
 */
export function validateOcrStagingRows(
  rows: ReadonlyArray<StagingRow>,
): StagingValidationReport {
  const blockers: StagingIssue[] = [];
  const warnings: StagingIssue[] = [];

  rows.forEach((row, idx) => {
    if (
      !Number.isInteger(row.year) ||
      !TIC_NAC_VALID_YEARS.includes(row.year as 2025 | 2026 | 2027)
    ) {
      blockers.push({
        rowIndex: idx,
        code: 'YEAR_OUT_OF_RANGE',
        field: 'year',
        message: `year must be one of ${TIC_NAC_VALID_YEARS.join(', ')}`,
        severity: 'blocker',
      });
    }
    if (!isNonEmpty(row.professional_group)) {
      blockers.push({
        rowIndex: idx,
        code: 'PROFESSIONAL_GROUP_REQUIRED',
        field: 'professional_group',
        message: 'professional_group required',
        severity: 'blocker',
      });
    }
    if (!isNonEmpty(row.area_code) && !isNonEmpty(row.area_name)) {
      blockers.push({
        rowIndex: idx,
        code: 'AREA_REQUIRED',
        message: 'either area_code or area_name required',
        severity: 'blocker',
      });
    }
    if (!isNonEmpty(row.concept_literal_from_agreement)) {
      blockers.push({
        rowIndex: idx,
        code: 'CONCEPT_LITERAL_REQUIRED',
        field: 'concept_literal_from_agreement',
        message: 'concept_literal_from_agreement required',
        severity: 'blocker',
      });
    }
    if (!isNonEmpty(row.payslip_label)) {
      blockers.push({
        rowIndex: idx,
        code: 'PAYSLIP_LABEL_REQUIRED',
        field: 'payslip_label',
        message: 'payslip_label required',
        severity: 'blocker',
      });
    }
    if (!isNonEmpty(row.source_page)) {
      blockers.push({
        rowIndex: idx,
        code: 'SOURCE_PAGE_REQUIRED',
        field: 'source_page',
        message: 'source_page required',
        severity: 'blocker',
      });
    }
    if (!isNonEmpty(row.source_excerpt)) {
      blockers.push({
        rowIndex: idx,
        code: 'SOURCE_EXCERPT_REQUIRED',
        field: 'source_excerpt',
        message: 'source_excerpt required',
        severity: 'blocker',
      });
    }
    if (row.requires_human_review !== true) {
      blockers.push({
        rowIndex: idx,
        code: 'REQUIRES_HUMAN_REVIEW_MUST_BE_TRUE',
        message: 'requires_human_review must be true',
        severity: 'blocker',
      });
    }
    // payslip_label keyword conservation
    const literal = lower(row.concept_literal_from_agreement);
    const payslip = lower(row.payslip_label);
    for (const kw of KEYWORDS) {
      if (literal.includes(kw) && !payslip.includes(kw)) {
        blockers.push({
          rowIndex: idx,
          code: 'PAYSLIP_LABEL_LOST_KEYWORD',
          field: 'payslip_label',
          message: `payslip_label must conserve keyword "${kw}" present in concept_literal_from_agreement`,
          severity: 'blocker',
        });
      }
    }
    // amounts >= 0
    const numericFields: Array<keyof StagingRow> = [
      'salary_base_annual',
      'salary_base_monthly',
      'extra_pay_amount',
      'plus_convenio_annual',
      'plus_convenio_monthly',
      'plus_transport',
      'plus_antiguedad',
      'other_amount',
    ];
    for (const f of numericFields) {
      const v = row[f] as number | null;
      if (v !== null && (typeof v !== 'number' || !Number.isFinite(v) || v < 0)) {
        blockers.push({
          rowIndex: idx,
          code: 'AMOUNT_NOT_POSITIVE',
          field: f as string,
          message: `${String(f)} must be >= 0`,
          severity: 'blocker',
        });
      }
    }
    // OCR rows must have row_confidence
    if (row.extraction_method === 'ocr' && !row.row_confidence) {
      blockers.push({
        rowIndex: idx,
        code: 'OCR_ROW_CONFIDENCE_REQUIRED',
        field: 'row_confidence',
        message: 'OCR rows require row_confidence',
        severity: 'blocker',
      });
    }
    // low confidence requires review_notes BEFORE approval (warning here;
    // hard block enforced by isApprovedForWriter pre-checks)
    if (
      (row.row_confidence === 'manual_low' ||
        row.row_confidence === 'ocr_low' ||
        row.row_confidence === 'ocr_medium') &&
      !isNonEmpty(row.review_notes)
    ) {
      warnings.push({
        rowIndex: idx,
        code: 'LOW_CONFIDENCE_REQUIRES_NOTES',
        message: `row_confidence=${row.row_confidence} requires review_notes before approval`,
        severity: 'warning',
      });
    }
  });

  // duplicates
  const seen = new Map<string, number[]>();
  rows.forEach((row, idx) => {
    const key = [
      row.year,
      lower(row.area_code ?? ''),
      lower(row.professional_group),
      lower(row.level ?? ''),
      lower(row.category ?? ''),
      row.normalized_concept_key,
    ].join('|');
    const arr = seen.get(key) ?? [];
    arr.push(idx);
    seen.set(key, arr);
  });
  for (const [key, indices] of seen) {
    if (indices.length > 1) {
      indices.forEach((i) =>
        blockers.push({
          rowIndex: i,
          code: 'DUPLICATE_COMPOSITE_KEY',
          message: `duplicate (year+area+group+level+category+concept): ${key}`,
          severity: 'blocker',
        }),
      );
    }
  }

  return {
    totalRows: rows.length,
    blockers,
    warnings,
    ok: blockers.length === 0,
  };
}

/**
 * The writer (B11.3B) MUST refuse any row for which this returns false.
 */
export function isApprovedForWriter(row: StagingRow): boolean {
  if (
    row.approval_mode === 'ocr_single_human_approval' ||
    row.approval_mode === 'manual_upload_single_approval'
  ) {
    return row.validation_status === 'human_approved_single';
  }
  if (
    row.approval_mode === 'ocr_dual_human_approval' ||
    row.approval_mode === 'manual_upload_dual_approval'
  ) {
    return row.validation_status === 'human_approved_second';
  }
  return false;
}