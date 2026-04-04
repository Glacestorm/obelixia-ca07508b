/**
 * Payroll Calculation Engine — Motor determinista de nómina
 * 
 * Capa 1: Dominio puro — sin dependencias de UI, Supabase, ni React.
 * Testeable con input/output puro. Reutilizable desde edge functions.
 * 
 * Flujo: Conceptos empleado → Catálogo empresa → Catálogo global
 * Resolución por prioridad descendente.
 */

import { calculateSSContributions, type SSInput, type SSResult } from './rules/ss-contributions';
import { calculateIRPFWithholding, type IRPFInput, type IRPFResult } from './rules/irpf-withholding';
import { validatePayslip, type ValidationResult } from './validators/payslip-validator';

// ============================================
// TYPES
// ============================================

export type ConceptNature = 'salarial' | 'extrasalarial';
export type ConceptType = 'earning' | 'deduction';
export type CalculationType = 'fixed' | 'percentage' | 'formula' | 'days';

export interface PayrollConcept {
  code: string;
  name: string;
  nature: ConceptNature;
  conceptType: ConceptType;
  calculationType: CalculationType;
  value: number;
  /** For percentage: base reference ('base_salary' | 'gross' | 'custom') */
  baseReference?: string;
  /** For formula: JS-safe expression */
  formula?: string;
  /** Resolution priority (lower = first) */
  priority: number;
  ssComputable: boolean;
  irpfComputable: boolean;
  embargable: boolean;
}

export interface PayrollInput {
  /** Employee identifier */
  employeeId: string;
  /** Period */
  periodMonth: number;
  periodYear: number;
  /** Base salary (monthly) */
  baseSalary: number;
  /** Working days in the period */
  workingDays: number;
  /** Worked days (may differ due to absences) */
  workedDays: number;
  /** SS professional group (1-11) */
  ssGroup: number;
  /** Contract type code */
  contractType: string;
  /** Part-time coefficient (1.0 = full time) */
  partTimeCoefficient: number;
  /** Custom concepts (employee-level overrides) */
  customConcepts: PayrollConcept[];
  /** Company-level concepts */
  companyConcepts: PayrollConcept[];
  /** Is this an extra pay period? */
  isExtraPayPeriod: boolean;
  /** Number of extra pays per year */
  extraPaysPerYear: number;
  /** IT/Sick leave days in period */
  itDays: number;
  /** Garnishment amount pre-calculated */
  garnishmentAmount: number;
  /** IRPF rate (pre-calculated or override) */
  irpfRate?: number;
  /** Accrued data for IRPF regularization */
  accruedData?: {
    totalGrossYTD: number;
    totalSSEmployeeYTD: number;
    totalIRPFWithheldYTD: number;
    monthsWorked: number;
  };
}

export interface PayslipLine {
  code: string;
  name: string;
  type: 'earning' | 'deduction' | 'ss_employer' | 'info';
  amount: number;
  nature: ConceptNature;
  ssComputable: boolean;
  irpfComputable: boolean;
}

export interface PayrollResult {
  employeeId: string;
  periodMonth: number;
  periodYear: number;
  /** Breakdown lines */
  lines: PayslipLine[];
  /** Totals */
  totalEarnings: number;
  totalDeductions: number;
  grossSalary: number;
  /** SS bases */
  ssBaseCC: number;
  ssBaseCP: number;
  /** SS contributions */
  ss: SSResult;
  /** IRPF */
  irpf: IRPFResult;
  /** Net salary */
  netSalary: number;
  /** Employer cost */
  employerCost: number;
  /** Validation */
  validation: ValidationResult;
  /** Metadata */
  calculatedAt: string;
}

// ============================================
// ENGINE
// ============================================

/**
 * Resolves concepts by priority: employee custom → company → global.
 * Lower priority number = higher precedence.
 * Deduplicates by code (first wins).
 */
export function resolveConcepts(
  customConcepts: PayrollConcept[],
  companyConcepts: PayrollConcept[],
): PayrollConcept[] {
  const all = [...customConcepts, ...companyConcepts];
  all.sort((a, b) => a.priority - b.priority);

  const seen = new Set<string>();
  const resolved: PayrollConcept[] = [];

  for (const c of all) {
    if (!seen.has(c.code)) {
      seen.add(c.code);
      resolved.push(c);
    }
  }

  return resolved;
}

/**
 * Calculates the amount for a single concept.
 */
export function calculateConceptAmount(
  concept: PayrollConcept,
  baseSalary: number,
  currentGross: number,
  workedDays: number,
  workingDays: number,
  partTimeCoefficient: number,
): number {
  let amount = 0;

  switch (concept.calculationType) {
    case 'fixed':
      amount = concept.value * partTimeCoefficient;
      break;
    case 'percentage': {
      const base = concept.baseReference === 'gross' ? currentGross : baseSalary;
      amount = (base * concept.value) / 100;
      break;
    }
    case 'days':
      amount = (concept.value / workingDays) * workedDays;
      break;
    case 'formula':
      // Formula evaluation is intentionally simple and sandboxed
      // In production, use a proper expression parser
      amount = concept.value;
      break;
  }

  return Math.round(amount * 100) / 100;
}

