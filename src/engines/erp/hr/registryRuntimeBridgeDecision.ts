/**
 * B10E.4 — Registry Runtime Bridge Decision (PURE).
 *
 * Pure, deterministic helper that decides whether the payroll bridge can
 * apply a registry-driven salary resolution given:
 *  - the operative salary resolution (mandatory fallback);
 *  - a snapshot result from the read-only data loader (B10E.3);
 *  - the runtime setting resolver result (B10E.1);
 *  - the registry payroll resolution builder result (B10E.2);
 *  - the operative-vs-registry comparator report (B10B).
 *
 * HARD SAFETY (B10E.4 helper):
 *  - No Supabase, no fetch, no React, no hooks, no Deno, no DB client.
 *  - No `.from(`, `.insert(`, `.update(`, `.delete(`, `.upsert(`, no `.rpc(`.
 *  - No imports from useESPayrollBridge, registryShadowFlag,
 *    agreementSalaryResolver, salaryNormalizer, payrollEngine,
 *    payslipEngine, agreementSafetyGate.
 *  - Does NOT touch the operative table erp_hr_collective_agreements.
 *  - Does NOT mutate inputs.
 *  - Does NOT activate HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL.
 *  - Does NOT throw on bad input; always returns a structured decision.
 *
 * The bridge wraps the actual call inside the existing
 * `if ((HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL as unknown as boolean) === true)`
 * block; this helper itself never reads the flag.
 */

export type RegistryRuntimeBridgeReason =
  | 'flag_off'
  | 'no_runtime_setting'
  | 'runtime_setting_blocked'
  | 'snapshot_load_failed'
  | 'registry_not_eligible'
  | 'critical_diff_fallback'
  | 'applied_ok';

export interface RegistryRuntimeBridgeTrace {
  attempted: boolean;
  applied: boolean;
  reason: RegistryRuntimeBridgeReason;
  setting_id?: string;
  mapping_id?: string;
  registry_agreement_id?: string;
  registry_version_id?: string;
  comparison_summary?: { critical: number; warnings: number; info?: number };
  blockers?: string[];
  warnings?: string[];
}

export interface RegistryRuntimeBridgeDecision {
  applyRegistry: boolean;
  trace: RegistryRuntimeBridgeTrace;
  registrySalaryResolution?: unknown;
}

/**
 * Build the trace returned when the flag is OFF (production path).
 * Pure constant-time helper — no inputs needed.
 */
export function buildFlagOffTrace(): RegistryRuntimeBridgeTrace {
  return {
    attempted: false,
    applied: false,
    reason: 'flag_off',
  };
}

export interface RegistryRuntimeBridgeDecisionInput {
  /**
   * Always required. The operative resolution remains the fallback even
   * if registry application succeeds.
   */
  operativeSalaryResolution: unknown;
  /**
   * Result from `fetchRegistryRuntimePayrollSnapshot` (B10E.3).
   * Pass `null` to indicate the loader was not invoked (caller has not
   * loaded data yet).
   */
  snapshotResult:
    | null
    | { ok: true; warnings: string[] }
    | { ok: false; error: string; reason: string; warnings: string[] };
  /**
   * Result from `resolveRegistryRuntimeSetting` (B10E.1).
   */
  settingResolverResult: {
    setting: {
      id: string;
      mapping_id: string;
    } | null;
    reason: string;
    blockers: string[];
  } | null;
  /**
   * Result from `buildRegistryPayrollResolution` (B10E.2).
   */
  builderResult: {
    canBuild: boolean;
    reason: string;
    blockers: string[];
    warnings: string[];
    salaryResolution?: unknown;
  } | null;
  /**
   * Result from `compareOperativeVsRegistryAgreementResolution` (B10B).
   */
  comparatorReport: {
    summary: { critical: number; warning: number; info: number };
    hasCriticalDiffs: boolean;
  } | null;
  /**
   * Optional context to enrich the trace.
   */
  registryAgreementId?: string;
  registryVersionId?: string;
}

/**
 * Pure decision builder. Caller is responsible for short-circuiting BEFORE
 * invoking this (e.g. when the flag is OFF or when no registry data was
 * loaded). When invoked, this helper assumes the caller is in the
 * "attempted=true" path.
 */
