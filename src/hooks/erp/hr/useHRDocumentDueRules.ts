/**
 * useHRDocumentDueRules — Hook para reglas de plazos documentales HR
 * V2-ES.4 Paso 1 (parte 3) + Paso 2.3: Precisión mejorada de vencimientos
 *
 * REGLAS:
 * - Query cacheada con staleTime alto (reglas casi estáticas)
 * - Cálculos de due date en client-side
 * - business_days: excluye sábados/domingos (preparado para festivos reales)
 * - before_start: soporta offset negativo (ej: -5 = 5 días antes del trigger)
 * - end_of_next_month: último día del mes siguiente al trigger
 * - Fallback seguro si falta triggerDate
 * - Arquitectura holiday-ready via calendarHelpers
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  addBusinessDays,
  addCalendarDays,
  endOfNextMonth,
  daysUntil,
  countBusinessDaysBetween,
  type HolidayCalendar,
  EMPTY_CALENDAR,
} from '@/components/erp/hr/shared/calendarHelpers';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DocumentDueRule {
  id: string;
  document_type_id: string | null;
  document_type_code: string;
  process_type: string;
  trigger_event: string;
  due_offset_days: number;
  due_rule_type: DueRuleType;
  severity: DueSeverity;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DueRuleType = 'calendar_days' | 'business_days' | 'before_start' | 'end_of_next_month' | 'custom';
export type DueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DueUrgency = 'overdue' | 'urgent' | 'upcoming' | 'ok' | 'unknown';

export interface DueDateResult {
  /** Fecha límite calculada (null si no se puede calcular) */
  dueDate: Date | null;
  /** Días restantes (negativo = vencido) */
  daysRemaining: number | null;
  /** Días laborables restantes (null si no se puede calcular) */
  businessDaysRemaining: number | null;
  /** Severidad de la regla */
  severity: DueSeverity;
  /** Urgencia derivada del cálculo */
  urgency: DueUrgency;
  /** Etiqueta legible */
  label: string;
  /** Regla aplicada */
  rule: DocumentDueRule;
  /** Tipo de calendario usado en el cálculo */
  calendarType: 'business' | 'calendar' | 'special' | 'unknown';
}

// ─── Urgency thresholds (configurable) ───────────────────────────────────────

const URGENCY_THRESHOLDS = {
  /** Days remaining to be considered urgent */
  urgent: 3,
  /** Days remaining to be considered upcoming */
  upcoming: 10,
} as const;

function classifyUrgency(daysRemaining: number): { urgency: DueUrgency; label: string } {
  if (daysRemaining < 0) {
    const abs = Math.abs(daysRemaining);
    return {
      urgency: 'overdue',
      label: `Vencido hace ${abs} día${abs !== 1 ? 's' : ''}`,
    };
  }
  if (daysRemaining === 0) {
    return { urgency: 'urgent', label: 'Vence hoy' };
  }
  if (daysRemaining <= URGENCY_THRESHOLDS.urgent) {
    return {
      urgency: 'urgent',
      label: `Vence en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} — urgente`,
    };
  }
  if (daysRemaining <= URGENCY_THRESHOLDS.upcoming) {
    return {
      urgency: 'upcoming',
      label: `Vence en ${daysRemaining} días`,
    };
  }
  return {
    urgency: 'ok',
    label: `${daysRemaining} días restantes`,
  };
}

// ─── Calculation ─────────────────────────────────────────────────────────────

/**
 * Calcula la fecha límite a partir de un evento trigger y una regla.
 * V2-ES.4 Paso 2.3: Precisión mejorada con calendarHelpers.
 *
 * @param rule - Regla de plazo
 * @param triggerDate - Fecha del evento que dispara el plazo (null = fallback)
 * @param referenceDate - Fecha actual para cálculo de urgencia
 * @param holidays - Calendario de festivos (MVP: vacío)
 */
