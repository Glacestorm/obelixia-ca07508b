/**
 * CASUISTICA-FECHAS-01 — Fase C3B3A
 * Helper puro para construir el `effectiveCasuistica` que define la fuente de
 * verdad por campo entre los datos locales (Fase B) y los persistidos
 * (`erp_hr_payroll_incidents`, `erp_hr_it_processes`, `erp_hr_leave_requests`
 * vía adapter C2).
 *
 * INVARIANTES:
 *  - Función pura. Sin Date.now(), sin red, sin Supabase, sin I/O.
 *  - No muta los inputs (clona lo necesario).
 *  - Determinista: misma entrada ⇒ misma salida.
 *  - `unmapped` jamás entra en `effective` (sólo en `unmappedInformative`).
 *  - Cobertura del periodo (periodFechaDesde/Hasta, periodMotivo,
 *    periodDiasNaturales, periodDiasEfectivos) SIEMPRE viene de local.
 *  - En C3B3A este resultado NO se conecta al motor de nómina; es solo
 *    visualización. La conexión al motor se hará en C3B3B.
 */

import type {
  CasuisticaState,
  CasuisticaDatesExtension,
} from './casuisticaTypes';
import type { MappingTrace } from './incidenciasTypes';

export type EffectiveMode =
  | 'persisted_priority'
  | 'local_priority'
  | 'manual_override'
  | 'sum_explicit';

export type CasuisticaProcessKey =
  | 'pnr'
  | 'reduccion'
  | 'atrasos'
  | 'it_at'
  | 'nacimiento';

export interface CasuisticaConflict {
  field: keyof CasuisticaState;
  process: CasuisticaProcessKey;
  localValue: number | string;
  persistedValue: number | string;
  resolvedSource: 'local' | 'persisted' | 'manual_override';
  legalReviewRequired: boolean;
  rationale: string;
}

export interface IgnoredLocalEntry {
  field: string;
  value: unknown;
  reason: string;
}

export interface EffectiveResult {
  effective: CasuisticaState & Partial<CasuisticaDatesExtension>;
  conflicts: CasuisticaConflict[];
  sourceMap: Partial<Record<keyof CasuisticaState, 'local' | 'persisted' | 'none'>>;
  appliedTraces: MappingTrace[];
  ignoredLocal: IgnoredLocalEntry[];
  unmappedInformative: MappingTrace[];
  blockingForClose: boolean;
}

export interface BuildEffectiveCasuisticaInput {
  localCasuistica: CasuisticaState & Partial<CasuisticaDatesExtension>;
  persistedLegacy: Partial<CasuisticaState>;
  mappingTraces: MappingTrace[];
  unmapped: MappingTrace[];
  legalReviewRequired: boolean;
  mode: EffectiveMode;
  manualOverrides?: Partial<Record<keyof CasuisticaState, 'local' | 'persisted'>>;
}

// ─── Helpers internos ────────────────────────────────────────────────────

function hasPersistedNumber(v: number | undefined | null): v is number {
  return typeof v === 'number' && v > 0;
}

function hasLocalNumber(v: number | undefined | null): boolean {
  return typeof v === 'number' && v > 0;
}

function tracesForProcess(
  traces: MappingTrace[],
  process: CasuisticaProcessKey,
): MappingTrace[] {
  return traces.filter((t) => {
    const it = (t.incidentType ?? '').toLowerCase();
    const src = t.source;
    switch (process) {
      case 'pnr':
        return src === 'payroll_incidents' && it === 'pnr';
      case 'reduccion':
        return (
          src === 'payroll_incidents' &&
          (it === 'reduccion_jornada_guarda_legal' || it === 'reduction')
        );
      case 'atrasos':
        return src === 'payroll_incidents' && it === 'atrasos_regularizacion';
      case 'it_at':
        return src === 'it_processes';
      case 'nacimiento':
        return src === 'leave_requests';
      default:
        return false;
    }
  });
}

function anyLegalReview(traces: MappingTrace[]): boolean {
  return traces.some((t) => t.legalReviewRequired === true);
}

/**
 * Resuelve un campo numérico aplicando la política de modo y, en su caso,
 * un override manual por campo.
 */
