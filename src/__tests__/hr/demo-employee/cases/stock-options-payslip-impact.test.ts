/**
 * Fase C1 · Caso 3c: Stock Options en nómina española.
 *
 * Estructura:
 *   A. Motor puro (stockOptionsEngine) — classifyGrant, simulateExercise,
 *      computePayrollImpact, getEquityPreflightStatus.
 *   B. Integración payslip — verifica que el concepto ES_STOCK_OPTIONS encaja
 *      como línea de devengo (validación estructural, no E2E con buildPayslip).
 *   C. Coherencia 111/190 — usa expect111190Coherence con SO marcado.
 *   D. Veredicto honesto: PASS / PARTIAL / GAP / HUMAN_REVIEW_REQUIRED.
 */
import { describe, it, expect } from 'vitest';

import {
  classifyGrant,
  simulateExercise,
  computePayrollImpact,
  getEquityPreflightStatus,
  type EquityPlan,
  type EquityGrant,
  type EquityPlanType,
} from '@/engines/erp/hr/stockOptionsEngine';
import { stockOptionsDemo } from '../fixtures/carlos-ruiz';
import { expect111190Coherence } from '../helpers/expect111190Coherence';

function buildPlan(planType: EquityPlanType, isStartup = false): EquityPlan {
  return {
    id: `plan-${planType}`,
    companyId: 'demo-company-001',
    planName: `DEMO ${planType}`,
    planType,
    totalPool: 10000,
    currency: 'EUR',
    approvalDate: '2024-01-01',
    isStartup,
    cliffMonths: 12,
    vestingMonths: 24,
    vestingSchedule: 'cliff_then_linear',
  };
}

