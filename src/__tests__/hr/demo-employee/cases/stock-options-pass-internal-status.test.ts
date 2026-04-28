/**
 * Fase C3 · Estado final Stock Options
 * ────────────────────────────────────
 * Test paraguas que evalúa las 5 condiciones simultáneas:
 *   1. modelo190ReviewOrKeyResolved
 *   2. costReportStockSeparated
 *   3. irpfRealInvoked
 *   4. sensitiveCasesHumanReview (startup/RSU/phantom/expat)
 *   5. noOfficialSubmission
 *
 * Si todas true → finalStatus = 'PASS_INTERNAL', humanReview = true.
 * Si falta alguna → 'PARTIAL'.
 * Nunca PASS limpio. Nunca official_ready/submitted/accepted.
 */
import { describe, it, expect } from 'vitest';

import {
  aggregatePerceptorsForModelo190,
  type Modelo190PerceptorInput,
} from '@/engines/erp/hr/modelo190PipelineEngine';
import { buildLaborCostReport } from '@/engines/erp/hr/laborCostReportEngine';
import { computeIRPF, buildIRPFInputFromLaborData } from '@/engines/erp/hr/irpfEngine';
import {
  simulateExercise, computePayrollImpact,
  classifyGrant,
  type EquityPlan, type EquityGrant,
} from '@/engines/erp/hr/stockOptionsEngine';
import { getESConceptByCode } from '@/engines/erp/hr/payrollConceptCatalog';
import {
  computeSSContributions, deriveFiscalClass,
  type SSPayrollLineInput, type SSEmployeeContext,
} from '@/engines/erp/hr/ssContributionEngine';
import {
  buildPayslip,
  type PayslipLineInput, type PayslipHeader,
} from '@/engines/erp/hr/payslipEngine';
import type { IRPFCalculationResult } from '@/engines/erp/hr/irpfEngine';

import {
  stockOptionsDemo, contractDemo, employeeDemo,
  companyDemo, payrollPeriodDemo,
} from '../fixtures/carlos-ruiz';

function lineFromCatalog(code: string, amount: number, sortOrder: number): PayslipLineInput {
  const def = getESConceptByCode(code);
  return {
    conceptCode: code, conceptName: def?.name ?? code,
    lineType: (def?.concept_type ?? 'earning') as PayslipLineInput['lineType'],
    amount, units: null, unitPrice: null,
    isSalary: def?.is_salary ?? true,
    isSSContributable: def?.is_ss_contributable ?? true,
    isTaxable: def?.is_taxable ?? true,
    sortOrder,
  };
}

function syntheticIRPF(base: number, tipo = 15): IRPFCalculationResult {
  const r = Math.round(base * (tipo / 100) * 100) / 100;
  return {
    rendimientosBrutos: base, gastosDeducibles: 0, rendimientoNeto: base,
    reduccionRendimientos: 0, baseImponibleGeneral: base,
    minimoPersonal: 0, minimoDescendientes: 0, minimoAscendientes: 0,
    minimoDiscapacidad: 0, minimoTotal: 0, baseGravable: base,
    cuotaIntegra: r, cuotaMinimos: 0, cuotaResultante: r,
    tipoEfectivo: tipo, retencionMensual: r, retencionAnual: r * 12,
    regularization: null, irregularIncome: null, regionalDeductions: null,
    familyChangeImpact: null, tramosAplicados: [],
    dataQuality: {
      tramosFromDB: false, familyDataAvailable: false,
      ssContributionsReal: true, comunidadEspecifica: false,
      regularizationApplied: false, irregularIncomeProcessed: false,
      regionalDeductionsProcessed: false, familyChangesProcessed: false,
    },
    calculations: [], warnings: [], limitations: [],
    legalReferences: ['LIRPF Art. 99-101'],
  };
}

interface PassInternalEvaluation {
  modelo190ReviewOrKeyResolved: boolean;
  costReportStockSeparated: boolean;
  irpfRealInvoked: boolean;
  sensitiveCasesHumanReview: boolean;
  noOfficialSubmission: boolean;
  finalStatus: 'PASS_INTERNAL' | 'PARTIAL';
  humanReview: true;
  missingCapabilities: string[];
}

