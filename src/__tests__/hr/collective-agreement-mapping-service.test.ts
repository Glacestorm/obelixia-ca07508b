/**
 * B10C.2B.2A — Pure mapping service tests.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createMappingDraft,
  submitMappingForReview,
  approveMapping,
  rejectMapping,
  supersedeMapping,
  listMappingsForScope,
  MappingServiceError,
  type CollectiveAgreementMappingAdapter,
  type CompanyAgreementRegistryMapping,
  type MappingActorContext,
  type MappingAuthorizedRole,
  type RegistryAgreementSummaryForMapping,
  type RegistryVersionSummaryForMapping,
} from '@/engines/erp/hr/collectiveAgreementMappingService';

const SERVICE_PATH =
  'src/engines/erp/hr/collectiveAgreementMappingService.ts';
const BRIDGE_PATH = 'src/hooks/erp/hr/useESPayrollBridge.ts';
const FLAG_PATH = 'src/engines/erp/hr/registryShadowFlag.ts';

const COMPANY = 'company-1';
const OTHER_COMPANY = 'company-2';
const AGREEMENT = 'agr-1';
const VERSION = 'ver-1';

function makeActor(
  overrides: Partial<MappingActorContext> = {},
): MappingActorContext {
  return {
    userId: 'user-1',
    roles: ['hr_manager'] as MappingAuthorizedRole[],
    hasCompanyAccess: (c) => c === COMPANY,
    now: () => new Date('2026-04-29T10:00:00.000Z'),
    ...overrides,
  };
}

function readyAgreement(
  overrides: Partial<RegistryAgreementSummaryForMapping> = {},
): RegistryAgreementSummaryForMapping {
  return {
    id: AGREEMENT,
    ready_for_payroll: true,
    requires_human_review: false,
    data_completeness: 'human_validated',
    source_quality: 'official',
    ...overrides,
  };
}

function currentVersion(
  overrides: Partial<RegistryVersionSummaryForMapping> = {},
): RegistryVersionSummaryForMapping {
  return {
    id: VERSION,
    agreement_id: AGREEMENT,
    is_current: true,
    ...overrides,
  };
}

interface FakeAdapter extends CollectiveAgreementMappingAdapter {
  inserted: Partial<CompanyAgreementRegistryMapping>[];
  patches: Array<{ id: string; patch: Partial<CompanyAgreementRegistryMapping> }>;
}

function makeAdapter(opts: {
  mapping?: CompanyAgreementRegistryMapping | null;
  agreement?: RegistryAgreementSummaryForMapping | null;
  version?: RegistryVersionSummaryForMapping | null;
} = {}): FakeAdapter {
  const inserted: Partial<CompanyAgreementRegistryMapping>[] = [];
  const patches: Array<{
    id: string;
    patch: Partial<CompanyAgreementRegistryMapping>;
  }> = [];
  return {
    inserted,
    patches,
    async getMappingById(id) {
      if (!opts.mapping) return null;
      return opts.mapping.id === id ? opts.mapping : null;
    },
    async getRegistryAgreement(id) {
      if (opts.agreement === null) return null;
      return opts.agreement && opts.agreement.id === id ? opts.agreement : null;
    },
    async getRegistryVersion(id) {
      if (opts.version === null) return null;
      return opts.version && opts.version.id === id ? opts.version : null;
    },
    async insertMapping(row) {
      inserted.push(row);
      return {
        id: 'm-new',
        company_id: row.company_id!,
        registry_agreement_id: row.registry_agreement_id!,
        registry_version_id: row.registry_version_id!,
        source_type: row.source_type!,
        mapping_status: row.mapping_status!,
        is_current: row.is_current ?? false,
        created_by: row.created_by!,
        approved_by: row.approved_by ?? null,
        approved_at: row.approved_at ?? null,
        employee_id: row.employee_id ?? null,
        contract_id: row.contract_id ?? null,
        rationale_json: row.rationale_json ?? {},
        evidence_urls: row.evidence_urls ?? [],
        confidence_score: row.confidence_score ?? null,
      };
    },
    async updateMappingStatus(id, patch) {
      patches.push({ id, patch });
      return { ...(opts.mapping as CompanyAgreementRegistryMapping), ...patch, id };
    },
    async listMappingsForScope() {
      return [];
    },
  };
}

function baseMapping(
  overrides: Partial<CompanyAgreementRegistryMapping> = {},
): CompanyAgreementRegistryMapping {
  return {
    id: 'm-1',
    company_id: COMPANY,
    registry_agreement_id: AGREEMENT,
    registry_version_id: VERSION,
    source_type: 'manual_selection',
    mapping_status: 'draft',
    is_current: false,
    created_by: 'user-1',
    ...overrides,
  };
}

describe('B10C.2B.2A — createMappingDraft', () => {
  it('creates a draft with valid registry agreement+version', async () => {
    const adapter = makeAdapter({
      agreement: readyAgreement(),
      version: currentVersion(),
    });
    const result = await createMappingDraft(
      {
        company_id: COMPANY,
        registry_agreement_id: AGREEMENT,
        registry_version_id: VERSION,
        source_type: 'manual_selection',
      },
      makeActor(),
      adapter,
    );
    expect(result.mapping_status).toBe('draft');
    expect(result.is_current).toBe(false);
    expect(result.created_by).toBe('user-1');
    expect(result.approved_by).toBeNull();
    expect(adapter.inserted[0].mapping_status).toBe('draft');
  });

  it('rejects unauthorized role', async () => {
    const adapter = makeAdapter({
      agreement: readyAgreement(),
      version: currentVersion(),
    });
    await expect(
      createMappingDraft(
        {
          company_id: COMPANY,
          registry_agreement_id: AGREEMENT,
          registry_version_id: VERSION,
          source_type: 'manual_selection',
        },
        makeActor({ roles: [] as unknown as MappingAuthorizedRole[] }),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED_ROLE' });
  });

  it('rejects without company access', async () => {
    const adapter = makeAdapter({
      agreement: readyAgreement(),
      version: currentVersion(),
    });
    await expect(
      createMappingDraft(
        {
          company_id: OTHER_COMPANY,
          registry_agreement_id: AGREEMENT,
          registry_version_id: VERSION,
          source_type: 'manual_selection',
        },
        makeActor(),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'NO_COMPANY_ACCESS' });
  });

  it('rejects when agreement not found', async () => {
    const adapter = makeAdapter({ agreement: null, version: currentVersion() });
    await expect(
      createMappingDraft(
        {
          company_id: COMPANY,
          registry_agreement_id: AGREEMENT,
          registry_version_id: VERSION,
          source_type: 'manual_selection',
        },
        makeActor(),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'REGISTRY_AGREEMENT_NOT_FOUND' });
  });

  it('rejects when version not found', async () => {
    const adapter = makeAdapter({ agreement: readyAgreement(), version: null });
    await expect(
      createMappingDraft(
        {
          company_id: COMPANY,
          registry_agreement_id: AGREEMENT,
          registry_version_id: VERSION,
          source_type: 'manual_selection',
        },
        makeActor(),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'REGISTRY_VERSION_NOT_FOUND' });
  });

  it('rejects when version belongs to different agreement', async () => {
    const adapter = makeAdapter({
      agreement: readyAgreement(),
      version: currentVersion({ agreement_id: 'other-agr' }),
    });
    await expect(
      createMappingDraft(
        {
          company_id: COMPANY,
          registry_agreement_id: AGREEMENT,
          registry_version_id: VERSION,
          source_type: 'manual_selection',
        },
        makeActor(),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'VERSION_AGREEMENT_MISMATCH' });
  });
});

describe('B10C.2B.2A — submitMappingForReview', () => {
  it('transitions draft → pending_review', async () => {
    const adapter = makeAdapter({ mapping: baseMapping() });
    const r = await submitMappingForReview(
      { mapping_id: 'm-1' },
      makeActor(),
      adapter,
    );
    expect(r.mapping_status).toBe('pending_review');
  });

  it('rejects from non-draft state', async () => {
    const adapter = makeAdapter({
      mapping: baseMapping({ mapping_status: 'pending_review' }),
    });
    await expect(
      submitMappingForReview({ mapping_id: 'm-1' }, makeActor(), adapter),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('rejects when mapping not found', async () => {
    const adapter = makeAdapter({});
    await expect(
      submitMappingForReview({ mapping_id: 'missing' }, makeActor(), adapter),
    ).rejects.toMatchObject({ code: 'MAPPING_NOT_FOUND' });
  });
});

describe('B10C.2B.2A — approveMapping', () => {
  function setup(
    overrides: {
      mapping?: Partial<CompanyAgreementRegistryMapping>;
      agreement?: Partial<RegistryAgreementSummaryForMapping>;
      version?: Partial<RegistryVersionSummaryForMapping>;
    } = {},
  ) {
    return makeAdapter({
      mapping: baseMapping({
        mapping_status: 'pending_review',
        ...overrides.mapping,
      }),
      agreement: readyAgreement(overrides.agreement),
      version: currentVersion(overrides.version),
    });
  }

  it('approves from pending_review and sets approved_by/at server-side', async () => {
    const adapter = setup();
    const r = await approveMapping(
      { mapping_id: 'm-1' },
      makeActor({ userId: 'approver-99' }),
      adapter,
    );
    expect(r.mapping_status).toBe('approved_internal');
    expect(r.approved_by).toBe('approver-99');
    expect(r.approved_at).toBe('2026-04-29T10:00:00.000Z');
    expect(r.is_current).toBe(true);
  });

  it('rejects from draft', async () => {
    const adapter = setup({ mapping: { mapping_status: 'draft' } });
    await expect(
      approveMapping({ mapping_id: 'm-1' }, makeActor(), adapter),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('rejects when ready_for_payroll=false', async () => {
    const adapter = setup({ agreement: { ready_for_payroll: false } });
    await expect(
      approveMapping({ mapping_id: 'm-1' }, makeActor(), adapter),
    ).rejects.toMatchObject({ code: 'REGISTRY_NOT_READY' });
  });

  it('rejects when requires_human_review=true', async () => {
    const adapter = setup({ agreement: { requires_human_review: true } });
    await expect(
      approveMapping({ mapping_id: 'm-1' }, makeActor(), adapter),
    ).rejects.toMatchObject({ code: 'REGISTRY_NOT_READY' });
  });

  it('rejects when data_completeness != human_validated', async () => {
    const adapter = setup({ agreement: { data_completeness: 'partial' } });
    await expect(
      approveMapping({ mapping_id: 'm-1' }, makeActor(), adapter),
    ).rejects.toMatchObject({ code: 'REGISTRY_NOT_READY' });
  });

  it('rejects when source_quality != official', async () => {
    const adapter = setup({ agreement: { source_quality: 'community' } });
    await expect(
      approveMapping({ mapping_id: 'm-1' }, makeActor(), adapter),
    ).rejects.toMatchObject({ code: 'REGISTRY_NOT_READY' });
  });

  it('rejects when version not current', async () => {
    const adapter = setup({ version: { is_current: false } });
    await expect(
      approveMapping({ mapping_id: 'm-1' }, makeActor(), adapter),
    ).rejects.toMatchObject({ code: 'VERSION_NOT_CURRENT' });
  });

  it('rejects cnae_suggestion without humanConfirmed', async () => {
    const adapter = setup({ mapping: { source_type: 'cnae_suggestion' } });
    await expect(
      approveMapping({ mapping_id: 'm-1' }, makeActor(), adapter),
    ).rejects.toMatchObject({ code: 'CNAE_AUTO_APPROVAL_FORBIDDEN' });
  });

  it('approves cnae_suggestion with humanConfirmed=true', async () => {
    const adapter = setup({ mapping: { source_type: 'cnae_suggestion' } });
    const r = await approveMapping(
      { mapping_id: 'm-1', humanConfirmed: true },
      makeActor(),
      adapter,
    );
    expect(r.mapping_status).toBe('approved_internal');
  });
});

describe('B10C.2B.2A — rejectMapping', () => {
  it('requires reason >= 5 chars', async () => {
    const adapter = makeAdapter({ mapping: baseMapping() });
    await expect(
      rejectMapping({ mapping_id: 'm-1', reason: 'no' }, makeActor(), adapter),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
  });

  it('rejects with valid reason', async () => {
    const adapter = makeAdapter({ mapping: baseMapping() });
    const r = await rejectMapping(
      { mapping_id: 'm-1', reason: 'wrong agreement chosen' },
      makeActor(),
      adapter,
    );
    expect(r.mapping_status).toBe('rejected');
  });

  it('rejects from approved_internal (invalid transition)', async () => {
    const adapter = makeAdapter({
      mapping: baseMapping({ mapping_status: 'approved_internal' }),
    });
    await expect(
      rejectMapping(
        { mapping_id: 'm-1', reason: 'changed mind' },
        makeActor(),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});

describe('B10C.2B.2A — supersedeMapping', () => {
  it('requires reason', async () => {
    const adapter = makeAdapter({ mapping: baseMapping() });
    await expect(
      supersedeMapping(
        { mapping_id: 'm-1', reason: '' },
        makeActor(),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
  });

  it('supersedes with reason and sets is_current=false; never deletes', async () => {
    const adapter = makeAdapter({
      mapping: baseMapping({ is_current: true }),
    });
    const r = await supersedeMapping(
      { mapping_id: 'm-1', reason: 'replaced by newer version' },
      makeActor(),
      adapter,
    );
    expect(r.mapping_status).toBe('superseded');
    expect(r.is_current).toBe(false);
    // adapter has no delete capability
    expect((adapter as unknown as Record<string, unknown>).delete).toBeUndefined();
  });
});

describe('B10C.2B.2A — listMappingsForScope', () => {
  it('validates company access', async () => {
    const adapter = makeAdapter();
    await expect(
      listMappingsForScope(
        { company_id: OTHER_COMPANY },
        makeActor(),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'NO_COMPANY_ACCESS' });
  });

  it('returns adapter result for authorized scope', async () => {
    const adapter = makeAdapter();
    const r = await listMappingsForScope(
      { company_id: COMPANY },
      makeActor(),
      adapter,
    );
    expect(Array.isArray(r)).toBe(true);
  });
});

describe('B10C.2B.2A — error class', () => {
  it('MappingServiceError exposes code', () => {
    const e = new MappingServiceError('UNAUTHORIZED_ROLE');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('UNAUTHORIZED_ROLE');
    expect(e.name).toBe('MappingServiceError');
  });
});

describe('B10C.2B.2A — static contract checks', () => {
  let SRC = '';
  let BRIDGE = '';
  let FLAG = '';

  beforeAll(() => {
    SRC = fs.readFileSync(path.resolve(process.cwd(), SERVICE_PATH), 'utf-8');
    BRIDGE = fs.readFileSync(path.resolve(process.cwd(), BRIDGE_PATH), 'utf-8');
    FLAG = fs.readFileSync(path.resolve(process.cwd(), FLAG_PATH), 'utf-8');
  });

  function stripComments(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  }

  it('service has no forbidden runtime imports', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/from ['"]@\/integrations\/supabase/);
    expect(code).not.toMatch(/\bsupabase\b/);
    expect(code).not.toMatch(/\bfetch\(/);
    expect(code).not.toMatch(/\buseState\b/);
    expect(code).not.toMatch(/\buseEffect\b/);
    expect(code).not.toMatch(/\bDeno\./);
    expect(code).not.toMatch(/service_role/);
  });

  it('service does not import payroll/payslip/bridge/resolver/normalizer/flag', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/useESPayrollBridge/);
    expect(code).not.toMatch(/registryShadowFlag/);
    expect(code).not.toMatch(/registryShadowPreview/);
    expect(code).not.toMatch(/agreementSalaryResolver/);
    expect(code).not.toMatch(/salaryNormalizer/);
    expect(code).not.toMatch(/payrollEngine/);
    expect(code).not.toMatch(/payslipEngine/);
    expect(code).not.toMatch(/agreementSafetyGate/);
  });

  it('service exposes no apply/activate-to-payroll surface', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/applyToPayroll/);
    expect(code).not.toMatch(/activateForPayroll/);
  });

  it('service does not contain .delete( anywhere', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/\.delete\(/);
  });

  it('service does not reference operational table without _registry', () => {
    const code = stripComments(SRC);
    expect(code.match(/erp_hr_collective_agreements(?!_)/g) ?? []).toHaveLength(
      0,
    );
  });

  it('service never assigns ready_for_payroll = ...', () => {
    const code = stripComments(SRC);
    // Disallow assignment writes (mutating payroll readiness from this service).
    expect(code).not.toMatch(/ready_for_payroll\s*=\s*true/);
    expect(code).not.toMatch(/ready_for_payroll\s*:\s*true/);
    // Reads via strict equality are allowed (gate verification only).
  });

  it('useESPayrollBridge.ts not modified to import the service', () => {
    expect(BRIDGE).not.toMatch(/collectiveAgreementMappingService/);
  });

  it('registryShadowFlag.ts still exports false', () => {
    expect(FLAG).toMatch(
      /HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/,
    );
  });
});
