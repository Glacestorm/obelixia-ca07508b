/**
 * B8A.2 — Admin-gated edge wrapper for the B8A Human Validation Service.
 *
 * Exposes the validation workflow (create_draft, update_checklist_item,
 * submit_for_review, approve, reject, supersede) over HTTP with strict
 * server-side role-check, sanitized errors and an isolated service-role
 * client.
 *
 * HARD SAFETY (mirrored from B8A service):
 *  - Never patches `erp_hr_collective_agreements_registry` master flags
 *    (`ready_for_payroll`, `data_completeness`, `salary_tables_loaded`,
 *     `requires_human_review`, `official_submission_blocked`).
 *  - Never references the operational table `erp_hr_collective_agreements`
 *    (without `_registry`).
 *  - Never imports payroll engines, payslip, salary normalizer, agreement
 *    salary resolver, or `useESPayrollBridge`.
 *  - SERVICE_ROLE_KEY is read from `Deno.env.get` only and is never
 *    returned to the client.
 *  - Errors are sanitized: no DB raw messages, no stack traces.
 *
 * NOTE: The validation logic (canonicalization + signature + checklist
 * enforcement) is intentionally inlined here because Supabase edge
 * functions cannot import from `src/`. The algorithms mirror exactly
 * `src/engines/erp/hr/collectiveAgreementValidationService.ts` and
 * `src/engines/erp/hr/collectiveAgreementValidationSignature.ts`.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

// ---------------------------------------------------------------
// CORS
// ---------------------------------------------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------
// Constants (mirror service)
// ---------------------------------------------------------------
const VALIDATION_CHECKLIST_KEYS_V1 = [
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

const AUTHORIZED_ROLES = [
  'admin',
  'superadmin',
  'hr_manager',
  'legal_manager',
] as const;

const VALIDATION_SCOPE_VALUES = [
  'metadata',
  'salary_tables',
  'rules',
  'full_payroll_readiness',
] as const;

const ITEM_STATUS_VALUES = [
  'pending',
  'verified',
  'accepted_with_caveat',
  'rejected',
  'not_applicable',
] as const;

// ---------------------------------------------------------------
// Forbidden master-registry / payroll fields (anti-tampering)
// ---------------------------------------------------------------
const FORBIDDEN_PAYLOAD_KEYS = [
  'ready_for_payroll',
  'data_completeness',
  'salary_tables_loaded',
  'requires_human_review',
  'official_submission_blocked',
  'validation_status',
  'signature_hash',
  'validated_at',
  'is_current',
] as const;

// ---------------------------------------------------------------
// Zod schemas (strict — no extra keys allowed)
// ---------------------------------------------------------------
const uuid = z.string().uuid();

const CreateDraftSchema = z
  .object({
    action: z.literal('create_draft'),
    agreementId: uuid,
    versionId: uuid,
    sourceId: uuid,
    validationScope: z.array(z.enum(VALIDATION_SCOPE_VALUES)).min(1),
    triggeredByImportRunId: uuid.optional(),
  })
  .strict();

const UpdateChecklistItemSchema = z
  .object({
    action: z.literal('update_checklist_item'),
    validationId: uuid,
    itemKey: z.string().min(1).max(80),
    itemStatus: z.enum(ITEM_STATUS_VALUES),
    comment: z.string().max(4000).optional(),
    evidenceUrl: z.string().url().max(2000).optional(),
    evidenceExcerpt: z.string().max(4000).optional(),
  })
  .strict();

const SubmitForReviewSchema = z
  .object({
    action: z.literal('submit_for_review'),
    validationId: uuid,
  })
  .strict();

const ApproveSchema = z
  .object({
    action: z.literal('approve'),
    validationId: uuid,
    notes: z.string().max(4000).optional(),
  })
  .strict();

const RejectSchema = z
  .object({
    action: z.literal('reject'),
    validationId: uuid,
    notes: z.string().min(10).max(4000),
  })
  .strict();

const SupersedeSchema = z
  .object({
    action: z.literal('supersede'),
    validationId: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

const KNOWN_ACTIONS = [
  'create_draft',
  'update_checklist_item',
  'submit_for_review',
  'approve',
  'reject',
  'supersede',
] as const;

// ---------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------
function jsonResponse(
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function successResponse(action: string, data: unknown): Response {
  return jsonResponse(200, {
    success: true,
    data: data ?? {},
    meta: { timestamp: new Date().toISOString(), action },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  action: string | null = null,
): Response {
  return jsonResponse(status, {
    success: false,
    error: { code, message },
    meta: { timestamp: new Date().toISOString(), action: action ?? 'unknown' },
  });
}

// ---------------------------------------------------------------
// Service error → HTTP mapping (sanitized)
// ---------------------------------------------------------------
export function mapServiceError(err: unknown): {
  status: number;
  code: string;
  message: string;
} {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  // Match by prefix (some service errors include `:detail`).
  const head = raw.split(':')[0] ?? '';

  if (head === 'AGREEMENT_NOT_FOUND')
    return { status: 404, code: 'AGREEMENT_NOT_FOUND', message: 'Agreement not found' };
  if (
    head === 'VERSION_NOT_FOUND' ||
    head === 'VERSION_AGREEMENT_MISMATCH' ||
    head === 'VERSION_SHA256_INVALID'
  )
    return { status: 404, code: 'VERSION_NOT_FOUND', message: 'Version not found' };
  if (head === 'SOURCE_NOT_FOUND' || head === 'SOURCE_AGREEMENT_MISMATCH')
    return { status: 404, code: 'SOURCE_NOT_FOUND', message: 'Source not found' };
  if (head === 'VALIDATION_NOT_FOUND')
    return { status: 404, code: 'VALIDATION_NOT_FOUND', message: 'Validation not found' };

  if (
    head === 'ROLE_NOT_AUTHORIZED' ||
    head === 'NOT_OWNER' ||
    head === 'VALIDATION_NOT_EDITABLE' ||
    head === 'VALIDATION_NOT_DRAFT' ||
    head === 'VALIDATION_NOT_APPROVABLE' ||
    head === 'VALIDATION_NOT_REJECTABLE'
  )
    return { status: 403, code: 'ROLE_NOT_AUTHORIZED', message: 'Not authorized' };

  if (head === 'SHA256_MISMATCH')
    return { status: 400, code: 'SHA256_MISMATCH', message: 'SHA-256 mismatch' };
  if (head === 'CRITICAL_UNRESOLVED_WARNINGS')
    return {
      status: 400,
      code: 'CRITICAL_WARNINGS_UNRESOLVED',
      message: 'Unresolved critical warnings',
    };
  if (
    head === 'CHECKLIST_INCOMPLETE' ||
    head === 'CHECKLIST_ITEM_PENDING' ||
    head === 'SCOPE_SALARY_TABLES_REQUIRES'
  )
    return { status: 400, code: 'CHECKLIST_INCOMPLETE', message: 'Checklist incomplete' };
  if (head === 'NO_PAYROLL_USE_ACK_REQUIRED')
    return {
      status: 400,
      code: 'NO_PAYROLL_USE_ACK_REQUIRED',
      message: 'No-payroll-use acknowledgement required',
    };
  if (head === 'CAVEAT_REQUIRES_COMMENT')
    return {
      status: 400,
      code: 'ACCEPTED_WITH_CAVEAT_REQUIRES_COMMENT',
      message: 'Caveat requires a comment',
    };
  if (head === 'REJECT_REQUIRES_NOTES')
    return { status: 400, code: 'INVALID_PAYLOAD', message: 'Notes required' };

  return { status: 500, code: 'INTERNAL_ERROR', message: 'Internal error' };
}

// ---------------------------------------------------------------
// Role-check
// ---------------------------------------------------------------
function pickAuthorizedRole(roles: string[]): string | null {
  for (const r of AUTHORIZED_ROLES) if (roles.includes(r)) return r;
  return null;
}

// ---------------------------------------------------------------
// Canonicalization + SHA-256 (Deno-native crypto.subtle)
// ---------------------------------------------------------------
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return '[' + value.map((v) => stableStringify(v)).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
      .join(',') +
    '}'
  );
}

interface SignaturePayload {
  agreement_id: string;
  version_id: string;
  source_id: string;
  sha256_hash: string;
  validator_user_id: string;
  validator_role: string;
  validation_scope: string[];
  checklist: Array<{ key: string; status: string; comment: string | null }>;
  unresolved_warnings: unknown[];
  resolved_warnings: unknown[];
  previous_validation_id: string | null;
  signed_at_iso: string;
  checklist_schema_version: 'v1';
}

function canonicalizePayload(p: SignaturePayload): string {
  const checklist = [...p.checklist]
    .map((c) => ({ key: c.key, status: c.status, comment: c.comment ?? null }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const scope = [...p.validation_scope].sort();
  return stableStringify({
    agreement_id: p.agreement_id,
    version_id: p.version_id,
    source_id: p.source_id,
    sha256_hash: p.sha256_hash,
    validator_user_id: p.validator_user_id,
    validator_role: p.validator_role,
    validation_scope: scope,
    checklist,
    unresolved_warnings: p.unresolved_warnings ?? [],
    resolved_warnings: p.resolved_warnings ?? [],
    previous_validation_id: p.previous_validation_id ?? null,
    signed_at_iso: p.signed_at_iso,
    checklist_schema_version: p.checklist_schema_version,
  });
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeSignatureHash(p: SignaturePayload): Promise<string> {
  const canonical = canonicalizePayload(p);
  return sha256Hex(new TextEncoder().encode(canonical));
}

// ---------------------------------------------------------------
// Allowed registry tables — used only via the typed methods below.
// (Static lint test verifies no occurrences of the operational
//  table or payroll modules in this file.)
// ---------------------------------------------------------------
const T_REGISTRY = 'erp_hr_collective_agreements_registry';
const T_VERSIONS = 'erp_hr_collective_agreements_registry_versions';
const T_SOURCES = 'erp_hr_collective_agreements_registry_sources';
const T_VALIDATIONS = 'erp_hr_collective_agreement_registry_validations';
const T_VALIDATION_ITEMS = 'erp_hr_collective_agreement_registry_validation_items';
const T_VALIDATION_SIGS = 'erp_hr_collective_agreement_registry_validation_signatures';

// ---------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------
function buildAdapter(userClient: any, adminClient: any) {
  return {
    async fetchAgreement(id: string) {
      const { data, error } = await userClient
        .from(T_REGISTRY)
        .select('id, internal_code')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('AGREEMENT_NOT_FOUND');
      return data ?? null;
    },
    async fetchVersion(id: string) {
      const { data } = await userClient
        .from(T_VERSIONS)
        .select('id, agreement_id, source_hash, is_current')
        .eq('id', id)
        .maybeSingle();
      return data ?? null;
    },
    async fetchSource(id: string) {
      const { data } = await userClient
        .from(T_SOURCES)
        .select('id, agreement_id, document_hash')
        .eq('id', id)
        .maybeSingle();
      return data ?? null;
    },
    async fetchCurrentValidation(agreementId: string, versionId: string) {
      const { data } = await userClient
        .from(T_VALIDATIONS)
        .select('*')
        .eq('agreement_id', agreementId)
        .eq('version_id', versionId)
        .eq('is_current', true)
        .maybeSingle();
      return data ?? null;
    },
    async fetchValidation(id: string) {
      const { data } = await userClient
        .from(T_VALIDATIONS)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return data ?? null;
    },
    async fetchValidationItems(validationId: string) {
      const { data } = await userClient
        .from(T_VALIDATION_ITEMS)
        .select('*')
        .eq('validation_id', validationId);
      return data ?? [];
    },
    async fetchUserRoles(userId: string): Promise<string[]> {
      const { data, error } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (error) return [];
      return (data ?? []).map((r: { role: string }) => r.role);
    },
    async insertValidation(args: Record<string, unknown>) {
      const { data, error } = await adminClient
        .from(T_VALIDATIONS)
        .insert(args)
        .select('id')
        .single();
      if (error) throw new Error('INTERNAL_ERROR');
      return { id: data.id as string };
    },
    async updateValidation(args: { id: string; patch: Record<string, unknown> }) {
      const { error } = await adminClient
        .from(T_VALIDATIONS)
        .update(args.patch)
        .eq('id', args.id);
      if (error) throw new Error('INTERNAL_ERROR');
    },
    async insertSignature(args: Record<string, unknown>) {
      const { data, error } = await adminClient
        .from(T_VALIDATION_SIGS)
        .insert(args)
        .select('id')
        .single();
      if (error) throw new Error('INTERNAL_ERROR');
      return { id: data.id as string };
    },
    async insertItems(args: { validation_id: string; items: Array<Record<string, unknown>> }) {
      const rows = args.items.map((it) => ({
        validation_id: args.validation_id,
        item_key: it.item_key,
        item_status: it.item_status ?? 'pending',
      }));
      const { error } = await adminClient.from(T_VALIDATION_ITEMS).insert(rows);
      if (error) throw new Error('INTERNAL_ERROR');
    },
    async upsertItem(args: Record<string, unknown>) {
      const { error } = await adminClient
        .from(T_VALIDATION_ITEMS)
        .upsert(args, { onConflict: 'validation_id,item_key' });
      if (error) throw new Error('INTERNAL_ERROR');
    },
    async supersedeValidation(id: string) {
      const { error } = await adminClient
        .from(T_VALIDATIONS)
        .update({ is_current: false, validation_status: 'superseded' })
        .eq('id', id);
      if (error) throw new Error('INTERNAL_ERROR');
    },
  };
}

type Adapter = ReturnType<typeof buildAdapter>;

// ---------------------------------------------------------------
// Service flows (mirror `collectiveAgreementValidationService.ts`).
// Inlined because edge functions cannot import from `src/`.
// ---------------------------------------------------------------
const CRITICAL_SEVERITIES = new Set(['critical', 'CRITICAL']);
function hasCriticalUnresolved(warnings: unknown): boolean {
  if (!Array.isArray(warnings)) return false;
  return warnings.some(
    (w) => w && CRITICAL_SEVERITIES.has(String((w as any).severity ?? '')),
  );
}

async function svcCreateDraft(
  input: {
    agreementId: string;
    versionId: string;
    sourceId: string;
    validatorUserId: string;
    validationScope: string[];
    triggeredByImportRunId?: string;
  },
  adapter: Adapter,
) {
  const [agreement, version, source, roles] = await Promise.all([
    adapter.fetchAgreement(input.agreementId),
    adapter.fetchVersion(input.versionId),
    adapter.fetchSource(input.sourceId),
    adapter.fetchUserRoles(input.validatorUserId),
  ]);
  if (!agreement) throw new Error('AGREEMENT_NOT_FOUND');
  if (!version) throw new Error('VERSION_NOT_FOUND');
  if (version.agreement_id !== agreement.id) throw new Error('VERSION_AGREEMENT_MISMATCH');
  if (!source) throw new Error('SOURCE_NOT_FOUND');
  if (source.agreement_id !== agreement.id) throw new Error('SOURCE_AGREEMENT_MISMATCH');

  const sha256 = version.source_hash;
  if (!sha256 || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('VERSION_SHA256_INVALID');

  const role = pickAuthorizedRole(roles);
  if (!role) throw new Error('ROLE_NOT_AUTHORIZED');

  const { id } = await adapter.insertValidation({
    agreement_id: agreement.id,
    version_id: version.id,
    source_id: source.id,
    sha256_hash: sha256,
    validator_user_id: input.validatorUserId,
    validator_role: role,
    validation_status: 'draft',
    validation_scope: input.validationScope,
    triggered_by_import_run_id: input.triggeredByImportRunId ?? null,
  });

  await adapter.insertItems({
    validation_id: id,
    items: VALIDATION_CHECKLIST_KEYS_V1.map((k) => ({
      item_key: k,
      item_status: 'pending',
    })),
  });

  return { id, sha256_hash: sha256, validator_role: role };
}

async function svcUpdateChecklistItem(
  input: {
    validationId: string;
    validatorUserId: string;
    itemKey: string;
    itemStatus: string;
    comment?: string;
    evidenceUrl?: string;
    evidenceExcerpt?: string;
  },
  adapter: Adapter,
) {
  const v = await adapter.fetchValidation(input.validationId);
  if (!v) throw new Error('VALIDATION_NOT_FOUND');
  if (v.validator_user_id !== input.validatorUserId) throw new Error('NOT_OWNER');
  if (v.validation_status !== 'draft' && v.validation_status !== 'pending_review')
    throw new Error('VALIDATION_NOT_EDITABLE');
  if (input.itemStatus === 'accepted_with_caveat') {
    if (!input.comment || input.comment.trim().length === 0)
      throw new Error('CAVEAT_REQUIRES_COMMENT');
  }
  await adapter.upsertItem({
    validation_id: input.validationId,
    item_key: input.itemKey,
    item_status: input.itemStatus,
    comment: input.comment ?? null,
    evidence_url: input.evidenceUrl ?? null,
    evidence_excerpt: input.evidenceExcerpt ?? null,
  });
  return { ok: true };
}

async function svcSubmitForReview(
  input: { validationId: string; validatorUserId: string },
  adapter: Adapter,
) {
  const v = await adapter.fetchValidation(input.validationId);
  if (!v) throw new Error('VALIDATION_NOT_FOUND');
  if (v.validator_user_id !== input.validatorUserId) throw new Error('NOT_OWNER');
  if (v.validation_status !== 'draft') throw new Error('VALIDATION_NOT_DRAFT');
  await adapter.updateValidation({
    id: v.id,
    patch: { validation_status: 'pending_review' },
  });
  return { ok: true };
}

async function svcApprove(
  input: { validationId: string; validatorUserId: string; notes?: string },
  adapter: Adapter,
) {
  const v = await adapter.fetchValidation(input.validationId);
  if (!v) throw new Error('VALIDATION_NOT_FOUND');
  if (v.validation_status !== 'draft' && v.validation_status !== 'pending_review')
    throw new Error('VALIDATION_NOT_APPROVABLE');

  const roles = await adapter.fetchUserRoles(input.validatorUserId);
  const signedRole = pickAuthorizedRole(roles);
  if (!signedRole) throw new Error('ROLE_NOT_AUTHORIZED');

  const [version, source, items] = await Promise.all([
    adapter.fetchVersion(v.version_id),
    adapter.fetchSource(v.source_id),
    adapter.fetchValidationItems(v.id),
  ]);
  if (!version) throw new Error('VERSION_NOT_FOUND');
  if (!source) throw new Error('SOURCE_NOT_FOUND');
  if (version.source_hash !== v.sha256_hash) throw new Error('SHA256_MISMATCH');

  if (hasCriticalUnresolved(v.unresolved_warnings))
    throw new Error('CRITICAL_UNRESOLVED_WARNINGS');

  const itemsByKey = new Map<string, any>(items.map((i: any) => [i.item_key, i]));
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
    )
      throw new Error(`CHECKLIST_ITEM_PENDING:${k}`);
    if (it.item_status === 'accepted_with_caveat') {
      if (!it.comment || String(it.comment).trim().length === 0)
        throw new Error(`CAVEAT_REQUIRES_COMMENT:${k}`);
    }
  }
  if (missing.length > 0) throw new Error(`CHECKLIST_INCOMPLETE:${missing.join(',')}`);

  const ack = itemsByKey.get('no_payroll_use_acknowledged');
  if (!ack || ack.item_status !== 'verified')
    throw new Error('NO_PAYROLL_USE_ACK_REQUIRED');

  if ((v.validation_scope ?? []).includes('salary_tables')) {
    for (const k of ['salary_base_reviewed', 'pluses_reviewed', 'categories_reviewed']) {
      const it = itemsByKey.get(k);
      if (!it || it.item_status === 'not_applicable')
        throw new Error(`SCOPE_SALARY_TABLES_REQUIRES:${k}`);
    }
  }

  const signedAt = new Date().toISOString();
  const checklistForPayload = VALIDATION_CHECKLIST_KEYS_V1.map((k) => {
    const it = itemsByKey.get(k)!;
    return { key: k, status: it.item_status, comment: it.comment ?? null };
  });

  const previousCurrent = await adapter.fetchCurrentValidation(v.agreement_id, v.version_id);
  const previousId =
    previousCurrent && previousCurrent.id !== v.id ? previousCurrent.id : null;

  const payload: SignaturePayload = {
    agreement_id: v.agreement_id,
    version_id: v.version_id,
    source_id: v.source_id,
    sha256_hash: v.sha256_hash,
    validator_user_id: input.validatorUserId,
    validator_role: signedRole,
    validation_scope: v.validation_scope ?? [],
    checklist: checklistForPayload,
    unresolved_warnings: v.unresolved_warnings ?? [],
    resolved_warnings: v.resolved_warnings ?? [],
    previous_validation_id: previousId,
    signed_at_iso: signedAt,
    checklist_schema_version: 'v1',
  };
  const signatureHash = await computeSignatureHash(payload);
  const canonical = canonicalizePayload(payload);

  await adapter.updateValidation({
    id: v.id,
    patch: {
      validation_status: 'approved_internal',
      signature_hash: signatureHash,
      validated_at: signedAt,
      is_current: true,
      previous_validation_id: previousId,
      notes: input.notes ?? v.notes ?? null,
    },
  });

  await adapter.insertSignature({
    validation_id: v.id,
    signed_at: signedAt,
    signed_by: input.validatorUserId,
    signed_by_role: signedRole,
    signature_hash: signatureHash,
    payload_canonical: JSON.parse(canonical),
    algorithm: 'sha256-canonical-v1',
    previous_signature_id: null,
  });

  if (previousId) await adapter.supersedeValidation(previousId);

  return {
    signature_hash: signatureHash,
    validated_at: signedAt,
    is_current: true,
    superseded_previous_id: previousId,
  };
}

async function svcReject(
  input: { validationId: string; validatorUserId: string; notes: string },
  adapter: Adapter,
) {
  const v = await adapter.fetchValidation(input.validationId);
  if (!v) throw new Error('VALIDATION_NOT_FOUND');
  if (v.validation_status !== 'draft' && v.validation_status !== 'pending_review')
    throw new Error('VALIDATION_NOT_REJECTABLE');

  const roles = await adapter.fetchUserRoles(input.validatorUserId);
  const signedRole = pickAuthorizedRole(roles);
  if (!signedRole) throw new Error('ROLE_NOT_AUTHORIZED');

  const items = await adapter.fetchValidationItems(v.id);
  const checklist = items.map((it: any) => ({
    key: it.item_key,
    status: it.item_status,
    comment: it.comment ?? null,
  }));

  const signedAt = new Date().toISOString();
  const payload: SignaturePayload = {
    agreement_id: v.agreement_id,
    version_id: v.version_id,
    source_id: v.source_id,
    sha256_hash: v.sha256_hash,
    validator_user_id: input.validatorUserId,
    validator_role: signedRole,
    validation_scope: v.validation_scope ?? [],
    checklist,
    unresolved_warnings: v.unresolved_warnings ?? [],
    resolved_warnings: v.resolved_warnings ?? [],
    previous_validation_id: null,
    signed_at_iso: signedAt,
    checklist_schema_version: 'v1',
  };
  const signatureHash = await computeSignatureHash(payload);
  const canonical = canonicalizePayload(payload);

  await adapter.updateValidation({
    id: v.id,
    patch: {
      validation_status: 'rejected',
      signature_hash: signatureHash,
      validated_at: signedAt,
      is_current: false,
      notes: input.notes,
    },
  });
  await adapter.insertSignature({
    validation_id: v.id,
    signed_at: signedAt,
    signed_by: input.validatorUserId,
    signed_by_role: signedRole,
    signature_hash: signatureHash,
    payload_canonical: JSON.parse(canonical),
    algorithm: 'sha256-canonical-v1',
    previous_signature_id: null,
  });
  return { signature_hash: signatureHash, validated_at: signedAt };
}

async function svcSupersede(
  input: { validationId: string; reason: string },
  adapter: Adapter,
) {
  const v = await adapter.fetchValidation(input.validationId);
  if (!v) throw new Error('VALIDATION_NOT_FOUND');
  await adapter.supersedeValidation(v.id);
  return { ok: true, reason: input.reason };
}

// ---------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')
    return errorResponse(405, 'INVALID_ACTION', 'Method not allowed');

  // 1) Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return errorResponse(401, 'UNAUTHORIZED', 'Missing or invalid Authorization');
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return errorResponse(401, 'UNAUTHORIZED', 'Missing token');

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY)
    return errorResponse(500, 'INTERNAL_ERROR', 'Server misconfigured');

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  let userId: string;
  try {
    const { data, error } = await userClient.auth.getClaims(token);
    if (error || !data?.claims?.sub)
      return errorResponse(401, 'UNAUTHORIZED', 'Invalid token');
    userId = data.claims.sub as string;
  } catch {
    return errorResponse(401, 'UNAUTHORIZED', 'Invalid token');
  }

  // 2) Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid JSON');
  }
  if (!body || typeof body !== 'object')
    return errorResponse(400, 'INVALID_PAYLOAD', 'Body must be an object');

  const action = (body as { action?: unknown }).action;
  if (
    typeof action !== 'string' ||
    !(KNOWN_ACTIONS as readonly string[]).includes(action)
  )
    return errorResponse(400, 'INVALID_ACTION', 'Unknown action');

  // 3) Anti-tampering: reject any forbidden master-registry / payroll keys
  for (const k of FORBIDDEN_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, k))
      return errorResponse(400, 'INVALID_PAYLOAD', 'Forbidden field present', action);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const adapter = buildAdapter(userClient, adminClient);

  // 4) Early role-check (all write actions require an authorized role)
  let roles: string[];
  try {
    roles = await adapter.fetchUserRoles(userId);
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
  if (!pickAuthorizedRole(roles))
    return errorResponse(403, 'ROLE_NOT_AUTHORIZED', 'Not authorized', action);

  // 5) Dispatch
  try {
    switch (action) {
      case 'create_draft': {
        const p = CreateDraftSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        const data = await svcCreateDraft(
          {
            agreementId: p.data.agreementId,
            versionId: p.data.versionId,
            sourceId: p.data.sourceId,
            validatorUserId: userId,
            validationScope: p.data.validationScope,
            triggeredByImportRunId: p.data.triggeredByImportRunId,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'update_checklist_item': {
        const p = UpdateChecklistItemSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        const data = await svcUpdateChecklistItem(
          {
            validationId: p.data.validationId,
            validatorUserId: userId,
            itemKey: p.data.itemKey,
            itemStatus: p.data.itemStatus,
            comment: p.data.comment,
            evidenceUrl: p.data.evidenceUrl,
            evidenceExcerpt: p.data.evidenceExcerpt,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'submit_for_review': {
        const p = SubmitForReviewSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        const data = await svcSubmitForReview(
          { validationId: p.data.validationId, validatorUserId: userId },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'approve': {
        const p = ApproveSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        const data = await svcApprove(
          {
            validationId: p.data.validationId,
            validatorUserId: userId,
            notes: p.data.notes,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'reject': {
        const p = RejectSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        const data = await svcReject(
          {
            validationId: p.data.validationId,
            validatorUserId: userId,
            notes: p.data.notes,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'supersede': {
        const p = SupersedeSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        const data = await svcSupersede(
          { validationId: p.data.validationId, reason: p.data.reason },
          adapter,
        );
        return successResponse(action, data);
      }
    }
  } catch (err) {
    const m = mapServiceError(err);
    return errorResponse(m.status, m.code, m.message, action);
  }

  return errorResponse(400, 'INVALID_ACTION', 'Unknown action', action);
});