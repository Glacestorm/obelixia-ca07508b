/**
 * regulatoryCalendarEngine — V2-ES.8 Tramo 3
 * Unified regulatory deadline calendar across all official domains.
 *
 * Consolidates:
 * - TGSS / SILTRA deadlines (cotización mensual, variaciones)
 * - Contrat@ / SEPE deadlines (comunicación, prórroga, fin contrato)
 * - AEAT deadlines (Modelo 111 trimestral, Modelo 190 anual)
 *
 * Reutiliza calendarHelpers para cálculos de días hábiles.
 * Pure function — no DB access, no side effects.
 *
 * DISCLAIMER: Estos plazos son orientativos para readiness interno.
 * NO constituyen asesoría legal ni sustituyen el calendario oficial de cada organismo.
 */
import {
  daysUntil,
  countBusinessDaysBetween,
  type HolidayCalendar,
  EMPTY_CALENDAR,
} from './calendarHelpers';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RegulatoryDomain = 'tgss_siltra' | 'contrata_sepe' | 'aeat';

export type DeadlineUrgency =
  | 'ok'           // En plazo sin riesgo
  | 'upcoming'     // Próximo a vencer (≤15 días)
  | 'urgent'       // Urgente (≤5 días)
  | 'overdue'      // Vencido
  | 'insufficient' // Sin datos para calcular
  | 'not_applicable'; // No aplica en este contexto

export type DeadlineSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface RegulatoryDeadline {
  id: string;
  domain: RegulatoryDomain;
  label: string;
  description: string;
  deadlineDate: Date;
  urgency: DeadlineUrgency;
  daysRemaining: number;
  businessDaysRemaining?: number;
  severity: DeadlineSeverity;
  /** Reference period (e.g. '2026-03', '1T/2026') */
  referencePeriod: string;
  /** Regulatory basis (informative) */
  regulatoryBasis: string;
  /** Whether this impacts readiness scoring */
  impactsReadiness: boolean;
}

export interface RegulatoryCalendarSummary {
  deadlines: RegulatoryDeadline[];
  worstUrgency: DeadlineUrgency;
  hasRisk: boolean;
  overdueCount: number;
  urgentCount: number;
  upcomingCount: number;
  /** Domain-level summaries */
  byDomain: Record<RegulatoryDomain, {
    deadlines: number;
    worstUrgency: DeadlineUrgency;
    hasRisk: boolean;
  }>;
  /** Compact label for UI */
  summaryLabel: string;
  /** Disclaimer */
  disclaimer: string;
}

// ─── Context for computation ────────────────────────────────────────────────

export interface RegulatoryCalendarContext {
  /** Current date (injectable for testing) */
  now?: Date;
  /** Holiday calendar for business day calculations */
  holidays?: HolidayCalendar;

  // TGSS context
  /** Whether there are active employees requiring monthly SS contributions */
  hasActiveEmployees: boolean;
  /** Last closed payroll period (YYYY-MM) */
  lastClosedPayrollPeriod?: string;
  /** Current period (YYYY-MM) being processed */
  currentPeriod?: string;

  // Contrat@ context
  /** Pending contracts not yet communicated to SEPE */
  pendingContractCommunications: number;
  /** Earliest uncommunicated contract start date */
  earliestPendingContractDate?: string;
  /** Contracts expiring soon (within 30 days) */
  contractsExpiringSoon: number;
  /** Earliest contract expiration date among expiring contracts */
  earliestExpirationDate?: string;

  // AEAT context
  /** Fiscal year being processed */
  fiscalYear?: number;
  /** Last quarter for which Modelo 111 was prepared */
  lastPreparedQuarter111?: number;
  /** Whether Modelo 190 was prepared for last fiscal year */
  modelo190PreparedForYear?: number;
  /** Number of closed payroll periods available */
  closedPayrollPeriodsCount: number;
}

// ─── Deadline definitions ───────────────────────────────────────────────────

const URGENCY_ORDER: DeadlineUrgency[] = ['overdue', 'urgent', 'upcoming', 'insufficient', 'ok', 'not_applicable'];

