/**
 * B13.5B — Edge function for the Agreement Impact Engine.
 *
 * Persistence-only wrapper around B13.5A's pure engine
 * (`src/engines/erp/hr/agreementImpactEngine.ts`). The engine logic is
 * mirrored INLINE here because Supabase edge functions cannot import
 * from `src/`. Any change to the engine contract MUST be mirrored here.
 *
 * HARD SAFETY:
 *  - Computes and persists informational previews ONLY. Never applies
 *    payroll changes, never creates mappings or runtime settings.
 *  - Never imports payroll/payslip engines, bridge, salary normalizer,
 *    agreement salary resolver or agreement safety gate.
 *  - Never references the operative legacy table
 *    `erp_hr_collective_agreements` (without `_registry`).
 *  - Never writes `ready_for_payroll`, `salary_tables_loaded=true`,
 *    `data_completeness='human_validated'`.
 *  - SERVICE_ROLE_KEY is read from `Deno.env.get` and never returned.
 *  - Errors are sanitized: no DB raw messages, no stack traces.
 *  - No `.delete(` anywhere. Append-only model.
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
  'legal_manager',
  'hr_manager',
  'payroll_supervisor',
] as const;

const KNOWN_ACTIONS = [
  'compute_scope',
  'compute_impact_preview',
  'list_scopes',
  'list_previews',
  'mark_preview_stale',
] as const;

const FORBIDDEN_PAYLOAD_KEYS = [
  'ready_for_payroll',
  'salary_tables_loaded',
  'data_completeness',
  'human_validated',
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
  'HR_REGISTRY_PILOT_MODE',
  'REGISTRY_PILOT_SCOPE_ALLOWLIST',
  'use_registry_for_payroll',
  'activation_run_id',
  'runtime_setting',
  'payroll',
  'payslip',
  'service_role',
  'apply_to_payroll',
  'human_approved_single',
  'human_approved_first',
  'human_approved_second',
  'approved_by',
  'approved_at',
  'cra_file',
  'siltra_file',
  'sepa_file',
  'accounting_entry',
] as const;

const DEFAULT_EMPLOYER_COST_MULTIPLIER = 1.32;
const DEFAULT_PAYMENT_COUNT = 12;

// ---------------------------------------------------------------
// Zod (strict)
// ---------------------------------------------------------------
const uuid = z.string().uuid();

const ImpactOptionsSchema = z
  .object({
    target_year: z.number().int().min(1900).max(3000),
    as_of_date: z.string().min(8).optional(),
    arrears_from: z.string().optional(),
    arrears_to: z.string().optional(),
    employer_cost_multiplier: z.number().positive().optional(),
    require_runtime_setting: z.boolean().optional(),
    include_inactive_employees: z.boolean().optional(),
    risk_thresholds: z
      .object({
        large_delta_monthly: z.number().nonnegative(),
        arrears_max_months: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
  })
  .strict();

const ComputeScopeSchema = z
  .object({
    action: z.literal('compute_scope'),
    agreement_id: uuid,
    version_id: uuid,
    company_id: uuid,
    options: ImpactOptionsSchema,
  })
  .strict();

const ComputeImpactPreviewSchema = z
  .object({
    action: z.literal('compute_impact_preview'),
    agreement_id: uuid,
    version_id: uuid,
    company_id: uuid,
    employee_id: uuid.optional(),
    contract_id: uuid.optional(),
    options: ImpactOptionsSchema,
  })
  .strict();

const ListScopesSchema = z
  .object({
    action: z.literal('list_scopes'),
    agreement_id: uuid.optional(),
    version_id: uuid.optional(),
    company_id: uuid.optional(),
    computed_after: z.string().optional(),
    risk: z.string().optional(),
  })
  .strict();

const ListPreviewsSchema = z
  .object({
    action: z.literal('list_previews'),
    agreement_id: uuid.optional(),
    version_id: uuid.optional(),
    company_id: uuid.optional(),
    employee_id: uuid.optional(),
    contract_id: uuid.optional(),
    affected: z.boolean().optional(),
    blocked: z.boolean().optional(),
    risk: z.string().optional(),
  })
  .strict();

const MarkStaleSchema = z
  .object({
    action: z.literal('mark_preview_stale'),
    preview_id: uuid,
    company_id: uuid,
    reason: z.string().min(5).max(2000),
  })
  .strict();

// ---------------------------------------------------------------
// Wire helpers
// ---------------------------------------------------------------
function successResponse(action: string, data: unknown): Response {
  return new Response(JSON.stringify({ success: true, action, data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
    case 'REGISTRY_NOT_READY':
      return errorResponse(400, 'REGISTRY_NOT_READY', 'Registry not ready', action);
    case 'REGISTRY_AGREEMENT_NOT_FOUND':
      return errorResponse(404, 'REGISTRY_AGREEMENT_NOT_FOUND', 'Registry agreement not found', action);
    case 'REGISTRY_VERSION_NOT_FOUND':
      return errorResponse(404, 'REGISTRY_VERSION_NOT_FOUND', 'Registry version not found', action);
    case 'VERSION_AGREEMENT_MISMATCH':
      return errorResponse(400, 'VERSION_AGREEMENT_MISMATCH', 'Version does not belong to agreement', action);
    case 'PREVIEW_NOT_FOUND':
      return errorResponse(404, 'PREVIEW_NOT_FOUND', 'Preview not found', action);
    case 'NOT_ELIGIBLE':
      return errorResponse(400, 'NOT_ELIGIBLE', 'Agreement not eligible for impact preview', action);
    default:
      return errorResponse(500, 'INTERNAL_ERROR', 'Internal error', action);
  }
}

class ImpactError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = 'ImpactError';
  }
}

// ===============================================================
// PURE ENGINE — mirror of B13.5A (kept in sync; see static tests)
// ===============================================================
function round2(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function monthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const months = to.getUTCMonth() - from.getUTCMonth();
  let total = years * 12 + months;
  if (to.getUTCDate() >= from.getUTCDate()) total += 1;
  return Math.max(0, total);
}

const PROTECTED_CONCEPT_LITERALS = [
  'transporte', 'nocturnidad', 'festivo', 'antigüedad', 'antiguedad',
  'dieta', 'kilomet', 'responsabilidad', 'convenio',
];

function detectProtectedConcepts(table: any): string[] {
  const haystack = `${table.concept_literal_from_agreement ?? ''} ${table.payslip_label ?? ''}`.toLowerCase();
  const found: string[] = [];
  for (const l of PROTECTED_CONCEPT_LITERALS) {
    if (haystack.includes(l)) found.push(l);
  }
  if (typeof table.plus_transport === 'number' && table.plus_transport > 0 && !found.includes('transporte')) {
    found.push('transporte');
  }
  if (typeof table.plus_antiguedad === 'number' && table.plus_antiguedad > 0 && !found.includes('antiguedad')) {
    found.push('antiguedad');
  }
  return found;
}

function matchSalaryTable(
  tables: any[],
  ctx: { professional_group?: string; level?: string; category?: string },
): { match?: any; ambiguous: boolean; fallbackUsed: boolean } {
  if (!ctx.professional_group) return { ambiguous: false, fallbackUsed: false };
  const norm = (v?: string) => (v ?? '').trim().toLowerCase();
  const pg = norm(ctx.professional_group);
  const lvl = norm(ctx.level);
  const cat = norm(ctx.category);

  const byAll = tables.filter(
    (t) => norm(t.professional_group) === pg && norm(t.level) === lvl && norm(t.category) === cat && lvl !== '' && cat !== '',
  );
  if (byAll.length === 1) return { match: byAll[0], ambiguous: false, fallbackUsed: false };
  if (byAll.length > 1) return { match: byAll[0], ambiguous: true, fallbackUsed: false };

  const byLvl = tables.filter(
    (t) => norm(t.professional_group) === pg && norm(t.level) === lvl && lvl !== '',
  );
  if (byLvl.length === 1) return { match: byLvl[0], ambiguous: false, fallbackUsed: true };
  if (byLvl.length > 1) return { match: byLvl[0], ambiguous: true, fallbackUsed: true };

  const byPg = tables.filter((t) => norm(t.professional_group) === pg);
  if (byPg.length === 1) return { match: byPg[0], ambiguous: false, fallbackUsed: true };
  if (byPg.length > 1) return { match: byPg[0], ambiguous: true, fallbackUsed: true };

  return { ambiguous: false, fallbackUsed: false };
}

/**
 * Eligibility gates (mirror of detectAgreementImpactRisks).
 */
