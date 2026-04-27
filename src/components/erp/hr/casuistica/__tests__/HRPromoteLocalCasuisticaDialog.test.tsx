/**
 * CASUISTICA-FECHAS-01 — Fase C3B2
 * Tests del diálogo de promoción. Mockean `usePayrollIncidentMutations`
 * para no tocar Supabase. Sólo INSERT (createPayrollIncident); sin
 * update/upsert/delete.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HRPromoteLocalCasuisticaDialog } from '../HRPromoteLocalCasuisticaDialog';
import type {
  CasuisticaState,
  CasuisticaDatesExtension,
} from '@/lib/hr/casuisticaTypes';
import type { PayrollIncidentRow } from '@/lib/hr/incidenciasTypes';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseCtx = {
  open: true,
  onOpenChange: vi.fn(),
  companyId: 'co-1',
  employeeId: 'emp-1',
  periodYear: 2026,
  periodMonth: 3,
  existingIncidents: [] as PayrollIncidentRow[],
};

function emptyCas(): CasuisticaState & Partial<CasuisticaDatesExtension> {
  return {
    enabled: true,
    pnrDias: 0,
    itAtDias: 0,
    reduccionJornadaPct: 0,
    atrasosITImporte: 0,
    atrasosITPeriodo: '',
    nacimientoTipo: 'paternidad',
    nacimientoDias: 0,
    nacimientoImporte: 0,
    periodFechaDesde: '',
    periodFechaHasta: '',
    periodDiasNaturales: 30,
    periodDiasEfectivos: 30,
    periodMotivo: 'mes_completo',
    pnrFechaDesde: '',
    pnrFechaHasta: '',
    itAtFechaDesde: '',
    itAtFechaHasta: '',
    itAtTipo: '',
    reduccionFechaDesde: '',
    reduccionFechaHasta: '',
    atrasosFechaDesde: '',
    atrasosFechaHasta: '',
    nacimientoFechaInicio: '',
    nacimientoFechaFin: '',
    nacimientoFechaHechoCausante: '',
  };
}

function makeMutationsHook(
  createImpl: (input: any) => Promise<{ id: string } | null>,
) {
  const createMock = vi.fn(createImpl);
  const hook = (() =>
    ({
      createPayrollIncident: createMock,
      isCreating: false,
    } as any)) as any;
  return { hook, createMock };
}

describe('HRPromoteLocalCasuisticaDialog — C3B2', () => {
  beforeEach(() => vi.clearAllMocks());

  it('1) Sin toCreate (casuística vacía) → muestra "Nada que promover" y botón disabled', () => {
    const { hook } = makeMutationsHook(async () => ({ id: 'x' }));
    render(
      <HRPromoteLocalCasuisticaDialog
        {...baseCtx}
        casuistica={emptyCas()}
        mutationsHook={hook}
      />,
    );
    expect(screen.getByText(/Nada que promover/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Promover seleccionados/i });
    expect(btn).toBeDisabled();
  });

  it('2) Con created/duplicate/skipped → muestra 3 secciones', () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 3;
    cas.itAtFechaDesde = '2026-03-10';
    cas.itAtFechaHasta = '2026-03-12';
    cas.itAtTipo = 'enfermedad_comun';
    cas.reduccionFechaDesde = '2026-03-01';
    cas.reduccionFechaHasta = '2026-03-31';
    cas.reduccionJornadaPct = 50;
    const ex = {
      id: 'r-dup',
      company_id: 'co-1',
      employee_id: 'emp-1',
      incident_type: 'reduccion_jornada_guarda_legal',
      applies_from: '2026-03-01',
      applies_to: '2026-03-31',
      status: 'pending',
      deleted_at: null,
    } as unknown as PayrollIncidentRow;
    const { hook } = makeMutationsHook(async () => ({ id: 'x' }));
    render(
      <HRPromoteLocalCasuisticaDialog
        {...baseCtx}
        existingIncidents={[ex]}
        casuistica={cas}
        mutationsHook={hook}
      />,
    );
    expect(screen.getByText(/Se crearán \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Duplicados \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Omitidos \(1\)/i)).toBeInTheDocument();
  });

  it('3) Desmarcar todos los checkboxes deshabilita el botón', async () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 3;
    const { hook } = makeMutationsHook(async () => ({ id: 'x' }));
    render(
      <HRPromoteLocalCasuisticaDialog
        {...baseCtx}
        casuistica={cas}
        mutationsHook={hook}
      />,
    );
    const btn = screen.getByRole('button', { name: /Promover seleccionados \(1\)/i });
    expect(btn).not.toBeDisabled();
    const cb = screen.getAllByRole('checkbox')[0];
    fireEvent.click(cb);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Promover seleccionados \(0\)/i }),
      ).toBeDisabled();
    });
  });

  it('4) Confirmar llama createPayrollIncident N veces', async () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 3;
    cas.reduccionFechaDesde = '2026-03-01';
    cas.reduccionFechaHasta = '2026-03-31';
    cas.reduccionJornadaPct = 50;
    const { hook, createMock } = makeMutationsHook(async () => ({ id: 'x' }));
    const onPromoted = vi.fn();
    render(
      <HRPromoteLocalCasuisticaDialog
        {...baseCtx}
        casuistica={cas}
        mutationsHook={hook}
        onPromoted={onPromoted}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Promover seleccionados \(2\)/i }),
    );
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(2));
    expect(onPromoted).toHaveBeenCalled();
  });

  it('5) Si una creación falla, muestra failed y mantiene abierto', async () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 3;
    cas.reduccionFechaDesde = '2026-03-01';
    cas.reduccionFechaHasta = '2026-03-31';
    cas.reduccionJornadaPct = 50;
    let call = 0;
    const { hook } = makeMutationsHook(async () => {
      call += 1;
      if (call === 1) return null; // primer intento falla
      return { id: 'ok-2' };
    });
    const onChange = vi.fn();
    render(
      <HRPromoteLocalCasuisticaDialog
        {...baseCtx}
        onOpenChange={onChange}
        casuistica={cas}
        mutationsHook={hook}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Promover seleccionados \(2\)/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Fallidos \(1\)/i)).toBeInTheDocument(),
    );
    expect(onChange).not.toHaveBeenCalledWith(false);
  });

  it('6) Si todo ok, llama onPromoted() y cierra el diálogo', async () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 3;
    const { hook } = makeMutationsHook(async () => ({ id: 'ok' }));
    const onChange = vi.fn();
    const onPromoted = vi.fn();
    render(
      <HRPromoteLocalCasuisticaDialog
        {...baseCtx}
        onOpenChange={onChange}
        casuistica={cas}
        mutationsHook={hook}
        onPromoted={onPromoted}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Promover seleccionados \(1\)/i }),
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(false));
    expect(onPromoted).toHaveBeenCalled();
    expect(onPromoted.mock.calls[0][0]).toMatchObject({
      created: 1,
      failed: 0,
    });
  });

  it('7) No muta el objeto casuistica de entrada', async () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 3;
    const snapshot = JSON.parse(JSON.stringify(cas));
    const { hook } = makeMutationsHook(async () => ({ id: 'ok' }));
    render(
      <HRPromoteLocalCasuisticaDialog
        {...baseCtx}
        casuistica={cas}
        mutationsHook={hook}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Promover seleccionados \(1\)/i }),
    );
    await waitFor(() => {
      expect(cas).toEqual(snapshot);
    });
  });
});