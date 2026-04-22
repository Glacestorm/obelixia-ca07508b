/**
 * SS Rules 2026 — Seguridad Social: Bases y Tipos de Cotización
 * @shared-legal-core
 *
 * Single source of truth para constantes SS 2026.
 * Fuentes: LGSS Art. 147-148, RDL 3/2026, Orden PJC/297/2026
 *
 * Consumidores:
 *  - employeeLegalProfileEngine (HR)
 *  - ss-contributions (HR Payroll)
 *  - Módulos Fiscal/Treasury (futuro)
 */

// ============================================
// GROUP BASES (LGSS Art. 148 / Orden PJC/297/2026)
// ============================================

export interface SSGroupBase {
  /** Base mínima mensual (€) — o diaria para grupos 8-11 */
  minMensual: number;
  /** Base máxima mensual (€) — o diaria para grupos 8-11 */
  maxMensual: number;
  /** Etiqueta profesional */
  label: string;
  /** true para grupos 8-11 (cotización diaria) */
  isDailyBase: boolean;
}

/** Base máxima mensual general 2026 (todos los grupos) */
export const SS_BASE_MAX_MENSUAL_2026 = 5101.20;

/** Base máxima diaria general 2026 */
export const SS_BASE_MAX_DIARIA_2026 = 170.04;

/**
 * Topes de bases de cotización por grupo 2026.
 * Grupos 1-7: bases mensuales. Grupos 8-11: bases diarias.
 */
export const SS_GROUP_BASES_2026: Record<number, SSGroupBase> = {
  1:  { minMensual: 1989.30, maxMensual: 5101.20, label: 'Ingenieros, Licenciados y Personal de alta dirección', isDailyBase: false },
  2:  { minMensual: 1649.70, maxMensual: 5101.20, label: 'Ingenieros técnicos, Peritos y Ayudantes titulados', isDailyBase: false },
  3:  { minMensual: 1435.20, maxMensual: 5101.20, label: 'Jefes Administrativos y de Taller', isDailyBase: false },
  4:  { minMensual: 1424.40, maxMensual: 5101.20, label: 'Ayudantes no titulados', isDailyBase: false },
  5:  { minMensual: 1424.40, maxMensual: 5101.20, label: 'Oficiales Administrativos', isDailyBase: false },
  6:  { minMensual: 1424.40, maxMensual: 5101.20, label: 'Subalternos', isDailyBase: false },
  7:  { minMensual: 1424.40, maxMensual: 5101.20, label: 'Auxiliares Administrativos', isDailyBase: false },
  8:  { minMensual: 47.48,   maxMensual: 170.04,  label: 'Oficiales 1ª y 2ª (diaria)', isDailyBase: true },
  9:  { minMensual: 47.48,   maxMensual: 170.04,  label: 'Oficiales 3ª y Especialistas (diaria)', isDailyBase: true },
  10: { minMensual: 47.48,   maxMensual: 170.04,  label: 'Peones (diaria)', isDailyBase: true },
  11: { minMensual: 47.48,   maxMensual: 170.04,  label: 'Menores de 18 años (diaria)', isDailyBase: true },
};

/**
 * Convenience: bases mínimas mensuales por grupo (para payroll engine).
 * Grupos 8-11 devuelven la base mínima MENSUAL equivalente (Orden PJC/297/2026).
 */
export const SS_GROUP_MIN_BASES_MENSUAL_2026: Record<number, number> = {
  1: 1989.30,
  2: 1649.70,
  3: 1435.20,
  4: 1424.40,
  5: 1424.40,
  6: 1424.40,
  7: 1424.40,
  8: 1424.40,  // equivalente mensual de 47.48 €/día
  9: 1424.40,
  10: 1424.40,
  11: 1424.40,
};

// ============================================
// CONTRIBUTION RATES (RDL 3/2026)
// ============================================

export interface SSContributionRate {
  empresa: number;
  trabajador: number;
  total: number;
}

/** Tipos de cotización SS 2026 — Canonical */
export const SS_CONTRIBUTION_RATES_2026 = {
  contingenciasComunes: { empresa: 23.60, trabajador: 4.70, total: 28.30 } as SSContributionRate,
  desempleoIndefinido:  { empresa: 5.50,  trabajador: 1.55, total: 7.05 } as SSContributionRate,
  desempleoTemporal:    { empresa: 6.70,  trabajador: 1.60, total: 8.30 } as SSContributionRate,
  formacionProfesional: { empresa: 0.60,  trabajador: 0.10, total: 0.70 } as SSContributionRate,
  fogasa:               { empresa: 0.20,  trabajador: 0,    total: 0.20 } as SSContributionRate,
  mei:                  { empresa: 0.75,  trabajador: 0.15, total: 0.90 } as SSContributionRate,
  /** AT/EP referencia media — depende del CNAE, usar tarifa específica en producción */
  atepReferencia:       { empresa: 1.50,  trabajador: 0,    total: 1.50 } as SSContributionRate,
} as const;

// ============================================
// SOLIDARITY SURCHARGE (Cotización adicional de solidaridad 2026)
// ============================================

export interface SolidaritySurchargeTramo {
  desde: number;
  hasta: number | null;
  empresa: number;
  trabajador: number;
  total: number;
}

/** Tramos de cotización adicional de solidaridad 2026 */
export const SS_SOLIDARITY_SURCHARGE_2026: SolidaritySurchargeTramo[] = [
  { desde: 5101.21, hasta: 5611.32, empresa: 0.96, trabajador: 0.19, total: 1.15 },
  { desde: 5611.33, hasta: 7651.80, empresa: 1.04, trabajador: 0.21, total: 1.25 },
  { desde: 7651.81, hasta: null,    empresa: 1.22, trabajador: 0.24, total: 1.46 },
];

// ============================================
// OVERTIME RATES
// ============================================

/** Tipos horas extra (RDL 3/2026) */
export const SS_OVERTIME_RATES_2026 = {
  fuerzaMayor: { empresa: 12.00, trabajador: 2.00, total: 14.00 },
  resto:       { empresa: 23.60, trabajador: 4.70, total: 28.30 },
} as const;
