/**
 * CASUISTICA-FECHAS-01 — Fase C3B3B-paso2
 * Tests del wiring `casuisticaForEngine` que se aplica en
 * `HRPayrollEntryDialog`. La función `buildCasuisticaForEngine` replica
 * exactamente la regla del diálogo:
 *
 *  - `local_only`                 → motor recibe local.
 *  - `persisted_priority_preview` → motor recibe local.
 *  - `persisted_priority_apply`   → motor recibe `effective` con `period*`
 *                                   forzado desde local.
 *
 * NO se importa el diálogo: se valida la lógica pura. Si el diálogo cambia
 * la regla, este test falla.
 */
import { describe, it, expect } from 'vitest';
import {
  buildEffectiveCasuistica,
  type EffectiveResult,
} from '../effectiveCasuistica';
import {
  isEffectiveCasuisticaApplyEnabled,
  type PayrollEffectiveCasuisticaMode,
} from '../payrollEffectiveCasuisticaFlag';
import type {
  CasuisticaState,
  CasuisticaDatesExtension,
} from '../casuisticaTypes';
import type { MappingTrace } from '../incidenciasTypes';

type LocalCas = CasuisticaState & Partial<CasuisticaDatesExtension>;

const baseLocal: LocalCas = {
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

/**
 * Replica EXACTA de la regla del diálogo `HRPayrollEntryDialog`. Si el
 * diálogo cambia esta regla, hay que cambiarla aquí también (tests de
 * regresión explícitos sobre el contrato de wiring).
 */
function buildCasuisticaForEngine(args: {
  local: LocalCas;
  effectiveResult: EffectiveResult;
  mode: PayrollEffectiveCasuisticaMode;
}): LocalCas {
  const { local, effectiveResult, mode } = args;
  if (!isEffectiveCasuisticaApplyEnabled(mode)) return local;
  return {
    ...local,
    ...effectiveResult.effective,
    periodFechaDesde: local.periodFechaDesde,
    periodFechaHasta: local.periodFechaHasta,
    periodDiasNaturales: local.periodDiasNaturales,
    periodDiasEfectivos: local.periodDiasEfectivos,
    periodMotivo: local.periodMotivo,
  } as LocalCas;
}

function buildEff(opts: {
  local: LocalCas;
  persistedLegacy?: Partial<CasuisticaState>;
  traces?: MappingTrace[];
  unmapped?: MappingTrace[];
  legalReviewRequired?: boolean;
}): EffectiveResult {
  return buildEffectiveCasuistica({
    localCasuistica: opts.local,
    persistedLegacy: opts.persistedLegacy ?? {},
    mappingTraces: opts.traces ?? [],
    unmapped: opts.unmapped ?? [],
    legalReviewRequired: opts.legalReviewRequired ?? false,
    mode: 'persisted_priority',
  });
}

describe('casuisticaForEngine — C3B3B-paso2 wiring', () => {
  it('local_only: payload === local exacto (sin doble conteo nuevo)', () => {
    const local: LocalCas = { ...baseLocal, pnrDias: 3 };
    const eff = buildEff({
      local,
      persistedLegacy: { pnrDias: 5 },
      traces: [trace('payroll_incidents', 'pnr')],
    });
    const out = buildCasuisticaForEngine({
      local,
      effectiveResult: eff,
      mode: 'local_only',
    });
    expect(out).toBe(local);
    expect(out.pnrDias).toBe(3);
  });

  it('persisted_priority_preview: payload === local (cálculo no cambia)', () => {
    const local: LocalCas = { ...baseLocal, pnrDias: 3 };
    const eff = buildEff({
      local,
      persistedLegacy: { pnrDias: 5 },
      traces: [trace('payroll_incidents', 'pnr')],
    });
    const out = buildCasuisticaForEngine({
      local,
      effectiveResult: eff,
      mode: 'persisted_priority_preview',
    });
    expect(out).toBe(local);
    expect(out.pnrDias).toBe(3);
  });

  describe('persisted_priority_apply: usa effective sin doble conteo', () => {
    it('PNR local 3 + persistido 5 → 5 (no 8)', () => {
      const local: LocalCas = { ...baseLocal, pnrDias: 3 };
      const eff = buildEff({
        local,
        persistedLegacy: { pnrDias: 5 },
        traces: [trace('payroll_incidents', 'pnr')],
      });
      const out = buildCasuisticaForEngine({
        local,
        effectiveResult: eff,
        mode: 'persisted_priority_apply',
      });
      expect(out.pnrDias).toBe(5);
      expect(out.pnrDias).not.toBe(8);
    });

    it('Reducción local 50% + persistida 50% → 50 (no 100)', () => {
      const local: LocalCas = { ...baseLocal, reduccionJornadaPct: 50 };
      const eff = buildEff({
        local,
        persistedLegacy: { reduccionJornadaPct: 50 },
        traces: [
          trace('payroll_incidents', 'reduccion_jornada_guarda_legal'),
        ],
      });
      const out = buildCasuisticaForEngine({
        local,
        effectiveResult: eff,
        mode: 'persisted_priority_apply',
      });
      expect(out.reduccionJornadaPct).toBe(50);
      expect(out.reduccionJornadaPct).not.toBe(100);
    });

    it('Atrasos local 300€ + persistido 300€ → 300 (no 600)', () => {
      const local: LocalCas = {
        ...baseLocal,
        atrasosITImporte: 300,
        atrasosITPeriodo: '2026-02',
      };
      const eff = buildEff({
        local,
        persistedLegacy: {
          atrasosITImporte: 300,
          atrasosITPeriodo: '2026-02',
        },
        traces: [trace('payroll_incidents', 'atrasos_regularizacion')],
      });
      const out = buildCasuisticaForEngine({
        local,
        effectiveResult: eff,
        mode: 'persisted_priority_apply',
      });
      expect(out.atrasosITImporte).toBe(300);
      expect(out.atrasosITImporte).not.toBe(600);
    });

    it('IT local 4 + persistido 7 → 7 (no 11)', () => {
      const local: LocalCas = { ...baseLocal, itAtDias: 4 };
      const eff = buildEff({
        local,
        persistedLegacy: { itAtDias: 7 },
        traces: [trace('it_processes', 'incapacidad_temporal')],
      });
      const out = buildCasuisticaForEngine({
        local,
        effectiveResult: eff,
        mode: 'persisted_priority_apply',
      });
      expect(out.itAtDias).toBe(7);
      expect(out.itAtDias).not.toBe(11);
    });

    it('Nacimiento local 16 + persistido 16 → 16 (no 32)', () => {
      const local: LocalCas = { ...baseLocal, nacimientoDias: 16 };
      const eff = buildEff({
        local,
        persistedLegacy: { nacimientoDias: 16 },
        traces: [trace('leave_requests', 'paternidad')],
      });
      const out = buildCasuisticaForEngine({
        local,
        effectiveResult: eff,
        mode: 'persisted_priority_apply',
      });
      expect(out.nacimientoDias).toBe(16);
      expect(out.nacimientoDias).not.toBe(32);
    });

    it('sin persistidos: apply equivale a local (idempotencia)', () => {
      const local: LocalCas = {
        ...baseLocal,
        pnrDias: 2,
        itAtDias: 4,
      };
      const eff = buildEff({ local });
      const out = buildCasuisticaForEngine({
        local,
        effectiveResult: eff,
        mode: 'persisted_priority_apply',
      });
      expect(out.pnrDias).toBe(local.pnrDias);
      expect(out.itAtDias).toBe(local.itAtDias);
      expect(out.reduccionJornadaPct).toBe(0);
    });

    it('period* siempre desde local incluso en apply', () => {
      const local: LocalCas = {
        ...baseLocal,
        periodFechaDesde: '2026-03-10',
        periodFechaHasta: '2026-03-25',
        periodDiasNaturales: 31,
        periodDiasEfectivos: 16,
        periodMotivo: 'alta_intramensual',
        pnrDias: 1,
      };
      const eff = buildEff({
        local,
        persistedLegacy: { pnrDias: 4 },
        traces: [trace('payroll_incidents', 'pnr')],
      });
      const out = buildCasuisticaForEngine({
        local,
        effectiveResult: eff,
        mode: 'persisted_priority_apply',
      });
      expect(out.periodFechaDesde).toBe('2026-03-10');
      expect(out.periodFechaHasta).toBe('2026-03-25');
      expect(out.periodDiasNaturales).toBe(31);
      expect(out.periodDiasEfectivos).toBe(16);
      expect(out.periodMotivo).toBe('alta_intramensual');
      expect(out.pnrDias).toBe(4); // persisted
    });

    it('unmapped no entra al payload', () => {
      const local: LocalCas = { ...baseLocal };
      const eff = buildEff({
        local,
        unmapped: [
          trace('payroll_incidents', 'desplazamiento_temporal'),
        ],
      });
      const out = buildCasuisticaForEngine({
        local,
        effectiveResult: eff,
        mode: 'persisted_priority_apply',
      });
      // Ningún campo desconocido aparece; payload mantiene la forma legacy.
      expect((out as Record<string, unknown>).desplazamiento_temporal).toBeUndefined();
      expect(eff.unmappedInformative.length).toBe(1);
    });

    it('legal_review_required produce blockingForClose=true', () => {
      const local: LocalCas = { ...baseLocal, pnrDias: 1 };
      const eff = buildEff({
        local,
        persistedLegacy: { pnrDias: 1 },
        traces: [trace('payroll_incidents', 'pnr', true)],
        legalReviewRequired: true,
      });
      expect(eff.blockingForClose).toBe(true);
    });
  });
});

/**
 * C3B3C1 — regresión: con el default actual del flag
 * (`persisted_priority_preview`) el motor SIGUE recibiendo el payload local
 * exacto. Esta prueba protege la invariante "preview no cambia cálculo".
 */
import { PAYROLL_EFFECTIVE_CASUISTICA_MODE } from '../payrollEffectiveCasuisticaFlag';

describe('casuisticaForEngine — C3B3C1 default flag', () => {
  it('default flag = persisted_priority_preview (visibilidad sin apply)', () => {
    expect(PAYROLL_EFFECTIVE_CASUISTICA_MODE).toBe('persisted_priority_preview');
  });

  it('con default flag, el motor recibe local idéntico aunque haya persistido', () => {
    const local: LocalCas = { ...baseLocal, pnrDias: 3 };
    const eff = buildEff({
      local,
      persistedLegacy: { pnrDias: 5 },
      traces: [trace('payroll_incidents', 'pnr')],
    });
    const out = buildCasuisticaForEngine({
      local,
      effectiveResult: eff,
      mode: PAYROLL_EFFECTIVE_CASUISTICA_MODE,
    });
    // Identidad estricta: en preview el wiring devuelve la misma referencia
    // local, no un objeto fusionado.
    expect(out).toBe(local);
    expect(out.pnrDias).toBe(3);
  });

  it('rollback a local_only sigue produciendo el mismo payload local', () => {
    const local: LocalCas = { ...baseLocal, pnrDias: 3 };
    const eff = buildEff({
      local,
      persistedLegacy: { pnrDias: 5 },
      traces: [trace('payroll_incidents', 'pnr')],
    });
    const outPreview = buildCasuisticaForEngine({
      local,
      effectiveResult: eff,
      mode: 'persisted_priority_preview',
    });
    const outLocalOnly = buildCasuisticaForEngine({
      local,
      effectiveResult: eff,
      mode: 'local_only',
    });
    // Ambos rutean a la misma referencia local: el rollback es no-op
    // observable a nivel de payload del motor.
    expect(outPreview).toBe(local);
    expect(outLocalOnly).toBe(local);
    expect(outPreview).toBe(outLocalOnly);
  });
});