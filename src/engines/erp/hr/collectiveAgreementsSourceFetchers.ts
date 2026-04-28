/**
 * B5C — Collective Agreements Source Fetchers (semi-pure).
 *
 * These fetchers connect official sources (BOE, BOIB, REGCON) to the
 * pure B5A normalizer pipeline. They are written so that:
 *
 *  - No `fetch()` call is hard-coded inside the parser logic. All
 *    network access happens through an injectable
 *    `AgreementSourceHttpAdapter`.
 *  - Tests pass a mock adapter; production wires a real adapter inside
 *    the edge function (B5D).
 *  - When a source has no stable public API (REGCON today), the
 *    fetcher returns `sourceAccessMode: 'manual_upload'` and a
 *    `SOURCE_REQUIRES_MANUAL_CONNECTOR_VALIDATION` warning instead of
 *    inventing a scraping flow.
 *  - The fetchers NEVER fabricate CNAE codes, effective dates, scope
 *    or sector when not present in the source. Missing fields stay
 *    undefined so the B5A normalizer keeps `data_completeness =
 *    'metadata_only'`.
 *  - The fetchers NEVER touch payroll engines, RLS, or the operational
 *    table.
 *
 * The `runSourceFetchAndImportDryRun` pipeline glues the fetcher to
 * the B5A normalizer + planner and verifies the safety contract before
 * returning. It NEVER writes to the DB.
 */

import {
  buildAgreementMetadataImportRun,
  planRegistryUpsert,
} from './collectiveAgreementsImporter';
import type {
  AgreementImportResult,
  NormalizedAgreementRegistryRecord,
  RawAgreementMetadata,
  RegistryUpsertPlan,
} from './collectiveAgreementsImportTypes';

// =============================================================
// Public types
// =============================================================

export type SupportedFetchSource = 'BOE' | 'BOIB' | 'REGCON';

export type SourceAccessMode = 'fixture' | 'http_adapter' | 'manual_upload';

export interface SourceFetchRequest {
  source: SupportedFetchSource;
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  jurisdictionCode?: string;
  limit?: number;
  /** Only used by the dry-run pipeline; fetchers themselves never write. */
  dryRun?: boolean;
  /**
   * Manual / fixture mode payload. When present, the fetcher will not
   * call the HTTP adapter and will treat this as the response body.
   */
  manualPayload?: unknown;
}

export interface SourceFetchError {
  reason: string;
  detail?: string;
}

export interface SourceFetchResult {
  source: string;
  fetchedAt: string;
  totalFound: number;
  items: RawAgreementMetadata[];
  warnings: string[];
  errors: SourceFetchError[];
  sourceAccessMode: SourceAccessMode;
}

export interface AgreementSourceHttpAdapter {
  get(
    url: string,
    options?: Record<string, unknown>
  ): Promise<{
    status: number;
    body: unknown;
    headers?: Record<string, string>;
  }>;
}

// =============================================================
// Helpers
// =============================================================

const AGREEMENT_KEYWORDS = [
  'convenio colectivo',
  'conveni col·lectiu',
  'conveni colectiu',
  'tablas salariales',
  'taules salarials',
  'revisión salarial',
  'revisio salarial',
];

const NOISE_KEYWORDS = [
  'oposici',
  'subvenci',
  'real decreto sobre el régimen jurídico',
  'becas',
];

function looksLikeAgreement(title: string | undefined | null): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  if (NOISE_KEYWORDS.some((k) => t.includes(k))) {
    // Allow if it ALSO clearly mentions an agreement keyword.
    if (!AGREEMENT_KEYWORDS.some((k) => t.includes(k))) return false;
  }
  return AGREEMENT_KEYWORDS.some((k) => t.includes(k));
}

function nowIso(): string {
  return new Date().toISOString();
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === 'string');
  return out.length > 0 ? out : undefined;
}

// =============================================================
// Fingerprint helper
// =============================================================

