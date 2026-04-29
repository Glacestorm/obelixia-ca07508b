/**
 * B10C.2B.2B — Edge function for managing company/contract/employee →
 * collective agreement Registry mappings.
 *
 * Wraps the pure service B10C.2B.2A
 * (`src/engines/erp/hr/collectiveAgreementMappingService.ts`). The
 * service algorithms are mirrored INLINE here because Supabase edge
 * functions cannot import from `src/`. Any change to the service
 * contract MUST be mirrored in this file (see static tests).
 *
 * HARD SAFETY:
 *  - Does NOT touch payroll runtime: no payroll/payslip engine, no
 *    bridge, no salary resolver, no salary normalizer, no shadow flag.
 *  - Does NOT activate `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
 *  - Does NOT consume mapping from payroll. Approving an internal
 *    mapping NEVER activates it for nomina; that is reserved for B10D.
 *  - Does NOT reference operational table `erp_hr_collective_agreements`
 *    (without `_registry`).
 *  - SERVICE_ROLE_KEY is read from `Deno.env.get` only and is never
 *    returned to the client.
 *  - Errors are sanitized: no DB raw messages, no stack traces.
 *  - No `.delete(` anywhere. Append-only model. Supersession is a
 *    state transition, not a deletion.
 *  - No write of `ready_for_payroll`.
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
// Constants
// ---------------------------------------------------------------
const AUTHORIZED_ROLES = [
  'superadmin',
  'admin',
  'hr_manager',
  'legal_manager',
  'payroll_supervisor',
] as const;

const MAPPING_SOURCE_TYPES = [
  'manual_selection',
  'cnae_suggestion',
  'legacy_operational_match',
  'imported_mapping',
] as const;

const MAPPING_STATUSES = [
  'draft',
  'pending_review',
  'approved_internal',
  'rejected',
  'superseded',
] as const;

const KNOWN_ACTIONS = [
  'create_draft',
  'submit_for_review',
  'approve',
  'reject',
  'supersede',
  'list',
] as const;

// Anti-tampering: client must NEVER send these. They are server-decided
// or strictly off-limits for this edge.
const FORBIDDEN_PAYLOAD_KEYS = [
  'approved_by',
  'approved_at',
  'is_current',
  'ready_for_payroll',
  'requires_human_review',
  'data_completeness',
  'salary_tables_loaded',
  'source_quality',
  'validation_status',
  'signature_hash',
  'validated_at',
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
  'persisted_priority_apply',
  'C3B3C2',
] as const;

// ---------------------------------------------------------------
// Zod schemas (.strict — no extra keys allowed)
// ---------------------------------------------------------------
const uuid = z.string().uuid();

const CreateDraftSchema = z
  .object({
    action: z.literal('create_draft'),
    companyId: uuid,
    employeeId: uuid.nullish(),
    contractId: uuid.nullish(),
    registryAgreementId: uuid,
    registryVersionId: uuid,
    sourceType: z.enum(MAPPING_SOURCE_TYPES),
    confidenceScore: z.number().min(0).max(100).nullish(),
    rationaleJson: z.record(z.unknown()).optional(),
    evidenceUrls: z.array(z.string().url()).optional(),
    humanConfirmed: z.boolean().optional(),
  })
  .strict();

const SubmitSchema = z
  .object({
    action: z.literal('submit_for_review'),
    mappingId: uuid,
    companyId: uuid,
  })
  .strict();

const ApproveSchema = z
  .object({
    action: z.literal('approve'),
    mappingId: uuid,
    companyId: uuid,
    humanConfirmed: z.boolean().optional(),
  })
  .strict();

const RejectSchema = z
  .object({
    action: z.literal('reject'),
    mappingId: uuid,
    companyId: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

const SupersedeSchema = z
  .object({
    action: z.literal('supersede'),
    mappingId: uuid,
    companyId: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

const ListSchema = z
  .object({
    action: z.literal('list'),
    companyId: uuid,
    employeeId: uuid.nullish(),
    contractId: uuid.nullish(),
    mappingStatus: z.enum(MAPPING_STATUSES).optional(),
  })
  .strict();

// ---------------------------------------------------------------
// Wire helpers
// ---------------------------------------------------------------
function successResponse(action: string, data: unknown): Response {
  return new Response(
    JSON.stringify({ success: true, action, data }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  action?: string,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      action: action ?? null,
      error: { code, message },
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

function pickAuthorizedRole(roles: string[]): string | null {
  for (const r of roles) {
    if ((AUTHORIZED_ROLES as readonly string[]).includes(r)) return r;
  }
  return null;
}

/**
 * mapError — translate service error codes to wire responses.
 * Never returns raw error.message or stack traces.
 */
