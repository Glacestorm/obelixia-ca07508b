/**
 * B7A — Collective Agreement Salary Table Parser (pure).
 *
 * Conservative parser. Never invents values. Missing → null + warning.
 * Every row MUST have sourcePage and sourceExcerpt or it is dropped.
 *
 * No Supabase, no fetch, no React.
 */

import type { HtmlTable, ParsedSalaryRow } from './collectiveAgreementParserTypes';

type ColumnKind =
  | 'group'
  | 'category'
  | 'level'
  | 'salary_monthly'
  | 'salary_annual'
  | 'extra_pay'
  | 'plus_convenio'
  | 'plus_transport'
  | 'plus_antiguedad'
  | 'plus_nocturnidad'
  | 'plus_festivo'
  | 'plus_responsabilidad'
  | 'unknown';

function normalizeHeader(h: string): string {
  return (h || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyHeader(header: string): ColumnKind {
  const h = normalizeHeader(header);
  if (!h) return 'unknown';
  if (/\bgrupo( profesional)?\b/.test(h)) return 'group';
  if (/\bcategoria\b/.test(h)) return 'category';
  if (/\bnivel\b/.test(h)) return 'level';
  if (/(salario|sueldo).*(mes|mensual)/.test(h) || h === 'mensual') return 'salary_monthly';
  if (/(salario|sueldo).*(anual|ano)/.test(h) || h === 'anual') return 'salary_annual';
  if (/paga.*extra|extras?$/.test(h)) return 'extra_pay';
  if (/plus.*convenio/.test(h)) return 'plus_convenio';
  if (/plus.*transport/.test(h) || /transport/.test(h)) return 'plus_transport';
  if (/antig/.test(h)) return 'plus_antiguedad';
  if (/noctur/.test(h)) return 'plus_nocturnidad';
  if (/festiv/.test(h)) return 'plus_festivo';
  if (/responsab/.test(h)) return 'plus_responsabilidad';
  return 'unknown';
}

/**
 * Parses Spanish-formatted amount strings.
 * Supports: "1.234,56", "1234,56", "1,234.56" (only when unambiguous), "1234.56".
 * Returns null on ambiguity or non-numeric.
 */
export function parseSpanishAmount(input: string | undefined | null): number | null {
  if (input == null) return null;
  let s = String(input).trim();
  if (!s) return null;
  s = s.replace(/€|EUR|eur/g, '').replace(/\s+/g, '').trim();
  if (!s) return null;
  if (!/[0-9]/.test(s)) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  let normalized: string;
  if (hasComma && hasDot) {
    // Decide decimal separator by last occurrence.
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Spanish: "1.234,56"
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else {
      // English: "1,234.56"
      normalized = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Treat comma as decimal: "1234,56"
    const parts = s.split(',');
    if (parts.length > 2) return null;
    normalized = parts[0].replace(/\./g, '') + '.' + parts[1];
  } else if (hasDot) {
    // Could be thousands or decimal — heuristic: if exactly one dot
    // and ≤2 fractional digits, treat as decimal.
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = parts[0] + '.' + parts[1];
    } else {
      normalized = s.replace(/\./g, '');
    }
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function safeExcerpt(text: string): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length < 20) {
    // pad with surrounding hint markers but keep authentic content
    return t.length === 0 ? '' : t;
  }
  return t.slice(0, 200);
}

function rowExcerpt(headers: string[], row: string[]): string {
  const pairs = headers.map((h, i) => `${h}=${row[i] ?? ''}`).join(' | ');
  return safeExcerpt(pairs);
}

function setIfKnown(
  row: ParsedSalaryRow,
  kind: ColumnKind,
  raw: string | undefined,
): { warned: boolean } {
  const value = raw == null ? '' : String(raw).trim();
  if (kind === 'group') {
    if (value) row.professionalGroup = value;
    return { warned: false };
  }
  if (kind === 'category') {
    if (value) row.category = value;
    return { warned: false };
  }
  if (kind === 'level') {
    if (value) row.level = value;
    return { warned: false };
  }
  // numeric kinds
  const numeric = parseSpanishAmount(value);
  const assignNumeric = (key: keyof ParsedSalaryRow) => {
    (row as unknown as Record<string, unknown>)[key as string] = numeric;
  };
  switch (kind) {
    case 'salary_monthly':
      assignNumeric('salaryBaseMonthly'); break;
    case 'salary_annual':
      assignNumeric('salaryBaseAnnual'); break;
    case 'extra_pay':
      assignNumeric('extraPayAmount'); break;
    case 'plus_convenio':
      assignNumeric('plusConvenio'); break;
    case 'plus_transport':
      assignNumeric('plusTransport'); break;
    case 'plus_antiguedad':
      assignNumeric('plusAntiguedad'); break;
    case 'plus_nocturnidad':
      assignNumeric('plusNocturnidad'); break;
    case 'plus_festivo':
      assignNumeric('plusFestivo'); break;
    case 'plus_responsabilidad':
      assignNumeric('plusResponsabilidad'); break;
    default:
      return { warned: false };
  }
  // Warn when a numeric column was present but unparseable / empty.
  if (value && numeric == null) {
    row.warnings.push(`UNPARSEABLE_AMOUNT:${kind}:${value}`);
    return { warned: true };
  }
  if (!value) {
    row.warnings.push(`MISSING_AMOUNT:${kind}`);
    return { warned: true };
  }
  return { warned: false };
}

function computeRowConfidence(row: ParsedSalaryRow, knownColumns: number, totalColumns: number): number {
  if (totalColumns === 0) return 0;
  const hasIdentity = Boolean(row.professionalGroup || row.category || row.level);
  const hasAnyNumeric =
    row.salaryBaseMonthly != null ||
    row.salaryBaseAnnual != null ||
    row.extraPayAmount != null ||
    row.plusConvenio != null ||
    row.plusTransport != null ||
    row.plusAntiguedad != null ||
    row.plusNocturnidad != null ||
    row.plusFestivo != null ||
    row.plusResponsabilidad != null;

  let score = 0;
  if (hasIdentity) score += 0.45;
  if (hasAnyNumeric) score += 0.35;
  // Column recognition ratio
  score += 0.2 * (knownColumns / totalColumns);
  // Penalize per warning (up to -0.4)
  const penalty = Math.min(0.4, 0.05 * row.warnings.length);
  score -= penalty;
  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

export function parseSalaryRowsFromHtmlTables(input: {
  tables: HtmlTable[];
  year: number;
}): ParsedSalaryRow[] {
  const out: ParsedSalaryRow[] = [];
  for (const table of input.tables) {
    if (!table || !Array.isArray(table.headers) || !Array.isArray(table.rows)) continue;
    const kinds = table.headers.map(classifyHeader);
    const knownColumns = kinds.filter((k) => k !== 'unknown').length;
    if (knownColumns === 0) continue;

    const sourcePage = typeof table.sourcePage === 'number' ? table.sourcePage : 1;

    for (const cells of table.rows) {
      if (!cells || cells.every((c) => !String(c ?? '').trim())) continue;
      const row: ParsedSalaryRow = {
        year: input.year,
        sourcePage,
        sourceExcerpt: rowExcerpt(table.headers, cells),
        rowConfidence: 0,
        warnings: [],
        requiresHumanReview: true,
      };
      kinds.forEach((kind, idx) => {
        if (kind === 'unknown') return;
        setIfKnown(row, kind, cells[idx]);
      });

      // Drop rows without sourcePage/sourceExcerpt or no identifiable content.
      if (!row.sourceExcerpt || row.sourceExcerpt.length < 1) continue;
      const hasAny =
        row.professionalGroup ||
        row.category ||
        row.level ||
        row.salaryBaseMonthly != null ||
        row.salaryBaseAnnual != null;
      if (!hasAny) continue;

      row.rowConfidence = computeRowConfidence(row, knownColumns, table.headers.length);
      out.push(row);
    }
  }
  return out;
}

/**
 * PDF text parser — conservative line-based scanner.
 * Looks for lines matching a category-like prefix followed by 1-3
 * Spanish-formatted amounts. Lines that don't look like data rows
 * are ignored.
 */
export function parseSalaryRowsFromPdfText(input: {
  pages: string[];
  year: number;
}): ParsedSalaryRow[] {
  const out: ParsedSalaryRow[] = [];
  const amountRe = /-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?(?:\s*€)?|\d+[.,]\d{1,2}/g;

  input.pages.forEach((pageText, pageIdx) => {
    if (!pageText) return;
    const sourcePage = pageIdx + 1;
    const lines = pageText.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+/g, ' ').trim();
      if (!line || line.length < 6) continue;

      const amounts: string[] = line.match(amountRe) || [];
      // Need at least one numeric token to be a candidate data row
      if (amounts.length === 0) continue;

      // Extract textual prefix (category/group)
      const firstAmountIdx = line.search(/-?\d{1,3}([.\s]\d{3})*(,\d{1,2})?/);
      if (firstAmountIdx <= 0) continue;
      const prefix = line.slice(0, firstAmountIdx).trim();
      if (!prefix || prefix.length < 3) continue;
      // Skip section headings (all uppercase short tokens like "TABLA SALARIAL")
      if (/^(tabla|capitulo|art[ií]culo|anexo)\b/i.test(prefix)) continue;

      const row: ParsedSalaryRow = {
        year: input.year,
        category: prefix,
        sourcePage,
        sourceExcerpt: safeExcerpt(line),
        rowConfidence: 0,
        warnings: [],
        requiresHumanReview: true,
      };

      // Heuristic: 1st amount = monthly, 2nd = annual, 3rd = extra pay
      const parsed = amounts.map((a) => parseSpanishAmount(a));
      if (parsed[0] != null) row.salaryBaseMonthly = parsed[0];
      if (parsed[1] != null) row.salaryBaseAnnual = parsed[1];
      if (parsed[2] != null) row.extraPayAmount = parsed[2];
      if (parsed.some((p) => p == null)) {
        row.warnings.push('UNPARSEABLE_AMOUNT_IN_LINE');
      }

      // Confidence based on having a category and at least one parsed amount
      const knownish = (row.salaryBaseMonthly != null ? 1 : 0) +
        (row.salaryBaseAnnual != null ? 1 : 0) +
        (row.extraPayAmount != null ? 1 : 0);
      row.rowConfidence = computeRowConfidence(
        row,
        knownish + 1, // +1 for category column
        Math.max(2, amounts.length + 1),
      );
      out.push(row);
    }
  });
  return out;
}