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

/**
 * Calculate milestone dates (365 and 545 days) from start date
 */
export function calculateMilestones(startDate: string): {
  milestone365: string;
  milestone545: string;
  daysElapsed: number;
  isNear365: boolean;
  isNear545: boolean;
  isPast365: boolean;
  isPast545: boolean;
} {
  const start = new Date(startDate);
  const now = new Date();
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const m365 = new Date(start);
  m365.setDate(m365.getDate() + 365);

  const m545 = new Date(start);
  m545.setDate(m545.getDate() + 545);

  return {
    milestone365: m365.toISOString().split('T')[0],
    milestone545: m545.toISOString().split('T')[0],
    daysElapsed,
    isNear365: daysElapsed >= 335 && daysElapsed < 365,
    isNear545: daysElapsed >= 515 && daysElapsed < 545,
    isPast365: daysElapsed >= 365,
    isPast545: daysElapsed >= 545,
  };
}

/**
 * Calculate the base reguladora for EC (Enfermedad Común)
 * Base = (Base cotización mes anterior) / 30
 * Days 4-20: 60% of base
 * Day 21+: 75% of base
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
 * Base = (Salario día que no incluye horas extra) + (Media H. extras 12 meses / 365)
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
    case 'convention':
      // Complement up to the convention percentage of salary
      const target = params.salarioDiario * (params.complementPercentage / 100);
      return Math.max(0, Math.round((target - params.dailySubsidy) * 100) / 100);
    case 'full':
      // Complement to 100% of salary
      return Math.max(0, Math.round((params.salarioDiario - params.dailySubsidy) * 100) / 100);
    default:
      return 0;
  }
}

/**
 * Determine the status alerts for an IT process
 */
export function getProcessAlerts(process: Pick<HRITProcess, 'start_date' | 'status' | 'process_type' | 'milestone_365_notified' | 'milestone_545_notified'>): Array<{
  type: 'info' | 'warning' | 'critical';
  code: string;
  message: string;
}> {
  if (process.status !== 'active') return [];

  const milestones = calculateMilestones(process.start_date);
  const alerts: Array<{ type: 'info' | 'warning' | 'critical'; code: string; message: string }> = [];

  if (milestones.isPast545) {
    alerts.push({
      type: 'critical',
      code: 'PAST_545',
      message: `Superados 545 días (${milestones.daysElapsed} días). Extinción obligatoria de la prestación.`,
    });
  } else if (milestones.isNear545) {
    alerts.push({
      type: 'critical',
      code: 'NEAR_545',
      message: `Próximo a 545 días (${milestones.daysElapsed} días). Preparar resolución INSS.`,
    });
  }

  if (milestones.isPast365 && !milestones.isPast545) {
    alerts.push({
      type: 'warning',
      code: 'PAST_365',
      message: `Superados 365 días (${milestones.daysElapsed} días). Requiere resolución INSS para prórroga.`,
    });
  } else if (milestones.isNear365) {
    alerts.push({
      type: 'warning',
      code: 'NEAR_365',
      message: `Próximo a 365 días (${milestones.daysElapsed} días). Preparar informe para INSS.`,
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
  const isAT = params.processType === 'AT';
  const subsidy = getSubsidyPercentage(params.processType, params.dayNumber);

  let totalBase: number;
  let baseDailyEC = 0;
  let baseDailyAT = 0;
  let baseDailyExtraHours = 0;

  if (isAT) {
    const atCalc = calculateBaseReguladoraAT({
      salarioDiario: params.salarioDiario,
      horasExtras12m: params.horasExtras12m,
    });
    totalBase = atCalc.totalBase;
    baseDailyAT = atCalc.baseDiaria;
    baseDailyExtraHours = atCalc.complementoHorasExtra;
  } else {
    const ecCalc = calculateBaseReguladoraEC({
      baseCotizacionMesAnterior: params.baseCotizacionMesAnterior,
      horasExtraMes: 0,
      proMediaExtras12m: params.proMediaExtras12m,
      daysInMonth: params.daysInMonth,
    });
    totalBase = ecCalc.totalBase;
    baseDailyEC = ecCalc.baseDiaria;
  }

  const dailySubsidy = Math.round((totalBase * subsidy.percentage / 100) * 100) / 100;
  const employerComplement = calculateEmployerComplement({
    dailySubsidy,
    salarioDiario: params.salarioDiario,
    complementPercentage: params.complementPercentage,
    complementScheme: params.complementScheme,
  });

  return {
    calculation_date: new Date().toISOString().split('T')[0],
    base_monthly: params.baseCotizacionMesAnterior,
    base_daily_ec: baseDailyEC,
    base_daily_at: baseDailyAT,
    base_daily_extra_hours: baseDailyExtraHours,
    base_fdi_ec: 0,
    base_fdi_at: 0,
    base_fdi_maternity: params.processType === 'MAT' ? totalBase : 0,
    days_in_period: params.daysInMonth || 30,
    prorrata_extras: params.proMediaExtras12m / 365,
    total_base_reguladora: totalBase,
    pct_subsidy: subsidy.percentage,
    daily_subsidy: dailySubsidy,
    employer_complement: employerComplement,
    calculation_method: isAT ? 'at_standard' : 'ec_standard',
    notes: null,
    metadata: { payer: subsidy.payer, day_number: params.dayNumber },
  };
}
