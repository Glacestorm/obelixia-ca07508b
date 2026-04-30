/**
 * B13.3C — Salary table candidate extractor tests.
 */
import { describe, it, expect } from 'vitest';
import {
  parseSpanishMoneyStrict,
  detectYearFromSalaryContext,
  detectProfessionalGroupFromText,
  extractSalaryTableCandidatesFromRows,
  extractSalaryTableCandidatesFromText,
  validateSalaryTableCandidate,
} from '@/engines/erp/hr/agreementSalaryTableCandidateExtractor';

describe('B13.3C — agreementSalaryTableCandidateExtractor', () => {
  it('parses 1.234,56', () => {
    expect(parseSpanishMoneyStrict('1.234,56').amount).toBe(1234.56);
  });
  it('parses 1234,56', () => {
    expect(parseSpanishMoneyStrict('1234,56').amount).toBe(1234.56);
  });
  it('parses 1234.56', () => {
    expect(parseSpanishMoneyStrict('1234.56').amount).toBe(1234.56);
  });
  it('parses 18.245,30 €', () => {
    expect(parseSpanishMoneyStrict('18.245,30 €').amount).toBe(18245.3);
  });
  it('flags ambiguous "1,234" as ambiguous and amount=null', () => {
    const r = parseSpanishMoneyStrict('1,234');
    expect(r.amount).toBeNull();
    expect(r.ambiguous).toBe(true);
  });
  it('detects year', () => {
    expect(detectYearFromSalaryContext('Tabla salarial 2024')).toBe(2024);
  });
  it('detects professional group', () => {
    expect(detectProfessionalGroupFromText('Grupo profesional 3 oficial')).toBeTruthy();
  });
  it('rows with valid amount produce salary_table_candidate with payslip_label preserving transporte', () => {
    const out = extractSalaryTableCandidatesFromRows(
      [{ raw: 'Plus transporte 95,00', amount: '95,00', professional_group: 'Grupo 3', year: 2024, page: '12' }],
    );
    expect(out).toHaveLength(1);
    expect(out[0].payslip_label.toLowerCase()).toMatch(/transport/);
    expect(out[0].source_excerpt).toBeTruthy();
    expect(out[0].source_page).toBe('12');
    expect(out[0].payload_json.amount).toBe(95);
  });
  it('ambiguous amount → candidate with amount=null + warning', () => {
    const out = extractSalaryTableCandidatesFromRows(
      [{ raw: 'Plus convenio 1,234', amount: '1,234', professional_group: 'Grupo 1', year: 2024 }],
    );
    expect(out[0].payload_json.amount).toBeNull();
    expect(out[0].payload_json.amount_ambiguous).toBe(true);
  });
  it('text body extraction emits candidates from salary-like lines', () => {
    const out = extractSalaryTableCandidatesFromText(
      'Tabla salarial 2024\nGrupo 3 Salario base 1.420,30',
    );
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].payload_json.extraction_method).toBe('text');
  });
  it('all candidates have requires_human_review=true + pending_review', () => {
    const out = extractSalaryTableCandidatesFromRows(
      [{ raw: 'Salario base 1.420,30', amount: '1.420,30', professional_group: 'Grupo 1', year: 2024 }],
    );
    for (const c of out) {
      expect(c.requires_human_review).toBe(true);
      expect(c.finding_status).toBe('pending_review');
    }
  });
  it('validation flags missing fields without throwing', () => {
    const out = extractSalaryTableCandidatesFromRows([{ raw: 'x', amount: '' }]);
    const v = validateSalaryTableCandidate(out[0]);
    expect(v.warnings.length).toBeGreaterThan(0);
  });
  it('output is deterministic', () => {
    const a = extractSalaryTableCandidatesFromRows([{ raw: 'Salario base 1.420,30', amount: '1.420,30', professional_group: 'Grupo 1', year: 2024 }]);
    const b = extractSalaryTableCandidatesFromRows([{ raw: 'Salario base 1.420,30', amount: '1.420,30', professional_group: 'Grupo 1', year: 2024 }]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});