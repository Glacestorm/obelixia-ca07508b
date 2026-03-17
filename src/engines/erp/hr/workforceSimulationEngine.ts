/**
 * workforceSimulationEngine.ts — V2-RRHH-FASE-8B
 * Pure logic engine for workforce what-if simulations.
 * No React, no Supabase — deterministic calculations only.
 *
 * 8B fixes: removed phantom erp_hr_contracts source, added dataQuality tracking.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SimulationScenarioType =
  | 'salary_increase'
  | 'new_hires'
  | 'working_hours_change'
  | 'absenteeism_change'
  | 'variable_bonus'
  | 'flexible_benefits';

export interface SimulationInput {
  scenarioType: SimulationScenarioType;
  label: string;
  parameters: Record<string, number>;
}

/** Quality indicator for each baseline field */
export type DataQualityLevel = 'real' | 'estimated' | 'unavailable';

export interface WorkforceBaseline {
  headcount: number;
  activeEmployees: number;
  totalGrossMonthlyCost: number;
  totalEmployerMonthlyCost: number;
  avgSalary: number;
  medianSalary: number;
  absenteeismRate: number;
  totalDaysLostMonth: number;
  avgWorkingHoursWeek: number;
  variablePayTotal: number;
  benefitsCostTotal: number;
  turnoverRate: number;
  companyId: string;
  snapshotDate: string;
  /** 8B: tracks data quality per field */
  dataQuality?: Partial<Record<keyof WorkforceBaseline, DataQualityLevel>>;
}

export interface SimulationImpact {
  deltaGrossMonthlyCost: number;
  deltaEmployerMonthlyCost: number;
  deltaAnnualCost: number;
  deltaHeadcount: number;
  newAvgSalary: number;
  newTotalMonthlyCost: number;
  newAnnualCost: number;
  percentChangeGross: number;
  percentChangeEmployer: number;
  operationalRisks: OperationalRisk[];
  assumptions: string[];
  limitations: string[];
  dataSourcesUsed: string[];
}

