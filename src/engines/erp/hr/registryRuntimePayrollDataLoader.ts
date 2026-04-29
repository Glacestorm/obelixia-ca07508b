/**
 * B10E.3 — Registry Runtime Payroll Data Loader (READ-ONLY).
 *
 * Single B10E layer authorized to read DB. Loads the snapshot needed by
 * B10E.4 to attempt registry-based payroll resolution, using the user's
 * RLS-bound Supabase client supplied by the caller.
 *
 * HARD SAFETY (B10E.3):
 *  - Only SELECT operations; no insert/update/upsert/delete/rpc.
 *  - No service_role, no SUPABASE_SERVICE_ROLE_KEY, no admin client.
 *  - No edge function invocation, no functions.invoke.
 *  - No imports from useESPayrollBridge, registryShadowFlag,
 *    agreementSalaryResolver, salaryNormalizer, payrollEngine,
 *    payslipEngine, agreementSafetyGate.
 *  - Does NOT touch the operative table erp_hr_collective_agreements
 *    (only the *_registry suffixed tables).
 *  - Never throws on query errors; always returns a structured result.
 */

// ===================== Types =====================

export interface RegistryRuntimePayrollSnapshotInput {
  companyId: string;
  employeeId?: string | null;
  contractId?: string | null;
  year: number;
  // Minimal supabase-like client supporting select-only chains. Provided
  // by the caller and bound to the user's JWT (RLS enforced).
  supabaseClient: any;
}

export interface RegistryRuntimePayrollSnapshot {
  runtimeSettings: any[];
  mappings: any[];
  agreements: any[];
  versions: any[];
  sources: any[];
  salaryTables: any[];
  rules: any[];
}

export type RegistryRuntimePayrollSnapshotError =
  | 'load_failed'
  | 'invalid_input'
  | 'runtime_settings_query_failed'
  | 'mapping_query_failed'
  | 'registry_agreement_query_failed'
  | 'registry_version_query_failed'
  | 'registry_source_query_failed'
  | 'salary_tables_query_failed'
  | 'rules_query_failed';

export type RegistryRuntimePayrollSnapshotResult =
  | { ok: true; snapshot: RegistryRuntimePayrollSnapshot; warnings: string[] }
  | {
      ok: false;
      error: RegistryRuntimePayrollSnapshotError;
      reason: string;
      warnings: string[];
    };

// ===================== Helpers =====================

const MAX_REASON_LEN = 300;

export function sanitizeError(err: unknown): string {
  let msg = '';
  if (err && typeof err === 'object') {
    const anyErr = err as { message?: unknown; code?: unknown };
    if (typeof anyErr.message === 'string') msg = anyErr.message;
    else if (typeof anyErr.code === 'string') msg = anyErr.code;
    else msg = 'query_error';
  } else if (typeof err === 'string') {
    msg = err;
  } else {
    msg = 'query_error';
  }
  msg = msg.replace(/\s+/g, ' ').trim();
  if (msg.length > MAX_REASON_LEN) msg = msg.slice(0, MAX_REASON_LEN);
  return msg;
}

function uniq(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (typeof v === 'string' && v.length > 0) set.add(v);
  }
  return [...set];
}

function emptySnapshot(): RegistryRuntimePayrollSnapshot {
  return {
    runtimeSettings: [],
    mappings: [],
    agreements: [],
    versions: [],
    sources: [],
    salaryTables: [],
    rules: [],
  };
}

// ===================== Public API =====================

