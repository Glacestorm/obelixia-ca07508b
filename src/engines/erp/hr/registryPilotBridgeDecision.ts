/**
 * B10F.3 — Pure Registry Pilot Bridge Decision helper.
 *
 * Encapsulates the pilot branch of useESPayrollBridge. The bridge invokes
 * this helper ONLY inside the
 *   `else if ((HR_REGISTRY_PILOT_MODE as unknown as boolean) === true)`
 * sub-block, after the global flag branch has been ruled out.
 *
 * HARD SAFETY (B10F.3 helper):
 *  - Pure. No Supabase, no fetch, no React, no hooks, no Deno, no DB.
 *  - No `.from(`, `.insert(`, `.update(`, `.delete(`, `.upsert(`, `.rpc(`.
 *  - No imports from `useESPayrollBridge`, `registryShadowFlag`,
 *    `agreementSalaryResolver`, `salaryNormalizer`, `payrollEngine`,
 *    `payslipEngine`, `agreementSafetyGate`.
 *  - Does NOT touch the operative table `erp_hr_collective_agreements`.
 *  - Does NOT mutate inputs.
 *  - Does NOT activate `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
 *  - Does NOT activate `HR_REGISTRY_PILOT_MODE`.
 *  - Does NOT add scopes to `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
 *  - Sub-helpers are injected to keep this file decoupled from concrete
 *    implementations and easy to unit-test in isolation.
 */

import type { RegistryRuntimeBridgeTrace } from './registryRuntimeBridgeDecision';
import type {
  RegistryPilotGateInput,
  RegistryPilotGateResult,
  RegistryPilotScope,
} from './registryPilotGate';
import type {
  RegistryPilotParityPreflightInput,
  RegistryPilotParityPreflightResult,
} from './registryPilotParityPreflight';

export type RegistryPilotBridgeOutcome =
  | 'pilot_disabled'
  | 'pilot_fallback'
  | 'pilot_blocked'
  | 'pilot_applied';

export type RegistryPilotBridgeReason =
  | 'pilot_disabled'
  | 'pilot_invalid_scope'
  | 'pilot_scope_not_allowed'
  | 'pilot_conflict_global_on'
  | 'pilot_invalid_allowlist'
  | 'pilot_snapshot_load_failed'
  | 'pilot_no_runtime_setting'
  | 'pilot_runtime_setting_blocked'
  | 'pilot_registry_not_eligible'
  | 'pilot_blocked_critical_diffs'
  | 'pilot_blocked_warning_threshold'
  | 'pilot_blocked_registry_preview'
  | 'pilot_exception'
  | 'pilot_applied';

export interface RegistryPilotBridgeTrace extends RegistryRuntimeBridgeTrace {
  pilot_mode: true;
  outcome: RegistryPilotBridgeOutcome;
  reason: RegistryPilotBridgeReason | RegistryRuntimeBridgeTrace['reason'];
}

export interface RegistryPilotBridgeScope {
  companyId: string;
  employeeId: string | null | undefined;
  contractId: string | null | undefined;
  targetYear: number;
}

export interface RegistryPilotBridgeDecisionInput {
  globalFlag: boolean;
  pilotMode: boolean;
  scope: RegistryPilotBridgeScope;
  operativeSalaryResolution: unknown;
  /** Snapshot loaded by the bridge (B10E.3). May be `null` if not loaded yet. */
  snapshotResult:
    | null
    | { ok: true; warnings: string[]; snapshot: any }
    | { ok: false; error: string; reason: string; warnings: string[] };
  /** Operative resolution preview used as `operative` input to B10F.2. */
  operativePreview?: any;
  /** Optional warning threshold forwarded to B10F.2. */
  warningThreshold?: number;
  // Injected sub-helpers (so this file stays pure and testable).
  isPilotEnabledForScope: (input: RegistryPilotGateInput) => RegistryPilotGateResult;
  resolveRegistryRuntimeSetting: (input: any) => any;
  buildRegistryPayrollResolution: (input: any) => any;
  runRegistryPilotParityPreflight: (
    input: RegistryPilotParityPreflightInput,
  ) => RegistryPilotParityPreflightResult;
}

export interface RegistryPilotBridgeDecision {
  applyRegistry: boolean;
  trace: RegistryPilotBridgeTrace;
  registrySalaryResolution?: unknown;
  scope?: RegistryPilotScope;
}

function makeFallbackTrace(
  reason: RegistryPilotBridgeReason,
  attempted: boolean,
  outcome: RegistryPilotBridgeOutcome,
  extras: Partial<RegistryPilotBridgeTrace> = {},
): RegistryPilotBridgeTrace {
  return {
    pilot_mode: true,
    attempted,
    applied: false,
    outcome,
    reason,
    ...extras,
  };
}

/**
 * Pure decision builder for the pilot branch.
 * Caller MUST short-circuit before invoking when pilot mode is OFF and
 * the global flag is OFF; this helper still handles the full safety net.
 */
