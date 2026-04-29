/**
 * B10F.5B — Registry Pilot Candidate Preflight (PURE, READ-ONLY).
 *
 * Pure evaluator that, given an already-loaded snapshot of registry
 * artifacts (mapping, runtime_setting, agreement, version, salary
 * tables, rules, comparison report), decides whether the scope
 * (company + employee + contract + year) is a valid candidate to be
 * later proposed for the B10F.6 pilot allow-list.
 *
 * HARD SAFETY (B10F.5B):
 *  - PURE function: no Supabase, no fetch, no Deno, no React, no hooks,
 *    no env vars, no localStorage/sessionStorage, no remote sources.
 *  - No DB writes (`.from(`, `.insert(`, `.update(`, `.delete(`,
 *    `.upsert(`, `.rpc(`).
 *  - No service_role, no SUPABASE_SERVICE_ROLE_KEY, no admin client.
 *  - No imports from useESPayrollBridge, registryShadowFlag,
 *    registryPilotGate, agreementSalaryResolver, salaryNormalizer,
 *    payrollEngine, payslipEngine, agreementSafetyGate,
 *    registryRuntimeBridgeDecision, registryPilotBridgeDecision.
 *  - Does NOT mutate global flags, pilot mode, allow-list or any
 *    operative artifact. Does NOT touch the operative table
 *    `erp_hr_collective_agreements` (only inspects the *_registry
 *    suffixed shapes via the caller-provided snapshot).
 *  - Output is deterministic for identical inputs. No Date.now(),
 *    no Math.random().
 */

// ===================== Types =====================

export interface RegistryPilotCandidateInput {
  companyId: string;
  employeeId?: string | null;
  contractId?: string | null;
  targetYear: number;
  mapping: Record<string, unknown> | null | undefined;
  runtimeSetting: Record<string, unknown> | null | undefined;
  registryAgreement: Record<string, unknown> | null | undefined;
  registryVersion: Record<string, unknown> | null | undefined;
  salaryTables: Array<Record<string, unknown>>;
  rules: Array<Record<string, unknown>>;
  comparisonReport?: Record<string, unknown> | null;
}

export type RegistryPilotCandidateStatus = 'ready' | 'blocked' | 'needs_review';

export interface RegistryPilotCandidate {
  company_id: string;
  employee_id: string | null;
  contract_id: string | null;
  target_year: number;
  mapping_id: string | null;
  runtime_setting_id: string | null;
  registry_agreement_id: string | null;
  registry_version_id: string | null;
  readiness_score: number;
  status: RegistryPilotCandidateStatus;
  blockers: string[];
  warnings: string[];
  evidence: Record<string, unknown>;
}

// ===================== Helpers =====================

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function readString(obj: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const v = (obj as Record<string, unknown>)[key];
  return isNonEmptyString(v) ? (v as string) : null;
}

function readBool(obj: Record<string, unknown> | null | undefined, key: string): boolean | null {
  if (!obj || typeof obj !== 'object') return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === 'boolean' ? v : null;
}