function evaluatePassInternal(): PassInternalEvaluation {
  // ── 1. Modelo 190 ─────────────────────────────────────
  const monthlyData = Array.from({ length: 12 }).map((_, i) => ({
    month: i + 1, grossSalary: 3000, baseIRPF: 3000,
    retencionIRPF: 450, tipoIRPF: 15, irpfAvailable: true,
    payrollClosed: true, perceptionsInKind: 0, paymentsOnAccount: 0,
  }));
  monthlyData[3].grossSalary += stockOptionsDemo.taxableBenefit;
  monthlyData[3].baseIRPF += stockOptionsDemo.taxableBenefit;

  const perceptorInput: Modelo190PerceptorInput = {
    employeeId: employeeDemo.id,
    employeeName: employeeDemo.fullName,
    nif: employeeDemo.nif,
    monthlyData,
    conceptBreakdown: [
      { conceptCode: 'ES_SAL_BASE', amount: 36000 },
      { conceptCode: 'ES_STOCK_OPTIONS', amount: stockOptionsDemo.taxableBenefit },
    ],
  };
  const m190 = aggregatePerceptorsForModelo190([perceptorInput]);
  const m190Line = m190.perceptorLines[0];
  // Aceptamos como "resuelto" si el motor marca review humano O si trae clave dedicada.
  const modelo190ReviewOrKeyResolved = !!(
    m190Line.requires_human_review ||
    (m190Line.fiscal_classification_status === 'resolved' && !m190Line.clave_is_fallback)
  );

  // ── 2. Cost report ────────────────────────────────────
  const plan: EquityPlan = {
    id: 'plan-eval', companyId: companyDemo.id, planName: 'Plan Eval',
    planType: 'standard_stock_options', totalPool: 10000, currency: 'EUR',
    approvalDate: '2024-01-01', isStartup: false, cliffMonths: 12,
    vestingMonths: 24, vestingSchedule: 'cliff_then_linear',
  };
  const grant: EquityGrant = {
    id: stockOptionsDemo.grantId, planId: plan.id, employeeId: employeeDemo.id,
    grantDate: stockOptionsDemo.grantDate, totalShares: stockOptionsDemo.shares,
    strikePrice: stockOptionsDemo.strikePrice, vestedShares: stockOptionsDemo.shares,
    exercisedShares: 0, status: 'fully_vested',
    cliffDate: '2025-01-15', finalVestingDate: stockOptionsDemo.vestingDate,
  };
  const sim = simulateExercise(plan, grant, stockOptionsDemo.fairMarketValue);
  const soImpact = computePayrollImpact(sim);
  const salarioBaseMensual = contractDemo.baseSalaryAnnual / contractDemo.paymentsPerYear;
  const lines: PayslipLineInput[] = [
    lineFromCatalog('ES_SAL_BASE', Math.round(salarioBaseMensual * 100) / 100, 10),
    lineFromCatalog('ES_STOCK_OPTIONS', soImpact.amount, 80),
  ];
  const ssLines: SSPayrollLineInput[] = lines.map((l) => ({
    conceptCode: l.conceptCode, amount: l.amount, isSalary: l.isSalary,
    isSSContributable: l.isSSContributable, isProrrateado: false, isOvertime: false,
    fiscalClass: deriveFiscalClass(l.conceptCode, l.isTaxable, l.isSalary),
  }));
  const ssCtx: SSEmployeeContext = {
    grupoCotizacion: employeeDemo.ssContributionGroup, isTemporaryContract: false,
    coeficienteParcialidad: 1.0, pagasExtrasAnuales: 2, pagasExtrasProrrateadas: false,
    salarioBaseAnual: contractDemo.baseSalaryAnnual, diasRealesPeriodo: 30,
  };
  const ssResult = computeSSContributions(ssLines, ssCtx, null);
  const irpf = syntheticIRPF(ssResult.baseIRPFCorregida || ssResult.baseCCMensual, 15);
  const header: PayslipHeader = {
    empresaNombre: companyDemo.name, empresaCIF: companyDemo.cif,
    empresaDomicilio: 'DEMO', empresaCCC: companyDemo.ccc,
    trabajadorNombre: employeeDemo.fullName, trabajadorDNI: employeeDemo.nif,
    trabajadorNAF: employeeDemo.naf, trabajadorCategoria: employeeDemo.professionalGroup,
    trabajadorGrupoCotizacion: employeeDemo.ssContributionGroup,
    trabajadorAntiguedad: employeeDemo.hireDate,
    periodoNombre: 'Abril 2026',
    periodoDesde: payrollPeriodDemo.startDate, periodoHasta: payrollPeriodDemo.endDate,
    diasTotales: 30,
  };
  const payslip = buildPayslip({
    header, lines, ssResult, irpfResult: irpf,
    runId: null, periodId: payrollPeriodDemo.id,
  });
  const report = buildLaborCostReport({
    payslip, ssContributions: ssResult,
    stockOptionsImpact: { amount: soImpact.amount, requiresReview: true },
  });
  const costReportStockSeparated =
    report.stockOptionsCost > 0 &&
    !!report.breakdownByConcept.find((b) => b.bucket === 'stock');

  // ── 3. IRPF real ──────────────────────────────────────
  const irpfReal = computeIRPF(
    buildIRPFInputFromLaborData(
      {
        situacion_familiar_irpf: 1, hijos_menores_25: 0, hijos_menores_3: 0,
        discapacidad_hijos: false, ascendientes_cargo: 0, pension_compensatoria: 0,
        anualidad_alimentos: 0, prolongacion_laboral: false,
        contrato_inferior_anual: false, reduccion_movilidad_geografica: false,
        comunidad_autonoma: 'Madrid',
      },
      contractDemo.baseSalaryAnnual + stockOptionsDemo.taxableBenefit,
      Math.round(contractDemo.baseSalaryAnnual * 0.064 * 100) / 100,
    ),
    null, null,
  );
  const irpfRealInvoked =
    irpfReal.rendimientosBrutos > 0 &&
    typeof irpfReal.tipoEfectivo === 'number' &&
    Array.isArray(irpfReal.legalReferences);

  // ── 4. Casos sensibles ────────────────────────────────
  const startupPlan: EquityPlan = { ...plan, isStartup: true, planType: 'standard_stock_options' };
  const startupClass = classifyGrant(startupPlan, grant);
  const phantomPlan: EquityPlan = { ...plan, planType: 'phantom_shares' };
  const phantomClass = classifyGrant(phantomPlan, grant);
  const rsuPlan: EquityPlan = { ...plan, planType: 'rsu' };
  const rsuClass = classifyGrant(rsuPlan, grant);
  // Todos los sensibles deben caer en niveles que NO son producción limpia.
  const sensitiveCasesHumanReview =
    startupClass.supportLevel !== 'supported_production' &&
    phantomClass.supportLevel !== 'supported_production' &&
    rsuClass.supportLevel !== 'supported_production';

  // ── 5. Sin envíos oficiales ──────────────────────────
  const noOfficialSubmission =
    (m190Line as any).official_ready === undefined &&
    (m190Line as any).submitted === undefined &&
    (m190Line as any).accepted === undefined &&
    (report as any).official_ready === undefined &&
    (report as any).submitted === undefined &&
    (report as any).accepted === undefined &&
    (irpfReal as any).official_ready === undefined &&
    report.isPreparatory === true;

  const checks = {
    modelo190ReviewOrKeyResolved,
    costReportStockSeparated,
    irpfRealInvoked,
    sensitiveCasesHumanReview,
    noOfficialSubmission,
  };
  const missingCapabilities = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const allOk = missingCapabilities.length === 0;
  return {
    ...checks,
    finalStatus: allOk ? 'PASS_INTERNAL' : 'PARTIAL',
    humanReview: true,
    missingCapabilities,
  };
}