function resolveNumeric(args: {
  field: keyof CasuisticaState;
  process: CasuisticaProcessKey;
  localValue: number;
  persistedValue: number | undefined;
  mode: EffectiveMode;
  override: 'local' | 'persisted' | undefined;
  traces: MappingTrace[];
}): {
  value: number;
  source: 'local' | 'persisted' | 'none';
  conflict: CasuisticaConflict | null;
  applied: MappingTrace[];
  ignored: IgnoredLocalEntry | null;
  legalReviewRequired: boolean;
} {
  const { field, process, localValue, persistedValue, mode, override, traces } = args;
  const hasLocal = hasLocalNumber(localValue);
  const hasPersisted = hasPersistedNumber(persistedValue ?? null);
  const legal = anyLegalReview(traces);

  // Sin datos en ninguna fuente.
  if (!hasLocal && !hasPersisted) {
    return {
      value: 0,
      source: 'none',
      conflict: null,
      applied: [],
      ignored: null,
      legalReviewRequired: false,
    };
  }

  // Solo una fuente activa: no hay conflicto.
  if (hasLocal && !hasPersisted) {
    return {
      value: localValue,
      source: 'local',
      conflict: null,
      applied: [],
      ignored: null,
      legalReviewRequired: false,
    };
  }
  if (!hasLocal && hasPersisted) {
    return {
      value: persistedValue as number,
      source: 'persisted',
      conflict: null,
      applied: traces,
      ignored: null,
      legalReviewRequired: legal,
    };
  }

  // Ambas fuentes presentes ⇒ conflicto. La resolución depende del modo.
  let resolved: 'local' | 'persisted' | 'manual_override';
  let value: number;
  let applied: MappingTrace[] = [];
  let ignored: IgnoredLocalEntry | null = null;
  let rationale = '';

  if (override === 'local') {
    resolved = 'manual_override';
    value = localValue;
    rationale = 'Override manual: forzado a fuente local.';
  } else if (override === 'persisted') {
    resolved = 'manual_override';
    value = persistedValue as number;
    applied = traces;
    ignored = {
      field: String(field),
      value: localValue,
      reason: 'Override manual a persistido. Local ignorado en cálculo.',
    };
    rationale = 'Override manual: forzado a fuente persistida.';
  } else if (mode === 'persisted_priority') {
    resolved = 'persisted';
    value = persistedValue as number;
    applied = traces;
    ignored = {
      field: String(field),
      value: localValue,
      reason: 'Persistido prioritario. Local ignorado en cálculo.',
    };
    rationale =
      'Modo persisted_priority: existe valor persistido para el periodo; el local se ignora para evitar doble conteo.';
  } else if (mode === 'local_priority') {
    resolved = 'local';
    value = localValue;
    rationale =
      'Modo local_priority: se mantiene el valor local; el persistido queda informativo.';
  } else if (mode === 'sum_explicit') {
    // En C3B3A no sumamos nunca por defecto. sum_explicit requiere toggle
    // futuro; aquí lo tratamos como local_priority + warning.
    resolved = 'local';
    value = localValue;
    rationale =
      'Modo sum_explicit: la suma local+persistido NO está habilitada en C3B3A. Se mantiene local hasta confirmación explícita.';
  } else {
    // manual_override sin override informado → comportamiento conservador:
    // se mantiene local y se reporta conflicto.
    resolved = 'local';
    value = localValue;
    rationale =
      'Modo manual_override sin selección: se mantiene local a la espera de decisión del usuario.';
  }

  const conflict: CasuisticaConflict = {
    field,
    process,
    localValue,
    persistedValue: persistedValue as number,
    resolvedSource: resolved,
    legalReviewRequired: legal,
    rationale,
  };

  return {
    value,
    source:
      resolved === 'manual_override'
        ? override === 'local'
          ? 'local'
          : 'persisted'
        : resolved,
    conflict,
    applied,
    ignored,
    legalReviewRequired: legal && resolved !== 'local',
  };
}

// ─── API principal ───────────────────────────────────────────────────────

