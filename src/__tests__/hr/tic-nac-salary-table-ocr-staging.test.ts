/**
 * B11.2C.1 — Engine tests for TIC-NAC OCR/manual staging.
 * Pure module: no DB, no edge, no payroll.
 */
import { describe, it, expect } from 'vitest';
import {
  stageTicNacOcrRows,
  stageTicNacManualRows,
  normalizeSpanishMoney,
  mapConceptToNormalizedKey,
  derivePayslipLabel,
  computeStagingRowHash,
  validateOcrStagingRows,
  isApprovedForWriter,
  TIC_NAC_AGREEMENT_ID,
  TIC_NAC_VERSION_ID,
  type StagingRow,
  type StagingRowInput,
} from '@/engines/erp/hr/ticNacSalaryTableOcrStaging';

const baseRow: StagingRowInput = {
  year: 2025,
  area_code: 'A',
  professional_group: 'Grupo II',
  level: '2',
  category: 'Programador',
  concept_literal_from_agreement: 'Salario base',
  salary_base_annual: 22000,
  source_page: '12',
  source_excerpt: 'Tabla salarial Anexo I 2025',
};

function withConcept(literal: string, extra: Partial<StagingRowInput> = {}) {
  return { ...baseRow, concept_literal_from_agreement: literal, ...extra };
}