describe('HR · DEMO · Stock Options · Estado PASS_INTERNAL (Fase C3)', () => {
  const ev = evaluatePassInternal();

  it('5 condiciones evaluadas con motores reales', () => {
    expect(typeof ev.modelo190ReviewOrKeyResolved).toBe('boolean');
    expect(typeof ev.costReportStockSeparated).toBe('boolean');
    expect(typeof ev.irpfRealInvoked).toBe('boolean');
    expect(typeof ev.sensitiveCasesHumanReview).toBe('boolean');
    expect(typeof ev.noOfficialSubmission).toBe('boolean');
  });

  it('estado final es PASS_INTERNAL si las 5 condiciones se cumplen', () => {
    expect(ev.modelo190ReviewOrKeyResolved).toBe(true);
    expect(ev.costReportStockSeparated).toBe(true);
    expect(ev.irpfRealInvoked).toBe(true);
    expect(ev.sensitiveCasesHumanReview).toBe(true);
    expect(ev.noOfficialSubmission).toBe(true);
    expect(ev.finalStatus).toBe('PASS_INTERNAL');
    expect(ev.missingCapabilities).toEqual([]);
  });

  it('humanReview SIEMPRE true: PASS_INTERNAL nunca es PASS limpio', () => {
    expect(ev.humanReview).toBe(true);
    // No existe finalStatus 'PASS' a secas — solo PASS_INTERNAL o PARTIAL.
    expect(['PASS_INTERNAL', 'PARTIAL']).toContain(ev.finalStatus);
  });

  it('casos sensibles startup/RSU/phantom NUNCA son supported_production', () => {
    expect(ev.sensitiveCasesHumanReview).toBe(true);
  });
});