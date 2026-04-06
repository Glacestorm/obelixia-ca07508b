/**
 * Shared Legal Core — Compliance Rules & Constants
 * @shared-legal-core
 *
 * Constantes de dominio reutilizables para el sistema de compliance legal.
 * Sin dependencias externas.
 */

import type { LegalRiskLevel } from '../types';

// ============================================================================
// ALERT THRESHOLDS
// ============================================================================

/**
 * Umbrales de alerta por días restantes hasta un vencimiento.
 * Usados por `computeDeadlineUrgency` y consumidores UI.
 */
export const ALERT_THRESHOLDS = {
  /** ≤ 3 días: riesgo inminente */
  critical: 3,
  /** ≤ 7 días: acción urgente requerida */
  urgent: 7,
  /** ≤ 15 días: alerta activa */
  alert: 15,
  /** ≤ 30 días: pre-alerta informativa */
  prealert: 30,
} as const;

export type AlertThresholdLevel = keyof typeof ALERT_THRESHOLDS;

// ============================================================================
// CLASSIFICATION → SEVERITY MAPPING
// ============================================================================

/**
 * Mapeo de clasificaciones LISOS (Ley de Infracciones y Sanciones
 * del Orden Social) al nivel de riesgo canónico del Shared Legal Core.
 */
export const CLASSIFICATION_SEVERITY: Record<string, LegalRiskLevel> = {
  leve: 'low',
  grave: 'high',
  muy_grave: 'critical',
};

// ============================================================================
// PERIODICITY
// ============================================================================

/**
 * Periodicidades estándar de obligaciones legales.
 */
export const OBLIGATION_PERIODICITIES = [
  'mensual',
  'trimestral',
  'anual',
  'semestral',
  'puntual',
] as const;

export type ObligationPeriodicity = (typeof OBLIGATION_PERIODICITIES)[number];

// ============================================================================
// OBLIGATION TYPES
// ============================================================================

/**
 * Tipos estándar de obligaciones legales.
 */
export const OBLIGATION_TYPES = [
  'declaracion',
  'cotizacion',
  'informativa',
  'registro',
  'comunicacion',
  'certificacion',
] as const;

export type ObligationType = (typeof OBLIGATION_TYPES)[number];