function classifyUrgency(daysRemaining: number): { urgency: DeadlineUrgency; severity: DeadlineSeverity } {
  if (daysRemaining < 0) return { urgency: 'overdue', severity: 'critical' };
  if (daysRemaining <= 3) return { urgency: 'urgent', severity: 'high' };
  if (daysRemaining <= 15) return { urgency: 'upcoming', severity: 'medium' };
  return { urgency: 'ok', severity: 'low' };
}

// ─── TGSS Deadlines ─────────────────────────────────────────────────────────

function computeTGSSDeadlines(ctx: RegulatoryCalendarContext, now: Date, holidays: HolidayCalendar): RegulatoryDeadline[] {
  const deadlines: RegulatoryDeadline[] = [];

  if (!ctx.hasActiveEmployees) return deadlines;

  // 1. Monthly SS contribution — last business day of the month following the payroll period
  if (ctx.currentPeriod) {
    const [year, month] = ctx.currentPeriod.split('-').map(Number);
    // Deadline: last day of the following month
    const deadlineDate = new Date(year, month + 1, 0); // month is 0-based, so month+1 gives next month's last day
    const days = daysUntil(deadlineDate, now);
    const bizDays = countBusinessDaysBetween(now, deadlineDate, holidays);
    const { urgency, severity } = classifyUrgency(days);

    deadlines.push({
      id: `tgss_cotizacion_${ctx.currentPeriod}`,
      domain: 'tgss_siltra',
      label: 'Cotización mensual SS',
      description: `Plazo para ingreso de cotizaciones del período ${ctx.currentPeriod}`,
      deadlineDate,
      urgency,
      daysRemaining: days,
      businessDaysRemaining: bizDays,
      severity,
      referencePeriod: ctx.currentPeriod,
      regulatoryBasis: 'LGSS Art. 29 — Último día del mes siguiente al devengo',
      impactsReadiness: true,
    });
  }

  // 2. Variations deadline — before monthly close
  if (ctx.currentPeriod) {
    const [year, month] = ctx.currentPeriod.split('-').map(Number);
    // Variations should be submitted before the 22nd of the current month
    const variationDeadline = new Date(year, month - 1, 22);
    if (variationDeadline >= now) {
      const days = daysUntil(variationDeadline, now);
      const { urgency, severity } = classifyUrgency(days);

      deadlines.push({
        id: `tgss_variaciones_${ctx.currentPeriod}`,
        domain: 'tgss_siltra',
        label: 'Variaciones de datos SS',
        description: `Comunicar variaciones antes del cierre de ${ctx.currentPeriod}`,
        deadlineDate: variationDeadline,
        urgency,
        daysRemaining: days,
        severity,
        referencePeriod: ctx.currentPeriod,
        regulatoryBasis: 'Operativo — Variaciones previas a liquidación mensual',
        impactsReadiness: false,
      });
    }
  }

  return deadlines;
}

// ─── SEPE/Contrat@ Deadlines ────────────────────────────────────────────────