/**
 * Main payroll calculation function.
 * Pure, deterministic, no side effects.
 */
export function calculatePayroll(input: PayrollInput): PayrollResult {
  const {
    employeeId, periodMonth, periodYear, baseSalary,
    workingDays, workedDays, ssGroup, contractType,
    partTimeCoefficient, customConcepts, companyConcepts,
    isExtraPayPeriod, extraPaysPerYear, itDays,
    garnishmentAmount, irpfRate, accruedData,
  } = input;

  // 1. Resolve concepts
  const concepts = resolveConcepts(customConcepts, companyConcepts);
  const lines: PayslipLine[] = [];

  // 2. Base salary line (prorated by worked days)
  const baseSalaryAmount = Math.round(
    (baseSalary * partTimeCoefficient * workedDays / workingDays) * 100
  ) / 100;

  lines.push({
    code: 'SAL_BASE',
    name: 'Salario base',
    type: 'earning',
    amount: baseSalaryAmount,
    nature: 'salarial',
    ssComputable: true,
    irpfComputable: true,
  });

  // 3. Calculate concept lines
  let runningGross = baseSalaryAmount;

  for (const concept of concepts) {
    const amount = calculateConceptAmount(
      concept, baseSalary, runningGross,
      workedDays, workingDays, partTimeCoefficient,
    );

    if (amount === 0) continue;

    lines.push({
      code: concept.code,
      name: concept.name,
      type: concept.conceptType,
      amount: Math.abs(amount),
      nature: concept.nature,
      ssComputable: concept.ssComputable,
      irpfComputable: concept.irpfComputable,
    });

    if (concept.conceptType === 'earning') {
      runningGross += amount;
    }
  }

  // 4. Calculate totals
  const totalEarnings = lines
    .filter(l => l.type === 'earning')
    .reduce((sum, l) => sum + l.amount, 0);

  const grossSalary = Math.round(totalEarnings * 100) / 100;

  // 5. SS bases
  const ssComputableEarnings = lines
    .filter(l => l.type === 'earning' && l.ssComputable)
    .reduce((sum, l) => sum + l.amount, 0);

  // Base CC: monthly salary + prorated extra pays
  const prorataExtra = isExtraPayPeriod
    ? 0
    : Math.round((baseSalary * partTimeCoefficient / (extraPaysPerYear || 2)) * 100) / 100;

  const ssBaseCC = Math.round(ssComputableEarnings * 100) / 100;
  const ssBaseCP = Math.round((ssComputableEarnings + prorataExtra) * 100) / 100;

  // 6. SS contributions
  const ssInput: SSInput = {
    baseCC: ssBaseCC,
    baseCP: ssBaseCP,
    ssGroup,
    contractType,
    partTimeCoefficient,
    isTemporary: !contractType.startsWith('1'),
  };
  const ss = calculateSSContributions(ssInput);

  // 7. IRPF
  const irpfInput: IRPFInput = {
    grossSalary,
    ssEmployeeContribution: ss.employeeTotal,
    irpfRate: irpfRate ?? 15,
    accruedData,
  };
  const irpf = calculateIRPFWithholding(irpfInput);

  // 8. Add deduction lines
  lines.push({
    code: 'SS_EMP',
    name: 'Seg. Social (trabajador)',
    type: 'deduction',
    amount: ss.employeeTotal,
    nature: 'salarial',
    ssComputable: false,
    irpfComputable: false,
  });

  lines.push({
    code: 'IRPF',
    name: `IRPF (${irpf.effectiveRate.toFixed(2)}%)`,
    type: 'deduction',
    amount: irpf.withholding,
    nature: 'salarial',
    ssComputable: false,
    irpfComputable: false,
  });

  if (garnishmentAmount > 0) {
    lines.push({
      code: 'EMBARGO',
      name: 'Embargo judicial',
      type: 'deduction',
      amount: garnishmentAmount,
      nature: 'salarial',
      ssComputable: false,
      irpfComputable: false,
    });
  }

  // 9. Total deductions & net
  const totalDeductions = lines
    .filter(l => l.type === 'deduction')
    .reduce((sum, l) => sum + l.amount, 0);

  const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

  // 10. Employer cost
  const employerCost = Math.round((grossSalary + ss.employerTotal) * 100) / 100;

  // 11. Validation
  const validation = validatePayslip({
    grossSalary,
    netSalary,
    totalDeductions,
    ssBaseCC,
    ssBaseCP,
    ssGroup,
    partTimeCoefficient,
    contractType,
    irpfRate: irpf.effectiveRate,
  });

  return {
    employeeId,
    periodMonth,
    periodYear,
    lines,
    totalEarnings,
    totalDeductions,
    grossSalary,
    ssBaseCC,
    ssBaseCP,
    ss,
    irpf,
    netSalary,
    employerCost,
    validation,
    calculatedAt: new Date().toISOString(),
  };
}

// Re-export sub-modules
export type { SSInput, SSResult } from './rules/ss-contributions';
export type { IRPFInput, IRPFResult } from './rules/irpf-withholding';
export type { ValidationResult } from './validators/payslip-validator';
