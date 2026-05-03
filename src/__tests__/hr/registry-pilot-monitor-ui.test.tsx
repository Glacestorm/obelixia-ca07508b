/**
 * B10F.5 — Behavioral tests for the read-only registry pilot monitor UI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

const invokeMock = vi.fn();

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
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { RegistryPilotMonitorPanel } from '@/components/erp/hr/collective-agreements/pilot-monitor/RegistryPilotMonitorPanel';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
} from '@/engines/erp/hr/registryPilotGate';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';
import { useRegistryPilotMonitor } from '@/hooks/erp/hr/useRegistryPilotMonitor';
import { renderHook } from '@testing-library/react';

const FORBIDDEN_CTAS = [
  'Activar piloto',
  'Activar nómina',
  'Ejecutar nómina',
  'Aplicar registry',
  'Activar flag',
  'Añadir scope',
  'Quitar scope',
  'Rollback ahora',
  'Log decision',
  'log_decision',
];

const sampleLogs = [
  {
    id: 'log-1',
    company_id: 'c1',
    employee_id: 'e1',
    contract_id: 'k1',
    target_year: 2026,
    runtime_setting_id: 'rs-1',
    mapping_id: 'm-1',
    registry_agreement_id: 'ra-1',
    registry_version_id: 'rv-1',
    decision_outcome: 'pilot_applied',
    decision_reason: 'parity_ok',
    comparison_summary_json: { critical: 0, warnings: 0 },
    blockers_json: [],
    warnings_json: [],
    trace_json: { reason: 'flag_off' },
    decided_by: 'u-1',
    decided_at: '2026-04-29T10:00:00Z',
    signature_hash: 'a'.repeat(64),
    created_at: '2026-04-29T10:00:00Z',
  },
  {
    id: 'log-2',
    company_id: 'c1',
    employee_id: 'e1',
    contract_id: 'k1',
    target_year: 2026,
    runtime_setting_id: null,
    mapping_id: null,
    registry_agreement_id: null,
    registry_version_id: null,
    decision_outcome: 'pilot_blocked',
    decision_reason: 'critical_diff',
    comparison_summary_json: { critical: 1, warnings: 0 },
    blockers_json: ['critical_diff'],
    warnings_json: [],
    trace_json: {},
    decided_by: null,
    decided_at: '2026-04-28T10:00:00Z',
    signature_hash: 'b'.repeat(64),
    created_at: '2026-04-28T10:00:00Z',
  },
  {
    id: 'log-3',
    company_id: 'c1',
    employee_id: 'e1',
    contract_id: 'k1',
    target_year: 2026,
    runtime_setting_id: null,
    mapping_id: null,
    registry_agreement_id: null,
    registry_version_id: null,
    decision_outcome: 'pilot_fallback',
    decision_reason: 'gate_off',
    comparison_summary_json: {},
    blockers_json: [],
    warnings_json: [],
    trace_json: {},
    decided_by: null,
    decided_at: '2026-04-27T10:00:00Z',
    signature_hash: 'c'.repeat(64),
    created_at: '2026-04-27T10:00:00Z',
  },
];

describe('B10F.5 — Registry pilot monitor UI (read-only)', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: { decisions: sampleLogs }, error: null });
  });

  it('flag and pilot mode invariants remain false', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST).toHaveLength(0);
  });

  it('renders read-only banner and subtitle', async () => {
    await act(async () => {
      render(<RegistryPilotMonitorPanel filters={{ companyId: 'c1' }} />);
    });
    expect(screen.getByText(/Modo piloto Registry — solo lectura/)).toBeInTheDocument();
    expect(
      screen.getByText(/La activación global sigue desactivada/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/B10D Runtime Apply/).length).toBeGreaterThan(0);
  });

  it('shows empty allow-list message and gate values', async () => {
    await act(async () => {
      render(<RegistryPilotMonitorPanel filters={{ companyId: 'c1' }} />);
    });
    expect(screen.getByTestId('empty-allowlist').textContent).toMatch(
      /No hay scopes piloto activos/,
    );
    const status = screen.getByTestId('pilot-gate-status');
    expect(status.textContent).toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL/);
    expect(status.textContent).toMatch(/HR_REGISTRY_PILOT_MODE/);
    expect(status.textContent).toMatch(/false/);
    expect(status.textContent).toMatch(/0/);
  });

  it('renders summary applied/blocked/fallback', async () => {
    await act(async () => {
      render(<RegistryPilotMonitorPanel filters={{ companyId: 'c1' }} />);
    });
    await waitFor(() => {
      expect(screen.getByTestId('summary-applied').textContent).toMatch(/applied: 1/);
    });
    expect(screen.getByTestId('summary-blocked').textContent).toMatch(/blocked: 1/);
    expect(screen.getByTestId('summary-fallback').textContent).toMatch(/fallback: 1/);
  });

  it('renders decision log table with signature_hash', async () => {
    await act(async () => {
      render(<RegistryPilotMonitorPanel filters={{ companyId: 'c1' }} />);
    });
    await waitFor(() => {
      expect(screen.getAllByTestId('pilot-log-row').length).toBe(3);
    });
    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument();
  });

  it('renders rollback info card mentioning B10D', async () => {
    await act(async () => {
      render(<RegistryPilotMonitorPanel filters={{ companyId: 'c1' }} />);
    });
    const card = screen.getByTestId('pilot-rollback-info');
    expect(card.textContent).toMatch(/B10D Runtime Apply/);
  });

  it('does not render any forbidden CTA strings or buttons', async () => {
    const { container } = await act(async () => {
      return render(<RegistryPilotMonitorPanel filters={{ companyId: 'c1' }} />);
    });
    const text = container.textContent ?? '';
    for (const cta of FORBIDDEN_CTAS) {
      expect(text.includes(cta), `forbidden CTA: ${cta}`).toBe(false);
    }
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('hook calls edge with action list_decisions and never log_decision', async () => {
    renderHook(() => useRegistryPilotMonitor({ companyId: 'c1' }));
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalled();
    });
    const [fnName, payload] = invokeMock.mock.calls[0];
    expect(fnName).toBe('erp-hr-pilot-runtime-decision-log');
    expect(payload.body.action).toBe('list_decisions');
    for (const call of invokeMock.mock.calls) {
      expect(call[1].body.action).not.toBe('log_decision');
    }
  });
});