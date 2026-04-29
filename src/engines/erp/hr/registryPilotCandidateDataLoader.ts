/**
 * B10F.5B — Registry Pilot Candidate Data Loader (READ-ONLY).
 *
 * Optional adapter that loads, via the user's RLS-bound supabase client
 * (passed by the caller), the raw artifacts needed to build the
 * candidate snapshot consumed by `evaluatePilotCandidateReadiness`
 * (`registryPilotCandidatePreflight`).
 *
 * HARD SAFETY (B10F.5B):
 *  - Only SELECT operations; no insert/update/upsert/delete/rpc.
 *  - No service_role, no SUPABASE_SERVICE_ROLE_KEY, no admin client.
 *  - No edge function invocation (no functions.invoke).
 *  - No imports from useESPayrollBridge, registryShadowFlag,
 *    registryPilotGate, agreementSalaryResolver, salaryNormalizer,
 *    payrollEngine, payslipEngine, agreementSafetyGate,
 *    registryRuntimeBridgeDecision, registryPilotBridgeDecision.
 *  - Does NOT touch the operative table `erp_hr_collective_agreements`
 *    (only the *_registry suffixed tables and the pilot decision log).
 *  - Does NOT mutate global flags, pilot mode or allow-list.
 *  - Never throws; always returns a structured result.
 */

// ===================== Types =====================

export interface RegistryPilotCandidateRawSnapshot {
  mappings: Array<Record<string, unknown>>;
  runtimeSettings: Array<Record<string, unknown>>;
  agreements: Array<Record<string, unknown>>;
  versions: Array<Record<string, unknown>>;
  salaryTables: Array<Record<string, unknown>>;
  rules: Array<Record<string, unknown>>;
  recentPilotDecisions: Array<Record<string, unknown>>;
}

export interface RegistryPilotCandidateLoaderInput {
  companyId: string;
  year: number;
  // Caller-provided supabase-like client (user JWT, RLS enforced).
  supabaseClient: any;
}

export type RegistryPilotCandidateLoaderError =
  | 'invalid_input'
  | 'mappings_query_failed'
  | 'runtime_settings_query_failed'
  | 'agreements_query_failed'
  | 'versions_query_failed'
  | 'salary_tables_query_failed'
  | 'rules_query_failed'
  | 'pilot_decision_log_query_failed';

export type RegistryPilotCandidateLoaderResult =
  | { ok: true; snapshot: RegistryPilotCandidateRawSnapshot; warnings: string[] }
  | {
      ok: false;
      error: RegistryPilotCandidateLoaderError;
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

function asArray(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : [];
}

// ===================== Public API =====================

export async function fetchRegistryPilotCandidateSnapshot(
  input: RegistryPilotCandidateLoaderInput,
): Promise<RegistryPilotCandidateLoaderResult> {
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

  // 1) mappings
  let mappings: Array<Record<string, unknown>> = [];
  try {
    const res = await sb
      .from('erp_hr_company_agreement_registry_mappings')
      .select('*')
      .eq('company_id', input.companyId);
    if (res?.error) {
      return {
        ok: false,
        error: 'mappings_query_failed',
        reason: sanitizeError(res.error),
        warnings,
      };
    }
    mappings = asArray(res?.data);
  } catch (e) {
    return { ok: false, error: 'mappings_query_failed', reason: sanitizeError(e), warnings };
  }

  // 2) runtime_settings
  let runtimeSettings: Array<Record<string, unknown>> = [];
  try {
    const res = await sb
      .from('erp_hr_company_agreement_registry_runtime_settings')
      .select('*')
      .eq('company_id', input.companyId);
    if (res?.error) {
      return {
        ok: false,
        error: 'runtime_settings_query_failed',
        reason: sanitizeError(res.error),
        warnings,
      };
    }
    runtimeSettings = asArray(res?.data);
  } catch (e) {
    return {
      ok: false,
      error: 'runtime_settings_query_failed',
      reason: sanitizeError(e),
      warnings,
    };
  }

  const agreementIds = uniq(
    mappings.map((m) => (typeof m?.registry_agreement_id === 'string' ? m.registry_agreement_id : null)),
  );
  const versionIds = uniq(
    mappings.map((m) => (typeof m?.registry_version_id === 'string' ? m.registry_version_id : null)),
  );

  // 3) agreements
  let agreements: Array<Record<string, unknown>> = [];
  if (agreementIds.length > 0) {
    try {
      const res = await sb
        .from('erp_hr_collective_agreements_registry')
        .select('*')
        .in('id', agreementIds);
      if (res?.error) {
        return {
          ok: false,
          error: 'agreements_query_failed',
          reason: sanitizeError(res.error),
          warnings,
        };
      }
      agreements = asArray(res?.data);
    } catch (e) {
      return { ok: false, error: 'agreements_query_failed', reason: sanitizeError(e), warnings };
    }
  } else {
    warnings.push('no_agreement_ids_in_mappings');
  }

  // 4) versions
  let versions: Array<Record<string, unknown>> = [];
  if (versionIds.length > 0) {
    try {
      const res = await sb
        .from('erp_hr_collective_agreements_registry_versions')
        .select('*')
        .in('id', versionIds);
      if (res?.error) {
        return {
          ok: false,
          error: 'versions_query_failed',
          reason: sanitizeError(res.error),
          warnings,
        };
      }
      versions = asArray(res?.data);
    } catch (e) {
      return { ok: false, error: 'versions_query_failed', reason: sanitizeError(e), warnings };
    }
  }

  // 5) salary tables
  let salaryTables: Array<Record<string, unknown>> = [];
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
      salaryTables = asArray(res?.data);
    } catch (e) {
      return {
        ok: false,
        error: 'salary_tables_query_failed',
        reason: sanitizeError(e),
        warnings,
      };
    }
  }

  // 6) rules
  let rules: Array<Record<string, unknown>> = [];
  if (agreementIds.length > 0) {
    try {
      const res = await sb
        .from('erp_hr_collective_agreements_registry_rules')
        .select('*')
        .in('agreement_id', agreementIds);
      if (res?.error) {
        return { ok: false, error: 'rules_query_failed', reason: sanitizeError(res.error), warnings };
      }
      rules = asArray(res?.data);
    } catch (e) {
      return { ok: false, error: 'rules_query_failed', reason: sanitizeError(e), warnings };
    }
  }

  // 7) recent pilot decision logs (for audit context only, may be empty)
  let recentPilotDecisions: Array<Record<string, unknown>> = [];
  try {
    const res = await sb
      .from('erp_hr_company_agreement_registry_pilot_decision_logs')
      .select('*')
      .eq('company_id', input.companyId)
      .order('decided_at', { ascending: false })
      .limit(20);
    if (res?.error) {
      // Non-fatal: report as warning but still succeed.
      warnings.push(`pilot_decision_log_query_failed:${sanitizeError(res.error)}`);
    } else {
      recentPilotDecisions = asArray(res?.data);
    }
  } catch (e) {
    warnings.push(`pilot_decision_log_query_failed:${sanitizeError(e)}`);
  }

  return {
    ok: true,
    snapshot: {
      mappings,
      runtimeSettings,
      agreements,
      versions,
      salaryTables,
      rules,
      recentPilotDecisions,
    },
    warnings,
  };
}

export default fetchRegistryPilotCandidateSnapshot;