function checkAgreementEligibility(input: {
  agreement: any;
  version: any;
  salaryTables: any[];
  runtimeSettings: any[];
  options: any;
}): { eligible: boolean; blockers: string[]; reason: string } {
  const blockers: string[] = [];
  const a = input.agreement;
  if (a.ready_for_payroll !== true) blockers.push('registry_not_ready_for_payroll');
  if (a.requires_human_review !== false) blockers.push('registry_requires_human_review');
  if (a.data_completeness !== 'human_validated') blockers.push('registry_not_human_validated');
  if (a.source_quality !== 'official') blockers.push('registry_source_not_official');
  if (a.salary_tables_loaded !== true) blockers.push('registry_salary_tables_not_loaded');
  if (input.version.agreement_id !== a.id) blockers.push('version_mismatch');

  const tables = input.salaryTables.filter(
    (t) => t.agreement_id === a.id && t.version_id === input.version.id && t.year === input.options.target_year,
  );
  if (tables.length === 0) blockers.push('no_salary_tables_for_target_year');

  if (input.options.require_runtime_setting !== false) {
    const anyCurrent = (input.runtimeSettings ?? []).some(
      (s: any) => s.is_current && s.use_registry_for_payroll,
    );
    if (!anyCurrent) blockers.push('no_current_runtime_setting');
  }

  return {
    eligible: blockers.length === 0,
    blockers,
    reason: blockers.length === 0 ? 'eligible' : blockers[0],
  };
}

