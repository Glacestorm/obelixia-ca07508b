/**
 * SMI Rules — Salario Mínimo Interprofesional España
 * @shared-legal-core
 *
 * Single source of truth para SMI 2026.
 * Fuente: Real Decreto 2026 — SMI = 1.221 €/mes (14 pagas) = 17.094 €/año
 *
 * Consumidores:
 *  - garnishmentEngine (embargos Art. 607 LEC)
 *  - multiEmploymentEngine (pluripercepción)
 *  - payslip-validator
 *  - useESPayrollBridge (guardrails Modelo B)
 *  - laborCostSimulatorEngine
 *
 * Reglas:
 *  - SMI mensual: cómputo de 14 pagas anuales
 *  - SMI anual: SMI_MENSUAL × 14
 *  - SMI prorrateado a 12: SMI_ANUAL / 12 (STS 1340/2022)
 */

/** SMI mensual 2026 (14 pagas) — €/mes */
export const SMI_MENSUAL_2026 = 1221.00;

/** SMI anual 2026 — €/año = 1.221 × 14 */
export const SMI_ANUAL_2026 = SMI_MENSUAL_2026 * 14;

/** SMI mensual prorrateado a 12 pagas — STS (Sala 3ª) 1340/2022, de 20 oct */
export const SMI_PRORRATEADO_2026 = SMI_ANUAL_2026 / 12;

/** SMI diario 2026 — €/día */
export const SMI_DIARIO_2026 = 40.70;

/**
 * Devuelve el SMI mensual oficial vigente para un año dado.
 * Por defecto devuelve el SMI 2026.
 *
 * Cuando se publique un nuevo SMI oficial, añadir aquí el caso correspondiente.
 * NO autoaplicar cambios silenciosamente — requiere validación humana.
 */
export function getSMIMensual(year?: number): number {
  const y = year ?? new Date().getFullYear();
  switch (y) {
    case 2026:
      return SMI_MENSUAL_2026;
    default:
      // Fallback prudente al SMI vigente más reciente
      return SMI_MENSUAL_2026;
  }
}

/**
 * Devuelve el SMI anual oficial vigente para un año dado (14 pagas).
 */
export function getSMIAnual(year?: number): number {
  return getSMIMensual(year) * 14;
}

/**
 * Devuelve el SMI mensual prorrateado a 12 pagas (STS 1340/2022).
 */
export function getSMIProrrateadoMensual(year?: number): number {
  return getSMIAnual(year) / 12;
}