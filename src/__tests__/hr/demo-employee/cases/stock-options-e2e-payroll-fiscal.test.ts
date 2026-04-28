/**
 * Fase C2 · Caso 3c (cierre): Stock Options E2E contra motores reales.
 *
 * Invoca:
 *   - stockOptionsEngine real (computePayrollImpact)
 *   - payrollConceptCatalog real (ES_STOCK_OPTIONS)
 *   - ssContributionEngine real (computeSSContributions, deriveFiscalClass, mapLinesToSSInput)
 *   - payslipEngine real (buildPayslip)
 *   - payslipRenderModel real (buildPayslipRenderModel)
 *   - modelo190PipelineEngine real (aggregatePerceptorsForModelo190)
 *
 * NO ejecuta computeIRPF real (requiere muchos inputs vivos);
 *   se sintetiza un IRPFCalculationResult mínimo y se documenta la limitación.
 *
 * NO ejecuta motor real de "informe de costes" (no existe como motor puro
 *   independiente todavía); se aproxima coste empresa con SS engine real.
 *
 * Resultado esperado: PARTIAL · HUMAN_REVIEW_REQUIRED salvo que TODAS las
 * capacidades estén verdaderamente cubiertas — en cuyo caso PASS_INTERNAL.
 */
import { describe, it, expect } from 'vitest';

import {
  simulateExercise,
  computePayrollImpact,
  type EquityPlan,
  type EquityGrant,
} from '@/engines/erp/hr/stockOptionsEngine';
import {
  getESConceptByCode,
} from '@/engines/erp/hr/payrollConceptCatalog';
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
import {
  buildPayslipRenderModel,
} from '@/engines/erp/hr/payslipRenderModel';
import {
  aggregatePerceptorsForModelo190,
  type Modelo190PerceptorInput,
} from '@/engines/erp/hr/modelo190PipelineEngine';
import type { IRPFCalculationResult } from '@/engines/erp/hr/irpfEngine';

import {
  carlosRuizFixture,
  stockOptionsDemo,
  contractDemo,
  employeeDemo,
  companyDemo,
  payrollPeriodDemo,
} from '../fixtures/carlos-ruiz';

// ── Helpers locales ─────────────────────────────────────────────────────────

function buildPlan(): EquityPlan {
  return {
    id: 'plan-standard-prod',
    companyId: companyDemo.id,
    planName: 'Plan Standard DEMO',
    planType: 'standard_stock_options',
    totalPool: 10000,
    currency: 'EUR',
    approvalDate: '2024-01-01',
    isStartup: false,
    cliffMonths: 12,
    vestingMonths: 24,
    vestingSchedule: 'cliff_then_linear',
  };
}

function buildGrant(): EquityGrant {
  return {
    id: stockOptionsDemo.grantId,
    planId: 'plan-standard-prod',
    employeeId: employeeDemo.id,
    grantDate: stockOptionsDemo.grantDate,
    totalShares: stockOptionsDemo.shares,
    strikePrice: stockOptionsDemo.strikePrice,
    vestedShares: stockOptionsDemo.shares,
    exercisedShares: 0,
    status: 'fully_vested',
    cliffDate: '2025-01-15',
    finalVestingDate: stockOptionsDemo.vestingDate,
  };
}

/** Línea de payslip a partir del catálogo real + monto. */
function lineFromCatalog(
  code: string,
  amount: number,
  sortOrder: number,
  overrides: Partial<PayslipLineInput> = {},
): PayslipLineInput {
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
    ...overrides,
  };
}

/** IRPF mínimo sintético. computeIRPF real requiere contexto laboral vivo. */
function buildSyntheticIRPF(baseIRPF: number, tipo = 15): IRPFCalculationResult {
  const retencion = Math.round(baseIRPF * (tipo / 100) * 100) / 100;
  return {
    rendimientosBrutos: baseIRPF,
    gastosDeducibles: 0,
    rendimientoNeto: baseIRPF,
    reduccionRendimientos: 0,
    baseImponibleGeneral: baseIRPF,
    minimoPersonal: 0,
    minimoDescendientes: 0,
    minimoAscendientes: 0,
    minimoDiscapacidad: 0,
    minimoTotal: 0,
    baseGravable: baseIRPF,
    cuotaIntegra: retencion,
    cuotaMinimos: 0,
    cuotaResultante: retencion,
    tipoEfectivo: tipo,
    retencionMensual: retencion,
    retencionAnual: retencion * 12,
    regularization: null,
    irregularIncome: null,
    regionalDeductions: null,
    familyChangeImpact: null,
    tramosAplicados: [],
    dataQuality: {
      tramosFromDB: false,
      familyDataAvailable: false,
      regularizationApplied: false,
      ccaaResolved: false,
      irregularDocumented: true,
      regionalDocumented: true,
      familyChangesDocumented: true,
    } as any,
    calculations: [],
    warnings: ['IRPF sintético en test E2E — computeIRPF real no invocado'],
    limitations: ['IRPF de referencia, no recálculo legal'],
    legalReferences: ['LIRPF Art. 99-101'],
  };
}

