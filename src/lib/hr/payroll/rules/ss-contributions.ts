/**
 * SS Contributions Rules — Cotizaciones Seguridad Social 2026
 * RDL 3/2026 · LGSS Art. 147
 * 
 * Motor determinista puro.
 */

// ============================================
// CONSTANTS 2026
// ============================================

/** Base máxima mensual 2026 */
export const SS_BASE_MAX_2026 = 5101.20;

/** Tipos de cotización empresa/trabajador 2026 */
export const SS_RATES_2026 = {
  // Contingencias comunes
  cc: { employer: 23.60, employee: 4.70, total: 28.30 },
  // Desempleo - indefinido
  unemployment_indefinite: { employer: 5.50, employee: 1.55, total: 7.05 },
  // Desempleo - temporal
  unemployment_temporary: { employer: 6.70, employee: 1.60, total: 8.30 },
  // FOGASA
  fogasa: { employer: 0.20, employee: 0, total: 0.20 },
  // Formación profesional
  fp: { employer: 0.60, employee: 0.10, total: 0.70 },
  // MEI (Mecanismo de Equidad Intergeneracional)
  mei: { employer: 0.75, employee: 0.15, total: 0.90 },
  // AT/EP (media — depende del CNAE, aquí usamos 1.5% referencia)
  atep: { employer: 1.50, employee: 0, total: 1.50 },
};

/** Bases mínimas por grupo de cotización 2026 */
export const SS_GROUP_MIN_BASES_2026: Record<number, number> = {
  // Fuente: Orden PJC/297/2026 — Bases mínimas por grupo de cotización
  1: 1847.40,  // Ingenieros y Licenciados, personal de alta dirección
  2: 1531.50,  // Ingenieros Técnicos, Peritos y Ayudantes Titulados
  3: 1332.90,  // Jefes Administrativos y de Taller
  4: 1381.33,  // Ayudantes no titulados (SMI 2026 × 7/6)
  5: 1381.33,  // Oficiales Administrativos (SMI 2026 × 7/6)
  6: 1381.33,  // Subalternos (SMI 2026 × 7/6)
  7: 1381.33,  // Auxiliares Administrativos (SMI 2026 × 7/6)
  8: 1381.33,  // Oficiales de 1ª y 2ª (SMI 2026 × 7/6)
  9: 1381.33,  // Oficiales de 3ª y Especialistas (SMI 2026 × 7/6)
  10: 1381.33, // Peones (SMI 2026 × 7/6)
  11: 1381.33, // Trabajadores menores de 18 años (SMI 2026 × 7/6)
  // Cálculo grupos 4-11: SMI mensual 2026 (1.184€) × 7/6 = 1.381,33€
  // Norma: LGSS Art. 147.2 — «cuantía del SMI vigente, incrementada en un sexto»
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
