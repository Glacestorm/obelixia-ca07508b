/**
 * B12.2 — Behavioral tests for the Centro de Convenios (Hub UI).
 *
 * NEVER touches payroll, bridge, flags, resolver or operative tables.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = chain;
  builder.eq = chain;
  builder.contains = chain;
  builder.or = chain;
  builder.limit = vi.fn().mockResolvedValue({ data: [], error: null });
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'tok' } },
        }),
      },
      functions: { invoke: vi.fn().mockResolvedValue({ data: { success: true, data: [] }, error: null }) },
      from: vi.fn(() => builder),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
    },
  };
});

import { AgreementHubPanel } from '@/components/erp/hr/collective-agreements/hub/AgreementHubPanel';
import { AgreementUnifiedResultsTable } from '@/components/erp/hr/collective-agreements/hub/AgreementUnifiedResultsTable';
import { AgreementMissingCandidateGuide } from '@/components/erp/hr/collective-agreements/hub/AgreementMissingCandidateGuide';
import { AgreementStatusBadges } from '@/components/erp/hr/collective-agreements/hub/AgreementStatusBadges';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

function rowOperative(): UnifiedAgreementRow {
  return {
    key: 'OP-001',
    display_name: 'Convenio operativo X',
    origin: 'operative',
    operative: { id: 'op-1', status: 'active' },
    mappings_count: 0,
    runtime_settings_count: 0,
    badges: ['OPERATIVO_ACTUAL', 'MISSING_FROM_REGISTRY'],
  };
}
function rowRegistry(): UnifiedAgreementRow {
  return {
    key: 'REG-001',
    display_name: 'Convenio registry Y',
    origin: 'registry',
    registry: {
      id: 'r-1',
      data_completeness: 'metadata_only',
      ready_for_payroll: false,
      requires_human_review: false,
    },
    mappings_count: 0,
    runtime_settings_count: 0,
    badges: ['REGISTRY_METADATA_ONLY'],
  };
}
function rowBoth(): UnifiedAgreementRow {
  return {
    key: 'BOTH-001',
    display_name: 'Convenio mixto Z',
    origin: 'both',
    operative: { id: 'op-2' },
    registry: { id: 'r-2', ready_for_payroll: false },
    mappings_count: 1,
    runtime_settings_count: 1,
    badges: ['OPERATIVO_ACTUAL'],
  };
}

describe('B12.2 — Agreement Hub UI', () => {
  it('renders the Hub with all required tabs', () => {
    render(<AgreementHubPanel companyId="c1" />);
    expect(screen.getByTestId('agreement-hub-panel')).toBeInTheDocument();
    for (const t of ['Buscador', 'Operativos', 'Registry', 'Validación', 'Mapping', 'Runtime', 'Piloto', 'No encontrado']) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
  });

  it('renders the unified search filters', () => {
    render(<AgreementHubPanel companyId="c1" />);
    expect(screen.getByTestId('agreement-unified-search')).toBeInTheDocument();
    expect(screen.getByLabelText('Texto libre')).toBeInTheDocument();
    expect(screen.getByLabelText('Internal code')).toBeInTheDocument();
    expect(screen.getByLabelText('CNAE')).toBeInTheDocument();
  });

  it('table can show an operative-only result', () => {
    render(<AgreementUnifiedResultsTable rows={[rowOperative()]} onSelect={() => {}} />);
    expect(screen.getByText('Convenio operativo X')).toBeInTheDocument();
    expect(screen.getByText('OPERATIVO_ACTUAL')).toBeInTheDocument();
  });

  it('table can show a registry-only result', () => {
    render(<AgreementUnifiedResultsTable rows={[rowRegistry()]} onSelect={() => {}} />);
    expect(screen.getByText('Convenio registry Y')).toBeInTheDocument();
    expect(screen.getByText('REGISTRY_METADATA_ONLY')).toBeInTheDocument();
  });

  it('table can show a both-origin result', () => {
    render(<AgreementUnifiedResultsTable rows={[rowBoth()]} onSelect={() => {}} />);
    expect(screen.getByText('Convenio mixto Z')).toBeInTheDocument();
    expect(screen.getByText('Operativa + Registry')).toBeInTheDocument();
  });

  it('"No encontrado" tab shows the 10-step checklist', () => {
    render(<AgreementMissingCandidateGuide />);
    const card = screen.getByTestId('agreement-missing-candidate-guide');
    const items = card.querySelectorAll('ol > li');
    expect(items.length).toBe(10);
  });

  it('does NOT render any "usar en nómina" or "Activar para nómina" CTA', async () => {
    const { container } = render(<AgreementHubPanel companyId="c1" />);
    // search and reveal results table
    const button = screen.getByRole('button', { name: /Buscar/i });
    fireEvent.click(button);
    await waitFor(() => {
      // panel still mounted
      expect(screen.getByTestId('agreement-hub-panel')).toBeInTheDocument();
    });
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toMatch(/usar en n[oó]mina/);
    expect(html).not.toMatch(/activar para n[oó]mina/);
  });

  it('badges component renders the provided badges', () => {
    render(<AgreementStatusBadges badges={['OPERATIVO_ACTUAL', 'NEEDS_HUMAN_REVIEW']} />);
    expect(screen.getByText('OPERATIVO_ACTUAL')).toBeInTheDocument();
    expect(screen.getByText('NEEDS_HUMAN_REVIEW')).toBeInTheDocument();
  });
});

describe('B12.2 — Agreement Hub UI without session', () => {
  it('does not crash and shows auth-required state when no session', async () => {
    const mod = await import('@/integrations/supabase/client');
    (mod.supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { session: null },
    });
    render(<AgreementHubPanel companyId="c1" />);
    fireEvent.click(screen.getByRole('button', { name: /Buscar/i }));
    await waitFor(() => {
      expect(screen.getByTestId('registry-auth-required')).toBeInTheDocument();
    });
  });
});