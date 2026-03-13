/**
 * useHRDocumentDueRules — Hook para reglas de plazos documentales HR
 * V2-ES.4 Paso 1 (parte 3): Lectura cacheada + utilidades de cálculo
 *
 * REGLAS:
 * - Query cacheada con staleTime alto (reglas casi estáticas)
 * - Cálculos de due date en client-side (MVP: calendar_days, before_start, end_of_next_month)
 * - business_days: aproximación simple (×1.4), preparado para calendario real en futuro
 * - Graceful degradation para due_rule_type no soportado
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  /** Severidad de la regla */
  severity: DueSeverity;
  /** Urgencia derivada del cálculo */
  urgency: DueUrgency;
  /** Etiqueta legible */
  label: string;
  /** Regla aplicada */
  rule: DocumentDueRule;
}

// ─── Calculation utilities ───────────────────────────────────────────────────

/**
 * Calcula la fecha límite a partir de un evento trigger y una regla.
 * MVP: soporta calendar_days, before_start, end_of_next_month.
 * business_days usa aproximación ×1.4 (graceful degradation).
 */
export function computeDueDate(
  rule: DocumentDueRule,
  triggerDate: Date,
  referenceDate: Date = new Date(),
): DueDateResult {
  let dueDate: Date | null = null;

  switch (rule.due_rule_type) {
    case 'before_start':
      // Must be ready before/on the trigger date
      dueDate = new Date(triggerDate);
      break;

    case 'calendar_days':
      dueDate = new Date(triggerDate);
      dueDate.setDate(dueDate.getDate() + rule.due_offset_days);
      break;

    case 'business_days': {
      // Exclude weekends (sat/sun). No public holidays yet.
      dueDate = addBusinessDays(triggerDate, rule.due_offset_days);
      break;
    }

    case 'end_of_next_month': {
      dueDate = new Date(triggerDate);
      dueDate.setMonth(dueDate.getMonth() + 2, 0); // last day of next month
      break;
    }

    case 'custom':
    default:
      // Can't compute — graceful degradation
      return {
        dueDate: null,
        daysRemaining: null,
        severity: rule.severity,
        urgency: 'unknown',
        label: 'Plazo especial',
        rule,
      };
  }

  const diffMs = dueDate.getTime() - referenceDate.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let urgency: DueUrgency;
  let label: string;

  if (daysRemaining < 0) {
    urgency = 'overdue';
    label = `Vencido hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) !== 1 ? 's' : ''}`;
  } else if (daysRemaining === 0) {
    urgency = 'urgent';
    label = 'Vence hoy';
  } else if (daysRemaining <= 3) {
    urgency = 'urgent';
    label = `Vence en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`;
  } else if (daysRemaining <= 7) {
    urgency = 'upcoming';
    label = `Vence en ${daysRemaining} días`;
  } else {
    urgency = 'ok';
    label = `${daysRemaining} días restantes`;
  }

  return { dueDate, daysRemaining, severity: rule.severity, urgency, label, rule };
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