function computePerEmployeePreview(
  employee: any,
  contract: any,
  matched: any | undefined,
  ambiguous: boolean,
  fallbackUsed: boolean,
  mapping: any | undefined,
  runtimeSetting: any | undefined,
  options: {
    target_year: number;
    arrears_from?: string;
    arrears_to?: string;
    arrears_max_months: number;
    employer_cost_multiplier?: number;
    large_delta_monthly_threshold: number;
    require_runtime_setting: boolean;
    paymentCount: number;
  },
): {
  affected: boolean;
  blocked: boolean;
  blockers: string[];
  warnings: string[];
  current_salary_monthly: number;
  current_salary_annual: number;
  target_salary_monthly: number;
  target_salary_annual: number;
  delta_monthly: number;
  delta_annual: number;
  arrears_estimate: number;
  employer_cost_delta: number;
  concepts_detected: string[];
  missing_concepts: string[];
  risk_flags: string[];
  source_trace: Record<string, unknown>;
} {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const risk_flags: string[] = [];

  if (employee.status !== 'active') {
    blockers.push('inactive_employee');
    risk_flags.push('inactive_employee');
  }
  if (!contract.is_active) {
    blockers.push('inactive_contract');
    risk_flags.push('inactive_contract');
  }
  if (!mapping) blockers.push('missing_mapping');
  else if (mapping.mapping_status !== 'approved_internal' || !mapping.is_current) {
    blockers.push('mapping_not_approved');
    risk_flags.push('mapping_not_approved');
  }
  if (options.require_runtime_setting && (!runtimeSetting || !runtimeSetting.is_current)) {
    blockers.push('missing_runtime_setting');
    risk_flags.push('missing_runtime_setting');
  }
  if (!matched) {
    blockers.push('missing_salary_table');
    risk_flags.push('missing_salary_table');
  }
  if (ambiguous) {
    warnings.push('ambiguous_salary_table_match');
    risk_flags.push('ambiguous_salary_table_match');
  }
  if (fallbackUsed) warnings.push('salary_table_match_fallback');

  const currentMonthly = Number(contract.base_salary_monthly ?? 0);
  const currentAnnual = Number(contract.base_salary_annual ?? currentMonthly * options.paymentCount);

  let targetMonthly = 0;
  let targetAnnual = 0;
  if (matched) {
    const baseMonthly = Number(matched.salary_base_monthly ?? 0);
    const baseAnnual = Number(matched.salary_base_annual ?? baseMonthly * options.paymentCount);
    targetMonthly = baseMonthly + Number(matched.plus_convenio_monthly ?? 0);
    targetAnnual = baseAnnual + Number(matched.plus_convenio_annual ?? 0);
    if (!matched.salary_base_monthly && matched.salary_base_annual) {
      targetMonthly = round2(targetAnnual / options.paymentCount);
    }
  }

  const delta_monthly = round2(targetMonthly - currentMonthly);
  const delta_annual = round2(targetAnnual - currentAnnual);

  if (matched) {
    if (delta_monthly > 0) risk_flags.push('salary_below_agreement');
    else if (delta_monthly < 0) {
      risk_flags.push('salary_above_agreement');
      risk_flags.push('negative_delta');
    }
    if (Math.abs(delta_monthly) >= options.large_delta_monthly_threshold) {
      risk_flags.push('large_delta');
    }
  }

  // Arrears
  let arrears = 0;
  if (options.arrears_from && options.arrears_to && delta_monthly > 0) {
    const m = monthsBetween(options.arrears_from, options.arrears_to);
    const cap = options.arrears_max_months;
    const months = cap && m > cap ? cap : m;
    if (cap && m > cap) {
      warnings.push('arrears_period_too_long');
      risk_flags.push('arrears_period_too_long');
    }
    arrears = round2(delta_monthly * months);
  }

  const multiplier =
    typeof options.employer_cost_multiplier === 'number' && options.employer_cost_multiplier > 0
      ? options.employer_cost_multiplier
      : DEFAULT_EMPLOYER_COST_MULTIPLIER;
  const employer_cost_delta = round2(Math.max(delta_annual, 0) * multiplier);

  const concepts_detected = matched ? detectProtectedConcepts(matched) : [];
  const missing_concepts: string[] = [];
  if (matched && !matched.concept_literal_from_agreement) {
    missing_concepts.push('concept_literal_from_agreement');
    risk_flags.push('missing_concept_literal');
  }
  if (matched && !matched.payslip_label) {
    missing_concepts.push('payslip_label');
    risk_flags.push('missing_payslip_label');
  }

  const blocked = blockers.length > 0;
  const affected = !blocked && (Math.abs(delta_monthly) > 0 || Math.abs(delta_annual) > 0);

  return {
    affected,
    blocked,
    blockers,
    warnings,
    current_salary_monthly: round2(currentMonthly),
    current_salary_annual: round2(currentAnnual),
    target_salary_monthly: round2(targetMonthly),
    target_salary_annual: round2(targetAnnual),
    delta_monthly,
    delta_annual,
    arrears_estimate: arrears,
    employer_cost_delta,
    concepts_detected,
    missing_concepts,
    risk_flags: Array.from(new Set(risk_flags)),
    source_trace: {
      matched_table_id: matched?.id ?? null,
      mapping_id: mapping?.id ?? null,
      runtime_setting_id: runtimeSetting?.id ?? null,
      target_year: options.target_year,
      employer_cost_multiplier: multiplier,
    },
  };
}