function readNumber(obj: Record<string, unknown> | null | undefined, key: string): number | null {
  if (!obj || typeof obj !== 'object') return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// ===================== Public API =====================

/**
 * Each check contributes a fixed weight. Total weights sum to 100.
 * Failed mandatory check → blocker. Failed soft check → warning.
 */
const CHECK_WEIGHTS = {
  mapping_present: 8,
  mapping_status_approved_internal: 10,
  mapping_is_current: 6,
  runtime_setting_present: 8,
  runtime_setting_is_current: 6,
  runtime_setting_use_registry_for_payroll: 8,
  registry_agreement_present: 4,
  registry_agreement_ready_for_payroll: 10,
  registry_agreement_not_requires_human_review: 6,
  registry_agreement_data_completeness_human_validated: 8,
  registry_agreement_source_quality_official: 6,
  registry_version_present: 4,
  registry_version_is_current: 4,
  salary_tables_loaded: 6,
  rules_loaded: 4,
  comparison_report_no_critical: 2,
} as const;

const TOTAL_WEIGHT = Object.values(CHECK_WEIGHTS).reduce((a, b) => a + b, 0); // 100

export function evaluatePilotCandidateReadiness(
  input: RegistryPilotCandidateInput,
): RegistryPilotCandidate {
  const blockers: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  const companyId = isNonEmptyString(input?.companyId) ? input.companyId : '';
  const employeeId = isNonEmptyString(input?.employeeId) ? (input.employeeId as string) : null;
  const contractId = isNonEmptyString(input?.contractId) ? (input.contractId as string) : null;
  const targetYear =
    typeof input?.targetYear === 'number' && Number.isFinite(input.targetYear)
      ? input.targetYear
      : 0;

  if (!companyId) blockers.push('missing_company_id');
  if (!employeeId) blockers.push('missing_employee_id');
  if (!contractId) blockers.push('missing_contract_id');
  if (targetYear <= 0) blockers.push('invalid_target_year');

  // --- mapping ---
  const mapping = input?.mapping ?? null;
  if (!mapping) {
    blockers.push('mapping_missing');
  } else {
    score += CHECK_WEIGHTS.mapping_present;
    if (readString(mapping, 'mapping_status') === 'approved_internal') {
      score += CHECK_WEIGHTS.mapping_status_approved_internal;
    } else {
      blockers.push('mapping_not_approved_internal');
    }
    if (readBool(mapping, 'is_current') === true) {
      score += CHECK_WEIGHTS.mapping_is_current;
    } else {
      blockers.push('mapping_not_current');
    }
  }

  // --- runtime setting ---
  const runtimeSetting = input?.runtimeSetting ?? null;
  if (!runtimeSetting) {
    blockers.push('runtime_setting_missing');
  } else {
    score += CHECK_WEIGHTS.runtime_setting_present;
    if (readBool(runtimeSetting, 'is_current') === true) {
      score += CHECK_WEIGHTS.runtime_setting_is_current;
    } else {
      blockers.push('runtime_setting_not_current');
    }
    if (readBool(runtimeSetting, 'use_registry_for_payroll') === true) {
      score += CHECK_WEIGHTS.runtime_setting_use_registry_for_payroll;
    } else {
      blockers.push('runtime_setting_use_registry_for_payroll_false');
    }
  }

  // --- registry agreement ---
  const registryAgreement = input?.registryAgreement ?? null;
  if (!registryAgreement) {
    blockers.push('registry_agreement_missing');
  } else {
    score += CHECK_WEIGHTS.registry_agreement_present;
    if (readBool(registryAgreement, 'ready_for_payroll') === true) {
      score += CHECK_WEIGHTS.registry_agreement_ready_for_payroll;
    } else {
      blockers.push('registry_not_ready_for_payroll');
    }
    if (readBool(registryAgreement, 'requires_human_review') === false) {
      score += CHECK_WEIGHTS.registry_agreement_not_requires_human_review;
    } else {
      blockers.push('registry_requires_human_review');
    }
    if (readString(registryAgreement, 'data_completeness') === 'human_validated') {
      score += CHECK_WEIGHTS.registry_agreement_data_completeness_human_validated;
    } else {
      blockers.push('registry_data_completeness_not_human_validated');
    }
    if (readString(registryAgreement, 'source_quality') === 'official') {
      score += CHECK_WEIGHTS.registry_agreement_source_quality_official;
    } else {
      blockers.push('registry_source_quality_not_official');
    }
  }

  // --- registry version ---
  const registryVersion = input?.registryVersion ?? null;
  if (!registryVersion) {
    blockers.push('registry_version_missing');
  } else {
    score += CHECK_WEIGHTS.registry_version_present;
    if (readBool(registryVersion, 'is_current') === true) {
      score += CHECK_WEIGHTS.registry_version_is_current;
    } else {
      blockers.push('registry_version_not_current');
    }
  }

  // --- salary tables ---
  const salaryTables = Array.isArray(input?.salaryTables) ? input.salaryTables : [];
  if (salaryTables.length === 0) {
    blockers.push('salary_tables_empty');
  } else {
    score += CHECK_WEIGHTS.salary_tables_loaded;
  }

  // --- rules ---
  const rules = Array.isArray(input?.rules) ? input.rules : [];
  if (rules.length === 0) {
    warnings.push('rules_empty');
  } else {
    score += CHECK_WEIGHTS.rules_loaded;
  }

  // --- comparison report ---
  const comparisonReport = input?.comparisonReport ?? null;
  let comparisonNeedsReview = false;
  if (!comparisonReport) {
    warnings.push('comparison_report_missing');
    comparisonNeedsReview = true;
  } else {
    const critical = readNumber(comparisonReport, 'critical');
    if (critical === null) {
      warnings.push('comparison_report_critical_unknown');
      comparisonNeedsReview = true;
    } else if (critical > 0) {
      blockers.push('comparison_report_has_critical_diffs');
    } else {
      score += CHECK_WEIGHTS.comparison_report_no_critical;
    }
  }

  // Clamp score
  if (score < 0) score = 0;
  if (score > TOTAL_WEIGHT) score = TOTAL_WEIGHT;

  // Status decision (deterministic)
  let status: RegistryPilotCandidateStatus;
  if (blockers.length > 0) {
    status = 'blocked';
  } else if (comparisonNeedsReview || warnings.length > 0) {
    status = 'needs_review';
  } else {
    status = 'ready';
  }

  const evidence: Record<string, unknown> = {
    weights: CHECK_WEIGHTS,
    total_weight: TOTAL_WEIGHT,
    counts: {
      salary_tables: salaryTables.length,
      rules: rules.length,
    },
    flags: {
      mapping_status: readString(mapping, 'mapping_status'),
      mapping_is_current: readBool(mapping, 'is_current'),
      runtime_setting_is_current: readBool(runtimeSetting, 'is_current'),
      runtime_setting_use_registry_for_payroll: readBool(
        runtimeSetting,
        'use_registry_for_payroll',
      ),
      registry_ready_for_payroll: readBool(registryAgreement, 'ready_for_payroll'),
      registry_requires_human_review: readBool(registryAgreement, 'requires_human_review'),
      registry_data_completeness: readString(registryAgreement, 'data_completeness'),
      registry_source_quality: readString(registryAgreement, 'source_quality'),
      registry_version_is_current: readBool(registryVersion, 'is_current'),
      comparison_critical: readNumber(comparisonReport, 'critical'),
    },
  };

  return {
    company_id: companyId,
    employee_id: employeeId,
    contract_id: contractId,
    target_year: targetYear,
    mapping_id: readString(mapping, 'id'),
    runtime_setting_id: readString(runtimeSetting, 'id'),
    registry_agreement_id: readString(registryAgreement, 'id'),
    registry_version_id: readString(registryVersion, 'id'),
    readiness_score: score,
    status,
    blockers,
    warnings,
    evidence,
  };
}

export default evaluatePilotCandidateReadiness;