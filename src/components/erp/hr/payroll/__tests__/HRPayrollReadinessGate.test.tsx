import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HRPayrollReadinessGate } from '../HRPayrollReadinessGate';

vi.mock('@/components/erp/hr/shared/sandboxEnvironmentEngine', () => ({
  isRealSubmissionBlocked: () => true,
}));

const baseProps = {
  employeeId: 'emp-1',
  contractId: 'con-1',
  companyId: 'co-1',
  safeModeActive: false,
  agreementStatus: 'clear' as const,
  contractStatus: 'complete' as const,
  legalReviewRequired: false,
  hasPersistedIncidents: false,
  hasLocalPersistedConflicts: false,
  hasUnmappedIncidents: false,
  hasOfficialPendingFlags: false,
};

describe('HRPayrollReadinessGate', () => {
  it('renderiza el título de comprobación previa', () => {
    render(<HRPayrollReadinessGate {...baseProps} />);
    expect(screen.getByText(/Comprobación previa de nómina/i)).toBeInTheDocument();
  });

  it('estado READY cuando no hay bloqueos ni revisiones', () => {
    render(<HRPayrollReadinessGate {...baseProps} />);
    expect(screen.getByText(/LISTA PARA CALCULAR/i)).toBeInTheDocument();
  });

  it('estado REVIEW si convenio dudoso', () => {
    render(<HRPayrollReadinessGate {...baseProps} agreementStatus="doubtful" />);
    expect(screen.getByText(/REQUIERE REVISIÓN/i)).toBeInTheDocument();
  });

  it('estado REVIEW si hay conflictos local vs persistido', () => {
    render(<HRPayrollReadinessGate {...baseProps} hasLocalPersistedConflicts />);
    expect(screen.getByText(/REQUIERE REVISIÓN/i)).toBeInTheDocument();
  });

  it('estado BLOCKED si SafeMode activo', () => {
    render(<HRPayrollReadinessGate {...baseProps} safeModeActive />);
    expect(screen.getAllByText(/BLOQUEADA/i).length).toBeGreaterThan(0);
  });

  it('estado BLOCKED si falta employeeId', () => {
    render(<HRPayrollReadinessGate {...baseProps} employeeId={null} />);
    expect(screen.getAllByText(/BLOQUEADA/i).length).toBeGreaterThan(0);
  });

  it('muestra texto informativo de no envíos oficiales', () => {
    render(<HRPayrollReadinessGate {...baseProps} />);
    expect(
      screen.getByText(/no genera comunicaciones\s+oficiales/i),
    ).toBeInTheDocument();
  });

  it('no renderiza botones de envío oficial', () => {
    const { container } = render(<HRPayrollReadinessGate {...baseProps} />);
    expect(container.querySelectorAll('button').length).toBe(0);
  });
});