// ===============================================================
// Adapter
// ===============================================================
function buildAdapter(userClient: any, adminClient: any) {
  return {
    async fetchUserRoles(userId: string): Promise<string[]> {
      const { data, error } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (error) throw new Error('USER_ROLES_FETCH_ERROR');
      return (data ?? []).map((r: any) => r.role);
    },
    async hasCompanyAccess(companyId: string): Promise<boolean> {
      const { data, error } = await userClient.rpc('user_has_erp_company_access', {
        p_company_id: companyId,
      });
      if (error) return false;
      return data === true;
    },
    async getRegistryAgreement(id: string) {
      const { data, error } = await adminClient
        .from('erp_hr_collective_agreements_registry')
        .select(
          'id, ready_for_payroll, requires_human_review, data_completeness, source_quality, salary_tables_loaded, internal_code, official_name, cnae_codes, jurisdiction_code',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('REGISTRY_FETCH_ERROR');
      return data ?? null;
    },
    async getRegistryVersion(id: string) {
      const { data, error } = await adminClient
        .from('erp_hr_collective_agreements_registry_versions')
        .select('id, agreement_id, year, is_current')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('VERSION_FETCH_ERROR');
      return data ?? null;
    },
    async getSalaryTablesForVersion(agreementId: string, versionId: string, year: number) {
      const { data, error } = await adminClient
        .from('erp_hr_collective_agreements_registry_salary_tables')
        .select('*')
        .eq('agreement_id', agreementId)
        .eq('version_id', versionId)
        .eq('year', year);
      if (error) throw new Error('TABLES_FETCH_ERROR');
      return data ?? [];
    },
    async getMappingsForCompany(agreementId: string, versionId: string, companyId: string) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_mappings')
        .select('*')
        .eq('registry_agreement_id', agreementId)
        .eq('registry_version_id', versionId)
        .eq('company_id', companyId);
      if (error) throw new Error('MAPPINGS_FETCH_ERROR');
      return data ?? [];
    },
    async getRuntimeSettingsForCompany(companyId: string) {
      const { data, error } = await adminClient
        .from('erp_hr_company_agreement_registry_runtime_settings')
        .select('*')
        .eq('company_id', companyId);
      if (error) return [];
      return data ?? [];
    },
    async getEmployees(companyId: string, employeeId?: string) {
      let q = adminClient.from('erp_hr_employees').select('*').eq('company_id', companyId);
      if (employeeId) q = q.eq('id', employeeId);
      const { data, error } = await q.limit(2000);
      if (error) throw new Error('EMPLOYEES_FETCH_ERROR');
      return data ?? [];
    },
    async getContracts(companyId: string, employeeId?: string, contractId?: string) {
      let q = adminClient.from('erp_hr_contracts').select('*').eq('company_id', companyId);
      if (employeeId) q = q.eq('employee_id', employeeId);
      if (contractId) q = q.eq('id', contractId);
      const { data, error } = await q.limit(4000);
      if (error) throw new Error('CONTRACTS_FETCH_ERROR');
      return data ?? [];
    },
    async insertScope(row: Record<string, unknown>) {
      const { data, error } = await adminClient
        .from('erp_hr_collective_agreement_affected_scopes')
        .insert(row)
        .select('*')
        .single();
      if (error) throw new Error('SCOPE_INSERT_ERROR');
      return data;
    },
    async insertPreview(row: Record<string, unknown>) {
      const { data, error } = await adminClient
        .from('erp_hr_collective_agreement_impact_previews')
        .insert(row)
        .select('*')
        .single();
      if (error) throw new Error('PREVIEW_INSERT_ERROR');
      return data;
    },
    async listScopes(filters: {
      agreement_id?: string;
      version_id?: string;
      company_id?: string;
      computed_after?: string;
    }) {
      let q = adminClient
        .from('erp_hr_collective_agreement_affected_scopes')
        .select('*')
        .order('computed_at', { ascending: false })
        .limit(500);
      if (filters.agreement_id) q = q.eq('agreement_id', filters.agreement_id);
      if (filters.version_id) q = q.eq('version_id', filters.version_id);
      if (filters.company_id) q = q.eq('company_id', filters.company_id);
      if (filters.computed_after) q = q.gte('computed_at', filters.computed_after);
      const { data, error } = await q;
      if (error) throw new Error('SCOPE_LIST_ERROR');
      return data ?? [];
    },
    async listPreviews(filters: Record<string, unknown>) {
      let q = adminClient
        .from('erp_hr_collective_agreement_impact_previews')
        .select('*')
        .order('computed_at', { ascending: false })
        .limit(1000);
      for (const k of [
        'agreement_id', 'version_id', 'company_id', 'employee_id', 'contract_id',
      ]) {
        if (filters[k]) q = q.eq(k, filters[k] as string);
      }
      if (typeof filters.affected === 'boolean') q = q.eq('affected', filters.affected);
      if (typeof filters.blocked === 'boolean') q = q.eq('blocked', filters.blocked);
      const { data, error } = await q;
      if (error) throw new Error('PREVIEW_LIST_ERROR');
      return data ?? [];
    },
    async getPreviewById(id: string) {
      const { data, error } = await adminClient
        .from('erp_hr_collective_agreement_impact_previews')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error('PREVIEW_FETCH_ERROR');
      return data ?? null;
    },
    async appendStaleWarning(preview: any, reason: string) {
      const warnings = Array.isArray(preview.warnings_json) ? [...preview.warnings_json] : [];
      const flags = Array.isArray(preview.risk_flags) ? [...preview.risk_flags] : [];
      warnings.push({ code: 'stale_preview', reason, at: new Date().toISOString() });
      if (!flags.includes('stale_preview')) flags.push('stale_preview');
      const { data, error } = await adminClient
        .from('erp_hr_collective_agreement_impact_previews')
        .update({ warnings_json: warnings, risk_flags: flags })
        .eq('id', preview.id)
        .select('*')
        .single();
      if (error) throw new Error('PREVIEW_UPDATE_ERROR');
      return data;
    },
  };
}