export function buildEffectiveCasuistica(
  input: BuildEffectiveCasuisticaInput,
): EffectiveResult {
  const {
    localCasuistica,
    persistedLegacy,
    mappingTraces,
    unmapped,
    legalReviewRequired,
    mode,
    manualOverrides,
  } = input;

  // Clonado superficial para no mutar inputs.
  const effective: CasuisticaState & Partial<CasuisticaDatesExtension> = {
    ...localCasuistica,
  };

  const conflicts: CasuisticaConflict[] = [];
  const sourceMap: Partial<Record<keyof CasuisticaState, 'local' | 'persisted' | 'none'>> = {};
  const appliedTraces: MappingTrace[] = [];
  const ignoredLocal: IgnoredLocalEntry[] = [];

  // Normaliza override por campo.
  const ov = manualOverrides ?? {};

  // PNR
  {
    const r = resolveNumeric({
      field: 'pnrDias',
      process: 'pnr',
      localValue: localCasuistica.pnrDias ?? 0,
      persistedValue: persistedLegacy.pnrDias,
      mode,
      override: ov.pnrDias,
      traces: tracesForProcess(mappingTraces, 'pnr'),
    });
    effective.pnrDias = r.value;
    sourceMap.pnrDias = r.source;
    if (r.conflict) conflicts.push(r.conflict);
    appliedTraces.push(...r.applied);
    if (r.ignored) ignoredLocal.push(r.ignored);
  }

  // Reducción jornada
  {
    const r = resolveNumeric({
      field: 'reduccionJornadaPct',
      process: 'reduccion',
      localValue: localCasuistica.reduccionJornadaPct ?? 0,
      persistedValue: persistedLegacy.reduccionJornadaPct,
      mode,
      override: ov.reduccionJornadaPct,
      traces: tracesForProcess(mappingTraces, 'reduccion'),
    });
    effective.reduccionJornadaPct = r.value;
    sourceMap.reduccionJornadaPct = r.source;
    if (r.conflict) conflicts.push(r.conflict);
    appliedTraces.push(...r.applied);
    if (r.ignored) ignoredLocal.push(r.ignored);
  }

  // Atrasos
  {
    const r = resolveNumeric({
      field: 'atrasosITImporte',
      process: 'atrasos',
      localValue: localCasuistica.atrasosITImporte ?? 0,
      persistedValue: persistedLegacy.atrasosITImporte,
      mode,
      override: ov.atrasosITImporte,
      traces: tracesForProcess(mappingTraces, 'atrasos'),
    });
    effective.atrasosITImporte = r.value;
    sourceMap.atrasosITImporte = r.source;
    if (r.source === 'persisted' || r.source === 'local') {
      // Mantener periodo del lado que gana cuando exista; si no, el local.
      const persistedPeriodo = persistedLegacy.atrasosITPeriodo;
      if (r.source === 'persisted' && typeof persistedPeriodo === 'string' && persistedPeriodo) {
        effective.atrasosITPeriodo = persistedPeriodo;
      } else {
        effective.atrasosITPeriodo = localCasuistica.atrasosITPeriodo ?? '';
      }
    }
    if (r.conflict) conflicts.push(r.conflict);
    appliedTraces.push(...r.applied);
    if (r.ignored) ignoredLocal.push(r.ignored);
  }

  // IT/AT
  {
    const r = resolveNumeric({
      field: 'itAtDias',
      process: 'it_at',
      localValue: localCasuistica.itAtDias ?? 0,
      persistedValue: persistedLegacy.itAtDias,
      mode,
      override: ov.itAtDias,
      traces: tracesForProcess(mappingTraces, 'it_at'),
    });
    effective.itAtDias = r.value;
    sourceMap.itAtDias = r.source;
    if (r.conflict) conflicts.push(r.conflict);
    appliedTraces.push(...r.applied);
    if (r.ignored) ignoredLocal.push(r.ignored);
  }

  // Nacimiento (días)
  {
    const r = resolveNumeric({
      field: 'nacimientoDias',
      process: 'nacimiento',
      localValue: localCasuistica.nacimientoDias ?? 0,
      persistedValue: persistedLegacy.nacimientoDias,
      mode,
      override: ov.nacimientoDias,
      traces: tracesForProcess(mappingTraces, 'nacimiento'),
    });
    effective.nacimientoDias = r.value;
    sourceMap.nacimientoDias = r.source;
    if (r.source === 'persisted' && persistedLegacy.nacimientoTipo) {
      effective.nacimientoTipo = persistedLegacy.nacimientoTipo;
    }
    if (r.conflict) conflicts.push(r.conflict);
    appliedTraces.push(...r.applied);
    if (r.ignored) ignoredLocal.push(r.ignored);
  }

  // Cobertura periodo SIEMPRE local (invariante).
  effective.periodFechaDesde = localCasuistica.periodFechaDesde;
  effective.periodFechaHasta = localCasuistica.periodFechaHasta;
  effective.periodDiasNaturales = localCasuistica.periodDiasNaturales;
  effective.periodDiasEfectivos = localCasuistica.periodDiasEfectivos;
  effective.periodMotivo = localCasuistica.periodMotivo;

  // unmapped: nunca al cálculo.
  const unmappedInformative = [...unmapped];

  // Bloqueo de cierre: en C3B3A es informativo (no se aplica realmente
  // todavía). Marcamos true si existe revisión legal global o algún
  // conflicto resuelto a persistido con flag legal.
  const blockingForClose =
    legalReviewRequired ||
    conflicts.some((c) => c.legalReviewRequired && c.resolvedSource !== 'local');

  return {
    effective,
    conflicts,
    sourceMap,
    appliedTraces,
    ignoredLocal,
    unmappedInformative,
    blockingForClose,
  };
}

export default buildEffectiveCasuistica;