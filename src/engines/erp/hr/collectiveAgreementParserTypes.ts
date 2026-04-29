/**
 * B7A — Collective Agreement Parser · Types (pure).
 *
 * No Supabase imports. No fetch. No React. No side effects.
 * Used by:
 *  - collectiveAgreementDocumentHasher.ts
 *  - collectiveAgreementSalaryTableParser.ts
 *  - collectiveAgreementRulesParser.ts
 *  - collectiveAgreementParserPipeline.ts
 *
 * Safety contract (mirrors B5E neutralization):
 *  - requires_human_review === true (forced, never relaxed)
 *  - ready_for_payroll === false   (forced, never relaxed)
 *  - official_submission_blocked === true
 */

export type AgreementExtractionMethod =
  | 'pdf_text'
  | 'html_table'
  | 'manual_table_upload'
  | 'ocr_blocked'
  | 'document_missing';

export interface ParsedSourceDocument {
  sourceUrl: string;
  documentUrl: string;
  downloadedAt: string;
  sha256Hash: string;
  mimeType: 'application/pdf' | 'text/html' | 'application/octet-stream';
  pageCount?: number;
  extractionMethod: AgreementExtractionMethod;
  extractionConfidence: number;
}

export interface ParsedSalaryRow {
  year: number;
  professionalGroup?: string;
  category?: string;
  level?: string;
  salaryBaseMonthly?: number | null;
  salaryBaseAnnual?: number | null;
  extraPayAmount?: number | null;
  plusConvenio?: number | null;
  plusTransport?: number | null;
  plusAntiguedad?: number | null;
  plusNocturnidad?: number | null;
  plusFestivo?: number | null;
  plusResponsabilidad?: number | null;
  otherPlusesJson?: Record<string, number>;
  sourcePage: number;
  sourceExcerpt: string;
  rowConfidence: number;
  warnings: string[];
  requiresHumanReview: true;
}

export interface ParsedAgreementRules {
  jornadaAnualHours?: number;
  vacacionesDays?: number;
  extraPaymentsCount?: number;
  extraPaymentsProrrateadas?: boolean;
  antiguedadFormula?: string;
  horasExtraRule?: string;
  nocturnidadPercent?: number;
  festivosRule?: string;
  itComplementRule?: string;
  permisosRules?: Array<{ kind: string; days: number; sourceExcerpt: string }>;
  preavisoDays?: number;
  periodoPruebaDays?: Record<string, number>;
  unresolvedFields: string[];
  warnings: string[];
}

export interface ParserResult {
  internalCode: string;
  sourceDocument: ParsedSourceDocument;
  salaryRows: ParsedSalaryRow[];
  rules: ParsedAgreementRules;
  parserWarnings: string[];
  parserErrors: string[];
  unresolvedFields: string[];
  proposedRegistryPatch: {
    data_completeness: 'parsed_partial' | 'metadata_only';
    salary_tables_loaded: boolean;
    requires_human_review: true;
    ready_for_payroll: false;
    official_submission_blocked: true;
  };
}

export interface HtmlTable {
  headers: string[];
  rows: string[][];
  sourcePage?: number;
}

export interface DocumentReaderAdapter {
  readPdfText(buffer: Uint8Array): Promise<{ pages: string[] }>;
  readHtml(html: string): Promise<{ tables: HtmlTable[]; text: string }>;
}

export interface HashAdapter {
  sha256(buffer: Uint8Array): Promise<string>;
}

export interface FixtureLoaderAdapter {
  load(internalCode: string): Promise<{
    buffer: Uint8Array;
    mimeType: string;
    sourceUrl: string;
    documentUrl: string;
  } | null>;
}