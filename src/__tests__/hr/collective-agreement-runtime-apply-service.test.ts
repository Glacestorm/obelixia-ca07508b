/**
 * B10D.2 — Pure runtime apply service tests.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createApplyRequest,
  submitApplyRequest,
  secondApproveApplyRequest,
  activateApplyRequest,
  rollbackApplyRequest,
  listApplyRequests,
  evaluateRuntimeApplyInvariants,
  RuntimeApplyServiceError,
  type RuntimeApplyAdapter,
  type RuntimeApplyActorContext,
  type RuntimeApplyRequest,
  type RuntimeMappingSummary,
  type RuntimeRegistryAgreementSummary,
  type RuntimeRegistryVersionSummary,
  type RuntimeSetting,
} from '@/engines/erp/hr/collectiveAgreementRuntimeApplyService';

const SERVICE_PATH =
  'src/engines/erp/hr/collectiveAgreementRuntimeApplyService.ts';
const BRIDGE_PATH = 'src/hooks/erp/hr/useESPayrollBridge.ts';
const FLAG_PATH = 'src/engines/erp/hr/registryShadowFlag.ts';

const COMPANY = 'company-1';
const OTHER = 'company-2';
const MAPPING_ID = 'map-1';
const AGREEMENT_ID = 'agr-1';
const VERSION_ID = 'ver-1';

function actor(
  overrides: Partial<RuntimeApplyActorContext> = {},
): RuntimeApplyActorContext {
  return {
    userId: 'requester-user',
    roles: ['payroll_supervisor'],
    hasCompanyAccess: (c) => c === COMPANY,
    now: () => new Date('2026-04-29T10:00:00.000Z'),
    ...overrides,
  };
}

function readyMapping(
  overrides: Partial<RuntimeMappingSummary> = {},
): RuntimeMappingSummary {
  return {
    id: MAPPING_ID,
    company_id: COMPANY,
    employee_id: null,
    contract_id: null,
    registry_agreement_id: AGREEMENT_ID,
    registry_version_id: VERSION_ID,
    mapping_status: 'approved_internal',
    is_current: true,
    approved_by: 'approver-user',
    approved_at: '2026-04-28T10:00:00.000Z',
    ...overrides,
  };
}

function readyAgreement(
  overrides: Partial<RuntimeRegistryAgreementSummary> = {},
): RuntimeRegistryAgreementSummary {
  return {
    id: AGREEMENT_ID,
    ready_for_payroll: true,
    requires_human_review: false,
    data_completeness: 'human_validated',
    source_quality: 'official',
    ...overrides,
  };
}

function currentVersion(
  overrides: Partial<RuntimeRegistryVersionSummary> = {},
): RuntimeRegistryVersionSummary {
  return {
    id: VERSION_ID,
    agreement_id: AGREEMENT_ID,
    is_current: true,
    ...overrides,
  };
}

function fullAcks() {
  return {
    understands_runtime_enable: true,
    reviewed_comparison_report: true,
    reviewed_payroll_impact: true,
    confirms_rollback_available: true,
  };
}

interface FakeState {
  mapping?: RuntimeMappingSummary | null;
  agreement?: RuntimeRegistryAgreementSummary | null;
  version?: RuntimeRegistryVersionSummary | null;
  request?: RuntimeApplyRequest | null;
  setting?: RuntimeSetting | null;
}

interface FakeAdapter extends RuntimeApplyAdapter {
  state: FakeState;
  runs: Array<Parameters<RuntimeApplyAdapter['insertApplyRun']>[0] & { id: string }>;
  requestPatches: Array<{ id: string; patch: Partial<RuntimeApplyRequest> }>;
  settingPatches: Array<{ id: string; patch: Partial<RuntimeSetting> }>;
  insertedSettings: Partial<RuntimeSetting>[];
}

function makeAdapter(initial: FakeState = {}): FakeAdapter {
  const state: FakeState = { ...initial };
  const runs: Array<
    Parameters<RuntimeApplyAdapter['insertApplyRun']>[0] & { id: string }
  > = [];
  const requestPatches: Array<{
    id: string;
    patch: Partial<RuntimeApplyRequest>;
  }> = [];
  const settingPatches: Array<{
    id: string;
    patch: Partial<RuntimeSetting>;
  }> = [];
  const insertedSettings: Partial<RuntimeSetting>[] = [];
  return {
    state,
    runs,
    requestPatches,
    settingPatches,
    insertedSettings,
    async getMapping(id) {
      return state.mapping && state.mapping.id === id ? state.mapping : null;
    },
    async getRegistryAgreement(id) {
      return state.agreement && state.agreement.id === id
        ? state.agreement
        : null;
    },
    async getRegistryVersion(id) {
      return state.version && state.version.id === id ? state.version : null;
    },
    async getApplyRequest(id) {
      return state.request && state.request.id === id ? state.request : null;
    },
    async insertApplyRequest(row) {
      const r: RuntimeApplyRequest = {
        id: 'req-1',
        mapping_id: row.mapping_id!,
        company_id: row.company_id!,
        employee_id: row.employee_id ?? null,
        contract_id: row.contract_id ?? null,
        request_status: row.request_status ?? 'draft',
        requested_by: row.requested_by!,
        requested_at: row.requested_at!,
        comparison_critical_diffs_count:
          row.comparison_critical_diffs_count ?? 0,
        comparison_report_json: row.comparison_report_json ?? {},
        payroll_impact_preview_json: row.payroll_impact_preview_json ?? {},
      };
      state.request = r;
      return r;
    },
    async updateApplyRequestStatus(id, patch) {
      requestPatches.push({ id, patch });
      if (state.request && state.request.id === id) {
        state.request = { ...state.request, ...patch };
        return state.request;
      }
      throw new Error('request not found');
    },
    async getCurrentRuntimeSetting(_q) {
      return state.setting ?? null;
    },
    async insertRuntimeSetting(row) {
      insertedSettings.push(row);
      const s: RuntimeSetting = {
        id: 'set-' + (insertedSettings.length),
        mapping_id: row.mapping_id!,
        company_id: row.company_id!,
        employee_id: row.employee_id ?? null,
        contract_id: row.contract_id ?? null,
        use_registry_for_payroll: row.use_registry_for_payroll ?? true,
        is_current: row.is_current ?? true,
        activation_run_id: row.activation_run_id!,
      };
      state.setting = s;
      return s;
    },
    async markRuntimeSettingNotCurrent(id, patch) {
      settingPatches.push({ id, patch });
      if (state.setting && state.setting.id === id) {
        state.setting = { ...state.setting, ...patch };
        return state.setting;
      }
      throw new Error('setting not found');
    },
    async insertApplyRun(row) {
      const id = 'run-' + (runs.length + 1);
      runs.push({ ...row, id });
      return { id };
    },
    async listApplyRequests(_q) {
      return state.request ? [state.request] : [];
    },
  };
}

describe('B10D.2 — createApplyRequest', () => {
  it('creates a draft for an approved/current mapping', async () => {
    const adapter = makeAdapter({ mapping: readyMapping() });
    const r = await createApplyRequest(
      { mapping_id: MAPPING_ID, comparison_critical_diffs_count: 0 },
      actor(),
      adapter,
    );
    expect(r.request_status).toBe('draft');
    expect(r.requested_by).toBe('requester-user');
    expect(r.company_id).toBe(COMPANY);
  });

  it('rejects unauthorized role', async () => {
    const adapter = makeAdapter({ mapping: readyMapping() });
    await expect(
      createApplyRequest(
        { mapping_id: MAPPING_ID, comparison_critical_diffs_count: 0 },
        actor({ roles: ['hr_manager'] }),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED_ROLE' });
  });

  it('rejects no company access', async () => {
    const adapter = makeAdapter({
      mapping: readyMapping({ company_id: OTHER }),
    });
    await expect(
      createApplyRequest(
        { mapping_id: MAPPING_ID, comparison_critical_diffs_count: 0 },
        actor(),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'NO_COMPANY_ACCESS' });
  });

  it('rejects when mapping missing', async () => {
    const adapter = makeAdapter({});
    await expect(
      createApplyRequest(
        { mapping_id: 'missing', comparison_critical_diffs_count: 0 },
        actor(),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'MAPPING_NOT_FOUND' });
  });
});

describe('B10D.2 — submitApplyRequest', () => {
  it('moves draft → pending_second_approval', async () => {
    const adapter = makeAdapter({ mapping: readyMapping() });
    const r = await createApplyRequest(
      { mapping_id: MAPPING_ID, comparison_critical_diffs_count: 0 },
      actor(),
      adapter,
    );
    const out = await submitApplyRequest({ request_id: r.id }, actor(), adapter);
    expect(out.request_status).toBe('pending_second_approval');
  });

  it('rejects from non-draft', async () => {
    const adapter = makeAdapter({ mapping: readyMapping() });
    const r = await createApplyRequest(
      { mapping_id: MAPPING_ID, comparison_critical_diffs_count: 0 },
      actor(),
      adapter,
    );
    await submitApplyRequest({ request_id: r.id }, actor(), adapter);
    await expect(
      submitApplyRequest({ request_id: r.id }, actor(), adapter),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});

async function setupPending(stateOverrides: Partial<FakeState> = {}) {
  const adapter = makeAdapter({
    mapping: readyMapping(),
    agreement: readyAgreement(),
    version: currentVersion(),
    ...stateOverrides,
  });
  const r = await createApplyRequest(
    { mapping_id: MAPPING_ID, comparison_critical_diffs_count: 0 },
    actor(),
    adapter,
  );
  await submitApplyRequest({ request_id: r.id }, actor(), adapter);
  return { adapter, requestId: r.id };
}

describe('B10D.2 — secondApproveApplyRequest', () => {
  const approver = actor({
    userId: 'approver-2',
    roles: ['legal_manager'],
  });

  it('rejects self approval', async () => {
    const { adapter, requestId } = await setupPending();
    await expect(
      secondApproveApplyRequest(
        { request_id: requestId, acknowledgements: fullAcks() },
        actor(), // same userId as requester
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'SELF_APPROVAL_FORBIDDEN' });
  });

  it('rejects role not allowed', async () => {
    const { adapter, requestId } = await setupPending();
    await expect(
      secondApproveApplyRequest(
        { request_id: requestId, acknowledgements: fullAcks() },
        actor({ userId: 'approver-2', roles: ['hr_manager'] }),
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'SECOND_APPROVER_ROLE_NOT_ALLOWED' });
  });

  it('rejects missing acknowledgements', async () => {
    const { adapter, requestId } = await setupPending();
    await expect(
      secondApproveApplyRequest(
        {
          request_id: requestId,
          acknowledgements: { understands_runtime_enable: true },
        },
        approver,
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'ACKNOWLEDGEMENTS_REQUIRED' });
  });

  it('rejects mapping not approved', async () => {
    const { adapter, requestId } = await setupPending();
    adapter.state.mapping = readyMapping({ mapping_status: 'pending_review' });
    await expect(
      secondApproveApplyRequest(
        { request_id: requestId, acknowledgements: fullAcks() },
        approver,
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'MAPPING_NOT_APPROVED' });
  });

  it('rejects mapping not current', async () => {
    const { adapter, requestId } = await setupPending();
    adapter.state.mapping = readyMapping({ is_current: false });
    await expect(
      secondApproveApplyRequest(
        { request_id: requestId, acknowledgements: fullAcks() },
        approver,
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'MAPPING_NOT_CURRENT' });
  });

  it('rejects registry not ready', async () => {
    const { adapter, requestId } = await setupPending();
    adapter.state.agreement = readyAgreement({ ready_for_payroll: false });
    await expect(
      secondApproveApplyRequest(
        { request_id: requestId, acknowledgements: fullAcks() },
        approver,
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'REGISTRY_NOT_READY' });
  });

  it('rejects version not current', async () => {
    const { adapter, requestId } = await setupPending();
    adapter.state.version = currentVersion({ is_current: false });
    await expect(
      secondApproveApplyRequest(
        { request_id: requestId, acknowledgements: fullAcks() },
        approver,
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'VERSION_NOT_CURRENT' });
  });

  it('rejects critical diffs > 0', async () => {
    const adapter = makeAdapter({
      mapping: readyMapping(),
      agreement: readyAgreement(),
      version: currentVersion(),
    });
    const r = await createApplyRequest(
      { mapping_id: MAPPING_ID, comparison_critical_diffs_count: 2 },
      actor(),
      adapter,
    );
    await submitApplyRequest({ request_id: r.id }, actor(), adapter);
    await expect(
      secondApproveApplyRequest(
        { request_id: r.id, acknowledgements: fullAcks() },
        approver,
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'COMPARISON_HAS_CRITICAL_DIFFS' });
  });

  it('approves successfully', async () => {
    const { adapter, requestId } = await setupPending();
    const out = await secondApproveApplyRequest(
      { request_id: requestId, acknowledgements: fullAcks() },
      approver,
      adapter,
    );
    expect(out.request_status).toBe('approved_for_runtime');
    expect(out.second_approved_by).toBe('approver-2');
    expect(out.second_approval_acknowledgements).toEqual(fullAcks());
  });
});

async function setupApproved() {
  const { adapter, requestId } = await setupPending();
  const approver = actor({ userId: 'approver-2', roles: ['legal_manager'] });
  await secondApproveApplyRequest(
    { request_id: requestId, acknowledgements: fullAcks() },
    approver,
    adapter,
  );
  return { adapter, requestId };
}

describe('B10D.2 — activateApplyRequest', () => {
  const activator = actor({ userId: 'activator-3', roles: ['admin'] });

  it('rejects from non approved_for_runtime', async () => {
    const { adapter, requestId } = await setupPending();
    await expect(
      activateApplyRequest({ request_id: requestId }, activator, adapter),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('blocks if registry changed (registry not ready)', async () => {
    const { adapter, requestId } = await setupApproved();
    adapter.state.agreement = readyAgreement({ ready_for_payroll: false });
    const res = await activateApplyRequest(
      { request_id: requestId },
      activator,
      adapter,
    );
    expect(res.outcome).toBe('blocked_by_invariant');
    expect(res.invariants.passed).toBe(false);
    expect(adapter.runs[0].outcome).toBe('blocked_by_invariant');
  });

  it('activates, creates runtime setting + run + updates request', async () => {
    const { adapter, requestId } = await setupApproved();
    const res = await activateApplyRequest(
      { request_id: requestId },
      activator,
      adapter,
    );
    expect(res.outcome).toBe('activated');
    expect(res.setting?.is_current).toBe(true);
    expect(res.setting?.use_registry_for_payroll).toBe(true);
    expect(res.request.request_status).toBe('activated');
    expect(res.request.activation_run_id).toBe(res.run_id);
    expect(adapter.runs.length).toBe(1);
    expect(adapter.runs[0].outcome).toBe('activated');
    // run signature hash 64 lowercase hex
    expect(adapter.runs[0].run_signature_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

async function setupActivated() {
  const { adapter, requestId } = await setupApproved();
  const activator = actor({ userId: 'activator-3', roles: ['admin'] });
  await activateApplyRequest({ request_id: requestId }, activator, adapter);
  return { adapter, requestId, activator };
}

describe('B10D.2 — rollbackApplyRequest', () => {
  it('rejects without reason >= 10', async () => {
    const { adapter, requestId, activator } = await setupActivated();
    await expect(
      rollbackApplyRequest(
        { request_id: requestId, reason: 'short' },
        activator,
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
  });

  it('rejects without active runtime setting', async () => {
    const { adapter, requestId, activator } = await setupActivated();
    adapter.state.setting = null;
    await expect(
      rollbackApplyRequest(
        {
          request_id: requestId,
          reason: 'critical issue detected in payroll preview',
        },
        activator,
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'NO_ACTIVE_RUNTIME_SETTING' });
  });

  it('rolls back successfully', async () => {
    const { adapter, requestId, activator } = await setupActivated();
    const out = await rollbackApplyRequest(
      {
        request_id: requestId,
        reason: 'critical issue detected in payroll preview',
      },
      activator,
      adapter,
    );
    expect(out.request.request_status).toBe('rolled_back');
    expect(out.setting.is_current).toBe(false);
    expect(out.request.rollback_run_id).toBe(out.run_id);
    expect(adapter.runs.find((r) => r.outcome === 'rolled_back')).toBeTruthy();
  });

  it('rejects double rollback', async () => {
    const { adapter, requestId, activator } = await setupActivated();
    await rollbackApplyRequest(
      {
        request_id: requestId,
        reason: 'critical issue detected in payroll preview',
      },
      activator,
      adapter,
    );
    await expect(
      rollbackApplyRequest(
        {
          request_id: requestId,
          reason: 'attempting again to roll back the same request',
        },
        activator,
        adapter,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});

describe('B10D.2 — listApplyRequests', () => {
  it('validates company access', async () => {
    const adapter = makeAdapter({});
    await expect(
      listApplyRequests({ company_id: OTHER }, actor(), adapter),
    ).rejects.toMatchObject({ code: 'NO_COMPANY_ACCESS' });
  });

  it('returns requests when access ok', async () => {
    const adapter = makeAdapter({ mapping: readyMapping() });
    await createApplyRequest(
      { mapping_id: MAPPING_ID, comparison_critical_diffs_count: 0 },
      actor(),
      adapter,
    );
    const list = await listApplyRequests(
      { company_id: COMPANY },
      actor(),
      adapter,
    );
    expect(list.length).toBe(1);
  });
});

describe('B10D.2 — invariants helper', () => {
  it('passes for fully ready state', () => {
    const r = evaluateRuntimeApplyInvariants({
      mapping: readyMapping(),
      agreement: readyAgreement(),
      version: currentVersion(),
      request: {
        id: 'req',
        mapping_id: MAPPING_ID,
        company_id: COMPANY,
        request_status: 'pending_second_approval',
        requested_by: 'u1',
        requested_at: 'now',
        comparison_critical_diffs_count: 0,
      },
      acknowledgements: fullAcks(),
      second_approver_user_id: 'u2',
      second_approver_roles: ['legal_manager'],
    });
    expect(r.passed).toBe(true);
    expect(r.checks.length).toBeGreaterThanOrEqual(14);
    expect(r.blockers.length).toBe(0);
  });

  it('reports blockers when several invariants fail', () => {
    const r = evaluateRuntimeApplyInvariants({
      mapping: null,
      agreement: null,
      version: null,
      request: {
        id: 'req',
        mapping_id: MAPPING_ID,
        company_id: COMPANY,
        request_status: 'draft',
        requested_by: 'u1',
        requested_at: 'now',
        comparison_critical_diffs_count: 5,
      },
      acknowledgements: {},
      second_approver_user_id: 'u1',
      second_approver_roles: ['hr_manager'],
    });
    expect(r.passed).toBe(false);
    expect(r.blockers.length).toBeGreaterThan(0);
  });
});

// =========================================================
// Static contract tests
// =========================================================

describe('B10D.2 — static contract', () => {
  const SRC = fs.readFileSync(path.resolve(SERVICE_PATH), 'utf8');

  it('has no Supabase / fetch / React / hooks / Deno / service_role', () => {
    expect(SRC).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(SRC).not.toMatch(/\bfetch\s*\(/);
    expect(SRC).not.toMatch(/from\s+['"]react['"]/);
    expect(SRC).not.toMatch(/\buse[A-Z]\w*\s*\(/); // no hook calls
    expect(SRC).not.toMatch(/\bDeno\b/);
    expect(SRC).not.toMatch(/service_role/);
  });

  it('does not import bridge / flag / resolver / normalizer / payroll engines / safety gate', () => {
    expect(SRC).not.toMatch(/useESPayrollBridge/);
    expect(SRC).not.toMatch(/registryShadowFlag/);
    expect(SRC).not.toMatch(/agreementSalaryResolver/);
    expect(SRC).not.toMatch(/salaryNormalizer/);
    expect(SRC).not.toMatch(/payrollEngine/);
    expect(SRC).not.toMatch(/payslipEngine/);
    expect(SRC).not.toMatch(/agreementSafetyGate/);
  });

  it('does not contain ".delete("', () => {
    expect(SRC).not.toMatch(/\.delete\(/);
  });

  it('does not reference operative table erp_hr_collective_agreements (without _registry)', () => {
    // Match the operative table name only when not followed by _registry.
    const re = /erp_hr_collective_agreements(?!_registry)/g;
    expect(SRC.match(re)).toBeNull();
  });

  it('does not write ready_for_payroll', () => {
    expect(SRC).not.toMatch(/ready_for_payroll\s*=/);
  });

  it('useESPayrollBridge.ts is unchanged by B10D.2 (file does not import this service)', () => {
    if (fs.existsSync(BRIDGE_PATH)) {
      const bridge = fs.readFileSync(BRIDGE_PATH, 'utf8');
      expect(bridge).not.toMatch(/collectiveAgreementRuntimeApplyService/);
    }
  });

  it('registryShadowFlag.ts is still false', () => {
    if (fs.existsSync(FLAG_PATH)) {
      const flag = fs.readFileSync(FLAG_PATH, 'utf8');
      expect(flag).toMatch(/=\s*false/);
    }
  });
});