type Adapter = ReturnType<typeof buildAdapter>;

// ===============================================================
// Helpers — mapping/runtime selection
// ===============================================================
function pickMappingFor(
  mappings: any[],
  employeeId: string,
  contractId: string,
  companyId: string,
) {
  const cur = mappings.filter((m) => m.is_current);
  return (
    cur.find((m) => m.contract_id === contractId && m.company_id === companyId) ??
    cur.find((m) => m.employee_id === employeeId && m.company_id === companyId) ??
    cur.find((m) => m.company_id === companyId && !m.employee_id && !m.contract_id)
  );
}

function pickRuntimeSettingFor(
  settings: any[],
  employeeId: string,
  contractId: string,
  mappingId: string | undefined,
  companyId: string,
) {
  const cur = settings.filter((s) => s.is_current && s.use_registry_for_payroll);
  return (
    cur.find((s) => s.contract_id === contractId) ??
    cur.find((s) => s.employee_id === employeeId) ??
    (mappingId ? cur.find((s) => s.mapping_id === mappingId && !s.contract_id && !s.employee_id) : undefined) ??
    cur.find((s) => s.company_id === companyId && !s.contract_id && !s.employee_id)
  );
}

// ===============================================================
// Service-level actions
// ===============================================================
async function svcComputeScope(
  input: {
    agreement_id: string;
    version_id: string;
    company_id: string;
    options: any;
    actor_user_id: string;
    employee_id?: string;
    contract_id?: string;
    asPreviewOnly?: boolean;
  },
  adapter: Adapter,
) {
  const agreement = await adapter.getRegistryAgreement(input.agreement_id);
  if (!agreement) throw new ImpactError('REGISTRY_AGREEMENT_NOT_FOUND');
  const version = await adapter.getRegistryVersion(input.version_id);
  if (!version) throw new ImpactError('REGISTRY_VERSION_NOT_FOUND');
  if (version.agreement_id !== input.agreement_id) {
    throw new ImpactError('VERSION_AGREEMENT_MISMATCH');
  }

  const opts = {
    target_year: input.options.target_year,
    as_of_date: input.options.as_of_date ?? new Date().toISOString().slice(0, 10),
    arrears_from: input.options.arrears_from,
    arrears_to: input.options.arrears_to,
    employer_cost_multiplier: input.options.employer_cost_multiplier,
    require_runtime_setting:
      input.options.require_runtime_setting === undefined ? true : input.options.require_runtime_setting,
    include_inactive_employees: input.options.include_inactive_employees ?? false,
    risk_thresholds: input.options.risk_thresholds ?? {
      large_delta_monthly: 100,
      arrears_max_months: 24,
    },
    paymentCount: DEFAULT_PAYMENT_COUNT,
    large_delta_monthly_threshold:
      input.options.risk_thresholds?.large_delta_monthly ?? 100,
    arrears_max_months: input.options.risk_thresholds?.arrears_max_months ?? 24,
  };

  const salaryTables = await adapter.getSalaryTablesForVersion(
    input.agreement_id,
    input.version_id,
    opts.target_year,
  );
  const runtimeSettings = await adapter.getRuntimeSettingsForCompany(input.company_id);

  const elig = checkAgreementEligibility({
    agreement,
    version,
    salaryTables,
    runtimeSettings,
    options: opts,
  });

  // Persist scope row regardless of eligibility — informational only.
  const blockersList = elig.blockers.map((b) => ({ code: b }));
  const scopeRow = await adapter.insertScope({
    agreement_id: input.agreement_id,
    version_id: input.version_id,
    company_id: input.company_id,
    employee_count_estimated: 0,
    cnae_match: false,
    territory_match: false,
    runtime_setting_required: opts.require_runtime_setting,
    computed_by: input.actor_user_id,
    summary_json: { eligible: elig.eligible, target_year: opts.target_year },
    risk_flags: [],
    blockers_json: blockersList,
    warnings_json: [],
  });

  if (!elig.eligible) {
    return { scope: scopeRow, previews: [], eligible: false, reason: elig.reason };
  }

  const employees = await adapter.getEmployees(input.company_id, input.employee_id);
  const contracts = await adapter.getContracts(
    input.company_id,
    input.employee_id,
    input.contract_id,
  );
  const mappings = await adapter.getMappingsForCompany(
    input.agreement_id,
    input.version_id,
    input.company_id,
  );

  const contractsByEmployee = new Map<string, any[]>();
  for (const c of contracts) {
    const arr = contractsByEmployee.get(c.employee_id) ?? [];
    arr.push(c);
    contractsByEmployee.set(c.employee_id, arr);
  }

  const persistedPreviews: any[] = [];
  for (const employee of employees) {
    const ec = contractsByEmployee.get(employee.id) ?? [];
    if (ec.length === 0) continue;
    for (const contract of ec) {
      const mapping = pickMappingFor(mappings, employee.id, contract.id, input.company_id);
      const runtimeSetting = pickRuntimeSettingFor(
        runtimeSettings,
        employee.id,
        contract.id,
        mapping?.id,
        input.company_id,
      );
      const ctx = {
        professional_group: employee.professional_group ?? contract.current_professional_group,
        level: employee.level ?? contract.current_level,
        category: employee.category ?? contract.current_category,
      };
      const m = matchSalaryTable(salaryTables, ctx);
      const preview = computePerEmployeePreview(
        employee,
        contract,
        m.match,
        m.ambiguous,
        m.fallbackUsed,
        mapping,
        runtimeSetting,
        opts as any,
      );

      const row = await adapter.insertPreview({
        affected_scope_id: scopeRow.id,
        agreement_id: input.agreement_id,
        version_id: input.version_id,
        company_id: input.company_id,
        employee_id: employee.id,
        contract_id: contract.id,
        mapping_id: mapping?.id ?? null,
        runtime_setting_id: runtimeSetting?.id ?? null,
        matched_salary_table_id: m.match?.id ?? null,
        affected: preview.affected,
        blocked: preview.blocked,
        current_salary_monthly: preview.current_salary_monthly,
        current_salary_annual: preview.current_salary_annual,
        target_salary_monthly: preview.target_salary_monthly,
        target_salary_annual: preview.target_salary_annual,
        delta_monthly: preview.delta_monthly,
        delta_annual: preview.delta_annual,
        arrears_estimate: preview.arrears_estimate,
        employer_cost_delta: preview.employer_cost_delta,
        concepts_detected: preview.concepts_detected,
        missing_concepts: preview.missing_concepts,
        risk_flags: preview.risk_flags,
        blockers_json: preview.blockers.map((b) => ({ code: b })),
        warnings_json: preview.warnings.map((w) => ({ code: w })),
        source_trace: preview.source_trace,
        requires_human_review: true,
        computed_by: input.actor_user_id,
      });
      persistedPreviews.push(row);
    }
  }

  return {
    scope: scopeRow,
    previews: persistedPreviews,
    eligible: true,
    reason: 'eligible',
    summary: {
      employees_scanned: persistedPreviews.length,
      employees_affected: persistedPreviews.filter((p) => p.affected).length,
      employees_blocked: persistedPreviews.filter((p) => p.blocked).length,
    },
  };
}

