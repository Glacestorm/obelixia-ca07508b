import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    functions: { invoke: vi.fn() },
    from: vi.fn(),
  },
}));

import { AgreementIncorporationWizard } from '@/components/erp/hr/collective-agreements/hub/wizard/AgreementIncorporationWizard';
import { AgreementMissingCandidateGuide } from '@/components/erp/hr/collective-agreements/hub/AgreementMissingCandidateGuide';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

function row(partial: Partial<UnifiedAgreementRow>): UnifiedAgreementRow {
  return {
    key: 'K',
    display_name: 'Conv',
    origin: 'operative',
    mappings_count: 0,
    runtime_settings_count: 0,
    badges: [],
    ...partial,
  };
}

const FORBIDDEN = [
  /usar en n[oó]mina/,
  /activar para n[oó]mina/,
  /activar n[oó]mina/,
  /aplicar en payroll/,
  /cambiar n[oó]mina/,
  /activar flag/,
  /activar payroll/,
  /usar convenio en n[oó]mina/,
];

function assertNoForbidden(html: string) {
  const lower = html.toLowerCase();
  for (const re of FORBIDDEN) expect(lower).not.toMatch(re);
}

describe('B12.3 — AgreementIncorporationWizard UI', () => {
  it('LEGACY_ONLY shows safety banner and CTA suggestion', () => {
    const r = row({ origin: 'operative', operative: { id: 'op' } });
    render(<AgreementIncorporationWizard row={r} open onOpenChange={() => {}} />);
    expect(screen.getByTestId('wizard-safety-banner')).toBeInTheDocument();
    expect(screen.getByText(/Preparar incorporación/)).toBeInTheDocument();
  });

  it('REGISTRY_METADATA_ONLY shows "Completar fuente oficial"', () => {
    const r = row({ origin: 'registry', registry: { id: 'r', data_completeness: 'metadata_only' } });
    const { container } = render(<AgreementIncorporationWizard row={r} open onOpenChange={() => {}} />);
    expect(screen.getByText(/Completar fuente oficial/)).toBeInTheDocument();
    assertNoForbidden(container.innerHTML);
  });

  it('REGISTRY_PARSED_PARTIAL shows "Enviar a validación humana"', () => {
    const r = row({ origin: 'registry', registry: { id: 'r', salary_tables_loaded: true, ready_for_payroll: false } });
    const { container } = render(<AgreementIncorporationWizard row={r} open onOpenChange={() => {}} />);
    expect(screen.getByText(/Enviar a validación humana/)).toBeInTheDocument();
    assertNoForbidden(container.innerHTML);
  });

  it('REGISTRY_READY shows "Preparar mapping"', () => {
    const r = row({ origin: 'both', operative: { id: 'op' }, registry: { id: 'r', ready_for_payroll: true } });
    const { container } = render(<AgreementIncorporationWizard row={r} open onOpenChange={() => {}} />);
    expect(screen.getAllByText(/Preparar mapping/).length).toBeGreaterThan(0);
    assertNoForbidden(container.innerHTML);
  });

  it('UNKNOWN does not show any dangerous CTA', () => {
    const r = row({ origin: 'candidate' });
    const { container } = render(<AgreementIncorporationWizard row={r} open onOpenChange={() => {}} />);
    assertNoForbidden(container.innerHTML);
  });

  it('Wizard renders without session and without network calls', async () => {
    const supa = await import('@/integrations/supabase/client');
    const r = row({ origin: 'operative', operative: { id: 'op' } });
    render(<AgreementIncorporationWizard row={r} open onOpenChange={() => {}} />);
    expect(supa.supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('AgreementMissingCandidateGuide is still accessible', () => {
    render(<AgreementMissingCandidateGuide />);
    expect(screen.getByTestId('agreement-missing-candidate-guide')).toBeInTheDocument();
  });
});
