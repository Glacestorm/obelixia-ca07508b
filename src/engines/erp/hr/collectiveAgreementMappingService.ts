/**
 * B10C.2B.2A — Pure service for managing company/contract/employee →
 * collective agreement Registry mappings.
 *
 * Hard contract:
 *  - Pure module: no Supabase, no fetch, no React, no hooks, no Deno,
 *    no service_role, no DB client. All I/O is performed via an
 *    injected adapter.
 *  - Does NOT touch payroll runtime: no payroll/payslip engine, no
 *    bridge, no salary resolver, no salary normalizer, no shadow flag.
 *  - Does NOT consume mapping from payroll. Approving an internal
 *    mapping NEVER activates it for nomina; that is reserved for B10D.
 *  - No ".delete(" anywhere. Append-only model. "supersede" is a state
 *    transition, not a deletion.
 *  - Does NOT reference operational table erp_hr_collective_agreements
 *    (without "_registry").
 *  - Does NOT write ready_for_payroll.
 */

export type MappingStatus =
  | 'draft'
  | 'pending_review'
  | 'approved_internal'
  | 'rejected'
  | 'superseded';

export type MappingSourceType =
  | 'manual_selection'
  | 'cnae_suggestion'
  | 'legacy_operational_match'
  | 'imported_mapping';

export type MappingAuthorizedRole =
  | 'superadmin'
  | 'admin'
  | 'hr_manager'
  | 'legal_manager'
  | 'payroll_supervisor';

const AUTHORIZED_ROLES: ReadonlyArray<MappingAuthorizedRole> = [
  'superadmin',
  'admin',
  'hr_manager',
  'legal_manager',
  'payroll_supervisor',
];

export interface MappingActorContext {
  userId: string;
  roles: MappingAuthorizedRole[];
  hasCompanyAccess: (companyId: string) => boolean;
  now?: () => Date;
}

export interface RegistryAgreementSummaryForMapping {
  id: string;
  ready_for_payroll: boolean;
  requires_human_review: boolean;
  data_completeness: string;
  source_quality: string;
}

export interface RegistryVersionSummaryForMapping {
  id: string;
  agreement_id: string;
  is_current: boolean;
}

