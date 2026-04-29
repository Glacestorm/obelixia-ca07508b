/**
 * B10E.1 — Registry Runtime Setting Resolver (PURE).
 *
 * Pure, deterministic, side-effect-free resolver that picks the most specific
 * `erp_hr_company_agreement_registry_runtime_settings` record applicable to a
 * given (company, employee?, contract?) scope and reports whether it is
 * eligible to be considered by downstream registry payroll logic.
 *
 * HARD SAFETY (B10E.1):
 *  - No Supabase, no fetch, no React, no hooks, no Deno, no DB client.
 *  - No imports from useESPayrollBridge, registryShadowFlag,
 *    agreementSalaryResolver, salaryNormalizer, payrollEngine, payslipEngine,
 *    or agreementSafetyGate.
 *  - Does NOT touch the operative table erp_hr_collective_agreements.
 *  - Does NOT mutate inputs.
 *  - Does NOT activate HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL.
 *  - Does NOT consume runtime settings from the payroll bridge.
 *  - Does NOT load data; it only resolves over an injected snapshot list.
 *
 * Scope priority (most specific wins):
 *  1. company_id + employee_id + contract_id
 *  2. company_id + contract_id
 *  3. company_id + employee_id
 *  4. company_id only
 */

// ===================== Types =====================

export interface RegistryRuntimeSettingSnapshot {
  id: string;
  mapping_id: string;
  company_id: string;
  employee_id?: string | null;
  contract_id?: string | null;
  use_registry_for_payroll: boolean;
  is_current: boolean;
  activation_run_id?: string | null;
  rollback_run_id?: string | null;
}

export type RegistryRuntimeScopeMatched =
  | 'company_employee_contract'
  | 'company_contract'
  | 'company_employee'
  | 'company'
  | 'none';

export type RegistryRuntimeSettingResolverReason =
  | 'matched'
  | 'no_runtime_setting'
  | 'setting_not_current'
  | 'use_registry_for_payroll_false'
  | 'setting_inactive';

export interface RegistryRuntimeSettingResolverInput {
  companyId: string;
  employeeId?: string | null;
  contractId?: string | null;
  settings: RegistryRuntimeSettingSnapshot[];
}

export interface RegistryRuntimeSettingResolverResult {
  setting: RegistryRuntimeSettingSnapshot | null;
  scopeMatched: RegistryRuntimeScopeMatched;
  reason: RegistryRuntimeSettingResolverReason;
  blockers: string[];
}

// ===================== Internals =====================

function isNil(v: unknown): boolean {
  return v === undefined || v === null;
}

/**
 * Filter settings whose scope keys match the requested scope EXACTLY at the
 * given specificity. A setting matches a more specific scope only if every
 * required key is present (non-null) on the setting AND equal to the request.
 * For company-only, employee_id and contract_id on the setting MUST be nil.
 */
function filterByScope(
  settings: RegistryRuntimeSettingSnapshot[],
  companyId: string,
  employeeId: string | null | undefined,
  contractId: string | null | undefined,
  scope: Exclude<RegistryRuntimeScopeMatched, 'none'>,
): RegistryRuntimeSettingSnapshot[] {
  return settings.filter((s) => {
    if (s.company_id !== companyId) return false;
    switch (scope) {
      case 'company_employee_contract':
        if (isNil(employeeId) || isNil(contractId)) return false;
        return s.employee_id === employeeId && s.contract_id === contractId;
      case 'company_contract':
        if (isNil(contractId)) return false;
        // contract-only setting: employee_id must be nil on the setting
        return isNil(s.employee_id) && s.contract_id === contractId;
      case 'company_employee':
        if (isNil(employeeId)) return false;
        return s.employee_id === employeeId && isNil(s.contract_id);
      case 'company':
        return isNil(s.employee_id) && isNil(s.contract_id);
    }
  });
}

/**
 * Deterministic pick: stable sort by id ascending, take first.
 */
function deterministicPick(
  candidates: RegistryRuntimeSettingSnapshot[],
): RegistryRuntimeSettingSnapshot | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return sorted[0];
}

const SCOPE_ORDER: Array<Exclude<RegistryRuntimeScopeMatched, 'none'>> = [
  'company_employee_contract',
  'company_contract',
  'company_employee',
  'company',
];

// ===================== Public API =====================

export function resolveRegistryRuntimeSetting(
  input: RegistryRuntimeSettingResolverInput,
): RegistryRuntimeSettingResolverResult {
  const { companyId, employeeId, contractId, settings } = input;

  if (!Array.isArray(settings) || settings.length === 0) {
    return {
      setting: null,
      scopeMatched: 'none',
      reason: 'no_runtime_setting',
      blockers: ['no_runtime_setting'],
    };
  }

  // Walk scopes from most specific to least specific.
  for (const scope of SCOPE_ORDER) {
    const candidates = filterByScope(settings, companyId, employeeId, contractId, scope);
    const picked = deterministicPick(candidates);
    if (!picked) continue;

    // Validate the picked setting.
    const blockers: string[] = [];

    // Rollback takes precedence over generic "not current".
    if (!isNil(picked.rollback_run_id)) {
      blockers.push('setting_inactive');
      return {
        setting: picked,
        scopeMatched: scope,
        reason: 'setting_inactive',
        blockers,
      };
    }

    if (picked.is_current === false) {
      blockers.push('setting_not_current');
      return {
        setting: picked,
        scopeMatched: scope,
        reason: 'setting_not_current',
        blockers,
      };
    }

    if (picked.use_registry_for_payroll === false) {
      blockers.push('use_registry_for_payroll_false');
      return {
        setting: picked,
        scopeMatched: scope,
        reason: 'use_registry_for_payroll_false',
        blockers,
      };
    }

    return {
      setting: picked,
      scopeMatched: scope,
      reason: 'matched',
      blockers: [],
    };
  }

  return {
    setting: null,
    scopeMatched: 'none',
    reason: 'no_runtime_setting',
    blockers: ['no_runtime_setting'],
  };
}
