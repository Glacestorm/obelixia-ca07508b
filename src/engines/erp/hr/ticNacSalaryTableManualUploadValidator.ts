/**
 * B11.2B — Deterministic validator for TIC-NAC salary table manual
 * upload rows (Anexo I del XIX Convenio TIC, BOE-A-2025-7766).
 *
 * PURE module:
 *  - No Supabase, no fetch, no React, no Deno.
 *  - No DB writes, no edge-function calls, no privileged credentials.
 *  - No imports from payroll, payslip, normalizer, resolver or bridge
 *    modules. See B11.2B static guard test for the enforced denylist.
 *  - Never mutates the payroll-readiness flag. Never mutates pilot flags.
 *  - Output rows always carry `requires_human_review = true` and
 *    `validation_status` ∈ {`pending_human_check`, `human_reviewed`}.
 *
 * The validator is fully deterministic: same input → same output.
 */

export const TIC_NAC_AGREEMENT_ID =
  '1e665f80-3f04-4939-a448-4b1a2a4525e0' as const;
export const TIC_NAC_VERSION_ID =
  '9739379b-68e5-4ffd-8209-d5a1222fefc2' as const;
export const TIC_NAC_SOURCE_DOCUMENT = 'BOE-A-2025-7766' as const;
export const TIC_NAC_VALID_YEARS = [2025, 2026, 2027] as const;

export type TicNacValidationStatus = 'pending_human_check' | 'human_reviewed';
export type TicNacRowConfidence =
  | 'manual_high'
  | 'manual_medium'
  | 'manual_low'
  | 'ocr_high'
  | 'ocr_medium'
  | 'ocr_low';

export interface TicNacSalaryTableRow {
  agreement_id: string;
  version_id: string;
  year: number;
  area_code?: string | null;
  area_name?: string | null;
  professional_group: string;
  level?: string | null;
  category?: string | null;
  salary_base_annual?: number | null;
  salary_base_monthly?: number | null;
  extra_pay_amount?: number | null;
  plus_convenio_annual?: number | null;
  plus_convenio_monthly?: number | null;
  plus_transport?: number | null;
  plus_antiguedad?: number | null;
  currency: string;
  source_document: string;
  source_page?: string | number | null;
  source_excerpt?: string | null;
  source_table?: string | null;
  row_confidence?: TicNacRowConfidence | null;
  requires_human_review: boolean;
  validation_status: string;
  notes?: string | null;
  /** Marks rows that originated from OCR-assisted staging. */
  origin?: 'manual' | 'ocr';
}

export interface TicNacRowIssue {
  rowIndex: number;
  code: string;
  field?: string;
  message: string;
  severity: 'blocker' | 'warning';
}

export interface TicNacValidationReport {
  totalRows: number;
  blockers: TicNacRowIssue[];
  warnings: TicNacRowIssue[];
  ok: boolean;
  summary: {
    rowsByYear: Record<string, number>;
    duplicateGroups: number;
    coherenceWarnings: number;
    lowConfidenceRows: number;
  };
}

const VALID_VALIDATION_STATUS: ReadonlySet<string> = new Set([
  'pending_human_check',
  'human_reviewed',
]);

const POSITIVE_AMOUNT_FIELDS: ReadonlyArray<keyof TicNacSalaryTableRow> = [
  'salary_base_annual',
  'salary_base_monthly',
  'extra_pay_amount',
  'plus_convenio_annual',
  'plus_convenio_monthly',
  'plus_transport',
  'plus_antiguedad',
];

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function dedupeKey(row: TicNacSalaryTableRow): string {
  return [
    row.year,
    (row.area_code ?? row.area_name ?? '').toString().trim().toLowerCase(),
    (row.professional_group ?? '').toString().trim().toLowerCase(),
    (row.level ?? '').toString().trim().toLowerCase(),
    (row.category ?? '').toString().trim().toLowerCase(),
  ].join('|');
}