function mapError(err: unknown, action?: string): Response {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  switch (code) {
    case 'UNAUTHORIZED_ROLE':
      return errorResponse(403, 'UNAUTHORIZED_ROLE', 'Not authorized', action);
    case 'NO_COMPANY_ACCESS':
      return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
    case 'INVALID_TRANSITION':
      return errorResponse(400, 'INVALID_TRANSITION', 'Invalid transition', action);
    case 'REGISTRY_NOT_READY':
      return errorResponse(400, 'REGISTRY_NOT_READY', 'Registry not ready', action);
    case 'VERSION_NOT_CURRENT':
      return errorResponse(400, 'VERSION_NOT_CURRENT', 'Version not current', action);
    case 'IMMUTABLE_FIELD':
      return errorResponse(400, 'IMMUTABLE_FIELD', 'Field is immutable', action);
    case 'REASON_REQUIRED':
      return errorResponse(400, 'REASON_REQUIRED', 'Reason required', action);
    case 'MAPPING_NOT_FOUND':
      return errorResponse(404, 'MAPPING_NOT_FOUND', 'Mapping not found', action);
    case 'CNAE_AUTO_APPROVAL_FORBIDDEN':
      return errorResponse(
        400,
        'CNAE_AUTO_APPROVAL_FORBIDDEN',
        'Human confirmation required for cnae_suggestion',
        action,
      );
    case 'REGISTRY_AGREEMENT_NOT_FOUND':
      return errorResponse(
        404,
        'REGISTRY_AGREEMENT_NOT_FOUND',
        'Registry agreement not found',
        action,
      );
    case 'REGISTRY_VERSION_NOT_FOUND':
      return errorResponse(
        404,
        'REGISTRY_VERSION_NOT_FOUND',
        'Registry version not found',
        action,
      );
    case 'VERSION_AGREEMENT_MISMATCH':
      return errorResponse(
        400,
        'VERSION_AGREEMENT_MISMATCH',
        'Version does not belong to agreement',
        action,
      );
    default:
      return errorResponse(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
}

class MappingServiceError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = 'MappingServiceError';
  }
}

// ---------------------------------------------------------------
// Adapter — implements the same shape as
// CollectiveAgreementMappingAdapter (B10C.2B.2A) using Supabase clients.
// Uses adminClient for writes only AFTER role + company access gates
// have passed in the HTTP handler.
// ---------------------------------------------------------------
function buildAdapter(userClient: any, adminClient: any) {
  return {
    async fetchUserRoles(userId: string): Promise<string[]> {
      const { data, error } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (error) throw new Error('USER_ROLES_FETCH_ERROR');
      return (data ?? []).map((r: { role: string }) => r.role);
    },
    async hasCompanyAccess(companyId: string): Promise<boolean> {
      const { data, error } = await userClient.rpc(
        'user_has_erp_company_access',
        { p_company_id: companyId },
      );
      if (error) return false;
      return data === true;
    },
    async getMappingById(id: string) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_mappings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('MAPPING_FETCH_ERROR');
      return data ?? null;
    },
    async getRegistryAgreement(id: string) {
      const { data, error } = await adminClient
        .from('erp_hr_collective_agreements_registry')
        .select(
          'id, ready_for_payroll, requires_human_review, data_completeness, source_quality',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('REGISTRY_FETCH_ERROR');
      return data ?? null;
    },
    async getRegistryVersion(id: string) {
      const { data, error } = await adminClient
        .from('erp_hr_collective_agreements_registry_versions')
        .select('id, agreement_id, is_current')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('VERSION_FETCH_ERROR');
      return data ?? null;
    },
    async insertMapping(row: Record<string, unknown>) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_mappings')
        .insert(row)
        .select('*')
        .single();
      if (error) throw new Error('MAPPING_INSERT_ERROR');
      return data;
    },
    async updateMappingStatus(
      id: string,
      patch: Record<string, unknown>,
    ) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_mappings')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error('MAPPING_UPDATE_ERROR');
      return data;
    },
    async listMappingsForScope(query: {
      company_id: string;
      employee_id?: string | null;
      contract_id?: string | null;
      mapping_status?: string;
    }) {
      let q = adminClient
        .from('erp_hr_company_agreement_registry_mappings')
        .select('*')
        .eq('company_id', query.company_id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (query.employee_id) q = q.eq('employee_id', query.employee_id);
      if (query.contract_id) q = q.eq('contract_id', query.contract_id);
      if (query.mapping_status) q = q.eq('mapping_status', query.mapping_status);
      const { data, error } = await q;
      if (error) throw new Error('MAPPING_LIST_ERROR');
      return data ?? [];
    },
  };
}

