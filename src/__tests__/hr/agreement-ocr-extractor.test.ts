/**
 * B13.3C — Pure helper tests for the OCR extractor.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeOcrText,
  extractSalaryLikeLines,
  extractConceptLikeLines,
  extractRuleLikeLines,
  buildSourceExcerpt,
  buildFindingCandidatesFromText,
  splitTextIntoEvidenceChunks,
  classifyExtractionConfidence,
} from '@/engines/erp/hr/agreementOcrExtractor';

const TEXT = `
Página 12
Salario base oficial 1ª 1.420,30
Plus transporte 95,00
Plus convenio 120,00
Antigüedad: 3% por trienio
Jornada anual 1.776 horas
Vacaciones 30 días naturales
`;

describe('B13.3C — agreementOcrExtractor', () => {
  it('normalizes OCR ligatures and hyphenated breaks', () => {
    const t = normalizeOcrText('trans-\nporte\r\n\u00ADhola\uFB01n');
    expect(t).toContain('transporte');
    expect(t).not.toContain('\r');
    expect(t).toContain('fin');
  });
  it('detects salary-like line with amount', () => {
    const lines = extractSalaryLikeLines(TEXT);
    expect(lines.some((l) => /salario base/i.test(l.line))).toBe(true);
  });
  it('detects plus transporte concept-like line', () => {
    const lines = extractConceptLikeLines(TEXT);
    expect(lines.some((l) => /transporte/i.test(l.line))).toBe(true);
  });
  it('detects plus convenio concept-like line', () => {
    const lines = extractConceptLikeLines(TEXT);
    expect(lines.some((l) => /convenio/i.test(l.line))).toBe(true);
  });
  it('detects antigüedad concept-like line', () => {
    const lines = extractConceptLikeLines(TEXT);
    expect(lines.some((l) => /antig/i.test(l.line))).toBe(true);
  });
  it('detects jornada rule-like line', () => {
    const lines = extractRuleLikeLines(TEXT);
    expect(lines.some((l) => l.ruleHint === 'jornada')).toBe(true);
  });
  it('detects vacaciones rule-like line', () => {
    const lines = extractRuleLikeLines(TEXT);
    expect(lines.some((l) => l.ruleHint === 'vacaciones')).toBe(true);
  });
  it('builds source excerpt bounded', () => {
    const e = buildSourceExcerpt('a'.repeat(500), 50);
    expect(e.length).toBeLessThanOrEqual(50);
  });
  it('does not invent amounts when no number present', () => {
    const out = buildFindingCandidatesFromText('Plus transporte');
    const sal = out.find((c) => c.finding_type === 'salary_table_candidate');
    expect(sal).toBeUndefined();
  });
  it('every output has requires_human_review=true and pending_review', () => {
    const out = buildFindingCandidatesFromText(TEXT);
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) {
      expect(c.requires_human_review).toBe(true);
      expect(c.finding_status).toBe('pending_review');
    }
  });
  it('output is deterministic for same input', () => {
    const a = buildFindingCandidatesFromText(TEXT);
    const b = buildFindingCandidatesFromText(TEXT);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('splits text into bounded evidence chunks with page hints', () => {
    const chunks = splitTextIntoEvidenceChunks(TEXT, { maxChars: 80 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c) => c.page === '12')).toBe(true);
  });
  it('classifies confidence sanely', () => {
    expect(
      classifyExtractionConfidence({
        finding_type: 'ocr_required',
        payload_json: {},
        source_excerpt: '',
      }),
    ).toBe('low');
    expect(
      classifyExtractionConfidence({
        finding_type: 'salary_table_candidate',
        payload_json: { has_number: true },
        source_excerpt: '1.234,56',
      }),
    ).toBe('medium');
  });
});