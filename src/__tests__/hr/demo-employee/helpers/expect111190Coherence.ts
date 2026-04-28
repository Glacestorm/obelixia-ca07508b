import { expect } from 'vitest';

export interface PayrollAccumulators {
  basesIRPF: number[];
  retenciones: number[];
}

export interface ModeloAccumulators {
  baseAcumulada: number;
  retencionAcumulada: number;
  claves?: string[];
  subclaves?: string[];
  /** Si existe, indica que el modelo declara incluir SO. */
  includesStockOptions?: boolean;
  /** Si existe, indica que el modelo declara incluir RE flexible. */
  includesFlexibleBenefits?: boolean;
  /** Banderas de revisión humana propagadas. */
  reviewFlags?: string[];
}

export interface Expect111190Input {
  payroll: PayrollAccumulators;
  modelo: ModeloAccumulators;
  expected: {
    includeStockOptions?: boolean;
    includeFlexibleBenefits?: boolean;
    requiredClaves?: string[];
    requiredSubclaves?: string[];
    /** Si la clasificación fiscal de SO/RE no está cerrada, exigir flag de revisión. */
    expectReviewFlag?: boolean;
  };
  tolerance?: number;
  label?: string;
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

/**
 * Verifica coherencia básica entre los acumulados de payroll y el modelo
 * fiscal (111 / 190):
 *  - suma de bases IRPF de payroll ≈ baseAcumulada del modelo;
 *  - suma de retenciones de payroll ≈ retencionAcumulada del modelo;
 *  - claves / subclaves requeridas presentes;
 *  - inclusión declarada de stock options / RE flexible si se exige;
 *  - si la clasificación no está cerrada, debe haber `reviewFlags`.
 */
export function expect111190Coherence(input: Expect111190Input): void {
  const tol = input.tolerance ?? 0.01;
  const label = input.label ? `[${input.label}] ` : '';

  const sumBases = sum(input.payroll.basesIRPF);
  const sumRet = sum(input.payroll.retenciones);

  expect(
    Math.abs(sumBases - input.modelo.baseAcumulada) <= tol,
    `${label}suma bases payroll (${sumBases}) ≠ baseAcumulada modelo (${input.modelo.baseAcumulada}) tol=±${tol}`,
  ).toBe(true);

  expect(
    Math.abs(sumRet - input.modelo.retencionAcumulada) <= tol,
    `${label}suma retenciones payroll (${sumRet}) ≠ retencionAcumulada modelo (${input.modelo.retencionAcumulada}) tol=±${tol}`,
  ).toBe(true);

  if (input.expected.requiredClaves && input.expected.requiredClaves.length > 0) {
    const got = input.modelo.claves ?? [];
    for (const c of input.expected.requiredClaves) {
      expect(got.includes(c), `${label}clave fiscal requerida ausente: ${c}`).toBe(true);
    }
  }

  if (input.expected.requiredSubclaves && input.expected.requiredSubclaves.length > 0) {
    const got = input.modelo.subclaves ?? [];
    for (const sc of input.expected.requiredSubclaves) {
      expect(
        got.includes(sc),
        `${label}subclave fiscal requerida ausente: ${sc}`,
      ).toBe(true);
    }
  }

  if (input.expected.includeStockOptions === true) {
    expect(
      input.modelo.includesStockOptions === true,
      `${label}el modelo no declara incluir stock options`,
    ).toBe(true);
  }

  if (input.expected.includeFlexibleBenefits === true) {
    expect(
      input.modelo.includesFlexibleBenefits === true,
      `${label}el modelo no declara incluir retribución flexible`,
    ).toBe(true);
  }

  if (input.expected.expectReviewFlag === true) {
    const flags = input.modelo.reviewFlags ?? [];
    expect(
      flags.length > 0,
      `${label}clasificación fiscal no cerrada pero no hay reviewFlags`,
    ).toBe(true);
  }
}