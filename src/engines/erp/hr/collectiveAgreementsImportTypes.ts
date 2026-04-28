/**
 * B5A — Collective Agreements Importer · Types
 *
 * Pure type module. No runtime side effects, no Supabase, no React.
 * Used by:
 *  - collectiveAgreementsSourceNormalizers.ts
 *  - collectiveAgreementsImporter.ts
 *  - tests in src/__tests__/hr/collective-agreements-importer.test.ts
 *
 * Safety contract: every NormalizedAgreementRegistryRecord built from
 * these types is FORCED into a non-payroll-ready, metadata-only state.
 * The trigger `enforce_ca_registry_ready_for_payroll` in DB will reject
 * any row that violates this contract.
 */

export type AgreementImportSource =
  | 'REGCON'
  | 'BOE'
  | 'BOIB'
  | 'DOGC'
  | 'DOGV'
  | 'BOJA'
  | 'BOCM'
  | 'BOP'
  | 'OTHER';

export interface RawAgreementMetadata {
  source: AgreementImportSource;
  sourceId?: string;
  agreementCode?: string;
  officialName: string;
  publicationDate?: string;
  publicationUrl?: string;
  documentUrl?: string;
  jurisdictionCode?: string;
  autonomousRegion?: string;
  provinceCode?: string;
  scopeType?: string;
  sector?: string;
  cnaeCodes?: string[];
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  raw?: unknown;
}

export type RegistryScopeType =
  | 'state'
  | 'autonomous'
  | 'provincial'
  | 'company'
  | 'group'
  | 'sector';

export interface NormalizedAgreementRegistryRecord {
  internal_code: string;
  agreement_code?: string | null;
  official_name: string;
  short_name?: string | null;
  scope_type: RegistryScopeType;
  jurisdiction_code: string;
  autonomous_region?: string | null;
  province_code?: string | null;
  sector?: string | null;
  cnae_codes: string[];
  publication_source?: string | null;
  publication_url?: string | null;
  publication_date?: string | null;
  effective_start_date?: string | null;
  effective_end_date?: string | null;

  // Forced safety flags — must NEVER be relaxed by the importer.
  status: 'pendiente_validacion';
  source_quality: 'official' | 'public_secondary' | 'pending_official_validation';
  data_completeness: 'metadata_only';
  salary_tables_loaded: false;
  ready_for_payroll: false;
  requires_human_review: true;
  official_submission_blocked: true;
  notes?: string;
}

export interface AgreementImportError {
  sourceId?: string;
  reason: string;
}

export interface AgreementImportResult {
  totalFound: number;
  normalized: number;
  skipped: number;
  errors: AgreementImportError[];
  records: NormalizedAgreementRegistryRecord[];
}

export interface RegistryUpsertPlan {
  toInsert: NormalizedAgreementRegistryRecord[];
  toUpdate: NormalizedAgreementRegistryRecord[];
  skipped: NormalizedAgreementRegistryRecord[];
}