async function svcMarkStale(
  input: { preview_id: string; reason: string },
  adapter: Adapter,
) {
  const p = await adapter.getPreviewById(input.preview_id);
  if (!p) throw new ImpactError('PREVIEW_NOT_FOUND');
  return adapter.appendStaleWarning(p, input.reason);
}

// ===============================================================
// HTTP handler
// ===============================================================
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
  if (typeof action !== 'string' || !(KNOWN_ACTIONS as readonly string[]).includes(action))
    return errorResponse(400, 'INVALID_ACTION', 'Unknown action');

  // 3) Anti-tampering: forbidden keys at any depth (shallow check on top-level keys)
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
      case 'compute_scope': {
        const p = ComputeScopeSchema.safeParse(body);
        if (!p.success) return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.company_id)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcComputeScope(
          {
            agreement_id: p.data.agreement_id,
            version_id: p.data.version_id,
            company_id: p.data.company_id,
            options: p.data.options,
            actor_user_id: userId,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'compute_impact_preview': {
        const p = ComputeImpactPreviewSchema.safeParse(body);
        if (!p.success) return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.company_id)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcComputeScope(
          {
            agreement_id: p.data.agreement_id,
            version_id: p.data.version_id,
            company_id: p.data.company_id,
            options: p.data.options,
            actor_user_id: userId,
            employee_id: p.data.employee_id,
            contract_id: p.data.contract_id,
          },
          adapter,
        );
        return successResponse(action, data);
      }
      case 'list_scopes': {
        const p = ListScopesSchema.safeParse(body);
        if (!p.success) return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (p.data.company_id && !(await adapter.hasCompanyAccess(p.data.company_id)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await adapter.listScopes(p.data);
        return successResponse(action, data);
      }
      case 'list_previews': {
        const p = ListPreviewsSchema.safeParse(body);
        if (!p.success) return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (p.data.company_id && !(await adapter.hasCompanyAccess(p.data.company_id)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await adapter.listPreviews(p.data as any);
        return successResponse(action, data);
      }
      case 'mark_preview_stale': {
        const p = MarkStaleSchema.safeParse(body);
        if (!p.success) return errorResponse(400, 'INVALID_PAYLOAD', 'Invalid payload', action);
        if (!(await adapter.hasCompanyAccess(p.data.company_id)))
          return errorResponse(403, 'NO_COMPANY_ACCESS', 'No company access', action);
        const data = await svcMarkStale(
          { preview_id: p.data.preview_id, reason: p.data.reason },
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