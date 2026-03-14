/**
 * registrationDeadlineEngine — Deadlines operativos de alta/afiliación
 * V2-ES.5 Paso 2: Pre-alta y post-alta con calendario laboral
 *
 * Pre-alta: X días hábiles ANTES de registration_date → readiness interno
 * Post-alta: N días DESPUÉS de registration_date → confirmación/cierre
 *
 * No es validación oficial TGSS — es operativa interna MVP.
 */
import {
  addBusinessDays,
  countBusinessDaysBetween,
  daysUntil,
  type HolidayCalendar,
  EMPTY_CALENDAR,
} from './calendarHelpers';
import type { RegistrationData, RegistrationStatus } from '@/hooks/erp/hr/useHRRegistrationProcess';

// ─── Configuration ──────────────────────────────────────────────────────────

/** Días hábiles antes de registration_date para tener todo listo */
const PRE_ALTA_BUSINESS_DAYS = 3;
/** Umbral warning pre-alta: quedan ≤ N días hábiles */
const PRE_ALTA_WARNING_THRESHOLD = 5;

/** Días naturales después de registration_date para confirmar */
const POST_ALTA_CONFIRM_DAYS = 5;
/** Umbral critical post-alta: sin confirmar tras N días naturales */
const POST_ALTA_CRITICAL_DAYS = 10;

// ─── Types ──────────────────────────────────────────────────────────────────

export type RegistrationDeadlineType = 'pre_alta' | 'post_alta';

export type RegistrationDeadlineUrgency =
  | 'ok'           // En plazo, sin riesgo
  | 'upcoming'     // Próximo a vencer
  | 'urgent'       // Urgente
  | 'overdue'      // Vencido
  | 'blocked'      // Bloqueado por datos/docs
  | 'resolved';    // Confirmado/cerrado — no aplica

export interface RegistrationDeadline {
  type: RegistrationDeadlineType;
  label: string;
  deadlineDate: Date;
  urgency: RegistrationDeadlineUrgency;
  /** Calendar days remaining (negative = past) */
  daysRemaining: number;
  /** Business days remaining (only for pre-alta) */
  businessDaysRemaining?: number;
  /** Severity for visual hierarchy */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** Explanation */
  message: string;
}

