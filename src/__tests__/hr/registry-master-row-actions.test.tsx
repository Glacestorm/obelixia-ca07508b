/**
 * B12.4 — Row-level safe actions in RegistryMasterPanel.
 *
 * Verifies:
 *  - Acciones column is rendered.
 *  - State-specific CTAs ("Preparar incorporación", "Enviar a validación",
 *    "Preparar mapping") render under the correct conditions.
 *  - No forbidden CTA labels ("Usar en nómina", "Activar para nómina").
 *  - No DB writes / no edge invokes are triggered by clicking actions.
 *  - The panel source does not import payroll-related modules.
 *  - Registry flags + allow-list remain untouched.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';

const spies = vi.hoisted(() => ({
  insertSpy: vi.fn(),
  updateSpy: vi.fn(),
  deleteSpy: vi.fn(),
  upsertSpy: vi.fn(),
  rpcSpy: vi.fn(),
  invokeSpy: vi.fn(),
}));
const { insertSpy, updateSpy, deleteSpy, upsertSpy, rpcSpy, invokeSpy } = spies;

vi.mock('@/integrations/supabase/client', () => {
  const order = vi.fn().mockResolvedValue({
    data: [
      {
        id: 'r-meta',
        internal_code: 'META_ONLY_CODE',
        official_name: 'Convenio metadata only',
        status: 'pendiente_validacion',
        source_quality: 'low',
        data_completeness: 'metadata_only',
        salary_tables_loaded: false,
        ready_for_payroll: false,
        requires_human_review: true,
      },
      {
        id: 'r-parsed',
        internal_code: 'PARSED_PARTIAL_CODE',
        official_name: 'Convenio parsed partial',
        status: 'pendiente_validacion',
        source_quality: 'medium',
        data_completeness: 'parsed',
        salary_tables_loaded: true,
        ready_for_payroll: false,
        requires_human_review: true,
      },
      {
        id: 'r-ready',
        internal_code: 'READY_CODE',
        official_name: 'Convenio ready for payroll',
        status: 'vigente',
        source_quality: 'high',
        data_completeness: 'full',
        salary_tables_loaded: true,
        ready_for_payroll: true,
        requires_human_review: false,
      },
    ],
    error: null,
  });
  const select = vi.fn().mockReturnValue({ order });
  const from = vi.fn().mockReturnValue({
    select,
    insert: spies.insertSpy,
    update: spies.updateSpy,
    delete: spies.deleteSpy,
    upsert: spies.upsertSpy,
  });
  return {
    supabase: {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
      functions: { invoke: spies.invokeSpy },
      from,
      rpc: spies.rpcSpy,
    },
  };
});

import { RegistryMasterPanel } from '@/components/erp/hr/collective-agreements/registry-master/RegistryMasterPanel';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
} from '@/engines/erp/hr/registryPilotGate';

const PANEL_SRC = readFileSync(
  resolve(
    process.cwd(),
    'src/components/erp/hr/collective-agreements/registry-master/RegistryMasterPanel.tsx',
  ),
  'utf8',
);

describe('B12.4 — RegistryMasterPanel row actions', () => {
  it('renders an "Acciones" column', async () => {
    render(<RegistryMasterPanel />);
    await waitFor(() =>
      expect(screen.getByTestId('registry-row-META_ONLY_CODE')).toBeInTheDocument(),
    );
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });

  it('metadata_only row shows "Preparar incorporación"', async () => {
    render(<RegistryMasterPanel />);
    await waitFor(() =>
      expect(
        screen.getByTestId('row-action-prepare-META_ONLY_CODE'),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId('row-action-prepare-META_ONLY_CODE'),
    ).toHaveTextContent(/Preparar incorporación/);
  });

  it('parsed_partial row shows "Enviar a validación"', async () => {
    render(<RegistryMasterPanel />);
    await waitFor(() =>
      expect(
        screen.getByTestId('row-action-validation-PARSED_PARTIAL_CODE'),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId('row-action-validation-PARSED_PARTIAL_CODE'),
    ).toHaveTextContent(/Enviar a validación/);
  });

  it('ready_for_payroll row shows "Preparar mapping"', async () => {
    render(<RegistryMasterPanel />);
    await waitFor(() =>
      expect(
        screen.getByTestId('row-action-mapping-READY_CODE'),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId('row-action-mapping-READY_CODE'),
    ).toHaveTextContent(/Preparar mapping/);
  });

  it('does not contain any forbidden activation CTA', async () => {
    const { container } = render(<RegistryMasterPanel />);
    await waitFor(() =>
      expect(screen.getByTestId('registry-row-READY_CODE')).toBeInTheDocument(),
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toMatch(/usar en n[oó]mina/);
    expect(html).not.toMatch(/activar para n[oó]mina/);
    expect(html).not.toMatch(/activar n[oó]mina/);
    expect(html).not.toMatch(/aplicar en payroll/);
  });

  it('clicking row actions does not trigger any DB write or edge invoke', async () => {
    render(<RegistryMasterPanel onNavigateToHub={() => {}} />);
    await waitFor(() =>
      expect(screen.getByTestId('row-action-prepare-META_ONLY_CODE')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('row-action-prepare-META_ONLY_CODE'));
    fireEvent.click(screen.getByTestId('row-action-validation-PARSED_PARTIAL_CODE'));
    fireEvent.click(screen.getByTestId('row-action-mapping-READY_CODE'));
    fireEvent.click(screen.getByTestId('row-action-detail-READY_CODE'));
    fireEvent.click(screen.getByTestId('row-action-hub-META_ONLY_CODE'));

    expect(insertSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(rpcSpy).not.toHaveBeenCalled();
    expect(invokeSpy).not.toHaveBeenCalled();
  });

  it('panel source does not import payroll-related modules', () => {
    expect(PANEL_SRC).not.toMatch(/useESPayrollBridge/);
    expect(PANEL_SRC).not.toMatch(/payrollEngine/);
    expect(PANEL_SRC).not.toMatch(/payslipEngine/);
    expect(PANEL_SRC).not.toMatch(/salaryNormalizer/);
    expect(PANEL_SRC).not.toMatch(/agreementSalaryResolver/);
    expect(PANEL_SRC).not.toMatch(/agreementSafetyGate/);
  });

  it('panel source contains no DB write calls', () => {
    expect(PANEL_SRC).not.toMatch(/\.insert\(/);
    expect(PANEL_SRC).not.toMatch(/\.update\(/);
    expect(PANEL_SRC).not.toMatch(/\.delete\(/);
    expect(PANEL_SRC).not.toMatch(/\.upsert\(/);
    expect(PANEL_SRC).not.toMatch(/\.rpc\(/);
    expect(PANEL_SRC).not.toMatch(/functions\.invoke/);
  });

  it('registry flags and allow-list remain untouched', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
    expect(Array.isArray(REGISTRY_PILOT_SCOPE_ALLOWLIST)).toBe(true);
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST.length).toBe(0);
  });
});