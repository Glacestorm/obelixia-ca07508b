/**
 * Garnishment Engine — Motor determinista de embargos judiciales
 * Art. 607-608 LEC · SMI 2026: 1.221 €/mes (14 pagas)
 * 
 * Lógica pura, sin dependencias de UI ni Supabase.
 */

// ============================================
// CONSTANTS
// ============================================

/** SMI mensual 2026 (14 pagas) */
export const SMI_MENSUAL_2026 = 1221.00;
/** SMI mensual 2026 (12 pagas, prorrateado) — Art. 607.3 LEC */
export const SMI_2026_12_PAGAS = 1424.50;
/** SMI con prorrateo (12 pagas) */
export const SMI_PRORRATEADO_2026 = 1224.50 * 14 / 12; // ~1424.17

/**
 * Tramos de embargabilidad — Art. 607.1 LEC
 * Cada tramo se aplica sobre el exceso respecto al tramo anterior.
 * En meses con paga extra, el límite inembargable se duplica (art. 607.4 LEC).
 */
export interface GarnishmentTranche {
  /** Multiplicador inferior del SMI */
  fromSMI: number;
  /** Multiplicador superior del SMI */
  toSMI: number;
  /** Porcentaje embargable */
  percentage: number;
  /** Etiqueta descriptiva */
  label: string;
}

export const ART607_TRANCHES: GarnishmentTranche[] = [
  { fromSMI: 0, toSMI: 1, percentage: 0, label: 'Hasta 1× SMI — Inembargable' },
  { fromSMI: 1, toSMI: 2, percentage: 30, label: '1×–2× SMI — 30%' },
  { fromSMI: 2, toSMI: 3, percentage: 50, label: '2×–3× SMI — 50%' },
  { fromSMI: 3, toSMI: 4, percentage: 60, label: '3×–4× SMI — 60%' },
  { fromSMI: 4, toSMI: 5, percentage: 75, label: '4×–5× SMI — 75%' },
  { fromSMI: 5, toSMI: Infinity, percentage: 90, label: '>5× SMI — 90%' },
];

// ============================================
// TYPES
// ============================================

export interface GarnishmentInput {
  /** Salario neto del período */
  netSalary: number;
  /** ¿El período incluye paga extra? */
  hasExtraPay: boolean;
  /** ¿Es embargo por alimentos (art. 608 LEC)? */
  isArt608Alimentos: boolean;
  /** Número de cargas familiares (reduce % embargable, art. 607.3 LEC) */
  cargasFamiliares: number;
  /** ¿Tiene conceptos embargables al 100%? (indemnizaciones no salariales) */
  conceptosEmbargables100: boolean;
  /** SMI de referencia (override para testing) */
  smiReference?: number;
  /** Otros ingresos del trabajador — pluripercepción Art. 607.3 párrafo 2 LEC */
  otherIncomes?: number;
  /** Importe de conceptos embargables al 100% (indemnizaciones, dietas exceso) */
  embargableAt100?: number;
  /** Total ya embargado en este mes por otros embargos previos */
  otherGarnishmentsThisMonth?: number;
}

export interface TrancheResult {
  label: string;
  rangeFrom: number;
  rangeTo: number;
  baseAmount: number;
  percentage: number;
  adjustedPercentage: number;
  garnished: number;
}

export interface GarnishmentResult {
  /** Neto del trabajador */
  netSalary: number;
  /** SMI utilizado */
  smiReference: number;
  /** Límite inembargable efectivo */
  inembargableLimit: number;
  /** Desglose por tramos */
  tranches: TrancheResult[];
  /** Total embargado */
  totalGarnished: number;
  /** Neto tras embargo */
  netAfterGarnishment: number;
  /** Indica si se aplicó art. 608 */
  art608Applied: boolean;
  /** Reducción por cargas familiares aplicada */
  cargasReduction: number;
  /** Embargado al 100% (indemnizaciones) */
  embargableAt100Amount: number;
  /** Indica si se aplicó pluripercepción */
  pluripercepcionApplied: boolean;
}

// ============================================
// ENGINE
// ============================================

/**
 * Calcula la reducción porcentual por cargas familiares.
 * Jurisprudencia: entre 10-15% por carga, con tope práctico.
 */
function getCargasReduction(cargas: number): number {
  if (cargas <= 0) return 0;
  // Reducción: 10% primera carga, 5% adicionales, máx 30%
  const reduction = Math.min(10 + (cargas - 1) * 5, 30);
  return reduction;
}

/**
 * Calcula el embargo según Art. 607 LEC.
 * Motor determinista puro — sin side effects.
 */
