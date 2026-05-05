/**
 * B13.6 — Behavioural tests for the Curated Agreements shell.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const invokeMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) => getSessionMock(...a),
      refreshSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null } }),
    },
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

import { CuratedAgreementsPanel } from '@/components/erp/hr/collective-agreements/curated/shell/CuratedAgreementsPanel';

beforeEach(() => {
  invokeMock.mockReset();
  getSessionMock.mockReset();
  // Default: no session → subpanels go into authRequired mode
  getSessionMock.mockResolvedValue({ data: { session: null } });
  invokeMock.mockResolvedValue({ data: null, error: null });
});

describe('B13.6 — Curated Agreements shell', () => {
  it('renders the title "Convenios Curados"', () => {
    render(<CuratedAgreementsPanel />);
    expect(screen.getByText('Convenios Curados')).toBeInTheDocument();
  });

  it('renders the no-auto-apply banner', () => {
    render(<CuratedAgreementsPanel />);
    expect(screen.getByLabelText('curated-no-auto-apply-banner')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Ningún cambio se aplica a nómina sin B8A\/B8B\/B9 \+ Mapping \+ Runtime Apply\./,
      ),
    ).toBeInTheDocument();
  });

  it('renders all six pipeline tabs', () => {
    render(<CuratedAgreementsPanel />);
    for (const label of [
      'Fuentes detectadas',
      'Documentos pendientes',
      'Extracción',
      'Revisión humana',
      'Impacto económico',
      'Aplicación controlada',
    ]) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  it('Aplicación controlada tab shows steps B8A/B8B/B9 → Mapping → Runtime', async () => {
    render(<CuratedAgreementsPanel defaultTab="apply" />);
    await waitFor(() => {
      expect(screen.getByLabelText('curated-controlled-apply')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/B8A\/B8B/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Mapping aprobado/i)).toBeInTheDocument();
    expect(screen.getByText(/Runtime Apply activado/i)).toBeInTheDocument();
  });

  it('allowed buttons fire onNavigate callback only (no edge invoke)', async () => {
    const onNavigate = vi.fn();
    render(<CuratedAgreementsPanel defaultTab="apply" onNavigate={onNavigate} />);
    await waitFor(() => {
      expect(screen.getByLabelText('curated-action-registry-mapping')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('curated-action-registry-mapping'));
    fireEvent.click(screen.getByLabelText('curated-action-registry-runtime-apply'));
    fireEvent.click(screen.getByLabelText('curated-action-registry-pilot-monitor'));
    fireEvent.click(screen.getByLabelText('curated-action-agreement-hub'));
    fireEvent.click(screen.getByLabelText('curated-action-rollback-guide'));

    expect(onNavigate).toHaveBeenCalledWith('registry-mapping');
    expect(onNavigate).toHaveBeenCalledWith('registry-runtime-apply');
    expect(onNavigate).toHaveBeenCalledWith('registry-pilot-monitor');
    expect(onNavigate).toHaveBeenCalledWith('agreement-hub');
    expect(onNavigate).toHaveBeenCalledWith('rollback-guide');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('does not render forbidden apply CTAs anywhere in the shell', () => {
    const { container } = render(<CuratedAgreementsPanel defaultTab="apply" />);
    const txt = container.textContent ?? '';
    expect(txt).not.toMatch(/Aplicar nómina/i);
    expect(txt).not.toMatch(/Ejecutar nómina/i);
    expect(txt).not.toMatch(/Activar convenio/i);
    expect(txt).not.toMatch(/Generar CRA/i);
    expect(txt).not.toMatch(/Generar SILTRA/i);
    expect(txt).not.toMatch(/Generar SEPA/i);
    expect(txt).not.toMatch(/Marcar listo para nómina/i);
  });

  it('renders without throwing when subpanels are in authRequired state', async () => {
    expect(() => render(<CuratedAgreementsPanel />)).not.toThrow();
    // Status overview always renders with N/D when no counts provided
    expect(screen.getByLabelText('curated-status-overview')).toBeInTheDocument();
  });
});