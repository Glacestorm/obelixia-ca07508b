/**
 * itProcessEngine — Motor puro de lógica de negocio para IT
 * Capa 4: Engine determinista sin side-effects
 * LGSS art. 169-176, RD 625/2014
 */

import type { HRITProcess, HRITBase, ITProcessType } from '@/types/hr';

// ============================================
// SUBSIDY PERCENTAGES BY PROCESS TYPE & DAY
// ============================================

interface SubsidyRule {
  fromDay: number;
  toDay: number;
  percentage: number;
  payer: 'employer' | 'ss' | 'mutua';
}

const SUBSIDY_RULES: Record<ITProcessType, SubsidyRule[]> = {
  EC: [
    { fromDay: 1, toDay: 3, percentage: 0, payer: 'employer' },
    { fromDay: 4, toDay: 15, percentage: 60, payer: 'employer' },
    { fromDay: 16, toDay: 20, percentage: 60, payer: 'ss' },
    { fromDay: 21, toDay: 545, percentage: 75, payer: 'ss' },
  ],
  ANL: [
    { fromDay: 1, toDay: 3, percentage: 0, payer: 'employer' },
    { fromDay: 4, toDay: 15, percentage: 60, payer: 'employer' },
    { fromDay: 16, toDay: 20, percentage: 60, payer: 'ss' },
    { fromDay: 21, toDay: 545, percentage: 75, payer: 'ss' },
  ],
  AT: [
    { fromDay: 1, toDay: 1, percentage: 75, payer: 'employer' },
    { fromDay: 2, toDay: 545, percentage: 75, payer: 'mutua' },
  ],
  MAT: [
    { fromDay: 1, toDay: 365, percentage: 100, payer: 'ss' },
  ],
  PAT: [
    { fromDay: 1, toDay: 365, percentage: 100, payer: 'ss' },
  ],
  RE: [
    { fromDay: 1, toDay: 365, percentage: 100, payer: 'ss' },
  ],
  ERE_TOTAL: [
    { fromDay: 1, toDay: 365, percentage: 0, payer: 'employer' },
  ],
  ERE_PARCIAL: [
    { fromDay: 1, toDay: 365, percentage: 0, payer: 'employer' },
  ],
  PAGO_DIRECTO: [
    { fromDay: 1, toDay: 365, percentage: 75, payer: 'ss' },
  ],
  PATERNIDAD_TP: [
    { fromDay: 1, toDay: 365, percentage: 100, payer: 'ss' },
  ],
  F_NORETRIB: [
    { fromDay: 1, toDay: 365, percentage: 0, payer: 'employer' },
  ],
  F_HUELGA: [
    { fromDay: 1, toDay: 365, percentage: 0, payer: 'employer' },
  ],
  F_SUSPENSION: [
    { fromDay: 1, toDay: 365, percentage: 0, payer: 'employer' },
  ],
  HOSPITAL: [
    { fromDay: 1, toDay: 3, percentage: 0, payer: 'employer' },
    { fromDay: 4, toDay: 15, percentage: 60, payer: 'employer' },
    { fromDay: 16, toDay: 365, percentage: 75, payer: 'ss' },
  ],
};

/**
 * Get the subsidy percentage for a given process type and day number
 */
export function getSubsidyPercentage(processType: ITProcessType, dayNumber: number): {
  percentage: number;
  payer: string;
} {
  const rules = SUBSIDY_RULES[processType] || SUBSIDY_RULES.EC;
  for (const rule of rules) {
    if (dayNumber >= rule.fromDay && dayNumber <= rule.toDay) {
      return { percentage: rule.percentage, payer: rule.payer };
    }
  }
  return { percentage: 75, payer: 'ss' };
}

// ============================================
// MILESTONES 365/545 — LGSS Arts. 169-170
// ============================================

export interface ITMilestone {
  code: string;
  day: number;
  label: string;
  description: string;
  action: string;
  norm: string;
  reached: boolean;
  date: string;
}