type Adapter = ReturnType<typeof buildAdapter>;

// ---------------------------------------------------------------
// Service logic (mirror of B10C.2B.2A — keep in sync)
// ---------------------------------------------------------------
async function svcCreateDraft(
  input: {
    company_id: string;
    employee_id?: string | null;
    contract_id?: string | null;
    registry_agreement_id: string;
    registry_version_id: string;
    source_type: string;
    confidence_score?: number | null;
    rationale_json?: Record<string, unknown>;
    evidence_urls?: string[];
    actor_user_id: string;
  },
  adapter: Adapter,
) {
  const agreement = await adapter.getRegistryAgreement(
    input.registry_agreement_id,
  );
  if (!agreement) throw new MappingServiceError('REGISTRY_AGREEMENT_NOT_FOUND');

  const version = await adapter.getRegistryVersion(input.registry_version_id);
  if (!version) throw new MappingServiceError('REGISTRY_VERSION_NOT_FOUND');
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
    created_by: input.actor_user_id,
    approved_by: null,
    approved_at: null,
  });
}

async function svcSubmit(mappingId: string, adapter: Adapter) {
  const m = await adapter.getMappingById(mappingId);
  if (!m) throw new MappingServiceError('MAPPING_NOT_FOUND');
  if (m.mapping_status !== 'draft') {
    throw new MappingServiceError('INVALID_TRANSITION');
  }
  return adapter.updateMappingStatus(m.id, { mapping_status: 'pending_review' });
}

async function svcApprove(
  input: { mapping_id: string; humanConfirmed?: boolean; actor_user_id: string },
  adapter: Adapter,
) {
  const m = await adapter.getMappingById(input.mapping_id);
  if (!m) throw new MappingServiceError('MAPPING_NOT_FOUND');
  if (m.mapping_status !== 'pending_review') {
    throw new MappingServiceError('INVALID_TRANSITION');
  }
  const agreement = await adapter.getRegistryAgreement(m.registry_agreement_id);
  if (!agreement) {
    throw new MappingServiceError('REGISTRY_AGREEMENT_NOT_FOUND');
  }
  const isReady =
    agreement.ready_for_payroll === true &&
    agreement.requires_human_review === false &&
    agreement.data_completeness === 'human_validated' &&
    agreement.source_quality === 'official';
  if (!isReady) throw new MappingServiceError('REGISTRY_NOT_READY');

  const version = await adapter.getRegistryVersion(m.registry_version_id);
  if (!version) throw new MappingServiceError('REGISTRY_VERSION_NOT_FOUND');
  if (version.agreement_id !== m.registry_agreement_id) {
    throw new MappingServiceError('VERSION_AGREEMENT_MISMATCH');
  }
  if (!version.is_current) {
    throw new MappingServiceError('VERSION_NOT_CURRENT');
  }
  if (m.source_type === 'cnae_suggestion' && input.humanConfirmed !== true) {
    throw new MappingServiceError('CNAE_AUTO_APPROVAL_FORBIDDEN');
  }
  return adapter.updateMappingStatus(m.id, {
    mapping_status: 'approved_internal',
    approved_by: input.actor_user_id,
    approved_at: new Date().toISOString(),
    is_current: true,
  });
}

