/**
 * Fase C3 · Stock Options en informe puro de costes
 * ──────────────────────────────────────────────────
 * Verifica que `laborCostReportEngine` real:
 *   - separa `stockOptionsCost` del resto;
 *   - bucket `'stock'` aparece en breakdown;
 *   - costeEmpresa coherente (devengos + ssEmpresa + benefits, tol 0.02);
 *   - emite `reviewFlags` con SO siempre.
 *
 * No mocks. Motores reales. Sin envíos oficiales.
 */
import { describe, it, expect } from 'vitest';

import {
  buildLaborCostReport,
  isCostReportCoherent,
} from '@/engines/erp/hr/laborCostReportEngine';
import {
  simulateExercise,
  computePayrollImpact,
  type EquityPlan,
  type EquityGrant,
} from '@/engines/erp/hr/stockOptionsEngine';
import { getESConceptByCode } from '@/engines/erp/hr/payrollConceptCatalog';
import {
  computeSSContributions,
  deriveFiscalClass,
  type SSPayrollLineInput,
  type SSEmployeeContext,
} from '@/engines/erp/hr/ssContributionEngine';
import {
  buildPayslip,
  type PayslipLineInput,
  type PayslipHeader,
} from '@/engines/erp/hr/payslipEngine';
import type { IRPFCalculationResult } from '@/engines/erp/hr/irpfEngine';

import {
  stockOptionsDemo,
  contractDemo,
  employeeDemo,
  companyDemo,
  payrollPeriodDemo,
} from '../fixtures/carlos-ruiz';

function lineFromCatalog(code: string, amount: number, sortOrder: number): PayslipLineInput {
  const def = getESConceptByCode(code);
  return {
    conceptCode: code,
    conceptName: def?.name ?? code,
    lineType: (def?.concept_type ?? 'earning') as PayslipLineInput['lineType'],
    amount,
    units: null,
    unitPrice: null,
    isSalary: def?.is_salary ?? true,
    isSSContributable: def?.is_ss_contributable ?? true,
    isTaxable: def?.is_taxable ?? true,
    sortOrder,
  };
}

function syntheticIRPF(base: number, tipo = 15): IRPFCalculationResult {
  const r = Math.round(base * (tipo / 100) * 100) / 100;
  return {
    rendimientosBrutos: base,
    gastosDeducibles: 0,
    rendimientoNeto: base,
    reduccionRendimientos: 0,
    baseImponibleGeneral: base,
    minimoPersonal: 0,
    minimoDescendientes: 0,
    minimoAscendientes: 0,
    minimoDiscapacidad: 0,
    minimoTotal: 0,
    baseGravable: base,
    cuotaIntegra: r,
    cuotaMinimos: 0,
    cuotaResultante: r,
    tipoEfectivo: tipo,
    retencionMensual: r,
    retencionAnual: r * 12,
    regularization: null,
    irregularIncome: null,
    regionalDeductions: null,
    familyChangeImpact: null,
    tramosAplicados: [],
    dataQuality: {
      tramosFromDB: false,
      familyDataAvailable: false,
      ssContributionsReal: true,
      comunidadEspecifica: false,
      regularizationApplied: false,
      irregularIncomeProcessed: false,
      regionalDeductionsProcessed: false,
      familyChangesProcessed: false,
    },
    calculations: [],
    warnings: [],
    limitations: ['IRPF de referencia para test C3 cost-report'],
    legalReferences: ['LIRPF Art. 99-101'],
  };
}

describe('HR · DEMO · laborCostReportEngine — Stock Options separadas (Fase C3)', () => {
  // Setup payslip real con SO
  const plan: EquityPlan = {
    id: 'plan-c3', companyId: companyDemo.id, planName: 'Plan C3',
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
    conceptCode: l.conceptCode,
    amount: l.amount,
    isSalary: l.isSalary,
    isSSContributable: l.isSSContributable,
    isProrrateado: false,
    isOvertime: false,
    fiscalClass: deriveFiscalClass(l.conceptCode, l.isTaxable, l.isSalary),
  }));
  const ssCtx: SSEmployeeContext = {
    grupoCotizacion: employeeDemo.ssContributionGroup,
    isTemporaryContract: false,
    coeficienteParcialidad: 1.0,
    pagasExtrasAnuales: 2,
    pagasExtrasProrrateadas: false,
    salarioBaseAnual: contractDemo.baseSalaryAnnual,
    diasRealesPeriodo: 30,
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
    periodoDesde: payrollPeriodDemo.startDate,
    periodoHasta: payrollPeriodDemo.endDate,
    diasTotales: 30,
  };
  const payslip = buildPayslip({
    header, lines, ssResult, irpfResult: irpf,
    runId: null, periodId: payrollPeriodDemo.id,
  });

  it('separa stockOptionsCost y lo coloca en bucket "stock"', () => {
    const report = buildLaborCostReport({
      payslip,
      ssContributions: ssResult,
      stockOptionsImpact: { amount: soImpact.amount, requiresReview: true,
        reviewReason: 'Caso DEMO con review humana exigida.' },
    });
    expect(report.stockOptionsCost).toBeCloseTo(soImpact.amount, 2);
    const stock = report.breakdownByConcept.find((b) => b.code === 'ES_STOCK_OPTIONS');
    expect(stock).toBeDefined();
    expect(stock?.bucket).toBe('stock');
    expect(stock?.amount).toBeCloseTo(soImpact.amount, 2);
  });

  it('coherencia: costeEmpresa = totalDevengos + ssEmpresa + benefits (tol 0.02)', () => {
    const report = buildLaborCostReport({
      payslip, ssContributions: ssResult,
    });
    expect(isCostReportCoherent(report, 0.02)).toBe(true);
    expect(report.ssEmpresa).toBeGreaterThan(0);
    expect(report.costeEmpresa).toBeGreaterThan(report.totalDevengos);
  });

  it('reviewFlags no vacío para variante startup/with-review', () => {
    const report = buildLaborCostReport({
      payslip, ssContributions: ssResult,
      stockOptionsImpact: {
        amount: soImpact.amount,
        requiresReview: true,
        reviewReason: 'Plan startup Ley 28/2022 — exención y valoración requieren revisión.',
      },
    });
    expect(report.reviewFlags.length).toBeGreaterThan(0);
    const soFlag = report.reviewFlags.find((f) => f.code === 'ES_STOCK_OPTIONS');
    expect(soFlag).toBeDefined();
  });

  it('isPreparatory siempre true: el informe NO autoriza presentación oficial', () => {
    const report = buildLaborCostReport({ payslip, ssContributions: ssResult });
    expect(report.isPreparatory).toBe(true);
    // No exposición de official_ready / submitted / accepted.
    expect((report as any).official_ready).toBeUndefined();
    expect((report as any).submitted).toBeUndefined();
    expect((report as any).accepted).toBeUndefined();
  });
});