function computeSEPEDeadlines(ctx: RegulatoryCalendarContext, now: Date, holidays: HolidayCalendar): RegulatoryDeadline[] {
  const deadlines: RegulatoryDeadline[] = [];

  // 1. Pending contract communications (10 business days from start)
  if (ctx.pendingContractCommunications > 0 && ctx.earliestPendingContractDate) {
    const startDate = new Date(ctx.earliestPendingContractDate);
    if (!isNaN(startDate.getTime())) {
      // 10 business days from contract start
      let deadlineDate = new Date(startDate);
      let bizDaysAdded = 0;
      while (bizDaysAdded < 10) {
        deadlineDate.setDate(deadlineDate.getDate() + 1);
        const dow = deadlineDate.getDay();
        if (dow !== 0 && dow !== 6 && !holidays.has(deadlineDate.toISOString().slice(0, 10))) {
          bizDaysAdded++;
        }
      }

      const days = daysUntil(deadlineDate, now);
      const bizDays = countBusinessDaysBetween(now, deadlineDate, holidays);
      const { urgency, severity } = classifyUrgency(days);

      deadlines.push({
        id: `sepe_comunicacion_${ctx.earliestPendingContractDate}`,
        domain: 'contrata_sepe',
        label: `Comunicación contrato${ctx.pendingContractCommunications > 1 ? `s (${ctx.pendingContractCommunications})` : ''}`,
        description: `${ctx.pendingContractCommunications} contrato(s) pendiente(s) de comunicar al SEPE`,
        deadlineDate,
        urgency,
        daysRemaining: days,
        businessDaysRemaining: bizDays,
        severity,
        referencePeriod: ctx.earliestPendingContractDate,
        regulatoryBasis: 'RD 1424/2002 Art. 7 — 10 días hábiles desde inicio del contrato',
        impactsReadiness: true,
      });
    }
  }

  // 2. Contracts expiring soon — fin de contrato communication
  if (ctx.contractsExpiringSoon > 0 && ctx.earliestExpirationDate) {
    const expDate = new Date(ctx.earliestExpirationDate);
    if (!isNaN(expDate.getTime())) {
      const days = daysUntil(expDate, now);
      const { urgency, severity } = classifyUrgency(days);

      deadlines.push({
        id: `sepe_fin_contrato_${ctx.earliestExpirationDate}`,
        domain: 'contrata_sepe',
        label: `Fin de contrato${ctx.contractsExpiringSoon > 1 ? ` (${ctx.contractsExpiringSoon})` : ''}`,
        description: `${ctx.contractsExpiringSoon} contrato(s) con vencimiento próximo — comunicar baja`,
        deadlineDate: expDate,
        urgency,
        daysRemaining: days,
        severity,
        referencePeriod: ctx.earliestExpirationDate,
        regulatoryBasis: 'RD 1424/2002 — 10 días hábiles desde fin de contrato',
        impactsReadiness: true,
      });
    }
  }

  return deadlines;
}

// ─── AEAT Deadlines ─────────────────────────────────────────────────────────

/** Modelo 111 quarterly deadlines: days 1-20 of the month after the quarter */
const QUARTER_DEADLINES: Record<number, { month: number; day: number; label: string }> = {
  1: { month: 4, day: 20, label: '1T' },   // April 20
  2: { month: 7, day: 20, label: '2T' },   // July 20
  3: { month: 10, day: 20, label: '3T' },  // October 20
  4: { month: 1, day: 30, label: '4T' },   // January 30 (next year)
};

function computeAEATDeadlines(ctx: RegulatoryCalendarContext, now: Date): RegulatoryDeadline[] {
  const deadlines: RegulatoryDeadline[] = [];
  const year = ctx.fiscalYear || now.getFullYear();

  // 1. Modelo 111 — next upcoming quarterly deadline
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

  for (let q = 1; q <= 4; q++) {
    const qDef = QUARTER_DEADLINES[q];
    const deadlineYear = q === 4 ? year + 1 : year;
    const deadlineDate = new Date(deadlineYear, qDef.month - 1, qDef.day);

    // Only show future or recently past deadlines
    const days = daysUntil(deadlineDate, now);
    if (days < -30) continue; // Skip if more than 30 days overdue

    const alreadyPrepared = ctx.lastPreparedQuarter111 != null && q <= ctx.lastPreparedQuarter111;
    if (alreadyPrepared && days < 0) continue; // Skip past prepared quarters

    const { urgency, severity } = days < 0 && !alreadyPrepared
      ? { urgency: 'overdue' as DeadlineUrgency, severity: 'critical' as DeadlineSeverity }
      : classifyUrgency(days);

    deadlines.push({
      id: `aeat_111_${qDef.label}_${year}`,
      domain: 'aeat',
      label: `Modelo 111 — ${qDef.label}/${year}`,
      description: `Retenciones e ingresos a cuenta ${qDef.label}/${year}${alreadyPrepared ? ' (preparado)' : ''}`,
      deadlineDate,
      urgency: alreadyPrepared ? 'ok' : urgency,
      daysRemaining: days,
      severity: alreadyPrepared ? 'info' : severity,
      referencePeriod: `${qDef.label}/${year}`,
      regulatoryBasis: 'AEAT — Modelo 111, presentación trimestral (días 1-20 del mes siguiente)',
      impactsReadiness: !alreadyPrepared,
    });

    // Only show the next relevant deadline
    if (!alreadyPrepared && days >= 0) break;
  }

  // 2. Modelo 190 — annual, January 31 of the following year
  const modelo190Year = year;
  const modelo190Deadline = new Date(modelo190Year + 1, 0, 31); // Jan 31 next year
  const days190 = daysUntil(modelo190Deadline, now);
  const prepared190 = ctx.modelo190PreparedForYear === modelo190Year;

  if (days190 >= -30) {
    const { urgency, severity } = prepared190
      ? { urgency: 'ok' as DeadlineUrgency, severity: 'info' as DeadlineSeverity }
      : classifyUrgency(days190);

    deadlines.push({
      id: `aeat_190_${modelo190Year}`,
      domain: 'aeat',
      label: `Modelo 190 — ${modelo190Year}`,
      description: `Resumen anual de retenciones ${modelo190Year}${prepared190 ? ' (preparado)' : ''}`,
      deadlineDate: modelo190Deadline,
      urgency: prepared190 ? 'ok' : urgency,
      daysRemaining: days190,
      severity: prepared190 ? 'info' : severity,
      referencePeriod: `Anual/${modelo190Year}`,
      regulatoryBasis: 'AEAT — Modelo 190, presentación anual (enero del año siguiente)',
      impactsReadiness: !prepared190 && ctx.closedPayrollPeriodsCount >= 3,
    });
  }

  return deadlines;
}

