/**
 * CASUISTICA-FECHAS-01 — Fase C3B2
 * Función PURA `buildIncidentsFromLocalCasuistica`:
 *  - Analiza la casuística local (Fase B) y construye candidatos para
 *    persistir en `erp_hr_payroll_incidents` reutilizando el INSERT
 *    de C3B1 (`createPayrollIncident`).
 *  - Detecta duplicados exactos contra incidencias activas existentes.
 *  - Omite tipos especializados (IT/AT/EP, nacimiento/cuidado/lactancia)
 *    porque deben gestionarse en sus módulos canónicos.
 *
 * INVARIANTES:
 *  - Sin side-effects: no toca BD, no llama a Supabase, no usa Date.now().
 *  - No muta los argumentos.
 *  - Determinista: misma entrada → misma salida.
 *  - No genera FDI/AFI/DELT@ (sólo marca flags pendientes en metadata/flags).
 *  - No modifica el payload del motor de nómina.
 */

import type {
  CasuisticaState,
  CasuisticaDatesExtension,
} from './casuisticaTypes';
import type { PayrollIncidentRow } from './incidenciasTypes';
import {
  calculateInclusiveDays,
  isInvertedRange,
} from './casuisticaDates';
import type { NewPayrollIncidentInput } from '@/hooks/erp/hr/usePayrollIncidentMutations';

export type PromotionReason =
  | 'created'
  | 'duplicate'
  | 'skipped_specialized'
  | 'skipped_incomplete'
  | 'skipped_inverted_dates';

export type PromotionSource =
  | 'pnr'
  | 'reduccion'
  | 'atrasos'
  | 'it_at'
  | 'nacimiento';

export interface PromotionCandidate {
  source: PromotionSource;
  reason: PromotionReason;
  /** Sólo presente si `reason === 'created'`. */
  input?: NewPayrollIncidentInput;
  /** Texto humano corto explicando la decisión. */
  rationale: string;
  /** Sólo presente si `reason === 'duplicate'`. */
  duplicateOfId?: string;
}

export interface PromotionContext {
  companyId: string;
  employeeId: string;
  periodYear: number;
  periodMonth: number;
}

export interface PromotionResult {
  candidates: PromotionCandidate[];
  toCreate: PromotionCandidate[];
  duplicates: PromotionCandidate[];
  skipped: PromotionCandidate[];
  hasAny: boolean;
}

export interface BuildIncidentsArgs {
  casuistica: CasuisticaState & Partial<CasuisticaDatesExtension>;
  context: PromotionContext;
  existingIncidents: PayrollIncidentRow[];
}

/* ---------- Helpers internos ---------- */

function firstDayOfPeriod(periodYYYYMM: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(periodYYYYMM)) return null;
  return `${periodYYYYMM}-01`;
}

