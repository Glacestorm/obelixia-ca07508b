import { expect } from 'vitest';

export interface PayslipTotalsLike {
  totalDevengos: number;
  totalDeducciones: number;
  liquido: number;
  baseCC: number;
  baseCP: number;
  baseIRPF: number;
  irpf: number;
  ssTrabajador: number;
  ssEmpresa: number;
  costeEmpresa: number;
}

export interface ExpectPayslipTotalsOptions {
  /** Tolerancia absoluta para cada importe. Por defecto ±0.01 €. */
  tolerance?: number;
  /** Etiqueta para identificar el caso en el output del test. */
  label?: string;
}

/**
 * Verifica los totales canónicos de un payslip:
 *  - cada campo cuadra con `expected` dentro de la tolerancia;
 *  - devengos − deducciones ≈ líquido;
 *  - costeEmpresa ≈ devengos + ssEmpresa.
 *
 * No depende del motor real. Solo asume el shape definido en `PayslipTotalsLike`.
 */
export function expectPayslipTotals(
  payslip: PayslipTotalsLike,
  expected: PayslipTotalsLike,
  options: ExpectPayslipTotalsOptions = {},
): void {
  const tol = options.tolerance ?? 0.01;
  const label = options.label ? `[${options.label}] ` : '';

  const fields: (keyof PayslipTotalsLike)[] = [
    'totalDevengos',
    'totalDeducciones',
    'liquido',
    'baseCC',
    'baseCP',
    'baseIRPF',
    'irpf',
    'ssTrabajador',
    'ssEmpresa',
    'costeEmpresa',
  ];

  for (const f of fields) {
    const actual = payslip[f];
    const exp = expected[f];
    expect(
      Math.abs(actual - exp) <= tol,
      `${label}campo "${f}" fuera de tolerancia: actual=${actual} esperado=${exp} tol=±${tol}`,
    ).toBe(true);
  }

  // Coherencia interna: devengos − deducciones = líquido
  const liquidoCalc = payslip.totalDevengos - payslip.totalDeducciones;
  expect(
    Math.abs(liquidoCalc - payslip.liquido) <= tol,
    `${label}coherencia rota: devengos − deducciones (${liquidoCalc}) ≠ liquido (${payslip.liquido})`,
  ).toBe(true);

  // Coherencia interna: costeEmpresa = devengos + ssEmpresa
  const costeCalc = payslip.totalDevengos + payslip.ssEmpresa;
  expect(
    Math.abs(costeCalc - payslip.costeEmpresa) <= tol,
    `${label}coherencia rota: devengos + ssEmpresa (${costeCalc}) ≠ costeEmpresa (${payslip.costeEmpresa})`,
  ).toBe(true);
}