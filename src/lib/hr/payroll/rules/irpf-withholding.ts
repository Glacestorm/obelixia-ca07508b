/**
 * IRPF Withholding Rules — Retenciones IRPF
 * Art. 82-86 RIRPF · Motor determinista puro.
 */

// ============================================
// TYPES
// ============================================

export interface IRPFInput {
  /** Salario bruto del período */
  grossSalary: number;
  /** Cotización SS empleado del período */
  ssEmployeeContribution: number;
  /** Tipo de retención aplicable (%) */
  irpfRate: number;
  /** Datos acumulados para regularización */
  accruedData?: {
    totalGrossYTD: number;
    totalSSEmployeeYTD: number;
    totalIRPFWithheldYTD: number;
    monthsWorked: number;
  };
}

export interface IRPFResult {
  /** Base de retención */
  taxableBase: number;
  /** Tipo efectivo aplicado */
  effectiveRate: number;
  /** Retención del período */
  withholding: number;
  /** ¿Se regularizó? */
  regularized: boolean;
  /** Detalle de regularización */
  regularizationDetail?: {
    projectedAnnualGross: number;
    projectedAnnualSS: number;
    projectedAnnualTaxBase: number;
    idealAnnualWithholding: number;
    alreadyWithheld: number;
    remainingMonths: number;
    adjustedMonthlyWithholding: number;
  };
}

// ============================================
// CONSTANTS
// ============================================

/** Tipo mínimo de retención */
export const IRPF_MIN_RATE = 2.0;

/** Tipo mínimo para contratos < 1 año (Art. 86.2 RIRPF) */
export const IRPF_MIN_RATE_SHORT_CONTRACT = 2.0;

// ============================================
// ENGINE
// ============================================

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula la retención IRPF del período.
 * Si hay datos acumulados, realiza regularización mensual progresiva.
 */
export function calculateIRPFWithholding(input: IRPFInput): IRPFResult {
  const { grossSalary, ssEmployeeContribution, irpfRate, accruedData } = input;

  const taxableBase = r2(grossSalary - ssEmployeeContribution);
  const effectiveRate = Math.max(irpfRate, IRPF_MIN_RATE);

  // Simple calculation (no regularization)
  if (!accruedData || accruedData.monthsWorked <= 0) {
    const withholding = r2(taxableBase * effectiveRate / 100);
    return {
      taxableBase,
      effectiveRate,
      withholding,
      regularized: false,
    };
  }

  // Regularization: project annual and adjust remaining months
  const currentMonth = accruedData.monthsWorked + 1;
  const remainingMonths = Math.max(12 - currentMonth + 1, 1);

  const projectedAnnualGross = r2(
    accruedData.totalGrossYTD + grossSalary * remainingMonths
  );
  const projectedAnnualSS = r2(
    accruedData.totalSSEmployeeYTD + ssEmployeeContribution * remainingMonths
  );
  const projectedAnnualTaxBase = r2(projectedAnnualGross - projectedAnnualSS);
  const idealAnnualWithholding = r2(projectedAnnualTaxBase * effectiveRate / 100);
  const alreadyWithheld = accruedData.totalIRPFWithheldYTD;
  const remainingWithholding = Math.max(idealAnnualWithholding - alreadyWithheld, 0);
  const adjustedMonthlyWithholding = r2(remainingWithholding / remainingMonths);

  return {
    taxableBase,
    effectiveRate,
    withholding: adjustedMonthlyWithholding,
    regularized: true,
    regularizationDetail: {
      projectedAnnualGross,
      projectedAnnualSS,
      projectedAnnualTaxBase,
      idealAnnualWithholding,
      alreadyWithheld,
      remainingMonths,
      adjustedMonthlyWithholding,
    },
  };
}
