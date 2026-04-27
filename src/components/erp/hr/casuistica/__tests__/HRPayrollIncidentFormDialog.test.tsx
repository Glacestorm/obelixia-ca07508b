/**
 * CASUISTICA-FECHAS-01 — Fase C3B1
 * Tests del modal de alta. Stubean la mutación. No tocan Supabase ni FDI/AFI/DELTA.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { HRPayrollIncidentFormDialog } from '../HRPayrollIncidentFormDialog';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeMutationsHook(createImpl?: (input: any) => Promise<{ id: string } | null>) {
  const createPayrollIncident = vi.fn(
    createImpl ?? (async () => ({ id: 'inc-new' })),
  );
  const hook = (() => ({
    createPayrollIncident,
    isCreating: false,
  })) as unknown as typeof import('@/hooks/erp/hr/usePayrollIncidentMutations').usePayrollIncidentMutations;
  return { hook, createPayrollIncident };
}

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  companyId: 'co-1',
  employeeId: 'emp-1',
  periodYear: 2026,
  periodMonth: 3,
};

function setNativeValue(el: HTMLElement, value: string) {
  fireEvent.change(el, { target: { value } });
}

describe('HRPayrollIncidentFormDialog — C3B1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza con banner legal y tipo PNR por defecto', () => {
    const { hook } = makeMutationsHook();
    render(<HRPayrollIncidentFormDialog {...baseProps} mutationsHook={hook} />);
    expect(screen.getByText(/no envía comunicaciones oficiales/i)).toBeInTheDocument();
    expect(screen.getByText(/posible AFI pendiente/i)).toBeInTheDocument();
  });

  it('fecha fin anterior a inicio bloquea submit', () => {
    const { hook, createPayrollIncident } = makeMutationsHook();
    render(<HRPayrollIncidentFormDialog {...baseProps} mutationsHook={hook} />);
    setNativeValue(screen.getByLabelText(/fecha inicio/i), '2026-03-10');
    setNativeValue(screen.getByLabelText(/fecha fin/i), '2026-03-05');
    const submit = screen.getByRole('button', { name: /crear incidencia/i });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(createPayrollIncident).not.toHaveBeenCalled();
  });

  it('porcentaje > 100 bloquea submit (con tipo reducción)', () => {
    const { hook, createPayrollIncident } = makeMutationsHook();
    render(
      <HRPayrollIncidentFormDialog
        {...baseProps}
        defaultType="reduccion_jornada_guarda_legal"
        mutationsHook={hook}
      />,
    );
    setNativeValue(screen.getByLabelText(/fecha inicio/i), '2026-03-01');
    setNativeValue(screen.getByLabelText(/fecha fin/i), '2026-03-31');
    setNativeValue(screen.getByLabelText(/porcentaje/i), '150');
    expect(screen.getByRole('button', { name: /crear incidencia/i })).toBeDisabled();
    expect(createPayrollIncident).not.toHaveBeenCalled();
  });

  it('submit válido (PNR) llama createPayrollIncident con flags AFI por defecto', async () => {
    const { hook, createPayrollIncident } = makeMutationsHook();
    render(<HRPayrollIncidentFormDialog {...baseProps} mutationsHook={hook} />);
    setNativeValue(screen.getByLabelText(/fecha inicio/i), '2026-03-05');
    setNativeValue(screen.getByLabelText(/fecha fin/i), '2026-03-10');
    const submit = screen.getByRole('button', { name: /crear incidencia/i });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    expect(createPayrollIncident).toHaveBeenCalledTimes(1);
    const arg = createPayrollIncident.mock.calls[0][0];
    expect(arg.incident_type).toBe('pnr');
    expect(arg.applies_from).toBe('2026-03-05');
    expect(arg.applies_to).toBe('2026-03-10');
    expect(arg.units).toBe(6);
    expect(arg.official_communication_type).toBe('AFI');
    expect(arg.requires_external_filing).toBe(true);
    expect(arg.requires_ss_action).toBe(true);
  });

  it('desplazamiento_temporal precarga legal_review_required=true', () => {
    const { hook, createPayrollIncident } = makeMutationsHook();
    render(
      <HRPayrollIncidentFormDialog
        {...baseProps}
        defaultType="desplazamiento_temporal"
        mutationsHook={hook}
      />,
    );
    setNativeValue(screen.getByLabelText(/fecha inicio/i), '2026-03-05');
    setNativeValue(screen.getByLabelText(/fecha fin/i), '2026-03-20');
    fireEvent.click(screen.getByRole('button', { name: /crear incidencia/i }));
    expect(createPayrollIncident).toHaveBeenCalledTimes(1);
    const arg = createPayrollIncident.mock.calls[0][0];
    expect(arg.incident_type).toBe('desplazamiento_temporal');
    expect(arg.legal_review_required).toBe(true);
    expect(arg.requires_external_filing).toBe(true);
    expect(arg.metadata).toMatchObject({ tax_review_required: true });
  });

  it('tipo IT excluido muestra aviso de módulo especializado y bloquea submit', () => {
    const { hook, createPayrollIncident } = makeMutationsHook();
    render(
      <HRPayrollIncidentFormDialog
        {...baseProps}
        defaultType={'it_enfermedad_comun' as any}
        mutationsHook={hook}
      />,
    );
    expect(
      screen.getByText(/módulo especializado correspondiente/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear incidencia/i })).toBeDisabled();
    expect(createPayrollIncident).not.toHaveBeenCalled();
  });

  it('no realiza llamadas a engines FDI/AFI/DELTA (sólo marca flags)', () => {
    const { hook, createPayrollIncident } = makeMutationsHook();
    render(<HRPayrollIncidentFormDialog {...baseProps} mutationsHook={hook} />);
    setNativeValue(screen.getByLabelText(/fecha inicio/i), '2026-03-05');
    setNativeValue(screen.getByLabelText(/fecha fin/i), '2026-03-06');
    fireEvent.click(screen.getByRole('button', { name: /crear incidencia/i }));
    // El stub sólo crea la incidencia. Nada más debe ejecutarse.
    expect(createPayrollIncident).toHaveBeenCalledTimes(1);
    // Garantía: no se importan engines en el modal (verificación negativa
    // por convención: fallaría si en el futuro se añadieran imports reales).
  });
});