// ─── Main Engine ────────────────────────────────────────────────────────────

export function computeRegulatoryCalendar(
  ctx: RegulatoryCalendarContext,
): RegulatoryCalendarSummary {
  const now = ctx.now || new Date();
  const holidays = ctx.holidays || EMPTY_CALENDAR;

  const tgss = computeTGSSDeadlines(ctx, now, holidays);
  const sepe = computeSEPEDeadlines(ctx, now, holidays);
  const aeat = computeAEATDeadlines(ctx, now);

  const deadlines = [...tgss, ...sepe, ...aeat].sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Compute urgency stats
  const overdueCount = deadlines.filter(d => d.urgency === 'overdue').length;
  const urgentCount = deadlines.filter(d => d.urgency === 'urgent').length;
  const upcomingCount = deadlines.filter(d => d.urgency === 'upcoming').length;

  const worstUrgency = deadlines.reduce<DeadlineUrgency>((worst, d) => {
    return URGENCY_ORDER.indexOf(d.urgency) < URGENCY_ORDER.indexOf(worst) ? d.urgency : worst;
  }, 'ok');

  const hasRisk = worstUrgency === 'overdue' || worstUrgency === 'urgent';

  // Per-domain summaries
  const domains: RegulatoryDomain[] = ['tgss_siltra', 'contrata_sepe', 'aeat'];
  const byDomain = {} as RegulatoryCalendarSummary['byDomain'];
  for (const domain of domains) {
    const domDeadlines = deadlines.filter(d => d.domain === domain);
    const domWorst = domDeadlines.reduce<DeadlineUrgency>((worst, d) => {
      return URGENCY_ORDER.indexOf(d.urgency) < URGENCY_ORDER.indexOf(worst) ? d.urgency : worst;
    }, 'ok');
    byDomain[domain] = {
      deadlines: domDeadlines.length,
      worstUrgency: domWorst,
      hasRisk: domWorst === 'overdue' || domWorst === 'urgent',
    };
  }

  // Summary label
  let summaryLabel = '';
  if (overdueCount > 0) summaryLabel = `${overdueCount} plazo(s) vencido(s)`;
  else if (urgentCount > 0) summaryLabel = `${urgentCount} plazo(s) urgente(s)`;
  else if (upcomingCount > 0) summaryLabel = `${upcomingCount} plazo(s) próximo(s)`;
  else summaryLabel = 'Todos los plazos en regla';

  return {
    deadlines,
    worstUrgency,
    hasRisk,
    overdueCount,
    urgentCount,
    upcomingCount,
    byDomain,
    summaryLabel,
    disclaimer: 'Plazos orientativos para readiness interno. NO constituyen asesoría legal ni sustituyen el calendario oficial del organismo.',
  };
}
