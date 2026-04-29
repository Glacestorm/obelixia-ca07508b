/**
 * B7A tests — Parser pipeline (BOIB Baleares).
 *
 * Tripwires:
 *  - globalThis.fetch must NEVER be called.
 *  - No Supabase imports in the new parser modules.
 *  - Safety flags are forced (cannot be relaxed by caller).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCollectiveAgreementDocument } from '@/engines/erp/hr/collectiveAgreementParserPipeline';
import type {
  DocumentReaderAdapter,
  HtmlTable,
} from '@/engines/erp/hr/collectiveAgreementParserTypes';
import { comercioHtmlFixture } from './fixtures/collective-agreements/b7-boib-parser/comercio-html-table.fixture';
import { panaderiaPdfFixture } from './fixtures/collective-agreements/b7-boib-parser/panaderia-pdf-text.fixture';
import { hosteleriaAmbiguousFixture } from './fixtures/collective-agreements/b7-boib-parser/hosteleria-ambiguous.fixture';
import { alimentariaMissingFixture } from './fixtures/collective-agreements/b7-boib-parser/alimentaria-document-missing.fixture';

/**
 * Minimal HTML reader for tests — extracts <table> blocks via regex.
 * Production B7B will inject a real DOM/cheerio adapter.
 */
const testReader: DocumentReaderAdapter = {
  async readHtml(html: string) {
    const tables: HtmlTable[] = [];
    const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let m: RegExpExecArray | null;
    while ((m = tableRe.exec(html)) !== null) {
      const inner = m[1];
      const headers: string[] = [];
      const rows: string[][] = [];
      const headerMatch = inner.match(/<thead>([\s\S]*?)<\/thead>/i);
      if (headerMatch) {
        const ths = headerMatch[1].match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
        headers.push(...ths.map((t) => t.replace(/<[^>]+>/g, '').trim()));
      }
      const bodyMatch = inner.match(/<tbody>([\s\S]*?)<\/tbody>/i);
      const bodyHtml = bodyMatch ? bodyMatch[1] : inner;
      const trs = bodyHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      for (const tr of trs) {
        if (/<th[^>]*>/i.test(tr) && headers.length > 0) continue;
        const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (tds.length === 0) continue;
        rows.push(tds.map((t) => t.replace(/<[^>]+>/g, '').trim()));
      }
      tables.push({ headers, rows, sourcePage: 1 });
    }
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { tables, text };
  },
  async readPdfText(buffer: Uint8Array) {
    // Test convention: PDF buffer is JSON-encoded { pages: string[] }
    const json = JSON.parse(new TextDecoder('utf-8').decode(buffer));
    return { pages: json.pages as string[] };
  },
};

const enc = (s: string) => new TextEncoder().encode(s);
const encPdf = (pages: string[]) => enc(JSON.stringify({ pages }));

let fetchSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeEach(() => {
  if (typeof globalThis.fetch !== 'function') {
    (globalThis as { fetch?: typeof fetch }).fetch = (() => {
      throw new Error('fetch must NOT be called in B7A');
    }) as typeof fetch;
  }
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
    throw new Error('fetch must NOT be called in B7A');
  });
});

afterEach(() => {
  fetchSpy?.mockRestore();
  fetchSpy = null;
});

