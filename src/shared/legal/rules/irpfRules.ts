/**
 * IRPF Rules — Reglas reutilizables de retención IRPF
 * @shared-legal-core
 *
 * Constantes y funciones puras de IRPF aplicables cross-module.
 * Fuentes: RIRPF Art. 80-88, Ley 22/2009 Art. 74
 *
 * Consumidores:
 *  - employeeLegalProfileEngine (HR)
 *  - Payroll Engine (HR)
 *  - Módulos Fiscal (futuro)
 */

// ============================================
// CONSTANTS
// ============================================

/**
 * Tipo mínimo IRPF para contratos de duración determinada < 1 año.
 * RIRPF Art. 86.2
 */
export const IRPF_MINIMUM_RATE_SHORT_CONTRACT = 2;

/**
 * Tipo mínimo IRPF para contratos en prácticas (Art. 86.2 RIRPF).
 * Mismo mínimo del 2%.
 */
export const IRPF_MINIMUM_RATE_INTERNSHIP = 2;

/**
 * Tipo mínimo IRPF para trabajadores extranjeros que adquieren
 * residencia fiscal en España (Art. 86.2 RIRPF, apartado 3).
 */
export const IRPF_MINIMUM_RATE_NEW_RESIDENT = 2;

// ============================================
// PURE FUNCTIONS
// ============================================

/**
 * Aplica regla Art. 88.5 RIRPF: el tipo efectivo es el mayor entre
 * el tipo legal calculado y el tipo voluntario solicitado por el trabajador.
 *
 * @param legalRate — Tipo legal calculado según situación familiar y salarial
 * @param requestedRate — Tipo voluntario solicitado por el trabajador
 * @returns Tipo efectivo de retención
 */
export function computeEffectiveIRPF(legalRate: number, requestedRate: number): number {
  return Math.max(legalRate, requestedRate);
}

/**
 * Determina si aplica el tipo mínimo del 2% por contrato corto.
 *
 * @param isShortContract — true si contrato < 1 año o duración determinada
 * @param currentRate — Tipo IRPF actual calculado
 * @returns Tipo ajustado (mínimo 2% si aplica)
 */
export function applyShortContractMinimum(isShortContract: boolean, currentRate: number): number {
  if (isShortContract && currentRate < IRPF_MINIMUM_RATE_SHORT_CONTRACT) {
    return IRPF_MINIMUM_RATE_SHORT_CONTRACT;
  }
  return currentRate;
}
