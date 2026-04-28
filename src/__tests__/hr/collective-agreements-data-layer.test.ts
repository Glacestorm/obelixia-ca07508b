/**
 * B3 — Data layer tests (DB-first + legacy fallback)
 *
 * Supabase is mocked. The mock simulates the registry seeded by B2:
 * 4 Baleares reinforced agreements (COM-GEN-IB, PAN-PAST-IB, HOST-IB,
 * IND-ALIM-IB) plus 21 legacy entries — but ONLY the Baleares ones are
 * exposed by the mocked registry. Anything else falls back to the legacy
 * TS catalog, exactly as B3 expects.
 *
 * Every test asserts the safety contract (no payroll, no writes).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Supabase mock — must be declared BEFORE importing the module
// ============================================================

type Row = {
  id: string;
  internal_code: string;
  agreement_code: string | null;
  official_name: string;
  short_name: string | null;
  cnae_codes: string[];
  jurisdiction_code: string;
  province_code: string | null;
  autonomous_region: string | null;
  sector: string | null;
  status: string;
  source_quality: string;
  data_completeness: string;
  salary_tables_loaded: boolean;
  ready_for_payroll: boolean;
  requires_human_review: boolean;
  official_submission_blocked: boolean;
  notes: string | null;
};

const REGISTRY_ROWS: Row[] = [
  {
    id: 'uuid-com-gen-ib',
    internal_code: 'COM-GEN-IB',
    agreement_code: null,
    official_name: 'Convenio Colectivo de Comercio en General de las Illes Balears',
    short_name: 'Comercio General Illes Balears',
    cnae_codes: ['47'],
    jurisdiction_code: 'ES-IB',
    province_code: 'IB',
    autonomous_region: 'Illes Balears',
    sector: 'Comercio',
    status: 'pendiente_validacion',
    source_quality: 'pending_official_validation',
    data_completeness: 'metadata_only',
    salary_tables_loaded: false,
    ready_for_payroll: false,
    requires_human_review: true,
    official_submission_blocked: true,
    notes: 'B2 seed',
  },
  {
    id: 'uuid-pan-past-ib',
    internal_code: 'PAN-PAST-IB',
    agreement_code: null,
    official_name: 'Convenio Colectivo de Industrias de Panadería y Pastelería de las Illes Balears',
    short_name: 'Panadería y Pastelería Illes Balears',
    cnae_codes: ['1071', '1072', '4724'],
    jurisdiction_code: 'ES-IB',
    province_code: 'IB',
    autonomous_region: 'Illes Balears',
    sector: 'Panadería y Pastelería',
    status: 'pendiente_validacion',
    source_quality: 'pending_official_validation',
    data_completeness: 'metadata_only',
    salary_tables_loaded: false,
    ready_for_payroll: false,
    requires_human_review: true,
    official_submission_blocked: true,
    notes: 'B2 seed',
  },
  {
    id: 'uuid-host-ib',
    internal_code: 'HOST-IB',
    agreement_code: null,
    official_name: 'Convenio Colectivo de Hostelería de las Illes Balears',
    short_name: 'Hostelería Illes Balears',
    cnae_codes: ['55', '56'],
    jurisdiction_code: 'ES-IB',
    province_code: 'IB',
    autonomous_region: 'Illes Balears',
    sector: 'Hostelería',
    status: 'pendiente_validacion',
    source_quality: 'pending_official_validation',
    data_completeness: 'metadata_only',
    salary_tables_loaded: false,
    ready_for_payroll: false,
    requires_human_review: true,
    official_submission_blocked: true,
    notes: 'B2 seed',
  },
  {
    id: 'uuid-ind-alim-ib',
    internal_code: 'IND-ALIM-IB',
    agreement_code: null,
    official_name: 'Convenio Colectivo de Industria Alimentaria de las Illes Balears',
    short_name: 'Industria Alimentaria Illes Balears',
    cnae_codes: ['10'],
    jurisdiction_code: 'ES-IB',
    province_code: 'IB',
    autonomous_region: 'Illes Balears',
    sector: 'Industria alimentaria',
    status: 'pendiente_validacion',
    source_quality: 'pending_official_validation',
    data_completeness: 'metadata_only',
    salary_tables_loaded: false,
    ready_for_payroll: false,
    requires_human_review: true,
    official_submission_blocked: true,
    notes: 'B2 seed',
  },
];

let writeAttempts = 0;

function makeChain(table: string) {
  if (table !== 'erp_hr_collective_agreements_registry') {
    // Any other table is unsupported in this test scope.
    return {
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        contains: async () => ({ data: [], error: null }),
      }),
    };
  }

  return {
    select: () => ({
      eq: (_col: string, val: string) => ({
        maybeSingle: async () => {
          const r = REGISTRY_ROWS.find(x => x.internal_code === val) ?? null;
          return { data: r, error: null };
        },
      }),
      contains: async (_col: string, vals: string[]) => {
        const target = vals[0];
        const data = REGISTRY_ROWS.filter(r => r.cnae_codes.includes(target));
        return { data, error: null };
      },
    }),
    insert: () => {
      writeAttempts += 1;
      return { error: new Error('writes are forbidden in B3') };
    },
    update: () => {
      writeAttempts += 1;
      return { error: new Error('writes are forbidden in B3') };
    },
    delete: () => {
      writeAttempts += 1;
      return { error: new Error('writes are forbidden in B3') };
    },
  };
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => makeChain(table),
  },
}));

// ============================================================
// Imports (after mock)
// ============================================================

import {
  getCollectiveAgreementByCode,
  getCollectiveAgreementsByCnae,
  rankCollectiveAgreementsForActivity,
  canUseAgreementForPayroll,
} from '@/lib/hr/collectiveAgreementRegistry';

beforeEach(() => {
  writeAttempts = 0;
});

// ============================================================
// 1. By internal code — DB-first + fallback
// ============================================================

describe('B3 — getCollectiveAgreementByCode', () => {
  it('1. returns COM-GEN-IB from registry (sourceLayer=registry)', async () => {
    const a = await getCollectiveAgreementByCode('COM-GEN-IB');
    expect(a).not.toBeNull();
    expect(a!.sourceLayer).toBe('registry');
    expect(a!.internal_code).toBe('COM-GEN-IB');
    expect(a!.id).toBe('uuid-com-gen-ib');
  });

  it('2. PAN-PAST-IB comes back with ready_for_payroll=false', async () => {
    const a = await getCollectiveAgreementByCode('PAN-PAST-IB');
    expect(a).not.toBeNull();
    expect(a!.ready_for_payroll).toBe(false);
    expect(a!.requires_human_review).toBe(true);
    expect(a!.official_submission_blocked).toBe(true);
    expect(a!.salary_tables_loaded).toBe(false);
    expect(a!.data_completeness).toBe('metadata_only');
  });

  it('4. legacy-only code (CONST-GEN) falls back to TS with safe defaults', async () => {
    const a = await getCollectiveAgreementByCode('CONST-GEN');
    expect(a).not.toBeNull();
    expect(a!.sourceLayer).toBe('legacy_static');
    expect(a!.ready_for_payroll).toBe(false);
    expect(a!.requires_human_review).toBe(true);
    expect(a!.official_submission_blocked).toBe(true);
    expect(a!.salary_tables_loaded).toBe(false);
    expect(a!.warnings).toContain('LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW');
    expect(a!.warnings).toContain('METADATA_ONLY_NOT_PAYROLL_READY');
  });

  it('returns null for unknown code', async () => {
    const a = await getCollectiveAgreementByCode('DOES-NOT-EXIST');
    expect(a).toBeNull();
  });
});

// ============================================================
// 2. canUseAgreementForPayroll
// ============================================================

describe('B3 — canUseAgreementForPayroll', () => {
  it('3. PAN-PAST-IB is NOT allowed for payroll', async () => {
    const a = await getCollectiveAgreementByCode('PAN-PAST-IB');
    const guard = canUseAgreementForPayroll(a!);
    expect(guard.allowed).toBe(false);
    expect(guard.requiredActions?.length ?? 0).toBeGreaterThan(0);
  });

  it('13. metadata_only agreement is NOT allowed', async () => {
    const a = await getCollectiveAgreementByCode('COM-GEN-IB');
    expect(canUseAgreementForPayroll(a!).allowed).toBe(false);
  });

  it('12. fully validated agreement IS allowed', () => {
    const guard = canUseAgreementForPayroll({
      internal_code: 'TEST-VALID',
      sourceLayer: 'registry',
      ready_for_payroll: true,
      salary_tables_loaded: true,
      requires_human_review: false,
      official_submission_blocked: false,
      data_completeness: 'human_validated',
      source_quality: 'official',
    });
    expect(guard.allowed).toBe(true);
    expect(guard.requiredActions).toBeUndefined();
  });

  it('legacy_static layer always returns allowed=false even if other flags lie', () => {
    const guard = canUseAgreementForPayroll({
      internal_code: 'LEGACY-FAKE',
      sourceLayer: 'legacy_static',
      ready_for_payroll: true,
      salary_tables_loaded: true,
      requires_human_review: false,
      official_submission_blocked: false,
      data_completeness: 'human_validated',
      source_quality: 'official',
    });
    expect(guard.allowed).toBe(false);
    expect(guard.requiredActions?.[0]).toMatch(/Master Registry/i);
  });
});

// ============================================================
// 3. Baleares ranking
// ============================================================

describe('B3 — rankCollectiveAgreementsForActivity (Baleares)', () => {
  it('5. CNAE 1071 ES-IB → PAN-PAST-IB first', () => {
    const r = rankCollectiveAgreementsForActivity({ cnae: '1071', jurisdictionCode: 'ES-IB' });
    expect(r[0].internal_code).toBe('PAN-PAST-IB');
    expect(r.map(x => x.internal_code)).not.toContain('COM-GEN-IB');
  });

  it('6. CNAE 4724 ES-IB → PAN-PAST-IB + COM-GEN-IB with human selection warning', () => {
    const r = rankCollectiveAgreementsForActivity({ cnae: '4724', jurisdictionCode: 'ES-IB' });
    const codes = r.map(x => x.internal_code);
    expect(codes).toContain('PAN-PAST-IB');
    expect(codes).toContain('COM-GEN-IB');
    const allWarnings = r.flatMap(x => x.warnings);
    expect(allWarnings).toContain('MULTIPLE_CANDIDATES_HUMAN_SELECTION_REQUIRED');
  });

  it('7. CNAE 47 ES-IB → COM-GEN-IB', () => {
    const r = rankCollectiveAgreementsForActivity({ cnae: '47', jurisdictionCode: 'ES-IB' });
    expect(r.map(x => x.internal_code)).toContain('COM-GEN-IB');
  });

  it('8. CNAE 56 ES-IB → HOST-IB', () => {
    const r = rankCollectiveAgreementsForActivity({ cnae: '56', jurisdictionCode: 'ES-IB' });
    expect(r.map(x => x.internal_code)).toContain('HOST-IB');
  });

  it('9. CNAE 10 ES-IB → IND-ALIM-IB', () => {
    const r = rankCollectiveAgreementsForActivity({ cnae: '10', jurisdictionCode: 'ES-IB' });
    expect(r.map(x => x.internal_code)).toContain('IND-ALIM-IB');
  });

  it('10. hasBakeryWorkshop=true under CNAE 47 → PAN-PAST-IB before COM-GEN-IB', () => {
    const r = rankCollectiveAgreementsForActivity({
      cnae: '47',
      jurisdictionCode: 'ES-IB',
      hasBakeryWorkshop: true,
    });
    const codes = r.map(x => x.internal_code);
    expect(codes.indexOf('PAN-PAST-IB')).toBeLessThan(codes.indexOf('COM-GEN-IB'));
    const allWarnings = r.flatMap(x => x.warnings);
    expect(allWarnings).toContain('BAKERY_WORKSHOP_REVIEW_REQUIRED');
  });

  it('11. hasOnPremiseConsumption=true → HOST-IB candidate', () => {
    const r = rankCollectiveAgreementsForActivity({
      cnae: '00', // unknown but consumption flag true
      jurisdictionCode: 'ES-IB',
      hasOnPremiseConsumption: true,
    });
    expect(r.map(x => x.internal_code)).toContain('HOST-IB');
  });
});

// ============================================================
// 4. By CNAE (DB + warnings)
// ============================================================

describe('B3 — getCollectiveAgreementsByCnae', () => {
  it('returns registry hits for CNAE 47 in ES-IB', async () => {
    const r = await getCollectiveAgreementsByCnae('47', 'ES-IB');
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r[0].sourceLayer).toBe('registry');
    expect(r[0].internal_code).toBe('COM-GEN-IB');
  });

  it('falls back to legacy TS when nothing matches in registry', async () => {
    // CNAE 80 (security) — not in our 4 mocked Baleares rows
    const r = await getCollectiveAgreementsByCnae('80');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].sourceLayer).toBe('legacy_static');
    expect(r[0].ready_for_payroll).toBe(false);
  });
});

// ============================================================
// 5. Read-only invariant
// ============================================================

describe('B3 — read-only invariant', () => {
  it('14. data layer never writes to DB', async () => {
    await getCollectiveAgreementByCode('COM-GEN-IB');
    await getCollectiveAgreementByCode('CONST-GEN');
    await getCollectiveAgreementsByCnae('47', 'ES-IB');
    await getCollectiveAgreementsByCnae('80');
    rankCollectiveAgreementsForActivity({ cnae: '1071', jurisdictionCode: 'ES-IB' });
    expect(writeAttempts).toBe(0);
  });
});

// ============================================================
// 6. B4.c — Safety attached automatically
// ============================================================

describe('B4.c — safety decision attached to data-layer results', () => {
  it('PAN-PAST-IB metadata_only has safety.allowed=false', async () => {
    const r = await getCollectiveAgreementByCode('PAN-PAST-IB');
    expect(r).not.toBeNull();
    expect(r?.sourceLayer).toBe('registry');
    expect(r?.safety).toBeDefined();
    expect(r?.safety?.allowed).toBe(false);
    expect(r?.safety?.canComputeBaseSalary).toBe(false);
    expect(r?.safety?.canComputePlusConvenio).toBe(false);
    // Block reason should belong to the registry priority list
    expect(r?.safety?.blockReason).toBeDefined();
    expect(r?.safety?.missing.length).toBeGreaterThan(0);
  });

  it('legacy TS fallback exposes safety with LEGACY warning and no compute capabilities', async () => {
    const r = await getCollectiveAgreementByCode('CONST-GEN');
    expect(r).not.toBeNull();
    expect(r?.sourceLayer).toBe('legacy_static');
    expect(r?.safety).toBeDefined();
    expect(r?.safety?.warnings).toContain('LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW');
    expect(r?.safety?.canComputeBaseSalary).toBe(false);
    expect(r?.safety?.canComputePlusConvenio).toBe(false);
  });

  it('CNAE search results all carry a safety decision', async () => {
    const r = await getCollectiveAgreementsByCnae('47', 'ES-IB');
    expect(r.length).toBeGreaterThan(0);
    for (const a of r) {
      expect(a.safety).toBeDefined();
      // No registry seed is currently ready_for_payroll (B2 invariant).
      expect(a.safety?.allowed).toBe(false);
    }
  });

  it('attaching safety does not write to the database', async () => {
    const before = writeAttempts;
    await getCollectiveAgreementByCode('PAN-PAST-IB');
    await getCollectiveAgreementByCode('CONST-GEN');
    await getCollectiveAgreementsByCnae('47', 'ES-IB');
    expect(writeAttempts).toBe(before);
  });
});