describe('B7A — pipeline · html_table (Comercio BOIB)', () => {
  it('produces parsed_partial + salary_tables_loaded with safe flags', async () => {
    const f = comercioHtmlFixture;
    const result = await parseCollectiveAgreementDocument({
      internalCode: f.internalCode,
      year: f.year,
      sourceUrl: f.sourceUrl,
      documentUrl: f.documentUrl,
      buffer: enc(f.html),
      mimeType: 'text/html',
      extractionMethod: 'html_table',
      reader: testReader,
    });

    expect(result.internalCode).toBe('COM-GEN-IB');
    expect(result.salaryRows.length).toBeGreaterThanOrEqual(3);
    expect(result.salaryRows.every((r) => r.requiresHumanReview === true)).toBe(true);
    expect(result.salaryRows.every((r) => r.sourcePage > 0)).toBe(true);
    expect(result.salaryRows.every((r) => r.sourceExcerpt.length > 0)).toBe(true);
    expect(result.proposedRegistryPatch.data_completeness).toBe('parsed_partial');
    expect(result.proposedRegistryPatch.salary_tables_loaded).toBe(true);
    expect(result.proposedRegistryPatch.requires_human_review).toBe(true);
    expect(result.proposedRegistryPatch.ready_for_payroll).toBe(false);
    expect(result.proposedRegistryPatch.official_submission_blocked).toBe(true);
    expect(result.sourceDocument.sha256Hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.sourceDocument.sha256Hash).not.toBe('0'.repeat(64));
    expect(result.rules.jornadaAnualHours).toBe(1776);
    expect(result.rules.vacacionesDays).toBe(30);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('B7A — pipeline · pdf_text (Panadería BOIB)', () => {
  it('parses PDF-like pages with sourcePage', async () => {
    const f = panaderiaPdfFixture;
    const result = await parseCollectiveAgreementDocument({
      internalCode: f.internalCode,
      year: f.year,
      sourceUrl: f.sourceUrl,
      documentUrl: f.documentUrl,
      buffer: encPdf(f.pages),
      mimeType: 'application/pdf',
      extractionMethod: 'pdf_text',
      reader: testReader,
    });
    expect(result.salaryRows.length).toBeGreaterThanOrEqual(2);
    const oficial = result.salaryRows.find((r) => /panadero/i.test(r.category || ''));
    expect(oficial).toBeDefined();
    expect(oficial?.sourcePage).toBe(1);
    expect(result.proposedRegistryPatch.requires_human_review).toBe(true);
    expect(result.proposedRegistryPatch.ready_for_payroll).toBe(false);
    expect(result.rules.nocturnidadPercent).toBe(25);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('B7A — pipeline · ambiguous (Hostelería BOIB)', () => {
  it('keeps human review and does not load tables for low-confidence rows', async () => {
    const f = hosteleriaAmbiguousFixture;
    const result = await parseCollectiveAgreementDocument({
      internalCode: f.internalCode,
      year: f.year,
      sourceUrl: f.sourceUrl,
      documentUrl: f.documentUrl,
      buffer: enc(f.html),
      mimeType: 'text/html',
      extractionMethod: 'html_table',
      reader: testReader,
    });
    expect(result.proposedRegistryPatch.requires_human_review).toBe(true);
    expect(result.proposedRegistryPatch.ready_for_payroll).toBe(false);
    // No row should reach the >=0.6 threshold (column "Importe?" is unknown
    // and amounts are non-numeric / sentinel) → salary_tables_loaded false.
    expect(result.proposedRegistryPatch.salary_tables_loaded).toBe(false);
  });
});

describe('B7A — pipeline · document_missing (Alimentaria BOIB)', () => {
  it('stays in metadata_only with DOCUMENT_MISSING warning', async () => {
    const f = alimentariaMissingFixture;
    const result = await parseCollectiveAgreementDocument({
      internalCode: f.internalCode,
      year: f.year,
      sourceUrl: f.sourceUrl,
      documentUrl: f.documentUrl,
      // no buffer
      reader: testReader,
    });
    expect(result.sourceDocument.extractionMethod).toBe('document_missing');
    expect(result.salaryRows).toHaveLength(0);
    expect(result.proposedRegistryPatch.data_completeness).toBe('metadata_only');
    expect(result.proposedRegistryPatch.salary_tables_loaded).toBe(false);
    expect(result.proposedRegistryPatch.requires_human_review).toBe(true);
    expect(result.proposedRegistryPatch.ready_for_payroll).toBe(false);
    expect(result.parserWarnings).toContain('DOCUMENT_MISSING');
  });
});

describe('B7A — pipeline · ocr_blocked', () => {
  it('does not attempt OCR; stays in metadata_only', async () => {
    const result = await parseCollectiveAgreementDocument({
      internalCode: 'OCR-TEST',
      year: 2024,
      sourceUrl: 'https://example.test/doc',
      documentUrl: 'https://example.test/doc.pdf',
      buffer: enc('binary-scan-bytes'),
      mimeType: 'application/pdf',
      extractionMethod: 'ocr_blocked',
      reader: testReader,
    });
    expect(result.proposedRegistryPatch.data_completeness).toBe('metadata_only');
    expect(result.proposedRegistryPatch.salary_tables_loaded).toBe(false);
    expect(result.proposedRegistryPatch.requires_human_review).toBe(true);
    expect(result.proposedRegistryPatch.ready_for_payroll).toBe(false);
    expect(result.parserWarnings).toContain('OCR_REQUIRED_BUT_BLOCKED_IN_B7A');
  });
});

describe('B7A — safety invariants', () => {
  it('caller cannot force ready_for_payroll=true (no such input accepted)', async () => {
    // Even passing an unsafe extra prop is ignored — type system + impl
    // construct proposedRegistryPatch from forced literals.
    const result = await parseCollectiveAgreementDocument({
      internalCode: 'UNSAFE-TEST',
      year: 2024,
      sourceUrl: 'https://example.test',
      documentUrl: 'https://example.test/x',
      buffer: enc(comercioHtmlFixture.html),
      mimeType: 'text/html',
      extractionMethod: 'html_table',
      reader: testReader,
      ready_for_payroll: true,
      requires_human_review: false,
    } as never);
    expect(result.proposedRegistryPatch.ready_for_payroll).toBe(false);
    expect(result.proposedRegistryPatch.requires_human_review).toBe(true);
    expect(result.proposedRegistryPatch.official_submission_blocked).toBe(true);
  });

  it('new parser modules contain no Supabase imports', () => {
    const files = [
      'src/engines/erp/hr/collectiveAgreementParserTypes.ts',
      'src/engines/erp/hr/collectiveAgreementDocumentHasher.ts',
      'src/engines/erp/hr/collectiveAgreementSalaryTableParser.ts',
      'src/engines/erp/hr/collectiveAgreementRulesParser.ts',
      'src/engines/erp/hr/collectiveAgreementParserPipeline.ts',
    ];
    for (const f of files) {
      const src = readFileSync(resolve(process.cwd(), f), 'utf8');
      expect(src).not.toMatch(/@\/integrations\/supabase/);
      expect(src).not.toMatch(/from\s+['"]@supabase\//);
      expect(src).not.toMatch(/\bsupabase\.from\b/);
    }
  });
});