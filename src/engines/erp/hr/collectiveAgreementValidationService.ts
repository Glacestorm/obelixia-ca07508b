/**
 * B8A — Collective Agreement Validation Service (pure, admin-gated).
 *
 * Orchestrates the human validation workflow for registry agreements.
 * No Supabase, no fetch, no React, no DB. All I/O is delegated to
 * an injected `ValidationServiceAdapter`.
 *
 * HARD SAFETY:
 *  - NEVER patches `erp_hr_collective_agreements_registry`
 *    (no `ready_for_payroll`, `requires_human_review`,
 *    `data_completeness`, `salary_tables_loaded`).
 *  - NEVER touches the operational table
 *    (only the registry sub-tables created in B8A).
 *  - NEVER touches payroll engines.
 *  - The internal signature is NOT a qualified eIDAS signature.
 */

import {
  canonicalizeValidationPayload,
  computeValidationSignatureHash,
  type ValidationSignaturePayload,
} from './collectiveAgreementValidationSignature';

// =============================================================
// Constants
// =============================================================

export const VALIDATION_CHECKLIST_KEYS_V1 = [
  'official_source_verified',
  'sha256_reviewed',
  'publication_date_reviewed',
  'effective_period_reviewed',
  'territorial_scope_reviewed',
  'functional_scope_reviewed',
  'cnae_codes_reviewed',
  'professional_groups_reviewed',
  'categories_reviewed',
  'salary_base_reviewed',
  'pluses_reviewed',
  'working_hours_reviewed',
  'extra_payments_reviewed',
  'seniority_reviewed_or_pending',
  'it_complement_reviewed_or_pending',
  'parser_warnings_reviewed',
  'discarded_rows_reviewed',
  'no_payroll_use_acknowledged',
] as const;

export type ValidationChecklistKey = (typeof VALIDATION_CHECKLIST_KEYS_V1)[number];

export type ValidationItemStatus =
  | 'pending'
  | 'verified'
  | 'accepted_with_caveat'
  | 'rejected'
  | 'not_applicable';

export type ValidationStatus =
  | 'draft'
  | 'pending_review'
  | 'approved_internal'
  | 'rejected'
  | 'superseded';

export type ValidationScope =
  | 'metadata'
  | 'salary_tables'
  | 'rules'
  | 'full_payroll_readiness';

const AUTHORIZED_ROLES = ['admin', 'superadmin', 'hr_manager', 'legal_manager'] as const;

// =============================================================
// Adapter row types
// =============================================================

export interface RegistryAgreementRow {
  id: string;
  internal_code: string;
}
export interface RegistryVersionRow {
  id: string;
  agreement_id: string;
  source_hash: string | null;
  is_current: boolean;
}
export interface RegistrySourceRow {
  id: string;
  agreement_id: string;
  document_hash: string | null;
}
export interface ValidationRow {
  id: string;
  agreement_id: string;
  version_id: string;
  source_id: string;
  sha256_hash: string;
  validator_user_id: string;
  validator_role: string;
  validation_status: ValidationStatus;
  validation_scope: ValidationScope[];
  is_current: boolean;
  notes: string | null;
  unresolved_warnings: Array<{ code: string; severity?: string }>;
  resolved_warnings: unknown[];
  signature_hash: string | null;
  validated_at: string | null;
}
export interface ValidationItemRow {
  id?: string;
  validation_id: string;
  item_key: ValidationChecklistKey | string;
  item_status: ValidationItemStatus;
  comment: string | null;
  evidence_url: string | null;
  evidence_excerpt: string | null;
}

// =============================================================
// Adapter args
// =============================================================

export interface InsertValidationArgs {
  agreement_id: string;
  version_id: string;
  source_id: string;
  sha256_hash: string;
  validator_user_id: string;
  validator_role: string;
  validator_company_id?: string | null;
  validation_status: 'draft' | 'pending_review';
  validation_scope: ValidationScope[];
  triggered_by_import_run_id?: string | null;
}

