/**
 * CASUISTICA-FECHAS-01 — Fase C3A
 * Tests del panel READ-ONLY. Mockean el hook `useHRPayrollIncidencias`
 * para evitar tocar Supabase. NUNCA se llama `.insert/.update/.delete`.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HRPersistedIncidentsPanel } from '../HRPersistedIncidentsPanel';
import type { MappingResult } from '@/lib/hr/incidenciasTypes';

function makeHook(overrides: Partial<{
  isLoading: boolean;
  error: unknown;
  payrollIncidents: any[];
  itProcesses: any[];
  leaveRequests: any[];
  mapping: MappingResult;
}> = {}) {
  const base = {
    payrollIncidents: [],
    itProcesses: [],
    leaveRequests: [],
    mapping: {
      legacy: {},
      flags: {},
      traces: [],
      unmapped: [],
      legalReviewRequired: false,
    } as MappingResult,
    legacyCasuistica: {},
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
  return () => base as any;
}

const baseProps = {
  companyId: 'co-1',
  employeeId: 'emp-1',
  periodYear: 2026,
  periodMonth: 3,
};

describe('HRPersistedIncidentsPanel — C3A read-only', () => {
  it('muestra estado vacío cuando no hay procesos', () => {
    render(<HRPersistedIncidentsPanel {...baseProps} useIncidenciasHook={makeHook()} />);
    expect(screen.getByText(/Sin procesos persistidos/i)).toBeInTheDocument();
    expect(screen.getByText(/Read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin envíos oficiales/i)).toBeInTheDocument();
  });

  it('muestra loading', () => {
    render(
      <HRPersistedIncidentsPanel
        {...baseProps}
        useIncidenciasHook={makeHook({ isLoading: true })}
      />,
    );
    expect(screen.getByText(/Cargando procesos persistidos/i)).toBeInTheDocument();
  });

  it('muestra badge de revisión legal cuando legalReviewRequired=true', () => {
    render(
      <HRPersistedIncidentsPanel
        {...baseProps}
        useIncidenciasHook={makeHook({
          payrollIncidents: [
            {
              id: 'p1',
              incident_type: 'suspension_empleo_sueldo',
              applies_from: '2026-03-10',
              applies_to: '2026-03-15',
              status: 'pending',
              legal_review_required: true,
            } as any,
          ],
          mapping: {
            legacy: {},
            flags: {},
            traces: [],
            unmapped: [
              { source: 'payroll_incidents', recordId: 'p1', incidentType: 'suspension_empleo_sueldo', legalReviewRequired: true },
            ],
            legalReviewRequired: true,
          },
        })}
      />,
    );
    expect(screen.getAllByText(/Revisión legal/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no mapeado/i)).toBeInTheDocument();
  });

  it('muestra badge AFI pendiente cuando requires_external_filing=true', () => {
    render(
      <HRPersistedIncidentsPanel
        {...baseProps}
        useIncidenciasHook={makeHook({
          payrollIncidents: [
            {
              id: 'p2',
              incident_type: 'pnr',
              applies_from: '2026-03-03',
              applies_to: '2026-03-03',
              status: 'pending',
              requires_external_filing: true,
              official_communication_type: 'AFI',
            } as any,
          ],
          mapping: {
            legacy: { pnrDias: 1 },
            flags: { pnrActiva: true },
            traces: [{ source: 'payroll_incidents', recordId: 'p2', incidentType: 'pnr', contributedDays: 1 }],
            unmapped: [],
            legalReviewRequired: false,
          },
        })}
      />,
    );
    expect(screen.getAllByText(/AFI pendiente/i).length).toBeGreaterThan(0);
  });

  it('NO muestra acciones CRUD de edición/cancelación (alta C3B1 ya disponible)', () => {
    render(<HRPersistedIncidentsPanel {...baseProps} useIncidenciasHook={makeHook()} />);
    expect(screen.queryByRole('button', { name: /guardar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    // C3B1: el botón "Añadir proceso" ya está habilitado (abre modal de alta).
    const addBtn = screen.getByRole('button', { name: /Añadir proceso/i });
    expect(addBtn).not.toBeDisabled();
  });

  it('no renderiza si falta companyId o employeeId', () => {
    const { container } = render(
      <HRPersistedIncidentsPanel
        {...baseProps}
        companyId=""
        useIncidenciasHook={makeHook()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('HRPersistedIncidentsPanel — C3B2 promoción local', () => {
  const fullCasuistica = {
    enabled: true,
    pnrDias: 3,
    pnrFechaDesde: '2026-03-05',
    pnrFechaHasta: '2026-03-07',
    itAtDias: 0,
    itAtFechaDesde: '',
    itAtFechaHasta: '',
    itAtTipo: '' as const,
    reduccionJornadaPct: 0,
    reduccionFechaDesde: '',
    reduccionFechaHasta: '',
    atrasosITImporte: 0,
    atrasosITPeriodo: '',
    atrasosFechaDesde: '',
    atrasosFechaHasta: '',
    nacimientoTipo: 'paternidad' as const,
    nacimientoDias: 0,
    nacimientoImporte: 0,
    nacimientoFechaInicio: '',
    nacimientoFechaFin: '',
    nacimientoFechaHechoCausante: '',
    periodFechaDesde: '',
    periodFechaHasta: '',
    periodDiasNaturales: 30,
    periodDiasEfectivos: 30,
    periodMotivo: 'mes_completo' as const,
  };

  const emptyCasuistica = { ...fullCasuistica, pnrDias: 0, pnrFechaDesde: '', pnrFechaHasta: '' };

  it('botón "Promover datos actuales" aparece y se habilita si hay datos promovibles', () => {
    render(
      <HRPersistedIncidentsPanel
        {...baseProps}
        useIncidenciasHook={makeHook()}
        localCasuistica={fullCasuistica}
      />,
    );
    const btn = screen.getByRole('button', { name: /Promover datos actuales/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('botón "Promover datos actuales" está deshabilitado si no hay datos promovibles', () => {
    render(
      <HRPersistedIncidentsPanel
        {...baseProps}
        useIncidenciasHook={makeHook()}
        localCasuistica={emptyCasuistica}
      />,
    );
    const btn = screen.getByRole('button', { name: /Promover datos actuales/i });
    expect(btn).toBeDisabled();
  });

  it('botón "Promover datos actuales" no se renderiza si no hay localCasuistica', () => {
    render(
      <HRPersistedIncidentsPanel
        {...baseProps}
        useIncidenciasHook={makeHook()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /Promover datos actuales/i }),
    ).not.toBeInTheDocument();
  });
});

describe('HRPersistedIncidentsPanel — C3B3A conflicts panel', () => {
  const fullCasuistica = {
    enabled: true,
    pnrDias: 3,
    pnrFechaDesde: '2026-03-05',
    pnrFechaHasta: '2026-03-07',
    itAtDias: 0,
    itAtFechaDesde: '',
    itAtFechaHasta: '',
    itAtTipo: '' as const,
    reduccionJornadaPct: 0,
    reduccionFechaDesde: '',
    reduccionFechaHasta: '',
    atrasosITImporte: 0,
    atrasosITPeriodo: '',
    atrasosFechaDesde: '',
    atrasosFechaHasta: '',
    nacimientoTipo: 'paternidad' as const,
    nacimientoDias: 0,
    nacimientoImporte: 0,
    nacimientoFechaInicio: '',
    nacimientoFechaFin: '',
    nacimientoFechaHechoCausante: '',
    periodFechaDesde: '',
    periodFechaHasta: '',
    periodDiasNaturales: 30,
    periodDiasEfectivos: 30,
    periodMotivo: 'mes_completo' as const,
  };

  it('renderiza panel de conflictos cuando coexisten PNR local y persistido', () => {
    render(
      <HRPersistedIncidentsPanel
        {...baseProps}
        localCasuistica={fullCasuistica}
        useIncidenciasHook={makeHook({
          payrollIncidents: [
            {
              id: 'p-pnr',
              incident_type: 'pnr',
              applies_from: '2026-03-05',
              applies_to: '2026-03-07',
              status: 'pending',
            } as any,
          ],
          mapping: {
            legacy: { pnrDias: 3 },
            flags: { pnrActiva: true },
            traces: [
              {
                source: 'payroll_incidents',
                recordId: 'p-pnr',
                incidentType: 'pnr',
                contributedDays: 3,
              },
            ],
            unmapped: [],
            legalReviewRequired: false,
          },
        })}
      />,
    );
    expect(
      screen.getByTestId('hr-casuistica-conflicts-panel'),
    ).toBeInTheDocument();
    // C3B3B-paso1: el banner por defecto (local_only) indica fuente aplicada Local.
    expect(screen.getByTestId('mode-banner-local-only')).toBeInTheDocument();
    expect(
      screen.getByText(/Fuente aplicada al cálculo: Local/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Persistido prioridad/i).length).toBeGreaterThan(0);
  });

  it('NO renderiza panel de conflictos cuando no hay localCasuistica', () => {
    render(
      <HRPersistedIncidentsPanel
        {...baseProps}
        useIncidenciasHook={makeHook()}
      />,
    );
    expect(
      screen.queryByTestId('hr-casuistica-conflicts-panel'),
    ).not.toBeInTheDocument();
  });
});

describe('HRPersistedIncidentsPanel — C3B3B-paso1 modo flag', () => {
  const fullCasuistica = {
    enabled: true,
    pnrDias: 3,
    pnrFechaDesde: '2026-03-05',
    pnrFechaHasta: '2026-03-07',
    itAtDias: 0,
    itAtFechaDesde: '',
    itAtFechaHasta: '',
    itAtTipo: '' as const,
    reduccionJornadaPct: 0,
    reduccionFechaDesde: '',
    reduccionFechaHasta: '',
    atrasosITImporte: 0,
    atrasosITPeriodo: '',
    atrasosFechaDesde: '',
    atrasosFechaHasta: '',
    nacimientoTipo: 'paternidad' as const,
    nacimientoDias: 0,
    nacimientoImporte: 0,
    nacimientoFechaInicio: '',
    nacimientoFechaFin: '',
    nacimientoFechaHechoCausante: '',
    periodFechaDesde: '',
    periodFechaHasta: '',
    periodDiasNaturales: 30,
    periodDiasEfectivos: 30,
    periodMotivo: 'mes_completo' as const,
  };

  it('propaga el modo por defecto (local_only) al panel de conflictos', () => {
    render(
      <HRPersistedIncidentsPanel
        {...baseProps}
        localCasuistica={fullCasuistica}
        useIncidenciasHook={makeHook({
          payrollIncidents: [
            {
              id: 'p-pnr',
              incident_type: 'pnr',
              applies_from: '2026-03-05',
              applies_to: '2026-03-07',
              status: 'pending',
            } as any,
          ],
          mapping: {
            legacy: { pnrDias: 3 },
            flags: { pnrActiva: true },
            traces: [
              {
                source: 'payroll_incidents',
                recordId: 'p-pnr',
                incidentType: 'pnr',
                contributedDays: 3,
              },
            ],
            unmapped: [],
            legalReviewRequired: false,
          },
        })}
      />,
    );
    // Default flag = local_only.
    expect(screen.getByTestId('mode-banner-local-only')).toBeInTheDocument();
    // Botones de promover/añadir siguen comportándose normalmente.
    expect(
      screen.getByRole('button', { name: /Promover datos actuales/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Añadir proceso/i }),
    ).toBeInTheDocument();
  });
});