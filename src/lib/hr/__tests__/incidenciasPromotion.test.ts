/**
 * CASUISTICA-FECHAS-01 — Fase C3B2
 * Tests de la función pura `buildIncidentsFromLocalCasuistica`.
 * Sin Supabase. Sin red. Sin Date.now(). Determinista.
 */
import { describe, it, expect } from 'vitest';
import {
  buildIncidentsFromLocalCasuistica,
  type PromotionContext,
} from '../incidenciasPromotion';
import type {
  CasuisticaState,
  CasuisticaDatesExtension,
} from '../casuisticaTypes';
import type { PayrollIncidentRow } from '../incidenciasTypes';

const ctx: PromotionContext = {
  companyId: 'co-1',
  employeeId: 'emp-1',
  periodYear: 2026,
  periodMonth: 3,
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

function existing(partial: Partial<PayrollIncidentRow>): PayrollIncidentRow {
  return {
    id: 'x',
    company_id: ctx.companyId,
    employee_id: ctx.employeeId,
    period_year: 2026,
    period_month: 3,
    incident_type: 'pnr',
    concept_code: 'ES_PNR',
    applies_from: '2026-03-01',
    applies_to: '2026-03-01',
    status: 'pending',
    deleted_at: null,
    ...partial,
  } as unknown as PayrollIncidentRow;
}

describe('buildIncidentsFromLocalCasuistica — C3B2', () => {
  it('1) casuística vacía → hasAny=false, toCreate=0', () => {
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: emptyCas(),
      context: ctx,
      existingIncidents: [],
    });
    expect(r.hasAny).toBe(false);
    expect(r.toCreate).toHaveLength(0);
    expect(r.candidates).toHaveLength(0);
  });

  it('2) PNR completo sin duplicado → created pnr', () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 3;
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [],
    });
    expect(r.toCreate).toHaveLength(1);
    const c = r.toCreate[0];
    expect(c.source).toBe('pnr');
    expect(c.input?.incident_type).toBe('pnr');
    expect(c.input?.applies_from).toBe('2026-03-05');
    expect(c.input?.applies_to).toBe('2026-03-07');
    expect(c.input?.units).toBe(3);
    expect(c.input?.official_communication_type).toBe('AFI');
    expect(c.input?.requires_external_filing).toBe(true);
  });

  it('3) PNR con fechas pero días=0 → deriva días desde fechas (created)', () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 0;
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [],
    });
    expect(r.toCreate).toHaveLength(1);
    expect(r.toCreate[0].input?.units).toBe(3);
  });

  it('3b) PNR con días pero sin fechas → skipped_incomplete', () => {
    const cas = emptyCas();
    cas.pnrDias = 5;
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [],
    });
    expect(r.toCreate).toHaveLength(0);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].reason).toBe('skipped_incomplete');
  });

  it('4) PNR fechas invertidas → skipped_inverted_dates', () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-10';
    cas.pnrFechaHasta = '2026-03-05';
    cas.pnrDias = 6;
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [],
    });
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].reason).toBe('skipped_inverted_dates');
  });

  it('5) Reducción completa → created reducción con percent + legal review', () => {
    const cas = emptyCas();
    cas.reduccionFechaDesde = '2026-03-01';
    cas.reduccionFechaHasta = '2026-03-31';
    cas.reduccionJornadaPct = 50;
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [],
    });
    expect(r.toCreate).toHaveLength(1);
    const c = r.toCreate[0];
    expect(c.input?.incident_type).toBe('reduccion_jornada_guarda_legal');
    expect(c.input?.percent).toBe(50);
    expect(c.input?.legal_review_required).toBe(true);
  });

  it('6) Atrasos con importe + fechas directas → created', () => {
    const cas = emptyCas();
    cas.atrasosITImporte = 250;
    cas.atrasosFechaDesde = '2026-02-01';
    cas.atrasosFechaHasta = '2026-02-28';
    cas.atrasosITPeriodo = '2026-02';
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [],
    });
    expect(r.toCreate).toHaveLength(1);
    const c = r.toCreate[0];
    expect(c.input?.incident_type).toBe('atrasos_regularizacion');
    expect(c.input?.amount).toBe(250);
    expect(c.input?.requires_tax_adjustment).toBe(true);
    expect((c.input?.metadata as any)?.settlement_type).toBe('arrears');
    expect((c.input?.metadata as any)?.period_origin).toBe('2026-02');
  });

  it('6b) Atrasos sin fechas pero con periodo origen → deriva fechas del mes', () => {
    const cas = emptyCas();
    cas.atrasosITImporte = 100;
    cas.atrasosITPeriodo = '2026-02';
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [],
    });
    expect(r.toCreate).toHaveLength(1);
    expect(r.toCreate[0].input?.applies_from).toBe('2026-02-01');
    expect(r.toCreate[0].input?.applies_to).toBe('2026-02-28');
  });

  it('7) IT/AT con fechas → skipped_specialized', () => {
    const cas = emptyCas();
    cas.itAtFechaDesde = '2026-03-10';
    cas.itAtFechaHasta = '2026-03-15';
    cas.itAtTipo = 'enfermedad_comun';
    cas.itAtDias = 6;
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [],
    });
    expect(r.toCreate).toHaveLength(0);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].source).toBe('it_at');
    expect(r.skipped[0].reason).toBe('skipped_specialized');
  });

  it('8) Nacimiento con datos → skipped_specialized', () => {
    const cas = emptyCas();
    cas.nacimientoDias = 16;
    cas.nacimientoFechaInicio = '2026-03-01';
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [],
    });
    expect(r.toCreate).toHaveLength(0);
    expect(r.skipped[0].source).toBe('nacimiento');
    expect(r.skipped[0].reason).toBe('skipped_specialized');
  });

  it('9) Duplicado exacto activo → marca duplicate, no toCreate', () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 3;
    const ex = existing({
      id: 'p-existing',
      incident_type: 'pnr',
      applies_from: '2026-03-05',
      applies_to: '2026-03-07',
      status: 'pending',
      deleted_at: null,
    });
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [ex],
    });
    expect(r.toCreate).toHaveLength(0);
    expect(r.duplicates).toHaveLength(1);
    expect(r.duplicates[0].duplicateOfId).toBe('p-existing');
  });

  it('10) Duplicado cancelado/deleted → permite crear', () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 3;
    const ex1 = existing({
      id: 'p-cancel',
      incident_type: 'pnr',
      applies_from: '2026-03-05',
      applies_to: '2026-03-07',
      status: 'cancelled',
      deleted_at: null,
    });
    const ex2 = existing({
      id: 'p-del',
      incident_type: 'pnr',
      applies_from: '2026-03-05',
      applies_to: '2026-03-07',
      status: 'pending',
      deleted_at: '2026-04-01T00:00:00Z',
    });
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [ex1, ex2],
    });
    expect(r.toCreate).toHaveLength(1);
    expect(r.duplicates).toHaveLength(0);
  });

  it('11) Mix PNR ok + IT skipped + reducción duplicate', () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 3;
    cas.itAtFechaDesde = '2026-03-10';
    cas.itAtFechaHasta = '2026-03-12';
    cas.itAtTipo = 'accidente_no_laboral';
    cas.reduccionFechaDesde = '2026-03-01';
    cas.reduccionFechaHasta = '2026-03-31';
    cas.reduccionJornadaPct = 25;
    const ex = existing({
      id: 'r-exist',
      incident_type: 'reduccion_jornada_guarda_legal',
      applies_from: '2026-03-01',
      applies_to: '2026-03-31',
      status: 'pending',
      deleted_at: null,
    });
    const r = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [ex],
    });
    expect(r.toCreate).toHaveLength(1);
    expect(r.toCreate[0].source).toBe('pnr');
    expect(r.duplicates).toHaveLength(1);
    expect(r.duplicates[0].source).toBe('reduccion');
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].source).toBe('it_at');
  });

  it('12) Pureza: no muta input y misma entrada → misma salida', () => {
    const cas = emptyCas();
    cas.pnrFechaDesde = '2026-03-05';
    cas.pnrFechaHasta = '2026-03-07';
    cas.pnrDias = 3;
    const snapshot = JSON.parse(JSON.stringify(cas));
    const r1 = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [],
    });
    const r2 = buildIncidentsFromLocalCasuistica({
      casuistica: cas,
      context: ctx,
      existingIncidents: [],
    });
    expect(cas).toEqual(snapshot);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});