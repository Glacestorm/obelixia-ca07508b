/**
 * SS Contributions Rules — Cotizaciones Seguridad Social 2026
 * RDL 3/2026 · LGSS Art. 147
 * 
 * Motor determinista puro.
 * Constantes importadas desde Shared Legal Core (single source of truth).
 */

import {
  SS_BASE_MAX_MENSUAL_2026,
  SS_GROUP_MIN_BASES_MENSUAL_2026,
  SS_CONTRIBUTION_RATES_2026,
} from '@/shared/legal/rules/ssRules2026';

// ============================================
// RE-EXPORTS for backward compatibility
// ============================================

/** @deprecated Import from '@/shared/legal/rules/ssRules2026' → SS_BASE_MAX_MENSUAL_2026 */
export const SS_BASE_MAX_2026 = SS_BASE_MAX_MENSUAL_2026;

/** @deprecated Import from '@/shared/legal/rules/ssRules2026' → SS_GROUP_MIN_BASES_MENSUAL_2026 */
export const SS_GROUP_MIN_BASES_2026 = SS_GROUP_MIN_BASES_MENSUAL_2026;

/** Mapped rates for this module's English-key convention */
export const SS_RATES_2026 = {
  cc: { employer: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.empresa, employee: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.trabajador, total: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.total },
  unemployment_indefinite: { employer: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.empresa, employee: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.trabajador, total: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.total },
  unemployment_temporary: { employer: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.empresa, employee: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.trabajador, total: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.total },
  fogasa: { employer: SS_CONTRIBUTION_RATES_2026.fogasa.empresa, employee: SS_CONTRIBUTION_RATES_2026.fogasa.trabajador, total: SS_CONTRIBUTION_RATES_2026.fogasa.total },
  fp: { employer: SS_CONTRIBUTION_RATES_2026.formacionProfesional.empresa, employee: SS_CONTRIBUTION_RATES_2026.formacionProfesional.trabajador, total: SS_CONTRIBUTION_RATES_2026.formacionProfesional.total },
  mei: { employer: SS_CONTRIBUTION_RATES_2026.mei.empresa, employee: SS_CONTRIBUTION_RATES_2026.mei.trabajador, total: SS_CONTRIBUTION_RATES_2026.mei.total },
  atep: { employer: SS_CONTRIBUTION_RATES_2026.atepReferencia.empresa, employee: SS_CONTRIBUTION_RATES_2026.atepReferencia.trabajador, total: SS_CONTRIBUTION_RATES_2026.atepReferencia.total },
};

// ============================================
// TYPES
// ============================================

export interface SSInput {
  /** Base CC (contingencias comunes) */
  baseCC: number;
  /** Base CP (contingencias profesionales) */
  baseCP: number;
  /** Grupo de cotización (1-11) */
  ssGroup: number;
  /** Código tipo de contrato */
  contractType: string;
  /** Coeficiente de parcialidad */
  partTimeCoefficient: number;
  /** ¿Es contrato temporal? */
  isTemporary: boolean;
}

export interface SSResult {
  /** Base CC aplicada (con topes) */
  appliedBaseCC: number;
  /** Base CP aplicada (con topes) */
  appliedBaseCP: number;
  /** Desglose empresa */
  employer: {
    cc: number;
    unemployment: number;
    fogasa: number;
    fp: number;
    mei: number;
    atep: number;
  };
  /** Desglose trabajador */
  employee: {
    cc: number;
    unemployment: number;
    fp: number;
    mei: number;
  };
  /** Totales */
  employerTotal: number;
  employeeTotal: number;
  grandTotal: number;
}

// ============================================
// ENGINE
// ============================================

/**
 * Aplica topes de cotización a la base.
 */
function applyBaseLimits(base: number, ssGroup: number, partTimeCoeff: number): number {
  const minBase = (SS_GROUP_MIN_BASES_2026[ssGroup] ?? SS_GROUP_MIN_BASES_2026[7]) * partTimeCoeff;
  const maxBase = SS_BASE_MAX_2026 * partTimeCoeff;
  return Math.min(Math.max(base, minBase), maxBase);
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula cotizaciones SS completas.
 */
export function calculateSSContributions(input: SSInput): SSResult {
  const { baseCC, baseCP, ssGroup, partTimeCoefficient, isTemporary } = input;

  const appliedBaseCC = applyBaseLimits(baseCC, ssGroup, partTimeCoefficient);
  const appliedBaseCP = applyBaseLimits(baseCP, ssGroup, partTimeCoefficient);

  const unemploymentRates = isTemporary
    ? SS_RATES_2026.unemployment_temporary
    : SS_RATES_2026.unemployment_indefinite;

  const employer = {
    cc: r2(appliedBaseCC * SS_RATES_2026.cc.employer / 100),
    unemployment: r2(appliedBaseCP * unemploymentRates.employer / 100),
    fogasa: r2(appliedBaseCP * SS_RATES_2026.fogasa.employer / 100),
    fp: r2(appliedBaseCP * SS_RATES_2026.fp.employer / 100),
    mei: r2(appliedBaseCC * SS_RATES_2026.mei.employer / 100),
    atep: r2(appliedBaseCP * SS_RATES_2026.atep.employer / 100),
  };

  const employee = {
    cc: r2(appliedBaseCC * SS_RATES_2026.cc.employee / 100),
    unemployment: r2(appliedBaseCP * unemploymentRates.employee / 100),
    fp: r2(appliedBaseCP * SS_RATES_2026.fp.employee / 100),
    mei: r2(appliedBaseCC * SS_RATES_2026.mei.employee / 100),
  };

  const employerTotal = r2(
    employer.cc + employer.unemployment + employer.fogasa +
    employer.fp + employer.mei + employer.atep
  );

  const employeeTotal = r2(
    employee.cc + employee.unemployment + employee.fp + employee.mei
  );

  return {
    appliedBaseCC,
    appliedBaseCP,
    employer,
    employee,
    employerTotal,
    employeeTotal,
    grandTotal: r2(employerTotal + employeeTotal),
  };
}
