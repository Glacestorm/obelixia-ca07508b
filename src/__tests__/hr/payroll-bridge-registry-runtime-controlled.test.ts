/**
 * B10E.4 — Controlled tests for the pure decision helper.
 *
 * These tests bypass the hardcoded flag by directly exercising the pure
 * helper `buildRegistryRuntimeBridgeDecision`, which is invoked by the
 * bridge inside the flag-guarded block. The flag itself is NEVER mutated.
 */
import { describe, it, expect } from 'vitest';
import {
  buildRegistryRuntimeBridgeDecision,
  buildExceptionFallbackTrace,
  attachRegistryRuntimeTrace,
} from '@/engines/erp/hr/registryRuntimeBridgeDecision';

const okSnapshot = { ok: true as const, warnings: [] };
const okSetting = {
  setting: { id: 'set-1', mapping_id: 'map-1' },
  reason: 'matched',
  blockers: [],
};
const okBuilder = {
  canBuild: true,
  reason: 'built',
  blockers: [],
  warnings: [],
  salaryResolution: { source: 'registry', salarioBaseConvenio: 1700 },
};
const cleanComparator = {
  summary: { critical: 0, warning: 0, info: 0 },
  hasCriticalDiffs: false,
};

describe('B10E.4 — buildRegistryRuntimeBridgeDecision (pure)', () => {
  it('happy path: applied_ok when setting current + builder ok + 0 critical', () => {
    const d = buildRegistryRuntimeBridgeDecision({
      operativeSalaryResolution: { salarioBaseConvenio: 1500 },
      snapshotResult: okSnapshot,
      settingResolverResult: okSetting,
      builderResult: okBuilder,
      comparatorReport: cleanComparator,
      registryAgreementId: 'ag-1',
      registryVersionId: 'v-1',
    });
    expect(d.applyRegistry).toBe(true);
    expect(d.trace.attempted).toBe(true);
    expect(d.trace.applied).toBe(true);
    expect(d.trace.reason).toBe('applied_ok');
    expect(d.trace.setting_id).toBe('set-1');
    expect(d.trace.mapping_id).toBe('map-1');
    expect(d.trace.registry_agreement_id).toBe('ag-1');
    expect(d.trace.registry_version_id).toBe('v-1');
    expect(d.trace.comparison_summary).toEqual({ critical: 0, warnings: 0, info: 0 });
    expect(d.registrySalaryResolution).toEqual(okBuilder.salaryResolution);
  });

  it('no runtime setting → fallback no_runtime_setting', () => {
    const d = buildRegistryRuntimeBridgeDecision({
      operativeSalaryResolution: {},
      snapshotResult: okSnapshot,
      settingResolverResult: { setting: null, reason: 'no_runtime_setting', blockers: ['no_runtime_setting'] },
      builderResult: null,
      comparatorReport: null,
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.reason).toBe('no_runtime_setting');
    expect(d.trace.applied).toBe(false);
    expect(d.trace.blockers).toContain('no_runtime_setting');
  });

  it('runtime setting blocked → reason runtime_setting_blocked', () => {
    const d = buildRegistryRuntimeBridgeDecision({
      operativeSalaryResolution: {},
      snapshotResult: okSnapshot,
      settingResolverResult: {
        setting: { id: 'set-2', mapping_id: 'map-2' },
        reason: 'setting_not_current',
        blockers: ['setting_not_current'],
      },
      builderResult: null,
      comparatorReport: null,
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.reason).toBe('runtime_setting_blocked');
    expect(d.trace.setting_id).toBe('set-2');
    expect(d.trace.blockers).toContain('setting_not_current');
  });

  it('loader error → snapshot_load_failed', () => {
    const d = buildRegistryRuntimeBridgeDecision({
      operativeSalaryResolution: {},
      snapshotResult: { ok: false, error: 'mapping_query_failed', reason: 'db down', warnings: [] },
      settingResolverResult: null,
      builderResult: null,
      comparatorReport: null,
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.reason).toBe('snapshot_load_failed');
    expect(d.trace.blockers).toContain('loader_mapping_query_failed');
    expect(d.trace.warnings).toContain('db down');
  });

  it('null snapshot → snapshot_load_failed (no_snapshot)', () => {
    const d = buildRegistryRuntimeBridgeDecision({
      operativeSalaryResolution: {},
      snapshotResult: null,
      settingResolverResult: null,
      builderResult: null,
      comparatorReport: null,
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.reason).toBe('snapshot_load_failed');
    expect(d.trace.blockers).toContain('no_snapshot');
  });

  it('builder blockers → registry_not_eligible', () => {
    const d = buildRegistryRuntimeBridgeDecision({
      operativeSalaryResolution: {},
      snapshotResult: okSnapshot,
      settingResolverResult: okSetting,
      builderResult: {
        canBuild: false,
        reason: 'requires_human_review',
        blockers: ['requires_human_review'],
        warnings: ['salary_table_low_confidence_discarded'],
      },
      comparatorReport: null,
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.reason).toBe('registry_not_eligible');
    expect(d.trace.blockers).toContain('requires_human_review');
    expect(d.trace.warnings).toContain('salary_table_low_confidence_discarded');
  });

  it('critical diff → critical_diff_fallback', () => {
    const d = buildRegistryRuntimeBridgeDecision({
      operativeSalaryResolution: {},
      snapshotResult: okSnapshot,
      settingResolverResult: okSetting,
      builderResult: okBuilder,
      comparatorReport: { summary: { critical: 2, warning: 1, info: 0 }, hasCriticalDiffs: true },
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.reason).toBe('critical_diff_fallback');
    expect(d.trace.applied).toBe(false);
    expect(d.trace.comparison_summary).toEqual({ critical: 2, warnings: 1, info: 0 });
  });

  it('warnings only → applied_ok with warnings preserved', () => {
    const d = buildRegistryRuntimeBridgeDecision({
      operativeSalaryResolution: {},
      snapshotResult: okSnapshot,
      settingResolverResult: okSetting,
      builderResult: {
        ...okBuilder,
        warnings: ['fallback_salary_row_match'],
      },
      comparatorReport: { summary: { critical: 0, warning: 3, info: 1 }, hasCriticalDiffs: false },
    });
    expect(d.applyRegistry).toBe(true);
    expect(d.trace.reason).toBe('applied_ok');
    expect(d.trace.warnings).toContain('fallback_salary_row_match');
    expect(d.trace.comparison_summary).toEqual({ critical: 0, warnings: 3, info: 1 });
  });

  it('missing comparator report when builder canBuild → registry_not_eligible', () => {
    const d = buildRegistryRuntimeBridgeDecision({
      operativeSalaryResolution: {},
      snapshotResult: okSnapshot,
      settingResolverResult: okSetting,
      builderResult: okBuilder,
      comparatorReport: null,
    });
    expect(d.applyRegistry).toBe(false);
    expect(d.trace.reason).toBe('registry_not_eligible');
    expect(d.trace.blockers).toContain('no_comparator_report');
  });

  it('exceptions → buildExceptionFallbackTrace returns safe trace', () => {
    const t = buildExceptionFallbackTrace();
    expect(t.attempted).toBe(true);
    expect(t.applied).toBe(false);
    expect(t.reason).toBe('snapshot_load_failed');
    expect(t.blockers).toContain('exception');
  });

  it('helper never throws on absurd inputs', () => {
    expect(() =>
      buildRegistryRuntimeBridgeDecision({
        operativeSalaryResolution: undefined as any,
        snapshotResult: undefined as any,
        settingResolverResult: undefined as any,
        builderResult: undefined as any,
        comparatorReport: undefined as any,
      }),
    ).not.toThrow();
  });

  it('attached trace preserves enumerable JSON parity', () => {
    const sr: any = { a: 1, b: { c: 2 } };
    const baseline = JSON.stringify(sr);
    attachRegistryRuntimeTrace(sr, { attempted: true, applied: true, reason: 'applied_ok' });
    expect(JSON.stringify(sr)).toBe(baseline);
  });
});
