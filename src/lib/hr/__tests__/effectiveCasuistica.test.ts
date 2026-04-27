/**
 * CASUISTICA-FECHAS-01 — Fase C3B3A
 * Tests del helper puro `buildEffectiveCasuistica`.
 */
import { describe, it, expect } from 'vitest';
import {
  buildEffectiveCasuistica,
  type EffectiveMode,
} from '../effectiveCasuistica';
import type { CasuisticaState, CasuisticaDatesExtension } from '../casuisticaTypes';
import type { MappingTrace } from '../incidenciasTypes';

const baseLocal: CasuisticaState & Partial<CasuisticaDatesExtension> = {
  enabled: true,
  pnrDias: 0,
  itAtDias: 0,
  reduccionJornadaPct: 0,
  atrasosITImporte: 0,
  atrasosITPeriodo: '',
  nacimientoTipo: 'paternidad',
  nacimientoDias: 0,
  nacimientoImporte: 0,
  periodFechaDesde: '2026-03-01',
  periodFechaHasta: '2026-03-31',
  periodDiasNaturales: 31,
  periodDiasEfectivos: 31,
  periodMotivo: 'mes_completo',
};

function trace(
  source: MappingTrace['source'],
  incidentType: string,
  legal = false,
): MappingTrace {
  return {
    source,
    recordId: `${source}-${incidentType}-1`,
    incidentType,
    legalReviewRequired: legal,
  };
}

function build(opts: Partial<Parameters<typeof buildEffectiveCasuistica>[0]> = {}) {
  return buildEffectiveCasuistica({
    localCasuistica: baseLocal,
    persistedLegacy: {},
    mappingTraces: [],
    unmapped: [],
    legalReviewRequired: false,
    mode: 'persisted_priority' as EffectiveMode,
    ...opts,
  });
}

