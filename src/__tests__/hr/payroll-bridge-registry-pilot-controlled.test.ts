/**
 * B10F.3 — Controlled scenarios for the pure pilot bridge decision helper.
 *
 * Uses dependency injection (no flag mutation in source files). Verifies:
 *  - allow-list empty → pilot_scope_not_allowed.
 *  - allow-list match + missing runtime_setting → pilot_no_runtime_setting.
 *  - allow-list match + critical diff → pilot_blocked_critical_diffs.
 *  - allow-list match + builder canBuild=false → pilot_registry_not_eligible.
 *  - allow-list match + preflight OK → applied (pilot_applied).
 *  - global=true + pilot=true → pilot_conflict_global_on.
 *  - loader exception → fallback (pilot_snapshot_load_failed via ok=false).
 *  - rollback simulated by no current runtime_setting → fallback.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  isPilotEnabledForScope,
  type RegistryPilotScope,
} from '@/engines/erp/hr/registryPilotGate';
import { runRegistryPilotParityPreflight } from '@/engines/erp/hr/registryPilotParityPreflight';
import { buildRegistryPilotBridgeDecision } from '@/engines/erp/hr/registryPilotBridgeDecision';

const SCOPE = { companyId: 'c1', employeeId: 'e1', contractId: 'k1', targetYear: 2026 };
const SCOPE_ENTRY: RegistryPilotScope = {
  company_id: 'c1',
  employee_id: 'e1',
  contract_id: 'k1',
  target_year: 2026,
  pilot_started_at: '2026-04-01',
  owner: 'qa',
  rollback_contact: 'qa@example.com',
};

const OK_SETTING = {
  setting: { id: 's1', mapping_id: 'm1' },
  reason: 'matched',
  blockers: [],
};

const OK_BUILDER = (extra: Partial<any> = {}) => ({
  canBuild: true,
  reason: 'built',
  blockers: [],
  warnings: [],
  salaryResolution: { salarioBaseConvenio: 1600, plusConvenioTabla: 110 },
  registryPreview: {
    canUseForPayroll: true,
    blockers: [],
    warnings: [],
    concepts: [],
  },
  ...extra,
});

function injectGate(allowlist: readonly RegistryPilotScope[] = []) {
  return (input: any) =>
    isPilotEnabledForScope({ ...input, allowlist });
}

const SNAPSHOT_OK = {
  ok: true as const,
  warnings: [],
  snapshot: {
    runtimeSettings: [],
    mappings: [{ id: 'm1', registry_agreement_id: 'a1', registry_version_id: 'v1' }],
    agreements: [{ id: 'a1' }],
    versions: [{ id: 'v1' }],
    sources: [{ agreement_id: 'a1' }],
    salaryTables: [{ agreement_id: 'a1' }],
    rules: [{ agreement_id: 'a1' }],
  },
};

describe('B10F.3 — pilot helper controlled scenarios', () => {
  it('pilot=true + allow-list empty → pilot_scope_not_allowed', () => {
    const d = buildRegistryPilotBridgeDecision({
      globalFlag: false,
      pilotMode: true,
      scope: SCOPE,
      operativeSalaryResolution: { salarioBaseConvenio: 1500, plusConvenioTabla: 100 },
      snapshotResult: null,
      isPilotEnabledForScope: injectGate([]),
      resolveRegistryRuntimeSetting: vi.fn(),
      buildRegistryPayrollResolution: vi.fn(),
      runRegistryPilotParityPreflight: vi.fn(),
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.outcome).toBe('pilot_fallback');
    expect(d.trace.reason).toBe('pilot_scope_not_allowed');
    expect(d.trace.attempted).toBe(true);
  });

  it('pilot=true + scope allowed + missing runtime_setting → pilot_no_runtime_setting', () => {
    const d = buildRegistryPilotBridgeDecision({
      globalFlag: false,
      pilotMode: true,
      scope: SCOPE,
      operativeSalaryResolution: { salarioBaseConvenio: 1500, plusConvenioTabla: 100 },
      snapshotResult: SNAPSHOT_OK,
      isPilotEnabledForScope: injectGate([SCOPE_ENTRY]),
      resolveRegistryRuntimeSetting: () => ({
        setting: null,
        reason: 'no_setting',
        blockers: ['no_runtime_setting'],
      }),
      buildRegistryPayrollResolution: vi.fn(),
      runRegistryPilotParityPreflight: vi.fn(),
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.outcome).toBe('pilot_fallback');
    expect(d.trace.reason).toBe('pilot_no_runtime_setting');
  });

  it('pilot=true + scope allowed + critical diff → pilot_blocked_critical_diffs', () => {
    const d = buildRegistryPilotBridgeDecision({
      globalFlag: false,
      pilotMode: true,
      scope: SCOPE,
      operativeSalaryResolution: { salarioBaseConvenio: 1500, plusConvenioTabla: 100 },
      snapshotResult: SNAPSHOT_OK,
      isPilotEnabledForScope: injectGate([SCOPE_ENTRY]),
      resolveRegistryRuntimeSetting: () => OK_SETTING,
      buildRegistryPayrollResolution: () => OK_BUILDER(),
      runRegistryPilotParityPreflight: () => ({
        allowApply: false,
        reason: 'critical_diffs',
        blockers: ['critical_diffs'],
        warnings: [],
        comparison: {} as any,
        summary: { critical: 2, warning: 0, info: 0 },
      }),
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.outcome).toBe('pilot_blocked');
    expect(d.trace.reason).toBe('pilot_blocked_critical_diffs');
    expect(d.trace.comparison_summary).toEqual({ critical: 2, warnings: 0, info: 0 });
  });

  it('pilot=true + scope allowed + registry not ready → pilot_registry_not_eligible', () => {
    const d = buildRegistryPilotBridgeDecision({
      globalFlag: false,
      pilotMode: true,
      scope: SCOPE,
      operativeSalaryResolution: { salarioBaseConvenio: 1500, plusConvenioTabla: 100 },
      snapshotResult: SNAPSHOT_OK,
      isPilotEnabledForScope: injectGate([SCOPE_ENTRY]),
      resolveRegistryRuntimeSetting: () => OK_SETTING,
      buildRegistryPayrollResolution: () => ({
        canBuild: false,
        reason: 'not_ready',
        blockers: ['registry_not_ready_for_payroll'],
        warnings: [],
      }),
      runRegistryPilotParityPreflight: vi.fn(),
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.outcome).toBe('pilot_fallback');
    expect(d.trace.reason).toBe('pilot_registry_not_eligible');
  });

  it('pilot=true + scope allowed + preflight OK → pilot_applied', () => {
    const d = buildRegistryPilotBridgeDecision({
      globalFlag: false,
      pilotMode: true,
      scope: SCOPE,
      operativeSalaryResolution: { salarioBaseConvenio: 1500, plusConvenioTabla: 100 },
      snapshotResult: SNAPSHOT_OK,
      isPilotEnabledForScope: injectGate([SCOPE_ENTRY]),
      resolveRegistryRuntimeSetting: () => OK_SETTING,
      buildRegistryPayrollResolution: () => OK_BUILDER(),
      runRegistryPilotParityPreflight: () => ({
        allowApply: true,
        reason: 'parity_ok',
        blockers: [],
        warnings: [],
        comparison: {} as any,
        summary: { critical: 0, warning: 0, info: 0 },
      }),
    });
    expect(d.applyRegistry).toBe(true);
    expect(d.trace.outcome).toBe('pilot_applied');
    expect(d.trace.reason).toBe('pilot_applied');
    expect(d.trace.applied).toBe(true);
    expect(d.trace.setting_id).toBe('s1');
    expect(d.trace.mapping_id).toBe('m1');
    expect(d.trace.registry_agreement_id).toBe('a1');
    expect(d.trace.registry_version_id).toBe('v1');
    expect((d.registrySalaryResolution as any)?.salarioBaseConvenio).toBe(1600);
  });

  it('global=true + pilot=true → pilot_conflict_global_on', () => {
    const d = buildRegistryPilotBridgeDecision({
      globalFlag: true,
      pilotMode: true,
      scope: SCOPE,
      operativeSalaryResolution: { salarioBaseConvenio: 1500, plusConvenioTabla: 100 },
      snapshotResult: null,
      isPilotEnabledForScope: injectGate([SCOPE_ENTRY]),
      resolveRegistryRuntimeSetting: vi.fn(),
      buildRegistryPayrollResolution: vi.fn(),
      runRegistryPilotParityPreflight: vi.fn(),
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.outcome).toBe('pilot_fallback');
    expect(d.trace.reason).toBe('pilot_conflict_global_on');
  });

  it('loader exception (snapshotResult.ok=false) → pilot_snapshot_load_failed (no throw)', () => {
    const d = buildRegistryPilotBridgeDecision({
      globalFlag: false,
      pilotMode: true,
      scope: SCOPE,
      operativeSalaryResolution: { salarioBaseConvenio: 1500, plusConvenioTabla: 100 },
      snapshotResult: {
        ok: false,
        error: 'unknown_error',
        reason: 'loader_exception',
        warnings: [],
      },
      isPilotEnabledForScope: injectGate([SCOPE_ENTRY]),
      resolveRegistryRuntimeSetting: vi.fn(),
      buildRegistryPayrollResolution: vi.fn(),
      runRegistryPilotParityPreflight: vi.fn(),
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.outcome).toBe('pilot_fallback');
    expect(d.trace.reason).toBe('pilot_snapshot_load_failed');
  });

  it('rollback simulated by missing setting → pilot_no_runtime_setting', () => {
    const d = buildRegistryPilotBridgeDecision({
      globalFlag: false,
      pilotMode: true,
      scope: SCOPE,
      operativeSalaryResolution: { salarioBaseConvenio: 1500, plusConvenioTabla: 100 },
      snapshotResult: SNAPSHOT_OK,
      isPilotEnabledForScope: injectGate([SCOPE_ENTRY]),
      resolveRegistryRuntimeSetting: () => ({
        setting: null,
        reason: 'rolled_back',
        blockers: ['no_current_runtime_setting'],
      }),
      buildRegistryPayrollResolution: vi.fn(),
      runRegistryPilotParityPreflight: vi.fn(),
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.reason).toBe('pilot_no_runtime_setting');
  });

  it('preflight runtime exception → pilot_exception fallback (no throw)', () => {
    const d = buildRegistryPilotBridgeDecision({
      globalFlag: false,
      pilotMode: true,
      scope: SCOPE,
      operativeSalaryResolution: { salarioBaseConvenio: 1500, plusConvenioTabla: 100 },
      snapshotResult: SNAPSHOT_OK,
      isPilotEnabledForScope: injectGate([SCOPE_ENTRY]),
      resolveRegistryRuntimeSetting: () => OK_SETTING,
      buildRegistryPayrollResolution: () => OK_BUILDER(),
      runRegistryPilotParityPreflight: () => {
        throw new Error('boom');
      },
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.outcome).toBe('pilot_fallback');
    expect(d.trace.reason).toBe('pilot_exception');
  });

  it('integration with real B10F.2 preflight: blocked path when registry preview has blockers', () => {
    const d = buildRegistryPilotBridgeDecision({
      globalFlag: false,
      pilotMode: true,
      scope: SCOPE,
      operativeSalaryResolution: { salarioBaseConvenio: 1500, plusConvenioTabla: 100 },
      snapshotResult: SNAPSHOT_OK,
      operativePreview: {
        source: 'operative',
        salaryBaseMonthly: 1500,
        plusConvenio: 100,
      },
      isPilotEnabledForScope: injectGate([SCOPE_ENTRY]),
      resolveRegistryRuntimeSetting: () => OK_SETTING,
      buildRegistryPayrollResolution: () =>
        OK_BUILDER({
          registryPreview: {
            canUseForPayroll: false,
            blockers: ['registry_not_ready'],
            warnings: [],
            concepts: [],
          },
        }),
      runRegistryPilotParityPreflight,
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.outcome).toBe('pilot_blocked');
    expect(d.trace.reason).toBe('pilot_blocked_registry_preview');
  });
});
