/**
 * Smoke test del Validation Pack del empleado DEMO (Fase A+B).
 *
 * Objetivo: validar que la infraestructura (fixture + helpers) está bien construida.
 * No ejecuta motores de producción. La verificación funcional real ocurrirá en Fase C.
 *
 * Invariantes:
 *  - sin red, sin DB;
 *  - sin imports de producción salvo el fixture y los helpers de este pack;
 *  - cero envíos reales.
 */
import { describe, it, expect } from 'vitest';

import {
  carlosRuizFixture,
  employeeDemo,
  contractDemo,
  payrollPeriodDemo,
  expectedComplexPayslipSnapshot,
  expectedSettlementDisciplinarySnapshot,
  stockOptionsDemo,
  mobilityDemo,
} from './fixtures/carlos-ruiz';
import { expectPayslipTotals } from './helpers/expectPayslipTotals';
import { expectArtifactDryRun } from './helpers/expectArtifactDryRun';
import { expectSSReconciliation } from './helpers/expectSSReconciliation';
import { expect111190Coherence } from './helpers/expect111190Coherence';
import { expectPrintablePayslip } from './helpers/expectPrintablePayslip';

describe('HR · Validation Pack DEMO · smoke (Fase A+B)', () => {
  it('1. fixture Carlos Ruiz existe y es coherente', () => {
    expect(carlosRuizFixture).toBeDefined();
    expect(employeeDemo.fullName).toBe('Carlos Ruiz Martín');
    expect(contractDemo.type).toBe('indefinido_ordinario');
    expect(payrollPeriodDemo.year).toBe(2026);
    expect(payrollPeriodDemo.month).toBe(4);
  });

  it('2. fixture incluye empleado, contrato, periodo y snapshots', () => {
    expect(carlosRuizFixture.employee).toBeTruthy();
    expect(carlosRuizFixture.contract).toBeTruthy();
    expect(carlosRuizFixture.payrollPeriod).toBeTruthy();
    expect(carlosRuizFixture.expected.complexPayslip).toBeTruthy();
    expect(carlosRuizFixture.expected.backpay).toBeTruthy();
    expect(carlosRuizFixture.expected.settlementDisciplinary).toBeTruthy();
    expect(carlosRuizFixture.expected.settlementObjective).toBeTruthy();
  });

  it('3. expectPayslipTotals acepta payslip determinista del fixture', () => {
    expect(() =>
      expectPayslipTotals(expectedComplexPayslipSnapshot, expectedComplexPayslipSnapshot, {
        label: 'fixture-self',
      }),
    ).not.toThrow();
  });

  it('4. expectPayslipTotals falla si el líquido no cuadra', () => {
    const broken = { ...expectedComplexPayslipSnapshot, liquido: 9999 };
    expect(() => expectPayslipTotals(broken, expectedComplexPayslipSnapshot)).toThrow();
  });

  it('5. expectArtifactDryRun acepta artifact dry_run válido', () => {
    expect(() =>
      expectArtifactDryRun({
        mode: 'dry_run',
        status: 'preview',
        hash: 'sha256:demo',
        generatedAt: '2026-04-28T10:00:00Z',
        organismo: 'TGSS',
        fileName: 'AFI_alta_demo.xml',
        artifactType: 'AFI',
      }),
    ).not.toThrow();
  });

  it('6. expectArtifactDryRun falla si está submitted/accepted sin bloqueo', () => {
    expect(() =>
      expectArtifactDryRun({
        mode: 'dry_run',
        submitted: true,
        accepted: true,
        // sin isRealSubmissionBlocked
      }),
    ).toThrow();
  });

  it('7. expectSSReconciliation valida el cuadre RLC con tolerancia', () => {
    expect(() =>
      expectSSReconciliation({
        ssEmpresa: 1085,
        ssTrabajador: 222.25,
        prestacionesSS: 100,
        importeRLC: 1207.25, // 1085 + 222.25 - 100
      }),
    ).not.toThrow();

    expect(() =>
      expectSSReconciliation({
        ssEmpresa: 1085,
        ssTrabajador: 222.25,
        prestacionesSS: 100,
        importeRLC: 9999,
      }),
    ).toThrow();
  });

  it('8. expect111190Coherence valida acumulados simples y reviewFlag para SO', () => {
    expect(() =>
      expect111190Coherence({
        payroll: { basesIRPF: [3500, 3500, 3500], retenciones: [525, 525, 525] },
        modelo: {
          baseAcumulada: 10500,
          retencionAcumulada: 1575,
          claves: ['A'],
          subclaves: ['01'],
          includesStockOptions: true,
          includesFlexibleBenefits: true,
          reviewFlags: ['stock_options_classification_pending'],
        },
        expected: {
          includeStockOptions: true,
          includeFlexibleBenefits: true,
          requiredClaves: ['A'],
          requiredSubclaves: ['01'],
          expectReviewFlag: true,
        },
      }),
    ).not.toThrow();
  });

  it('9. expectPrintablePayslip valida etiquetas mínimas del recibo', () => {
    expect(() =>
      expectPrintablePayslip(
        {
          empresa: { name: 'Obelixia DEMO S.L.', cif: 'B00000000', ccc: '28-1234567-89' },
          trabajador: { fullName: 'Carlos Ruiz Martín', nif: '00000000T', naf: '281234567890' },
          periodo: { startDate: '2026-04-01', endDate: '2026-04-30', label: 'Abril 2026' },
          devengos: [
            { concept: 'Salario base', amount: 3000 },
            { concept: 'Horas extras', amount: 200 },
            { concept: 'Seguro médico (RE flexible)', amount: 50 },
            { concept: 'Stock options (revisión)', amount: 250 },
          ],
          deducciones: [
            { concept: 'IRPF', amount: 525 },
            { concept: 'SS Trabajador', amount: 222.25 },
            { concept: 'PNR 1 día', amount: 100 },
            { concept: 'IT por AT', amount: 0 },
          ],
          bases: { baseCC: 3500, baseCP: 3500, baseIRPF: 3500 },
          irpf: 525,
          ssTrabajador: 222.25,
          liquido: 2752.75,
          conceptos_especiales: [
            'horas_extras',
            'seguro_medico_flex',
            'stock_options_review',
            'pnr_1_dia',
            'it_at',
          ],
        },
        {
          conceptos: [
            'horas extras',
            'seguro médico',
            'stock options',
            'pnr',
            'it',
          ],
          label: 'recibo-demo',
        },
      ),
    ).not.toThrow();
  });

  it('10. casos sensibles: SO y mobility exponen revisión humana', () => {
    // Stock options con clasificación no cerrada → requiresHumanReview obligatorio
    expect(stockOptionsDemo.requiresHumanReview).toBe(true);
    expect(['supported_with_review', 'out_of_scope']).toContain(stockOptionsDemo.classification);

    // Movilidad internacional con potencial 7p / 216 → revisión humana, jamás auto-aplicada
    expect(mobilityDemo.requiresHumanReview).toBe(true);
    expect(mobilityDemo.potential7p).toBe(true);
    expect(mobilityDemo.potential216).toBe(true);
    expect(mobilityDemo.payrollImpactExpected).toBe(true);

    // Settlement disciplinario procedente: indemnización 0
    expect(expectedSettlementDisciplinarySnapshot.indemnization).toBe(0);
  });
});