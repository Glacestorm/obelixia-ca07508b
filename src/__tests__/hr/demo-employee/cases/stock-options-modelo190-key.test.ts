/**
 * Fase C3 · Stock Options en Modelo 190
 * ─────────────────────────────────────
 * Verifica que la línea 190 del perceptor con Stock Options NO se emite
 * silenciosamente con A/01. Debe quedar:
 *   - clave/subclave resuelta del catálogo, o
 *   - marcada `requires_human_review = true`,
 *     `fiscal_classification_status = 'pending_review'`,
 *     `official_submission_blocked = true`,
 *     `clave_is_fallback = true`.
 *
 * Sin envíos oficiales. Sin mocks de motores. Catálogo y pipeline reales.
 */
import { describe, it, expect } from 'vitest';

import {
  aggregatePerceptorsForModelo190,
  type Modelo190PerceptorInput,
} from '@/engines/erp/hr/modelo190PipelineEngine';
import { getESConceptByCode } from '@/engines/erp/hr/payrollConceptCatalog';
import {
  carlosRuizFixture,
  stockOptionsDemo,
  employeeDemo,
} from '../fixtures/carlos-ruiz';

describe('HR · DEMO · Modelo 190 — Stock Options no admite A/01 silencioso (Fase C3)', () => {
  it('catálogo real marca ES_STOCK_OPTIONS como pending_review', () => {
    const def = getESConceptByCode('ES_STOCK_OPTIONS');
    expect(def).toBeDefined();
    expect(def?.modelo190_review_required).toBe(true);
    expect(def?.fiscal_classification_status).toBe('pending_review');
    expect(def?.modelo190_review_reason).toBeDefined();
    // No debe traer clave/subclave resuelta automática.
    expect(def?.modelo190_clave).toBeUndefined();
    expect(def?.modelo190_subclave).toBeUndefined();
  });

  it('aggregatePerceptorsForModelo190 con SO en breakdown emite review flag y bloquea envío oficial', () => {
    const monthlyData = Array.from({ length: 12 }).map((_, i) => ({
      month: i + 1,
      grossSalary: 3000,
      baseIRPF: 3000,
      retencionIRPF: 450,
      tipoIRPF: 15,
      irpfAvailable: true,
      payrollClosed: true,
      perceptionsInKind: 0,
      paymentsOnAccount: 0,
    }));
    // Inyectar SO en el mes del ejercicio.
    monthlyData[3].grossSalary += stockOptionsDemo.taxableBenefit;
    monthlyData[3].baseIRPF += stockOptionsDemo.taxableBenefit;

    const input: Modelo190PerceptorInput = {
      employeeId: employeeDemo.id,
      employeeName: employeeDemo.fullName,
      nif: employeeDemo.nif,
      monthlyData,
      conceptBreakdown: [
        { conceptCode: 'ES_SAL_BASE', amount: 36000 },
        {
          conceptCode: 'ES_STOCK_OPTIONS',
          amount: stockOptionsDemo.taxableBenefit,
          taxableAmount: stockOptionsDemo.taxableBenefit,
        },
      ],
    };

    const result = aggregatePerceptorsForModelo190([input]);
    expect(result.perceptorLines).toHaveLength(1);
    const line = result.perceptorLines[0];

    // C3 · No se permite A/01 silencioso para SO
    expect(line.requires_human_review).toBe(true);
    expect(line.fiscal_classification_status).toBe('pending_review');
    expect(line.official_submission_blocked).toBe(true);
    expect(line.clave_is_fallback).toBe(true);
    expect(line.review_reason).toMatch(/ES_STOCK_OPTIONS/);
    expect(line.concept_codes).toContain('ES_STOCK_OPTIONS');

    // qualityReport.issues debe incluir la advertencia.
    const soIssue = result.qualityReport.issues.find((i) =>
      /revisión fiscal humana/i.test(i.issue),
    );
    expect(soIssue).toBeDefined();
    expect(soIssue?.severity).toBe('warning');

    // No marca como official_ready / submitted / accepted (no existen esos campos
    // y el motor no los introduce).
    expect((line as any).official_ready).toBeUndefined();
    expect((line as any).submitted).toBeUndefined();
    expect((line as any).accepted).toBeUndefined();
  });

  it('sin breakdown SO el motor mantiene comportamiento previo (A/01 fallback marcado)', () => {
    const input: Modelo190PerceptorInput = {
      employeeId: 'no-so-emp',
      employeeName: 'Empleado sin SO',
      nif: '11111111H',
      monthlyData: Array.from({ length: 12 }).map((_, i) => ({
        month: i + 1,
        grossSalary: 2500,
        baseIRPF: 2500,
        retencionIRPF: 300,
        tipoIRPF: 12,
        irpfAvailable: true,
        payrollClosed: true,
        perceptionsInKind: 0,
        paymentsOnAccount: 0,
      })),
    };
    const result = aggregatePerceptorsForModelo190([input]);
    const line = result.perceptorLines[0];
    // Sin breakdown, A/01 sigue como fallback (no resuelto).
    expect(line.clave_percepcion).toBe('A');
    expect(line.subclave).toBe('01');
    expect(line.clave_is_fallback).toBe(true);
    expect(line.fiscal_classification_status).toBe('pending_review');
    expect(line.official_submission_blocked).toBe(true);
  });

  // Trazabilidad cruzada con fixture demo.
  it('fixture Carlos Ruiz: clasificación SO coherente con review humana', () => {
    expect(carlosRuizFixture.stockOptions.requiresHumanReview).toBe(true);
    expect(carlosRuizFixture.stockOptions.classification).toBe('supported_with_review');
  });
});