/**
 * Calculate milestone dates (365 and 545 days) from start date
 * Enhanced with detailed LGSS milestone tracking
 */
export function calculateMilestones(startDate: string): {
  milestone365: string;
  milestone545: string;
  daysElapsed: number;
  isNear365: boolean;
  isNear545: boolean;
  isPast365: boolean;
  isPast545: boolean;
  /** Detailed milestones for timeline */
  detailedMilestones: ITMilestone[];
} {
  const start = new Date(startDate);
  const now = new Date();
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r.toISOString().split('T')[0];
  };

  const m365 = addDays(start, 365);
  const m545 = addDays(start, 545);

  // Detailed milestones per LGSS
  const detailedMilestones: ITMilestone[] = [
    {
      code: 'IT_DAY_3', day: 3, label: 'Fin carencia empresa',
      description: 'Los 3 primeros días son a cargo del empresario sin prestación SS',
      action: 'Registrar parte de baja. Iniciar pago subsidio día 4.',
      norm: 'LGSS Art. 173.1', reached: daysElapsed >= 3, date: addDays(start, 3),
    },
    {
      code: 'IT_DAY_15', day: 15, label: 'Fin responsabilidad empresa EC',
      description: 'A partir del día 16, la responsabilidad del pago pasa a la SS/Mutua',
      action: 'Comunicar a TGSS. Verificar parte de confirmación.',
      norm: 'LGSS Art. 173.1', reached: daysElapsed >= 15, date: addDays(start, 15),
    },
    {
      code: 'IT_DAY_21', day: 21, label: 'Cambio tipo prestación',
      description: 'El subsidio pasa del 60% al 75% de la base reguladora',
      action: 'Verificar cambio automático de porcentaje en nómina.',
      norm: 'LGSS Art. 171', reached: daysElapsed >= 21, date: addDays(start, 21),
    },
    {
      code: 'IT_DAY_90', day: 90, label: 'Revisión médica trimestral',
      description: 'Control médico obligatorio. Valorar evolución y pronóstico.',
      action: 'Solicitar informe médico actualizado.',
      norm: 'RD 625/2014 Art. 2', reached: daysElapsed >= 90, date: addDays(start, 90),
    },
    {
      code: 'IT_DAY_180', day: 180, label: 'Control semestral INSS',
      description: 'El INSS puede iniciar expediente de revisión a los 180 días.',
      action: 'Preparar documentación para posible citación INSS.',
      norm: 'LGSS Art. 170.1', reached: daysElapsed >= 180, date: addDays(start, 180),
    },
    {
      code: 'IT_DAY_335', day: 335, label: 'Pre-alerta 365 días',
      description: 'A 30 días del límite ordinario. Preparar informe para solicitud de prórroga.',
      action: 'Preparar informe médico y propuesta de resolución para INSS.',
      norm: 'LGSS Art. 169.1', reached: daysElapsed >= 335, date: addDays(start, 335),
    },
    {
      code: 'IT_DAY_365', day: 365, label: 'Límite ordinario IT',
      description: 'Fin del período ordinario de IT. El INSS debe resolver sobre prórroga, alta o incapacidad permanente.',
      action: 'OBLIGATORIO: Solicitar resolución INSS. Sin prórroga = alta automática.',
      norm: 'LGSS Art. 169.2', reached: daysElapsed >= 365, date: m365,
    },
    {
      code: 'IT_DAY_515', day: 515, label: 'Pre-alerta 545 días',
      description: 'A 30 días del límite máximo absoluto.',
      action: 'Preparar expediente de incapacidad permanente si procede.',
      norm: 'LGSS Art. 169.2', reached: daysElapsed >= 515, date: addDays(start, 515),
    },
    {
      code: 'IT_DAY_545', day: 545, label: 'Extinción máxima IT',
      description: 'Límite absoluto de IT. Extinción automática de la prestación. El INSS debe emitir resolución.',
      action: 'OBLIGATORIO: Registrar alta. Iniciar trámite IP si procede. Actualizar nómina.',
      norm: 'LGSS Art. 174', reached: daysElapsed >= 545, date: m545,
    },
  ];

  return {
    milestone365: m365,
    milestone545: m545,
    daysElapsed,
    isNear365: daysElapsed >= 335 && daysElapsed < 365,
    isNear545: daysElapsed >= 515 && daysElapsed < 545,
    isPast365: daysElapsed >= 365,
    isPast545: daysElapsed >= 545,
    detailedMilestones,
  };
}