describe('B11.2C.1 — ticNacSalaryTableOcrStaging engine', () => {
  it('OCR rows enter as ocr_pending_review', async () => {
    const rows = await stageTicNacOcrRows([baseRow], {
      approvalMode: 'ocr_single_human_approval',
    });
    expect(rows[0].validation_status).toBe('ocr_pending_review');
    expect(rows[0].extraction_method).toBe('ocr');
    expect(rows[0].requires_human_review).toBe(true);
  });

  it('Manual rows enter as manual_pending_review', async () => {
    const rows = await stageTicNacManualRows([baseRow], {
      approvalMode: 'manual_upload_single_approval',
    });
    expect(rows[0].validation_status).toBe('manual_pending_review');
    expect(rows[0].extraction_method).toBe('manual_csv');
  });

  it('No auto-approval by high confidence', async () => {
    const rows = await stageTicNacOcrRows(
      [{ ...baseRow, row_confidence: 'ocr_high' }],
      { approvalMode: 'ocr_single_human_approval' },
    );
    expect(rows[0].validation_status).toBe('ocr_pending_review');
  });

  it('payslip_label conserves "transporte"', () => {
    const label = derivePayslipLabel('Plus transporte');
    expect(label.toLowerCase()).toContain('transporte');
  });

  it('payslip_label conserves "nocturnidad"', () => {
    expect(derivePayslipLabel('Plus de nocturnidad').toLowerCase())
      .toContain('nocturnidad');
  });

  it('payslip_label conserves "antigüedad"', () => {
    expect(derivePayslipLabel('Complemento de antigüedad').toLowerCase())
      .toContain('antigüedad');
  });

  it('Blocker if concept_literal empty', async () => {
    const rows = await stageTicNacOcrRows(
      [withConcept('')],
      { approvalMode: 'ocr_single_human_approval' },
    );
    const r = validateOcrStagingRows(rows);
    expect(r.blockers.some((b) => b.code === 'CONCEPT_LITERAL_REQUIRED')).toBe(true);
  });

  it('Blocker if payslip_label loses keyword from literal', () => {
    const row: StagingRow = {
      agreement_id: TIC_NAC_AGREEMENT_ID,
      version_id: TIC_NAC_VERSION_ID,
      source_document: 'BOE-A-2025-7766',
      source_page: '12',
      source_excerpt: 'x',
      source_article: null,
      source_annex: null,
      ocr_raw_text: null,
      extraction_method: 'manual_csv',
      approval_mode: 'manual_upload_single_approval',
      year: 2025,
      area_code: 'A',
      area_name: null,
      professional_group: 'Grupo II',
      level: null,
      category: null,
      concept_literal_from_agreement: 'Plus transporte',
      normalized_concept_key: 'plus_transport',
      payroll_label: 'Plus transporte — Convenio TIC-NAC',
      payslip_label: 'Complemento generico', // keyword lost
      cra_mapping_status: 'pending',
      cra_code_suggested: null,
      taxable_irpf_hint: null,
      cotization_included_hint: null,
      salary_base_annual: null,
      salary_base_monthly: null,
      extra_pay_amount: null,
      plus_convenio_annual: null,
      plus_convenio_monthly: null,
      plus_transport: 100,
      plus_antiguedad: null,
      other_amount: null,
      currency: 'EUR',
      row_confidence: 'manual_high',
      requires_human_review: true,
      validation_status: 'manual_pending_review',
      first_reviewed_by: null,
      first_reviewed_at: null,
      second_reviewed_by: null,
      second_reviewed_at: null,
      review_notes: null,
      content_hash: 'x',
    };
    const r = validateOcrStagingRows([row]);
    expect(r.blockers.some((b) => b.code === 'PAYSLIP_LABEL_LOST_KEYWORD')).toBe(true);
  });

  it('normalizeSpanishMoney handles "1.234,56"', () => {
    expect(normalizeSpanishMoney('1.234,56')).toBe(1234.56);
  });

  it('normalizeSpanishMoney handles "1234.56"', () => {
    expect(normalizeSpanishMoney('1234.56')).toBe(1234.56);
  });

  it('computeStagingRowHash is stable', async () => {
    const rows = await stageTicNacOcrRows([baseRow], {
      approvalMode: 'ocr_single_human_approval',
    });
    const h1 = await computeStagingRowHash(rows[0]);
    const h2 = await computeStagingRowHash(rows[0]);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('mapConceptToNormalizedKey covers plus transporte', () => {
    expect(mapConceptToNormalizedKey('Plus transporte')).toBe('plus_transport');
  });

  it('mapConceptToNormalizedKey covers salario base', () => {
    expect(mapConceptToNormalizedKey('Salario base')).toBe('salary_base');
  });

  it('Negative amount → blocker', async () => {
    const rows = await stageTicNacOcrRows(
      [{ ...baseRow, salary_base_annual: -100 }],
      { approvalMode: 'ocr_single_human_approval' },
    );
    const r = validateOcrStagingRows(rows);
    expect(r.blockers.some((b) => b.code === 'AMOUNT_NOT_POSITIVE')).toBe(true);
  });

  it('Duplicate composite key → blocker', async () => {
    const rows = await stageTicNacOcrRows(
      [baseRow, { ...baseRow }],
      { approvalMode: 'ocr_single_human_approval' },
    );
    const r = validateOcrStagingRows(rows);
    expect(r.blockers.some((b) => b.code === 'DUPLICATE_COMPOSITE_KEY')).toBe(true);
  });

  it('Year out of range → blocker', async () => {
    const rows = await stageTicNacOcrRows(
      [{ ...baseRow, year: 2024 }],
      { approvalMode: 'ocr_single_human_approval' },
    );
    const r = validateOcrStagingRows(rows);
    expect(r.blockers.some((b) => b.code === 'YEAR_OUT_OF_RANGE')).toBe(true);
  });

  it('OCR row without confidence → blocker', async () => {
    // Force null confidence by manually shaping
    const rows = await stageTicNacOcrRows([baseRow], {
      approvalMode: 'ocr_single_human_approval',
    });
    const tampered: StagingRow = { ...rows[0], row_confidence: null };
    const r = validateOcrStagingRows([tampered]);
    expect(r.blockers.some((b) => b.code === 'OCR_ROW_CONFIDENCE_REQUIRED')).toBe(true);
  });

  it('Low confidence without review_notes → warning', async () => {
    const rows = await stageTicNacOcrRows(
      [{ ...baseRow, row_confidence: 'ocr_low' }],
      { approvalMode: 'ocr_single_human_approval' },
    );
    const r = validateOcrStagingRows(rows);
    expect(r.warnings.some((w) => w.code === 'LOW_CONFIDENCE_REQUIRES_NOTES')).toBe(true);
  });

  it('Row without source_page is not approvable', async () => {
    const rows = await stageTicNacOcrRows(
      [{ ...baseRow, source_page: null }],
      { approvalMode: 'ocr_single_human_approval' },
    );
    const r = validateOcrStagingRows(rows);
    expect(r.blockers.some((b) => b.code === 'SOURCE_PAGE_REQUIRED')).toBe(true);
  });

  it('Row without source_excerpt is not approvable', async () => {
    const rows = await stageTicNacOcrRows(
      [{ ...baseRow, source_excerpt: null }],
      { approvalMode: 'ocr_single_human_approval' },
    );
    const r = validateOcrStagingRows(rows);
    expect(r.blockers.some((b) => b.code === 'SOURCE_EXCERPT_REQUIRED')).toBe(true);
  });

  it('Single mode: human_approved_single is accepted by writer', () => {
    const row = {
      approval_mode: 'ocr_single_human_approval',
      validation_status: 'human_approved_single',
    } as unknown as StagingRow;
    expect(isApprovedForWriter(row)).toBe(true);
  });

  it('Dual mode: human_approved_second is accepted by writer', () => {
    const row = {
      approval_mode: 'ocr_dual_human_approval',
      validation_status: 'human_approved_second',
    } as unknown as StagingRow;
    expect(isApprovedForWriter(row)).toBe(true);
  });

  it('Dual mode: human_approved_first is NOT accepted by writer', () => {
    const row = {
      approval_mode: 'ocr_dual_human_approval',
      validation_status: 'human_approved_first',
    } as unknown as StagingRow;
    expect(isApprovedForWriter(row)).toBe(false);
  });

  it('Engine output is deterministic', async () => {
    const a = await stageTicNacOcrRows([baseRow], {
      approvalMode: 'ocr_single_human_approval',
    });
    const b = await stageTicNacOcrRows([baseRow], {
      approvalMode: 'ocr_single_human_approval',
    });
    expect(a[0].content_hash).toBe(b[0].content_hash);
    expect(a[0]).toEqual(b[0]);
  });
});