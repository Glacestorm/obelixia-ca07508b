/**
 * CASUISTICA-FECHAS-01 — Fase C2
 * Adapter puro: filas persistidas → CasuisticaState legacy que el motor de
 * nómina ya consume.
 *
 * INVARIANTES:
 *  - 100% determinista, sin Date.now(), sin red, sin Supabase, sin escrituras.
 *  - Ignora filas con `deleted_at IS NOT NULL`.
 *  - Ignora filas fuera del periodo (intersección = 0).
 *  - NO genera comunicaciones oficiales (FDI/AFI/DELT@).
 *  - NO marca incidencias como aplicadas.
 *  - NO modifica el contrato del motor; sólo produce datos compatibles.
 */

import { getDateIntersectionDays, getPeriodBounds } from './casuisticaDates';
import type { CasuisticaState } from './casuisticaTypes';
import type {
  ITProcessRow,
  LeaveRequestRow,
  MappingResult,
  MappingTrace,
  PayrollIncidentRow,
} from './incidenciasTypes';

// ─── Constantes de mapping ────────────────────────────────────────────────

const REDUCTION_TYPES = new Set([
  'reduccion_jornada_guarda_legal',
  'reduction',
]);

const NACIMIENTO_TYPE_MAP: Record<string, CasuisticaState['nacimientoTipo']> = {
  PAT: 'paternidad',
  PATERNIDAD: 'paternidad',
  MAT: 'maternidad',
  MATERNIDAD: 'maternidad',
  birth: 'paternidad',
  corresponsabilidad: 'corresponsabilidad',
  CORRESPONSABILIDAD: 'corresponsabilidad',
};

// Prioridad para `itAtTipo`: AT > EP > EC.
const IT_TYPE_PRIORITY: Record<string, number> = {
  AT: 3,
  EP: 2,
  ANL: 2, // accidente no laboral, mismo nivel que EP a efectos de prioridad
  EC: 1,
};
const IT_TYPE_TO_LEGACY: Record<string, NonNullable<MappingResult['flags']['itAtTipo']>> = {
  AT: 'accidente_trabajo',
  EP: 'enfermedad_profesional',
  ANL: 'accidente_no_laboral',
  EC: 'enfermedad_comun',
};

// ─── Helpers internos ─────────────────────────────────────────────────────

function isApprovedLeave(row: LeaveRequestRow): boolean {
  if (row.workflow_status === 'approved') return true;
  if (!row.workflow_status && row.status === 'approved') return true;
  return false;
}

function getMetadata(row: { metadata?: unknown }): Record<string, unknown> {
  const m = row.metadata;
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    return m as Record<string, unknown>;
  }
  return {};
}

/** Suma días por unión de rangos (evita doble conteo en solapes). */
function sumDaysByUnion(
  ranges: Array<{ from: string; to: string | null }>,
  periodStart: string,
  periodEnd: string,
): number {
  if (ranges.length === 0) return 0;
  // Reducir cada rango a su intersección con el periodo, en ms.
  const psMs = Date.UTC(
    +periodStart.slice(0, 4),
    +periodStart.slice(5, 7) - 1,
    +periodStart.slice(8, 10),
  );
  const peMs = Date.UTC(
    +periodEnd.slice(0, 4),
    +periodEnd.slice(5, 7) - 1,
    +periodEnd.slice(8, 10),
  );
  const intervals: Array<[number, number]> = [];
  for (const r of ranges) {
    if (!r.from) continue;
    const fromMs = Date.UTC(
      +r.from.slice(0, 4),
      +r.from.slice(5, 7) - 1,
      +r.from.slice(8, 10),
    );
    const toStr = r.to ?? periodEnd;
    const toMs = Date.UTC(
      +toStr.slice(0, 4),
      +toStr.slice(5, 7) - 1,
      +toStr.slice(8, 10),
    );
    const s = Math.max(fromMs, psMs);
    const e = Math.min(toMs, peMs);
    if (e >= s) intervals.push([s, e]);
  }
  if (intervals.length === 0) return 0;
  // Merge intervalos.
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    const cur = intervals[i];
    // +1 día de tolerancia para que rangos contiguos se fusionen.
    if (cur[0] <= last[1] + 86_400_000) {
      last[1] = Math.max(last[1], cur[1]);
    } else {
      merged.push(cur);
    }
  }
  const MS_PER_DAY = 86_400_000;
  let total = 0;
  for (const [s, e] of merged) {
    total += Math.round((e - s) / MS_PER_DAY) + 1;
  }
  return total;
}

// ─── Adapter principal ────────────────────────────────────────────────────