describe('buildEffectiveCasuistica — C3B3A', () => {
  it('local vacío + persistido PNR → usa persistido sin conflicto', () => {
    const r = build({
      persistedLegacy: { pnrDias: 3 },
      mappingTraces: [trace('payroll_incidents', 'pnr')],
    });
    expect(r.effective.pnrDias).toBe(3);
    expect(r.sourceMap.pnrDias).toBe('persisted');
    expect(r.conflicts).toHaveLength(0);
    expect(r.appliedTraces).toHaveLength(1);
  });

  it('persistido vacío + local PNR → usa local sin conflicto', () => {
    const r = build({
      localCasuistica: { ...baseLocal, pnrDias: 2 },
    });
    expect(r.effective.pnrDias).toBe(2);
    expect(r.sourceMap.pnrDias).toBe('local');
    expect(r.conflicts).toHaveLength(0);
  });

  it('local PNR + persistido PNR → conflicto, persistido gana en persisted_priority', () => {
    const r = build({
      localCasuistica: { ...baseLocal, pnrDias: 3 },
      persistedLegacy: { pnrDias: 3 },
      mappingTraces: [trace('payroll_incidents', 'pnr')],
    });
    expect(r.effective.pnrDias).toBe(3);
    expect(r.sourceMap.pnrDias).toBe('persisted');
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].process).toBe('pnr');
    expect(r.conflicts[0].resolvedSource).toBe('persisted');
    expect(r.ignoredLocal.find((i) => i.field === 'pnrDias')).toBeTruthy();
  });

  it('local reducción + persistida reducción → conflicto, persisted gana', () => {
    const r = build({
      localCasuistica: { ...baseLocal, reduccionJornadaPct: 50 },
      persistedLegacy: { reduccionJornadaPct: 30 },
      mappingTraces: [trace('payroll_incidents', 'reduccion_jornada_guarda_legal')],
    });
    expect(r.effective.reduccionJornadaPct).toBe(30);
    expect(r.conflicts.some((c) => c.process === 'reduccion')).toBe(true);
  });

  it('local atrasos + persistidos atrasos → conflicto, persisted gana y conserva periodo persistido', () => {
    const r = build({
      localCasuistica: {
        ...baseLocal,
        atrasosITImporte: 200,
        atrasosITPeriodo: '2026-01',
      },
      persistedLegacy: { atrasosITImporte: 300, atrasosITPeriodo: '2026-02' },
      mappingTraces: [trace('payroll_incidents', 'atrasos_regularizacion')],
    });
    expect(r.effective.atrasosITImporte).toBe(300);
    expect(r.effective.atrasosITPeriodo).toBe('2026-02');
    expect(r.conflicts.some((c) => c.process === 'atrasos')).toBe(true);
  });

  it('IT local + IT persistido → conflicto, NUNCA suma', () => {
    const r = build({
      localCasuistica: { ...baseLocal, itAtDias: 5 },
      persistedLegacy: { itAtDias: 7 },
      mappingTraces: [trace('it_processes', 'AT')],
    });
    expect(r.effective.itAtDias).toBe(7); // no es 12
    expect(r.conflicts.some((c) => c.process === 'it_at')).toBe(true);
  });

  it('nacimiento local + persistido → conflicto, persisted gana y aplica tipo persistido', () => {
    const r = build({
      localCasuistica: { ...baseLocal, nacimientoDias: 16, nacimientoTipo: 'paternidad' },
      persistedLegacy: { nacimientoDias: 20, nacimientoTipo: 'maternidad' },
      mappingTraces: [trace('leave_requests', 'MAT')],
    });
    expect(r.effective.nacimientoDias).toBe(20);
    expect(r.effective.nacimientoTipo).toBe('maternidad');
    expect(r.conflicts.some((c) => c.process === 'nacimiento')).toBe(true);
  });

  it('unmapped (desplazamiento) NUNCA entra en effective; aparece en unmappedInformative', () => {
    const um: MappingTrace = {
      source: 'payroll_incidents',
      recordId: 'desp-1',
      incidentType: 'desplazamiento_temporal',
    };
    const r = build({ unmapped: [um] });
    expect(r.unmappedInformative).toHaveLength(1);
    expect(r.effective.pnrDias).toBe(0);
    expect(r.effective.itAtDias).toBe(0);
  });

  it('cobertura periodo SIEMPRE proviene de local', () => {
    const r = build({
      localCasuistica: {
        ...baseLocal,
        periodFechaDesde: '2026-03-10',
        periodFechaHasta: '2026-03-31',
        periodDiasNaturales: 22,
        periodDiasEfectivos: 20,
        periodMotivo: 'alta_intramensual',
      },
      persistedLegacy: { pnrDias: 1 },
      mappingTraces: [trace('payroll_incidents', 'pnr')],
    });
    expect(r.effective.periodFechaDesde).toBe('2026-03-10');
    expect(r.effective.periodFechaHasta).toBe('2026-03-31');
    expect(r.effective.periodDiasNaturales).toBe(22);
    expect(r.effective.periodDiasEfectivos).toBe(20);
    expect(r.effective.periodMotivo).toBe('alta_intramensual');
  });

  it('local_priority: usa local pero registra conflicto', () => {
    const r = build({
      mode: 'local_priority',
      localCasuistica: { ...baseLocal, pnrDias: 3 },
      persistedLegacy: { pnrDias: 5 },
      mappingTraces: [trace('payroll_incidents', 'pnr')],
    });
    expect(r.effective.pnrDias).toBe(3);
    expect(r.sourceMap.pnrDias).toBe('local');
    expect(r.conflicts).toHaveLength(1);
  });

  it('manual_override permite forzar local con override', () => {
    const r = build({
      mode: 'manual_override',
      localCasuistica: { ...baseLocal, pnrDias: 3 },
      persistedLegacy: { pnrDias: 5 },
      mappingTraces: [trace('payroll_incidents', 'pnr')],
      manualOverrides: { pnrDias: 'local' },
    });
    expect(r.effective.pnrDias).toBe(3);
    expect(r.conflicts[0].resolvedSource).toBe('manual_override');
  });

  it('manual_override permite forzar persisted con override', () => {
    const r = build({
      mode: 'manual_override',
      localCasuistica: { ...baseLocal, pnrDias: 3 },
      persistedLegacy: { pnrDias: 5 },
      mappingTraces: [trace('payroll_incidents', 'pnr')],
      manualOverrides: { pnrDias: 'persisted' },
    });
    expect(r.effective.pnrDias).toBe(5);
    expect(r.conflicts[0].resolvedSource).toBe('manual_override');
  });

  it('sum_explicit NO suma en C3B3A: mantiene local con rationale explicativa', () => {
    const r = build({
      mode: 'sum_explicit',
      localCasuistica: { ...baseLocal, pnrDias: 3 },
      persistedLegacy: { pnrDias: 4 },
      mappingTraces: [trace('payroll_incidents', 'pnr')],
    });
    expect(r.effective.pnrDias).toBe(3); // NO 7
    expect(r.conflicts[0].rationale).toMatch(/sum_explicit/i);
  });

  it('legalReviewRequired global → blockingForClose=true', () => {
    const r = build({
      legalReviewRequired: true,
      persistedLegacy: { pnrDias: 1 },
      mappingTraces: [trace('payroll_incidents', 'pnr', true)],
    });
    expect(r.blockingForClose).toBe(true);
  });

  it('pureza: no muta el input localCasuistica', () => {
    const local = { ...baseLocal, pnrDias: 3 };
    const snapshot = JSON.stringify(local);
    build({
      localCasuistica: local,
      persistedLegacy: { pnrDias: 9 },
      mappingTraces: [trace('payroll_incidents', 'pnr')],
    });
    expect(JSON.stringify(local)).toBe(snapshot);
  });

  it('determinista: misma entrada produce misma salida', () => {
    const args = {
      localCasuistica: { ...baseLocal, pnrDias: 2 },
      persistedLegacy: { pnrDias: 3, reduccionJornadaPct: 25 },
      mappingTraces: [
        trace('payroll_incidents', 'pnr'),
        trace('payroll_incidents', 'reduccion_jornada_guarda_legal'),
      ],
      unmapped: [],
      legalReviewRequired: false,
      mode: 'persisted_priority' as EffectiveMode,
    };
    const a = buildEffectiveCasuistica(args);
    const b = buildEffectiveCasuistica(args);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});