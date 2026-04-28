/**
 * B4.c — UI tests for the agreement safety warnings card inside
 * PayrollSafeModeBlock.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { PayrollSafeModeBlock } from '@/components/erp/hr/safeMode/PayrollSafeModeBlock';
import type { NormalizeResult } from '@/engines/erp/hr/salaryNormalizer';
import type { AgreementSafetyDecision } from '@/engines/erp/hr/agreementSafetyGate';

const baseNormalizer: NormalizeResult = {
  mensualEquivalente: 0,
  mensualEquivalentePeriodo: 0,
  divisor: null,
  divisorSource: 'none',
  unidadDetectada: 'ambigua',
  confianza: 'baja',
  safeMode: true,
  safeModeReason: 'unidad y divisor no determinables',
  agreementResolutionStatus: 'manual_review_required',
  trace: [],
  resolutionPath: 'incoherent_structural_safeMode',
} as unknown as NormalizeResult;

function decision(
  partial: Partial<AgreementSafetyDecision>,
): AgreementSafetyDecision {
  return {
    allowed: false,
    origin: 'registry',
    warnings: [],
    missing: [],
    canComputeBaseSalary: false,
    canComputePlusConvenio: false,
    canComputeSeniority: false,
    canComputeExtraPayments: false,
    canComputeAnnualHours: false,
    ...partial,
  };
}

const renderProps = {
  normalizer: baseNormalizer,
  contractId: null,
  employeeId: null,
  onOpenContract: vi.fn(),
};

describe('B4.c — PayrollSafeModeBlock agreement safety warnings card', () => {
  it('renders AGREEMENT_NOT_READY_FOR_PAYROLL message and no activation CTA', () => {
    render(
      <PayrollSafeModeBlock
        {...renderProps}
        agreementSafetyDecision={decision({
          blockReason: 'AGREEMENT_NOT_READY_FOR_PAYROLL',
          missing: ['ready_for_payroll'],
        })}
      />,
    );
    expect(
      screen.getByText(/aún no está validado para cálculo automático/i),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('agreement-safety-AGREEMENT_NOT_READY_FOR_PAYROLL'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /activar convenio/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /marcar.*ready/i }),
    ).not.toBeInTheDocument();
  });

  it('renders AGREEMENT_MISSING_SALARY_TABLES message', () => {
    render(
      <PayrollSafeModeBlock
        {...renderProps}
        agreementSafetyDecision={decision({
          blockReason: 'AGREEMENT_MISSING_SALARY_TABLES',
          missing: ['salary_tables_loaded'],
        })}
      />,
    );
    expect(
      screen.getByText(/Faltan tablas salariales oficiales del convenio/i),
    ).toBeInTheDocument();
  });

  it('renders LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW message', () => {
    render(
      <PayrollSafeModeBlock
        {...renderProps}
        agreementSafetyDecision={decision({
          allowed: true,
          origin: 'legacy_ts_fallback',
          warnings: ['LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW'],
        })}
      />,
    );
    expect(
      screen.getByText(/catálogo legacy y debe revisarse antes de uso real/i),
    ).toBeInTheDocument();
  });

  it('renders MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT message', () => {
    render(
      <PayrollSafeModeBlock
        {...renderProps}
        agreementSafetyDecision={decision({
          allowed: true,
          origin: 'unknown',
          warnings: ['MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT'],
        })}
      />,
    );
    expect(
      screen.getByText(/Se usará el salario manual informado/i),
    ).toBeInTheDocument();
  });

  it('does not render the safety card when there are no warnings nor block', () => {
    render(<PayrollSafeModeBlock {...renderProps} />);
    expect(
      screen.queryByTestId('agreement-safety-warnings'),
    ).not.toBeInTheDocument();
  });

  it('accepts a flat list via agreementSafetyWarnings without a full decision', () => {
    render(
      <PayrollSafeModeBlock
        {...renderProps}
        agreementSafetyWarnings={['AGREEMENT_REQUIRES_HUMAN_REVIEW']}
      />,
    );
    expect(
      screen.getByText(/requiere revisión humana antes de aplicarse a nómina/i),
    ).toBeInTheDocument();
  });
});