export function mapIncidenciasToLegacyCasuistica(input: {
  payrollIncidents: PayrollIncidentRow[];
  itProcesses: ITProcessRow[];
  leaveRequests: LeaveRequestRow[];
  periodYear: number;
  periodMonth: number;
}): MappingResult {
  const { payrollIncidents, itProcesses, leaveRequests, periodYear, periodMonth } = input;
  const { start: periodStart, end: periodEnd } = getPeriodBounds(periodYear, periodMonth);

  const legacy: Partial<CasuisticaState> = {};
  const flags: MappingResult['flags'] = {};
  const traces: MappingTrace[] = [];
  const unmapped: MappingTrace[] = [];
  let legalReviewRequired = false;

  // Pre-filtrado: solo payroll_incidents NO eliminadas.
  const liveIncidents = payrollIncidents.filter(r => !r.deleted_at);

  // ─── 1. PNR ──────────────────────────────────────────────────────────
  {
    const pnrRows = liveIncidents.filter(r => r.incident_type === 'pnr');
    const pnrRanges: Array<{ from: string; to: string | null }> = [];
    for (const row of pnrRows) {
      if (!row.applies_from) continue;
      const days = getDateIntersectionDays(
        row.applies_from,
        row.applies_to,
        periodStart,
        periodEnd,
      );
      if (days <= 0) continue;
      pnrRanges.push({ from: row.applies_from, to: row.applies_to });
      traces.push({
        source: 'payroll_incidents',
        recordId: row.id,
        incidentType: 'pnr',
        contributedDays: days,
        legalReviewRequired: row.legal_review_required === true,
        notes: row.description ?? undefined,
      });
      if (row.legal_review_required) legalReviewRequired = true;
    }
    const pnrTotal = sumDaysByUnion(pnrRanges, periodStart, periodEnd);
    if (pnrTotal > 0) {
      legacy.pnrDias = pnrTotal;
      flags.pnrActiva = true;
    }
  }

  // ─── 2. IT / AT / EP ─────────────────────────────────────────────────
  {
    const itRows = itProcesses.filter(r => {
      if (r.status === 'cancelled' || r.status === 'rejected') return false;
      const days = getDateIntersectionDays(
        r.start_date,
        r.end_date,
        periodStart,
        periodEnd,
      );
      return days > 0;
    });
    if (itRows.length > 0) {
      const itRanges = itRows.map(r => ({ from: r.start_date, to: r.end_date }));
      const itTotal = sumDaysByUnion(itRanges, periodStart, periodEnd);
      // Determinar tipo prioritario presente.
      let bestType: string | null = null;
      let bestPriority = -1;
      for (const r of itRows) {
        const p = IT_TYPE_PRIORITY[r.process_type] ?? 0;
        if (p > bestPriority) {
          bestPriority = p;
          bestType = r.process_type;
        }
      }
      for (const r of itRows) {
        const days = getDateIntersectionDays(
          r.start_date,
          r.end_date,
          periodStart,
          periodEnd,
        );
        traces.push({
          source: 'it_processes',
          recordId: r.id,
          incidentType: r.process_type,
          contributedDays: days,
        });
      }
      if (itTotal > 0) {
        legacy.itAtDias = itTotal;
        flags.itAtActiva = true;
        if (bestType && IT_TYPE_TO_LEGACY[bestType]) {
          flags.itAtTipo = IT_TYPE_TO_LEGACY[bestType];
        }
      }
    }
  }

  // ─── 3. Reducción de jornada ─────────────────────────────────────────
  {
    const reduxRows = liveIncidents.filter(
      r => r.incident_type && REDUCTION_TYPES.has(r.incident_type),
    );
    let dominant: { row: PayrollIncidentRow; days: number } | null = null;
    for (const r of reduxRows) {
      const days = getDateIntersectionDays(
        r.applies_from,
        r.applies_to,
        periodStart,
        periodEnd,
      );
      if (days <= 0) continue;
      const trace: MappingTrace = {
        source: 'payroll_incidents',
        recordId: r.id,
        incidentType: r.incident_type,
        contributedDays: days,
        legalReviewRequired:
          r.legal_review_required === true ||
          getMetadata(r).legal_guardianship === true,
      };
      traces.push(trace);
      if (trace.legalReviewRequired) legalReviewRequired = true;
      if (!dominant) {
        dominant = { row: r, days };
      } else if (days > dominant.days) {
        dominant = { row: r, days };
      } else if (days === dominant.days) {
        // Empate: preferir applies_from más reciente.
        const a = r.applies_from ?? '';
        const b = dominant.row.applies_from ?? '';
        if (a > b) dominant = { row: r, days };
      }
    }
    if (dominant && dominant.row.percent != null) {
      legacy.reduccionJornadaPct = Number(dominant.row.percent);
    }
  }

  // ─── 4. Atrasos / regularización ─────────────────────────────────────
  {
    const atrRows = liveIncidents.filter(
      r => r.incident_type === 'atrasos_regularizacion',
    );
    let total = 0;
    let oldestPeriod: string | null = null;
    for (const r of atrRows) {
      const amount = r.amount != null ? Number(r.amount) : 0;
      total += amount;
      const meta = getMetadata(r);
      const origin = typeof meta.origin_period_from === 'string'
        ? meta.origin_period_from
        : null;
      if (origin && (!oldestPeriod || origin < oldestPeriod)) {
        oldestPeriod = origin;
      }
      traces.push({
        source: 'payroll_incidents',
        recordId: r.id,
        incidentType: 'atrasos_regularizacion',
        contributedAmount: amount,
      });
    }
    if (atrRows.length > 0) {
      legacy.atrasosITImporte = total;
      if (oldestPeriod) legacy.atrasosITPeriodo = oldestPeriod;
    }
  }

  // ─── 5. Nacimiento / cuidado menor ───────────────────────────────────
  {
    const NAC_CODES = new Set(Object.keys(NACIMIENTO_TYPE_MAP));
    const nacRows = leaveRequests.filter(r => {
      const code = r.leave_type_code ?? '';
      if (!NAC_CODES.has(code)) return false;
      if (!isApprovedLeave(r)) return false;
      // Solape con periodo.
      const days = getDateIntersectionDays(r.start_date, r.end_date, periodStart, periodEnd);
      return days > 0;
    });
    if (nacRows.length > 0) {
      let totalDays = 0;
      let firstStart: string | null = null;
      let lastEnd: string | null = null;
      let hechoCausante: string | null = null;
      let tipo: CasuisticaState['nacimientoTipo'] | null = null;
      for (const r of nacRows) {
        const days = getDateIntersectionDays(
          r.start_date,
          r.end_date,
          periodStart,
          periodEnd,
        );
        totalDays += days;
        if (!firstStart || (r.start_date && r.start_date < firstStart)) {
          firstStart = r.start_date;
        }
        if (!lastEnd || (r.end_date && r.end_date > lastEnd)) {
          lastEnd = r.end_date;
        }
        const code = r.leave_type_code ?? '';
        const mapped = NACIMIENTO_TYPE_MAP[code];
        // Prioridad estable: el primer tipo encontrado (orden de la query).
        if (!tipo && mapped) tipo = mapped;
        // `erp_hr_leave_requests` no tiene columna `metadata`. La fecha de
        // hecho causante se inferirá en C3 desde otras fuentes (documentos
        // adjuntos, tabla específica). En C2 lo dejamos undefined.
        traces.push({
          source: 'leave_requests',
          recordId: r.id,
          incidentType: code,
          contributedDays: days,
        });
      }
      if (totalDays > 0) legacy.nacimientoDias = totalDays;
      if (tipo) legacy.nacimientoTipo = tipo;
      if (firstStart) flags.nacimientoFechaInicio = firstStart;
      if (lastEnd) flags.nacimientoFechaFin = lastEnd;
      if (hechoCausante) flags.nacimientoFechaHechoCausante = hechoCausante;
    }
  }

  // ─── 6. Desplazamiento temporal (no-op para legacy) ─────────────────
  {
    const despRows = liveIncidents.filter(
      r => r.incident_type === 'desplazamiento_temporal',
    );
    for (const r of despRows) {
      const days = getDateIntersectionDays(
        r.applies_from,
        r.applies_to,
        periodStart,
        periodEnd,
      );
      const meta = getMetadata(r);
      const requiresReview =
        r.legal_review_required === true || meta.tax_review_required === true;
      if (requiresReview) legalReviewRequired = true;
      unmapped.push({
        source: 'payroll_incidents',
        recordId: r.id,
        incidentType: 'desplazamiento_temporal',
        contributedDays: days > 0 ? days : 0,
        legalReviewRequired: requiresReview,
        notes:
          'Desplazamiento temporal no tiene slot en el modelo legacy del motor; se conserva en metadata para C3/UI.',
      });
    }
  }

  // ─── 7. Suspensión empleo/sueldo (no-op + revisión legal) ───────────
  {
    const susRows = liveIncidents.filter(
      r => r.incident_type === 'suspension_empleo_sueldo',
    );
    for (const r of susRows) {
      const days = getDateIntersectionDays(
        r.applies_from,
        r.applies_to,
        periodStart,
        periodEnd,
      );
      legalReviewRequired = true;
      unmapped.push({
        source: 'payroll_incidents',
        recordId: r.id,
        incidentType: 'suspension_empleo_sueldo',
        contributedDays: days > 0 ? days : 0,
        legalReviewRequired: true,
        notes:
          'Suspensión empleo/sueldo no se mapea automáticamente a PNR: cambia calificación legal y efectos en cotización/desempleo. Requiere decisión humana en C3.',
      });
    }
  }

  return {
    legacy,
    flags,
    traces,
    unmapped,
    legalReviewRequired,
  };
}
