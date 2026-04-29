/**
 * B10D.4 — Behavioral tests for the runtime-apply UI.
 *
 * Verifies banner, gating, dialogs, and edge-routing of all actions.
 * NEVER touches payroll, bridge, flag, resolver or operative tables.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'fresh-runtime-token' } },
      }),
    },
    functions: {
      invoke: vi
        .fn()
        .mockResolvedValue({ data: { success: true, data: [] }, error: null }),
    },
  },
}));

import { RuntimeApplyRequestPanel } from '@/components/erp/hr/collective-agreements/runtime-apply/RuntimeApplyRequestPanel';
import { RuntimeApplyStatusBadge } from '@/components/erp/hr/collective-agreements/runtime-apply/RuntimeApplyStatusBadge';
import { RuntimeApplySecondApprovalDialog } from '@/components/erp/hr/collective-agreements/runtime-apply/RuntimeApplySecondApprovalDialog';
import { RuntimeRollbackDialog } from '@/components/erp/hr/collective-agreements/runtime-apply/RuntimeRollbackDialog';

const baseRequest = {
  id: 'req-1',
  request_status: 'pending_second_approval' as const,
  mapping_id: 'm1-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  company_id: 'c1',
  employee_id: null,
  contract_id: null,
  requested_by: 'user-aaaa-bbbb',
  requested_at: new Date().toISOString(),
  second_approved_by: null,
  second_approved_at: null,
  comparison_critical_diffs_count: 0,
  activation_run_id: null,
  rollback_run_id: null,
  comparison_report_json: { rows: [] },
  payroll_impact_preview_json: { eur: 0 },
  invariants_snapshot: {
    mapping_exists: true,
    mapping_status_approved_internal: true,
  },
};

describe('B10D.4 — Runtime apply panel banner & states', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the mandatory permanent banner mentioning scope and B10E', () => {
    render(
      <RuntimeApplyRequestPanel
        companyId="c1"
        canManage
        initialRequests={[baseRequest]}
      />,
    );
    expect(
      screen.getByText(/Activación interna del registry por scope/),
    ).toBeInTheDocument();
    expect(screen.getByText(/B10E/)).toBeInTheDocument();
  });

  it('does not render any forbidden CTA strings', () => {
    const { container } = render(
      <RuntimeApplyRequestPanel
        companyId="c1"
        canManage
        initialRequests={[baseRequest]}
      />,
    );
    const text = container.textContent ?? '';
    for (const cta of [
      'Aplicar en nómina ya',
      'Activar payroll global',
      'Activar flag global',
      'Cambiar nómina ahora',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'Usar registry en nómina ahora',
      'Ejecutar nómina con registry',
      'Activar nómina registry',
    ]) {
      expect(text.includes(cta)).toBe(false);
    }
  });

  it('canManage=false disables action buttons', () => {
    render(
      <RuntimeApplyRequestPanel
        companyId="c1"
        canManage={false}
        initialRequests={[baseRequest]}
      />,
    );
    expect(screen.getByTestId('runtime-apply-submit')).toBeDisabled();
    expect(screen.getByTestId('runtime-apply-open-second-approve')).toBeDisabled();
    expect(screen.getByTestId('runtime-apply-activate')).toBeDisabled();
    expect(screen.getByTestId('runtime-apply-open-rollback')).toBeDisabled();
    expect(screen.getByTestId('runtime-apply-open-reject')).toBeDisabled();
  });

  it('renders all 7 lifecycle statuses', () => {
    for (const s of [
      'draft',
      'pending_second_approval',
      'approved_for_runtime',
      'activated',
      'rejected',
      'rolled_back',
      'superseded',
    ] as const) {
      const { unmount } = render(<RuntimeApplyStatusBadge status={s} />);
      expect(screen.getByTestId(`runtime-apply-status-${s}`)).toBeInTheDocument();
      unmount();
    }
  });

  it('activate button is only enabled in approved_for_runtime', () => {
    const { unmount } = render(
      <RuntimeApplyRequestPanel
        companyId="c1"
        canManage
        initialRequests={[{ ...baseRequest, request_status: 'pending_second_approval' }]}
      />,
    );
    expect(screen.getByTestId('runtime-apply-activate')).toBeDisabled();
    unmount();

    render(
      <RuntimeApplyRequestPanel
        companyId="c2"
        canManage
        initialRequests={[{ ...baseRequest, id: 'req-2', request_status: 'approved_for_runtime' }]}
      />,
    );
    expect(screen.getByTestId('runtime-apply-activate')).not.toBeDisabled();
  });

  it('rollback button is only enabled in activated', () => {
    const { unmount } = render(
      <RuntimeApplyRequestPanel
        companyId="c1"
        canManage
        initialRequests={[{ ...baseRequest, request_status: 'approved_for_runtime' }]}
      />,
    );
    expect(screen.getByTestId('runtime-apply-open-rollback')).toBeDisabled();
    unmount();

    render(
      <RuntimeApplyRequestPanel
        companyId="c2"
        canManage
        initialRequests={[{ ...baseRequest, id: 'req-3', request_status: 'activated' }]}
      />,
    );
    expect(screen.getByTestId('runtime-apply-open-rollback')).not.toBeDisabled();
  });
});

describe('B10D.4 — Second-approval dialog', () => {
  it('requires the 4 acknowledgements before enabling confirm', () => {
    render(
      <RuntimeApplySecondApprovalDialog
        open
        onOpenChange={() => {}}
        onConfirm={vi.fn()}
      />,
    );
    const confirm = screen.getByTestId('runtime-apply-second-approval-confirm');
    expect(confirm).toBeDisabled();

    fireEvent.click(screen.getByTestId('runtime-apply-ack-understands_runtime_enable'));
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByTestId('runtime-apply-ack-reviewed_comparison_report'));
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByTestId('runtime-apply-ack-reviewed_payroll_impact'));
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByTestId('runtime-apply-ack-confirms_rollback_available'));
    expect(confirm).not.toBeDisabled();
  });

  it('shows the distinct-user warning', () => {
    render(
      <RuntimeApplySecondApprovalDialog
        open
        onOpenChange={() => {}}
        onConfirm={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId('runtime-apply-distinct-user-warning'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no puede realizarla el mismo usuario solicitante/i),
    ).toBeInTheDocument();
  });
});

describe('B10D.4 — Rollback / reject dialogs require reason ≥10', () => {
  it('rollback confirm disabled without reason ≥10', () => {
    render(
      <RuntimeRollbackDialog
        open
        onOpenChange={() => {}}
        kind="rollback"
        onConfirm={vi.fn()}
      />,
    );
    const confirm = screen.getByTestId('runtime-rollback-confirm');
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByTestId('runtime-rollback-reason'), {
      target: { value: 'corto' },
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByTestId('runtime-rollback-reason'), {
      target: { value: 'motivo suficientemente largo' },
    });
    expect(confirm).not.toBeDisabled();
  });

  it('reject confirm disabled without reason ≥10', () => {
    render(
      <RuntimeRollbackDialog
        open
        onOpenChange={() => {}}
        kind="reject"
        onConfirm={vi.fn()}
      />,
    );
    const confirm = screen.getByTestId('runtime-reject-confirm');
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByTestId('runtime-reject-reason'), {
      target: { value: 'corto' },
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByTestId('runtime-reject-reason'), {
      target: { value: 'motivo suficiente >=10' },
    });
    expect(confirm).not.toBeDisabled();
  });
});

describe('B10D.4 — Hook routes through edge function', () => {
  beforeEach(() => vi.clearAllMocks());

  async function runAction(
    method:
      | 'createRequest'
      | 'submitForSecondApproval'
      | 'secondApprove'
      | 'reject'
      | 'activate'
      | 'rollback'
      | 'list',
    payload: Record<string, unknown>,
  ) {
    const { supabase } = await import('@/integrations/supabase/client');
    const { useCompanyAgreementRuntimeApplyActions } = await import(
      '@/hooks/erp/hr/useCompanyAgreementRuntimeApplyActions'
    );
    let actions: ReturnType<typeof useCompanyAgreementRuntimeApplyActions> | null = null;
    function Probe() {
      actions = useCompanyAgreementRuntimeApplyActions();
      return null;
    }
    render(<Probe />);
    await act(async () => {
      // @ts-expect-error indexed call
      await actions![method](payload);
    });
    return supabase.functions.invoke as unknown as { mock: { calls: unknown[][] } };
  }

  it('activate calls edge with action=activate', async () => {
    const invoke = await runAction('activate', {
      requestId: 'r1',
      companyId: 'c1',
    });
    expect(invoke).toHaveBeenCalledWith(
      'erp-hr-company-agreement-runtime-apply',
      expect.objectContaining({
        body: expect.objectContaining({ action: 'activate' }),
      }),
    );
  });

  it('forwards the current access token to the protected runtime edge', async () => {
    const invoke = await runAction('activate', {
      requestId: 'r1',
      companyId: 'c1',
    });
    expect(invoke).toHaveBeenCalledWith(
      'erp-hr-company-agreement-runtime-apply',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-runtime-token',
        }),
      }),
    );
  });

  it('rollback calls edge with action=rollback and reason', async () => {
    const invoke = await runAction('rollback', {
      requestId: 'r1',
      companyId: 'c1',
      reason: 'motivo suficientemente largo',
    });
    const body = invoke.mock.calls[0][1] as { body: Record<string, unknown> };
    expect(body.body.action).toBe('rollback');
    expect(body.body.reason).toBe('motivo suficientemente largo');
  });

  it('secondApprove forwards acknowledgements', async () => {
    const invoke = await runAction('secondApprove', {
      requestId: 'r1',
      companyId: 'c1',
      acknowledgements: {
        understands_runtime_enable: true,
        reviewed_comparison_report: true,
        reviewed_payroll_impact: true,
        confirms_rollback_available: true,
      },
    });
    const body = (invoke.mock.calls[0][1] as { body: Record<string, unknown> }).body;
    expect(body.action).toBe('second_approve');
    expect(body.acknowledgements).toEqual({
      understands_runtime_enable: true,
      reviewed_comparison_report: true,
      reviewed_payroll_impact: true,
      confirms_rollback_available: true,
    });
  });

  it('hook strips forbidden payload keys before invoking edge', async () => {
    const invoke = await runAction('activate', {
      requestId: 'r1',
      companyId: 'c1',
      second_approved_by: 'attacker',
      second_approved_at: '2026-01-01',
      is_current: true,
      activation_run_id: 'forged',
      rollback_run_id: 'forged',
      request_status: 'activated',
      use_registry_for_payroll: true,
      ready_for_payroll: true,
      requires_human_review: false,
      data_completeness: 'human_validated',
      salary_tables_loaded: true,
      source_quality: 'official',
      HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL: true,
      persisted_priority_apply: true,
      C3B3C2: 'unlocked',
      signature_hash: 'forged',
      run_signature_hash: 'forged',
      executed_by: 'attacker',
      executed_at: '2026-01-01',
      activated_by: 'attacker',
      activated_at: '2026-01-01',
    } as unknown as Record<string, unknown>);
    const body = (invoke.mock.calls[0][1] as { body: Record<string, unknown> }).body;
    for (const k of [
      'second_approved_by',
      'second_approved_at',
      'is_current',
      'activation_run_id',
      'rollback_run_id',
      'request_status',
      'use_registry_for_payroll',
      'ready_for_payroll',
      'requires_human_review',
      'data_completeness',
      'salary_tables_loaded',
      'source_quality',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'persisted_priority_apply',
      'C3B3C2',
      'signature_hash',
      'run_signature_hash',
      'executed_by',
      'executed_at',
      'activated_by',
      'activated_at',
    ]) {
      expect(body[k]).toBeUndefined();
    }
    expect(body.action).toBe('activate');
    expect(body.requestId).toBe('r1');
    expect(body.companyId).toBe('c1');
  });
});