async function svcReject(
  input: { mapping_id: string; reason: string; actor_user_id: string },
  adapter: Adapter,
) {
  const m = await adapter.getMappingById(input.mapping_id);
  if (!m) throw new MappingServiceError('MAPPING_NOT_FOUND');
  if (m.mapping_status !== 'draft' && m.mapping_status !== 'pending_review') {
    throw new MappingServiceError('INVALID_TRANSITION');
  }
  const previous = (m.rationale_json ?? {}) as Record<string, unknown>;
  return adapter.updateMappingStatus(m.id, {
    mapping_status: 'rejected',
    rationale_json: {
      ...previous,
      rejection: {
        reason: input.reason,
        by: input.actor_user_id,
        at: new Date().toISOString(),
      },
    },
  });
}

async function svcSupersede(
  input: { mapping_id: string; reason: string; actor_user_id: string },
  adapter: Adapter,
) {
  const m = await adapter.getMappingById(input.mapping_id);
  if (!m) throw new MappingServiceError('MAPPING_NOT_FOUND');
  const previous = (m.rationale_json ?? {}) as Record<string, unknown>;
  return adapter.updateMappingStatus(m.id, {
    mapping_status: 'superseded',
    is_current: false,
    rationale_json: {
      ...previous,
      supersession: {
        reason: input.reason,
        by: input.actor_user_id,
        at: new Date().toISOString(),
      },
    },
  });
}

async function svcList(
  input: {
    company_id: string;
    employee_id?: string | null;
    contract_id?: string | null;
    mapping_status?: string;
  },
  adapter: Adapter,
) {
  return adapter.listMappingsForScope({
    company_id: input.company_id,
    employee_id: input.employee_id ?? null,
    contract_id: input.contract_id ?? null,
    mapping_status: input.mapping_status,
  });
}

// ---------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });
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

  // 3) Anti-tampering: reject any forbidden keys
  for (const k of FORBIDDEN_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, k))
      return errorResponse(400, 'INVALID_PAYLOAD', 'Forbidden field present', action);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const adapter = buildAdapter(userClient, adminClient);

  // 4) Role gate
  let roles: string[];
  try {
    roles = await adapter.fetchUserRoles(userId);
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
  if (!pickAuthorizedRole(roles))
    return errorResponse(403, 'UNAUTHORIZED_ROLE', 'Not authorized', action);

  // 5) Dispatch
  try {
    switch (action) {
      case 'create_draft': {
        const p = CreateDraftSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcCreateDraft(
          {
            company_id: p.data.companyId,
            employee_id: p.data.employeeId ?? null,
            contract_id: p.data.contractId ?? null,
            registry_agreement_id: p.data.registryAgreementId,
            registry_version_id: p.data.registryVersionId,
            source_type: p.data.sourceType,
            confidence_score: p.data.confidenceScore ?? null,
            rationale_json: p.data.rationaleJson,
            evidence_urls: p.data.evidenceUrls,
            actor_user_id: userId,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'submit_for_review': {
        const p = SubmitSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcSubmit(p.data.mappingId, adapter);
        return successResponse(action, data);
      }
      case 'approve': {
        const p = ApproveSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcApprove(
          {
            mapping_id: p.data.mappingId,
            humanConfirmed: p.data.humanConfirmed,
            actor_user_id: userId,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'reject': {
        const p = RejectSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcReject(
          {
            mapping_id: p.data.mappingId,
            reason: p.data.reason,
            actor_user_id: userId,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'supersede': {
        const p = SupersedeSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcSupersede(
          {
            mapping_id: p.data.mappingId,
            reason: p.data.reason,
            actor_user_id: userId,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'list': {
        const p = ListSchema.safeParse(body);
        if (!p.success)
          return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.companyId)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcList(
          {
            company_id: p.data.companyId,
            employee_id: p.data.employeeId ?? null,
            contract_id: p.data.contractId ?? null,
            mapping_status: p.data.mappingStatus,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      default:
        return errorResponse(400, 'INVALID_ACTION', 'Unknown action', action);
    }
  } catch (err) {
    return mapError(err, action);
  }
});
