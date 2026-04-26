/**
 * S9.21u.1i / S9.21u.2 — Render snapshot/contract test for PayrollSafeModeBlock.
 *
 * Verifies:
 *  - SafeMode agreement context card renders with name/origin/group/period/table.
 *  - When `referenceAmounts` are provided, the agreement amounts are rendered
 *    inside the "Importes de convenio — Referencia no aplicado" card with the
 *    explicit non-applied badge and the legal disclaimer.
 *  - Without `referenceAmounts`, no reference amounts card is rendered.
 *  - Forbidden definitive labels never appear in safeMode (Mejora voluntaria
 *    automática, Base de cotización SS, Retención IRPF, Total devengos
 *    definitivo, Fórmula definitiva).
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
  agreementResolutionStatus: 'manual_review_required',
  trace: [],
  resolutionPath: 'incoherent_structural_safeMode',
  parametrizationDiagnostic: {
    status: 'incoherent',
    severity: 'structural',
    reasons: [],
    warnings: [],
  } as unknown as NormalizeResult['parametrizationDiagnostic'],
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

  it('does NOT render forbidden definitive labels when no referenceAmounts are passed', () => {
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

    // Without referenceAmounts, the reference card must NOT render.
    expect(screen.queryByText(/Importes de convenio/i)).toBeNull();
    expect(screen.queryByText(/Referencia — no aplicado/i)).toBeNull();

    // Forbidden definitive labels — must NEVER appear while safeMode is active.
    expect(screen.queryByText(/Mejora voluntaria autom[aá]tica/i)).toBeNull();
    expect(screen.queryByText(/Base de cotizaci[oó]n SS/i)).toBeNull();
    expect(screen.queryByText(/Retenci[oó]n IRPF/i)).toBeNull();
    expect(screen.queryByText(/Total devengos definitivo/i)).toBeNull();
    expect(screen.queryByText(/F[oó]rmula definitiva/i)).toBeNull();
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

  it('S9.21u.2 — renders reference amounts card with non-applied badge and legal disclaimer', () => {
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
        referenceAmounts={{
          salarioBaseConvenio: 1850,
          plusConvenioTabla: 120,
          totalMinimoConvenio: 1970,
        }}
        referenceConcepts={[
          {
            code: 'PLUS_TRANSPORTE',
            name: 'Plus transporte',
            amount: 80,
            type: 'earning',
            source: 'agreement_table',
          },
        ]}
      />,
    );

    // Reference card title and explicit non-applied badge.
    expect(screen.getByText('Importes de convenio')).toBeInTheDocument();
    expect(screen.getByText(/Referencia — no aplicado/i)).toBeInTheDocument();
    // Legal disclaimer.
    expect(
      screen.getByText(
        /Estos importes proceden de la tabla salarial del convenio y se muestran solo como referencia/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No se aplicar[aá]n a la n[oó]mina hasta resolver/i),
    ).toBeInTheDocument();
    // Reference labels (these legitimately appear under the non-applied badge).
    expect(screen.getByText('Salario base convenio')).toBeInTheDocument();
    expect(screen.getByText('Plus convenio')).toBeInTheDocument();
    expect(
      screen.getByText(/Total m[ií]nimo convenio — referencia/i),
    ).toBeInTheDocument();
    // Dynamic safe concept rendered as reference.
    expect(screen.getByText('Plus transporte')).toBeInTheDocument();

    // Even with reference amounts shown, mejora voluntaria automática is still
    // forbidden. The block must never render it as a calculated value.
    expect(screen.queryByText(/Mejora voluntaria autom[aá]tica/i)).toBeNull();
    expect(screen.queryByText(/Total devengos definitivo/i)).toBeNull();
  });

  it('S9.21u.2 — does NOT render reference card if no referenceAmounts and no positive concepts', () => {
    render(
      <PayrollSafeModeBlock
        normalizer={baseNormalizer}
        contractId="contract-1"
        employeeId="employee-1"
        onOpenContract={vi.fn()}
        agreementName="Convenio X"
        agreementSource="employee_assignment"
        professionalGroup="Grupo II"
        periodLabel="04/2026"
        tableFound={false}
        referenceAmounts={null}
        referenceConcepts={[
          // amount = 0 → must be filtered out (safeMode rule)
          { code: 'X', name: 'Concepto cero', amount: 0, type: 'earning' },
        ]}
      />,
    );

    expect(screen.queryByText('Importes de convenio')).toBeNull();
    expect(screen.queryByText(/Referencia — no aplicado/i)).toBeNull();
  });

  it('S9.21u.2-VERIFY — never renders forbidden definitive payroll labels in SafeMode', () => {
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
        referenceAmounts={{
          salarioBaseConvenio: 1850,
          plusConvenioTabla: 120,
          totalMinimoConvenio: 1970,
        }}
        referenceConcepts={[
          { code: 'PLUS_TRANSPORTE', name: 'Plus transporte', amount: 80, type: 'earning' },
        ]}
      />,
    );

    // Etiquetas DEFINITIVAS prohibidas — no deben aparecer JAMÁS en SafeMode.
    expect(screen.queryByText(/Base SS/i)).toBeNull();
    expect(screen.queryByText(/Base de cotizaci[oó]n SS/i)).toBeNull();
    expect(screen.queryByText(/Base IRPF/i)).toBeNull();
    expect(screen.queryByText(/Base de IRPF/i)).toBeNull();
    expect(screen.queryByText(/Total devengos/i)).toBeNull();
    expect(screen.queryByText(/Salario neto/i)).toBeNull();
    expect(screen.queryByText(/Coste empresa/i)).toBeNull();
    expect(screen.queryByText(/Salario pactado aplicado/i)).toBeNull();
    expect(screen.queryByText(/Mejora voluntaria autom[aá]tica aplicada/i)).toBeNull();
    expect(screen.queryByText(/Mensual equivalente/i)).toBeNull();
  });

  it('S9.21u.2-VERIFY — reference card has accessible label indicating "referencia" and "no aplicados"', () => {
    render(
      <PayrollSafeModeBlock
        normalizer={baseNormalizer}
        contractId="contract-1"
        employeeId="employee-1"
        onOpenContract={vi.fn()}
        agreementName="Convenio X"
        agreementSource="employee_assignment"
        professionalGroup="Grupo III"
        periodLabel="04/2026"
        tableFound={true}
        referenceAmounts={{
          salarioBaseConvenio: 1850,
          plusConvenioTabla: 120,
          totalMinimoConvenio: 1970,
        }}
      />,
    );

    // aria-label de la tarjeta de referencia debe explicitar el carácter no-aplicado.
    const referenceRegion = screen.getByLabelText(
      /Importes de convenio mostrados como referencia.*no aplicados/i,
    );
    expect(referenceRegion).toBeInTheDocument();

    // Badge visible "Referencia — no aplicado".
    expect(screen.getByText(/Referencia — no aplicado/i)).toBeInTheDocument();

    // Aviso legal con palabra "tabla salarial del convenio" y "referencia".
    expect(
      screen.getByText(/tabla salarial del convenio.*solo como referencia/i),
    ).toBeInTheDocument();
  });

  it('S9.21u.2-VERIFY — percentage and zero-amount concepts are filtered out from reference card', () => {
    render(
      <PayrollSafeModeBlock
        normalizer={baseNormalizer}
        contractId="contract-1"
        employeeId="employee-1"
        onOpenContract={vi.fn()}
        agreementName="Convenio X"
        agreementSource="employee_assignment"
        professionalGroup="Grupo III"
        periodLabel="04/2026"
        tableFound={true}
        referenceAmounts={{
          salarioBaseConvenio: 1850,
          plusConvenioTabla: 120,
          totalMinimoConvenio: 1970,
        }}
        referenceConcepts={[
          // Filtered: percentage
          { code: 'PCT_X', name: 'Plus porcentual', amount: 5, type: 'earning', isPercentage: true } as any,
          // Filtered: zero
          { code: 'ZERO_X', name: 'Concepto cero', amount: 0, type: 'earning' },
          // Filtered: deduction
          { code: 'DED_X', name: 'Cuota deducción', amount: 30, type: 'deduction' },
          // Kept: valid
          { code: 'PLUS_TRANSPORTE', name: 'Plus transporte', amount: 80, type: 'earning' },
        ]}
      />,
    );

    // Solo el válido debe estar visible.
    expect(screen.getByText('Plus transporte')).toBeInTheDocument();
    expect(screen.queryByText('Plus porcentual')).toBeNull();
    expect(screen.queryByText('Concepto cero')).toBeNull();
    expect(screen.queryByText('Cuota deducción')).toBeNull();
  });
});