function categoryKey(row: TicNacSalaryTableRow): string {
  return [
    (row.area_code ?? row.area_name ?? '').toString().trim().toLowerCase(),
    (row.professional_group ?? '').toString().trim().toLowerCase(),
    (row.level ?? '').toString().trim().toLowerCase(),
    (row.category ?? '').toString().trim().toLowerCase(),
  ].join('|');
}

/**
 * Pure normalization of a numeric amount: rounds to 2 decimals, returns
 * `null` for non-finite values. Does not mutate the input.
 */
export function normalizeAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Validate a batch of TIC-NAC manual-upload salary table rows.
 * Deterministic; no side effects; no DB calls.
 */
export function validateTicNacSalaryTableRows(
  rows: ReadonlyArray<TicNacSalaryTableRow>,
): TicNacValidationReport {
  const blockers: TicNacRowIssue[] = [];
  const warnings: TicNacRowIssue[] = [];
  const rowsByYear: Record<string, number> = {};
  let lowConfidenceRows = 0;

  // 1..12: per-row checks
  rows.forEach((row, idx) => {
    if (row.agreement_id !== TIC_NAC_AGREEMENT_ID) {
      blockers.push({
        rowIndex: idx,
        code: 'AGREEMENT_ID_MISMATCH',
        field: 'agreement_id',
        message: `agreement_id must be ${TIC_NAC_AGREEMENT_ID}`,
        severity: 'blocker',
      });
    }
    if (row.version_id !== TIC_NAC_VERSION_ID) {
      blockers.push({
        rowIndex: idx,
        code: 'VERSION_ID_MISMATCH',
        field: 'version_id',
        message: `version_id must be ${TIC_NAC_VERSION_ID}`,
        severity: 'blocker',
      });
    }
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
    } else {
      const key = String(row.year);
      rowsByYear[key] = (rowsByYear[key] ?? 0) + 1;
    }
    if (!isNonEmptyString(row.professional_group)) {
      blockers.push({
        rowIndex: idx,
        code: 'PROFESSIONAL_GROUP_REQUIRED',
        field: 'professional_group',
        message: 'professional_group must be a non-empty string',
        severity: 'blocker',
      });
    }
    if (!isNonEmptyString(row.area_code) && !isNonEmptyString(row.area_name)) {
      blockers.push({
        rowIndex: idx,
        code: 'AREA_REQUIRED',
        field: 'area_code',
        message: 'either area_code or area_name must be provided',
        severity: 'blocker',
      });
    }
    const hasAnnual = isFiniteNumber(row.salary_base_annual);
    const hasMonthly = isFiniteNumber(row.salary_base_monthly);
    if (!hasAnnual && !hasMonthly) {
      blockers.push({
        rowIndex: idx,
        code: 'SALARY_BASE_REQUIRED',
        field: 'salary_base_annual',
        message:
          'at least one of salary_base_annual or salary_base_monthly must be present',
        severity: 'blocker',
      });
    }
    for (const field of POSITIVE_AMOUNT_FIELDS) {
      const v = row[field];
      if (v === null || v === undefined) continue;
      if (!isFiniteNumber(v)) {
        blockers.push({
          rowIndex: idx,
          code: 'AMOUNT_NOT_FINITE',
          field: field as string,
          message: `${field as string} must be a finite number`,
          severity: 'blocker',
        });
      } else if (v <= 0) {
        blockers.push({
          rowIndex: idx,
          code: 'AMOUNT_NOT_POSITIVE',
          field: field as string,
          message: `${field as string} must be > 0`,
          severity: 'blocker',
        });
      } else {
        const normalized = normalizeAmount(v);
        if (normalized === null || Math.abs(normalized - v) > 0.005) {
          warnings.push({
            rowIndex: idx,
            code: 'AMOUNT_DECIMAL_NORMALIZATION',
            field: field as string,
            message: `${field as string} not normalized to 2 decimals (${v})`,
            severity: 'warning',
          });
        }
      }
    }
    if (
      row.source_page === null ||
      row.source_page === undefined ||
      String(row.source_page).trim() === ''
    ) {
      blockers.push({
        rowIndex: idx,
        code: 'SOURCE_PAGE_REQUIRED',
        field: 'source_page',
        message: 'source_page is required',
        severity: 'blocker',
      });
    }
    if (!isNonEmptyString(row.source_excerpt)) {
      blockers.push({
        rowIndex: idx,
        code: 'SOURCE_EXCERPT_REQUIRED',
        field: 'source_excerpt',
        message: 'source_excerpt is required',
        severity: 'blocker',
      });
    }
    if (row.requires_human_review !== true) {
      blockers.push({
        rowIndex: idx,
        code: 'REQUIRES_HUMAN_REVIEW_MUST_BE_TRUE',
        field: 'requires_human_review',
        message: 'requires_human_review must be true',
        severity: 'blocker',
      });
    }
    if (!VALID_VALIDATION_STATUS.has(row.validation_status)) {
      blockers.push({
        rowIndex: idx,
        code: 'VALIDATION_STATUS_NOT_ALLOWED',
        field: 'validation_status',
        message: `validation_status must be one of ${[...VALID_VALIDATION_STATUS].join(', ')}`,
        severity: 'blocker',
      });
    }
    // 15) row_confidence required when origin=ocr
    if (row.origin === 'ocr' && !row.row_confidence) {
      blockers.push({
        rowIndex: idx,
        code: 'OCR_ROW_CONFIDENCE_REQUIRED',
        field: 'row_confidence',
        message: 'row_confidence is required for OCR-originated rows',
        severity: 'blocker',
      });
    }
    // 16) low confidence → warning (manual) / blocker (ocr_low)
    if (
      row.row_confidence === 'manual_low' ||
      row.row_confidence === 'ocr_low' ||
      row.row_confidence === 'ocr_medium'
    ) {
      lowConfidenceRows++;
      warnings.push({
        rowIndex: idx,
        code: 'LOW_CONFIDENCE_ROW',
        field: 'row_confidence',
        message: `row_confidence=${row.row_confidence} requires human review before B11.3B`,
        severity: 'warning',
      });
    }
  });

  // 13) duplicates by composite key
  const seenDedupe = new Map<string, number[]>();
  rows.forEach((row, idx) => {
    const key = dedupeKey(row);
    const arr = seenDedupe.get(key) ?? [];
    arr.push(idx);
    seenDedupe.set(key, arr);
  });
  let duplicateGroups = 0;
  for (const [key, indices] of seenDedupe) {
    if (indices.length > 1) {
      duplicateGroups++;
      indices.forEach((rowIdx) => {
        blockers.push({
          rowIndex: rowIdx,
          code: 'DUPLICATE_COMPOSITE_KEY',
          message: `duplicate (year+area+group+level+category): ${key}`,
          severity: 'blocker',
        });
      });
    }
  }

  // 14) cross-year coherence (2027 >= 2026 >= 2025) per category
  let coherenceWarnings = 0;
  const byCategory = new Map<string, Map<number, TicNacSalaryTableRow>>();
  rows.forEach((row) => {
    if (!isFiniteNumber(row.salary_base_annual)) return;
    if (!TIC_NAC_VALID_YEARS.includes(row.year as 2025 | 2026 | 2027)) return;
    const cat = categoryKey(row);
    const m = byCategory.get(cat) ?? new Map<number, TicNacSalaryTableRow>();
    m.set(row.year, row);
    byCategory.set(cat, m);
  });
  for (const [, perYear] of byCategory) {
    if (perYear.size < 2) continue;
    const r25 = perYear.get(2025);
    const r26 = perYear.get(2026);
    const r27 = perYear.get(2027);
    const notesAcceptOverride = (r: TicNacSalaryTableRow | undefined) =>
      isNonEmptyString(r?.notes) &&
      /coherence_override|regresion_justificada|justified_regression/i.test(
        r!.notes!,
      );
    if (
      r25 &&
      r26 &&
      isFiniteNumber(r25.salary_base_annual) &&
      isFiniteNumber(r26.salary_base_annual) &&
      r26.salary_base_annual < r25.salary_base_annual &&
      !notesAcceptOverride(r26)
    ) {
      coherenceWarnings++;
      const row26Idx = rows.indexOf(r26);
      warnings.push({
        rowIndex: row26Idx,
        code: 'COHERENCE_2026_LT_2025',
        message: `salary_base_annual 2026 (${r26.salary_base_annual}) < 2025 (${r25.salary_base_annual}); add notes "coherence_override" to accept`,
        severity: 'warning',
      });
    }
    if (
      r26 &&
      r27 &&
      isFiniteNumber(r26.salary_base_annual) &&
      isFiniteNumber(r27.salary_base_annual) &&
      r27.salary_base_annual < r26.salary_base_annual &&
      !notesAcceptOverride(r27)
    ) {
      coherenceWarnings++;
      const row27Idx = rows.indexOf(r27);
      warnings.push({
        rowIndex: row27Idx,
        code: 'COHERENCE_2027_LT_2026',
        message: `salary_base_annual 2027 (${r27.salary_base_annual}) < 2026 (${r26.salary_base_annual}); add notes "coherence_override" to accept`,
        severity: 'warning',
      });
    }
  }

  return {
    totalRows: rows.length,
    blockers,
    warnings,
    ok: blockers.length === 0,
    summary: {
      rowsByYear,
      duplicateGroups,
      coherenceWarnings,
      lowConfidenceRows,
    },
  };
}

