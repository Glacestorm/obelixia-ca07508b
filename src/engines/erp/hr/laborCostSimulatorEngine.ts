/**
 * laborCostSimulatorEngine.ts — Simulador de Coste Laboral Total (C2)
 * 
 * Calcula el coste laboral total real (no solo bruto) y proyecta escenarios
 * a 12-36 meses con variables editables.
 * 
 * Componentes de coste:
 *   1. Salario bruto (base + complementos + pagas extra)
 *   2. Seguridad Social empresa (CC, desempleo, FOGASA, FP, MEI, AT/EP)
 *   3. Formación bonificada (estimación)
 *   4. PRL (estimación)
 *   5. Beneficios sociales (si datos disponibles)
 *   6. Otros costes indirectos (absentismo, sustitución)
 * 
 * DISCLAIMER: Las proyecciones son estimaciones basadas en hipótesis explícitas.
 * No constituyen garantía de ahorro ni compromiso presupuestario vinculante.
 */

// ── Types ──

export type DataOrigin = 'historical' | 'hypothesis' | 'projection';

export interface CostLineItem {
  code: string;
  label: string;
  monthlyAmount: number;
  annualAmount: number;
  percentOfTotal: number;
  origin: DataOrigin;
  notes?: string;
}

export interface LaborCostBreakdown {
  grossSalary: number;
  ssEmployer: number;
  training: number;
  prl: number;
  benefits: number;
  absenteeismCost: number;
  otherCosts: number;
  totalMonthly: number;
  totalAnnual: number;
  costPerHour: number;
  lines: CostLineItem[];
}

export interface ScenarioParams {
  name: string;
  /** Number of months to project */
  months: number;
  /** Annual IPC % */
  ipcAnnual: number;
  /** Annual salary growth % above IPC */
  salaryGrowthAboveIPC: number;
  /** SMI monthly for the projection */
  smiMonthly: number;
  /** SS contribution change delta in percentage points */
  ssContributionDelta: number;
  /** Absenteeism rate % */
  absenteeismRate: number;
  /** Annual headcount growth % */
  headcountGrowthRate: number;
  /** Training cost per employee per year */
  trainingCostPerEmployee: number;
  /** PRL cost per employee per year */
  prlCostPerEmployee: number;
  /** Monthly benefits per employee */
  benefitsPerEmployee: number;
}

export interface MonthProjection {
  month: number;
  date: string;
  headcount: number;
  avgGrossSalary: number;
  ssEmployerTotal: number;
  totalLaborCost: number;
  costPerEmployee: number;
  cumulativeCost: number;
  origin: DataOrigin;
}

export interface BudgetAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric: string;
  threshold: number;
  currentValue: number;
}

export interface ScenarioResult {
  scenario: ScenarioParams;
  baselineCost: LaborCostBreakdown;
  projections: MonthProjection[];
  alerts: BudgetAlert[];
  totalProjectedCost: number;
  avgMonthlyCost: number;
  costVariation: number; // % change vs baseline
  assumptions: AssumptionEntry[];
}

export interface AssumptionEntry {
  label: string;
  value: string;
  origin: DataOrigin;
}

export interface EmployeeCostInput {
  grossMonthly: number;
  extraPayments: number; // number of extra payments (typically 2)
  ssGroup: string;
  isTemporary: boolean;
  weeklyHours: number;
  absentDaysYear?: number;
  benefitsMonthly?: number;
}

// ── Constants ──

/**
 * S9.21h — Tasas SS empresa 2026 derivadas de la fuente única (`ssRules2026`).
 * NO duplicar valores. Si cambian las constantes oficiales, este simulador
 * usa automáticamente la versión actualizada.
 */
import { SS_CONTRIBUTION_RATES_2026 } from '@/shared/legal/rules/ssRules2026';
import { SMI_MENSUAL_2026 as SMI_2026_CANONICAL } from '@/shared/legal/rules/smiRules';

