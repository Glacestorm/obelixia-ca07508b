import { expect } from 'vitest';

export interface SSReconciliationInput {
  ssEmpresa: number;
  ssTrabajador: number;
  /** Prestaciones SS a deducir (IT, AT, maternidad, etc.). */
  prestacionesSS: number;
  /** Importe RLC esperado / declarado. */
  importeRLC: number;
  tolerance?: number;
  label?: string;
}

/**
 * Comprueba el cuadre canónico de SS contra el importe RLC:
 *
 *   ssEmpresa + ssTrabajador − prestacionesSS ≈ importeRLC   (tolerancia ±0.01)
 *
 * Si falta cualquier dato necesario, lanza un assert claro.
 */
export function expectSSReconciliation(input: SSReconciliationInput): void {
  const tol = input.tolerance ?? 0.01;
  const label = input.label ? `[${input.label}] ` : '';

  const required: (keyof SSReconciliationInput)[] = [
    'ssEmpresa',
    'ssTrabajador',
    'prestacionesSS',
    'importeRLC',
  ];
  for (const k of required) {
    const v = input[k];
    expect(
      typeof v === 'number' && Number.isFinite(v),
      `${label}falta dato numérico requerido: ${k}`,
    ).toBe(true);
  }

  const expected = input.ssEmpresa + input.ssTrabajador - input.prestacionesSS;
  const diff = Math.abs(expected - input.importeRLC);

  expect(
    diff <= tol,
    `${label}cuadre SS roto: ssEmp(${input.ssEmpresa}) + ssTrab(${input.ssTrabajador}) − prest(${input.prestacionesSS}) = ${expected}, RLC=${input.importeRLC}, diff=${diff}, tol=±${tol}`,
  ).toBe(true);
}