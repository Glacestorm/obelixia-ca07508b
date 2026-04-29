/**
 * B9 — Activation executor (pure) tests with in-memory adapter.
 */
import { describe, it, expect } from 'vitest';
import {
  activateRegistry,
  rollbackActivation,
  ALLOWED_PATCH_KEYS,
  type ActivationExecutorAdapter,
  type ActivationRequestRow,
  type ActivationApprovalRow,
  type ActivationRunRow,
  type ActivationRunInsert,
  type ExecutorRole,
} from '@/engines/erp/hr/collectiveAgreementActivationExecutor';

const HASH = 'a'.repeat(64);

function makeAdapter(opts: {
  isAdmin?: boolean;
  request?: ActivationRequestRow | null;
  approval?: ActivationApprovalRow | null;
  readinessOk?: boolean;
  triggerBlocks?: boolean;
  preRow?: Record<string, unknown> | null;
  run?: ActivationRunRow | null;
  rollbackExisting?: ActivationRunRow | null;
} = {}): ActivationExecutorAdapter & {
  _runs: ActivationRunInsert[];
  _patches: Array<{ id: string; patch: Record<string, unknown> }>;
} {
  const runs: ActivationRunInsert[] = [];
  const patches: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const isAdmin = opts.isAdmin ?? true;
  const request = opts.request === undefined
    ? ({
        id: 'req-1',
        agreement_id: 'ag',
        version_id: 'v',
        validation_id: 'val',
        requested_by: 'u-req',
        requested_role: 'hr_manager',
        activation_status: 'approved_for_activation',
        readiness_passed: true,
      } as ActivationRequestRow)
    : opts.request;
  const approval = opts.approval === undefined
    ? ({
        id: 'app-1',
        request_id: 'req-1',
        approver_id: 'u-app',
        approver_role: 'payroll_supervisor',
        decision: 'approved',
      } as ActivationApprovalRow)
    : opts.approval;
  const readinessOk = opts.readinessOk ?? true;
  const preRow = opts.preRow ?? {
    data_completeness: 'parsed_full',
    requires_human_review: true,
    ready_for_payroll: false,
    activated_for_payroll_at: null,
    activated_by: null,
    activation_request_id: null,
  };
  return {
    _runs: runs,
    _patches: patches,
    async roleAuthorized(_uid: string, _roles: readonly ExecutorRole[]) {
      return isAdmin;
    },
    async fetchRequest() {
      return request;
    },
    async fetchApproval() {
      return approval;
    },
    async fetchAgreement() {
      return {
        id: 'ag',
        status: 'vigente',
        source_quality: 'official',
        data_completeness: readinessOk ? 'parsed_full' : 'metadata_only',
        salary_tables_loaded: true,
      };
    },
    async fetchVersion() {
      return { id: 'v', agreement_id: 'ag', is_current: true, source_hash: HASH };
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
      };
    },
    async fetchSource() {
      return { id: 's', agreement_id: 'ag', document_hash: HASH, source_quality: 'official' };
    },
    async countWarnings() {
      return 0;
    },
    async countDiscardedRows() {
      return 0;
    },
    async countSalaryTables() {
      return 3;
    },
    async countRules() {
      return 2;
    },
    async fetchRegistryRow() {
      return preRow;
    },
    async applyRegistryPatch(id, patch) {
      patches.push({ id, patch });
      if (opts.triggerBlocks && (patch as Record<string, unknown>).ready_for_payroll === true) {
        const e = new Error('ready_for_payroll=true requires ...');
        (e as { code?: string }).code = '23514';
        throw e;
      }
      return { ...(preRow ?? {}), ...patch };
    },
    async insertRun(row) {
      runs.push(row);
      return { id: `run-${runs.length}` };
    },
    async fetchRun() {
      return opts.run ?? null;
    },
    async fetchRollbackRunForRequest() {
      return opts.rollbackExisting ?? null;
    },
  };
}