export interface OperationalRisk {
  label: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface SimulationResult {
  id: string;
  input: SimulationInput;
  baseline: WorkforceBaseline;
  impact: SimulationImpact;
  createdAt: string;
}

// ─── Scenario Catalog ────────────────────────────────────────────────────────

export interface ScenarioCatalogEntry {
  type: SimulationScenarioType;
  label: string;
  description: string;
  icon: string;
  parameters: Array<{
    key: string;
    label: string;
    unit: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
  }>;
}

export const SCENARIO_CATALOG: ScenarioCatalogEntry[] = [
  {
    type: 'salary_increase',
    label: 'Subida Salarial',
    description: 'Simula el impacto de un incremento salarial uniforme sobre el coste empresa.',
    icon: 'TrendingUp',
    parameters: [
      { key: 'percentIncrease', label: 'Incremento (%)', unit: '%', min: 0.5, max: 20, step: 0.5, defaultValue: 3 },
    ],
  },
  {
    type: 'new_hires',
    label: 'Nuevas Contrataciones',
    description: 'Simula el impacto de contratar N empleados al salario medio actual.',
    icon: 'UserPlus',
    parameters: [
      { key: 'numberOfHires', label: 'Nº de contrataciones', unit: 'personas', min: 1, max: 100, step: 1, defaultValue: 5 },
      { key: 'salaryMultiplier', label: 'Salario vs media', unit: 'x', min: 0.5, max: 2, step: 0.1, defaultValue: 1.0 },
    ],
  },
  {
    type: 'working_hours_change',
    label: 'Cambio de Jornada',
    description: 'Simula el impacto de reducir o ampliar la jornada semanal.',
    icon: 'Clock',
    parameters: [
      { key: 'newWeeklyHours', label: 'Horas/semana nuevas', unit: 'h', min: 20, max: 45, step: 0.5, defaultValue: 37.5 },
    ],
  },
  {
    type: 'absenteeism_change',
    label: 'Variación Absentismo / IT',
    description: 'Simula el impacto de un cambio en la tasa de absentismo sobre productividad y coste.',
    icon: 'AlertTriangle',
    parameters: [
      { key: 'newAbsenteeismRate', label: 'Nueva tasa (%)', unit: '%', min: 0, max: 25, step: 0.5, defaultValue: 5 },
    ],
  },
  {
    type: 'variable_bonus',
    label: 'Bonus / Variable',
    description: 'Simula el impacto de distribuir un bonus o paga variable sobre la plantilla.',
    icon: 'Gift',
    parameters: [
      { key: 'totalBonusPool', label: 'Pool total (€)', unit: '€', min: 1000, max: 1000000, step: 1000, defaultValue: 50000 },
      { key: 'coveragePercent', label: 'Cobertura plantilla (%)', unit: '%', min: 10, max: 100, step: 5, defaultValue: 100 },
    ],
  },
  {
    type: 'flexible_benefits',
    label: 'Retribución Flexible / Beneficios',
    description: 'Simula el impacto de implementar o ampliar un paquete de beneficios sociales.',
    icon: 'Heart',
    parameters: [
      { key: 'monthlyPerEmployee', label: 'Coste mensual/empleado (€)', unit: '€', min: 10, max: 500, step: 10, defaultValue: 100 },
      { key: 'adoptionRate', label: 'Tasa de adopción (%)', unit: '%', min: 10, max: 100, step: 5, defaultValue: 60 },
    ],
  },
];

// ─── Employer cost multiplier (Spain approximate) ────────────────────────────
const EMPLOYER_COST_MULTIPLIER = 1.32;

// ─── Simulation Engine ──────────────────────────────────────────────────────

export function runSimulation(
  baseline: WorkforceBaseline,
  input: SimulationInput,
): SimulationResult {
  const impact = computeImpact(baseline, input);

  return {
    id: crypto.randomUUID(),
    input,
    baseline,
    impact,
    createdAt: new Date().toISOString(),
  };
}

function computeImpact(b: WorkforceBaseline, input: SimulationInput): SimulationImpact {
  const p = input.parameters;
  const risks: OperationalRisk[] = [];
  const assumptions: string[] = [];
  const limitations: string[] = [];
  // 8B: only list sources actually queried by the hook
  const dataSources: string[] = ['erp_hr_employees', 'erp_hr_payrolls'];

  let deltaGross = 0;
  let deltaEmployer = 0;
  let deltaHeadcount = 0;
  let newAvgSalary = b.avgSalary;

  // 8B: warn if relevant baseline fields are not real data
  const dq = b.dataQuality || {};

  switch (input.scenarioType) {
    case 'salary_increase': {
      const pct = p.percentIncrease ?? 3;
      deltaGross = b.totalGrossMonthlyCost * (pct / 100);
      deltaEmployer = deltaGross * EMPLOYER_COST_MULTIPLIER;
      newAvgSalary = b.avgSalary * (1 + pct / 100);
      assumptions.push(
        `Incremento lineal del ${pct}% sobre todos los salarios brutos`,
        `Coste empresa estimado con multiplicador ${EMPLOYER_COST_MULTIPLIER}x (SS empresa ~32%)`,
      );
      if (pct > 5) {
        risks.push({ label: 'Impacto fiscal significativo', severity: 'medium', description: 'Incrementos >5% pueden alterar tramos IRPF de empleados' });
      }
      if (pct > 10) {
        risks.push({ label: 'Presión presupuestaria alta', severity: 'high', description: 'Incremento >10% puede requerir revisión de plan financiero anual' });
      }
      break;
    }

    case 'new_hires': {
      const n = p.numberOfHires ?? 5;
      const mult = p.salaryMultiplier ?? 1;
      const hireSalary = b.avgSalary * mult;
      deltaGross = hireSalary * n;
      deltaEmployer = deltaGross * EMPLOYER_COST_MULTIPLIER;
      deltaHeadcount = n;
      newAvgSalary = (b.totalGrossMonthlyCost + deltaGross) / (b.activeEmployees + n);
      assumptions.push(
        `${n} contrataciones a salario bruto €${Math.round(hireSalary).toLocaleString()} (${mult}x de la media actual)`,
        `Coste employer incluye SS empresa estimada`,
      );
      if (n > 10) {
        risks.push({ label: 'Capacidad de onboarding', severity: 'medium', description: 'Más de 10 altas simultáneas pueden saturar el proceso de onboarding' });
      }
      risks.push({ label: 'Coste real primer mes', severity: 'low', description: 'El primer mes puede incluir prorrata y costes adicionales de alta' });
      break;
    }

    case 'working_hours_change': {
      const currentHours = b.avgWorkingHoursWeek || 40;
      const newHours = p.newWeeklyHours ?? 37.5;
      const ratio = newHours / currentHours;
      if (dq.avgWorkingHoursWeek !== 'real') {
        limitations.push(`Horas semanales base (${currentHours}h) es valor por defecto de convenio, no dato real del sistema`);
      }
      if (newHours < currentHours) {
        deltaGross = 0;
        deltaEmployer = 0;
        assumptions.push(
          `Reducción de jornada de ${currentHours}h a ${newHours}h semanales`,
          `Salario mantenido (reducción de jornada sin reducción salarial)`,
          `Productividad estimada se reduce proporcionalmente al ratio ${(ratio * 100).toFixed(0)}%`,
        );
        risks.push({ label: 'Pérdida de productividad', severity: 'medium', description: `Reducción estimada del ${((1 - ratio) * 100).toFixed(0)}% en capacidad productiva` });
      } else {
        const extraHoursCostMonthly = b.totalGrossMonthlyCost * ((newHours - currentHours) / currentHours);
        deltaGross = extraHoursCostMonthly;
        deltaEmployer = deltaGross * EMPLOYER_COST_MULTIPLIER;
        assumptions.push(
          `Ampliación de jornada de ${currentHours}h a ${newHours}h semanales`,
          `Coste proporcional a horas adicionales`,
        );
        risks.push({ label: 'Convenio colectivo', severity: 'high', description: 'Ampliación de jornada puede requerir negociación colectiva' });
      }
      break;
    }

    case 'absenteeism_change': {
      const currentRate = b.absenteeismRate || 4;
      const newRate = p.newAbsenteeismRate ?? 5;
      const deltaRate = newRate - currentRate;
      const productivityImpact = b.totalGrossMonthlyCost * (deltaRate / 100);
      deltaGross = productivityImpact > 0 ? productivityImpact : 0;
      deltaEmployer = deltaGross * EMPLOYER_COST_MULTIPLIER;
      if (dq.absenteeismRate !== 'real') {
        limitations.push('La tasa de absentismo base es una estimación — no hay datos suficientes de ausencias en el sistema');
      }
      assumptions.push(
        `Variación de tasa de absentismo de ${currentRate}% a ${newRate}%`,
        `Impacto productivo estimado: 1% de absentismo ≈ 1% de coste de nómina`,
        `No incluye costes de sustitución ni complementos de IT`,
      );
      limitations.push(
        'El cálculo no distingue entre IT, ausencias justificadas y absentismo voluntario',
        'Los costes de sustitución temporal no están incluidos',
      );
      if (newRate > 8) {
        risks.push({ label: 'Absentismo crítico', severity: 'high', description: 'Tasas >8% pueden indicar problemas estructurales (clima, salud laboral)' });
      }
      dataSources.push('erp_hr_leave_requests');
      break;
    }

    case 'variable_bonus': {
      const pool = p.totalBonusPool ?? 50000;
      const coverage = (p.coveragePercent ?? 100) / 100;
      const eligibleEmployees = Math.round(b.activeEmployees * coverage);
      const avgBonus = eligibleEmployees > 0 ? pool / eligibleEmployees : 0;
      deltaGross = pool;
      deltaEmployer = pool * EMPLOYER_COST_MULTIPLIER;
      deltaHeadcount = 0;
      if (dq.variablePayTotal !== 'real') {
        limitations.push('No se dispone de datos históricos de paga variable — el cálculo asume que es un concepto nuevo');
      }
      assumptions.push(
        `Pool de bonus: €${pool.toLocaleString()} distribuido entre ${eligibleEmployees} empleados (${(coverage * 100).toFixed(0)}% de plantilla)`,
        `Bonus medio por empleado: €${Math.round(avgBonus).toLocaleString()}`,
        `Coste empresa incluye SS sobre la paga variable`,
      );
      if (avgBonus > b.avgSalary * 0.5) {
        risks.push({ label: 'Bonus elevado vs salario', severity: 'medium', description: 'Bonus >50% del salario medio puede tener implicaciones fiscales relevantes' });
      }
      limitations.push('Este cálculo es un impacto puntual (un solo periodo), no recurrente');
      break;
    }

    case 'flexible_benefits': {
      const monthlyCost = p.monthlyPerEmployee ?? 100;
      const adoption = (p.adoptionRate ?? 60) / 100;
      const enrolled = Math.round(b.activeEmployees * adoption);
      deltaGross = monthlyCost * enrolled;
      deltaEmployer = deltaGross; // Benefits typically don't carry extra SS
      if (dq.benefitsCostTotal !== 'real') {
        limitations.push('No se dispone de datos históricos de beneficios sociales — se calcula como coste incremental nuevo');
      }
      assumptions.push(
        `Coste mensual: €${monthlyCost}/empleado × ${enrolled} empleados (tasa adopción ${(adoption * 100).toFixed(0)}%)`,
        `Beneficios sociales: exentos de cotización SS en muchos casos`,
        `Coste empresa = coste directo (sin multiplicador SS)`,
      );
      limitations.push(
        'El ahorro fiscal para el empleado no se calcula aquí',
        'La exención de SS depende del tipo de beneficio y límites legales vigentes',
      );
      break;
    }
  }

  // Common limitations
  limitations.push(
    'Cálculos basados en datos actuales del sistema — no constituyen asesoramiento legal ni fiscal',
    'Los ratios de coste empresa son aproximaciones para España y pueden variar según convenio',
  );

  const newGrossTotal = b.totalGrossMonthlyCost + deltaGross;
  const newEmployerTotal = b.totalEmployerMonthlyCost + deltaEmployer;
  const baseAnnualCost = b.totalEmployerMonthlyCost * 12;
  const newAnnualCost = newEmployerTotal * 12;

  return {
    deltaGrossMonthlyCost: Math.round(deltaGross),
    deltaEmployerMonthlyCost: Math.round(deltaEmployer),
    deltaAnnualCost: Math.round(newAnnualCost - baseAnnualCost),
    deltaHeadcount,
    newAvgSalary: Math.round(newAvgSalary),
    newTotalMonthlyCost: Math.round(newEmployerTotal),
    newAnnualCost: Math.round(newAnnualCost),
    percentChangeGross: b.totalGrossMonthlyCost > 0
      ? Math.round((deltaGross / b.totalGrossMonthlyCost) * 10000) / 100
      : 0,
    percentChangeEmployer: b.totalEmployerMonthlyCost > 0
      ? Math.round((deltaEmployer / b.totalEmployerMonthlyCost) * 10000) / 100
      : 0,
    operationalRisks: risks,
    assumptions,
    limitations,
    dataSourcesUsed: dataSources,
  };
}
