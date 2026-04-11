/**
 * stockOptionsEngine.ts — P1.7B-RB
 * Pure engine for stock options / equity compensation (Spain-centric).
 * Models: grant → vesting → exercise lifecycle + Spanish tax treatment.
 * No side-effects, no React, no Supabase — pure deterministic functions only.
 */

// ── Types ──

export type EquityPlanType =
  | 'standard_stock_options'
  | 'restricted_stock_units'
  | 'phantom_shares'
  | 'startup_stock_options';

export type GrantStatus =
  | 'granted'
  | 'vesting'
  | 'partially_vested'
  | 'fully_vested'
  | 'exercised'
  | 'expired'
  | 'cancelled';

export type SupportLevel = 'supported_production' | 'supported_with_review' | 'out_of_scope';

export interface EquityPlan {
  id: string;
  companyId: string;
  planName: string;
  planType: EquityPlanType;
  totalPool: number;
  currency: string;
  approvalDate: string;
  isStartup: boolean;
  cliffMonths: number;
  vestingMonths: number;
  vestingSchedule: 'linear' | 'cliff_then_linear' | 'graded' | 'custom';
  notes?: string;
}

export interface EquityGrant {
  id: string;
  planId: string;
  employeeId: string;
  grantDate: string;
  totalShares: number;
  strikePrice: number;
  vestedShares: number;
  exercisedShares: number;
  status: GrantStatus;
  cliffDate: string;
  finalVestingDate: string;
  expirationDate?: string;
}

export interface VestingScheduleEntry {
  date: string;
  sharesVesting: number;
  cumulativeVested: number;
  percentVested: number;
  isPast: boolean;
  isCliff: boolean;
}

export interface ExerciseSimulation {
  exerciseDate: string;
  sharesToExercise: number;
  strikePrice: number;
  marketPrice: number;
  grossBenefit: number;
  taxableIncome: number;
  generalExemption: number;
  startupExemption: number;
  irregularReduction: number;
  netTaxableAfterExemptions: number;
  estimatedIRPF: number;
  ssCost: number;
  netBenefit: number;
  supportLevel: SupportLevel;
  reviewPoints: string[];
  notes: string[];
}

export interface GrantClassification {
  supportLevel: SupportLevel;
  supportLabel: string;
  reviewPoints: string[];
  taxTreatmentSummary: string;
  payrollImpact: boolean;
  irpfImpact: boolean;
  ssImpact: boolean;
  notes: string[];
}

// ── Constants (Spanish tax rules 2024-2026) ──

/** Art. 42.3.f LIRPF — General exemption for equity plans */
const GENERAL_EXEMPTION_LIMIT = 12_000;
/** Ley 28/2022, Art. 3 — Startup exemption */
const STARTUP_EXEMPTION_LIMIT = 50_000;
/** Art. 18.2 LIRPF — Irregular income reduction (generation > 2 years) */
const IRREGULAR_REDUCTION_RATE = 0.30;
const IRREGULAR_REDUCTION_MAX = 300_000;
/** Minimum generation period for irregular income treatment */
const IRREGULAR_MIN_YEARS = 2;
/** Estimated marginal IRPF rate for simulation (top bracket) */
const ESTIMATED_MARGINAL_IRPF = 0.45;
/** SS contribution rate on stock option income (aprox. empresa+trabajador) */
const SS_CONTRIBUTION_RATE = 0.0647; // Trabajador portion on exercise benefit

export const PLAN_TYPE_LABELS: Record<EquityPlanType, string> = {
  standard_stock_options: 'Stock Options Estándar',
  restricted_stock_units: 'RSU (Restricted Stock Units)',
  phantom_shares: 'Phantom Shares',
  startup_stock_options: 'Stock Options Startup',
};

