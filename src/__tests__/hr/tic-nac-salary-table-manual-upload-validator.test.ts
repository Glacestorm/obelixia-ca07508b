/**
 * B11.2B — Validator behavioral tests.
 */
import { describe, it, expect } from 'vitest';
import {
  validateTicNacSalaryTableRows,
  stageOcrRowsForHumanReview,
  TIC_NAC_AGREEMENT_ID,
  TIC_NAC_VERSION_ID,
  TIC_NAC_SOURCE_DOCUMENT,
  type TicNacSalaryTableRow,
} from '@/engines/erp/hr/ticNacSalaryTableManualUploadValidator';

const baseRow = (overrides: Partial<TicNacSalaryTableRow> = {}): TicNacSalaryTableRow => ({
  agreement_id: TIC_NAC_AGREEMENT_ID,
  version_id: TIC_NAC_VERSION_ID,
  year: 2025,
  area_code: '3',
  area_name: 'Servicios y soporte',
  professional_group: 'C',
  level: '1',
  category: 'salario_base_anual',
  salary_base_annual: 25000,
  salary_base_monthly: null,
  extra_pay_amount: null,
  plus_convenio_annual: null,
  plus_convenio_monthly: null,
  plus_transport: null,
  plus_antiguedad: null,
  currency: 'EUR',
  source_document: TIC_NAC_SOURCE_DOCUMENT,
  source_page: '53620',
  source_excerpt: 'Anexo I — Area 3, Group C, Level 1',
  source_table: 'Anexo I',
  row_confidence: 'manual_high',
  requires_human_review: true,
  validation_status: 'pending_human_check',
  notes: null,
  ...overrides,
});

describe('B11.2B — validateTicNacSalaryTableRows', () => {
  it('1) valid 2025 row passes (no blockers)', () => {
    const r = validateTicNacSalaryTableRows([baseRow()]);
    expect(r.ok).toBe(true);
    expect(r.blockers).toEqual([]);
    expect(r.summary.rowsByYear['2025']).toBe(1);
  });

  it('2) wrong agreement_id → blocker', () => {
    const r = validateTicNacSalaryTableRows([
      baseRow({ agreement_id: '00000000-0000-0000-0000-000000000000' }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.blockers.some((b) => b.code === 'AGREEMENT_ID_MISMATCH')).toBe(true);
  });

  it('3) wrong version_id → blocker', () => {
    const r = validateTicNacSalaryTableRows([
      baseRow({ version_id: '11111111-1111-1111-1111-111111111111' }),
    ]);
    expect(r.blockers.some((b) => b.code === 'VERSION_ID_MISMATCH')).toBe(true);
  });

  it('4) year out of {2025,2026,2027} → blocker', () => {
    const r = validateTicNacSalaryTableRows([baseRow({ year: 2024 })]);
    expect(r.blockers.some((b) => b.code === 'YEAR_OUT_OF_RANGE')).toBe(true);
  });

  it('5) negative amount → blocker', () => {
    const r = validateTicNacSalaryTableRows([
      baseRow({ salary_base_annual: -1 }),
    ]);
    expect(r.blockers.some((b) => b.code === 'AMOUNT_NOT_POSITIVE')).toBe(true);
  });

  it('6) missing source_page → blocker', () => {
    const r = validateTicNacSalaryTableRows([baseRow({ source_page: '' })]);
    expect(r.blockers.some((b) => b.code === 'SOURCE_PAGE_REQUIRED')).toBe(true);
  });

  it('7) missing source_excerpt → blocker', () => {
    const r = validateTicNacSalaryTableRows([baseRow({ source_excerpt: '' })]);
    expect(r.blockers.some((b) => b.code === 'SOURCE_EXCERPT_REQUIRED')).toBe(true);
  });

  it('8) requires_human_review=false → blocker', () => {
    const r = validateTicNacSalaryTableRows([
      baseRow({ requires_human_review: false }),
    ]);
    expect(r.blockers.some((b) => b.code === 'REQUIRES_HUMAN_REVIEW_MUST_BE_TRUE')).toBe(true);
  });

  it('9) definitive validation_status not allowed → blocker', () => {
    const r = validateTicNacSalaryTableRows([
      baseRow({ validation_status: 'approved_for_payroll' }),
    ]);
    expect(r.blockers.some((b) => b.code === 'VALIDATION_STATUS_NOT_ALLOWED')).toBe(true);
  });

  it('10) duplicate composite key → blocker on both rows', () => {
    const r = validateTicNacSalaryTableRows([baseRow(), baseRow()]);
    expect(r.blockers.filter((b) => b.code === 'DUPLICATE_COMPOSITE_KEY').length).toBe(2);
    expect(r.summary.duplicateGroups).toBe(1);
  });

  it('11) coherence 2027 < 2026 → warning, override note suppresses it', () => {
    const r = validateTicNacSalaryTableRows([
      baseRow({ year: 2025, salary_base_annual: 25000 }),
      baseRow({ year: 2026, salary_base_annual: 26000 }),
      baseRow({ year: 2027, salary_base_annual: 25500 }),
    ]);
    expect(r.warnings.some((w) => w.code === 'COHERENCE_2027_LT_2026')).toBe(true);

    const r2 = validateTicNacSalaryTableRows([
      baseRow({ year: 2025, salary_base_annual: 25000 }),
      baseRow({ year: 2026, salary_base_annual: 26000 }),
      baseRow({
        year: 2027,
        salary_base_annual: 25500,
        notes: 'coherence_override: reviewed by human',
      }),
    ]);
    expect(r2.warnings.some((w) => w.code === 'COHERENCE_2027_LT_2026')).toBe(false);
  });

  it('12) low row_confidence (manual) is a warning, not a blocker', () => {
    const r = validateTicNacSalaryTableRows([
      baseRow({ row_confidence: 'manual_low' }),
    ]);
    expect(r.warnings.some((w) => w.code === 'LOW_CONFIDENCE_ROW')).toBe(true);
    expect(r.ok).toBe(true);
  });

  it('12b) OCR-staged rows enforce safety contract', () => {
    const staged = stageOcrRowsForHumanReview([
      {
        year: 2025,
        area_code: '3',
        professional_group: 'C',
        level: '1',
        category: 'salario_base_anual',
        salary_base_annual: 25000,
        source_page: '53620',
        source_excerpt: 'OCR draft excerpt',
        row_confidence: 'ocr_low',
      },
    ]);
    expect(staged[0].requires_human_review).toBe(true);
    expect(staged[0].validation_status).toBe('pending_human_check');
    expect(staged[0].origin).toBe('ocr');
  });

  it('13) deterministic output: same input → same JSON', () => {
    const input = [baseRow(), baseRow({ year: 2026, salary_base_annual: 26000 })];
    const a = JSON.stringify(validateTicNacSalaryTableRows(input));
    const b = JSON.stringify(validateTicNacSalaryTableRows(input));
    expect(a).toBe(b);
  });

  it('extra) area required (both area_code and area_name empty) → blocker', () => {
    const r = validateTicNacSalaryTableRows([
      baseRow({ area_code: null, area_name: null }),
    ]);
    expect(r.blockers.some((b) => b.code === 'AREA_REQUIRED')).toBe(true);
  });

  it('extra) salary base required (annual+monthly missing) → blocker', () => {
    const r = validateTicNacSalaryTableRows([
      baseRow({ salary_base_annual: null, salary_base_monthly: null }),
    ]);
    expect(r.blockers.some((b) => b.code === 'SALARY_BASE_REQUIRED')).toBe(true);
  });
});