const SS_EMPLOYER_RATES_2026 = {
  cc: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.empresa,
  unemployment_indefinite: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.empresa,
  unemployment_temporary: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.empresa,
  fogasa: SS_CONTRIBUTION_RATES_2026.fogasa.empresa,
  fp: SS_CONTRIBUTION_RATES_2026.formacionProfesional.empresa,
  mei: SS_CONTRIBUTION_RATES_2026.mei.empresa,
  atep: SS_CONTRIBUTION_RATES_2026.atepReferencia.empresa,
} as const;

const DEFAULT_SMI_2026 = SMI_2026_CANONICAL;

export const SIMULATOR_DISCLAIMER =
  'Las proyecciones son estimaciones basadas en hipótesis explícitas configurables. ' +
  'No constituyen garantía de ahorro, compromiso presupuestario ni asesoramiento financiero. ' +
  'Los datos marcados como "hipótesis" o "proyección" deben validarse antes de su uso en decisiones vinculantes.';

// ── Helper ──

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Engine Functions ──

/**
 * Calculate SS employer cost for a given gross monthly salary
 */
export function calculateSSEmployer(
  grossMonthly: number,
  isTemporary: boolean = false,
  ssDelta: number = 0,
): { total: number; breakdown: Record<string, number> } {
  const unemploymentRate = isTemporary
    ? SS_EMPLOYER_RATES_2026.unemployment_temporary
    : SS_EMPLOYER_RATES_2026.unemployment_indefinite;

  const rates = {
    cc: SS_EMPLOYER_RATES_2026.cc + ssDelta,
    unemployment: unemploymentRate,
    fogasa: SS_EMPLOYER_RATES_2026.fogasa,
    fp: SS_EMPLOYER_RATES_2026.fp,
    mei: SS_EMPLOYER_RATES_2026.mei,
    atep: SS_EMPLOYER_RATES_2026.atep,
  };

  const breakdown: Record<string, number> = {};
  let total = 0;
  for (const [key, rate] of Object.entries(rates)) {
    const amount = r2(grossMonthly * rate / 100);
    breakdown[key] = amount;
    total += amount;
  }

  return { total: r2(total), breakdown };
}

/**
 * Calculate full labor cost breakdown for one employee
 */
export function calculateEmployeeCost(
  input: EmployeeCostInput,
  params: Partial<ScenarioParams> = {},
): LaborCostBreakdown {
  const extraPayments = input.extraPayments || 2;
  const grossMonthly = input.grossMonthly;
  const grossAnnual = grossMonthly * (12 + extraPayments);

  // SS employer
  const ss = calculateSSEmployer(grossMonthly, input.isTemporary, params.ssContributionDelta || 0);
  const ssAnnual = ss.total * 12; // SS on 12 months (extras may or may not cotizar separately)

  // Training
  const training = (params.trainingCostPerEmployee ?? 300) / 12;
  // PRL
  const prl = (params.prlCostPerEmployee ?? 180) / 12;
  // Benefits
  const benefits = input.benefitsMonthly ?? params.benefitsPerEmployee ?? 0;

  // Absenteeism cost (% of gross as replacement cost estimate)
  const absenteeismRate = params.absenteeismRate ?? 4.0;
  const absenteeismCost = r2(grossMonthly * absenteeismRate / 100);

  const totalMonthly = r2(grossMonthly + ss.total + training + prl + benefits + absenteeismCost);
  const totalAnnual = r2(grossAnnual + ssAnnual + (training + prl + benefits + absenteeismCost) * 12);

  // Cost per hour
  const annualHours = (input.weeklyHours || 40) * 52 - ((params.absenteeismRate || 4) / 100 * (input.weeklyHours || 40) * 52);
  const costPerHour = annualHours > 0 ? r2(totalAnnual / annualHours) : 0;

  const lines: CostLineItem[] = [
    { code: 'GROSS', label: 'Salario bruto', monthlyAmount: grossMonthly, annualAmount: grossAnnual, percentOfTotal: 0, origin: 'historical' },
    { code: 'SS_EMP', label: 'SS empresa', monthlyAmount: ss.total, annualAmount: ssAnnual, percentOfTotal: 0, origin: 'historical', notes: `CC ${SS_EMPLOYER_RATES_2026.cc}%` },
    { code: 'TRAINING', label: 'Formación', monthlyAmount: r2(training), annualAmount: r2(training * 12), percentOfTotal: 0, origin: 'hypothesis', notes: 'Estimación bonificada' },
    { code: 'PRL', label: 'PRL', monthlyAmount: r2(prl), annualAmount: r2(prl * 12), percentOfTotal: 0, origin: 'hypothesis' },
    { code: 'BENEFITS', label: 'Beneficios sociales', monthlyAmount: benefits, annualAmount: r2(benefits * 12), percentOfTotal: 0, origin: benefits > 0 ? 'historical' : 'hypothesis' },
    { code: 'ABSENT', label: 'Coste absentismo', monthlyAmount: absenteeismCost, annualAmount: r2(absenteeismCost * 12), percentOfTotal: 0, origin: 'hypothesis', notes: `Tasa ${absenteeismRate}%` },
  ];

  // Calculate percentages
  lines.forEach(l => { l.percentOfTotal = totalMonthly > 0 ? r2(l.monthlyAmount / totalMonthly * 100) : 0; });

  return {
    grossSalary: grossMonthly,
    ssEmployer: ss.total,
    training: r2(training),
    prl: r2(prl),
    benefits,
    absenteeismCost,
    otherCosts: 0,
    totalMonthly,
    totalAnnual,
    costPerHour,
    lines,
  };
}

