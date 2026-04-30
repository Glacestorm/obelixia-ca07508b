/**
 * B13.3A — Pure unit tests for the concept literal extractor.
 */
import { describe, it, expect } from 'vitest';
import {
  extractConceptLiteralsFromText,
  normalizeAgreementConceptLiteral,
  mapAgreementConceptToNormalizedKey,
  deriveAgreementPayrollLabel,
  deriveAgreementPayslipLabel,
  validateConceptLiteralPreservation,
  buildConceptFindingFromLiteral,
} from '@/engines/erp/hr/agreementConceptLiteralExtractor';

const SAMPLE = `
Artículo 12. Plus de transporte: se abonará mensualmente.
Artículo 13. Plus de nocturnidad por trabajo entre 22h y 6h.
Artículo 14. Antigüedad: trienios.
Artículo 15. Dietas y media dieta.
Artículo 16. Kilometraje cuando se use vehículo propio.
Artículo 17. Plus festivo.
Artículo 18. Salario base mensual.
Complemento 1
`;

describe('B13.3A — agreementConceptLiteralExtractor', () => {
  const literals = extractConceptLiteralsFromText(SAMPLE);

  it('1. extrae plus transporte', () => {
    expect(literals.some((l) => /transporte/i.test(l.concept_literal_from_agreement))).toBe(true);
  });
  it('2. extrae plus nocturnidad', () => {
    expect(literals.some((l) => /nocturnidad/i.test(l.concept_literal_from_agreement))).toBe(true);
  });
  it('3. extrae antigüedad', () => {
    expect(literals.some((l) => /antig/i.test(l.concept_literal_from_agreement))).toBe(true);
  });
  it('4. extrae dietas', () => {
    expect(literals.some((l) => /dieta/i.test(l.concept_literal_from_agreement))).toBe(true);
  });
  it('5. extrae kilometraje', () => {
    expect(literals.some((l) => /kilomet/i.test(l.concept_literal_from_agreement))).toBe(true);
  });
  it('6. payslip_label conserva transporte', () => {
    const t = literals.find((l) => /transporte/i.test(l.concept_literal_from_agreement));
    expect(t).toBeDefined();
    expect(t!.payslip_label.toLowerCase()).toMatch(/transporte/);
  });
  it('7. payslip_label conserva nocturnidad', () => {
    const n = literals.find((l) => /nocturnidad/i.test(l.concept_literal_from_agreement));
    expect(n).toBeDefined();
    expect(n!.payslip_label.toLowerCase()).toMatch(/nocturnidad/);
  });
  it('8. payslip_label conserva antigüedad', () => {
    const a = literals.find((l) => /antig/i.test(l.concept_literal_from_agreement));
    expect(a).toBeDefined();
    expect(a!.payslip_label.toLowerCase()).toMatch(/antig/);
  });
  it('9. nunca devuelve "Complemento 1"', () => {
    expect(literals.some((l) => /^Complemento\s+1$/.test(l.payslip_label))).toBe(false);
    expect(literals.some((l) => /^Complemento\s+1$/.test(l.payroll_label))).toBe(false);
  });
  it('10. requires_human_review=true en todos', () => {
    expect(literals.length).toBeGreaterThan(0);
    expect(literals.every((l) => l.requires_human_review === true)).toBe(true);
  });
  it('11. output determinista', () => {
    const a = extractConceptLiteralsFromText(SAMPLE);
    const b = extractConceptLiteralsFromText(SAMPLE);
    expect(a).toEqual(b);
  });

  it('helpers — normalize / map / derive labels / build finding', () => {
    expect(normalizeAgreementConceptLiteral('  Plus   transporte  ')).toBe('Plus transporte');
    expect(mapAgreementConceptToNormalizedKey('Plus de transporte')).toBe('plus_transport');
    expect(mapAgreementConceptToNormalizedKey('Antigüedad')).toBe('plus_antiguedad');
    expect(mapAgreementConceptToNormalizedKey('Salario base')).toBe('salary_base');
    expect(deriveAgreementPayrollLabel('Plus transporte', 'C-001')).toBe('Plus transporte [C-001]');
    expect(deriveAgreementPayslipLabel('Plus transporte')).toBe('Plus transporte');
    const finding = buildConceptFindingFromLiteral('Plus transporte', { sourcePage: 'p.4' });
    expect(finding.finding_type).toBe('concept_candidate');
    expect(finding.normalized_concept_key).toBe('plus_transport');
    expect(finding.requires_human_review).toBe(true);
    expect(finding.finding_status).toBe('pending_review');
    expect(finding.confidence).toBe('low');
    expect(finding.source_page).toBe('p.4');
  });

  it('validateConceptLiteralPreservation rejects generic and missing literals', () => {
    expect(
      validateConceptLiteralPreservation({
        concept_literal_from_agreement: 'Plus transporte',
        payroll_label: 'Plus transporte',
        payslip_label: 'Complemento 1',
        requires_human_review: true,
      }).ok,
    ).toBe(false);
    expect(
      validateConceptLiteralPreservation({
        concept_literal_from_agreement: 'Plus transporte',
        payroll_label: 'Plus transporte',
        payslip_label: 'Plus transporte',
        requires_human_review: true,
      }).ok,
    ).toBe(true);
    expect(
      validateConceptLiteralPreservation({
        concept_literal_from_agreement: 'Plus transporte',
        payroll_label: 'Plus transporte',
        payslip_label: 'Plus transporte',
        requires_human_review: false,
      }).ok,
    ).toBe(false);
  });
});