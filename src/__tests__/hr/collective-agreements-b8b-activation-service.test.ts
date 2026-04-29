/**
 * B8B — Activation service (pure) tests with in-memory adapter.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createActivationRequest,
  submitForSecondApproval,
  secondApproveActivation,
  rejectActivationRequest,
  supersedeActivationRequest,
  type ActivationServiceAdapter,
  type ActivationRequestRow,
} from '@/engines/erp/hr/collectiveAgreementActivationService';

const HASH = 'a'.repeat(64);

function makeAdapter(opts: {
  roles?: Record<string, string[]>;
  readinessOverrides?: Partial<{
    salaryTablesCount: number;
    rulesCount: number;
    sourceQuality: string;
    versionHash: string;
  }>;
} = {}): ActivationServiceAdapter & { _requests: ActivationRequestRow[]; _approvals: any[] } {
  const requests: ActivationRequestRow[] = [];
  const approvals: any[] = [];
  const roles = opts.roles ?? {
    u1: ['hr_manager'],
    u2: ['payroll_supervisor'],
  };
  const o = opts.readinessOverrides ?? {};
  return {
    _requests: requests,
    _approvals: approvals,
    async fetchAgreement() {
      return {
        id: 'ag',
        status: 'vigente',
        source_quality: 'official',
        data_completeness: 'parsed_full',
        salary_tables_loaded: true,
      };
    },
    async fetchVersion() {
      return { id: 'v', agreement_id: 'ag', is_current: true, source_hash: o.versionHash ?? HASH };
    },
    async fetchValidation() {
      return {
        id: 'val',
        agreement_id: 'ag',
        version_id: 'v',
        validation_status: 'approved_internal',
        is_current: true,
        validation_scope: ['metadata', 'salary_tables', 'rules'],
        sha256_hash: HASH,
        // adapter contract: include source_id for B8B service
        source_id: 's',
      } as any;
    },
    async fetchSource() {
      return {
        id: 's',
        agreement_id: 'ag',
        document_hash: HASH,
        source_quality: o.sourceQuality ?? 'official',
      };
    },
    async countSalaryTables() { return o.salaryTablesCount ?? 3; },
    async countRules() { return o.rulesCount ?? 2; },
    async fetchUnresolvedCriticalWarningsCount() { return 0; },
    async fetchDiscardedCriticalRowsUnresolvedCount() { return 0; },
    async fetchCurrentLiveRequest() {
      return requests.find(
        (r) =>
          r.agreement_id === 'ag' &&
          ['draft', 'pending_second_approval', 'approved_for_activation'].includes(
            r.activation_status,
          ),
      ) ?? null;
    },
    async fetchRequest(id) { return requests.find((r) => r.id === id) ?? null; },
    async fetchUserRoles(uid) { return roles[uid] ?? []; },
    async insertActivationRequest(args) {
      const row: ActivationRequestRow = { id: `req-${requests.length + 1}`, ...args };
      requests.push(row);
      return { id: row.id };
    },
    async updateActivationRequest({ id, patch }) {
      const r = requests.find((x) => x.id === id);
      if (r) Object.assign(r, patch);
    },
    async insertActivationApproval(args) {
      const row = { id: `appr-${approvals.length + 1}`, ...args };
      approvals.push(row);
      return { id: row.id };
    },
    async supersedeActivationRequest(id) {
      const r = requests.find((x) => x.id === id);
      if (r) r.activation_status = 'superseded';
    },
  };
}

const fullChecklist = {
  reviewed_readiness_report: true,
  accepts_payroll_registry_enablement_future: true,
  verified_legal_validity_and_sha: true,
};

describe('B8B — activation service', () => {
  let adapter: ReturnType<typeof makeAdapter>;
  beforeEach(() => { adapter = makeAdapter(); });

  it('create_request stores readiness report and stays draft (does not activate registry)', async () => {
    const r = await createActivationRequest(
      { agreement_id: 'ag', version_id: 'v', validation_id: 'val', requested_by: 'u1' },
      adapter,
    );
    expect(r.activation_status).toBe('draft');
    expect(r.readiness_passed).toBe(true);
    expect(adapter._requests[0].readiness_report_json).toBeDefined();
  });

  it('create_request with readiness=false stays draft and readiness_passed=false', async () => {
    adapter = makeAdapter({ readinessOverrides: { sourceQuality: 'public_secondary' } });
    const r = await createActivationRequest(
      { agreement_id: 'ag', version_id: 'v', validation_id: 'val', requested_by: 'u1' },
      adapter,
    );
    expect(r.activation_status).toBe('draft');
    expect(r.readiness_passed).toBe(false);
  });

  it('submit transitions to pending_second_approval only when readiness passed', async () => {
    const created = await createActivationRequest(
      { agreement_id: 'ag', version_id: 'v', validation_id: 'val', requested_by: 'u1' },
      adapter,
    );
    await submitForSecondApproval({ request_id: created.id, acting_user_id: 'u1' }, adapter);
    expect(adapter._requests[0].activation_status).toBe('pending_second_approval');
  });

  it('submit fails if readiness not passed', async () => {
    adapter = makeAdapter({ readinessOverrides: { rulesCount: 0 } });
    const created = await createActivationRequest(
      { agreement_id: 'ag', version_id: 'v', validation_id: 'val', requested_by: 'u1' },
      adapter,
    );
    await expect(
      submitForSecondApproval({ request_id: created.id, acting_user_id: 'u1' }, adapter),
    ).rejects.toThrow('READINESS_NOT_PASSED');
  });

  it('secondApprove fails when same user as requester', async () => {
    const c = await createActivationRequest(
      { agreement_id: 'ag', version_id: 'v', validation_id: 'val', requested_by: 'u1' },
      adapter,
    );
    await submitForSecondApproval({ request_id: c.id, acting_user_id: 'u1' }, adapter);
    await expect(
      secondApproveActivation(
        {
          request_id: c.id,
          approver_user_id: 'u1',
          activation_checklist: fullChecklist,
        },
        adapter,
      ),
    ).rejects.toThrow('APPROVER_MUST_DIFFER_FROM_REQUESTER');
  });

  it('secondApprove fails with unauthorised role', async () => {
    adapter = makeAdapter({
      roles: { u1: ['hr_manager'], u2: ['hr_manager'] },
    });
    const c = await createActivationRequest(
      { agreement_id: 'ag', version_id: 'v', validation_id: 'val', requested_by: 'u1' },
      adapter,
    );
    await submitForSecondApproval({ request_id: c.id, acting_user_id: 'u1' }, adapter);
    await expect(
      secondApproveActivation(
        {
          request_id: c.id,
          approver_user_id: 'u2',
          activation_checklist: fullChecklist,
        },
        adapter,
      ),
    ).rejects.toThrow('APPROVER_ROLE_NOT_AUTHORIZED');
  });

  it('secondApprove OK inserts approval and leaves request approved_for_activation', async () => {
    const c = await createActivationRequest(
      { agreement_id: 'ag', version_id: 'v', validation_id: 'val', requested_by: 'u1' },
      adapter,
    );
    await submitForSecondApproval({ request_id: c.id, acting_user_id: 'u1' }, adapter);
    const res = await secondApproveActivation(
      {
        request_id: c.id,
        approver_user_id: 'u2',
        activation_checklist: fullChecklist,
      },
      adapter,
    );
    expect(res.approval_signature_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(adapter._requests[0].activation_status).toBe('approved_for_activation');
    expect(adapter._approvals).toHaveLength(1);
  });

  it('reject requires reason', async () => {
    const c = await createActivationRequest(
      { agreement_id: 'ag', version_id: 'v', validation_id: 'val', requested_by: 'u1' },
      adapter,
    );
    await expect(
      rejectActivationRequest(
        { request_id: c.id, approver_user_id: 'u2', decision_reason: '' },
        adapter,
      ),
    ).rejects.toThrow('REJECT_REQUIRES_REASON');
  });

  it('supersede transitions status', async () => {
    const c = await createActivationRequest(
      { agreement_id: 'ag', version_id: 'v', validation_id: 'val', requested_by: 'u1' },
      adapter,
    );
    await supersedeActivationRequest({ request_id: c.id }, adapter);
    expect(adapter._requests[0].activation_status).toBe('superseded');
  });

  it('service source has no registry-master mutation API surface', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      'src/engines/erp/hr/collectiveAgreementActivationService.ts',
      'utf-8',
    );
    expect(src).not.toMatch(/ready_for_payroll/);
    expect(src).not.toMatch(/data_completeness/);
    expect(src).not.toMatch(/salary_tables_loaded/);
    // No imports of payroll engines
    expect(src).not.toMatch(/payslipEngine/);
    expect(src).not.toMatch(/agreementSalaryResolver/);
    expect(src).not.toMatch(/salaryNormalizer/);
    // No reference to operational table (without _registry suffix)
    expect(src.match(/erp_hr_collective_agreements(?!_)/g) ?? []).toHaveLength(0);
  });
});