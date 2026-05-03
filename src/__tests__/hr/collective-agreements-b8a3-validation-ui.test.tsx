/**
 * B8A.3 — UI behavioral tests (banner, blocked CTAs, edge routing).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { NotOfficialBanner } from '@/components/erp/hr/collective-agreements/internal/NotOfficialBanner';
import { AgreementSourceHashCard } from '@/components/erp/hr/collective-agreements/AgreementSourceHashCard';
import { AgreementSalaryRowsReviewTable } from '@/components/erp/hr/collective-agreements/AgreementSalaryRowsReviewTable';
import { ChecklistItemRow } from '@/components/erp/hr/collective-agreements/internal/ChecklistItemRow';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: 'test-token' } } }),
      refreshSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: 'test-token' } } }),
    },
    functions: { invoke: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }) },
  },
}));

describe('B8A.3 UI — banner & cards', () => {
  it('NotOfficialBanner shows the canonical text', () => {
    render(<NotOfficialBanner />);
    expect(
      screen.getByText(/Validación interna — no oficial\. No activa el uso en nómina\./i),
    ).toBeInTheDocument();
  });

  it('SourceHashCard shows mismatch alert when hashes differ', () => {
    render(
      <AgreementSourceHashCard
        source={{ document_hash: 'a'.repeat(64), document_url: 'https://x' }}
        version={{ source_hash: 'b'.repeat(64) }}
      />,
    );
    expect(screen.getByTestId('sha-mismatch-alert')).toBeInTheDocument();
  });

  it('SalaryRows show sourcePage and sourceExcerpt', () => {
    render(
      <AgreementSalaryRowsReviewTable
        rows={[{ id: '1', professional_group: 'G1', source_page: 7, source_excerpt: 'ext' }]}
      />,
    );
    expect(screen.getByTestId('row-source-page').textContent).toContain('7');
    expect(screen.getByTestId('row-source-excerpt').textContent).toContain('ext');
  });

  it('ChecklistItemRow disables Save when accepted_with_caveat lacks comment', () => {
    const onSave = vi.fn();
    render(
      <ChecklistItemRow itemKey="salary_base_reviewed" initialStatus="accepted_with_caveat" onSave={onSave} />,
    );
    const btn = screen.getByRole('button', { name: /Guardar/i });
    expect(btn).toBeDisabled();
  });
});

describe('B8A.3 UI — actions hook routes via edge function', () => {
  beforeEach(() => vi.clearAllMocks());
  it('approve calls functions.invoke with action=approve', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { useCollectiveAgreementValidationActions } = await import(
      '@/hooks/erp/hr/useCollectiveAgreementValidationActions'
    );
    let actions: ReturnType<typeof useCollectiveAgreementValidationActions> | null = null;
    function Probe() {
      actions = useCollectiveAgreementValidationActions();
      return null;
    }
    render(<Probe />);
    await actions!.approve({ validationId: '00000000-0000-0000-0000-000000000001' });
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'erp-hr-collective-agreement-validation',
      expect.objectContaining({
        body: expect.objectContaining({ action: 'approve' }),
      }),
    );
    const body = (supabase.functions.invoke as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as { body: Record<string, unknown> };
    for (const k of [
      'ready_for_payroll',
      'data_completeness',
      'salary_tables_loaded',
      'requires_human_review',
      'official_submission_blocked',
      'validation_status',
      'signature_hash',
      'validated_at',
      'is_current',
    ]) {
      expect(Object.prototype.hasOwnProperty.call(body.body, k)).toBe(false);
    }
  });
});