/**
 * Deterministic, side-effect-free fingerprint for a source document.
 *
 * IMPORTANT: this is a PREPARATORY hash for B5C. It is NOT a
 * cryptographic SHA-256. B7 (parser tablas salariales) will replace
 * this with a real SHA-256 computed server-side over the actual
 * document bytes. We keep this simple, dependency-free hash so that:
 *
 *  - tests are deterministic across runtimes (Node/Deno/browser);
 *  - downstream comparisons (`fingerprint changed → new version`) work
 *    in the dry-run pipeline;
 *  - we never depend on `publication_url` alone as a change signal
 *    (title + date + documentUrl all contribute).
 */
export function computeSourceDocumentFingerprint(input: {
  sourceUrl?: string;
  documentUrl?: string;
  title?: string;
  publicationDate?: string;
  raw?: unknown;
}): string {
  const parts: string[] = [
    (input.title ?? '').trim().toLowerCase(),
    (input.publicationDate ?? '').trim(),
    (input.documentUrl ?? '').trim(),
    (input.sourceUrl ?? '').trim(),
  ];
  const payload = parts.join('|');
  // FNV-1a 32-bit hash, hex encoded. Deterministic, no deps.
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

// =============================================================
// BOE fetcher
// =============================================================

const BOE_DEFAULT_BASE = 'https://www.boe.es/datosabiertos/api';

function parseBoeItem(item: unknown): RawAgreementMetadata | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const title = asString(o.titulo) ?? asString(o.title);
  if (!looksLikeAgreement(title)) return null;

  const publicationUrl = asString(o.url_html) ?? asString(o.url);
  const documentUrl = asString(o.url_pdf) ?? asString(o.documentUrl);

  return {
    source: 'BOE',
    sourceId: asString(o.identificador) ?? asString(o.id),
    agreementCode: asString(o.codigoConvenio) ?? asString(o.agreementCode),
    officialName: title!,
    publicationDate:
      asString(o.fecha_publicacion) ?? asString(o.publicationDate),
    publicationUrl,
    documentUrl,
    jurisdictionCode: 'ES',
    scopeType:
      asString(o.ambito) === 'estatal' ? 'state' : asString(o.scopeType),
    sector: asString(o.sector),
    cnaeCodes: asStringArray(o.cnae) ?? asStringArray(o.cnaeCodes),
    effectiveStartDate:
      asString(o.fecha_inicio) ?? asString(o.effectiveStartDate),
    effectiveEndDate:
      asString(o.fecha_fin) ?? asString(o.effectiveEndDate),
    raw: o,
  };
}

export async function fetchBoeAgreementMetadata(
  request: SourceFetchRequest,
  adapter?: AgreementSourceHttpAdapter
): Promise<SourceFetchResult> {
  const warnings: string[] = [];
  const errors: SourceFetchError[] = [];
  let items: RawAgreementMetadata[] = [];
  let mode: SourceAccessMode = 'http_adapter';
  let totalFound = 0;

  try {
    let body: unknown;

    if (request.manualPayload !== undefined) {
      mode = 'fixture';
      body = request.manualPayload;
    } else if (!adapter) {
      mode = 'manual_upload';
      warnings.push('SOURCE_REQUIRES_MANUAL_CONNECTOR_VALIDATION');
      warnings.push('BOE_NO_HTTP_ADAPTER_PROVIDED');
      return {
        source: 'BOE',
        fetchedAt: nowIso(),
        totalFound: 0,
        items: [],
        warnings,
        errors,
        sourceAccessMode: mode,
      };
    } else {
      const url = `${BOE_DEFAULT_BASE}/search?q=${encodeURIComponent(
        request.query ?? 'convenio colectivo'
      )}`;
      const response = await adapter.get(url, {
        dateFrom: request.dateFrom,
        dateTo: request.dateTo,
        limit: request.limit,
      });
      if (response.status !== 200) {
        errors.push({
          reason: 'BOE_HTTP_NON_200',
          detail: `status=${response.status}`,
        });
        return {
          source: 'BOE',
          fetchedAt: nowIso(),
          totalFound: 0,
          items: [],
          warnings,
          errors,
          sourceAccessMode: mode,
        };
      }
      body = response.body;
    }

    const root = (body && typeof body === 'object' ? body : {}) as Record<
      string,
      unknown
    >;
    const rawItems = asArray(root.items);
    totalFound = rawItems.length;

    const parsed: RawAgreementMetadata[] = [];
    let filteredOut = 0;
    for (const it of rawItems) {
      const r = parseBoeItem(it);
      if (r) parsed.push(r);
      else filteredOut += 1;
    }
    if (filteredOut > 0) {
      warnings.push(`BOE_FILTERED_NON_AGREEMENT_ITEMS:${filteredOut}`);
    }
    items = parsed;
  } catch (err) {
    errors.push({
      reason: 'BOE_FETCH_EXCEPTION',
      detail: err instanceof Error ? err.message : 'unknown',
    });
  }

  return {
    source: 'BOE',
    fetchedAt: nowIso(),
    totalFound,
    items,
    warnings,
    errors,
    sourceAccessMode: mode,
  };
}