export function computeDueDate(
  rule: DocumentDueRule,
  triggerDate: Date | null | undefined,
  referenceDate: Date = new Date(),
  holidays: HolidayCalendar = EMPTY_CALENDAR,
): DueDateResult {
  // Fallback: si no hay triggerDate, no podemos calcular
  if (!triggerDate || isNaN(triggerDate.getTime())) {
    return {
      dueDate: null,
      daysRemaining: null,
      businessDaysRemaining: null,
      severity: rule.severity,
      urgency: 'unknown',
      label: 'Sin fecha de referencia',
      rule,
      calendarType: 'unknown',
    };
  }

  let dueDate: Date | null = null;
  let calendarType: DueDateResult['calendarType'] = 'calendar';

  switch (rule.due_rule_type) {
    case 'before_start': {
      // Document must be ready BEFORE the trigger date
      // offset is interpreted as days before: offset=5 → 5 calendar days before trigger
      // offset=0 → same day as trigger
      dueDate = addCalendarDays(triggerDate, -(Math.abs(rule.due_offset_days)));
      calendarType = 'calendar';
      break;
    }

    case 'calendar_days': {
      dueDate = addCalendarDays(triggerDate, rule.due_offset_days);
      calendarType = 'calendar';
      break;
    }

    case 'business_days': {
      dueDate = addBusinessDays(triggerDate, rule.due_offset_days, holidays);
      calendarType = 'business';
      break;
    }

    case 'end_of_next_month': {
      dueDate = endOfNextMonth(triggerDate);
      calendarType = 'special';
      break;
    }

    case 'custom':
    default:
      return {
        dueDate: null,
        daysRemaining: null,
        businessDaysRemaining: null,
        severity: rule.severity,
        urgency: 'unknown',
        label: 'Plazo especial — verificar manualmente',
        rule,
        calendarType: 'unknown',
      };
  }

  const daysRemaining = daysUntil(dueDate, referenceDate);
  const { urgency, label } = classifyUrgency(daysRemaining);

  // For business day rules, also compute business days remaining
  let businessDaysRemaining: number | null = null;
  if (calendarType === 'business') {
    businessDaysRemaining = countBusinessDaysBetween(referenceDate, dueDate, holidays);
  }

  return {
    dueDate,
    daysRemaining,
    businessDaysRemaining,
    severity: rule.severity,
    urgency,
    label,
    rule,
    calendarType,
  };
}

/**
 * Calcula plazos para un proceso dado, buscando todas las reglas aplicables.
 */
export function computeProcessDeadlines(
  rules: DocumentDueRule[],
  processType: string,
  triggerDate: Date,
  referenceDate: Date = new Date(),
): DueDateResult[] {
  return rules
    .filter(r => r.process_type === processType && r.is_active)
    .map(r => computeDueDate(r, triggerDate, referenceDate))
    .sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999));
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHRDocumentDueRules() {
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['erp-hr-document-due-rules'],
    queryFn: async (): Promise<DocumentDueRule[]> => {
      const { data, error } = await supabase
        .from('erp_hr_document_due_rules')
        .select('*')
        .eq('is_active', true)
        .order('document_type_code');

      if (error) {
        console.warn('[useHRDocumentDueRules] Query failed:', error.message);
        return [];
      }
      return (data ?? []) as DocumentDueRule[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  /**
   * Obtiene las reglas para un proceso específico.
   */
  function getRulesForProcess(processType: string): DocumentDueRule[] {
    return rules.filter(r => r.process_type === processType);
  }

  /**
   * Obtiene las reglas para un tipo documental específico.
   */
  function getRulesForDocType(docTypeCode: string): DocumentDueRule[] {
    return rules.filter(r => r.document_type_code === docTypeCode);
  }

  /**
   * Calcula todos los plazos de un proceso dado un trigger date.
   */
  function getProcessDeadlines(processType: string, triggerDate: Date): DueDateResult[] {
    return computeProcessDeadlines(rules, processType, triggerDate);
  }

  return {
    rules,
    isLoading,
    getRulesForProcess,
    getRulesForDocType,
    getProcessDeadlines,
    computeDueDate,
  };
}
