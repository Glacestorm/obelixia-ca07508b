/**
 * B10F.1 — Pure pilot gate for controlled registry-aware payroll
 * activation. Exposes a hardcoded pilot flag, a closed allow-list of
 * scopes (company + employee + contract + year), and a pure decision
 * helper.
 *
 * Hard rules:
 *  - No env vars, no localStorage/sessionStorage, no remote sources.
 *  - No Supabase, no fetch, no React, no hooks, no Deno.
 *  - No DB writes (`.from(`, `.insert(`, `.update(`, `.delete(`,
 *    `.upsert(`).
 *  - No imports from `useESPayrollBridge`, `registryShadowFlag`,
 *    `agreementSalaryResolver`, `salaryNormalizer`, `payrollEngine`,
 *    `payslipEngine`, `agreementSafetyGate`.
 *  - The global flag `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` is NOT
 *    consumed nor mutated here; pilot mode is an independent second
 *    gate.
 *  - When `HR_REGISTRY_PILOT_MODE === false` (default) every call
 *    resolves to `enabled=false`.
 */

export const HR_REGISTRY_PILOT_MODE = false as const;

/** Maximum allow-list size during B10F. */
export const REGISTRY_PILOT_ALLOWLIST_MAX = 3 as const;

export interface RegistryPilotScope {
  company_id: string;
  employee_id: string;
  contract_id: string;
  target_year: number;
  pilot_started_at: string;
  owner: string;
  rollback_contact: string;
}

export const REGISTRY_PILOT_SCOPE_ALLOWLIST: readonly RegistryPilotScope[] = [] as const;

export interface RegistryPilotGateInput {
  companyId: string;
  employeeId?: string | null;
  contractId?: string | null;
  targetYear: number;
  globalRegistryFlag?: boolean;
  pilotMode?: boolean;
  allowlist?: readonly RegistryPilotScope[];
}

export type RegistryPilotGateReason =
  | 'pilot_disabled'
  | 'global_flag_conflict'
  | 'scope_not_allowed'
  | 'scope_allowed'
  | 'invalid_scope'
  | 'invalid_allowlist';

export interface RegistryPilotGateResult {
  enabled: boolean;
  reason: RegistryPilotGateReason;
  scope?: RegistryPilotScope;
  blockers: string[];
}

export interface RegistryPilotAllowlistValidationResult {
  valid: boolean;
  blockers: string[];
}

const FORBIDDEN_ID_TOKENS = new Set(['', '*', 'null', 'undefined']);

function isValidId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (FORBIDDEN_ID_TOKENS.has(trimmed)) return false;
  if (trimmed.includes('*')) return false;
  return true;
}

function isValidNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateRegistryPilotAllowlist(
  allowlist: readonly RegistryPilotScope[],
): RegistryPilotAllowlistValidationResult {
  const blockers: string[] = [];

  if (!Array.isArray(allowlist)) {
    return { valid: false, blockers: ['allowlist_not_array'] };
  }

  if (allowlist.length > REGISTRY_PILOT_ALLOWLIST_MAX) {
    blockers.push('allowlist_exceeds_max_entries');
  }

  const seen = new Set<string>();

  for (let i = 0; i < allowlist.length; i++) {
    const entry = allowlist[i] as RegistryPilotScope | undefined;

    if (!entry || typeof entry !== 'object') {
      blockers.push(`entry_${i}_not_object`);
      continue;
    }

    if (!isValidId(entry.company_id)) {
      blockers.push(`entry_${i}_invalid_company_id`);
    }
    if (!isValidId(entry.employee_id)) {
      blockers.push(`entry_${i}_invalid_employee_id`);
    }
    if (!isValidId(entry.contract_id)) {
      blockers.push(`entry_${i}_invalid_contract_id`);
    }
    if (
      typeof entry.target_year !== 'number' ||
      !Number.isFinite(entry.target_year) ||
      entry.target_year <= 0
    ) {
      blockers.push(`entry_${i}_invalid_target_year`);
    }
    if (!isValidNonEmptyString(entry.owner)) {
      blockers.push(`entry_${i}_invalid_owner`);
    }
    if (!isValidNonEmptyString(entry.rollback_contact)) {
      blockers.push(`entry_${i}_invalid_rollback_contact`);
    }
    if (!isValidNonEmptyString(entry.pilot_started_at)) {
      blockers.push(`entry_${i}_invalid_pilot_started_at`);
    }

    const key = `${entry.company_id}|${entry.employee_id}|${entry.contract_id}|${entry.target_year}`;
    if (seen.has(key)) {
      blockers.push(`entry_${i}_duplicate_scope`);
    } else {
      seen.add(key);
    }
  }

  return { valid: blockers.length === 0, blockers };
}

export function isPilotEnabledForScope(
  input: RegistryPilotGateInput,
): RegistryPilotGateResult {
  const pilotMode = input.pilotMode ?? HR_REGISTRY_PILOT_MODE;
  const globalFlag = input.globalRegistryFlag ?? false;
  const allowlist = input.allowlist ?? REGISTRY_PILOT_SCOPE_ALLOWLIST;

  if (globalFlag === true && pilotMode === true) {
    return {
      enabled: false,
      reason: 'global_flag_conflict',
      blockers: ['pilot_conflict_global_on'],
    };
  }

  if (pilotMode !== true) {
    return {
      enabled: false,
      reason: 'pilot_disabled',
      blockers: ['pilot_disabled'],
    };
  }

  if (
    !isValidId(input.companyId) ||
    !isValidId(input.employeeId) ||
    !isValidId(input.contractId)
  ) {
    return {
      enabled: false,
      reason: 'invalid_scope',
      blockers: ['pilot_requires_company_employee_contract'],
    };
  }

  if (
    typeof input.targetYear !== 'number' ||
    !Number.isFinite(input.targetYear) ||
    input.targetYear <= 0
  ) {
    return {
      enabled: false,
      reason: 'invalid_scope',
      blockers: ['pilot_requires_company_employee_contract'],
    };
  }

  const validation = validateRegistryPilotAllowlist(allowlist);
  if (!validation.valid) {
    return {
      enabled: false,
      reason: 'invalid_allowlist',
      blockers: validation.blockers,
    };
  }

  if (allowlist.length === 0) {
    return {
      enabled: false,
      reason: 'scope_not_allowed',
      blockers: ['scope_not_in_allowlist'],
    };
  }

  const match = allowlist.find(
    (s) =>
      s.company_id === input.companyId &&
      s.employee_id === input.employeeId &&
      s.contract_id === input.contractId &&
      s.target_year === input.targetYear,
  );

  if (!match) {
    return {
      enabled: false,
      reason: 'scope_not_allowed',
      blockers: ['scope_not_in_allowlist'],
    };
  }

  return {
    enabled: true,
    reason: 'scope_allowed',
    scope: match,
    blockers: [],
  };
}