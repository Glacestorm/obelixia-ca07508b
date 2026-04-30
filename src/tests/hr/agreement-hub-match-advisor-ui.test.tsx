/**
 * B12.3B — UI behavior for the Registry match advisor inside the Hub
 * detail drawer.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const TIC_NAC = {
  id: 'reg-tic-nac',
  internal_code: 'TIC-NAC',
  official_name:
    'XIX Convenio colectivo estatal de empresas de consultoría, tecnologías de la información y estudios de mercado y de la opinión pública',
  jurisdiction_code: 'ES',
  data_completeness: 'metadata_only',
  source_quality: 'medium',
  ready_for_payroll: false,
  cnae_codes: null,
};

vi.mock('@/integrations/supabase/client', () => {
  const fromImpl = vi.fn(() => ({
    select: vi.fn(() => ({
      limit: vi.fn().mockResolvedValue({ data: [TIC_NAC], error: null }),
    })),
  }));
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'tok' } },
        }),
      },
      from: fromImpl,
      functions: { invoke: vi.fn() },
    },
  };
});

import { AgreementUnifiedDetailDrawer } from '@/components/erp/hr/collective-agreements/hub/AgreementUnifiedDetailDrawer';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

function rowConsultorias(): UnifiedAgreementRow {
  return {
    key: 'CONSULTORIAS_ESTATAL_2026',
    display_name:
      'Convenio Colectivo Estatal de Empresas de Consultoría y Estudios de Mercado y de la Opinión Pública',
    origin: 'operative',
    operative: { id: 'op-1', status: 'active' },
    mappings_count: 0,
    runtime_settings_count: 0,
    badges: ['OPERATIVO_ACTUAL', 'MISSING_FROM_REGISTRY'],
  };
}

describe('B12.3B — Hub detail drawer + match advisor', () => {
  it('shows the suggestions card for an operative-only MISSING_FROM_REGISTRY row', async () => {
    render(<AgreementUnifiedDetailDrawer row={rowConsultorias()} open onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('agreement-registry-match-suggestions')).toBeInTheDocument();
    });
  });

  it('renders TIC-NAC as a possible match', async () => {
    render(<AgreementUnifiedDetailDrawer row={rowConsultorias()} open onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('registry-match-row-TIC-NAC')).toBeInTheDocument();
      expect(screen.getByText(/TIC-NAC/)).toBeInTheDocument();
    });
  });

  it('does NOT render forbidden CTAs', async () => {
    const { container } = render(
      <AgreementUnifiedDetailDrawer row={rowConsultorias()} open onOpenChange={() => {}} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('agreement-registry-match-suggestions')).toBeInTheDocument();
    });
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toMatch(/vincular autom[aá]ticamente/);
    expect(html).not.toMatch(/usar en n[oó]mina/);
    expect(html).not.toMatch(/activar para n[oó]mina/);
    expect(html).not.toMatch(/aplicar mapping/);
  });

  it('does not invoke any edge function or write', async () => {
    const supa = await import('@/integrations/supabase/client');
    render(<AgreementUnifiedDetailDrawer row={rowConsultorias()} open onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('agreement-registry-match-suggestions')).toBeInTheDocument();
    });
    expect(supa.supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
