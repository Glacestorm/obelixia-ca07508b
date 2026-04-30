/**
 * B11.1C — Pure helper that flags Registry agreements that look like
 * "generic national" placeholders without a verifiable single state-wide
 * BOE source, and therefore cannot advance to B11.2 / B9 until they are
 * replaced by a concrete territorial agreement (province / CCAA / sector).
 *
 * STRICTLY READ-ONLY. No DB calls, no edge invokes, no bridge / payroll
 * imports, no flag mutations, no allow-list mutations, no writes.
 *
 * Currently the only confirmed case (B11.1) is `AGRO-NAC` (sector
 * agrario nacional). The list is conservative and explicit on purpose:
 * we do NOT auto-mark agreements as generic from heuristics alone, to
 * avoid blocking legitimate state-wide agreements (e.g. TIC-NAC, which
 * does have BOE-A-2025-7766 as a real single state-wide source).
 */
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

/**
 * Internal codes confirmed in B11.1 as "generic national without
 * verifiable BOE state-wide source". Extending this list requires a
 * code change AND a B11.1-style QA verification doc.
 */
export const GENERIC_NON_TERRITORIAL_INTERNAL_CODES: ReadonlySet<string> = new Set([
  'AGRO-NAC',
]);

export interface GenericTerritorialBlocker {
  isGenericNonTerritorial: boolean;
  badge: 'REQUIERE_CONVENIO_TERRITORIAL' | null;
  reason: string | null;
  /**
   * If true, the UI MUST suppress any "advance" CTA: parser B11.2,
   * validation B8A, mapping, runtime apply, ready_for_payroll, etc.
   */
  suppressAdvanceCtas: boolean;
  recommendation: string | null;
}

const NEUTRAL: GenericTerritorialBlocker = {
  isGenericNonTerritorial: false,
  badge: null,
  reason: null,
  suppressAdvanceCtas: false,
  recommendation: null,
};

function getInternalCode(row: UnifiedAgreementRow): string | null {
  // The unified row exposes `key` as the canonical lookup key, which for
  // Registry rows mirrors `internal_code`. We also check operative.id /
  // display_name only for readability; the authoritative match is `key`.
  if (row.key && GENERIC_NON_TERRITORIAL_INTERNAL_CODES.has(row.key)) {
    return row.key;
  }
  return null;
}

export function evaluateGenericTerritorialBlocker(
  row: UnifiedAgreementRow,
): GenericTerritorialBlocker {
  const code = getInternalCode(row);
  if (!code) return NEUTRAL;

  return {
    isGenericNonTerritorial: true,
    badge: 'REQUIERE_CONVENIO_TERRITORIAL',
    reason:
      'Convenio genérico nacional sin fuente BOE estatal única verificable. La regulación efectiva del sector es provincial / autonómica.',
    suppressAdvanceCtas: true,
    recommendation:
      'Para usar el sector agrario en nómina debe seleccionarse un convenio territorial concreto: provincia / CCAA / actividad.',
  };
}

export default evaluateGenericTerritorialBlocker;