export interface RegistrationDeadlineSummary {
  deadlines: RegistrationDeadline[];
  worstUrgency: RegistrationDeadlineUrgency;
  hasRisk: boolean;
  /** Compact label for executive summary */
  summaryLabel: string;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export function computeRegistrationDeadlines(
  data: RegistrationData | null,
  holidays: HolidayCalendar = EMPTY_CALENDAR,
  now: Date = new Date(),
): RegistrationDeadlineSummary {
  const empty: RegistrationDeadlineSummary = {
    deadlines: [],
    worstUrgency: 'ok',
    hasRisk: false,
    summaryLabel: '',
  };

  if (!data) return empty;

  const status = data.registration_status as RegistrationStatus;

  // Confirmed → resolved, no deadlines
  if (status === 'confirmed') {
    return {
      deadlines: [],
      worstUrgency: 'resolved',
      hasRisk: false,
      summaryLabel: 'Confirmado',
    };
  }

  // No registration_date → can't compute deadlines
  if (!data.registration_date) {
    return {
      deadlines: [],
      worstUrgency: 'blocked',
      hasRisk: true,
      summaryLabel: 'Sin fecha de alta',
    };
  }

  const regDate = new Date(data.registration_date);
  const deadlines: RegistrationDeadline[] = [];

  // ── Pre-alta deadline ────────────────────────────────────────────────
  // Only relevant if not yet submitted
  if (status !== 'submitted') {
    const preDeadline = addBusinessDays(regDate, -PRE_ALTA_BUSINESS_DAYS, holidays);
    const calDaysRemaining = daysUntil(preDeadline, now);
    const bizDaysRemaining = countBusinessDaysBetween(now, regDate, holidays);

    const isBlocked = status === 'pending_data' || status === 'pending_documents';

    let urgency: RegistrationDeadlineUrgency;
    let severity: RegistrationDeadline['severity'];
    let message: string;

    if (calDaysRemaining < 0) {
      // Past pre-alta deadline
      if (isBlocked) {
        urgency = 'overdue';
        severity = 'critical';
        message = `Plazo pre-alta superado y expediente ${status === 'pending_data' ? 'sin datos completos' : 'sin documentación'}`;
      } else {
        urgency = 'urgent';
        severity = 'high';
        message = `Plazo pre-alta superado — listo para envío, tramitar cuanto antes`;
      }
    } else if (bizDaysRemaining <= PRE_ALTA_BUSINESS_DAYS) {
      if (isBlocked) {
        urgency = 'blocked';
        severity = 'critical';
        message = `Solo ${bizDaysRemaining} día(s) hábil(es) hasta el alta y expediente incompleto`;
      } else {
        urgency = 'urgent';
        severity = 'high';
        message = `${bizDaysRemaining} día(s) hábil(es) hasta el alta — tramitar pronto`;
      }
    } else if (bizDaysRemaining <= PRE_ALTA_WARNING_THRESHOLD) {
      urgency = isBlocked ? 'blocked' : 'upcoming';
      severity = isBlocked ? 'high' : 'medium';
      message = isBlocked
        ? `${bizDaysRemaining} días hábiles hasta el alta — completar expediente`
        : `${bizDaysRemaining} días hábiles hasta el alta`;
    } else {
      urgency = 'ok';
      severity = 'low';
      message = `${bizDaysRemaining} días hábiles hasta el alta`;
    }

    deadlines.push({
      type: 'pre_alta',
      label: 'Plazo pre-alta',
      deadlineDate: preDeadline,
      urgency,
      daysRemaining: calDaysRemaining,
      businessDaysRemaining: bizDaysRemaining,
      severity,
      message,
    });
  }

  // ── Post-alta deadline ───────────────────────────────────────────────
  // Only relevant if registration_date is past and not confirmed
  const calDaysSinceAlta = daysUntil(now, regDate);
  if (calDaysSinceAlta >= 0) {
    // We're past or at registration_date
    let urgency: RegistrationDeadlineUrgency;
    let severity: RegistrationDeadline['severity'];
    let message: string;

    const postDeadlineDate = new Date(regDate);
    postDeadlineDate.setDate(postDeadlineDate.getDate() + POST_ALTA_CONFIRM_DAYS);

    if (calDaysSinceAlta >= POST_ALTA_CRITICAL_DAYS) {
      urgency = 'overdue';
      severity = 'critical';
      message = `${calDaysSinceAlta} días desde el alta sin confirmación — riesgo operativo`;
    } else if (calDaysSinceAlta >= POST_ALTA_CONFIRM_DAYS) {
      urgency = 'urgent';
      severity = 'high';
      message = `${calDaysSinceAlta} días desde el alta — confirmar tramitación`;
    } else {
      urgency = 'upcoming';
      severity = 'medium';
      message = `Alta efectiva hace ${calDaysSinceAlta} día(s) — pendiente de confirmación`;
    }

    deadlines.push({
      type: 'post_alta',
      label: 'Confirmación post-alta',
      deadlineDate: postDeadlineDate,
      urgency,
      daysRemaining: POST_ALTA_CONFIRM_DAYS - calDaysSinceAlta,
      severity,
      message,
    });
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const urgencyOrder: RegistrationDeadlineUrgency[] = ['overdue', 'blocked', 'urgent', 'upcoming', 'ok', 'resolved'];
  const worstUrgency = deadlines.reduce<RegistrationDeadlineUrgency>((worst, d) => {
    return urgencyOrder.indexOf(d.urgency) < urgencyOrder.indexOf(worst) ? d.urgency : worst;
  }, 'ok');

  const hasRisk = worstUrgency === 'overdue' || worstUrgency === 'blocked' || worstUrgency === 'urgent';

  let summaryLabel = '';
  const worst = deadlines.find(d => d.urgency === worstUrgency);
  if (worst) {
    if (worst.urgency === 'overdue') summaryLabel = 'Plazo vencido';
    else if (worst.urgency === 'blocked') summaryLabel = 'Bloqueado';
    else if (worst.urgency === 'urgent') summaryLabel = 'Urgente';
    else if (worst.urgency === 'upcoming') summaryLabel = 'Próximo';
    else summaryLabel = 'En plazo';
  }

  return { deadlines, worstUrgency, hasRisk, summaryLabel };
}