function lastDayOfPeriod(periodYYYYMM: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(periodYYYYMM)) return null;
  const [y, m] = periodYYYYMM.split('-').map(Number);
  // Día 0 del mes siguiente = último día del mes.
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${periodYYYYMM}-${String(last).padStart(2, '0')}`;
}

function isActiveExisting(row: PayrollIncidentRow): boolean {
  if (row.deleted_at != null) return false;
  if (row.status === 'cancelled') return false;
  return true;
}

function findDuplicate(
  existing: PayrollIncidentRow[],
  ctx: PromotionContext,
  type: NewPayrollIncidentInput['incident_type'],
  from: string,
  to: string,
): PayrollIncidentRow | null {
  for (const r of existing) {
    if (!isActiveExisting(r)) continue;
    if (r.company_id !== ctx.companyId) continue;
    if (r.employee_id !== ctx.employeeId) continue;
    if (r.incident_type !== type) continue;
    if (r.applies_from !== from) continue;
    if (r.applies_to !== to) continue;
    return r;
  }
  return null;
}

/* ---------- Builders por tipo ---------- */

function buildPnrCandidate(
  cas: CasuisticaState & Partial<CasuisticaDatesExtension>,
  ctx: PromotionContext,
  existing: PayrollIncidentRow[],
): PromotionCandidate | null {
  const from = cas.pnrFechaDesde ?? '';
  const to = cas.pnrFechaHasta ?? '';
  const days = cas.pnrDias ?? 0;

  const hasAnyPnrSignal = Boolean(from) || Boolean(to) || days > 0;
  if (!hasAnyPnrSignal) return null;

  if (!from || !to) {
    return {
      source: 'pnr',
      reason: 'skipped_incomplete',
      rationale: 'Para persistir PNR se requieren fecha inicio y fecha fin.',
    };
  }
  if (isInvertedRange(from, to)) {
    return {
      source: 'pnr',
      reason: 'skipped_inverted_dates',
      rationale: 'PNR: la fecha de fin no puede ser anterior a la de inicio.',
    };
  }
  const derived = calculateInclusiveDays(from, to);
  const units = days > 0 ? days : derived;
  if (!units || units <= 0) {
    return {
      source: 'pnr',
      reason: 'skipped_incomplete',
      rationale: 'PNR: sin días informados ni derivables desde las fechas.',
    };
  }

  const dup = findDuplicate(existing, ctx, 'pnr', from, to);
  if (dup) {
    return {
      source: 'pnr',
      reason: 'duplicate',
      duplicateOfId: dup.id,
      rationale: `Ya existe un PNR persistido (${from} → ${to}).`,
    };
  }

  return {
    source: 'pnr',
    reason: 'created',
    rationale: `PNR ${from} → ${to} (${units} día${units === 1 ? '' : 's'}).`,
    input: {
      incident_type: 'pnr',
      applies_from: from,
      applies_to: to,
      units,
      concept_code: 'ES_PNR',
      requires_ss_action: true,
      requires_external_filing: true,
      official_communication_type: 'AFI',
      legal_review_required: false,
      metadata: { source: 'local_casuistica_promotion' },
    },
  };
}

function buildReduccionCandidate(
  cas: CasuisticaState & Partial<CasuisticaDatesExtension>,
  ctx: PromotionContext,
  existing: PayrollIncidentRow[],
): PromotionCandidate | null {
  const from = cas.reduccionFechaDesde ?? '';
  const to = cas.reduccionFechaHasta ?? '';
  const pct = cas.reduccionJornadaPct ?? 0;

  const hasAnyRedSignal = Boolean(from) || Boolean(to) || pct > 0;
  if (!hasAnyRedSignal) return null;

  if (pct <= 0) {
    return {
      source: 'reduccion',
      reason: 'skipped_incomplete',
      rationale: 'Reducción de jornada sin porcentaje > 0.',
    };
  }
  if (!from || !to) {
    return {
      source: 'reduccion',
      reason: 'skipped_incomplete',
      rationale: 'Reducción: se requieren fecha inicio y fecha fin.',
    };
  }
  if (isInvertedRange(from, to)) {
    return {
      source: 'reduccion',
      reason: 'skipped_inverted_dates',
      rationale: 'Reducción: la fecha de fin no puede ser anterior a la de inicio.',
    };
  }

  const dup = findDuplicate(existing, ctx, 'reduccion_jornada_guarda_legal', from, to);
  if (dup) {
    return {
      source: 'reduccion',
      reason: 'duplicate',
      duplicateOfId: dup.id,
      rationale: `Ya existe una reducción persistida (${from} → ${to}).`,
    };
  }

  return {
    source: 'reduccion',
    reason: 'created',
    rationale: `Reducción jornada ${from} → ${to} (${pct}%).`,
    input: {
      incident_type: 'reduccion_jornada_guarda_legal',
      applies_from: from,
      applies_to: to,
      percent: pct,
      concept_code: 'ES_REDUCCION_JORNADA',
      requires_ss_action: true,
      legal_review_required: true,
      metadata: {
        legal_guardianship: true,
        source: 'local_casuistica_promotion',
      },
    },
  };
}

function buildAtrasosCandidate(
  cas: CasuisticaState & Partial<CasuisticaDatesExtension>,
  ctx: PromotionContext,
  existing: PayrollIncidentRow[],
): PromotionCandidate | null {
  const importe = cas.atrasosITImporte ?? 0;
  const periodo = cas.atrasosITPeriodo ?? '';
  const fFrom = cas.atrasosFechaDesde ?? '';
  const fTo = cas.atrasosFechaHasta ?? '';

  const hasAnyAtrasosSignal =
    importe > 0 || Boolean(periodo) || Boolean(fFrom) || Boolean(fTo);
  if (!hasAnyAtrasosSignal) return null;

  if (importe <= 0) {
    return {
      source: 'atrasos',
      reason: 'skipped_incomplete',
      rationale: 'Atrasos sin importe > 0.',
    };
  }

  // Resolver fechas: directas → derivadas del periodo origen.
  let from = fFrom;
  let to = fTo;
  if (!from || !to) {
    const pStart = periodo ? firstDayOfPeriod(periodo) : null;
    const pEnd = periodo ? lastDayOfPeriod(periodo) : null;
    if (pStart && pEnd) {
      from = from || pStart;
      to = to || pEnd;
    }
  }
  if (!from || !to) {
    return {
      source: 'atrasos',
      reason: 'skipped_incomplete',
      rationale:
        'Atrasos: faltan fechas de origen y no hay periodo origen (YYYY-MM) para derivarlas.',
    };
  }
  if (isInvertedRange(from, to)) {
    return {
      source: 'atrasos',
      reason: 'skipped_inverted_dates',
      rationale: 'Atrasos: la fecha de fin no puede ser anterior a la de inicio.',
    };
  }

  const dup = findDuplicate(existing, ctx, 'atrasos_regularizacion', from, to);
  if (dup) {
    return {
      source: 'atrasos',
      reason: 'duplicate',
      duplicateOfId: dup.id,
      rationale: `Ya existen atrasos persistidos (${from} → ${to}).`,
    };
  }

  return {
    source: 'atrasos',
    reason: 'created',
    rationale: `Atrasos ${from} → ${to} (${importe.toFixed(2)} €).`,
    input: {
      incident_type: 'atrasos_regularizacion',
      applies_from: from,
      applies_to: to,
      amount: importe,
      concept_code: 'ES_ATRASOS',
      requires_tax_adjustment: true,
      legal_review_required: true,
      metadata: {
        settlement_type: 'arrears',
        period_origin: periodo || null,
        source: 'local_casuistica_promotion',
      },
    },
  };
}

function buildItAtSkipped(
  cas: CasuisticaState & Partial<CasuisticaDatesExtension>,
): PromotionCandidate | null {
  const dias = cas.itAtDias ?? 0;
  const from = cas.itAtFechaDesde ?? '';
  const to = cas.itAtFechaHasta ?? '';
  const tipo = cas.itAtTipo ?? '';
  const hasAnySignal = dias > 0 || Boolean(from) || Boolean(to) || Boolean(tipo);
  if (!hasAnySignal) return null;
  return {
    source: 'it_at',
    reason: 'skipped_specialized',
    rationale:
      'IT/AT/EP debe gestionarse desde el módulo IT/AT para conservar trazabilidad legal.',
  };
}

function buildNacimientoSkipped(
  cas: CasuisticaState & Partial<CasuisticaDatesExtension>,
): PromotionCandidate | null {
  const dias = cas.nacimientoDias ?? 0;
  const importe = cas.nacimientoImporte ?? 0;
  const ini = cas.nacimientoFechaInicio ?? '';
  const fin = cas.nacimientoFechaFin ?? '';
  const hc = cas.nacimientoFechaHechoCausante ?? '';
  const hasAnySignal =
    dias > 0 || importe > 0 || Boolean(ini) || Boolean(fin) || Boolean(hc);
  if (!hasAnySignal) return null;
  return {
    source: 'nacimiento',
    reason: 'skipped_specialized',
    rationale:
      'Nacimiento / cuidado del menor / lactancia debe gestionarse desde el módulo de permisos para conservar trazabilidad legal.',
  };
}

/* ---------- Función pública ---------- */

export function buildIncidentsFromLocalCasuistica(
  args: BuildIncidentsArgs,
): PromotionResult {
  const { casuistica, context, existingIncidents } = args;

  // Snapshot defensivo: no mutamos input.
  const cas = { ...casuistica };

  const candidates: PromotionCandidate[] = [];

  const pnr = buildPnrCandidate(cas, context, existingIncidents);
  if (pnr) candidates.push(pnr);

  const red = buildReduccionCandidate(cas, context, existingIncidents);
  if (red) candidates.push(red);

  const atr = buildAtrasosCandidate(cas, context, existingIncidents);
  if (atr) candidates.push(atr);

  const itat = buildItAtSkipped(cas);
  if (itat) candidates.push(itat);

  const nac = buildNacimientoSkipped(cas);
  if (nac) candidates.push(nac);

  const toCreate = candidates.filter((c) => c.reason === 'created');
  const duplicates = candidates.filter((c) => c.reason === 'duplicate');
  const skipped = candidates.filter((c) =>
    c.reason === 'skipped_specialized' ||
    c.reason === 'skipped_incomplete' ||
    c.reason === 'skipped_inverted_dates',
  );

  return {
    candidates,
    toCreate,
    duplicates,
    skipped,
    hasAny: candidates.length > 0,
  };
}

export default buildIncidentsFromLocalCasuistica;