/**
 * OCR-assisted staging adapter (design-only).
 *
 * This helper is intentionally a NO-OP at runtime: it does not call any
 * OCR engine, never persists anything, never resolves to numeric truth.
 * It only normalizes shape + forces the safety contract:
 *   - origin = 'ocr'
 *   - requires_human_review = true
 *   - validation_status = 'pending_human_check'
 *
 * The real OCR provider (when authorized) MUST feed its raw output
 * through this adapter so the validator can flag low-confidence rows
 * and block writes until a human reviews them.
 */
export function stageOcrRowsForHumanReview(
  rawRows: ReadonlyArray<Partial<TicNacSalaryTableRow>>,
): TicNacSalaryTableRow[] {
  return rawRows.map((r) => ({
    agreement_id: r.agreement_id ?? TIC_NAC_AGREEMENT_ID,
    version_id: r.version_id ?? TIC_NAC_VERSION_ID,
    year: typeof r.year === 'number' ? r.year : Number(r.year),
    area_code: r.area_code ?? null,
    area_name: r.area_name ?? null,
    professional_group: r.professional_group ?? '',
    level: r.level ?? null,
    category: r.category ?? null,
    salary_base_annual: normalizeAmount(r.salary_base_annual ?? null),
    salary_base_monthly: normalizeAmount(r.salary_base_monthly ?? null),
    extra_pay_amount: normalizeAmount(r.extra_pay_amount ?? null),
    plus_convenio_annual: normalizeAmount(r.plus_convenio_annual ?? null),
    plus_convenio_monthly: normalizeAmount(r.plus_convenio_monthly ?? null),
    plus_transport: normalizeAmount(r.plus_transport ?? null),
    plus_antiguedad: normalizeAmount(r.plus_antiguedad ?? null),
    currency: r.currency ?? 'EUR',
    source_document: r.source_document ?? TIC_NAC_SOURCE_DOCUMENT,
    source_page: r.source_page ?? null,
    source_excerpt: r.source_excerpt ?? null,
    source_table: r.source_table ?? null,
    row_confidence: r.row_confidence ?? 'ocr_low',
    requires_human_review: true,
    validation_status: 'pending_human_check',
    notes: r.notes ?? null,
    origin: 'ocr',
  }));
}