/**
 * B5A — Source-specific metadata normalizers.
 *
 * Pure functions. Each takes a RawAgreementMetadata and produces a
 * NormalizedAgreementRegistryRecord with FORCED safety flags. The
 * normalizers never:
 *  - mark ready_for_payroll = true
 *  - mark salary_tables_loaded = true
 *  - infer CNAE codes that are not present in the source
 *  - infer effective dates that are not present in the source
 *  - relax requires_human_review or official_submission_blocked
 *
 * The only field whose value depends on source quality is
 * `source_quality`, which is computed deterministically from the
 * source channel and the presence of an official URL/document.
 */

import type {
  AgreementImportSource,
  NormalizedAgreementRegistryRecord,
  RawAgreementMetadata,
  RegistryScopeType,
} from './collectiveAgreementsImportTypes';

// ── Internal helpers ──

const OFFICIAL_BULLETINS: ReadonlySet<AgreementImportSource> = new Set([
  'BOE',
  'BOIB',
  'DOGC',
  'DOGV',
  'BOJA',
  'BOCM',
  'BOP',
  'REGCON',
]);

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildInternalCode(raw: RawAgreementMetadata): string {
  if (raw.agreementCode && raw.agreementCode.trim().length > 0) {
    return raw.agreementCode.trim().toUpperCase();
  }
  const parts = [
    raw.source,
    slugify(raw.officialName ?? 'unknown'),
    raw.jurisdictionCode ? slugify(raw.jurisdictionCode) : 'es',
  ];
  return parts.filter(Boolean).join('::');
}

function inferScope(raw: RawAgreementMetadata): RegistryScopeType {
  const explicit = raw.scopeType?.toLowerCase();
  if (
    explicit === 'state' ||
    explicit === 'autonomous' ||
    explicit === 'provincial' ||
    explicit === 'company' ||
    explicit === 'group' ||
    explicit === 'sector'
  ) {
    return explicit;
  }
  if (raw.provinceCode) return 'provincial';
  if (raw.autonomousRegion) return 'autonomous';
  if (raw.source === 'BOE' && !raw.autonomousRegion && !raw.provinceCode) {
    return 'state';
  }
  return 'sector';
}

function inferSourceQuality(
  raw: RawAgreementMetadata
): NormalizedAgreementRegistryRecord['source_quality'] {
  const isOfficialChannel = OFFICIAL_BULLETINS.has(raw.source);
  const hasOfficialUrl = Boolean(
    (raw.publicationUrl && raw.publicationUrl.trim().length > 0) ||
      (raw.documentUrl && raw.documentUrl.trim().length > 0)
  );
  if (isOfficialChannel && hasOfficialUrl) return 'official';
  if (isOfficialChannel && !hasOfficialUrl) return 'pending_official_validation';
  return 'public_secondary';
}

function jurisdictionFor(raw: RawAgreementMetadata): string {
  if (raw.jurisdictionCode && raw.jurisdictionCode.trim()) return raw.jurisdictionCode;
  if (raw.provinceCode) return raw.provinceCode;
  if (raw.autonomousRegion) return raw.autonomousRegion;
  return 'ES';
}

function buildBase(
  raw: RawAgreementMetadata,
  publicationSource: string
): NormalizedAgreementRegistryRecord {
  return {
    internal_code: buildInternalCode(raw),
    agreement_code: raw.agreementCode?.trim() || null,
    official_name: raw.officialName,
    short_name: null,
    scope_type: inferScope(raw),
    jurisdiction_code: jurisdictionFor(raw),
    autonomous_region: raw.autonomousRegion ?? null,
    province_code: raw.provinceCode ?? null,
    sector: raw.sector ?? null,
    cnae_codes: Array.isArray(raw.cnaeCodes) ? [...raw.cnaeCodes] : [],
    publication_source: publicationSource,
    publication_url: raw.publicationUrl ?? raw.documentUrl ?? null,
    publication_date: raw.publicationDate ?? null,
    effective_start_date: raw.effectiveStartDate ?? null,
    effective_end_date: raw.effectiveEndDate ?? null,

    // ── Hard safety contract — DO NOT RELAX ──
    status: 'pendiente_validacion',
    source_quality: inferSourceQuality(raw),
    data_completeness: 'metadata_only',
    salary_tables_loaded: false,
    ready_for_payroll: false,
    requires_human_review: true,
    official_submission_blocked: true,
    notes: undefined,
  };
}

// ── Public source normalizers ──

export function normalizeBoeAgreementMetadata(
  raw: RawAgreementMetadata
): NormalizedAgreementRegistryRecord {
  return buildBase(raw, 'BOE');
}

export function normalizeRegconAgreementMetadata(
  raw: RawAgreementMetadata
): NormalizedAgreementRegistryRecord {
  return buildBase(raw, 'REGCON');
}

export function normalizeBoibAgreementMetadata(
  raw: RawAgreementMetadata
): NormalizedAgreementRegistryRecord {
  const base = buildBase(raw, 'BOIB');
  return {
    ...base,
    autonomous_region: base.autonomous_region ?? 'IB',
  };
}

export function normalizeAgreementMetadata(
  raw: RawAgreementMetadata
): NormalizedAgreementRegistryRecord {
  switch (raw.source) {
    case 'BOE':
      return normalizeBoeAgreementMetadata(raw);
    case 'REGCON':
      return normalizeRegconAgreementMetadata(raw);
    case 'BOIB':
      return normalizeBoibAgreementMetadata(raw);
    case 'DOGC':
    case 'DOGV':
    case 'BOJA':
    case 'BOCM':
    case 'BOP':
      return buildBase(raw, raw.source);
    case 'OTHER':
    default:
      return buildBase(raw, 'OTHER');
  }
}