export function calculateGarnishment(input: GarnishmentInput): GarnishmentResult {
  const smi = input.smiReference ?? SMI_MENSUAL_2026;
  const { netSalary, hasExtraPay, isArt608Alimentos, cargasFamiliares } = input;
  const otherIncomes = input.otherIncomes ?? 0;
  const embargableAt100 = input.embargableAt100 ?? 0;
  const otherGarnishmentsThisMonth = input.otherGarnishmentsThisMonth ?? 0;

  // Pluripercepción Art. 607.3 párrafo 2: sumar todos los ingresos
  const totalIncome = netSalary + otherIncomes;
  const pluripercepcionApplied = otherIncomes > 0;

  // Art. 607.4: en meses con paga extra, duplicar el inembargable
  const inembargableLimit = hasExtraPay ? smi * 2 : smi;

  // Art. 608: para alimentos, el juez puede embargar por debajo del SMI
  if (isArt608Alimentos) {
    const totalGarnished = Math.max(netSalary * 0.5, 0) + embargableAt100;
    return {
      netSalary,
      smiReference: smi,
      inembargableLimit: 0,
      tranches: [{
        label: 'Art. 608 — Alimentos (50% referencia)',
        rangeFrom: 0,
        rangeTo: netSalary,
        baseAmount: netSalary,
        percentage: 50,
        adjustedPercentage: 50,
        garnished: Math.max(netSalary * 0.5, 0),
      }],
      totalGarnished: Math.round(totalGarnished * 100) / 100,
      netAfterGarnishment: Math.round((netSalary - totalGarnished) * 100) / 100,
      art608Applied: true,
      cargasReduction: 0,
      embargableAt100Amount: embargableAt100,
      pluripercepcionApplied,
    };
  }

  // Reducción por cargas familiares
  const cargasReduction = getCargasReduction(cargasFamiliares);

  // Calcular tramos sobre totalIncome (pluripercepción)
  const tranches: TrancheResult[] = [];
  let totalGarnished = 0;

  for (const tranche of ART607_TRANCHES) {
    const rangeFrom = tranche.fromSMI * smi * (hasExtraPay ? 2 : 1);
    const rangeTo = tranche.toSMI === Infinity
      ? Infinity
      : tranche.toSMI * smi * (hasExtraPay ? 2 : 1);

    if (totalIncome <= rangeFrom) break;

    const effectiveTop = Math.min(totalIncome, rangeTo);
    const baseAmount = effectiveTop - rangeFrom;

    const adjustedPercentage = Math.max(tranche.percentage - cargasReduction, 0);
    const garnished = (baseAmount * adjustedPercentage) / 100;

    tranches.push({
      label: tranche.label,
      rangeFrom,
      rangeTo: rangeTo === Infinity ? totalIncome : rangeTo,
      baseAmount: Math.round(baseAmount * 100) / 100,
      percentage: tranche.percentage,
      adjustedPercentage,
      garnished: Math.round(garnished * 100) / 100,
    });

    totalGarnished += garnished;
  }

  // Sumar conceptos embargables al 100% (indemnizaciones, dietas exceso)
  totalGarnished += embargableAt100;
  totalGarnished = Math.round(totalGarnished * 100) / 100;

  // Cap: no embargar más de lo que le queda al trabajador tras otros embargos
  if (otherGarnishmentsThisMonth > 0) {
    const maxEmbargable = Math.max(netSalary - inembargableLimit - otherGarnishmentsThisMonth, 0);
    totalGarnished = Math.min(totalGarnished, maxEmbargable + embargableAt100);
    totalGarnished = Math.round(totalGarnished * 100) / 100;
  }

  return {
    netSalary,
    smiReference: smi,
    inembargableLimit,
    tranches,
    totalGarnished,
    netAfterGarnishment: Math.round((netSalary - totalGarnished) * 100) / 100,
    art608Applied: false,
    cargasReduction,
    embargableAt100Amount: embargableAt100,
    pluripercepcionApplied,
  };
}

/**
 * Calcula embargos concurrentes (varios embargos sobre el mismo neto).
 * Se aplican en orden de prelación; cada embargo reduce el neto disponible.
 */
export function calculateConcurrentGarnishments(
  netSalary: number,
  garnishments: Array<{
    id: string;
    priorityOrder: number;
    isArt608: boolean;
    cargasFamiliares: number;
    monthlyCapOrRemaining: number | null;
  }>,
  hasExtraPay: boolean,
  smiReference?: number,
): Array<{ id: string; garnished: number; capped: boolean }> {
  const sorted = [...garnishments].sort((a, b) => a.priorityOrder - b.priorityOrder);
  let remainingNet = netSalary;
  const results: Array<{ id: string; garnished: number; capped: boolean }> = [];

  for (const g of sorted) {
    if (remainingNet <= 0) {
      results.push({ id: g.id, garnished: 0, capped: false });
      continue;
    }

    const calc = calculateGarnishment({
      netSalary: remainingNet,
      hasExtraPay,
      isArt608Alimentos: g.isArt608,
      cargasFamiliares: g.cargasFamiliares,
      conceptosEmbargables100: false,
      smiReference,
    });

    let garnished = calc.totalGarnished;
    let capped = false;

    if (g.monthlyCapOrRemaining !== null && garnished > g.monthlyCapOrRemaining) {
      garnished = g.monthlyCapOrRemaining;
      capped = true;
    }

    results.push({ id: g.id, garnished: Math.round(garnished * 100) / 100, capped });
    remainingNet -= garnished;
  }

  return results;
}