export function buildRegistryRuntimeBridgeDecision(
  input: RegistryRuntimeBridgeDecisionInput,
): RegistryRuntimeBridgeDecision {
  const trace: RegistryRuntimeBridgeTrace = {
    attempted: true,
    applied: false,
    reason: 'snapshot_load_failed',
  };

  // 1) Snapshot must exist and be ok.
  if (!input.snapshotResult) {
    trace.reason = 'snapshot_load_failed';
    trace.blockers = ['no_snapshot'];
    return { applyRegistry: false, trace };
  }
  if (input.snapshotResult.ok !== true) {
    trace.reason = 'snapshot_load_failed';
    const failed = input.snapshotResult as {
      ok: false;
      error: string;
      reason: string;
      warnings: string[];
    };
    trace.blockers = [`loader_${failed.error}`];
    if (failed.reason) trace.warnings = [failed.reason];
    return { applyRegistry: false, trace };
  }

  // 2) Runtime setting resolution.
  if (!input.settingResolverResult || !input.settingResolverResult.setting) {
    trace.reason = 'no_runtime_setting';
    trace.blockers = input.settingResolverResult?.blockers ?? ['no_runtime_setting'];
    return { applyRegistry: false, trace };
  }
  if (input.settingResolverResult.reason !== 'matched') {
    trace.reason = 'runtime_setting_blocked';
    trace.setting_id = input.settingResolverResult.setting.id;
    trace.mapping_id = input.settingResolverResult.setting.mapping_id;
    trace.blockers = input.settingResolverResult.blockers;
    return { applyRegistry: false, trace };
  }

  trace.setting_id = input.settingResolverResult.setting.id;
  trace.mapping_id = input.settingResolverResult.setting.mapping_id;

  // 3) Builder result.
  if (!input.builderResult) {
    trace.reason = 'registry_not_eligible';
    trace.blockers = ['no_builder_result'];
    return { applyRegistry: false, trace };
  }
  if (
    input.builderResult.canBuild !== true ||
    !input.builderResult.salaryResolution
  ) {
    trace.reason = 'registry_not_eligible';
    trace.blockers = input.builderResult.blockers;
    if (input.builderResult.warnings?.length) {
      trace.warnings = [...input.builderResult.warnings];
    }
    return { applyRegistry: false, trace };
  }

  if (input.registryAgreementId) trace.registry_agreement_id = input.registryAgreementId;
  if (input.registryVersionId) trace.registry_version_id = input.registryVersionId;

  // 4) Comparator must exist and have zero critical diffs.
  if (!input.comparatorReport) {
    trace.reason = 'registry_not_eligible';
    trace.blockers = ['no_comparator_report'];
    if (input.builderResult.warnings?.length) {
      trace.warnings = [...input.builderResult.warnings];
    }
    return { applyRegistry: false, trace };
  }

  const cmpSummary = {
    critical: input.comparatorReport.summary.critical,
    warnings: input.comparatorReport.summary.warning,
    info: input.comparatorReport.summary.info,
  };
  trace.comparison_summary = cmpSummary;

  if (input.comparatorReport.hasCriticalDiffs || cmpSummary.critical > 0) {
    trace.reason = 'critical_diff_fallback';
    trace.blockers = ['critical_diff'];
    if (input.builderResult.warnings?.length) {
      trace.warnings = [...input.builderResult.warnings];
    }
    return { applyRegistry: false, trace };
  }

  // 5) Apply.
  trace.reason = 'applied_ok';
  trace.applied = true;
  if (input.builderResult.warnings?.length) {
    trace.warnings = [...input.builderResult.warnings];
  }
  return {
    applyRegistry: true,
    trace,
    registrySalaryResolution: input.builderResult.salaryResolution,
  };
}

/**
 * Wrap any exception thrown by a registry sub-step into a fallback trace.
 */
export function buildExceptionFallbackTrace(): RegistryRuntimeBridgeTrace {
  return {
    attempted: true,
    applied: false,
    reason: 'snapshot_load_failed',
    blockers: ['exception'],
  };
}

/**
 * Attach a runtime trace to a salary resolution object as a NON-ENUMERABLE
 * property under `__registry_runtime`. Non-enumerable means JSON.stringify
 * and deepEqual on enumerable own properties remain identical to the
 * pre-attachment state, preserving payroll output parity.
 *
 * Idempotent: safe to call multiple times; the property is replaced.
 */
export function attachRegistryRuntimeTrace<T>(
  salaryResolution: T,
  trace: RegistryRuntimeBridgeTrace,
): T {
  if (salaryResolution === null || typeof salaryResolution !== 'object') {
    return salaryResolution;
  }
  try {
    Object.defineProperty(salaryResolution, '__registry_runtime', {
      value: trace,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  } catch {
    // Best-effort: never break payroll because of trace attachment.
  }
  return salaryResolution;
}
