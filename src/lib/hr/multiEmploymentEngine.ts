/**
 * Multi-Employment Engine — Motor determinista de pluriempleo/pluriactividad
 * Orden PJC/297/2026 art. 10 · Cotización de Solidaridad 2026
 * 
 * Lógica pura, sin dependencias de UI ni Supabase.
 */

// ============================================
// CONSTANTS 2026
// ============================================

/** Base máxima mensual de cotización 2026 */
export const BASE_MAX_MENSUAL_2026 = 5101.20;

/** Base mínima mensual grupo 1 (referencia general) */
export const BASE_MIN_MENSUAL_G1_2026 = 1847.40;

/** SMI mensual 2026 (14 pagas) */
export const SMI_MENSUAL_2026 = 1184.00; // SMI 2026 — RD 87/2025, de 11 de febrero

// ============================================
// SOLIDARITY CONTRIBUTION (Cotización de Solidaridad)
// ============================================

/**
 * Tramos de cotización de solidaridad 2026
 * Aplica al exceso sobre la base máxima de cotización
 */
export interface SolidarityBracket {
  bracket: number;
  fromMultiplier: number;
  toMultiplier: number | null;
  rate: number;
  employerRate: number;
  employeeRate: number;
  label: string;
}

export const SOLIDARITY_BRACKETS_2026: SolidarityBracket[] = [
  {
    bracket: 1,
    fromMultiplier: 1.0,
    toMultiplier: 1.1,
    rate: 1.15,
    employerRate: 0.92,
    employeeRate: 0.23,
    label: 'Tramo 1: Base máx. → +10%',
  },
  {
    bracket: 2,
    fromMultiplier: 1.1,
    toMultiplier: 1.5,
    rate: 1.25,
    employerRate: 1.00,
    employeeRate: 0.25,
    label: 'Tramo 2: +10% → +50%',
  },
  {
    bracket: 3,
    fromMultiplier: 1.5,
    toMultiplier: null,
    rate: 1.35,
    employerRate: 1.08,
    employeeRate: 0.27,
    label: 'Tramo 3: >+50%',
  },
];

// ============================================
// TYPES
// ============================================

export type MultiEmploymentType = 'pluriempleo' | 'pluriactividad';

export interface BaseDistributionInput {
  /** Horas semanales en la empresa propia */
  ownWeeklyHours: number;
  /** Horas semanales en el otro empleador */
  otherWeeklyHours: number;
  /** Base máxima de referencia */
  baseMax?: number;
  /** Base mínima de referencia */
  baseMin?: number;
}

export interface BaseDistributionResult {
  /** Coeficiente de distribución propio (0-1) */
  ownCoefficient: number;
  /** Coeficiente de distribución otro empleador (0-1) */
  otherCoefficient: number;
  /** Base máxima asignada a la empresa propia */
  ownMaxBase: number;
  /** Base máxima asignada al otro empleador */
  otherMaxBase: number;
  /** Base mínima asignada a la empresa propia */
  ownMinBase: number;
  /** Base mínima asignada al otro empleador */
  otherMinBase: number;
  /** Total horas semanales */
  totalHours: number;
}

export interface SolidarityInput {
  /** Salario bruto mensual total (todos los empleadores) */
  totalGrossSalary: number;
  /** Base máxima de referencia */
  baseMax?: number;
}

export interface SolidarityResult {
  /** ¿Aplica cotización de solidaridad? */
  applies: boolean;
  /** Exceso sobre base máxima */
  excess: number;
  /** Desglose por tramos */
  brackets: Array<{
    bracket: number;
    label: string;
    base: number;
    rate: number;
    employerAmount: number;
    employeeAmount: number;
    totalAmount: number;
  }>;
  /** Total cotización solidaridad */
  totalAmount: number;
  /** Total a cargo del empleador */
  employerTotal: number;
  /** Total a cargo del empleado */
  employeeTotal: number;
}

// ============================================
// ENGINE FUNCTIONS
// ============================================

/**
 * Distribuye las bases de cotización entre empleadores según horas (art. 10 Orden PJC/297/2026).
 * En pluriempleo, la distribución es proporcional a las horas de cada empresa.
 */