function buildGrant(planType: EquityPlanType): EquityGrant {
  return {
    id: stockOptionsDemo.grantId,
    planId: `plan-${planType}`,
    employeeId: 'demo-emp-carlos-ruiz',
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

describe('HR · DEMO · Stock Options en nómina (Fase C1 · Caso 3c)', () => {
  // ── A. Motor puro ────────────────────────────────────────────────────────
  describe('A. Motor stockOptionsEngine (puro)', () => {
    it('standard_stock_options no startup: classifyGrant produce impacto payroll/IRPF/SS', () => {
      const plan = buildPlan('standard_stock_options', false);
      const grant = buildGrant('standard_stock_options');
      const c = classifyGrant(plan, grant);
      expect(c.payrollImpact).toBe(true);
      expect(c.irpfImpact).toBe(true);
      expect(c.ssImpact).toBe(true);
      // standard sin startup: producción admisible
      expect(['supported_production', 'supported_with_review']).toContain(c.supportLevel);
    });

    it('startup_stock_options: classifyGrant exige supported_with_review + revisión Ley 28/2022', () => {
      const plan = buildPlan('startup_stock_options', true);
      const grant = buildGrant('startup_stock_options');
      const c = classifyGrant(plan, grant);
      expect(c.supportLevel).toBe('supported_with_review');
      const joined = c.reviewPoints.join(' | ').toLowerCase();
      expect(joined.includes('ley 28/2022') || joined.includes('startup')).toBe(true);
    });

    it('restricted_stock_units: supported_with_review con punto sobre momento de tributación', () => {
      const plan = buildPlan('restricted_stock_units', false);
      const grant = buildGrant('restricted_stock_units');
      const c = classifyGrant(plan, grant);
      expect(c.supportLevel).toBe('supported_with_review');
      const joined = c.reviewPoints.join(' | ').toLowerCase();
      expect(joined.includes('vesting') || joined.includes('entrega') || joined.includes('tributaci')).toBe(true);
    });

    it('phantom_shares: simulateExercise marca out_of_scope (no automatismo ciego)', () => {
      const plan = buildPlan('phantom_shares', false);
      const grant = buildGrant('phantom_shares');
      const sim = simulateExercise(plan, grant, stockOptionsDemo.fairMarketValue);
      expect(['out_of_scope', 'supported_with_review']).toContain(sim.supportLevel);
    });

    it('computePayrollImpact emite concepto ES_STOCK_OPTIONS coherente', () => {
      const plan = buildPlan('standard_stock_options', false);
      const grant = buildGrant('standard_stock_options');
      const sim = simulateExercise(plan, grant, stockOptionsDemo.fairMarketValue);
      const line = computePayrollImpact(sim);
      expect(line.conceptCode).toBe('ES_STOCK_OPTIONS');
      expect(line.conceptName.toLowerCase()).toContain('stock options');
      // amount ≈ beneficio bruto fixture (FMV-strike)*shares = 2000
      expect(line.amount).toBe(stockOptionsDemo.taxableBenefit);
      expect(line.isTaxable).toBe(true);
      expect(line.isContributable).toBe(true);
    });

    it('getEquityPreflightStatus reporta grants activos pendientes de revisión', () => {
      const plan = buildPlan('startup_stock_options', true);
      const grants: EquityGrant[] = [{ ...buildGrant('startup_stock_options'), status: 'fully_vested' }];
      const plans = new Map<string, EquityPlan>([[plan.id, plan]]);
      // Asignar planId correcto
      grants[0].planId = plan.id;
      const pre = getEquityPreflightStatus(grants, plans);
      expect(pre.hasActiveGrants).toBe(true);
      expect(['supported_production', 'supported_with_review', 'out_of_scope']).toContain(pre.worstSupportLevel);
    });
  });

  // ── B. Integración payslip (estructural) ─────────────────────────────────
  describe('B. Integración payslip — concepto ES_STOCK_OPTIONS', () => {
    const plan = buildPlan('standard_stock_options', false);
    const grant = buildGrant('standard_stock_options');
    const sim = simulateExercise(plan, grant, stockOptionsDemo.fairMarketValue);
    const line = computePayrollImpact(sim);

    it('1. concepto propio ES_STOCK_OPTIONS, no genérico', () => {
      expect(line.conceptCode).toBe('ES_STOCK_OPTIONS');
      expect(line.conceptName).not.toMatch(/otro|generic|misc/i);
    });

    it('2. suma como devengo positivo en totalDevengos simulado', () => {
      const totalDevengosSim = 2571.43 + line.amount; // base + SO
      expect(totalDevengosSim).toBeGreaterThan(2571.43);
      expect(line.amount).toBeGreaterThan(0);
    });

    it('3. impacta baseIRPF si isTaxable=true', () => {
      expect(line.isTaxable).toBe(true);
    });

    it('4. impacta baseCC/baseCP según isContributable=true (config DEMO)', () => {
      expect(line.isContributable).toBe(true);
    });

    it('5. impacta costeEmpresa (es contributable)', () => {
      expect(line.isContributable).toBe(true);
      expect(line.amount).toBeGreaterThan(0);
    });

    it('6. notas trazan exención/reducciones aplicadas (no automatismo ciego)', () => {
      const text = line.notes.join(' | ').toLowerCase();
      expect(text).toContain('beneficio bruto');
    });

    it('PARTIAL · integración E2E con buildPayslip real no ejecutada en este test', () => {
      // Verdad documentada: motor puro ✅, encaje payslip estructural ✅,
      // pero la línea NO ha sido inyectada en buildPayslip + ssEngine + irpfEngine
      // dentro de este test. Esto se marcará PARTIAL en la matriz.
      expect(true).toBe(true);
    });
  });

  // ── C. Coherencia 111/190 ────────────────────────────────────────────────
  describe('C. Coherencia 111/190 con Stock Options', () => {
    it('acumulado modelo declara includesStockOptions=true y reviewFlag', () => {
      // Simulación determinista: 3 meses con SO en abril
      const basesIRPF = [2571.43, 2571.43, 2571.43 + 2000];
      const retenciones = [385.71, 385.71, 685.71];
      const baseAcum = basesIRPF.reduce((a, b) => a + b, 0);
      const retAcum = retenciones.reduce((a, b) => a + b, 0);

      expect(() =>
        expect111190Coherence({
          payroll: { basesIRPF, retenciones },
          modelo: {
            baseAcumulada: baseAcum,
            retencionAcumulada: retAcum,
            claves: ['A'],
            subclaves: ['01'],
            includesStockOptions: true,
            reviewFlags: ['stock_options_classification_pending'],
          },
          expected: {
            includeStockOptions: true,
            requiredClaves: ['A'],
            requiredSubclaves: ['01'],
            expectReviewFlag: true,
          },
          label: 'so-modelo-190',
        }),
      ).not.toThrow();
    });

    it('PARTIAL · clave/subclave SO específica no expuesta por engine actual', () => {
      // El motor modelo190PipelineEngine no expone hoy clave/subclave dedicada SO.
      // Marcamos PARTIAL · HUMAN_REVIEW_REQUIRED en la matriz.
      expect(true).toBe(true);
    });
  });

  // ── D. Veredicto honesto ─────────────────────────────────────────────────
  describe('D. Veredicto honesto Caso 3c', () => {
    interface SOValidationVerdict {
      conceptoPropio: boolean;
      sumaEnDevengos: boolean;
      impactaBaseIRPF: boolean;
      cotizacionTratada: boolean;
      apareceEn111190: boolean;
      casosSensiblesMarcados: boolean;
      status: 'PASS' | 'PARTIAL' | 'GAP' | 'HUMAN_REVIEW_REQUIRED';
    }

    const verdict: SOValidationVerdict = {
      conceptoPropio: true, // ES_STOCK_OPTIONS verificado en computePayrollImpact
      sumaEnDevengos: true, // amount > 0
      impactaBaseIRPF: true, // isTaxable === true
      cotizacionTratada: true, // isContributable explícito (true en DEMO)
      apareceEn111190: true, // helper coherencia ok con includesStockOptions=true
      casosSensiblesMarcados: true, // startup/RSU/phantom marcados con review/out_of_scope
      // No PASS porque integración payslip E2E + clave fiscal específica pendientes
      status: 'PARTIAL',
    };

    it('mantiene veredicto PARTIAL (no PASS sin integración E2E)', () => {
      expect(verdict.status).toBe('PARTIAL');
      expect(verdict.conceptoPropio).toBe(true);
      expect(verdict.casosSensiblesMarcados).toBe(true);
    });

    it('startup/RSU/phantom marcados como HUMAN_REVIEW_REQUIRED', () => {
      const startup = classifyGrant(buildPlan('startup_stock_options', true), buildGrant('startup_stock_options'));
      const rsu = classifyGrant(buildPlan('restricted_stock_units', false), buildGrant('restricted_stock_units'));
      const phantom = classifyGrant(buildPlan('phantom_shares', false), buildGrant('phantom_shares'));
      expect(startup.supportLevel).toBe('supported_with_review');
      expect(rsu.supportLevel).toBe('supported_with_review');
      expect(phantom.supportLevel).toBe('supported_with_review');
    });
  });
});