// ============================================
// BASE REGULADORA POR CONTINGENCIA
// LGSS Arts. 169-170
// ============================================

/**
 * Calculate the base reguladora for EC (Enfermedad Común)
 * Base = (Base cotización mes anterior) / 30
 * LGSS Art. 171: 60% days 4-20, 75% day 21+
 */
export function calculateBaseReguladoraEC(params: {
  baseCotizacionMesAnterior: number;
  horasExtraMes: number;
  proMediaExtras12m: number;
  daysInMonth?: number;
}): {
  baseDiaria: number;
  totalBase: number;
  proExtras: number;
} {
  const days = params.daysInMonth || 30;
  const baseDiaria = params.baseCotizacionMesAnterior / days;
  const proExtras = params.proMediaExtras12m / 365;

  return {
    baseDiaria: Math.round(baseDiaria * 100) / 100,
    totalBase: Math.round((baseDiaria + proExtras) * 100) / 100,
    proExtras: Math.round(proExtras * 100) / 100,
  };
}

/**
 * Calculate the base reguladora for AT (Accidente de Trabajo)
 * LGSS Art. 13 + RD 8/2015
 * Base = salario día (sin horas extra) + (H.extras 12m / 365)
 */
export function calculateBaseReguladoraAT(params: {
  salarioDiario: number;
  horasExtras12m: number;
}): {
  baseDiaria: number;
  complementoHorasExtra: number;
  totalBase: number;
} {
  const complementoHE = params.horasExtras12m / 365;
  const totalBase = params.salarioDiario + complementoHE;

  return {
    baseDiaria: Math.round(params.salarioDiario * 100) / 100,
    complementoHorasExtra: Math.round(complementoHE * 100) / 100,
    totalBase: Math.round(totalBase * 100) / 100,
  };
}

/**
 * Calculate the base reguladora for ANL (Accidente No Laboral)
 * Same formula as EC: LGSS Art. 171
 */
export function calculateBaseReguladoraANL(params: {
  baseCotizacionMesAnterior: number;
  proMediaExtras12m: number;
  daysInMonth?: number;
}): {
  baseDiaria: number;
  totalBase: number;
  proExtras: number;
} {
  return calculateBaseReguladoraEC({
    baseCotizacionMesAnterior: params.baseCotizacionMesAnterior,
    horasExtraMes: 0,
    proMediaExtras12m: params.proMediaExtras12m,
    daysInMonth: params.daysInMonth,
  });
}

/**
 * Calculate the base reguladora for MAT/PAT (Maternidad/Paternidad)
 * LGSS Arts. 177-182
 * Base = Base cotización CC del mes anterior al inicio del descanso / 30
 * Subsidio: 100% desde el primer día
 */
export function calculateBaseReguladoraMAT(params: {
  baseCotizacionMesAnterior: number;
  daysInMonth?: number;
}): {
  baseDiaria: number;
  subsidioTotal: number;
  duracionDias: number;
} {
  const days = params.daysInMonth || 30;
  const baseDiaria = params.baseCotizacionMesAnterior / days;
  const duracionDias = 112; // 16 semanas

  return {
    baseDiaria: Math.round(baseDiaria * 100) / 100,
    subsidioTotal: Math.round(baseDiaria * duracionDias * 100) / 100,
    duracionDias,
  };
}

/**
 * Unified base reguladora calculator by contingency type
 */