export function distributeContributionBases(input: BaseDistributionInput): BaseDistributionResult {
  const baseMax = input.baseMax ?? BASE_MAX_MENSUAL_2026;
  const baseMin = input.baseMin ?? BASE_MIN_MENSUAL_G1_2026;
  const totalHours = input.ownWeeklyHours + input.otherWeeklyHours;

  if (totalHours <= 0) {
    return {
      ownCoefficient: 0.5,
      otherCoefficient: 0.5,
      ownMaxBase: baseMax / 2,
      otherMaxBase: baseMax / 2,
      ownMinBase: baseMin / 2,
      otherMinBase: baseMin / 2,
      totalHours: 0,
    };
  }

  const ownCoeff = Math.round((input.ownWeeklyHours / totalHours) * 10000) / 10000;
  const otherCoeff = Math.round((1 - ownCoeff) * 10000) / 10000;

  return {
    ownCoefficient: ownCoeff,
    otherCoefficient: otherCoeff,
    ownMaxBase: Math.round(baseMax * ownCoeff * 100) / 100,
    otherMaxBase: Math.round(baseMax * otherCoeff * 100) / 100,
    ownMinBase: Math.round(baseMin * ownCoeff * 100) / 100,
    otherMinBase: Math.round(baseMin * otherCoeff * 100) / 100,
    totalHours,
  };
}

/**
 * Calcula la cotización de solidaridad 2026.
 * Aplica al exceso salarial sobre la base máxima de cotización.
 */
export function calculateSolidarityContribution(input: SolidarityInput): SolidarityResult {
  const baseMax = input.baseMax ?? BASE_MAX_MENSUAL_2026;
  const excess = Math.max(input.totalGrossSalary - baseMax, 0);

  if (excess <= 0) {
    return {
      applies: false,
      excess: 0,
      brackets: [],
      totalAmount: 0,
      employerTotal: 0,
      employeeTotal: 0,
    };
  }

  const brackets: SolidarityResult['brackets'] = [];
  let remaining = excess;
  let employerTotal = 0;
  let employeeTotal = 0;

  for (const bracket of SOLIDARITY_BRACKETS_2026) {
    if (remaining <= 0) break;

    const bracketFloor = baseMax * (bracket.fromMultiplier - 1);
    const bracketCeiling = bracket.toMultiplier !== null
      ? baseMax * (bracket.toMultiplier - 1)
      : Infinity;

    const bracketSize = bracketCeiling - bracketFloor;
    const applicableBase = Math.min(remaining, bracketSize === Infinity ? remaining : bracketSize);

    if (applicableBase <= 0) continue;

    const employerAmount = Math.round((applicableBase * bracket.employerRate / 100) * 100) / 100;
    const employeeAmount = Math.round((applicableBase * bracket.employeeRate / 100) * 100) / 100;

    brackets.push({
      bracket: bracket.bracket,
      label: bracket.label,
      base: Math.round(applicableBase * 100) / 100,
      rate: bracket.rate,
      employerAmount,
      employeeAmount,
      totalAmount: Math.round((employerAmount + employeeAmount) * 100) / 100,
    });

    employerTotal += employerAmount;
    employeeTotal += employeeAmount;
    remaining -= applicableBase;
  }

  return {
    applies: true,
    excess: Math.round(excess * 100) / 100,
    brackets,
    totalAmount: Math.round((employerTotal + employeeTotal) * 100) / 100,
    employerTotal: Math.round(employerTotal * 100) / 100,
    employeeTotal: Math.round(employeeTotal * 100) / 100,
  };
}

/**
 * Verifica si procede derecho a reintegro en pluriempleo.
 * Aplica cuando la suma de bases de cotización de todos los empleadores
 * excede la base máxima.
 */
export function checkReimbursementRight(
  ownBase: number,
  otherBase: number,
  baseMax?: number,
): { eligible: boolean; excessAmount: number } {
  const max = baseMax ?? BASE_MAX_MENSUAL_2026;
  const totalBases = ownBase + otherBase;
  const excess = Math.max(totalBases - max, 0);

  return {
    eligible: excess > 0,
    excessAmount: Math.round(excess * 100) / 100,
  };
}
