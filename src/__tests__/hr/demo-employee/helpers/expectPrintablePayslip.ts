import { expect } from 'vitest';

export interface PrintablePayslipRenderModel {
  empresa?: { name?: string; cif?: string; ccc?: string };
  trabajador?: { fullName?: string; nif?: string; naf?: string };
  periodo?: { startDate?: string; endDate?: string; label?: string };
  devengos?: Array<{ concept: string; amount: number }>;
  deducciones?: Array<{ concept: string; amount: number }>;
  bases?: { baseCC?: number; baseCP?: number; baseIRPF?: number };
  irpf?: number;
  ssTrabajador?: number;
  liquido?: number;
  conceptos_especiales?: string[];
  [key: string]: unknown;
}

export interface ExpectedPrintableLabels {
  /** Conceptos especiales requeridos (case-insensitive substring match en concepts/labels). */
  conceptos: string[];
  label?: string;
}

function flattenConceptStrings(model: PrintablePayslipRenderModel): string[] {
  const out: string[] = [];
  for (const d of model.devengos ?? []) out.push(d.concept);
  for (const d of model.deducciones ?? []) out.push(d.concept);
  for (const c of model.conceptos_especiales ?? []) out.push(c);
  return out.map((s) => s.toLowerCase());
}

/**
 * Verifica que el render model imprimible contiene las secciones mínimas
 * de un recibo de salarios y los conceptos especiales esperados.
 * No genera PDF binario.
 */
export function expectPrintablePayslip(
  model: PrintablePayslipRenderModel,
  expected: ExpectedPrintableLabels,
): void {
  const label = expected.label ? `[${expected.label}] ` : '';

  expect(model, `${label}render model requerido`).toBeTruthy();

  // Secciones mínimas
  expect(model.empresa?.name, `${label}falta empresa.name`).toBeTruthy();
  expect(model.trabajador?.fullName, `${label}falta trabajador.fullName`).toBeTruthy();
  expect(model.periodo?.startDate, `${label}falta periodo.startDate`).toBeTruthy();
  expect(model.periodo?.endDate, `${label}falta periodo.endDate`).toBeTruthy();
  expect(
    Array.isArray(model.devengos) && model.devengos.length > 0,
    `${label}falta sección devengos`,
  ).toBe(true);
  expect(
    Array.isArray(model.deducciones) && model.deducciones.length > 0,
    `${label}falta sección deducciones`,
  ).toBe(true);
  expect(model.bases?.baseCC !== undefined, `${label}falta bases.baseCC`).toBe(true);
  expect(model.bases?.baseCP !== undefined, `${label}falta bases.baseCP`).toBe(true);
  expect(model.bases?.baseIRPF !== undefined, `${label}falta bases.baseIRPF`).toBe(true);
  expect(typeof model.irpf === 'number', `${label}falta irpf`).toBe(true);
  expect(typeof model.ssTrabajador === 'number', `${label}falta ssTrabajador`).toBe(true);
  expect(typeof model.liquido === 'number', `${label}falta liquido`).toBe(true);

  // Conceptos especiales
  const haystack = flattenConceptStrings(model);
  for (const concept of expected.conceptos) {
    const needle = concept.toLowerCase();
    expect(
      haystack.some((s) => s.includes(needle)),
      `${label}concepto especial ausente en recibo: ${concept}`,
    ).toBe(true);
  }
}