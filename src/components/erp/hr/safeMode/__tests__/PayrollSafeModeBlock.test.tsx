/**
 * S9.21u.1i — Render snapshot/contract test for PayrollSafeModeBlock.
 *
 * Verifies:
 *  - SafeMode agreement context card renders with name/origin/group/period/table.
 *  - NO calculated agreement amounts are displayed as definitive (Base convenio,
 *    Plus convenio, Mejora voluntaria automática, Total mínimo convenio).
 *
 * Reuses the existing Vitest + RTL infrastructure (vitest.config.ts +
 * src/test/utils.tsx). No new dependencies introduced.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { PayrollSafeModeBlock } from '../PayrollSafeModeBlock';
import type { NormalizeResult } from '@/engines/erp/hr/salaryNormalizer';

const baseNormalizer: NormalizeResult = {
  mensualEquivalente: 0,
  mensualEquivalentePeriodo: 0,
  divisor: null,
  divisorSource: 'agreement_field',
  unidadDetectada: 'ambigua',
  confianza: 'baja',
  safeMode: true,
  safeModeReason:
    'salario base 42000 y anual 42000 no coherentes con divisor 14',
  agreementResolutionStatus: 'resolved',
  trace: [],
  resolutionPath: 'incoherent_structural_safeMode',
  parametrizationDiagnostic: {
    status: 'incoherent',
    severity: 'structural',
  } as NormalizeResult['parametrizationDiagnostic'],
};

describe('PayrollSafeModeBlock — S9.21u.1i SafeMode agreement context', () => {
  it('renders agreement identity (name, origin, group, period, table) when safeMode is active', () => {
    render(
      <PayrollSafeModeBlock
        normalizer={baseNormalizer}
        contractId="contract-1"
        employeeId="employee-1"
        onOpenContract={vi.fn()}
        agreementName="Convenio Colectivo Estatal de la Industria de la Alimentación y Bebidas"
        agreementSource="employee_assignment"
        professionalGroup="Grupo III"
        periodLabel="04/2026"
        tableFound={true}
      />,
    );

    expect(screen.getByText('Convenio identificado')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Convenio Colectivo Estatal de la Industria de la Alimentación y Bebidas',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Origen: Empleado/i)).toBeInTheDocument();
    expect(screen.getByText('Grupo III')).toBeInTheDocument();
    expect(screen.getByText('04/2026')).toBeInTheDocument();
    expect(screen.getByText('Encontrada')).toBeInTheDocument();
    expect(
      screen.getByText(/cálculo automático permanece bloqueado/i),
    ).toBeInTheDocument();
  });

  it('does NOT render any calculated agreement amount as definitive', () => {
    render(
      <PayrollSafeModeBlock
        normalizer={baseNormalizer}
        contractId="contract-1"
        employeeId="employee-1"
        onOpenContract={vi.fn()}
        agreementName="Convenio Colectivo Estatal de la Industria de la Alimentación y Bebidas"
        agreementSource="employee_assignment"
        professionalGroup="Grupo III"
        periodLabel="04/2026"
        tableFound={true}
      />,
    );

    // Forbidden labels — none of these definitive amounts may appear in safeMode.
    expect(screen.queryByText(/Base convenio/i)).toBeNull();
    expect(screen.queryByText(/Plus convenio/i)).toBeNull();
    expect(screen.queryByText(/Mejora voluntaria autom[aá]tica/i)).toBeNull();
    expect(screen.queryByText(/Total m[ií]nimo convenio/i)).toBeNull();
  });

  it('renders "Sin convenio aplicable" branch when agreementName is empty', () => {
    render(
      <PayrollSafeModeBlock
        normalizer={baseNormalizer}
        contractId={null}
        employeeId="employee-1"
        onOpenContract={vi.fn()}
        agreementName={null}
        agreementSource="none"
      />,
    );

    expect(screen.getByText(/Sin convenio aplicable/i)).toBeInTheDocument();
    expect(screen.queryByText('Convenio identificado')).toBeNull();
  });
});