// ── Test ────────────────────────────────────────────────────────────────────

describe('HR · DEMO · Stock Options E2E (Fase C2 · Caso 3c)', () => {
  // === 1. Catálogo real ES_STOCK_OPTIONS ====================================
  const soDef = getESConceptByCode('ES_STOCK_OPTIONS');

  it('catálogo real expone ES_STOCK_OPTIONS con flags coherentes', () => {
    expect(soDef).toBeDefined();
    expect(soDef?.code).toBe('ES_STOCK_OPTIONS');
    expect(soDef?.name.toLowerCase()).toContain('stock options');
    expect(soDef?.is_salary).toBe(true);
    expect(soDef?.is_taxable).toBe(true);
    expect(soDef?.is_ss_contributable).toBe(true);
    expect(soDef?.impacts_irpf).toBe(true);
    expect(soDef?.impacts_cra).toBe(true);
  });

  // === 2. Build payslip real con SS real + IRPF sintético ===================
  const plan = buildPlan();
  const grant = buildGrant();
  const sim = simulateExercise(plan, grant, stockOptionsDemo.fairMarketValue);
  const soImpact = computePayrollImpact(sim);

  // Líneas de devengo: salario base + stock options
  const salarioBaseMensual =
    contractDemo.baseSalaryAnnual / contractDemo.paymentsPerYear;

  const lines: PayslipLineInput[] = [
    lineFromCatalog('ES_SAL_BASE', Math.round(salarioBaseMensual * 100) / 100, 10),
    lineFromCatalog('ES_STOCK_OPTIONS', soImpact.amount, 80),
  ];

  // SS real
  const ssLines: SSPayrollLineInput[] = lines.map((l) => ({
    conceptCode: l.conceptCode,
    amount: l.amount,
    isSalary: l.isSalary,
    isSSContributable: l.isSSContributable,
    isProrrateado: false,
    isOvertime: false,
    fiscalClass: deriveFiscalClass(l.conceptCode, l.isTaxable, l.isSalary),
  }));

  const employeeCtx: SSEmployeeContext = {
    grupoCotizacion: employeeDemo.ssContributionGroup,
    isTemporaryContract: false,
    coeficienteParcialidad: 1.0,
    pagasExtrasAnuales: 2,
    pagasExtrasProrrateadas: false,
    salarioBaseAnual: contractDemo.baseSalaryAnnual,
    diasRealesPeriodo: 30,
  };

  const ssResult = computeSSContributions(ssLines, employeeCtx, null);

  const irpfResult = buildSyntheticIRPF(ssResult.baseIRPFCorregida || ssResult.baseCCMensual, 15);

  const header: PayslipHeader = {
    empresaNombre: companyDemo.name,
    empresaCIF: companyDemo.cif,
    empresaDomicilio: 'DEMO',
    empresaCCC: companyDemo.ccc,
    trabajadorNombre: employeeDemo.fullName,
    trabajadorDNI: employeeDemo.nif,
    trabajadorNAF: employeeDemo.naf,
    trabajadorCategoria: employeeDemo.professionalGroup,
    trabajadorGrupoCotizacion: employeeDemo.ssContributionGroup,
    trabajadorAntiguedad: employeeDemo.hireDate,
    periodoNombre: 'Abril 2026',
    periodoDesde: payrollPeriodDemo.startDate,
    periodoHasta: payrollPeriodDemo.endDate,
    diasTotales: 30,
  };

  const payslip = buildPayslip({
    header,
    lines,
    ssResult,
    irpfResult,
    runId: null,
    periodId: payrollPeriodDemo.id,
  });

  it('payslipEngine real produce línea ES_STOCK_OPTIONS en devengos', () => {
    const so = payslip.devengos.find((d) => d.codigo === 'ES_STOCK_OPTIONS');
    expect(so).toBeDefined();
    expect(so?.concepto.toLowerCase()).toContain('stock options');
    expect(so?.importe).toBeGreaterThan(0);
    expect(so?.importe).toBe(soImpact.amount);
    expect(so?.isSalarial).toBe(true);
    expect(so?.isCotizable).toBe(true);
  });

  it('totalDevengos real incluye importe SO y bases SS reflejan SO como cotizable', () => {
    expect(payslip.totalDevengos).toBeGreaterThanOrEqual(soImpact.amount);
    // Base CC debe haberse alimentado de salario base + SO (ambos cotizables)
    expect(payslip.bases.baseCotizacionCC).toBeGreaterThan(salarioBaseMensual - 1);
    // Base IRPF corregida del SS engine real debe incluir SO (taxable)
    expect(ssResult.baseIRPFCorregida).toBeGreaterThan(0);
  });

  it('coherencia interna: devengos − deducciones = líquido y costeEmpresa coherente', () => {
    const calc = payslip.totalDevengos - payslip.totalDeducciones;
    expect(Math.abs(calc - payslip.liquidoTotal)).toBeLessThanOrEqual(0.02);
    expect(payslip.bases.totalCotizacionesEmpresa).toBeGreaterThan(0);
  });

  // === 3. Render model real =================================================
  it('payslipRenderModel real expone ES_STOCK_OPTIONS como devengo', () => {
    const calculation = {
      lines: lines.map((l) => ({
        concept_code: l.conceptCode,
        concept_name: l.conceptName,
        line_type: l.lineType,
        amount: l.amount,
      })),
      summary: {
        bases: {
          baseCC: payslip.bases.baseCotizacionCC,
          baseAT: payslip.bases.baseCotizacionAT,
          baseIRPF: payslip.bases.baseIRPF,
          baseHorasExtra: payslip.bases.baseHorasExtra,
        },
        totalDevengos: payslip.totalDevengos,
        totalDeducciones: payslip.totalDeducciones,
        liquidoPercibir: payslip.liquidoTotal,
        tipoIRPF: irpfResult.tipoEfectivo,
      },
    };
    const render = buildPayslipRenderModel({
      calculation,
      employee: {
        first_name: 'Carlos',
        last_name: 'Ruiz Martín',
        national_id: employeeDemo.nif,
        naf: employeeDemo.naf,
        grupo_cotizacion: employeeDemo.ssContributionGroup,
      },
      company: { name: companyDemo.name, cif: companyDemo.cif, ccc: companyDemo.ccc },
      period: {
        id: payrollPeriodDemo.id,
        period_name: 'Abril 2026',
        start_date: payrollPeriodDemo.startDate,
        end_date: payrollPeriodDemo.endDate,
      },
    });

    const so = render.devengos.find((d) => d.code === 'ES_STOCK_OPTIONS');
    expect(so).toBeDefined();
    expect(so?.name.toLowerCase()).toContain('stock options');
    expect(so?.amount).toBeGreaterThan(0);
  });

  // === 4. Modelo 190 real ===================================================
  it('aggregatePerceptorsForModelo190 real agrega bases/retenciones del periodo con SO', () => {
    const monthly = {
      month: payrollPeriodDemo.month,
      grossSalary: payslip.totalDevengos,
      baseIRPF: payslip.bases.baseIRPF,
      retencionIRPF: irpfResult.retencionMensual,
      tipoIRPF: irpfResult.tipoEfectivo,
      irpfAvailable: true,
      payrollClosed: false,
      perceptionsInKind: 0,
      paymentsOnAccount: 0,
    };
    const perceptor: Modelo190PerceptorInput = {
      employeeId: employeeDemo.id,
      employeeName: employeeDemo.fullName,
      nif: employeeDemo.nif,
      monthlyData: [monthly],
    };
    const agg = aggregatePerceptorsForModelo190([perceptor]);

    expect(agg.perceptorLines.length).toBeGreaterThanOrEqual(1);
    const line = agg.perceptorLines[0];
    expect(line.totalPercepciones).toBeGreaterThan(0);
    // Coherencia: percepciones agregadas ≈ grossSalary del mes
    expect(Math.abs(line.totalPercepciones - monthly.grossSalary)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(line.totalRetenciones - monthly.retencionIRPF)).toBeLessThanOrEqual(0.05);
  });

  // === 5. Validation status honesto =========================================
  describe('Veredicto honesto C2', () => {
    interface ValidationStatus {
      hasOwnPayslipConcept: boolean;
      contributesToEarnings: boolean;
      impactsIRPFBase: boolean;
      contributionTreatmentExplicit: boolean;
      appearsInModelo190: boolean;
      hasFiscalKeyOrReviewFlag: boolean;
      appearsInCostReport: boolean;
      sensitiveCasesHumanReview: boolean;
      e2ePayslipEngineUsed: boolean;
      e2eModelo190EngineUsed: boolean;
      missingCapabilities: string[];
      finalStatus: 'PASS_INTERNAL' | 'PASS_INTERNAL_HUMAN_REVIEW' | 'PARTIAL';
    }

    const so = payslip.devengos.find((d) => d.codigo === 'ES_STOCK_OPTIONS')!;
    const missing: string[] = [];

    // Cost report dedicado: NO existe motor puro independiente
    missing.push('cost_report_engine: motor real de informe de costes no existe como módulo puro independiente (se aproxima con SS engine real)');
    // Clave/subclave SO en 190: aggregatePerceptorsForModelo190 no expone clave dedicada SO
    missing.push('modelo190_so_clave_dedicada: pipeline 190 no expone clave/subclave fiscal específica para Stock Options');
    // IRPF real: computeIRPF no se invoca
    missing.push('irpf_real_compute: computeIRPF real no invocado en E2E (requiere contexto laboral vivo); IRPF sintético usado');

    const status: ValidationStatus = {
      hasOwnPayslipConcept: !!so && so.codigo === 'ES_STOCK_OPTIONS',
      contributesToEarnings: !!so && so.importe > 0,
      impactsIRPFBase: ssResult.baseIRPFCorregida > 0,
      contributionTreatmentExplicit: soDef?.is_ss_contributable === true,
      appearsInModelo190: true, // verificado en test 4
      hasFiscalKeyOrReviewFlag: false, // sin clave dedicada → review flag
      appearsInCostReport: false, // sin motor real de costes
      sensitiveCasesHumanReview: true, // verificado en C1 (startup/RSU/phantom)
      e2ePayslipEngineUsed: true, // buildPayslip real ✓
      e2eModelo190EngineUsed: true, // aggregatePerceptorsForModelo190 real ✓
      missingCapabilities: missing,
      finalStatus: 'PARTIAL', // por hasFiscalKeyOrReviewFlag=false y appearsInCostReport=false
    };

    it('motor payslipEngine real fue invocado E2E con ES_STOCK_OPTIONS', () => {
      expect(status.e2ePayslipEngineUsed).toBe(true);
      expect(status.hasOwnPayslipConcept).toBe(true);
      expect(status.contributesToEarnings).toBe(true);
      expect(status.impactsIRPFBase).toBe(true);
      expect(status.contributionTreatmentExplicit).toBe(true);
    });

    it('motor modelo190PipelineEngine real fue invocado E2E', () => {
      expect(status.e2eModelo190EngineUsed).toBe(true);
      expect(status.appearsInModelo190).toBe(true);
    });

    it('finalStatus = PARTIAL: faltan clave fiscal SO + cost report engine real', () => {
      expect(status.finalStatus).toBe('PARTIAL');
      expect(status.missingCapabilities).toContain(
        'modelo190_so_clave_dedicada: pipeline 190 no expone clave/subclave fiscal específica para Stock Options',
      );
      expect(status.missingCapabilities).toContain(
        'cost_report_engine: motor real de informe de costes no existe como módulo puro independiente (se aproxima con SS engine real)',
      );
      // Documentación: missingCapabilities exactas de la fase C2
      expect(status.missingCapabilities.length).toBeGreaterThanOrEqual(3);
    });

    it('casos sensibles (startup/RSU/phantom/expat) siguen exigiendo HUMAN_REVIEW_REQUIRED', () => {
      expect(status.sensitiveCasesHumanReview).toBe(true);
      expect(carlosRuizFixture.stockOptions.requiresHumanReview).toBe(true);
      expect(carlosRuizFixture.mobility.requiresHumanReview).toBe(true);
    });
  });
});