/**
 * Default scenario params
 */
export function defaultScenario(name: string = 'Base', months: number = 12): ScenarioParams {
  return {
    name,
    months,
    ipcAnnual: 2.5,
    salaryGrowthAboveIPC: 0.5,
    smiMonthly: DEFAULT_SMI_2026,
    ssContributionDelta: 0,
    absenteeismRate: 4.0,
    headcountGrowthRate: 0,
    trainingCostPerEmployee: 300,
    prlCostPerEmployee: 180,
    benefitsPerEmployee: 0,
  };
}

/**
 * Project costs over N months
 */
export function projectScenario(
  employees: EmployeeCostInput[],
  scenario: ScenarioParams,
): ScenarioResult {
  if (employees.length === 0) {
    return {
      scenario,
      baselineCost: {
        grossSalary: 0, ssEmployer: 0, training: 0, prl: 0, benefits: 0,
        absenteeismCost: 0, otherCosts: 0, totalMonthly: 0, totalAnnual: 0,
        costPerHour: 0, lines: [],
      },
      projections: [],
      alerts: [],
      totalProjectedCost: 0,
      avgMonthlyCost: 0,
      costVariation: 0,
      assumptions: [],
    };
  }

  // Calculate baseline (month 0)
  const baseCosts = employees.map(e => calculateEmployeeCost(e, scenario));
  const baselineTotal = baseCosts.reduce((s, c) => s + c.totalMonthly, 0);

  const baselineCost: LaborCostBreakdown = {
    grossSalary: r2(baseCosts.reduce((s, c) => s + c.grossSalary, 0)),
    ssEmployer: r2(baseCosts.reduce((s, c) => s + c.ssEmployer, 0)),
    training: r2(baseCosts.reduce((s, c) => s + c.training, 0)),
    prl: r2(baseCosts.reduce((s, c) => s + c.prl, 0)),
    benefits: r2(baseCosts.reduce((s, c) => s + c.benefits, 0)),
    absenteeismCost: r2(baseCosts.reduce((s, c) => s + c.absenteeismCost, 0)),
    otherCosts: 0,
    totalMonthly: r2(baselineTotal),
    totalAnnual: r2(baselineTotal * 12),
    costPerHour: baseCosts.length > 0 ? r2(baseCosts.reduce((s, c) => s + c.costPerHour, 0) / baseCosts.length) : 0,
    lines: baseCosts[0]?.lines || [],
  };

  // Monthly growth factor
  const monthlyGrowthRate = (scenario.ipcAnnual + scenario.salaryGrowthAboveIPC) / 100 / 12;
  const monthlyHeadcountGrowth = scenario.headcountGrowthRate / 100 / 12;

  const projections: MonthProjection[] = [];
  let cumulative = 0;
  const now = new Date();

  for (let m = 1; m <= scenario.months; m++) {
    const growthFactor = 1 + monthlyGrowthRate * m;
    const headcount = Math.round(employees.length * (1 + monthlyHeadcountGrowth * m));
    const avgGross = r2((baselineCost.grossSalary / employees.length) * growthFactor);
    const ssTotal = r2((baselineCost.ssEmployer / employees.length) * growthFactor * headcount);
    const totalCost = r2(baselineTotal * growthFactor * (headcount / employees.length));
    cumulative = r2(cumulative + totalCost);

    const projDate = new Date(now);
    projDate.setMonth(projDate.getMonth() + m);

    projections.push({
      month: m,
      date: projDate.toISOString().slice(0, 7),
      headcount,
      avgGrossSalary: avgGross,
      ssEmployerTotal: ssTotal,
      totalLaborCost: totalCost,
      costPerEmployee: headcount > 0 ? r2(totalCost / headcount) : 0,
      cumulativeCost: cumulative,
      origin: 'projection',
    });
  }

  const totalProjectedCost = cumulative;
  const avgMonthlyCost = scenario.months > 0 ? r2(totalProjectedCost / scenario.months) : 0;
  const costVariation = baselineTotal > 0 ? r2(((avgMonthlyCost - baselineTotal) / baselineTotal) * 100) : 0;

  // Generate alerts
  const alerts = generateAlerts(baselineCost, projections, scenario);

  // Assumptions
  const assumptions: AssumptionEntry[] = [
    { label: 'IPC anual previsto', value: `${scenario.ipcAnnual}%`, origin: 'hypothesis' },
    { label: 'Crecimiento salarial s/IPC', value: `${scenario.salaryGrowthAboveIPC}%`, origin: 'hypothesis' },
    { label: 'SMI mensual', value: `${scenario.smiMonthly}€`, origin: 'hypothesis' },
    { label: 'Variación cotización SS', value: `${scenario.ssContributionDelta >= 0 ? '+' : ''}${scenario.ssContributionDelta} pp`, origin: 'hypothesis' },
    { label: 'Tasa de absentismo', value: `${scenario.absenteeismRate}%`, origin: 'hypothesis' },
    { label: 'Crecimiento plantilla', value: `${scenario.headcountGrowthRate}%/año`, origin: 'hypothesis' },
    { label: 'Formación/empleado/año', value: `${scenario.trainingCostPerEmployee}€`, origin: 'hypothesis' },
    { label: 'PRL/empleado/año', value: `${scenario.prlCostPerEmployee}€`, origin: 'hypothesis' },
    { label: 'Plantilla actual', value: `${employees.length} empleados`, origin: 'historical' },
    { label: 'Coste base mensual', value: `${baselineTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, origin: 'historical' },
  ];

  return {
    scenario,
    baselineCost,
    projections,
    alerts,
    totalProjectedCost,
    avgMonthlyCost,
    costVariation,
    assumptions,
  };
}

/**
 * Generate budget alerts based on projections
 */
export function generateAlerts(
  baseline: LaborCostBreakdown,
  projections: MonthProjection[],
  scenario: ScenarioParams,
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  let idx = 0;

  // SS cost proportion alert
  if (baseline.totalMonthly > 0) {
    const ssPct = (baseline.ssEmployer / baseline.totalMonthly) * 100;
    if (ssPct > 35) {
      alerts.push({
        id: `alert-${idx++}`,
        severity: 'warning',
        title: 'Proporción SS elevada',
        description: `El coste de SS empresa representa el ${ssPct.toFixed(1)}% del coste total.`,
        metric: 'ss_proportion',
        threshold: 35,
        currentValue: r2(ssPct),
      });
    }
  }

  // Cost growth exceeds 10% in projection
  if (projections.length > 0) {
    const lastMonth = projections[projections.length - 1];
    const growthPct = baseline.totalMonthly > 0
      ? ((lastMonth.totalLaborCost - baseline.totalMonthly) / baseline.totalMonthly) * 100
      : 0;
    if (growthPct > 10) {
      alerts.push({
        id: `alert-${idx++}`,
        severity: 'critical',
        title: 'Desviación presupuestaria significativa',
        description: `Coste laboral proyectado crece un ${growthPct.toFixed(1)}% en ${scenario.months} meses.`,
        metric: 'cost_growth',
        threshold: 10,
        currentValue: r2(growthPct),
      });
    } else if (growthPct > 5) {
      alerts.push({
        id: `alert-${idx++}`,
        severity: 'warning',
        title: 'Crecimiento de coste moderado',
        description: `Coste laboral proyectado crece un ${growthPct.toFixed(1)}% en ${scenario.months} meses.`,
        metric: 'cost_growth',
        threshold: 5,
        currentValue: r2(growthPct),
      });
    }
  }

  // High absenteeism
  if (scenario.absenteeismRate > 6) {
    alerts.push({
      id: `alert-${idx++}`,
      severity: 'warning',
      title: 'Absentismo elevado',
      description: `Tasa de absentismo del ${scenario.absenteeismRate}% genera coste de sustitución significativo.`,
      metric: 'absenteeism',
      threshold: 6,
      currentValue: scenario.absenteeismRate,
    });
  }

  // Salary below SMI check
  if (baseline.grossSalary > 0 && baseline.lines.length > 0) {
    const avgGross = baseline.grossSalary;
    if (avgGross < scenario.smiMonthly) {
      alerts.push({
        id: `alert-${idx++}`,
        severity: 'critical',
        title: 'Salario medio bajo SMI',
        description: `El salario medio (${avgGross.toFixed(0)}€) está por debajo del SMI (${scenario.smiMonthly}€).`,
        metric: 'smi_compliance',
        threshold: scenario.smiMonthly,
        currentValue: avgGross,
      });
    }
  }

  return alerts;
}

/**
 * Compare two scenarios
 */
export function compareScenarios(a: ScenarioResult, b: ScenarioResult): {
  label: string;
  scenarioA: number;
  scenarioB: number;
  difference: number;
  percentDiff: number;
}[] {
  return [
    {
      label: 'Coste mensual base',
      scenarioA: a.baselineCost.totalMonthly,
      scenarioB: b.baselineCost.totalMonthly,
      difference: r2(b.baselineCost.totalMonthly - a.baselineCost.totalMonthly),
      percentDiff: a.baselineCost.totalMonthly > 0 ? r2(((b.baselineCost.totalMonthly - a.baselineCost.totalMonthly) / a.baselineCost.totalMonthly) * 100) : 0,
    },
    {
      label: 'Coste total proyectado',
      scenarioA: a.totalProjectedCost,
      scenarioB: b.totalProjectedCost,
      difference: r2(b.totalProjectedCost - a.totalProjectedCost),
      percentDiff: a.totalProjectedCost > 0 ? r2(((b.totalProjectedCost - a.totalProjectedCost) / a.totalProjectedCost) * 100) : 0,
    },
    {
      label: 'Coste medio mensual',
      scenarioA: a.avgMonthlyCost,
      scenarioB: b.avgMonthlyCost,
      difference: r2(b.avgMonthlyCost - a.avgMonthlyCost),
      percentDiff: a.avgMonthlyCost > 0 ? r2(((b.avgMonthlyCost - a.avgMonthlyCost) / a.avgMonthlyCost) * 100) : 0,
    },
  ];
}
