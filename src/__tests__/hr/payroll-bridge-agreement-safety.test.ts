/**
 * B4.c — Bridge helper (`buildBridgeSafetyContext`) + sourceLayer→origin
 * mapping. Tests the PURE mapping that the bridge uses to forward a
 * defensive safety context to `resolveSalaryFromAgreement`.
 *
 * The full bridge is intentionally NOT exercised end-to-end here: it
 * already has its own integration coverage and is out of scope for B4.c.
 * What we DO verify:
 *   - operative flow keeps origin=operative (no warnings).
 *   - registry metadata_only produces safe-mode block when fed to resolver.
 *   - legacy_ts_fallback with manual salary is allowed with warning.
 *   - unknown without manual salary enters safe mode.
 *   - no DB writes happen.
 */
import { describe, it, expect, vi } from 'vitest';

// Supabase mock — guard against accidental writes from any imported module.
let writes = 0;
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        contains: async () => ({ data: null, error: null }),
      }),
      insert: () => { writes++; return { select: () => ({ single: async () => ({ data: null, error: null }) }) }; },
      update: () => { writes++; return { eq: async () => ({ data: null, error: null }) }; },
      upsert: () => { writes++; return { select: () => ({ single: async () => ({ data: null, error: null }) }) }; },
      delete: () => { writes++; return { eq: async () => ({ data: null, error: null }) }; },
    }),
  },
}));

import {
  buildBridgeSafetyContext,
  mapSourceLayerToOrigin,
  type UnifiedCollectiveAgreement,
} from '@/lib/hr/collectiveAgreementRegistry';
import { resolveSalaryFromAgreement } from '@/engines/erp/hr/agreementSalaryResolver';

const metadataOnlyRegistry: UnifiedCollectiveAgreement = {
  internal_code: 'PAN-PAST-IB',
  official_name: 'Panadería/Pastelería Illes Balears',
  cnae_codes: ['1071'],
  jurisdiction_code: 'ES-IB',
  sourceLayer: 'registry',
  source_quality: 'pending_official_validation',
  data_completeness: 'metadata_only',
  status: 'vigente',
  salary_tables_loaded: false,
  ready_for_payroll: false,
  requires_human_review: true,
  official_submission_blocked: true,
  warnings: [],
};

const legacyAgreement: UnifiedCollectiveAgreement = {
  internal_code: 'LEGACY-AGR',
  official_name: 'Legacy Agreement',
  cnae_codes: [],
  jurisdiction_code: 'ES',
  sourceLayer: 'legacy_static',
  source_quality: 'legacy_static',
  data_completeness: 'metadata_only',
  status: 'pendiente_validacion',
  salary_tables_loaded: false,
  ready_for_payroll: false,
  requires_human_review: true,
  official_submission_blocked: true,
  warnings: ['LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW'],
};

describe('B4.c — mapSourceLayerToOrigin', () => {
  it('maps every layer to its safety origin', () => {
    expect(mapSourceLayerToOrigin('registry')).toBe('registry');
    expect(mapSourceLayerToOrigin('legacy_static')).toBe('legacy_ts_fallback');
    expect(mapSourceLayerToOrigin('operative')).toBe('operative');
    expect(mapSourceLayerToOrigin('unknown')).toBe('unknown');
    expect(mapSourceLayerToOrigin(undefined)).toBe('unknown');
    expect(mapSourceLayerToOrigin(null)).toBe('unknown');
  });
});

describe('B4.c — buildBridgeSafetyContext', () => {
  it('operative layer keeps origin=operative and propagates record', () => {
    const ctx = buildBridgeSafetyContext({
      sourceLayer: 'operative',
      hasManualSalary: true,
      agreement: null,
    });
    expect(ctx.agreementOrigin).toBe('operative');
    expect(ctx.hasManualSalary).toBe(true);
  });

  it('registry layer is mapped to origin=registry', () => {
    const ctx = buildBridgeSafetyContext({ agreement: metadataOnlyRegistry });
    expect(ctx.agreementOrigin).toBe('registry');
    expect(ctx.agreementRecord).toBe(metadataOnlyRegistry);
  });

  it('no agreement and no layer → unknown', () => {
    const ctx = buildBridgeSafetyContext({});
    expect(ctx.agreementOrigin).toBe('unknown');
    expect(ctx.hasManualSalary).toBe(false);
  });
});

describe('B4.c — bridge ↔ resolver integration via safetyContext', () => {
  it('operative flow: no warnings, importes intactos', () => {
    const r = resolveSalaryFromAgreement(
      2000, null, 'OPERATIVE-AGR', 'G1', 2026, undefined,
      buildBridgeSafetyContext({ sourceLayer: 'operative', hasManualSalary: true }),
    );
    expect(r.safeMode).toBe(false);
    expect(r.agreementSafety?.allowed).toBe(true);
    expect(r.agreementSafety?.warnings).toEqual([]);
    expect(r.salarioBaseConvenio).toBe(2000);
  });

  it('registry metadata_only → safe mode', () => {
    const r = resolveSalaryFromAgreement(
      2000, null, 'PAN-PAST-IB', 'G1', 2026, undefined,
      buildBridgeSafetyContext({
        agreement: metadataOnlyRegistry,
        hasManualSalary: false,
      }),
    );
    expect(r.safeMode).toBe(true);
    expect(r.agreementResolutionStatus).toBe('manual_review_required');
    expect(r.agreementSafety?.allowed).toBe(false);
    expect(r.agreementSafety?.canComputeBaseSalary).toBe(false);
  });

  it('legacy_ts_fallback con salario manual → permitido con warning', () => {
    const r = resolveSalaryFromAgreement(
      1800, null, 'LEGACY-AGR', 'G1', 2026, undefined,
      buildBridgeSafetyContext({
        agreement: legacyAgreement,
        hasManualSalary: true,
      }),
    );
    expect(r.safeMode).toBe(false);
    expect(r.salarioBaseConvenio).toBe(1800);
    expect(r.agreementSafety?.warnings).toContain('LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW');
    expect(r.agreementSafety?.canComputePlusConvenio).toBe(false);
  });

  it('unknown sin salario manual → safe mode', () => {
    const r = resolveSalaryFromAgreement(
      0, null, '', '', 2026, undefined,
      buildBridgeSafetyContext({ hasManualSalary: false }),
    );
    expect(r.safeMode).toBe(true);
    expect(r.agreementSafety?.allowed).toBe(false);
  });

  it('no se han producido escrituras en DB en todo el suite', () => {
    expect(writes).toBe(0);
  });
});
