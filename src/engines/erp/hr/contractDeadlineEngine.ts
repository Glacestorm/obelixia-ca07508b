/**
 * contractDeadlineEngine — Deadlines operativos de contratación/SEPE
 * V2-ES.6 Paso 1.2: Comunicación al SEPE en 10 días hábiles desde inicio contrato
 *
 * Mirrors registrationDeadlineEngine pattern.
 * No es validación oficial SEPE — es operativa interna MVP.
 */
import {
  addBusinessDays,
  countBusinessDaysBetween,
  daysUntil,
  type HolidayCalendar,
  EMPTY_CALENDAR,
} from './calendarHelpers';
import type { ContractProcessData, ContractProcessStatus } from '@/hooks/erp/hr/useHRContractProcess';

// ─── Configuration ──────────────────────────────────────────────────────────

/** Días hábiles desde inicio de contrato para comunicar al SEPE */
const SEPE_COMMUNICATION_BUSINESS_DAYS = 10;
/** Umbral warning: quedan ≤ N días hábiles */
const SEPE_WARNING_THRESHOLD = 5;
/** Días naturales post-comunicación para confirmar acuse */
const POST_COMMUNICATION_CONFIRM_DAYS = 5;

// ─── Types ──────────────────────────────────────────────────────────────────

export type ContractDeadlineType = 'sepe_communication' | 'post_communication';

export type ContractDeadlineUrgency =
  | 'ok'
  | 'upcoming'
  | 'urgent'
  | 'overdue'
  | 'blocked'
  | 'resolved';

export interface ContractDeadline {
  type: ContractDeadlineType;
  label: string;
  deadlineDate: Date;
  urgency: ContractDeadlineUrgency;
  daysRemaining: number;
  businessDaysRemaining?: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
}

export interface ContractDeadlineSummary {
  deadlines: ContractDeadline[];
  worstUrgency: ContractDeadlineUrgency;
  hasRisk: boolean;
  summaryLabel: string;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export function computeContractDeadlines(
  data: ContractProcessData | null,
  holidays: HolidayCalendar = EMPTY_CALENDAR,
  now: Date = new Date(),
): ContractDeadlineSummary {
  const empty: ContractDeadlineSummary = {
    deadlines: [],
    worstUrgency: 'ok',
    hasRisk: false,
    summaryLabel: '',
  };

  if (!data) return empty;

  const status = data.contract_process_status as ContractProcessStatus;

  // Confirmed → resolved
  if (status === 'confirmed') {
    return { deadlines: [], worstUrgency: 'resolved', hasRisk: false, summaryLabel: 'Confirmado' };
  }

  // No start date → can't compute
  if (!data.contract_start_date) {
    return { deadlines: [], worstUrgency: 'blocked', hasRisk: true, summaryLabel: 'Sin fecha de inicio' };
  }

  const startDate = new Date(data.contract_start_date);
  if (isNaN(startDate.getTime())) {
    return { deadlines: [], worstUrgency: 'blocked', hasRisk: true, summaryLabel: 'Fecha inválida' };
  }

  const deadlines: ContractDeadline[] = [];

  // ── SEPE communication deadline (10 business days from start) ─────────
  if (status !== 'submitted') {
    const sepeDeadline = addBusinessDays(startDate, SEPE_COMMUNICATION_BUSINESS_DAYS, holidays);
    const calDaysRemaining = daysUntil(sepeDeadline, now);
    const bizDaysRemaining = countBusinessDaysBetween(now, sepeDeadline, holidays);
    const isBlocked = status === 'pending_data' || status === 'pending_documents';

    let urgency: ContractDeadlineUrgency;
    let severity: ContractDeadline['severity'];
    let message: string;

    if (calDaysRemaining < 0) {
      if (isBlocked) {
        urgency = 'overdue';
        severity = 'critical';
        message = `Plazo SEPE superado y expediente ${status === 'pending_data' ? 'sin datos completos' : 'sin documentación'}`;
      } else {
        urgency = 'overdue';
        severity = 'critical';
        message = 'Plazo de comunicación al SEPE superado — tramitar con urgencia';
      }
    } else if (bizDaysRemaining <= 3) {
      urgency = isBlocked ? 'blocked' : 'urgent';
      severity = 'high';
      message = isBlocked
        ? `Solo ${bizDaysRemaining} día(s) hábil(es) para comunicar al SEPE y expediente incompleto`
        : `${bizDaysRemaining} día(s) hábil(es) para comunicar al SEPE — tramitar pronto`;
    } else if (bizDaysRemaining <= SEPE_WARNING_THRESHOLD) {
      urgency = isBlocked ? 'blocked' : 'upcoming';
      severity = isBlocked ? 'high' : 'medium';
      message = isBlocked
        ? `${bizDaysRemaining} días hábiles para comunicar al SEPE — completar expediente`
        : `${bizDaysRemaining} días hábiles para comunicar al SEPE`;
    } else {
      urgency = 'ok';
      severity = 'low';
      message = `${bizDaysRemaining} días hábiles para comunicar al SEPE`;
    }

    deadlines.push({
      type: 'sepe_communication',
      label: 'Comunicación SEPE',
      deadlineDate: sepeDeadline,
      urgency,
      daysRemaining: calDaysRemaining,
      businessDaysRemaining: bizDaysRemaining,
      severity,
      message,
    });
  }

  // ── Post-communication confirmation ──────────────────────────────────
  if (status === 'submitted' && data.submitted_at) {
    const submittedDate = new Date(data.submitted_at);
    const confirmDeadline = new Date(submittedDate);
    confirmDeadline.setDate(confirmDeadline.getDate() + POST_COMMUNICATION_CONFIRM_DAYS);
    const calDaysRemaining = daysUntil(confirmDeadline, now);

    let urgency: ContractDeadlineUrgency;
    let severity: ContractDeadline['severity'];
    let message: string;

    if (calDaysRemaining < 0) {
      urgency = 'urgent';
      severity = 'high';
      message = `${Math.abs(calDaysRemaining)} días sin confirmación del SEPE — verificar estado`;
    } else if (calDaysRemaining <= 2) {
      urgency = 'upcoming';
      severity = 'medium';
      message = `Pendiente confirmación del SEPE (${calDaysRemaining} días restantes)`;
    } else {
      urgency = 'ok';
      severity = 'low';
      message = `Comunicado al SEPE — esperando confirmación`;
    }

    deadlines.push({
      type: 'post_communication',
      label: 'Confirmación SEPE',
      deadlineDate: confirmDeadline,
      urgency,
      daysRemaining: calDaysRemaining,
      severity,
      message,
    });
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const urgencyOrder: ContractDeadlineUrgency[] = ['overdue', 'blocked', 'urgent', 'upcoming', 'ok', 'resolved'];
  const worstUrgency = deadlines.reduce<ContractDeadlineUrgency>((worst, d) => {
    return urgencyOrder.indexOf(d.urgency) < urgencyOrder.indexOf(worst) ? d.urgency : worst;
  }, 'ok');

  const hasRisk = worstUrgency === 'overdue' || worstUrgency === 'blocked' || worstUrgency === 'urgent';

  let summaryLabel = '';
  if (worstUrgency === 'overdue') summaryLabel = 'Plazo vencido';
  else if (worstUrgency === 'blocked') summaryLabel = 'Bloqueado';
  else if (worstUrgency === 'urgent') summaryLabel = 'Urgente';
  else if (worstUrgency === 'upcoming') summaryLabel = 'Próximo';
  else summaryLabel = 'En plazo';

  return { deadlines, worstUrgency, hasRisk, summaryLabel };
}
