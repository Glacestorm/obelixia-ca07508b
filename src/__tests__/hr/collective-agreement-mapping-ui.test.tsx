/**
 * B10C.2B.2C — Behavioral tests for the internal mapping UI.
 *
 * Verifies banner, gating, dialogs, and edge-routing of all actions.
 * NEVER touches payroll, bridge, flag, resolver or operative tables.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi
        .fn()
        .mockResolvedValue({ data: { success: true, data: [] }, error: null }),
    },
  },
}));

import { CompanyAgreementRegistryMappingPanel } from '@/components/erp/hr/collective-agreements/mappings/CompanyAgreementRegistryMappingPanel';
import { MappingActionDialog } from '@/components/erp/hr/collective-agreements/mappings/MappingActionDialog';
import { MappingStatusBadge } from '@/components/erp/hr/collective-agreements/mappings/MappingStatusBadge';

const baseMapping = {
  id: 'm1',
  mapping_status: 'pending_review' as const,
  registry_agreement_id: 'agr-1',
  registry_version_id: 'ver-1',
  source_type: 'manual',
  is_current: false,
  created_at: new Date().toISOString(),
  approved_at: null,
  created_by: 'u1',
  approved_by: null,
  rationale_json: { signals: ['cnae_match'] },
  evidence_urls: ['https://example.com/x'],
  confidence_score: 0.91,
};

describe('B10C.2B.2C — Mapping panel banner & states', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the mandatory internal-only banner', () => {
    render(
      <CompanyAgreementRegistryMappingPanel
        companyId="c1"
        canManage
        initialMappings={[baseMapping]}
      />,
    );
    expect(
      screen.getByText(/Mapping interno — no activa nómina\./),
    ).toBeInTheDocument();
  });

  it('does not render any forbidden CTA strings', () => {
    const { container } = render(
      <CompanyAgreementRegistryMappingPanel
        companyId="c1"
        canManage
        initialMappings={[baseMapping]}
      />,
    );
    const text = container.textContent ?? '';
    for (const cta of [
      'Aplicar en nómina',
      'Activar payroll',
      'Usar en nómina',
      'Cambiar nómina',
      'Activar flag',
      'Activar para nómina',
      'ready_for_payroll',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
    ]) {
      expect(text.includes(cta)).toBe(false);
    }
  });

  it('canManage=false disables action buttons', () => {
    render(
      <CompanyAgreementRegistryMappingPanel
        companyId="c1"
        canManage={false}
        initialMappings={[baseMapping]}
      />,
    );
    expect(screen.getByTestId('mapping-open-approve')).toBeDisabled();
    expect(screen.getByTestId('mapping-open-reject')).toBeDisabled();
    expect(screen.getByTestId('mapping-open-supersede')).toBeDisabled();
  });

  it('renders all mapping statuses', () => {
    for (const s of [
      'draft',
      'pending_review',
      'approved_internal',
      'rejected',
      'superseded',
    ] as const) {
      const { unmount } = render(<MappingStatusBadge status={s} />);
      expect(screen.getByTestId(`mapping-status-${s}`)).toBeInTheDocument();
      unmount();
    }
  });

  it('disables Approve when rationale has blockers', () => {
    render(
      <CompanyAgreementRegistryMappingPanel
        companyId="c1"
        canManage
        initialMappings={[
          { ...baseMapping, rationale_json: { blockers: ['x'] } },
        ]}
      />,
    );
    expect(screen.getByTestId('mapping-open-approve')).toBeDisabled();
  });
});

describe('B10C.2B.2C — Action dialogs gating', () => {
  it('Reject without reason ≥5 disables confirm', () => {
    const onConfirm = vi.fn();
    render(
      <MappingActionDialog
        open
        onOpenChange={() => {}}
        action="reject"
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByTestId('mapping-action-confirm')).toBeDisabled();
    fireEvent.change(screen.getByTestId('mapping-action-reason'), {
      target: { value: 'abc' },
    });
    expect(screen.getByTestId('mapping-action-confirm')).toBeDisabled();
    fireEvent.change(screen.getByTestId('mapping-action-reason'), {
      target: { value: 'razon ok' },
    });
    expect(screen.getByTestId('mapping-action-confirm')).not.toBeDisabled();
  });

  it('Supersede without reason disables confirm', () => {
    render(
      <MappingActionDialog
        open
        onOpenChange={() => {}}
        action="supersede"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByTestId('mapping-action-confirm')).toBeDisabled();
  });

  it('Approve cnae_suggestion requires the human-confirm checkbox', () => {
    render(
      <MappingActionDialog
        open
        onOpenChange={() => {}}
        action="approve"
        sourceType="cnae_suggestion"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByTestId('mapping-action-confirm')).toBeDisabled();
    fireEvent.click(screen.getByTestId('mapping-action-human-confirm'));
    expect(screen.getByTestId('mapping-action-confirm')).not.toBeDisabled();
  });

  it('Approve with blockers shows warning and disables confirm', () => {
    render(
      <MappingActionDialog
        open
        onOpenChange={() => {}}
        action="approve"
        sourceType="manual"
        hasBlockers
        onConfirm={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId('mapping-action-blockers-warning'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('mapping-action-confirm')).toBeDisabled();
  });
});

describe('B10C.2B.2C — Hook routes through edge function', () => {
  beforeEach(() => vi.clearAllMocks());

  async function runAction(
    method: 'approve' | 'reject' | 'supersede' | 'submitForReview' | 'createDraft' | 'list',
    payload: Record<string, unknown>,
  ) {
    const { supabase } = await import('@/integrations/supabase/client');
    const { useCompanyAgreementRegistryMappingActions } = await import(
      '@/hooks/erp/hr/useCompanyAgreementRegistryMappingActions'
    );
    let actions: ReturnType<typeof useCompanyAgreementRegistryMappingActions> | null = null;
    function Probe() {
      actions = useCompanyAgreementRegistryMappingActions();
      return null;
    }
    render(<Probe />);
    await act(async () => {
      // @ts-expect-error indexed call
      await actions![method](payload);
    });
    return supabase.functions.invoke as unknown as { mock: { calls: unknown[][] } };
  }

  it('approve calls edge with action=approve', async () => {
    const invoke = await runAction('approve', {
      mappingId: 'm1',
      companyId: 'c1',
      humanConfirmed: true,
    });
    expect(invoke).toHaveBeenCalledWith(
      'erp-hr-company-agreement-registry-mapping',
      expect.objectContaining({
        body: expect.objectContaining({ action: 'approve' }),
      }),
    );
  });

  it('reject calls edge with action=reject and reason', async () => {
    const invoke = await runAction('reject', {
      mappingId: 'm1',
      companyId: 'c1',
      reason: 'no procede',
    });
    const body = invoke.mock.calls[0][1] as { body: Record<string, unknown> };
    expect(body.body.action).toBe('reject');
    expect(body.body.reason).toBe('no procede');
  });

  it('supersede calls edge with action=supersede and reason', async () => {
    const invoke = await runAction('supersede', {
      mappingId: 'm1',
      companyId: 'c1',
      reason: 'reemplazar',
    });
    const body = invoke.mock.calls[0][1] as { body: Record<string, unknown> };
    expect(body.body.action).toBe('supersede');
    expect(body.body.reason).toBe('reemplazar');
  });

  it('hook strips forbidden payload keys before invoking edge', async () => {
    const invoke = await runAction('approve', {
      mappingId: 'm1',
      companyId: 'c1',
      approved_by: 'attacker',
      approved_at: '2026-01-01',
      is_current: true,
      ready_for_payroll: true,
      requires_human_review: false,
      data_completeness: 'human_validated',
      salary_tables_loaded: true,
      source_quality: 'official',
      HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL: true,
      persisted_priority_apply: true,
      C3B3C2: 'unlocked',
    } as unknown as Record<string, unknown>);
    const body = (invoke.mock.calls[0][1] as { body: Record<string, unknown> }).body;
    for (const k of [
      'approved_by',
      'approved_at',
      'is_current',
      'ready_for_payroll',
      'requires_human_review',
      'data_completeness',
      'salary_tables_loaded',
      'source_quality',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'persisted_priority_apply',
      'C3B3C2',
    ]) {
      expect(body[k]).toBeUndefined();
    }
    expect(body.action).toBe('approve');
    expect(body.mappingId).toBe('m1');
    expect(body.companyId).toBe('c1');
  });
});