// =============================================================
// BOIB fetcher
// =============================================================

const BOIB_DEFAULT_BASE = 'https://www.caib.es/eboibfront/api';

const BOIB_TOPIC_KEYWORDS = [
  'comerç',
  'comercio',
  'panaderia',
  'panadería',
  'pastelería',
  'pasteleria',
  'hostaleria',
  'hosteleria',
  'hostelería',
  'obrador',
];

function isBoibTopical(title: string | undefined): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return (
    looksLikeAgreement(title) ||
    BOIB_TOPIC_KEYWORDS.some((k) => t.includes(k))
  );
}

function parseBoibItem(item: unknown): RawAgreementMetadata | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const title = asString(o.titulo) ?? asString(o.title);
  if (!looksLikeAgreement(title) || !isBoibTopical(title)) return null;

  return {
    source: 'BOIB',
    sourceId: asString(o.id) ?? asString(o.identificador),
    agreementCode: asString(o.codigo) ?? asString(o.agreementCode),
    officialName: title!,
    publicationDate: asString(o.fecha) ?? asString(o.publicationDate),
    publicationUrl: asString(o.url) ?? asString(o.publicationUrl),
    jurisdictionCode: 'ES',
    autonomousRegion: asString(o.ccaa) ?? 'IB',
    scopeType:
      asString(o.ambito) === 'autonomico' ? 'autonomous' : asString(o.scopeType),
    sector: asString(o.sector),
    cnaeCodes: asStringArray(o.cnae) ?? asStringArray(o.cnaeCodes),
    raw: o,
  };
}

export async function fetchBoibAgreementMetadata(
  request: SourceFetchRequest,
  adapter?: AgreementSourceHttpAdapter
): Promise<SourceFetchResult> {
  const warnings: string[] = [];
  const errors: SourceFetchError[] = [];
  let items: RawAgreementMetadata[] = [];
  let mode: SourceAccessMode = 'http_adapter';
  let totalFound = 0;

  try {
    let body: unknown;
    if (request.manualPayload !== undefined) {
      mode = 'fixture';
      body = request.manualPayload;
    } else if (!adapter) {
      mode = 'manual_upload';
      warnings.push('SOURCE_REQUIRES_MANUAL_CONNECTOR_VALIDATION');
      warnings.push('BOIB_NO_HTTP_ADAPTER_PROVIDED');
      return {
        source: 'BOIB',
        fetchedAt: nowIso(),
        totalFound: 0,
        items: [],
        warnings,
        errors,
        sourceAccessMode: mode,
      };
    } else {
      const url = `${BOIB_DEFAULT_BASE}/search?q=${encodeURIComponent(
        request.query ?? 'convenio colectivo'
      )}`;
      const response = await adapter.get(url, {
        dateFrom: request.dateFrom,
        dateTo: request.dateTo,
        limit: request.limit,
      });
      if (response.status !== 200) {
        errors.push({
          reason: 'BOIB_HTTP_NON_200',
          detail: `status=${response.status}`,
        });
        return {
          source: 'BOIB',
          fetchedAt: nowIso(),
          totalFound: 0,
          items: [],
          warnings,
          errors,
          sourceAccessMode: mode,
        };
      }
      body = response.body;
    }

    const root = (body && typeof body === 'object' ? body : {}) as Record<
      string,
      unknown
    >;
    const rawItems = asArray(root.items);
    totalFound = rawItems.length;

    const parsed: RawAgreementMetadata[] = [];
    let filteredOut = 0;
    for (const it of rawItems) {
      const r = parseBoibItem(it);
      if (r) parsed.push(r);
      else filteredOut += 1;
    }
    if (filteredOut > 0) {
      warnings.push(`BOIB_FILTERED_NON_AGREEMENT_ITEMS:${filteredOut}`);
    }
    items = parsed;
  } catch (err) {
    errors.push({
      reason: 'BOIB_FETCH_EXCEPTION',
      detail: err instanceof Error ? err.message : 'unknown',
    });
  }

  return {
    source: 'BOIB',
    fetchedAt: nowIso(),
    totalFound,
    items,
    warnings,
    errors,
    sourceAccessMode: mode,
  };
}