describe('B9 — activateRegistry', () => {
  it('rejects when role is not admin/superadmin (no run)', async () => {
    const a = makeAdapter({ isAdmin: false });
    const r = await activateRegistry({ request_id: 'req-1', executed_by: 'u-app' }, a);
    expect(r.outcome).toBe('rejected');
    expect(r.error_code).toBe('INSUFFICIENT_ROLE');
    expect(a._runs).toHaveLength(0);
    expect(a._patches).toHaveLength(0);
  });

  it('returns NOT_FOUND when request does not exist', async () => {
    const a = makeAdapter({ request: null });
    const r = await activateRegistry({ request_id: 'x', executed_by: 'u-app' }, a);
    expect(r.error_code).toBe('NOT_FOUND');
    expect(a._runs).toHaveLength(0);
  });

  it('returns INVALID_STATE when request status is not approved_for_activation', async () => {
    const a = makeAdapter({
      request: {
        id: 'req-1', agreement_id: 'ag', version_id: 'v', validation_id: 'val',
        requested_by: 'u-req', requested_role: 'hr_manager',
        activation_status: 'pending_second_approval', readiness_passed: true,
      },
    });
    const r = await activateRegistry({ request_id: 'req-1', executed_by: 'u-app' }, a);
    expect(r.error_code).toBe('INVALID_STATE');
  });

  it('returns NO_VALID_APPROVAL when approval is missing', async () => {
    const a = makeAdapter({ approval: null });
    const r = await activateRegistry({ request_id: 'req-1', executed_by: 'u-app' }, a);
    expect(r.error_code).toBe('NO_VALID_APPROVAL');
  });

  it('returns NO_VALID_APPROVAL when approver_id === requested_by', async () => {
    const a = makeAdapter({
      approval: {
        id: 'app', request_id: 'req-1',
        approver_id: 'u-req', approver_role: 'admin', decision: 'approved',
      },
    });
    const r = await activateRegistry({ request_id: 'req-1', executed_by: 'u-app' }, a);
    expect(r.error_code).toBe('NO_VALID_APPROVAL');
  });

  it('inserts blocked_by_invariant run when readiness fails', async () => {
    const a = makeAdapter({ readinessOk: false });
    const r = await activateRegistry({ request_id: 'req-1', executed_by: 'u-app' }, a);
    expect(r.outcome).toBe('blocked_by_invariant');
    expect(a._runs).toHaveLength(1);
    expect(a._runs[0].outcome).toBe('blocked_by_invariant');
    expect(a._runs[0].error_detail).toBeTruthy();
    expect(a._patches).toHaveLength(0);
  });

  it('inserts blocked_by_trigger run when DB throws check_violation', async () => {
    const a = makeAdapter({ triggerBlocks: true });
    const r = await activateRegistry({ request_id: 'req-1', executed_by: 'u-app' }, a);
    expect(r.outcome).toBe('blocked_by_trigger');
    expect(a._runs.at(-1)?.outcome).toBe('blocked_by_trigger');
  });

  it('patch contains EXACTLY the 6 allowed keys', async () => {
    const a = makeAdapter();
    const r = await activateRegistry({ request_id: 'req-1', executed_by: 'u-app' }, a);
    expect(r.outcome).toBe('activated');
    const patchKeys = Object.keys(a._patches[0].patch).sort();
    expect(patchKeys).toEqual([...ALLOWED_PATCH_KEYS].sort());
    expect(patchKeys).toHaveLength(6);
  });

  it('activated run carries pre/post snapshots and run_signature_hash', async () => {
    const a = makeAdapter();
    const r = await activateRegistry({ request_id: 'req-1', executed_by: 'u-app' }, a);
    expect(r.outcome).toBe('activated');
    expect(r.run_signature_hash).toMatch(/^[a-f0-9]{64}$/);
    const run = a._runs[0];
    expect(run.outcome).toBe('activated');
    expect(run.pre_state_snapshot_json).toBeTruthy();
    expect(run.post_state_snapshot_json).toBeTruthy();
    expect((run.post_state_snapshot_json as Record<string, unknown>).ready_for_payroll).toBe(true);
  });
});

describe('B9 — rollbackActivation', () => {
  const baseRun: ActivationRunRow = {
    id: 'run-orig',
    request_id: 'req-1',
    agreement_id: 'ag',
    version_id: 'v',
    validation_id: 'val',
    executed_by: 'u-app',
    executed_at: '2026-01-01T00:00:00Z',
    pre_state_snapshot_json: {
      data_completeness: 'parsed_full',
      requires_human_review: true,
      ready_for_payroll: false,
      activated_for_payroll_at: null,
      activated_by: null,
      activation_request_id: null,
    },
    post_state_snapshot_json: {
      data_completeness: 'human_validated',
      requires_human_review: false,
      ready_for_payroll: true,
      activated_for_payroll_at: '2026-01-01T00:00:00Z',
      activated_by: 'u-app',
      activation_request_id: 'req-1',
    },
    outcome: 'activated',
    error_detail: null,
    run_signature_hash: 'b'.repeat(64),
  };

  it('restores pre_state when run is activated', async () => {
    const a = makeAdapter({ run: baseRun });
    const r = await rollbackActivation({ run_id: 'run-orig', executed_by: 'u-admin' }, a);
    expect(r.outcome).toBe('rolled_back');
    expect(a._patches[0].patch.ready_for_payroll).toBe(false);
    expect(a._patches[0].patch.requires_human_review).toBe(true);
  });

  it('inserts a rolled_back run referencing original (no delete)', async () => {
    const a = makeAdapter({ run: baseRun });
    await rollbackActivation({ run_id: 'run-orig', executed_by: 'u-admin' }, a);
    const last = a._runs.at(-1)!;
    expect(last.outcome).toBe('rolled_back');
    expect(last.error_detail).toContain('run-orig');
    // pre/post inverted vs original
    expect((last.pre_state_snapshot_json as Record<string, unknown>).ready_for_payroll).toBe(true);
    expect((last.post_state_snapshot_json as Record<string, unknown>).ready_for_payroll).toBe(false);
  });

  it('returns ALREADY_ROLLED_BACK on second rollback', async () => {
    const a = makeAdapter({
      run: baseRun,
      rollbackExisting: { ...baseRun, id: 'run-rb', outcome: 'rolled_back' },
    });
    const r = await rollbackActivation({ run_id: 'run-orig', executed_by: 'u-admin' }, a);
    expect(r.error_code).toBe('ALREADY_ROLLED_BACK');
  });

  it('rejects when caller is not admin/superadmin', async () => {
    const a = makeAdapter({ isAdmin: false, run: baseRun });
    const r = await rollbackActivation({ run_id: 'run-orig', executed_by: 'u' }, a);
    expect(r.error_code).toBe('INSUFFICIENT_ROLE');
  });
});