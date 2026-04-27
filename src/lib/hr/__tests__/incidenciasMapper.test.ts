/**
 * CASUISTICA-FECHAS-01 — Fase C2
 * Tests del adapter puro mapIncidenciasToLegacyCasuistica.
 *
 * No toca BD, motor, ni Supabase. Sólo lógica de mapping/intersección.
 */
import { describe, it, expect } from 'vitest';
import { mapIncidenciasToLegacyCasuistica } from '../incidenciasMapper';
import type {
  PayrollIncidentRow,
  ITProcessRow,
  LeaveRequestRow,
} from '../incidenciasTypes';

// ─── Builders mínimos (cast tolerante; sólo se usan los campos relevantes) ──

function pi(partial: Partial<PayrollIncidentRow>): PayrollIncidentRow {
  return {
    id: partial.id ?? `pi-${Math.random().toString(36).slice(2, 9)}`,
    company_id: 'comp-1',
    employee_id: 'emp-1',
    concept_code: 'X',
    incident_type: 'pnr',
    status: 'pending',
    source: 'manual',
    version: 1,
    legal_review_required: false,
    metadata: null,
    deleted_at: null,
    applies_from: null,
    applies_to: null,
    amount: null,
    percent: null,
    period_year: null,
    period_month: null,
    ...partial,
  } as unknown as PayrollIncidentRow;
}

function it_(partial: Partial<ITProcessRow>): ITProcessRow {
  return {
    id: partial.id ?? `it-${Math.random().toString(36).slice(2, 9)}`,
    company_id: 'comp-1',
    employee_id: 'emp-1',
    process_type: 'EC',
    status: 'active',
    start_date: '2026-03-01',
    end_date: null,
    ...partial,
  } as unknown as ITProcessRow;
}

function lr(partial: Partial<LeaveRequestRow>): LeaveRequestRow {
  return {
    id: partial.id ?? `lr-${Math.random().toString(36).slice(2, 9)}`,
    company_id: 'comp-1',
    employee_id: 'emp-1',
    leave_type_code: 'PAT',
    start_date: '2026-03-01',
    end_date: '2026-03-15',
    days_requested: 15,
    workflow_status: 'approved',
    status: 'approved',
    ...partial,
  } as unknown as LeaveRequestRow;
}

const PERIOD = { periodYear: 2026, periodMonth: 3 };

function run(rows: {
  payrollIncidents?: PayrollIncidentRow[];
  itProcesses?: ITProcessRow[];
  leaveRequests?: LeaveRequestRow[];
}) {
  return mapIncidenciasToLegacyCasuistica({
    payrollIncidents: rows.payrollIncidents ?? [],
    itProcesses: rows.itProcesses ?? [],
    leaveRequests: rows.leaveRequests ?? [],
    ...PERIOD,
  });
}

describe('mapIncidenciasToLegacyCasuistica — PNR', () => {
  it('mismo día → pnrDias=1', () => {
    const r = run({
      payrollIncidents: [
        pi({ incident_type: 'pnr', applies_from: '2026-03-01', applies_to: '2026-03-01' }),
      ],
    });
    expect(r.legacy.pnrDias).toBe(1);
    expect(r.flags.pnrActiva).toBe(true);
  });

  it('mes completo → pnrDias=31', () => {
    const r = run({
      payrollIncidents: [
        pi({ incident_type: 'pnr', applies_from: '2026-03-01', applies_to: '2026-03-31' }),
      ],
    });
    expect(r.legacy.pnrDias).toBe(31);
  });

  it('cruzando meses → solo intersección con el periodo', () => {
    const r = run({
      payrollIncidents: [
        pi({ incident_type: 'pnr', applies_from: '2026-02-25', applies_to: '2026-03-05' }),
      ],
    });
    expect(r.legacy.pnrDias).toBe(5); // 01..05 marzo
  });

  it('PNR fuera de periodo → no contribuye', () => {
    const r = run({
      payrollIncidents: [
        pi({ incident_type: 'pnr', applies_from: '2026-01-01', applies_to: '2026-01-10' }),
      ],
    });
    expect(r.legacy.pnrDias).toBeUndefined();
    expect(r.flags.pnrActiva).toBeUndefined();
  });

  it('PNR con deleted_at → no contribuye', () => {
    const r = run({
      payrollIncidents: [
        pi({
          incident_type: 'pnr',
          applies_from: '2026-03-01',
          applies_to: '2026-03-10',
          deleted_at: '2026-03-15T00:00:00Z',
        }),
      ],
    });
    expect(r.legacy.pnrDias).toBeUndefined();
  });
});

