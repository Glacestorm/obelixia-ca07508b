/**
 * B11.1C — UI guards: AgreementUnifiedDetailDrawer must show a
 * REQUIERE_CONVENIO_TERRITORIAL blocker for AGRO-NAC and must NOT show
 * any advance CTA (wizard / parser / validation / mapping / activation).
 */
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

vi.mock('@/hooks/erp/hr/useAgreementRegistryMatchAdvisor', () => ({
  useAgreementRegistryMatchAdvisor: () => ({
    enabled: false,
    authRequired: false,
    loading: false,
    candidates: [],
  }),
}));

import AgreementUnifiedDetailDrawer from '@/components/erp/hr/collective-agreements/hub/AgreementUnifiedDetailDrawer';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

function row(partial: Partial<UnifiedAgreementRow>): UnifiedAgreementRow {
  return {
    key: 'AGRO-NAC',
    display_name: 'Convenio del Sector Agrario',
    origin: 'registry',
    mappings_count: 0,
    runtime_settings_count: 0,
    badges: [],
    registry: {
      id: 'ca364025-3856-4822-a3be-90d4dbbbd254',
      status: 'pendiente_validacion',
      source_quality: 'legacy_static',
      data_completeness: 'metadata_only',
      salary_tables_loaded: false,
      ready_for_payroll: false,
      requires_human_review: true,
    },
    ...partial,
  };
}

const FORBIDDEN_CTA = [
  /preparar incorporación/i,
  /completar fuente oficial/i,
  /enviar a validación humana/i,
  /preparar mapping/i,
  /usar en nómina/i,
  /activar para nómina/i,
  /activar payroll/i,
];

describe('B11.1C — AGRO-NAC territorial blocker UI', () => {
  it('shows REQUIERE_CONVENIO_TERRITORIAL badge and recommendation', () => {
    render(
      <AgreementUnifiedDetailDrawer
        row={row({})}
        open
        onOpenChange={() => {}}
        onStartWizard={() => {}}
      />,
    );
    expect(screen.getByTestId('agreement-territorial-blocker')).toBeInTheDocument();
    expect(screen.getByTestId('agreement-territorial-badge').textContent).toMatch(
      /REQUIERE_CONVENIO_TERRITORIAL/,
    );
    expect(
      screen.getByText(/No activable como convenio estatal genérico/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Para usar el sector agrario en nómina debe seleccionarse un convenio territorial concreto/i,
      ),
    ).toBeInTheDocument();
  });

  it('suppresses any wizard / parser / validation / mapping / activation CTA for AGRO-NAC', () => {
    const { container } = render(
      <AgreementUnifiedDetailDrawer
        row={row({})}
        open
        onOpenChange={() => {}}
        onStartWizard={() => {}}
      />,
    );
    expect(screen.queryByTestId('agreement-wizard-cta')).not.toBeInTheDocument();
    const html = container.innerHTML;
    for (const re of FORBIDDEN_CTA) {
      expect(html).not.toMatch(re);
    }
  });

  it('non-generic agreements (e.g. TIC-NAC) still show the normal flow CTA', () => {
    const ticNac = row({
      key: 'TIC-NAC',
      display_name: 'XIX Convenio TIC',
      registry: {
        id: '1e665f80-3f04-4939-a448-4b1a2a4525e0',
        status: 'pendiente_validacion',
        source_quality: 'legacy_static',
        data_completeness: 'metadata_only',
        salary_tables_loaded: false,
        ready_for_payroll: false,
        requires_human_review: true,
      },
    });
    render(
      <AgreementUnifiedDetailDrawer
        row={ticNac}
        open
        onOpenChange={() => {}}
        onStartWizard={() => {}}
      />,
    );
    expect(screen.queryByTestId('agreement-territorial-blocker')).not.toBeInTheDocument();
    expect(screen.getByTestId('agreement-wizard-cta')).toBeInTheDocument();
  });
});