export interface CompanyAgreementRegistryMapping {
  id: string;
  company_id: string;
  employee_id?: string | null;
  contract_id?: string | null;
  registry_agreement_id: string;
  registry_version_id: string;
  source_type: MappingSourceType;
  mapping_status: MappingStatus;
  confidence_score?: number | null;
  rationale_json?: Record<string, unknown>;
  evidence_urls?: string[];
  is_current: boolean;
  created_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CollectiveAgreementMappingAdapter {
  getMappingById(id: string): Promise<CompanyAgreementRegistryMapping | null>;
  getRegistryAgreement(
    id: string,
  ): Promise<RegistryAgreementSummaryForMapping | null>;
  getRegistryVersion(
    id: string,
  ): Promise<RegistryVersionSummaryForMapping | null>;
  insertMapping(
    row: Partial<CompanyAgreementRegistryMapping>,
  ): Promise<CompanyAgreementRegistryMapping>;
  updateMappingStatus(
    id: string,
    patch: Partial<CompanyAgreementRegistryMapping>,
  ): Promise<CompanyAgreementRegistryMapping>;
  listMappingsForScope(query: {
    company_id: string;
    employee_id?: string | null;
    contract_id?: string | null;
    mapping_status?: MappingStatus;
  }): Promise<CompanyAgreementRegistryMapping[]>;
}

export type MappingServiceErrorCode =
  | 'UNAUTHORIZED_ROLE'
  | 'NO_COMPANY_ACCESS'
  | 'INVALID_TRANSITION'
  | 'REGISTRY_NOT_READY'
  | 'VERSION_NOT_CURRENT'
  | 'IMMUTABLE_FIELD'
  | 'REASON_REQUIRED'
  | 'MAPPING_NOT_FOUND'
  | 'CNAE_AUTO_APPROVAL_FORBIDDEN'
  | 'REGISTRY_AGREEMENT_NOT_FOUND'
  | 'REGISTRY_VERSION_NOT_FOUND'
  | 'VERSION_AGREEMENT_MISMATCH';

export class MappingServiceError extends Error {
  code: MappingServiceErrorCode;
  constructor(code: MappingServiceErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'MappingServiceError';
  }
}

function assertAuthorizedRole(actor: MappingActorContext): void {
  const has = actor.roles?.some((r) => AUTHORIZED_ROLES.includes(r));
  if (!has) throw new MappingServiceError('UNAUTHORIZED_ROLE');
}

function assertCompanyAccess(
  actor: MappingActorContext,
  companyId: string,
): void {
  if (!actor.hasCompanyAccess(companyId)) {
    throw new MappingServiceError('NO_COMPANY_ACCESS');
  }
}

function nowIso(actor: MappingActorContext): string {
  return (actor.now ? actor.now() : new Date()).toISOString();
}

export interface CreateMappingDraftInput {
  company_id: string;
  employee_id?: string | null;
  contract_id?: string | null;
  registry_agreement_id: string;
  registry_version_id: string;
  source_type: MappingSourceType;
  confidence_score?: number | null;
  rationale_json?: Record<string, unknown>;
  evidence_urls?: string[];
}

export async function createMappingDraft(
  input: CreateMappingDraftInput,
  actor: MappingActorContext,
  adapter: CollectiveAgreementMappingAdapter,
): Promise<CompanyAgreementRegistryMapping> {
  assertAuthorizedRole(actor);
  assertCompanyAccess(actor, input.company_id);

  const agreement = await adapter.getRegistryAgreement(
    input.registry_agreement_id,
  );
  if (!agreement) {
    throw new MappingServiceError('REGISTRY_AGREEMENT_NOT_FOUND');
  }

  const version = await adapter.getRegistryVersion(input.registry_version_id);
  if (!version) {
    throw new MappingServiceError('REGISTRY_VERSION_NOT_FOUND');
  }
  if (version.agreement_id !== input.registry_agreement_id) {
    throw new MappingServiceError('VERSION_AGREEMENT_MISMATCH');
  }

  return adapter.insertMapping({
    company_id: input.company_id,
    employee_id: input.employee_id ?? null,
    contract_id: input.contract_id ?? null,
    registry_agreement_id: input.registry_agreement_id,
    registry_version_id: input.registry_version_id,
    source_type: input.source_type,
    confidence_score: input.confidence_score ?? null,
    rationale_json: input.rationale_json ?? {},
    evidence_urls: input.evidence_urls ?? [],
    mapping_status: 'draft',
    is_current: false,
    created_by: actor.userId,
    approved_by: null,
    approved_at: null,
  });
}

async function loadMappingOrThrow(
  id: string,
  adapter: CollectiveAgreementMappingAdapter,
): Promise<CompanyAgreementRegistryMapping> {
  const m = await adapter.getMappingById(id);
  if (!m) throw new MappingServiceError('MAPPING_NOT_FOUND');
  return m;
}

export interface SubmitMappingForReviewInput {
  mapping_id: string;
}

export async function submitMappingForReview(
  input: SubmitMappingForReviewInput,
  actor: MappingActorContext,
  adapter: CollectiveAgreementMappingAdapter,
): Promise<CompanyAgreementRegistryMapping> {
  assertAuthorizedRole(actor);
  const mapping = await loadMappingOrThrow(input.mapping_id, adapter);
  assertCompanyAccess(actor, mapping.company_id);

  if (mapping.mapping_status !== 'draft') {
    throw new MappingServiceError('INVALID_TRANSITION');
  }

  return adapter.updateMappingStatus(mapping.id, {
    mapping_status: 'pending_review',
  });
}

export interface ApproveMappingInput {
  mapping_id: string;
  humanConfirmed?: boolean;
}

export async function approveMapping(
  input: ApproveMappingInput,
  actor: MappingActorContext,
  adapter: CollectiveAgreementMappingAdapter,
): Promise<CompanyAgreementRegistryMapping> {
  assertAuthorizedRole(actor);
  const mapping = await loadMappingOrThrow(input.mapping_id, adapter);
  assertCompanyAccess(actor, mapping.company_id);

  if (mapping.mapping_status !== 'pending_review') {
    throw new MappingServiceError('INVALID_TRANSITION');
  }

  const agreement = await adapter.getRegistryAgreement(
    mapping.registry_agreement_id,
  );
  if (!agreement) {
    throw new MappingServiceError('REGISTRY_AGREEMENT_NOT_FOUND');
  }

  const isReady =
    agreement.ready_for_payroll === true &&
    agreement.requires_human_review === false &&
    agreement.data_completeness === 'human_validated' &&
    agreement.source_quality === 'official';
  if (!isReady) {
    throw new MappingServiceError('REGISTRY_NOT_READY');
  }

  const version = await adapter.getRegistryVersion(mapping.registry_version_id);
  if (!version) {
    throw new MappingServiceError('REGISTRY_VERSION_NOT_FOUND');
  }
  if (version.agreement_id !== mapping.registry_agreement_id) {
    throw new MappingServiceError('VERSION_AGREEMENT_MISMATCH');
  }
  if (!version.is_current) {
    throw new MappingServiceError('VERSION_NOT_CURRENT');
  }

  if (
    mapping.source_type === 'cnae_suggestion' &&
    input.humanConfirmed !== true
  ) {
    throw new MappingServiceError('CNAE_AUTO_APPROVAL_FORBIDDEN');
  }

  return adapter.updateMappingStatus(mapping.id, {
    mapping_status: 'approved_internal',
    approved_by: actor.userId,
    approved_at: nowIso(actor),
    is_current: true,
  });
}

export interface RejectMappingInput {
  mapping_id: string;
  reason: string;
}

function assertReason(reason: unknown): asserts reason is string {
  if (typeof reason !== 'string' || reason.trim().length < 5) {
    throw new MappingServiceError('REASON_REQUIRED');
  }
}

export async function rejectMapping(
  input: RejectMappingInput,
  actor: MappingActorContext,
  adapter: CollectiveAgreementMappingAdapter,
): Promise<CompanyAgreementRegistryMapping> {
  assertAuthorizedRole(actor);
  assertReason(input.reason);
  const mapping = await loadMappingOrThrow(input.mapping_id, adapter);
  assertCompanyAccess(actor, mapping.company_id);

  if (
    mapping.mapping_status !== 'draft' &&
    mapping.mapping_status !== 'pending_review'
  ) {
    throw new MappingServiceError('INVALID_TRANSITION');
  }

  const previousRationale = mapping.rationale_json ?? {};
  return adapter.updateMappingStatus(mapping.id, {
    mapping_status: 'rejected',
    rationale_json: {
      ...previousRationale,
      rejection: {
        reason: input.reason,
        by: actor.userId,
        at: nowIso(actor),
      },
    },
  });
}

export interface SupersedeMappingInput {
  mapping_id: string;
  reason: string;
}

export async function supersedeMapping(
  input: SupersedeMappingInput,
  actor: MappingActorContext,
  adapter: CollectiveAgreementMappingAdapter,
): Promise<CompanyAgreementRegistryMapping> {
  assertAuthorizedRole(actor);
  assertReason(input.reason);
  const mapping = await loadMappingOrThrow(input.mapping_id, adapter);
  assertCompanyAccess(actor, mapping.company_id);

  const previousRationale = mapping.rationale_json ?? {};
  return adapter.updateMappingStatus(mapping.id, {
    mapping_status: 'superseded',
    is_current: false,
    rationale_json: {
      ...previousRationale,
      supersession: {
        reason: input.reason,
        by: actor.userId,
        at: nowIso(actor),
      },
    },
  });
}

export interface ListMappingsForScopeInput {
  company_id: string;
  employee_id?: string | null;
  contract_id?: string | null;
  mapping_status?: MappingStatus;
}

export async function listMappingsForScope(
  input: ListMappingsForScopeInput,
  actor: MappingActorContext,
  adapter: CollectiveAgreementMappingAdapter,
): Promise<CompanyAgreementRegistryMapping[]> {
  assertAuthorizedRole(actor);
  assertCompanyAccess(actor, input.company_id);
  return adapter.listMappingsForScope({
    company_id: input.company_id,
    employee_id: input.employee_id ?? null,
    contract_id: input.contract_id ?? null,
    mapping_status: input.mapping_status,
  });
}
