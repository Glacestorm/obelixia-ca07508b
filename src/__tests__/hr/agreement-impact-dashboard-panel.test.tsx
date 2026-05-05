/**
 * B13.5C — Behavioural tests for the impact dashboard UI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react';
import React from 'react';

const invokeMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) => getSessionMock(...a),
      refreshSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: 't' } } }),
    },
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

import { AgreementImpactDashboardPanel } from '@/components/erp/hr/collective-agreements/curated/impact/AgreementImpactDashboardPanel';

const sampleScope = {
  id: 'sc-1',
  agreement_id: 'agr-1',
  version_id: 'ver-1',
  company_id: 'c-1',
  employee_count_estimated: 12,
  computed_at: '2026-05-05T10:00:00Z',
  summary_json: {},
  risk_flags: [],
  blockers_json: [],
  warnings_json: [],
};
const samplePreview = {
  id: 'pv-1',
  affected_scope_id: 'sc-1',
  agreement_id: 'agr-1',
  version_id: 'ver-1',
  company_id: 'c-1',
  employee_id: 'emp-1',
  contract_id: null,
  affected: true,
  blocked: false,
  current_salary_monthly: 1500,
  target_salary_monthly: 1600,
  delta_monthly: 100,
  delta_annual: 1200,
  arrears_estimate: 300,
  employer_cost_delta: 132,
  risk_flags: ['LARGE_DELTA'],
  blockers_json: [],
  warnings_json: ['MISSING_CONCEPT'],
  requires_human_review: true as const,
  computed_at: '2026-05-05T10:00:00Z',
};

function authedSession() {
  getSessionMock.mockResolvedValue({ data: { session: { access_token: 't' } } });
}

function setupInvoke() {
  invokeMock.mockImplementation(async (_fn: string, opts: { body: { action: string } }) => {
    const action = opts.body.action;
    if (action === 'list_scopes') return { data: { success: true, data: [sampleScope] }, error: null };
    if (action === 'list_previews') return { data: { success: true, data: [samplePreview] }, error: null };
    if (action === 'compute_scope')
      return { data: { success: true, data: { scope: sampleScope, previews: [samplePreview] } }, error: null };
    if (action === 'compute_impact_preview')
      return { data: { success: true, data: { scope: sampleScope, previews: [samplePreview] } }, error: null };
    if (action === 'mark_preview_stale') return { data: { success: true, data: samplePreview }, error: null };
    return { data: { success: true, data: [] }, error: null };
  });
}

beforeEach(() => {
  invokeMock.mockReset();
  getSessionMock.mockReset();
});

describe('B13.5C — AgreementImpactDashboardPanel', () => {
  it('renders the no-apply banner', async () => {
    authedSession();
    setupInvoke();
    await act(async () => {
      render(<AgreementImpactDashboardPanel />);
    });
    expect(
      screen.getByText(/no aplican nómina, no crean mapping y no activan convenios/i),
    ).toBeInTheDocument();
  });

  it('renders auth-required state without crashing when no session', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    invokeMock.mockResolvedValue({ data: { success: true, data: [] }, error: null });
    await act(async () => {
      render(<AgreementImpactDashboardPanel />);
    });
    await waitFor(() => {
      expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument();
    });
  });

  it('renders summary KPI cards, scopes table and previews table', async () => {
    authedSession();
    setupInvoke();
    await act(async () => {
      render(<AgreementImpactDashboardPanel />);
    });
    await waitFor(() => {
      expect(screen.getByTestId('impact-scopes-table')).toBeInTheDocument();
      expect(screen.getByTestId('impact-previews-table')).toBeInTheDocument();
    });
    expect(screen.getByTestId('impact-kpi-Empresas escaneadas')).toHaveTextContent('1');
    expect(screen.getByTestId('impact-kpi-Empleados afectados')).toHaveTextContent('1');
  });

  it('opens compute dialog with the no-modification notice', async () => {
    authedSession();
    setupInvoke();
    await act(async () => {
      render(<AgreementImpactDashboardPanel />);
    });
    fireEvent.click(screen.getByRole('button', { name: /Calcular preview/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/no modifica nóminas ni empleados/i),
      ).toBeInTheDocument();
    });
  });

  it('compute_scope is called when no employee_id provided', async () => {
    authedSession();
    setupInvoke();
    await act(async () => {
      render(<AgreementImpactDashboardPanel />);
    });
    fireEvent.click(screen.getByRole('button', { name: /Calcular preview/i }));
    const dialog = await screen.findByRole('dialog');
    const inputs = within(dialog).getAllByRole('textbox');
    // agreement_id, version_id, company_id, employee_id, contract_id (5 textboxes), then employer mult
    fireEvent.change(inputs[0], { target: { value: 'agr-1' } });
    fireEvent.change(inputs[1], { target: { value: 'ver-1' } });
    fireEvent.change(inputs[2], { target: { value: 'c-1' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /Calcular preview/i }));
    });
    const calls = invokeMock.mock.calls.map((c) => (c[1] as { body: { action: string } }).body.action);
    expect(calls).toContain('compute_scope');
    expect(calls).not.toContain('compute_impact_preview');
  });

  it('compute_impact_preview is called when employee_id is provided', async () => {
    authedSession();
    setupInvoke();
    await act(async () => {
      render(<AgreementImpactDashboardPanel />);
    });
    fireEvent.click(screen.getByRole('button', { name: /Calcular preview/i }));
    const dialog = await screen.findByRole('dialog');
    const inputs = within(dialog).getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'agr-1' } });
    fireEvent.change(inputs[1], { target: { value: 'ver-1' } });
    fireEvent.change(inputs[2], { target: { value: 'c-1' } });
    fireEvent.change(inputs[3], { target: { value: 'emp-1' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /Calcular preview/i }));
    });
    const calls = invokeMock.mock.calls.map((c) => (c[1] as { body: { action: string } }).body.action);
    expect(calls).toContain('compute_impact_preview');
  });

  it('detail drawer shows monthly/annual delta and warnings', async () => {
    authedSession();
    setupInvoke();
    await act(async () => {
      render(<AgreementImpactDashboardPanel />);
    });
    await waitFor(() => screen.getByTestId('impact-previews-table'));
    fireEvent.click(screen.getByRole('button', { name: /Ver detalle/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText(/Δ mensual/).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText(/Δ anual/).length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/MISSING_CONCEPT/)).toBeInTheDocument();
    expect(within(dialog).getByText(/LARGE_DELTA/)).toBeInTheDocument();
  });

  it('mark obsolete invokes mark_preview_stale', async () => {
    authedSession();
    setupInvoke();
    await act(async () => {
      render(<AgreementImpactDashboardPanel />);
    });
    await waitFor(() => screen.getByTestId('impact-previews-table'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Marcar obsoleto/i }));
    });
    const calls = invokeMock.mock.calls.map((c) => (c[1] as { body: { action: string } }).body.action);
    expect(calls).toContain('mark_preview_stale');
  });

  it('does not render forbidden CTAs', async () => {
    authedSession();
    setupInvoke();
    await act(async () => {
      render(<AgreementImpactDashboardPanel />);
    });
    const forbidden = [
      /aplicar nómina/i,
      /activar convenio/i,
      /generar cra/i,
      /generar siltra/i,
      /generar sepa/i,
      /ready_for_payroll/i,
      /marcar listo para nómina/i,
      /usar en nómina/i,
    ];
    for (const re of forbidden) {
      expect(screen.queryByText(re)).toBeNull();
    }
  });
});