// =============================================================
// REGCON fetcher (manual / fixture mode only for now)
// =============================================================

function parseRegconItem(item: unknown): RawAgreementMetadata | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const officialName =
    asString(o.officialName) ??
    asString(o.titulo) ??
    asString(o.title);
  if (!officialName) return null;
  return {
    source: 'REGCON',
    sourceId: asString(o.sourceId) ?? asString(o.id),
    agreementCode: asString(o.agreementCode) ?? asString(o.codigo),
    officialName,
    publicationDate:
      asString(o.publicationDate) ?? asString(o.fecha),
    publicationUrl: asString(o.publicationUrl) ?? asString(o.url),
    documentUrl: asString(o.documentUrl) ?? asString(o.url_pdf),
    jurisdictionCode: asString(o.jurisdictionCode) ?? 'ES',
    scopeType: asString(o.scopeType),
    sector: asString(o.sector),
    cnaeCodes:
      asStringArray(o.cnaeCodes) ?? asStringArray(o.cnae),
    raw: o,
  };
}

export async function fetchRegconAgreementMetadata(
  request: SourceFetchRequest,
  _adapter?: AgreementSourceHttpAdapter
): Promise<SourceFetchResult> {
  const warnings: string[] = [];
  const errors: SourceFetchError[] = [];

  // REGCON has no stable public REST API today: ALWAYS go through
  // manual_upload mode unless an explicit manualPayload is provided.
  if (request.manualPayload === undefined) {
    warnings.push('SOURCE_REQUIRES_MANUAL_CONNECTOR_VALIDATION');
    warnings.push('REGCON_NO_PUBLIC_API_USE_MANUAL_UPLOAD');
    return {
      source: 'REGCON',
      fetchedAt: nowIso(),
      totalFound: 0,
      items: [],
      warnings,
      errors,
      sourceAccessMode: 'manual_upload',
    };
  }

  const root = (request.manualPayload && typeof request.manualPayload === 'object'
    ? request.manualPayload
    : {}) as Record<string, unknown>;
  const rawItems = asArray(root.items);
  const totalFound = rawItems.length;

  const parsed: RawAgreementMetadata[] = [];
  let filteredOut = 0;
  for (const it of rawItems) {
    const r = parseRegconItem(it);
    if (r) parsed.push(r);
    else filteredOut += 1;
  }
  if (filteredOut > 0) {
    warnings.push(`REGCON_FILTERED_INVALID_ITEMS:${filteredOut}`);
  }

  return {
    source: 'REGCON',
    fetchedAt: nowIso(),
    totalFound,
    items: parsed,
    warnings,
    errors,
    sourceAccessMode: 'manual_upload',
  };
}

// =============================================================
// Dispatcher
// =============================================================