export const GRANT_STATUS_LABELS: Record<GrantStatus, string> = {
  granted: 'Concedido',
  vesting: 'En vesting',
  partially_vested: 'Parcialmente consolidado',
  fully_vested: 'Totalmente consolidado',
  exercised: 'Ejercitado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

export const SUPPORT_LEVEL_LABELS: Record<SupportLevel, string> = {
  supported_production: 'Producción',
  supported_with_review: 'Requiere revisión',
  out_of_scope: 'Fuera de alcance',
};

// ── General exemption requirements (Art. 42.3.f) ──

export interface ExemptionRequirement {
  id: string;
  label: string;
  description: string;
  met: boolean | null;
}

function checkGeneralExemptionRequirements(
  plan: EquityPlan,
  grant: EquityGrant,
): ExemptionRequirement[] {
  const grantDate = new Date(grant.grantDate);
  const now = new Date();
  const holdingYears = (now.getTime() - grantDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'general_offer',
      label: 'Oferta generalizada',
      description: 'El plan debe estar abierto a todos los trabajadores de la empresa o grupo en las mismas condiciones',
      met: null, // Cannot determine automatically
    },
    {
      id: 'holding_3y',
      label: 'Mantenimiento 3 años',
      description: 'Las acciones/participaciones deben mantenerse al menos 3 años desde la entrega',
      met: holdingYears >= 3 ? true : holdingYears < 3 ? false : null,
    },
    {
      id: 'no_majority',
      label: 'Sin participación mayoritaria',
      description: 'El trabajador no puede tener participación > 5% del capital (individual o con cónyuge/familiares)',
      met: null, // Cannot determine automatically
    },
  ];
}

// ── Core functions ──

/**
 * Generate vesting schedule for a grant.
 */
export function computeVestingSchedule(
  grant: EquityGrant,
  plan: EquityPlan,
): VestingScheduleEntry[] {
  const entries: VestingScheduleEntry[] = [];
  const grantDate = new Date(grant.grantDate);
  const cliffDate = new Date(grant.cliffDate);
  const finalDate = new Date(grant.finalVestingDate);
  const now = new Date();
  const totalMonths = plan.vestingMonths;
  const cliffMonths = plan.cliffMonths;

  if (plan.vestingSchedule === 'cliff_then_linear' || plan.vestingSchedule === 'linear') {
    const monthsAfterCliff = totalMonths - cliffMonths;
    const sharesAtCliff = cliffMonths > 0
      ? Math.floor(grant.totalShares * (cliffMonths / totalMonths))
      : 0;
    const remainingShares = grant.totalShares - sharesAtCliff;
    const monthlyVest = monthsAfterCliff > 0 ? Math.floor(remainingShares / monthsAfterCliff) : 0;

    let cumulative = 0;

    // Cliff entry
    if (cliffMonths > 0) {
      cumulative += sharesAtCliff;
      entries.push({
        date: cliffDate.toISOString().slice(0, 10),
        sharesVesting: sharesAtCliff,
        cumulativeVested: cumulative,
        percentVested: Math.round((cumulative / grant.totalShares) * 100),
        isPast: cliffDate <= now,
        isCliff: true,
      });
    }

    // Monthly entries after cliff
    for (let m = 1; m <= monthsAfterCliff; m++) {
      const entryDate = new Date(cliffDate);
      entryDate.setMonth(entryDate.getMonth() + m);
      const isLast = m === monthsAfterCliff;
      const vest = isLast ? (grant.totalShares - cumulative) : monthlyVest;
      cumulative += vest;

      entries.push({
        date: entryDate.toISOString().slice(0, 10),
        sharesVesting: vest,
        cumulativeVested: cumulative,
        percentVested: Math.round((cumulative / grant.totalShares) * 100),
        isPast: entryDate <= now,
        isCliff: false,
      });
    }
  } else {
    // Graded or custom — simple equal quarterly
    const quarters = Math.ceil(totalMonths / 3);
    const perQuarter = Math.floor(grant.totalShares / quarters);
    let cumulative = 0;

    for (let q = 1; q <= quarters; q++) {
      const entryDate = new Date(grantDate);
      entryDate.setMonth(entryDate.getMonth() + q * 3);
      const isLast = q === quarters;
      const vest = isLast ? (grant.totalShares - cumulative) : perQuarter;
      cumulative += vest;

      entries.push({
        date: entryDate.toISOString().slice(0, 10),
        sharesVesting: vest,
        cumulativeVested: cumulative,
        percentVested: Math.round((cumulative / grant.totalShares) * 100),
        isPast: entryDate <= now,
        isCliff: q === 1 && cliffMonths > 0,
      });
    }
  }

  return entries;
}