export function buildRegistryPilotBridgeDecision(
  input: RegistryPilotBridgeDecisionInput,
): RegistryPilotBridgeDecision {
  // Conflict / pilot-off short-circuits via the gate (it knows the rules).
  let gate: RegistryPilotGateResult;
  try {
    gate = input.isPilotEnabledForScope({
      companyId: input.scope.companyId,
      employeeId: input.scope.employeeId,
      contractId: input.scope.contractId,
      targetYear: input.scope.targetYear,
      globalRegistryFlag: input.globalFlag,
      pilotMode: input.pilotMode,
    });
  } catch {
    return {
      applyRegistry: false,
      trace: makeFallbackTrace('pilot_exception', true, 'pilot_fallback', {
        blockers: ['pilot_gate_exception'],
      }),
    };
  }

  if (!gate.enabled) {
    if (gate.reason === 'pilot_disabled') {
      return {
        applyRegistry: false,
        trace: {
          pilot_mode: true,
          attempted: false,
          applied: false,
          outcome: 'pilot_disabled',
          reason: 'pilot_disabled',
          blockers: gate.blockers,
        },
      };
    }
    if (gate.reason === 'global_flag_conflict') {
      return {
        applyRegistry: false,
        trace: makeFallbackTrace('pilot_conflict_global_on', true, 'pilot_fallback', {
          blockers: gate.blockers,
        }),
      };
    }
    if (gate.reason === 'invalid_scope') {
      return {
        applyRegistry: false,
        trace: makeFallbackTrace('pilot_invalid_scope', true, 'pilot_fallback', {
          blockers: gate.blockers,
        }),
      };
    }
    if (gate.reason === 'invalid_allowlist') {
      return {
        applyRegistry: false,
        trace: makeFallbackTrace('pilot_invalid_allowlist', true, 'pilot_fallback', {
          blockers: gate.blockers,
        }),
      };
    }
    // 'scope_not_allowed' (default fallthrough)
    return {
      applyRegistry: false,
      trace: makeFallbackTrace('pilot_scope_not_allowed', true, 'pilot_fallback', {
        blockers: gate.blockers,
      }),
    };
  }

  // Pilot is enabled for scope. We are now in the attempted=true path.
  if (!input.snapshotResult) {
    return {
      applyRegistry: false,
      trace: makeFallbackTrace('pilot_snapshot_load_failed', true, 'pilot_fallback', {
        blockers: ['no_snapshot'],
      }),
      scope: gate.scope,
    };
  }
  if (input.snapshotResult.ok !== true) {
    const failed = input.snapshotResult as {
      ok: false;
      error: string;
      reason: string;
      warnings: string[];
    };
    return {
      applyRegistry: false,
      trace: makeFallbackTrace('pilot_snapshot_load_failed', true, 'pilot_fallback', {
        blockers: [`loader_${failed.error}`],
        warnings: failed.reason ? [failed.reason] : undefined,
      }),
      scope: gate.scope,
    };
  }

  const snapshot = (input.snapshotResult as { ok: true; snapshot: any }).snapshot;

  let settingResolverResult: any;
  try {
    settingResolverResult = input.resolveRegistryRuntimeSetting({
      companyId: input.scope.companyId,
      employeeId: input.scope.employeeId,
      contractId: input.scope.contractId,
      settings: snapshot?.runtimeSettings ?? [],
    });
  } catch {
    return {
      applyRegistry: false,
      trace: makeFallbackTrace('pilot_exception', true, 'pilot_fallback', {
        blockers: ['setting_resolver_exception'],
      }),
      scope: gate.scope,
    };
  }

  if (!settingResolverResult || !settingResolverResult.setting) {
    return {
      applyRegistry: false,
      trace: makeFallbackTrace('pilot_no_runtime_setting', true, 'pilot_fallback', {
        blockers: settingResolverResult?.blockers ?? ['no_runtime_setting'],
      }),
      scope: gate.scope,
    };
  }
  if (settingResolverResult.reason !== 'matched') {
    return {
      applyRegistry: false,
      trace: makeFallbackTrace('pilot_runtime_setting_blocked', true, 'pilot_fallback', {
        blockers: settingResolverResult.blockers ?? [],
        setting_id: settingResolverResult.setting.id,
        mapping_id: settingResolverResult.setting.mapping_id,
      }),
      scope: gate.scope,
    };
  }

  const setting = settingResolverResult.setting;
  const mappings: any[] = Array.isArray(snapshot?.mappings) ? snapshot.mappings : [];
  const agreements: any[] = Array.isArray(snapshot?.agreements) ? snapshot.agreements : [];
  const versions: any[] = Array.isArray(snapshot?.versions) ? snapshot.versions : [];
  const sources: any[] = Array.isArray(snapshot?.sources) ? snapshot.sources : [];
  const salaryTables: any[] = Array.isArray(snapshot?.salaryTables) ? snapshot.salaryTables : [];
  const rules: any[] = Array.isArray(snapshot?.rules) ? snapshot.rules : [];

  const mapping = mappings.find((m) => m?.id === setting.mapping_id) ?? null;
  const agreement = mapping
    ? agreements.find((a) => a?.id === mapping.registry_agreement_id) ?? null
    : null;
  const version = mapping
    ? versions.find((v) => v?.id === mapping.registry_version_id) ?? null
    : null;
  const source = agreement
    ? sources.find((s) => s?.agreement_id === agreement.id) ?? null
    : null;
  const salaryRows = agreement
    ? salaryTables.filter((r) => r?.agreement_id === agreement.id)
    : [];
  const ruleRows = agreement
    ? rules.filter((r) => r?.agreement_id === agreement.id)
    : [];

  let builderResult: any;
  try {
    builderResult = input.buildRegistryPayrollResolution({
      setting,
      mapping,
      agreement,
      version,
      source,
      salaryTables: salaryRows,
      rules: ruleRows,
      targetYear: input.scope.targetYear,
    });
  } catch {
    return {
      applyRegistry: false,
      trace: makeFallbackTrace('pilot_exception', true, 'pilot_fallback', {
        blockers: ['builder_exception'],
        setting_id: setting.id,
        mapping_id: setting.mapping_id,
        registry_agreement_id: agreement?.id,
        registry_version_id: version?.id,
      }),
      scope: gate.scope,
    };
  }

  if (!builderResult || builderResult.canBuild !== true || !builderResult.salaryResolution) {
    return {
      applyRegistry: false,
      trace: makeFallbackTrace('pilot_registry_not_eligible', true, 'pilot_fallback', {
        blockers: builderResult?.blockers ?? ['no_builder_result'],
        warnings: builderResult?.warnings?.length ? [...builderResult.warnings] : undefined,
        setting_id: setting.id,
        mapping_id: setting.mapping_id,
        registry_agreement_id: agreement?.id,
        registry_version_id: version?.id,
      }),
      scope: gate.scope,
    };
  }

  // Build a registryPreview-compatible object for B10F.2 input.
  const registryPreview = builderResult.registryPreview ?? {
    canUseForPayroll: true,
    blockers: [],
    warnings: builderResult.warnings ?? [],
    concepts: builderResult.concepts ?? [],
  };

  let preflight: RegistryPilotParityPreflightResult;
  try {
    preflight = input.runRegistryPilotParityPreflight({
      operative: input.operativePreview ?? {
        source: 'operative',
        salaryBaseMonthly:
          (input.operativeSalaryResolution as any)?.salarioBaseConvenio ?? null,
        plusConvenio:
          (input.operativeSalaryResolution as any)?.plusConvenioTabla ?? null,
      },
      registryPreview,
      warningThreshold: input.warningThreshold,
    });
  } catch {
    return {
      applyRegistry: false,
      trace: makeFallbackTrace('pilot_exception', true, 'pilot_fallback', {
        blockers: ['preflight_exception'],
        setting_id: setting.id,
        mapping_id: setting.mapping_id,
        registry_agreement_id: agreement?.id,
        registry_version_id: version?.id,
      }),
      scope: gate.scope,
    };
  }

  const cmpSummary = {
    critical: preflight.summary.critical,
    warnings: preflight.summary.warning,
    info: preflight.summary.info,
  };

  if (!preflight.allowApply) {
    let reason: RegistryPilotBridgeReason = 'pilot_blocked_critical_diffs';
    if (preflight.reason === 'warning_threshold_exceeded') {
      reason = 'pilot_blocked_warning_threshold';
    } else if (preflight.reason === 'registry_preview_blocked') {
      reason = 'pilot_blocked_registry_preview';
    }
    return {
      applyRegistry: false,
      trace: {
        pilot_mode: true,
        attempted: true,
        applied: false,
        outcome: 'pilot_blocked',
        reason,
        blockers: preflight.blockers,
        warnings: preflight.warnings?.length ? [...preflight.warnings] : undefined,
        comparison_summary: cmpSummary,
        setting_id: setting.id,
        mapping_id: setting.mapping_id,
        registry_agreement_id: agreement?.id,
        registry_version_id: version?.id,
      },
      scope: gate.scope,
    };
  }

  // Apply.
  return {
    applyRegistry: true,
    trace: {
      pilot_mode: true,
      attempted: true,
      applied: true,
      outcome: 'pilot_applied',
      reason: 'pilot_applied',
      comparison_summary: cmpSummary,
      warnings: preflight.warnings?.length ? [...preflight.warnings] : undefined,
      setting_id: setting.id,
      mapping_id: setting.mapping_id,
      registry_agreement_id: agreement?.id,
      registry_version_id: version?.id,
    },
    registrySalaryResolution: builderResult.salaryResolution,
    scope: gate.scope,
  };
}
