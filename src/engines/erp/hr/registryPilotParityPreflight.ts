/**
 * B10F.2 — Pure parity pre-flight wrapper for registry pilot.
 *
 * Decides whether a registry-derived resolution can be safely applied
 * in pilot mode by comparing it against the operative resolution via
 * the B10B comparator.
 *
 * HARD SAFETY:
 *  - Pure: no Supabase, no fetch, no React, no hooks, no Deno.
 *  - No DB writes.
 *  - No imports from useESPayrollBridge, registryShadowFlag,
 *    registryPilotGate, agreementSalaryResolver, salaryNormalizer,
 *    payrollEngine, payslipEngine, agreementSafetyGate.
 *  - Does NOT mutate the pilot gate, the global registry flag, nor
 *    the operative collective agreements table.
 *  - Does NOT apply the resolution; only reports a verdict.
 */

import {
  compareOperativeVsRegistryAgreementResolution,
  type AgreementResolutionComparisonReport,
  type OperativeAgreementResolutionSnapshot,
} from './agreementResolutionComparator';

import type { RegistryResolutionPreview } from './registryAwareAgreementResolver';

export interface RegistryPilotParityPreflightInput {
  operative: OperativeAgreementResolutionSnapshot;
  registryPreview: RegistryResolutionPreview;
  toleranceEuros?: number;
  /**
   * Maximum number of warning diffs tolerated. If `undefined`, warnings
   * never block. If set (e.g. `0`), having more warnings than the
   * threshold blocks the apply.
   */
  warningThreshold?: number;
}

export type RegistryPilotParityPreflightReason =
  | 'parity_ok'
  | 'critical_diffs'
  | 'warning_threshold_exceeded'
  | 'registry_preview_blocked';

export interface RegistryPilotParityPreflightResult {
  allowApply: boolean;
  reason: RegistryPilotParityPreflightReason;
  blockers: string[];
  warnings: string[];
  comparison: AgreementResolutionComparisonReport;
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
}

export function runRegistryPilotParityPreflight(
  input: RegistryPilotParityPreflightInput,
): RegistryPilotParityPreflightResult {
  const comparison = compareOperativeVsRegistryAgreementResolution({
    operative: input.operative,
    registryPreview: input.registryPreview,
    toleranceEuros: input.toleranceEuros,
  });

  const summary = {
    critical: comparison.summary.critical,
    warning: comparison.summary.warning,
    info: comparison.summary.info,
  };

  const previewBlockers = Array.isArray(input.registryPreview.blockers)
    ? [...input.registryPreview.blockers]
    : [];

  // 1) Registry preview itself blocks payroll usage.
  if (input.registryPreview.canUseForPayroll !== true) {
    return {
      allowApply: false,
      reason: 'registry_preview_blocked',
      blockers: ['registry_preview_blocked', ...previewBlockers],
      warnings: [],
      comparison,
      summary,
    };
  }

  // 2) Critical diffs always block.
  if (summary.critical > 0) {
    return {
      allowApply: false,
      reason: 'critical_diffs',
      blockers: ['critical_diffs'],
      warnings: previewBlockers,
      comparison,
      summary,
    };
  }

  // 3) Warning threshold check (only if explicitly configured).
  if (
    typeof input.warningThreshold === 'number' &&
    Number.isFinite(input.warningThreshold) &&
    summary.warning > input.warningThreshold
  ) {
    return {
      allowApply: false,
      reason: 'warning_threshold_exceeded',
      blockers: ['warning_threshold_exceeded'],
      warnings: previewBlockers,
      comparison,
      summary,
    };
  }

  // 4) Parity OK.
  return {
    allowApply: true,
    reason: 'parity_ok',
    blockers: [],
    warnings: previewBlockers,
    comparison,
    summary,
  };
}