export interface UpdateValidationArgs {
  id: string;
  patch: Partial<{
    validation_status: ValidationStatus;
    validation_scope: ValidationScope[];
    notes: string | null;
    unresolved_warnings: unknown[];
    resolved_warnings: unknown[];
    signature_hash: string | null;
    validated_at: string | null;
    is_current: boolean;
    previous_validation_id: string | null;
  }>;
}

export interface InsertSignatureArgs {
  validation_id: string;
  signed_at: string;
  signed_by: string;
  signed_by_role: string;
  signature_hash: string;
  payload_canonical: Record<string, unknown>;
  algorithm?: string;
  previous_signature_id?: string | null;
}

export interface InsertItemsArgs {
  validation_id: string;
  items: Array<{
    item_key: ValidationChecklistKey | string;
    item_status?: ValidationItemStatus;
  }>;
}

export interface UpsertItemArgs {
  validation_id: string;
  item_key: ValidationChecklistKey | string;
  item_status: ValidationItemStatus;
  comment?: string | null;
  evidence_url?: string | null;
  evidence_excerpt?: string | null;
}

// =============================================================
// Adapter
// =============================================================

export interface ValidationServiceAdapter {
  fetchAgreement(id: string): Promise<RegistryAgreementRow | null>;
  fetchVersion(id: string): Promise<RegistryVersionRow | null>;
  fetchSource(id: string): Promise<RegistrySourceRow | null>;
  fetchCurrentValidation(
    agreementId: string,
    versionId: string,
  ): Promise<ValidationRow | null>;
  fetchValidation(id: string): Promise<ValidationRow | null>;
  fetchValidationItems(validationId: string): Promise<ValidationItemRow[]>;
  fetchUserRoles(userId: string): Promise<string[]>;

  insertValidation(args: InsertValidationArgs): Promise<{ id: string }>;
  updateValidation(args: UpdateValidationArgs): Promise<void>;
  insertSignature(args: InsertSignatureArgs): Promise<{ id: string }>;
  insertItems(args: InsertItemsArgs): Promise<void>;
  upsertItem(args: UpsertItemArgs): Promise<void>;
  supersedeValidation(id: string): Promise<void>;
}

// =============================================================
// Public types
// =============================================================

export interface CreateValidationDraftInput {
  agreement_id: string;
  version_id: string;
  source_id: string;
  validator_user_id: string;
  validation_scope: ValidationScope[];
  triggered_by_import_run_id?: string | null;
  validator_company_id?: string | null;
}

export interface ValidationDraftResult {
  id: string;
  sha256_hash: string;
  validator_role: string;
}

export interface UpdateChecklistInput {
  validation_id: string;
  validator_user_id: string;
  item_key: ValidationChecklistKey | string;
  item_status: ValidationItemStatus;
  comment?: string | null;
  evidence_url?: string | null;
  evidence_excerpt?: string | null;
}

export interface SubmitForReviewInput {
  validation_id: string;
  validator_user_id: string;
}

export interface ApproveValidationInput {
  validation_id: string;
  validator_user_id: string;
}

export interface ApproveValidationResult {
  signature_hash: string;
  validated_at: string;
  is_current: true;
  superseded_previous_id: string | null;
}

export interface RejectValidationInput {
  validation_id: string;
  validator_user_id: string;
  notes: string;
}

export interface SupersedeValidationInput {
  validation_id: string;
}

// =============================================================
// Helpers
// =============================================================

function pickRole(roles: string[]): string | null {
  for (const r of AUTHORIZED_ROLES) if (roles.includes(r)) return r;
  return null;
}

function ensureAuthorized(roles: string[], errorCode = 'ROLE_NOT_AUTHORIZED'): string {
  const role = pickRole(roles);
  if (!role) throw new Error(errorCode);
  return role;
}