export async function fetchAgreementMetadataFromSource(
  request: SourceFetchRequest,
  adapter?: AgreementSourceHttpAdapter
): Promise<SourceFetchResult> {
  switch (request.source) {
    case 'BOE':
      return fetchBoeAgreementMetadata(request, adapter);
    case 'BOIB':
      return fetchBoibAgreementMetadata(request, adapter);
    case 'REGCON':
      return fetchRegconAgreementMetadata(request, adapter);
    default:
      return {
        source: String(request.source),
        fetchedAt: nowIso(),
        totalFound: 0,
        items: [],
        warnings: ['UNKNOWN_SOURCE'],
        errors: [{ reason: 'UNSUPPORTED_SOURCE' }],
        sourceAccessMode: 'manual_upload',
      };
  }
}

// =============================================================
// Dry-run pipeline (fetch → normalize → plan, NO DB writes)
// =============================================================

export interface RunSourceFetchAndImportDryRunInput {
  fetchRequest: SourceFetchRequest;
  adapter?: AgreementSourceHttpAdapter;
  existingInternalCodes: string[];
}

export interface DryRunSafetySummary {
  allReadyForPayrollFalse: boolean;
  allRequireHumanReview: boolean;
  allOfficialSubmissionBlocked: boolean;
  allMetadataOnly: boolean;
  allBlockedFromPayroll: boolean;
}

export interface RunSourceFetchAndImportDryRunResult {
  fetch: SourceFetchResult;
  importRun: AgreementImportResult;
  upsertPlan: RegistryUpsertPlan;
  safetySummary: DryRunSafetySummary;
  fingerprints: Record<string, string>;
}

function buildSafetySummary(
  records: NormalizedAgreementRegistryRecord[]
): DryRunSafetySummary {
  if (records.length === 0) {
    return {
      allReadyForPayrollFalse: true,
      allRequireHumanReview: true,
      allOfficialSubmissionBlocked: true,
      allMetadataOnly: true,
      allBlockedFromPayroll: true,
    };
  }
  return {
    allReadyForPayrollFalse: records.every((r) => r.ready_for_payroll === false),
    allRequireHumanReview: records.every((r) => r.requires_human_review === true),
    allOfficialSubmissionBlocked: records.every(
      (r) => r.official_submission_blocked === true
    ),
    allMetadataOnly: records.every((r) => r.data_completeness === 'metadata_only'),
    allBlockedFromPayroll: records.every(
      (r) =>
        r.ready_for_payroll === false &&
        r.salary_tables_loaded === false
    ),
  };
}

export async function runSourceFetchAndImportDryRun(
  input: RunSourceFetchAndImportDryRunInput
): Promise<RunSourceFetchAndImportDryRunResult> {
  // 1. Fetch (mock adapter or fixture).
  const fetchResult = await fetchAgreementMetadataFromSource(
    { ...input.fetchRequest, dryRun: true },
    input.adapter
  );

  // 2. Normalize via pure B5A pipeline.
  const importRun = buildAgreementMetadataImportRun({
    source: fetchResult.source as SupportedFetchSource,
    items: fetchResult.items,
  });

  // 3. Plan upsert vs existing codes (NO DB writes here).
  const upsertPlan = planRegistryUpsert({
    existingInternalCodes: input.existingInternalCodes,
    records: importRun.records,
  });

  // 4. Verify safety contract.
  const safetySummary = buildSafetySummary(importRun.records);

  // 5. Fingerprints — keyed by internal_code.
  const fingerprints: Record<string, string> = {};
  for (const raw of fetchResult.items) {
    const key =
      raw.agreementCode?.trim().toUpperCase() ??
      raw.sourceId ??
      raw.officialName;
    fingerprints[key] = computeSourceDocumentFingerprint({
      sourceUrl: raw.publicationUrl,
      documentUrl: raw.documentUrl,
      title: raw.officialName,
      publicationDate: raw.publicationDate,
      raw: raw.raw,
    });
  }

  return {
    fetch: fetchResult,
    importRun,
    upsertPlan,
    safetySummary,
    fingerprints,
  };
}