describe('mapIncidenciasToLegacyCasuistica — IT/AT/EP', () => {
  it('IT EC solapante → enfermedad_comun', () => {
    const r = run({
      itProcesses: [it_({ process_type: 'EC', start_date: '2026-03-05', end_date: '2026-03-15' })],
    });
    expect(r.legacy.itAtDias).toBe(11);
    expect(r.flags.itAtActiva).toBe(true);
    expect(r.flags.itAtTipo).toBe('enfermedad_comun');
  });

  it('AT + EC concurrentes → tipo accidente_trabajo, días únicos sin doble conteo', () => {
    const r = run({
      itProcesses: [
        it_({ process_type: 'EC', start_date: '2026-03-01', end_date: '2026-03-10' }),
        it_({ process_type: 'AT', start_date: '2026-03-05', end_date: '2026-03-12' }),
      ],
    });
    expect(r.legacy.itAtDias).toBe(12); // unión 01..12
    expect(r.flags.itAtTipo).toBe('accidente_trabajo');
  });

  it('IT cancelada → ignorada', () => {
    const r = run({
      itProcesses: [
        it_({ process_type: 'EC', start_date: '2026-03-01', end_date: '2026-03-10', status: 'cancelled' }),
      ],
    });
    expect(r.legacy.itAtDias).toBeUndefined();
  });
});

describe('mapIncidenciasToLegacyCasuistica — Reducción jornada', () => {
  it('30% (mes entero) y 20% (5 días) → escoge dominante 30%', () => {
    const r = run({
      payrollIncidents: [
        pi({
          incident_type: 'reduccion_jornada_guarda_legal',
          applies_from: '2026-03-01',
          applies_to: '2026-03-31',
          percent: 30,
        }),
        pi({
          incident_type: 'reduccion_jornada_guarda_legal',
          applies_from: '2026-03-10',
          applies_to: '2026-03-14',
          percent: 20,
        }),
      ],
    });
    expect(r.legacy.reduccionJornadaPct).toBe(30);
    expect(r.traces.length).toBeGreaterThanOrEqual(2);
  });
});

describe('mapIncidenciasToLegacyCasuistica — Atrasos', () => {
  it('múltiples atrasos → suma importes y periodo más antiguo', () => {
    const r = run({
      payrollIncidents: [
        pi({
          incident_type: 'atrasos_regularizacion',
          amount: 120,
          applies_from: '2026-03-01',
          applies_to: '2026-03-31',
          metadata: { origin_period_from: '2025-11' },
        }),
        pi({
          incident_type: 'atrasos_regularizacion',
          amount: 50,
          applies_from: '2026-03-01',
          applies_to: '2026-03-31',
          metadata: { origin_period_from: '2025-09' },
        }),
      ],
    });
    expect(r.legacy.atrasosITImporte).toBe(170);
    expect(r.legacy.atrasosITPeriodo).toBe('2025-09');
  });
});

describe('mapIncidenciasToLegacyCasuistica — Nacimiento', () => {
  it('Leave PAT aprobado dentro de periodo → nacimientoDias correcto y tipo paternidad', () => {
    const r = run({
      leaveRequests: [
        lr({ leave_type_code: 'PAT', start_date: '2026-03-01', end_date: '2026-03-15' }),
      ],
    });
    expect(r.legacy.nacimientoDias).toBe(15);
    expect(r.legacy.nacimientoTipo).toBe('paternidad');
    expect(r.flags.nacimientoFechaInicio).toBe('2026-03-01');
    expect(r.flags.nacimientoFechaFin).toBe('2026-03-15');
  });

  it('Leave no aprobado → no contribuye', () => {
    const r = run({
      leaveRequests: [
        lr({
          leave_type_code: 'PAT',
          start_date: '2026-03-01',
          end_date: '2026-03-15',
          workflow_status: 'pending_hr',
          status: 'pending',
        }),
      ],
    });
    expect(r.legacy.nacimientoDias).toBeUndefined();
  });
});

describe('mapIncidenciasToLegacyCasuistica — Unmapped + revisión legal', () => {
  it('desplazamiento_temporal → unmapped, no toca legacy', () => {
    const r = run({
      payrollIncidents: [
        pi({
          incident_type: 'desplazamiento_temporal',
          applies_from: '2026-03-01',
          applies_to: '2026-03-31',
          metadata: { tax_review_required: true },
        }),
      ],
    });
    expect(r.legacy.pnrDias).toBeUndefined();
    expect(r.legacy.itAtDias).toBeUndefined();
    expect(r.unmapped.length).toBe(1);
    expect(r.unmapped[0].incidentType).toBe('desplazamiento_temporal');
    expect(r.legalReviewRequired).toBe(true);
  });

  it('suspension_empleo_sueldo → unmapped + legalReviewRequired=true', () => {
    const r = run({
      payrollIncidents: [
        pi({
          incident_type: 'suspension_empleo_sueldo',
          applies_from: '2026-03-10',
          applies_to: '2026-03-20',
        }),
      ],
    });
    expect(r.legacy.pnrDias).toBeUndefined();
    expect(r.unmapped[0].incidentType).toBe('suspension_empleo_sueldo');
    expect(r.legalReviewRequired).toBe(true);
  });
});