export function calculateBaseReguladoraByType(params: {
  processType: ITProcessType;
  baseCotizacionMesAnterior: number;
  salarioDiario: number;
  horasExtras12m: number;
  proMediaExtras12m: number;
  daysInMonth?: number;
}): {
  baseDiaria: number;
  totalBase: number;
  method: string;
  norm: string;
} {
  switch (params.processType) {
    case 'AT': {
      const calc = calculateBaseReguladoraAT({
        salarioDiario: params.salarioDiario,
        horasExtras12m: params.horasExtras12m,
      });
      return { baseDiaria: calc.baseDiaria, totalBase: calc.totalBase, method: 'at_standard', norm: 'LGSS Art. 13' };
    }
    case 'EC': {
      const calc = calculateBaseReguladoraEC({
        baseCotizacionMesAnterior: params.baseCotizacionMesAnterior,
        horasExtraMes: 0,
        proMediaExtras12m: params.proMediaExtras12m,
        daysInMonth: params.daysInMonth,
      });
      return { baseDiaria: calc.baseDiaria, totalBase: calc.totalBase, method: 'ec_standard', norm: 'LGSS Art. 171' };
    }
    case 'ANL': {
      const calc = calculateBaseReguladoraANL({
        baseCotizacionMesAnterior: params.baseCotizacionMesAnterior,
        proMediaExtras12m: params.proMediaExtras12m,
        daysInMonth: params.daysInMonth,
      });
      return { baseDiaria: calc.baseDiaria, totalBase: calc.totalBase, method: 'anl_standard', norm: 'LGSS Art. 171' };
    }
    case 'MAT':
    case 'PAT':
    case 'RE': {
      const calc = calculateBaseReguladoraMAT({
        baseCotizacionMesAnterior: params.baseCotizacionMesAnterior,
        daysInMonth: params.daysInMonth,
      });
      return { baseDiaria: calc.baseDiaria, totalBase: calc.baseDiaria, method: 'mat_100pct', norm: 'LGSS Arts. 177-182' };
    }
    default: {
      const calc = calculateBaseReguladoraEC({
        baseCotizacionMesAnterior: params.baseCotizacionMesAnterior,
        horasExtraMes: 0,
        proMediaExtras12m: params.proMediaExtras12m,
        daysInMonth: params.daysInMonth,
      });
      return { baseDiaria: calc.baseDiaria, totalBase: calc.totalBase, method: 'ec_default', norm: 'LGSS Art. 171' };
    }
  }
}

/**
 * Calculate employer complement based on scheme
 */
export function calculateEmployerComplement(params: {
  dailySubsidy: number;
  salarioDiario: number;
  complementPercentage: number;
  complementScheme: 'none' | 'convention' | 'full';
}): number {
  switch (params.complementScheme) {
    case 'none':
      return 0;
    case 'convention': {
      const target = params.salarioDiario * (params.complementPercentage / 100);
      return Math.max(0, Math.round((target - params.dailySubsidy) * 100) / 100);
    }
    case 'full':
      return Math.max(0, Math.round((params.salarioDiario - params.dailySubsidy) * 100) / 100);
    default:
      return 0;
  }
}

/**
 * Determine the status alerts for an IT process
 * Enhanced with detailed LGSS compliance alerts
 */
