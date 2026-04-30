/**
 * B13.3B.1 — Pure tests for the finding→staging mapper.
 */
import { describe, it, expect } from 'vitest';
import {
  mapExtractionFindingToSalaryStagingRow,
  validateFindingStagingReadiness,
  inferExtractionMethodFromFinding,
  inferApprovalModeFromFinding,
  mapFindingPayloadAmounts,
  buildStagingSourceFields,
  computeFindingToStagingHash,
  type ExtractionFindingForMapping,
} from '@/engines/erp/hr/agreementFindingToStagingMapper';

const baseFinding = (
  overrides: Partial<ExtractionFindingForMapping> = {},
): ExtractionFindingForMapping => ({
  id: '11111111-1111-1111-1111-111111111111',
  agreement_id: '22222222-2222-2222-2222-222222222222',
  version_id: '33333333-3333-3333-3333-333333333333',
  finding_type: 'concept_candidate',
  finding_status: 'pending_review',
  concept_literal_from_agreement: 'Plus transporte',
  normalized_concept_key: 'plus_transport',
  payroll_label: 'Plus transporte',
  payslip_label: 'Plus transporte',
  source_page: '12',
  source_excerpt: 'Anexo I — Plus transporte: 80 €/mes',
  raw_text: null,
  confidence: 'low',
  requires_human_review: true,
  payload_json: {
    year: 2026,
    professional_group: 'Grupo II',
    plus_transport: 80,
    extraction_method: 'manual_form',
  },
  ...overrides,
});

describe('B13.3B.1 — agreementFindingToStagingMapper', () => {
  it('1. salary_table_candidate válido mapea a staging', () => {
    const f = baseFinding({
      finding_type: 'salary_table_candidate',
      payload_json: {
        year: 2026,
        professional_group: 'Grupo I',
        salary_base_monthly: 1500,
        extraction_method: 'manual_form',
      },
    });
    const v = validateFindingStagingReadiness(f);
    expect(v.ok).toBe(true);
    const row = mapExtractionFindingToSalaryStagingRow(f);
    expect(row.validation_status).toBe('manual_pending_review');
    expect(row.salary_base_monthly).toBe(1500);
  });

  it('2. concept_candidate con importe mapea a staging', () => {
    const row = mapExtractionFindingToSalaryStagingRow(baseFinding());
    expect(row.plus_transport).toBe(80);
    expect(row.year).toBe(2026);
  });

  it('3. metadata_candidate bloquea', () => {
    const v = validateFindingStagingReadiness(baseFinding({ finding_type: 'metadata_candidate' }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('FINDING_NOT_STAGING_READY');
  });

  it('4. rule_candidate bloquea/deferred', () => {
    const v = validateFindingStagingReadiness(baseFinding({ finding_type: 'rule_candidate' }));
    expect(v.ok).toBe(false);
  });

  it('5. finding sin agreement_id bloquea', () => {
    const v = validateFindingStagingReadiness(baseFinding({ agreement_id: null }));
    expect(v.ok).toBe(false);
  });

  it('6. finding sin version_id bloquea', () => {
    const v = validateFindingStagingReadiness(baseFinding({ version_id: null }));
    expect(v.ok).toBe(false);
  });

  it('7. sin source_page bloquea', () => {
    const v = validateFindingStagingReadiness(baseFinding({ source_page: '' }));
    expect(v.ok).toBe(false);
  });

  it('8. sin source_excerpt bloquea', () => {
    const v = validateFindingStagingReadiness(baseFinding({ source_excerpt: '' }));
    expect(v.ok).toBe(false);
  });

  it('9. sin concept_literal bloquea', () => {
    const v = validateFindingStagingReadiness(
      baseFinding({ concept_literal_from_agreement: '' }),
    );
    expect(v.ok).toBe(false);
  });

  it('10. sin payslip_label bloquea', () => {
    const v = validateFindingStagingReadiness(baseFinding({ payslip_label: '' }));
    expect(v.ok).toBe(false);
  });

  it('11. OCR sin row_confidence bloquea', () => {
    const v = validateFindingStagingReadiness(
      baseFinding({
        payload_json: {
          year: 2026,
          professional_group: 'Grupo II',
          plus_transport: 80,
          extraction_method: 'ocr',
        },
      }),
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('ocr_missing_row_confidence');
  });

  it('12. OCR entra como ocr_pending_review', () => {
    const row = mapExtractionFindingToSalaryStagingRow(
      baseFinding({
        payload_json: {
          year: 2026,
          professional_group: 'Grupo II',
          plus_transport: 80,
          extraction_method: 'ocr',
          row_confidence: 'ocr_high',
        },
      }),
    );
    expect(row.validation_status).toBe('ocr_pending_review');
    expect(row.approval_mode).toBe('ocr_single_human_approval');
    expect(row.extraction_method).toBe('ocr');
  });

  it('13. manual entra como manual_pending_review', () => {
    const row = mapExtractionFindingToSalaryStagingRow(baseFinding());
    expect(row.validation_status).toBe('manual_pending_review');
    expect(row.approval_mode).toBe('manual_upload_single_approval');
  });

  it('14. no genera human_approved', () => {
    const row = mapExtractionFindingToSalaryStagingRow(baseFinding());
    expect(String(row.validation_status)).not.toMatch(/human_approved/);
  });

  it('15. no genera ready_for_payroll / salary_tables_loaded / human_validated', () => {
    const row = mapExtractionFindingToSalaryStagingRow(baseFinding());
    expect(row).not.toHaveProperty('ready_for_payroll');
    expect(row).not.toHaveProperty('salary_tables_loaded');
    expect(row).not.toHaveProperty('data_completeness');
  });

  it('16. transporte conserva transporte en payslip_label', () => {
    const row = mapExtractionFindingToSalaryStagingRow(baseFinding());
    expect(String(row.payslip_label).toLowerCase()).toContain('transport');
  });

  it('17. importe negativo bloquea', () => {
    const v = validateFindingStagingReadiness(
      baseFinding({
        payload_json: {
          year: 2026,
          professional_group: 'Grupo II',
          plus_transport: -10,
          extraction_method: 'manual_form',
        },
      }),
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('APPROVAL_BLOCKED');
  });

  it('18. computeFindingToStagingHash es estable', () => {
    const f = baseFinding();
    expect(computeFindingToStagingHash(f)).toBe(computeFindingToStagingHash(f));
  });

  it('19. output determinista', () => {
    const a = mapExtractionFindingToSalaryStagingRow(baseFinding());
    const b = mapExtractionFindingToSalaryStagingRow(baseFinding());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('helpers — inferExtractionMethod / inferApprovalMode / mapAmounts / sourceFields', () => {
    expect(inferExtractionMethodFromFinding(baseFinding())).toBe('manual_form');
    expect(inferApprovalModeFromFinding(baseFinding(), { approvalDual: true })).toBe(
      'manual_upload_dual_approval',
    );
    const amounts = mapFindingPayloadAmounts({ year: 2026, professional_group: 'X', plus_transport: 1 });
    expect(amounts.year).toBe(2026);
    expect(amounts.currency).toBe('EUR');
    const src = buildStagingSourceFields(baseFinding(), { sourceDocumentFromIntake: 'hash-abc' });
    expect(src.source_document).toBe('hash-abc');
  });

  it('keyword preservation — convenio sin convenio en payslip bloquea', () => {
    const v = validateFindingStagingReadiness(
      baseFinding({
        concept_literal_from_agreement: 'Plus de convenio especial',
        payslip_label: 'Plus genérico',
      }),
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('APPROVAL_BLOCKED');
  });
});
