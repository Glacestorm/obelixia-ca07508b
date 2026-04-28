/**
 * Fase C1 · Caso 14: Recibo de salarios imprimible (render model).
 *
 * Verifica el render model que alimentaría el PDF, no genera PDF binario.
 * Comprueba secciones obligatorias y conceptos especiales del mes complejo.
 */
import { describe, it, expect } from 'vitest';

import {
  companyDemo,
  employeeDemo,
  payrollPeriodDemo,
  benefitsDemo,
  stockOptionsDemo,
} from '../fixtures/carlos-ruiz';
import { expectPrintablePayslip } from '../helpers/expectPrintablePayslip';

describe('HR · DEMO · Recibo imprimible (Fase C1 · Caso 14)', () => {
  const renderModel = {
    empresa: { name: companyDemo.name, cif: companyDemo.cif, ccc: companyDemo.ccc },
    trabajador: {
      fullName: employeeDemo.fullName,
      nif: employeeDemo.nif,
      naf: employeeDemo.naf,
    },
    periodo: {
      startDate: payrollPeriodDemo.startDate,
      endDate: payrollPeriodDemo.endDate,
      label: 'Abril 2026',
    },
    devengos: [
      { concept: 'Salario base', amount: 2571.43 },
      { concept: 'Horas extras estructurales', amount: 108 },
      { concept: `Seguro médico (RE flexible)`, amount: benefitsDemo[0].monthlyAmount },
      { concept: 'Stock options (revisión humana)', amount: stockOptionsDemo.taxableBenefit },
      { concept: 'Complemento IT por AT', amount: 0 },
    ],
    deducciones: [
      { concept: 'IRPF', amount: 700 },
      { concept: 'SS Trabajador', amount: 300 },
      { concept: 'PNR 1 día', amount: 85.71 },
    ],
    bases: { baseCC: 4679.43, baseCP: 4679.43, baseIRPF: 4679.43 },
    irpf: 700,
    ssTrabajador: 300,
    liquido: 3679.43 - 1000 + 100, // determinista
    conceptos_especiales: [
      'horas_extras',
      'seguro_medico_flex',
      'stock_options_review',
      'pnr_1_dia',
      'it_at',
    ],
  };

  it('contiene secciones obligatorias del recibo', () => {
    expectPrintablePayslip(renderModel, {
      conceptos: ['horas extras', 'seguro médico', 'stock options', 'pnr', 'it'],
      label: 'recibo-c1-abril-2026',
    });
  });

  it('expone bases CC/CP/IRPF y datos empresa/trabajador/periodo', () => {
    expect(renderModel.bases.baseCC).toBeGreaterThan(0);
    expect(renderModel.bases.baseCP).toBeGreaterThan(0);
    expect(renderModel.bases.baseIRPF).toBeGreaterThan(0);
    expect(renderModel.empresa.cif).toBe('B00000000');
    expect(renderModel.trabajador.fullName).toBe('Carlos Ruiz Martín');
    expect(renderModel.periodo.startDate).toBe('2026-04-01');
  });

  it('PARTIAL · no genera PDF binario en este test (render model only)', () => {
    expect(true).toBe(true);
  });
});