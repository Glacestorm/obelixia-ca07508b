/**
 * officialResponseParserEngine.ts — LM1+LM2: Official Response Parsers
 * 
 * Pure engine (no side effects) for interpreting imported official responses:
 *  - parseTGSSResponse(): TGSS/RED/SILTRA acuse
 *  - parseSEPEResponse(): Contrat@ / Certific@2 response
 *  - parseAEATResponse(): AEAT CSV/justificante
 *  - mapToReceiptType(): convert to institutionalSubmissionEngine ReceiptType
 *  - autoDetectOrganism(): guess organism from raw input shape
 */

import type { ReceiptType } from './institutionalSubmissionEngine';

// ── Common Types ────────────────────────────────────────────────────────────

export type ParsedResponseStatus = 'accepted' | 'rejected' | 'partial' | 'processing' | 'error' | 'unknown';

export interface ParsedOfficialResponse {
  organism: 'tgss' | 'sepe' | 'aeat' | 'unknown';
  subChannel?: 'contrata' | 'certifica2' | 'red_siltra' | 'sede_aeat';
  status: ParsedResponseStatus;
  reference: string | null;
  csvCode?: string | null;
  errors: ParsedError[];
  warnings: string[];
  rawData: Record<string, unknown>;
  parsedAt: string;
  receiptType: ReceiptType;
}

export interface ParsedError {
  code: string | null;
  field: string | null;
  message: string;
  registroIndex?: number;
}

// ── Raw Input Shape ─────────────────────────────────────────────────────────

export interface RawResponseInput {
  organism?: string;
  responseType?: string; // 'acceptance' | 'rejection' | 'partial' | 'correction'
  reference?: string;
  csvCode?: string;
  receptionDate?: string;
  errorsText?: string;
  errorsJson?: ParsedError[];
  rawContent?: string;
  metadata?: Record<string, unknown>;
}

// ── TGSS Parser ─────────────────────────────────────────────────────────────

export function parseTGSSResponse(input: RawResponseInput): ParsedOfficialResponse {
  const status = mapResponseTypeToStatus(input.responseType);
  const errors = extractErrors(input);

  return {
    organism: 'tgss',
    subChannel: 'red_siltra',
    status,
    reference: input.reference || null,
    errors,
    warnings: extractWarnings(input),
    rawData: { ...input.metadata, rawContent: input.rawContent },
    parsedAt: new Date().toISOString(),
    receiptType: mapStatusToReceiptType(status),
  };
}

// ── SEPE Parser (Contrat@ + Certific@2) ─────────────────────────────────────

export function parseSEPEResponse(input: RawResponseInput, channel?: 'contrata' | 'certifica2'): ParsedOfficialResponse {
  const status = mapResponseTypeToStatus(input.responseType);
  const errors = extractErrors(input);

  const subChannel = channel
    || (input.metadata?.channel as 'contrata' | 'certifica2')
    || detectSEPEChannel(input);

  return {
    organism: 'sepe',
    subChannel,
    status,
    reference: input.reference || null,
    errors,
    warnings: extractWarnings(input),
    rawData: { ...input.metadata, rawContent: input.rawContent },
    parsedAt: new Date().toISOString(),
    receiptType: mapStatusToReceiptType(status),
  };
}

// ── AEAT Parser ─────────────────────────────────────────────────────────────

export function parseAEATResponse(input: RawResponseInput): ParsedOfficialResponse {
  const status = mapResponseTypeToStatus(input.responseType);
  const errors = extractErrors(input);

  return {
    organism: 'aeat',
    subChannel: 'sede_aeat',
    status,
    reference: input.reference || null,
    csvCode: input.csvCode || null,
    errors,
    warnings: extractWarnings(input),
    rawData: { ...input.metadata, rawContent: input.rawContent },
    parsedAt: new Date().toISOString(),
    receiptType: mapStatusToReceiptType(status),
  };
}

// ── Auto-detect organism ────────────────────────────────────────────────────

export function autoDetectOrganism(input: RawResponseInput): 'tgss' | 'sepe' | 'aeat' | 'unknown' {
  if (input.organism) {
    const norm = input.organism.toLowerCase();
    if (norm.includes('tgss') || norm.includes('siltra') || norm.includes('red')) return 'tgss';
    if (norm.includes('sepe') || norm.includes('contrat') || norm.includes('certific')) return 'sepe';
    if (norm.includes('aeat') || norm.includes('agencia tributaria')) return 'aeat';
  }
  if (input.csvCode) return 'aeat';
  if (input.reference) {
    if (/^[0-9]{13,16}$/.test(input.reference)) return 'tgss';
    if (/^[A-Z]{2}[0-9]+/.test(input.reference)) return 'sepe';
  }
  return 'unknown';
}

export function parseUniversal(input: RawResponseInput): ParsedOfficialResponse {
  const organism = autoDetectOrganism(input);
  switch (organism) {
    case 'tgss': return parseTGSSResponse(input);
    case 'sepe': return parseSEPEResponse(input);
    case 'aeat': return parseAEATResponse(input);
    default:
      return {
        organism: 'unknown',
        status: mapResponseTypeToStatus(input.responseType),
        reference: input.reference || null,
        errors: extractErrors(input),
        warnings: [],
        rawData: { ...input.metadata },
        parsedAt: new Date().toISOString(),
        receiptType: mapStatusToReceiptType(mapResponseTypeToStatus(input.responseType)),
      };
  }
}

// ── Mapping to ReceiptType ──────────────────────────────────────────────────

export function mapStatusToReceiptType(status: ParsedResponseStatus): ReceiptType {
  switch (status) {
    case 'accepted': return 'acceptance';
    case 'rejected': return 'rejection';
    case 'partial': return 'partial_acceptance';
    case 'processing': return 'processing';
    case 'error': return 'error';
    default: return 'acknowledgment';
  }
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function mapResponseTypeToStatus(responseType?: string): ParsedResponseStatus {
  if (!responseType) return 'unknown';
  const norm = responseType.toLowerCase();
  if (norm.includes('accept') || norm === 'acceptance') return 'accepted';
  if (norm.includes('reject') || norm === 'rejection') return 'rejected';
  if (norm.includes('partial')) return 'partial';
  if (norm.includes('correct') || norm.includes('processing')) return 'processing';
  if (norm.includes('error')) return 'error';
  return 'unknown';
}

function extractErrors(input: RawResponseInput): ParsedError[] {
  if (input.errorsJson && input.errorsJson.length > 0) return input.errorsJson;
  if (input.errorsText) {
    return input.errorsText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(msg => ({ code: null, field: null, message: msg }));
  }
  return [];
}

function extractWarnings(input: RawResponseInput): string[] {
  const warnings: string[] = [];
  if (input.metadata?.warnings && Array.isArray(input.metadata.warnings)) {
    warnings.push(...(input.metadata.warnings as string[]));
  }
  return warnings;
}

function detectSEPEChannel(input: RawResponseInput): 'contrata' | 'certifica2' {
  const raw = JSON.stringify(input).toLowerCase();
  if (raw.includes('certific')) return 'certifica2';
  return 'contrata';
}
