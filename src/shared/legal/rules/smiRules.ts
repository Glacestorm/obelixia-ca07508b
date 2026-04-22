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

// ============================================
// REGULATORY-WATCH AWARE LOOKUP (S9.21h)
// ============================================

/**
 * Item normativo mínimo necesario para resolver SMI desde regulatory_watch.
 * Coincidente estructuralmente con `RegulatoryWatchItem` pero sin acoplar tipos.
 */
export interface ApprovedRegulatoryItemMinimal {
  category?: string;
  jurisdiction?: string;
  approval_status?: string;
  effective_date?: string | null;
  key_changes?: unknown;
  title?: string;
}

/**
 * Devuelve el SMI mensual aprobado más reciente que ya esté en vigor para el año
 * dado, leyendo de los items aprobados de regulatory_watch (categoría 'salario_minimo').
 *
 * Si no hay item aprobado vigente, devuelve la constante canónica (`getSMIMensual`).
 * Esta función es PURA — no autoaplica cambios al motor.
 *
 * @param year Año del periodo a evaluar
 * @param items Items de vigilancia normativa (aprobados o en vigor)
 */
export function getApprovedSMI(
  year: number | undefined,
  items: ApprovedRegulatoryItemMinimal[] = [],
): { value: number; source: 'regulatory_watch' | 'canonical_constant'; effectiveDate?: string; title?: string } {
  const y = year ?? new Date().getFullYear();
  const yearStart = new Date(`${y}-01-01`);
  const yearEnd = new Date(`${y}-12-31`);

  const candidates = items.filter(it => {
    if (it.category !== 'salario_minimo') return false;
    if (it.jurisdiction && it.jurisdiction !== 'ES') return false;
    if (!['approved', 'in_force'].includes(it.approval_status ?? '')) return false;
    if (!it.effective_date) return false;
    const eff = new Date(it.effective_date);
    return eff <= yearEnd && eff >= new Date(`${y - 1}-01-01`);
  });

  // Más reciente con effective_date <= fin del año
  const sorted = candidates
    .filter(it => new Date(it.effective_date!) <= yearEnd)
    .sort((a, b) => new Date(b.effective_date!).getTime() - new Date(a.effective_date!).getTime());

  const top = sorted[0];
  if (top && top.key_changes && typeof top.key_changes === 'object') {
    const kc = top.key_changes as Record<string, unknown>;
    const candidate = Number(kc.smi_mensual ?? kc.smiMensual ?? kc.value ?? NaN);
    if (Number.isFinite(candidate) && candidate > 0) {
      return {
        value: candidate,
        source: 'regulatory_watch',
        effectiveDate: top.effective_date ?? undefined,
        title: top.title,
      };
    }
  }

  return { value: getSMIMensual(y), source: 'canonical_constant' };
}