const CRITICAL_SEVERITIES = new Set(['critical', 'CRITICAL']);

function hasCriticalUnresolved(
  warnings: ValidationRow['unresolved_warnings'] | undefined,
): boolean {
  if (!Array.isArray(warnings)) return false;
  return warnings.some((w) => w && CRITICAL_SEVERITIES.has(String(w.severity ?? '')));
}

// =============================================================
// Service functions
// =============================================================

export async function createValidationDraft(
  input: CreateValidationDraftInput,
  adapter: ValidationServiceAdapter,
): Promise<ValidationDraftResult> {
  const [agreement, version, source, roles] = await Promise.all([
    adapter.fetchAgreement(input.agreement_id),
    adapter.fetchVersion(input.version_id),
    adapter.fetchSource(input.source_id),
    adapter.fetchUserRoles(input.validator_user_id),
  ]);
  if (!agreement) throw new Error('AGREEMENT_NOT_FOUND');
  if (!version) throw new Error('VERSION_NOT_FOUND');
  if (version.agreement_id !== agreement.id) throw new Error('VERSION_AGREEMENT_MISMATCH');
  if (!source) throw new Error('SOURCE_NOT_FOUND');
  if (source.agreement_id !== agreement.id) throw new Error('SOURCE_AGREEMENT_MISMATCH');

  const sha256 = version.source_hash;
  if (!sha256 || !/^[a-f0-9]{64}$/.test(sha256)) {
    throw new Error('VERSION_SHA256_INVALID');
  }

  const role = ensureAuthorized(roles);

  const { id } = await adapter.insertValidation({
    agreement_id: agreement.id,
    version_id: version.id,
    source_id: source.id,
    sha256_hash: sha256,
    validator_user_id: input.validator_user_id,
    validator_role: role,
    validator_company_id: input.validator_company_id ?? null,
    validation_status: 'draft',
    validation_scope: input.validation_scope ?? [],
    triggered_by_import_run_id: input.triggered_by_import_run_id ?? null,
  });

  await adapter.insertItems({
    validation_id: id,
    items: VALIDATION_CHECKLIST_KEYS_V1.map((item_key) => ({
      item_key,
      item_status: 'pending',
    })),
  });

  return { id, sha256_hash: sha256, validator_role: role };
}

export async function updateValidationChecklist(
  input: UpdateChecklistInput,
  adapter: ValidationServiceAdapter,
): Promise<void> {
  const v = await adapter.fetchValidation(input.validation_id);
  if (!v) throw new Error('VALIDATION_NOT_FOUND');
  if (v.validator_user_id !== input.validator_user_id) throw new Error('NOT_OWNER');
  if (v.validation_status !== 'draft' && v.validation_status !== 'pending_review') {
    throw new Error('VALIDATION_NOT_EDITABLE');
  }
  if (input.item_status === 'accepted_with_caveat') {
    if (!input.comment || input.comment.trim().length === 0) {
      throw new Error('CAVEAT_REQUIRES_COMMENT');
    }
  }
  await adapter.upsertItem({
    validation_id: input.validation_id,
    item_key: input.item_key,
    item_status: input.item_status,
    comment: input.comment ?? null,
    evidence_url: input.evidence_url ?? null,
    evidence_excerpt: input.evidence_excerpt ?? null,
  });
}

export async function submitForReview(
  input: SubmitForReviewInput,
  adapter: ValidationServiceAdapter,
): Promise<void> {
  const v = await adapter.fetchValidation(input.validation_id);
  if (!v) throw new Error('VALIDATION_NOT_FOUND');
  if (v.validator_user_id !== input.validator_user_id) throw new Error('NOT_OWNER');
  if (v.validation_status !== 'draft') throw new Error('VALIDATION_NOT_DRAFT');
  await adapter.updateValidation({
    id: v.id,
    patch: { validation_status: 'pending_review' },
  });
}