/**
 * Classify a grant for support level and tax treatment.
 */
export function classifyGrant(plan: EquityPlan, grant: EquityGrant): GrantClassification {
  const reviewPoints: string[] = [];
  const notes: string[] = [];
  let supportLevel: SupportLevel = 'supported_production';

  // Phantom shares → always review (no real shares, complex accounting)
  if (plan.planType === 'phantom_shares') {
    supportLevel = 'supported_with_review';
    reviewPoints.push('Phantom shares requiere valoración contable especializada');
    reviewPoints.push('Tratamiento como renta dineraria, sin entrega de acciones');
    notes.push('Tributación como rendimiento del trabajo en el momento del pago');
  }

  // RSU → review if complex conditions
  if (plan.planType === 'restricted_stock_units') {
    supportLevel = 'supported_with_review';
    reviewPoints.push('RSU: verificar si hay condiciones de permanencia o rendimiento');
    reviewPoints.push('Verificar momento exacto de tributación (vesting vs delivery)');
    notes.push('RSU tributan como rendimiento del trabajo en el momento de la entrega');
  }

  // Startup with high exemption
  if (plan.isStartup) {
    if (plan.planType === 'standard_stock_options' || plan.planType === 'startup_stock_options') {
      supportLevel = 'supported_with_review';
      reviewPoints.push('Verificar que la empresa cumple requisitos Ley 28/2022 para exención startup');
      reviewPoints.push('Verificar antigüedad de la empresa < 5 años (ampliable a 7)');
      reviewPoints.push('Verificar facturación < 10M€');
      notes.push(`Exención startup hasta ${STARTUP_EXEMPTION_LIMIT.toLocaleString('es-ES')}€`);
    }
  }

  // Standard stock options — production supported
  if (plan.planType === 'standard_stock_options' && !plan.isStartup) {
    notes.push('Stock options estándar: tratamiento fiscal establecido');
    notes.push(`Exención general posible hasta ${GENERAL_EXEMPTION_LIMIT.toLocaleString('es-ES')}€ (Art. 42.3.f LIRPF)`);
  }

  // Check irregular income eligibility
  const grantDate = new Date(grant.grantDate);
  const now = new Date();
  const generationYears = (now.getTime() - grantDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (generationYears >= IRREGULAR_MIN_YEARS) {
    notes.push(`Posible reducción 30% por renta irregular (generación > ${IRREGULAR_MIN_YEARS} años, Art. 18.2 LIRPF)`);
  }

  // Payroll/fiscal impact
  const payrollImpact = grant.status !== 'cancelled' && grant.status !== 'expired';
  const irpfImpact = payrollImpact;
  const ssImpact = payrollImpact && plan.planType !== 'phantom_shares';

  const taxSummaries: Record<EquityPlanType, string> = {
    standard_stock_options: 'Rendimiento del trabajo en ejercicio. Exención 12.000€ si cumple requisitos. Reducción 30% si generación > 2 años.',
    startup_stock_options: 'Rendimiento del trabajo. Exención startup hasta 50.000€ (Ley 28/2022). Diferimiento posible.',
    restricted_stock_units: 'Rendimiento del trabajo en la entrega. Sin exención general habitual. Revisión obligatoria.',
    phantom_shares: 'Rendimiento del trabajo (dinerario). Sin exención por no existir entrega de acciones. Revisión contable obligatoria.',
  };

  return {
    supportLevel,
    supportLabel: SUPPORT_LEVEL_LABELS[supportLevel],
    reviewPoints,
    taxTreatmentSummary: taxSummaries[plan.planType],
    payrollImpact,
    irpfImpact,
    ssImpact,
    notes,
  };
}

/**
 * Simulate exercising stock options — compute tax impact.
 */
export function simulateExercise(
  plan: EquityPlan,
  grant: EquityGrant,
  marketPrice: number,
  sharesToExercise?: number,
): ExerciseSimulation {
  const shares = sharesToExercise ?? (grant.vestedShares - grant.exercisedShares);
  const grossBenefit = (marketPrice - grant.strikePrice) * shares;
  const reviewPoints: string[] = [];
  const notes: string[] = [];

  if (grossBenefit <= 0) {
    return {
      exerciseDate: new Date().toISOString().slice(0, 10),
      sharesToExercise: shares,
      strikePrice: grant.strikePrice,
      marketPrice,
      grossBenefit: Math.max(0, grossBenefit),
      taxableIncome: 0,
      generalExemption: 0,
      startupExemption: 0,
      irregularReduction: 0,
      netTaxableAfterExemptions: 0,
      estimatedIRPF: 0,
      ssCost: 0,
      netBenefit: Math.max(0, grossBenefit),
      supportLevel: 'supported_production',
      reviewPoints: [],
      notes: ['Beneficio nulo o negativo: no se genera tributación'],
    };
  }

  let taxableIncome = grossBenefit;
  let generalExemption = 0;
  let startupExemption = 0;
  let irregularReduction = 0;
  let supportLevel: SupportLevel = 'supported_production';

  // 1. Apply startup exemption first (higher limit)
  if (plan.isStartup && (plan.planType === 'startup_stock_options' || plan.planType === 'standard_stock_options')) {
    startupExemption = Math.min(taxableIncome, STARTUP_EXEMPTION_LIMIT);
    taxableIncome -= startupExemption;
    supportLevel = 'supported_with_review';
    reviewPoints.push('Verificar requisitos Ley 28/2022 para aplicar exención startup');
    notes.push(`Exención startup aplicada: ${startupExemption.toLocaleString('es-ES')}€`);
  }
  // 2. Apply general exemption (if not startup or remaining amount)
  else if (plan.planType === 'standard_stock_options') {
    const requirements = checkGeneralExemptionRequirements(plan, grant);
    const unknowns = requirements.filter(r => r.met === null);
    const met = requirements.filter(r => r.met === true);

    if (unknowns.length > 0) {
      reviewPoints.push('Verificar requisitos de exención general Art. 42.3.f');
      for (const u of unknowns) {
        reviewPoints.push(`Pendiente: ${u.label}`);
      }
    }

    // Apply optimistically if holding period met
    if (requirements.find(r => r.id === 'holding_3y')?.met !== false) {
      generalExemption = Math.min(taxableIncome, GENERAL_EXEMPTION_LIMIT);
      taxableIncome -= generalExemption;
      notes.push(`Exención general aplicada (condicional): ${generalExemption.toLocaleString('es-ES')}€`);
    }
  }

  // 3. Irregular income reduction (Art. 18.2)
  const grantDate = new Date(grant.grantDate);
  const now = new Date();
  const generationYears = (now.getTime() - grantDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (generationYears >= IRREGULAR_MIN_YEARS && taxableIncome > 0) {
    const reductionBase = Math.min(taxableIncome, IRREGULAR_REDUCTION_MAX);
    irregularReduction = reductionBase * IRREGULAR_REDUCTION_RATE;
    taxableIncome -= irregularReduction;
    notes.push(`Reducción 30% renta irregular aplicada: ${irregularReduction.toLocaleString('es-ES')}€`);
  }

  const netTaxableAfterExemptions = Math.max(0, taxableIncome);
  const estimatedIRPF = netTaxableAfterExemptions * ESTIMATED_MARGINAL_IRPF;
  const ssCost = grossBenefit * SS_CONTRIBUTION_RATE;
  const netBenefit = grossBenefit - estimatedIRPF - ssCost;

  // Determine support level
  if (plan.planType === 'phantom_shares') {
    supportLevel = 'out_of_scope';
    reviewPoints.push('Phantom shares: ejercicio requiere asesoría especializada');
  } else if (plan.planType === 'restricted_stock_units') {
    supportLevel = 'supported_with_review';
    reviewPoints.push('RSU: confirmar tratamiento fiscal exacto con asesor');
  }

  notes.push(`IRPF estimado al tipo marginal ${(ESTIMATED_MARGINAL_IRPF * 100).toFixed(0)}% (simulación, tipo real puede variar)`);
  notes.push(`Cotización SS estimada trabajador: ${ssCost.toLocaleString('es-ES')}€`);

  return {
    exerciseDate: now.toISOString().slice(0, 10),
    sharesToExercise: shares,
    strikePrice: grant.strikePrice,
    marketPrice,
    grossBenefit,
    taxableIncome: grossBenefit, // Pre-exemption
    generalExemption,
    startupExemption,
    irregularReduction,
    netTaxableAfterExemptions,
    estimatedIRPF,
    ssCost,
    netBenefit,
    supportLevel,
    reviewPoints,
    notes,
  };
}

/**
 * Get current vested shares for a grant.
 */
export function getCurrentVestedShares(grant: EquityGrant, plan: EquityPlan): number {
  const schedule = computeVestingSchedule(grant, plan);
  const pastEntries = schedule.filter(e => e.isPast);
  return pastEntries.length > 0 ? pastEntries[pastEntries.length - 1].cumulativeVested : 0;
}

/**
 * Compute payroll impact for a stock option exercise — generates ES_STOCK_OPTIONS line.
 */
export function computePayrollImpact(simulation: ExerciseSimulation): {
  conceptCode: string;
  conceptName: string;
  amount: number;
  isTaxable: boolean;
  isContributable: boolean;
  notes: string[];
} {
  return {
    conceptCode: 'ES_STOCK_OPTIONS',
    conceptName: 'Stock options',
    amount: simulation.grossBenefit,
    isTaxable: true,
    isContributable: true,
    notes: [
      `Beneficio bruto por ejercicio de ${simulation.sharesToExercise} acciones`,
      `Precio ejercicio: ${simulation.strikePrice}€ → Precio mercado: ${simulation.marketPrice}€`,
      ...simulation.notes,
    ],
  };
}

/**
 * Preflight check: are there equity grants with pending exercise that affect payroll?
 */
export function getEquityPreflightStatus(
  grants: EquityGrant[],
  plans: Map<string, EquityPlan>,
): {
  hasActiveGrants: boolean;
  pendingExerciseCount: number;
  worstSupportLevel: SupportLevel;
  reviewRequired: boolean;
  summary: string;
} {
  const activeGrants = grants.filter(g =>
    g.status !== 'cancelled' && g.status !== 'expired' && g.status !== 'exercised'
  );

  const pendingExercise = activeGrants.filter(g => {
    const plan = plans.get(g.planId);
    if (!plan) return false;
    const vested = getCurrentVestedShares(g, plan);
    return vested > g.exercisedShares;
  });

  let worstSupportLevel: SupportLevel = 'supported_production';
  let reviewRequired = false;

  for (const g of activeGrants) {
    const plan = plans.get(g.planId);
    if (!plan) continue;
    const classification = classifyGrant(plan, g);
    if (classification.supportLevel === 'out_of_scope') {
      worstSupportLevel = 'out_of_scope';
      reviewRequired = true;
    } else if (classification.supportLevel === 'supported_with_review' && worstSupportLevel !== 'out_of_scope') {
      worstSupportLevel = 'supported_with_review';
      reviewRequired = true;
    }
  }

  const summary = activeGrants.length === 0
    ? 'Sin planes de equity activos'
    : `${activeGrants.length} grant(s) activo(s), ${pendingExercise.length} con ejercicio pendiente`;

  return {
    hasActiveGrants: activeGrants.length > 0,
    pendingExerciseCount: pendingExercise.length,
    worstSupportLevel,
    reviewRequired,
    summary,
  };
}
