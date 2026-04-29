/**
 * B10C — Pure registry shadow preview helper.
 *
 * Combines B10A (registry preview) and B10B (operative-vs-registry
 * comparator) into a single side-effect-free entry point that is safe to
 * call from the payroll bridge in shadow mode.
 *
 * HARD SAFETY (B10C):
 *  - Pure: no Supabase, no fetch, no React, no hooks, no DB.
 *  - Does NOT import the operative agreement resolver, the salary
 *    normalizer, the payroll engine, the payslip engine, or the bridge.
 *  - Does NOT touch the operative collective agreements table.
 *  - Does NOT perform lookups, CNAE inference or name-based matching.
 *  - Default-disabled via the hardcoded flag
 *    HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false.
 *  - Even when enabled (tests / future B10D), result is metadata-only:
 *    callers MUST NOT use it as the authoritative payroll source.
 */

import type {
  RegistryAgreementSnapshot,
  RegistryAgreementVersionSnapshot,
  RegistryAgreementSourceSnapshot,
  RegistrySalaryTableSnapshot,
  RegistryRuleSnapshot,
  RegistryResolutionPreview,
} from './registryAwareAgreementResolver';

import { resolveRegistryAgreementPreview } from './registryAwareAgreementResolver';

import type {
  OperativeAgreementResolutionSnapshot,
  AgreementResolutionComparisonReport,
} from './agreementResolutionComparator';

import { compareOperativeVsRegistryAgreementResolution } from './agreementResolutionComparator';

import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from './registryShadowFlag';

// ===================== Types =====================

export interface RegistryShadowInputs {
  operative: OperativeAgreementResolutionSnapshot;
  registryAgreement?: RegistryAgreementSnapshot | null;
  registryVersion?: RegistryAgreementVersionSnapshot | null;
  registrySource?: RegistryAgreementSourceSnapshot | null;
  registrySalaryTables?: RegistrySalaryTableSnapshot[];
  registryRules?: RegistryRuleSnapshot[];
  targetYear?: number;
  targetGroup?: string;
  targetCategory?: string;
}

export type RegistryShadowReason =
  | 'flag_off'
  | 'no_registry_input'
  | 'computed';

export interface RegistryShadowResult {
  enabled: boolean;
  reason?: RegistryShadowReason;
  preview?: RegistryResolutionPreview;
  comparison?: AgreementResolutionComparisonReport;
}

export interface BuildRegistryShadowOptions {
  /**
   * Test-only override. Production code MUST NOT pass this.
   * Setting `enabledOverrideForTests: true` does not modify the runtime
   * value of HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL.
   */
  enabledOverrideForTests?: boolean;
}

// ===================== Helpers =====================

function hasMinimalRegistryInput(inputs: RegistryShadowInputs): boolean {
  if (!inputs.registryAgreement) return false;
  if (!inputs.registryVersion) return false;
  if (!inputs.registrySource) return false;
  if (!Array.isArray(inputs.registrySalaryTables) || inputs.registrySalaryTables.length === 0) {
    return false;
  }
  if (!Array.isArray(inputs.registryRules) || inputs.registryRules.length === 0) {
    return false;
  }
  return true;
}

// ===================== Main =====================

export function buildRegistryAgreementShadowPreview(
  inputs: RegistryShadowInputs,
  options?: BuildRegistryShadowOptions,
): RegistryShadowResult {
  // Effective enable: real flag is the only source of truth in production.
  // The override is strictly for unit tests and never overrides the real
  // flag's value at module level.
  const enabledByFlag = HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL === true;
  const enabledByOverride = options?.enabledOverrideForTests === true;
  const effectiveEnabled = enabledByFlag || enabledByOverride;

  if (!effectiveEnabled) {
    return { enabled: false, reason: 'flag_off' };
  }

  if (!hasMinimalRegistryInput(inputs)) {
    return { enabled: false, reason: 'no_registry_input' };
  }

  const preview = resolveRegistryAgreementPreview({
    agreement: inputs.registryAgreement ?? null,
    version: inputs.registryVersion ?? null,
    source: inputs.registrySource ?? null,
    salaryTables: inputs.registrySalaryTables ?? [],
    rules: inputs.registryRules ?? [],
    targetYear: inputs.targetYear,
    targetGroup: inputs.targetGroup,
    targetCategory: inputs.targetCategory,
  });

  const comparison = compareOperativeVsRegistryAgreementResolution({
    operative: inputs.operative,
    registryPreview: preview,
  });

  return {
    enabled: true,
    reason: 'computed',
    preview,
    comparison,
  };
}