export async function approveValidation(
  input: ApproveValidationInput,
  adapter: ValidationServiceAdapter,
  options?: { now?: () => Date },
): Promise<ApproveValidationResult> {
  const nowFn = options?.now ?? (() => new Date());

  const v = await adapter.fetchValidation(input.validation_id);
  if (!v) throw new Error('VALIDATION_NOT_FOUND');
  if (v.validation_status !== 'draft' && v.validation_status !== 'pending_review') {
    throw new Error('VALIDATION_NOT_APPROVABLE');
  }

  const roles = await adapter.fetchUserRoles(input.validator_user_id);
  const signedRole = ensureAuthorized(roles);

  const [version, source, items] = await Promise.all([
    adapter.fetchVersion(v.version_id),
    adapter.fetchSource(v.source_id),
    adapter.fetchValidationItems(v.id),
  ]);
  if (!version) throw new Error('VERSION_NOT_FOUND');
  if (!source) throw new Error('SOURCE_NOT_FOUND');

  if (version.source_hash !== v.sha256_hash) {
    throw new Error('SHA256_MISMATCH');
  }

  // Critical unresolved warnings block approval.
  if (hasCriticalUnresolved(v.unresolved_warnings)) {
    throw new Error('CRITICAL_UNRESOLVED_WARNINGS');
  }

  // Checklist completeness.
  const itemsByKey = new Map(items.map((i) => [i.item_key, i]));
  const missing: string[] = [];
  for (const k of VALIDATION_CHECKLIST_KEYS_V1) {
    const it = itemsByKey.get(k);
    if (!it) {
      missing.push(k);
      continue;
    }
    if (
      it.item_status !== 'verified' &&
      it.item_status !== 'accepted_with_caveat' &&
      it.item_status !== 'not_applicable'
    ) {
      throw new Error(`CHECKLIST_ITEM_PENDING:${k}`);
    }
    if (it.item_status === 'accepted_with_caveat') {
      if (!it.comment || String(it.comment).trim().length === 0) {
        throw new Error(`CAVEAT_REQUIRES_COMMENT:${k}`);
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(`CHECKLIST_INCOMPLETE:${missing.join(',')}`);
  }

  // no_payroll_use_acknowledged must be VERIFIED (not accepted_with_caveat / not_applicable).
  const ack = itemsByKey.get('no_payroll_use_acknowledged');
  if (!ack || ack.item_status !== 'verified') {
    throw new Error('NO_PAYROLL_USE_ACK_REQUIRED');
  }

  // If salary_tables in scope, certain items cannot be not_applicable.
  if (v.validation_scope.includes('salary_tables')) {
    for (const k of ['salary_base_reviewed', 'pluses_reviewed', 'categories_reviewed'] as const) {
      const it = itemsByKey.get(k);
      if (!it || it.item_status === 'not_applicable') {
        throw new Error(`SCOPE_SALARY_TABLES_REQUIRES:${k}`);
      }
    }
  }

  // Build canonical signature payload.
  const signedAt = nowFn().toISOString();
  const checklistForPayload = VALIDATION_CHECKLIST_KEYS_V1.map((k) => {
    const it = itemsByKey.get(k)!;
    return { key: k, status: it.item_status, comment: it.comment ?? null };
  });

  const payload: ValidationSignaturePayload = {
    agreement_id: v.agreement_id,
    version_id: v.version_id,
    source_id: v.source_id,
    sha256_hash: v.sha256_hash,
    validator_user_id: input.validator_user_id,
    validator_role: signedRole,
    validation_scope: v.validation_scope,
    checklist: checklistForPayload,
    unresolved_warnings: v.unresolved_warnings ?? [],
    resolved_warnings: v.resolved_warnings ?? [],
    previous_validation_id: null,
    signed_at_iso: signedAt,
    checklist_schema_version: 'v1',
  };

  // Find previous current validation to chain previous_validation_id.
  const previousCurrent = await adapter.fetchCurrentValidation(v.agreement_id, v.version_id);
  payload.previous_validation_id = previousCurrent?.id ?? null;

  const signatureHash = await computeValidationSignatureHash(payload);
  const canonicalString = canonicalizeValidationPayload(payload);

  // Update validation: approved + signature + current.
  await adapter.updateValidation({
    id: v.id,
    patch: {
      validation_status: 'approved_internal',
      signature_hash: signatureHash,
      validated_at: signedAt,
      is_current: true,
      previous_validation_id: payload.previous_validation_id,
    },
  });

  await adapter.insertSignature({
    validation_id: v.id,
    signed_at: signedAt,
    signed_by: input.validator_user_id,
    signed_by_role: signedRole,
    signature_hash: signatureHash,
    payload_canonical: JSON.parse(canonicalString),
    algorithm: 'sha256-canonical-v1',
    previous_signature_id: null,
  });

  let supersededPreviousId: string | null = null;
  if (previousCurrent && previousCurrent.id !== v.id) {
    await adapter.supersedeValidation(previousCurrent.id);
    supersededPreviousId = previousCurrent.id;
  }

  return {
    signature_hash: signatureHash,
    validated_at: signedAt,
    is_current: true,
    superseded_previous_id: supersededPreviousId,
  };
}

export async function rejectValidation(
  input: RejectValidationInput,
  adapter: ValidationServiceAdapter,
  options?: { now?: () => Date },
): Promise<void> {
  const nowFn = options?.now ?? (() => new Date());
  if (!input.notes || input.notes.trim().length === 0) {
    throw new Error('REJECT_REQUIRES_NOTES');
  }
  const v = await adapter.fetchValidation(input.validation_id);
  if (!v) throw new Error('VALIDATION_NOT_FOUND');
  if (v.validation_status !== 'draft' && v.validation_status !== 'pending_review') {
    throw new Error('VALIDATION_NOT_REJECTABLE');
  }
  const roles = await adapter.fetchUserRoles(input.validator_user_id);
  const signedRole = ensureAuthorized(roles);

  const items = await adapter.fetchValidationItems(v.id);
  const checklist = items.map((it) => ({
    key: it.item_key,
    status: it.item_status,
    comment: it.comment ?? null,
  }));

  const signedAt = nowFn().toISOString();
  const payload: ValidationSignaturePayload = {
    agreement_id: v.agreement_id,
    version_id: v.version_id,
    source_id: v.source_id,
    sha256_hash: v.sha256_hash,
    validator_user_id: input.validator_user_id,
    validator_role: signedRole,
    validation_scope: v.validation_scope,
    checklist,
    unresolved_warnings: v.unresolved_warnings ?? [],
    resolved_warnings: v.resolved_warnings ?? [],
    previous_validation_id: null,
    signed_at_iso: signedAt,
    checklist_schema_version: 'v1',
  };
  const signatureHash = await computeValidationSignatureHash(payload);
  const canonicalString = canonicalizeValidationPayload(payload);

  await adapter.updateValidation({
    id: v.id,
    patch: {
      validation_status: 'rejected',
      signature_hash: signatureHash,
      validated_at: signedAt,
      is_current: false,
    },
  });

  await adapter.insertSignature({
    validation_id: v.id,
    signed_at: signedAt,
    signed_by: input.validator_user_id,
    signed_by_role: signedRole,
    signature_hash: signatureHash,
    payload_canonical: JSON.parse(canonicalString),
    algorithm: 'sha256-canonical-v1',
    previous_signature_id: null,
  });
}

export async function supersedeValidation(
  input: SupersedeValidationInput,
  adapter: ValidationServiceAdapter,
): Promise<void> {
  const v = await adapter.fetchValidation(input.validation_id);
  if (!v) throw new Error('VALIDATION_NOT_FOUND');
  await adapter.supersedeValidation(v.id);
}
