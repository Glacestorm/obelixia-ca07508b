/**
 * Shared Legal Core — Obligation Engine
 * @shared-legal-core
 *
 * Tipos y funciones puras para obligaciones legales, plazos y sanciones.
 * Extraído de useHRLegalCompliance (F4) para reutilización cross-module
 * (HR, Fiscal, Treasury, Compliance).
 *
 * Funciones puras, sin side-effects, sin dependencias externas (excepto types propios).
 */

import type { LegalRiskLevel } from '../types';
import { ALERT_THRESHOLDS, CLASSIFICATION_SEVERITY } from './complianceRules';

// ============================================================================
// TYPES — Extracted from useHRLegalCompliance interfaces
// ============================================================================

/**
 * @shared-legal-core — Regla de obligación legal genérica.
 * Origen: `AdminObligation` en useHRLegalCompliance.
 * Los campos usan camelCase; el consumidor HR mapea desde snake_case de DB.
 */
export interface ObligationRule {
  id: string;
  jurisdiction: string;
  organism: string;
  modelCode?: string;
  name: string;
  type: string;
  periodicity: string;
  deadlineDay?: number;
  deadlineMonth?: number;
  deadlineDescription?: string;
  legalReference?: string;
  sanctionType?: string;
  sanctionMin?: number;
  sanctionMax?: number;
  isActive: boolean;
}

/**
 * @shared-legal-core — Plazo de cumplimiento de una obligación.
 * Origen: `ObligationDeadline` en useHRLegalCompliance (campos genéricos).
 */
export interface ObligationDeadlineInfo {
  obligationId: string;
  periodStart?: string;
  periodEnd?: string;
  deadlineDate: string;
  status: string;
  completedAt?: string;
  notes?: string;
}

/**
 * @shared-legal-core — Regla de sanción / infracción.
 * Origen: `SanctionRisk` en useHRLegalCompliance.
 */
export interface SanctionRule {
  id: string;
  jurisdiction: string;
  legalReference: string;
  infractionType: string;
  classification: string;
  description: string;
  sanctionMinMinor?: number;
  sanctionMaxMinor?: number;
  sanctionMinMedium?: number;
  sanctionMaxMedium?: number;
  sanctionMinMajor?: number;
  sanctionMaxMajor?: number;
  preventiveMeasures?: string[];
  detectionTriggers?: string[];
}

/** Nivel de urgencia de un plazo */
export type DeadlineUrgency = 'critical' | 'urgent' | 'alert' | 'prealert' | 'normal' | 'overdue';

/**
 * @shared-legal-core — Plazo calculado con información de urgencia.
 * Origen: `UpcomingDeadline` en useHRLegalCompliance.
 */
export interface ComputedDeadline {
  deadlineDate: string;
  daysRemaining: number;
  urgency: DeadlineUrgency;
  isOverdue: boolean;
}

/**
 * @shared-legal-core — Resultado de evaluación de riesgo sancionador.
 */
export interface SanctionRiskResult {
  min: number;
  max: number;
  severity: LegalRiskLevel;
}

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

/**
 * Calcula días restantes y nivel de urgencia para un plazo.
 */
export function computeDeadlineUrgency(
  deadlineDate: string,
  referenceDate?: Date
): ComputedDeadline {
  const ref = referenceDate ?? new Date();
  const deadline = new Date(deadlineDate);

  // Reset hours for day-level comparison
  const refDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const deadlineDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

  const diffMs = deadlineDay.getTime() - refDay.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;

  let urgency: DeadlineUrgency;
  if (isOverdue) {
    urgency = 'overdue';
  } else if (daysRemaining <= ALERT_THRESHOLDS.critical) {
    urgency = 'critical';
  } else if (daysRemaining <= ALERT_THRESHOLDS.urgent) {
    urgency = 'urgent';
  } else if (daysRemaining <= ALERT_THRESHOLDS.alert) {
    urgency = 'alert';
  } else if (daysRemaining <= ALERT_THRESHOLDS.prealert) {
    urgency = 'prealert';
  } else {
    urgency = 'normal';
  }

  return {
    deadlineDate,
    daysRemaining,
    urgency,
    isOverdue,
  };
}

/**
 * Evalúa riesgo sancionador basado en clasificación LISOS.
 * Retorna rango de sanción y severity mapeada.
 */
export function evaluateSanctionRisk(
  rule: SanctionRule,
  classification: string
): SanctionRiskResult {
  const normalized = classification.trim().toLowerCase();
  const severity: LegalRiskLevel = CLASSIFICATION_SEVERITY[normalized] ?? 'medium';

  let min = 0;
  let max = 0;

  switch (normalized) {
    case 'leve':
      min = rule.sanctionMinMinor ?? 0;
      max = rule.sanctionMaxMinor ?? 0;
      break;
    case 'grave':
      min = rule.sanctionMinMedium ?? 0;
      max = rule.sanctionMaxMedium ?? 0;
      break;
    case 'muy_grave':
      min = rule.sanctionMinMajor ?? 0;
      max = rule.sanctionMaxMajor ?? 0;
      break;
    default:
      min = rule.sanctionMinMinor ?? 0;
      max = rule.sanctionMaxMajor ?? 0;
  }

  return { min, max, severity };
}

/**
 * Filtra obligaciones por jurisdicción y/o tipo.
 */
export function filterObligationsByScope(
  rules: ObligationRule[],
  jurisdiction?: string,
  type?: string
): ObligationRule[] {
  return rules.filter((r) => {
    if (jurisdiction && r.jurisdiction !== jurisdiction) return false;
    if (type && r.type !== type) return false;
    return true;
  });
}

/**
 * Ordena deadlines computados por urgencia (overdue primero, luego más próximos).
 */
export function sortDeadlinesByUrgency(
  deadlines: ComputedDeadline[]
): ComputedDeadline[] {
  return [...deadlines].sort((a, b) => a.daysRemaining - b.daysRemaining);
}
