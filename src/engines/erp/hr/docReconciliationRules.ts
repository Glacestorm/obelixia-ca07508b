/**
 * docReconciliationRules — Pure logic for document reconciliation eligibility
 * V2-RRHH-FASE-1 Sprint 4: Extracted from DocReconciliationBadge.tsx (UI component)
 * to resolve Hook→UI layer violation in useHRDocActionQueue.
 *
 * This module contains ONLY the data/logic needed to determine whether a document
 * type is reconcilable. The UI component (DocReconciliationBadge) consumes this.
 */

import { normalizeDocType } from './documentExpectedTypes';

/** Document types eligible for reconciliation (payroll/SS/tax matching) */
const RECONCILABLE_TYPES = new Set([
  'nomina_mensual',
  'nomina',
  'justificante_pago_nomina',
  'rlc',
  'rnt',
  'cra',
  'modelo_111',
  'modelo_190',
  'finiquito',
  'indemnizacion',
  'bases_cotizacion',
  'fdi',
]);

/**
 * Checks if a document type supports reconciliation.
 * Pure function — no UI dependencies.
 */
export function isReconcilableDocType(docType: string): boolean {
  return RECONCILABLE_TYPES.has(normalizeDocType(docType));
}

export type ReconciliationChannel = 'payroll' | 'social_security' | 'tax';

const CHANNEL_LABELS: Record<ReconciliationChannel, string> = {
  payroll: 'Nómina',
  social_security: 'Seg. Social',
  tax: 'Fiscal',
};

/**
 * Returns which reconciliation channels apply to a given doc type.
 * Pure function — no UI dependencies.
 */
export function getApplicableChannels(docType: string): ReconciliationChannel[] {
  const norm = normalizeDocType(docType);
  const channels: ReconciliationChannel[] = [];

  if (['nomina_mensual', 'nomina', 'justificante_pago_nomina', 'finiquito', 'indemnizacion'].includes(norm)) {
    channels.push('payroll');
  }
  if (['rlc', 'rnt', 'cra', 'bases_cotizacion', 'fdi'].includes(norm)) {
    channels.push('social_security');
  }
  if (['modelo_111', 'modelo_190', 'nomina_mensual', 'nomina', 'finiquito'].includes(norm)) {
    channels.push('tax');
  }

  return channels;
}

export { CHANNEL_LABELS as RECONCILIATION_CHANNEL_LABELS };