export async function fetchRegistryRuntimePayrollSnapshot(
  input: RegistryRuntimePayrollSnapshotInput,
): Promise<RegistryRuntimePayrollSnapshotResult> {
  const warnings: string[] = [];

  if (!input || typeof input.companyId !== 'string' || input.companyId.length === 0) {
    return { ok: false, error: 'invalid_input', reason: 'missing_company_id', warnings };
  }
  if (typeof input.year !== 'number' || !Number.isFinite(input.year)) {
    return { ok: false, error: 'invalid_input', reason: 'invalid_year', warnings };
  }
  if (!input.supabaseClient || typeof input.supabaseClient.from !== 'function') {
    return { ok: false, error: 'invalid_input', reason: 'missing_supabase_client', warnings };
  }

  const sb = input.supabaseClient;

  // 1) runtime settings
  let runtimeSettings: any[] = [];
  try {
    const res = await sb
      .from('erp_hr_company_agreement_registry_runtime_settings')
      .select('*')
      .eq('company_id', input.companyId)
      .eq('is_current', true)
      .eq('use_registry_for_payroll', true);
    if (res?.error) {
      return {
        ok: false,
        error: 'runtime_settings_query_failed',
        reason: sanitizeError(res.error),
        warnings,
      };
    }
    runtimeSettings = Array.isArray(res?.data) ? res.data : [];
  } catch (e) {
    return {
      ok: false,
      error: 'runtime_settings_query_failed',
      reason: sanitizeError(e),
      warnings,
    };
  }

  if (runtimeSettings.length === 0) {
    warnings.push('no_runtime_settings');
    return { ok: true, snapshot: emptySnapshot(), warnings };
  }

  // 2) mappings
  const mappingIds = uniq(runtimeSettings.map((s) => s?.mapping_id));
  let mappings: any[] = [];
  if (mappingIds.length > 0) {
    try {
      const res = await sb
        .from('erp_hr_company_agreement_registry_mappings')
        .select('*')
        .in('id', mappingIds);
      if (res?.error) {
        return {
          ok: false,
          error: 'mapping_query_failed',
          reason: sanitizeError(res.error),
          warnings,
        };
      }
      mappings = Array.isArray(res?.data) ? res.data : [];
    } catch (e) {
      return { ok: false, error: 'mapping_query_failed', reason: sanitizeError(e), warnings };
    }
  }

  for (const s of runtimeSettings) {
    if (s?.mapping_id && !mappings.some((m) => m?.id === s.mapping_id)) {
      warnings.push('missing_mapping_for_setting');
      break;
    }
  }

  // 3) agreements
  const agreementIds = uniq(mappings.map((m) => m?.registry_agreement_id));
  let agreements: any[] = [];
  if (agreementIds.length > 0) {
    try {
      const res = await sb
        .from('erp_hr_collective_agreements_registry')
        .select('*')
        .in('id', agreementIds);
      if (res?.error) {
        return {
          ok: false,
          error: 'registry_agreement_query_failed',
          reason: sanitizeError(res.error),
          warnings,
        };
      }
      agreements = Array.isArray(res?.data) ? res.data : [];
    } catch (e) {
      return {
        ok: false,
        error: 'registry_agreement_query_failed',
        reason: sanitizeError(e),
        warnings,
      };
    }
  }

  for (const m of mappings) {
    if (m?.registry_agreement_id && !agreements.some((a) => a?.id === m.registry_agreement_id)) {
      warnings.push('missing_registry_agreement');
      break;
    }
  }

  // 4) versions
  const versionIds = uniq(mappings.map((m) => m?.registry_version_id));
  let versions: any[] = [];
  if (versionIds.length > 0) {
    try {
      const res = await sb
        .from('erp_hr_collective_agreements_registry_versions')
        .select('*')
        .in('id', versionIds);
      if (res?.error) {
        return {
          ok: false,
          error: 'registry_version_query_failed',
          reason: sanitizeError(res.error),
          warnings,
        };
      }
      versions = Array.isArray(res?.data) ? res.data : [];
    } catch (e) {
      return {
        ok: false,
        error: 'registry_version_query_failed',
        reason: sanitizeError(e),
        warnings,
      };
    }
  }

  for (const m of mappings) {
    if (m?.registry_version_id && !versions.some((v) => v?.id === m.registry_version_id)) {
      warnings.push('missing_registry_version');
      break;
    }
  }

  // 5) sources
  let sources: any[] = [];
  if (agreementIds.length > 0) {
    try {
      const res = await sb
        .from('erp_hr_collective_agreements_registry_sources')
        .select('*')
        .in('agreement_id', agreementIds);
      if (res?.error) {
        return {
          ok: false,
          error: 'registry_source_query_failed',
          reason: sanitizeError(res.error),
          warnings,
        };
      }
      sources = Array.isArray(res?.data) ? res.data : [];
    } catch (e) {
      return {
        ok: false,
        error: 'registry_source_query_failed',
        reason: sanitizeError(e),
        warnings,
      };
    }
  }

  // 6) salary tables (filtered by year)
  let salaryTables: any[] = [];
  if (agreementIds.length > 0) {
    try {
      const res = await sb
        .from('erp_hr_collective_agreements_registry_salary_tables')
        .select('*')
        .in('agreement_id', agreementIds)
        .eq('year', input.year);
      if (res?.error) {
        return {
          ok: false,
          error: 'salary_tables_query_failed',
          reason: sanitizeError(res.error),
          warnings,
        };
      }
      salaryTables = Array.isArray(res?.data) ? res.data : [];
    } catch (e) {
      return {
        ok: false,
        error: 'salary_tables_query_failed',
        reason: sanitizeError(e),
        warnings,
      };
    }
  }

  // 7) rules
  let rules: any[] = [];
  if (agreementIds.length > 0) {
    try {
      const res = await sb
        .from('erp_hr_collective_agreements_registry_rules')
        .select('*')
        .in('agreement_id', agreementIds);
      if (res?.error) {
        return {
          ok: false,
          error: 'rules_query_failed',
          reason: sanitizeError(res.error),
          warnings,
        };
      }
      rules = Array.isArray(res?.data) ? res.data : [];
    } catch (e) {
      return { ok: false, error: 'rules_query_failed', reason: sanitizeError(e), warnings };
    }
  }

  return {
    ok: true,
    snapshot: { runtimeSettings, mappings, agreements, versions, sources, salaryTables, rules },
    warnings,
  };
}

export default fetchRegistryRuntimePayrollSnapshot;