export function getProcessAlerts(process: Pick<HRITProcess, 'start_date' | 'status' | 'process_type' | 'milestone_365_notified' | 'milestone_545_notified'>): Array<{
  type: 'info' | 'warning' | 'critical';
  code: string;
  message: string;
  action?: string;
  norm?: string;
}> {
  if (process.status !== 'active') return [];

  const milestones = calculateMilestones(process.start_date);
  const alerts: Array<{ type: 'info' | 'warning' | 'critical'; code: string; message: string; action?: string; norm?: string }> = [];

  if (milestones.isPast545) {
    alerts.push({
      type: 'critical', code: 'PAST_545',
      message: `Superados 545 días (${milestones.daysElapsed} días). Extinción obligatoria de la prestación.`,
      action: 'Registrar alta inmediata. Iniciar trámite IP si procede.',
      norm: 'LGSS Art. 174',
    });
  } else if (milestones.isNear545) {
    alerts.push({
      type: 'critical', code: 'NEAR_545',
      message: `Próximo a 545 días (${milestones.daysElapsed} días). Preparar resolución INSS.`,
      action: 'Preparar expediente de incapacidad permanente.',
      norm: 'LGSS Art. 169.2',
    });
  }

  if (milestones.isPast365 && !milestones.isPast545) {
    alerts.push({
      type: 'warning', code: 'PAST_365',
      message: `Superados 365 días (${milestones.daysElapsed} días). Requiere resolución INSS para prórroga.`,
      action: 'Verificar que existe resolución INSS de prórroga vigente.',
      norm: 'LGSS Art. 169.2',
    });
  } else if (milestones.isNear365) {
    alerts.push({
      type: 'warning', code: 'NEAR_365',
      message: `Próximo a 365 días (${milestones.daysElapsed} días). Preparar informe para INSS.`,
      action: 'Preparar informe médico y solicitud de prórroga.',
      norm: 'LGSS Art. 169.1',
    });
  }

  // Additional alert for processes approaching 180 days (INSS review)
  if (milestones.daysElapsed >= 170 && milestones.daysElapsed < 180) {
    alerts.push({
      type: 'info', code: 'NEAR_180',
      message: `Próximo a 180 días (${milestones.daysElapsed} días). El INSS puede iniciar revisión.`,
      action: 'Preparar documentación por si el INSS cita al trabajador.',
      norm: 'LGSS Art. 170.1',
    });
  }

  return alerts;
}

/**
 * Calculate the full IT base record
 */
export function calculateITBase(params: {
  processType: ITProcessType;
  baseCotizacionMesAnterior: number;
  salarioDiario: number;
  horasExtras12m: number;
  proMediaExtras12m: number;
  daysInMonth?: number;
  dayNumber: number;
  complementScheme: 'none' | 'convention' | 'full';
  complementPercentage: number;
}): Omit<HRITBase, 'id' | 'company_id' | 'process_id' | 'created_at' | 'updated_at'> {
  const subsidy = getSubsidyPercentage(params.processType, params.dayNumber);

  // Use unified calculator
  const baseCalc = calculateBaseReguladoraByType({
    processType: params.processType,
    baseCotizacionMesAnterior: params.baseCotizacionMesAnterior,
    salarioDiario: params.salarioDiario,
    horasExtras12m: params.horasExtras12m,
    proMediaExtras12m: params.proMediaExtras12m,
    daysInMonth: params.daysInMonth,
  });

  const dailySubsidy = Math.round((baseCalc.totalBase * subsidy.percentage / 100) * 100) / 100;
  const employerComplement = calculateEmployerComplement({
    dailySubsidy,
    salarioDiario: params.salarioDiario,
    complementPercentage: params.complementPercentage,
    complementScheme: params.complementScheme,
  });

  const isAT = params.processType === 'AT';

  return {
    calculation_date: new Date().toISOString().split('T')[0],
    base_monthly: params.baseCotizacionMesAnterior,
    base_daily_ec: isAT ? 0 : baseCalc.baseDiaria,
    base_daily_at: isAT ? baseCalc.baseDiaria : 0,
    base_daily_extra_hours: isAT ? (params.horasExtras12m / 365) : 0,
    base_fdi_ec: 0,
    base_fdi_at: 0,
    base_fdi_maternity: (params.processType === 'MAT' || params.processType === 'PAT') ? baseCalc.totalBase : 0,
    days_in_period: params.daysInMonth || 30,
    prorrata_extras: params.proMediaExtras12m / 365,
    total_base_reguladora: baseCalc.totalBase,
    pct_subsidy: subsidy.percentage,
    daily_subsidy: dailySubsidy,
    employer_complement: employerComplement,
    calculation_method: baseCalc.method,
    notes: null,
    metadata: { payer: subsidy.payer, day_number: params.dayNumber, norm: baseCalc.norm },
  };
}
