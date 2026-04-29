/**
 * B7A — Collective Agreement Parser Pipeline (pure orchestrator).
 *
 * Composes:
 *  - SHA-256 hashing of source document buffer
 *  - Salary table parsing (HTML or PDF text)
 *  - Rules parsing (Spanish text heuristics)
 *
 * Safety invariants (mirror B5E neutralization):
 *  - proposedRegistryPatch.requires_human_review === true
 *  - proposedRegistryPatch.ready_for_payroll === false
 *  - proposedRegistryPatch.official_submission_blocked === true
 *
 * No Supabase, no fetch, no DB writes.
 */

import {
  computeSha256Hex,
  isValidSha256Hex,
} from './collectiveAgreementDocumentHasher';
import { parseAgreementRulesFromText } from './collectiveAgreementRulesParser';
import {
  parseSalaryRowsFromHtmlTables,
  parseSalaryRowsFromPdfText,
} from './collectiveAgreementSalaryTableParser';
import type {
  AgreementExtractionMethod,
  DocumentReaderAdapter,
  HashAdapter,
  ParsedSalaryRow,
  ParsedSourceDocument,
  ParserResult,
} from './collectiveAgreementParserTypes';

const ROW_CONFIDENCE_THRESHOLD = 0.6;

function inferMimeType(
  method: AgreementExtractionMethod,
  explicit?: string,
): ParsedSourceDocument['mimeType'] {
  if (explicit === 'application/pdf' || explicit === 'text/html' || explicit === 'application/octet-stream') {
    return explicit;
  }
  if (method === 'pdf_text') return 'application/pdf';
  if (method === 'html_table') return 'text/html';
  return 'application/octet-stream';
}

function emptyHash(): string {
  // 64 zero hex chars — sentinel for "no document"; not a real SHA-256
  // of any meaningful input. Will fail isValidSha256Hex semantically
  // for safety_tables_loaded gating because we ALSO require a real
  // buffer + extraction method.
  return '0'.repeat(64);
}

export interface ParseInput {
  internalCode: string;
  year: number;
  sourceUrl: string;
  documentUrl: string;
  buffer?: Uint8Array;
  mimeType?: string;
  extractionMethod?: AgreementExtractionMethod;
  reader?: DocumentReaderAdapter;
  hashAdapter?: HashAdapter;
}

export async function parseCollectiveAgreementDocument(
  input: ParseInput,
): Promise<ParserResult> {
  const downloadedAt = new Date().toISOString();
  const parserWarnings: string[] = [];
  const parserErrors: string[] = [];

  // ---- Determine extraction method ----
  let method: AgreementExtractionMethod = input.extractionMethod ?? 'document_missing';
  if (!input.buffer && method !== 'document_missing') {
    parserWarnings.push('BUFFER_MISSING_FORCING_DOCUMENT_MISSING');
    method = 'document_missing';
  }

  // ---- Compute SHA-256 (real) ----
  let sha256Hash = emptyHash();
  if (input.buffer && method !== 'document_missing') {
    try {
      const hasher = input.hashAdapter?.sha256 ?? computeSha256Hex;
      sha256Hash = await hasher(input.buffer);
    } catch (err) {
      parserErrors.push(`HASH_FAILED:${(err as Error).message}`);
      sha256Hash = emptyHash();
    }
  } else if (method === 'document_missing') {
    parserWarnings.push('DOCUMENT_MISSING');
  }

  // ---- Parse content ----
  let salaryRows: ParsedSalaryRow[] = [];
  let rulesText = '';

  if (method === 'ocr_blocked') {
    parserWarnings.push('OCR_REQUIRED_BUT_BLOCKED_IN_B7A');
  } else if (method === 'html_table' && input.buffer && input.reader) {
    try {
      const html = new TextDecoder('utf-8').decode(input.buffer);
      const parsed = await input.reader.readHtml(html);
      salaryRows = parseSalaryRowsFromHtmlTables({
        tables: parsed.tables,
        year: input.year,
      });
      rulesText = parsed.text || '';
    } catch (err) {
      parserErrors.push(`HTML_READ_FAILED:${(err as Error).message}`);
    }
  } else if (method === 'pdf_text' && input.buffer && input.reader) {
    try {
      const parsed = await input.reader.readPdfText(input.buffer);
      salaryRows = parseSalaryRowsFromPdfText({
        pages: parsed.pages,
        year: input.year,
      });
      rulesText = parsed.pages.join('\n');
    } catch (err) {
      parserErrors.push(`PDF_READ_FAILED:${(err as Error).message}`);
    }
  } else if (method === 'manual_table_upload' && input.buffer && input.reader) {
    // Treat curated upload as HTML table input by convention.
    try {
      const html = new TextDecoder('utf-8').decode(input.buffer);
      const parsed = await input.reader.readHtml(html);
      salaryRows = parseSalaryRowsFromHtmlTables({
        tables: parsed.tables,
        year: input.year,
      });
      rulesText = parsed.text || '';
      parserWarnings.push('MANUAL_UPLOAD_REQUIRES_HUMAN_REVIEW');
    } catch (err) {
      parserErrors.push(`MANUAL_READ_FAILED:${(err as Error).message}`);
    }
  }

  const rules = parseAgreementRulesFromText(rulesText);

  // ---- Decide proposed registry patch (forced safety) ----
  const validHash = isValidSha256Hex(sha256Hash) && sha256Hash !== emptyHash();
  const methodAllowsTables: AgreementExtractionMethod[] = [
    'pdf_text',
    'html_table',
    'manual_table_upload',
  ];
  const highConfidenceRows = salaryRows.filter((r) => r.rowConfidence >= ROW_CONFIDENCE_THRESHOLD);
  const salary_tables_loaded =
    validHash &&
    methodAllowsTables.includes(method) &&
    highConfidenceRows.length > 0;

  const hasAnyRules =
    rules.jornadaAnualHours != null ||
    rules.vacacionesDays != null ||
    rules.extraPaymentsCount != null ||
    (rules.permisosRules?.length ?? 0) > 0;

  const data_completeness: 'parsed_partial' | 'metadata_only' =
    method !== 'document_missing' &&
    method !== 'ocr_blocked' &&
    validHash &&
    (salary_tables_loaded || hasAnyRules)
      ? 'parsed_partial'
      : 'metadata_only';

  const sourceDocument: ParsedSourceDocument = {
    sourceUrl: input.sourceUrl,
    documentUrl: input.documentUrl,
    downloadedAt,
    sha256Hash,
    mimeType: inferMimeType(method, input.mimeType),
    extractionMethod: method,
    extractionConfidence: salary_tables_loaded
      ? 0.7
      : data_completeness === 'parsed_partial'
        ? 0.4
        : 0,
  };

  const unresolvedFields = [
    ...rules.unresolvedFields,
    ...(salaryRows.length === 0 && method !== 'document_missing' && method !== 'ocr_blocked'
      ? ['salaryRows']
      : []),
  ];

  return {
    internalCode: input.internalCode,
    sourceDocument,
    salaryRows,
    rules,
    parserWarnings,
    parserErrors,
    unresolvedFields,
    proposedRegistryPatch: {
      data_completeness,
      salary_tables_loaded,
      // Forced — neutralizes any malicious caller intent.
      requires_human_review: true,
      ready_for_payroll: false,
      official_submission_blocked: true,
    },
  };
}