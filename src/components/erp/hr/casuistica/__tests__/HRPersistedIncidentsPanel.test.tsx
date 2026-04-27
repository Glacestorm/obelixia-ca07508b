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