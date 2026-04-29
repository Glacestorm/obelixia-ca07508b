/**
 * B7A tests — Salary table parser (HTML + PDF text).
 * Pure parser only. No Supabase, no fetch.
 */
import { describe, it, expect } from 'vitest';
import {
  parseSalaryRowsFromHtmlTables,
  parseSalaryRowsFromPdfText,
  parseSpanishAmount,
} from '@/engines/erp/hr/collectiveAgreementSalaryTableParser';

describe('B7A — parseSpanishAmount', () => {
  it('parses Spanish formats', () => {
    expect(parseSpanishAmount('1.234,56')).toBe(1234.56);
    expect(parseSpanishAmount('1234,56')).toBe(1234.56);
    expect(parseSpanishAmount('1.234,56 €')).toBe(1234.56);
    expect(parseSpanishAmount('1,234.56')).toBe(1234.56);
    expect(parseSpanishAmount('1234')).toBe(1234);
    expect(parseSpanishAmount('')).toBeNull();
    expect(parseSpanishAmount('—')).toBeNull();
    expect(parseSpanishAmount(null)).toBeNull();
  });
});

describe('B7A — parseSalaryRowsFromHtmlTables', () => {
  it('HTML simple BOIB table → rows parsed with sourcePage/excerpt', () => {
    const rows = parseSalaryRowsFromHtmlTables({
      year: 2024,
      tables: [
        {
          headers: ['Grupo profesional', 'Categoría', 'Salario mensual', 'Plus convenio'],
          rows: [
            ['Grupo I', 'Dependiente', '1.350,42 €', '120,00 €'],
            ['Grupo II', 'Cajero', '1.420,15 €', '125,00 €'],
          ],
          sourcePage: 1,
        },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].professionalGroup).toBe('Grupo I');
    expect(rows[0].category).toBe('Dependiente');
    expect(rows[0].salaryBaseMonthly).toBe(1350.42);
    expect(rows[0].plusConvenio).toBe(120);
    expect(rows[0].sourcePage).toBe(1);
    expect(rows[0].sourceExcerpt.length).toBeGreaterThan(0);
    expect(rows[0].requiresHumanReview).toBe(true);
  });

  it('absent plus column → not invented (undefined)', () => {
    const rows = parseSalaryRowsFromHtmlTables({
      year: 2024,
      tables: [
        {
          headers: ['Categoría', 'Salario mensual'],
          rows: [['Dependiente', '1.200,00 €']],
        },
      ],
    });
    expect(rows[0].plusTransport).toBeUndefined();
    expect(rows[0].plusFestivo).toBeUndefined();
  });

  it('absent category not fabricated', () => {
    const rows = parseSalaryRowsFromHtmlTables({
      year: 2024,
      tables: [
        {
          headers: ['Grupo profesional', 'Salario mensual'],
          rows: [['Grupo I', '1.200,00']],
        },
      ],
    });
    expect(rows[0].category).toBeUndefined();
    expect(rows[0].professionalGroup).toBe('Grupo I');
  });

  it('ambiguous amounts produce warnings and lower confidence', () => {
    const rows = parseSalaryRowsFromHtmlTables({
      year: 2024,
      tables: [
        {
          headers: ['Categoría', 'Salario mensual', 'Plus convenio'],
          rows: [
            ['Camarero', 'aprox 1.300', 'n/d'],
            ['Cocinero', '—', '—'],
          ],
        },
      ],
    });
    // Both rows should exist (have category) but with warnings and lower confidence
    expect(rows.length).toBeGreaterThan(0);
    const allHaveWarnings = rows.every((r) => r.warnings.length > 0);
    expect(allHaveWarnings).toBe(true);
    const lowConfidence = rows.every((r) => r.rowConfidence < 0.6);
    expect(lowConfidence).toBe(true);
  });

  it('row without identifiable content is dropped', () => {
    const rows = parseSalaryRowsFromHtmlTables({
      year: 2024,
      tables: [
        {
          headers: ['Categoría', 'Salario mensual'],
          rows: [['', ''], ['Dependiente', '1.200,00']],
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe('Dependiente');
  });
});

describe('B7A — parseSalaryRowsFromPdfText', () => {
  it('PDF-like text → rows parsed with sourcePage', () => {
    const rows = parseSalaryRowsFromPdfText({
      year: 2024,
      pages: [
        `TABLA SALARIAL\nOficial panadero      1.420,30   19.884,20   1.420,30\nAyudante               1.280,15   17.922,10   1.280,15\n`,
      ],
    });
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const oficial = rows.find((r) => /panadero/i.test(r.category || ''));
    expect(oficial).toBeDefined();
    expect(oficial?.salaryBaseMonthly).toBe(1420.30);
    expect(oficial?.salaryBaseAnnual).toBe(19884.20);
    expect(oficial?.sourcePage).toBe(1);
    expect(oficial?.sourceExcerpt.length).toBeGreaterThan(0);
    expect(oficial?.requiresHumanReview).toBe(true);
  });
});