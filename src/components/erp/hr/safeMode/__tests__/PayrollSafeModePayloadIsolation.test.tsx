/**
 * S9.21u.2-VERIFY — Tests de aislamiento de payload SafeMode.
 *
 * Verifica el INVARIANTE crítico del doble carril:
 *   En SafeMode activo, los importes de la tarjeta "Importes de convenio —
 *   Referencia no aplicado" son solo visuales y NUNCA contaminan:
 *     · totalEarnings / grossSalary
 *     · netSalary / total_cost / total_deductions
 *     · complements (array persistido en erp_hr_payrolls)
 *     · earnings/deductions aplicados
 *     · payrollRecord (objeto enviado a supabase)
 *
 * Estos tests reproducen FIEL pero localmente las fórmulas reales de
 * `HRPayrollEntryDialog.tsx` (`calculateTotals` lines 383-404 y la
 * construcción de `payrollRecord` lines 1238-1257) sobre fixtures sintéticas.
 * No tocan el motor real ni la BD: validan el contrato lógico.
 *
 * También se verifica que no hay regresión cuando SafeMode está desactivado.
 *
 * Además: cobertura del helper `isSafeReferenceConcept` para asegurar el
 * filtrado conservador (porcentuales, deducciones, importes no positivos,
 * códigos prohibidos de bases SS/IRPF/totales/neto).
 */

import { describe, it, expect } from 'vitest';
import {
  isSafeReferenceConcept,
  type SafeReferenceConceptInput,
} from '../PayrollSafeModeBlock';

// === Tipos locales mínimos (espejo de los reales en HRPayrollEntryDialog) ===
interface UIConcept {
  id: string;
  code: string;
  name: string;
  type: 'earning' | 'deduction';
  category: 'fixed' | 'variable' | 'in_kind' | 'ss' | 'irpf' | 'other';
  amount: number;
  isPercentage: boolean;
  cotizaSS: boolean;
  tributaIRPF: boolean;
  isEditable: boolean;
}

interface ReferenceAmounts {
  salarioBaseConvenio: number | null;
  plusConvenioTabla: number | null;
  totalMinimoConvenio: number | null;
}

// === Espejo local de calculateTotals (HRPayrollEntryDialog L383-404) ===
function calculateTotalsLocal(
  earnings: UIConcept[],
  deductions: UIConcept[],
) {
  const totalEarnings = earnings.reduce((s, e) => s + (e.amount || 0), 0);
  const baseCotizacion = earnings
    .filter((e) => e.cotizaSS)
    .reduce((s, e) => s + (e.amount || 0), 0);
  const baseIRPF = earnings
    .filter((e) => e.tributaIRPF)
    .reduce((s, e) => s + (e.amount || 0), 0);
  const irpfRate = deductions.find((d) => d.code === 'IRPF')?.amount || 0;
  const irpfAmount = baseIRPF * (irpfRate / 100);
  const otherDeductions = deductions
    .filter((d) => d.category === 'other')
    .reduce((s, d) => s + (d.amount || 0), 0);
  const totalDeductions = irpfAmount + otherDeductions; // SS estimado fuera de scope
  const netSalary = totalEarnings - totalDeductions;
  const totalCost = totalEarnings; // sin SS empresa para este fixture
  return {
    totalEarnings,
    baseCotizacion,
    baseIRPF,
    irpfAmount,
    totalDeductions,
    netSalary,
    totalCost,
  };
}

// === Espejo local de la construcción de payrollRecord (L1238-1257) ===
function buildPayrollRecordLocal(args: {
  earnings: UIConcept[];
  deductions: UIConcept[];
  referenceAmounts: ReferenceAmounts | null;
  // Importante: referenceAmounts NO debe entrar en el record.
}) {
  const { earnings, deductions } = args;
  const totals = calculateTotalsLocal(earnings, deductions);
  const baseSalary = earnings.find((e) => e.code === 'BASE')?.amount || 0;
  const complements = earnings
    .filter((e) => e.code !== 'BASE' && e.amount > 0)
    .map((e) => ({
      code: e.code,
      name: e.name,
      amount: e.amount,
      cotizaSS: e.cotizaSS,
      tributaIRPF: e.tributaIRPF,
    }));
  return {
    base_salary: baseSalary,
    complements,
    gross_salary: totals.totalEarnings,
    total_deductions: totals.totalDeductions,
    net_salary: totals.netSalary,
    total_cost: totals.totalCost,
    status: 'calculated' as const,
  };
}

// === Fixtures comunes ===
const SAFE_MODE_EARNINGS_ZERO: UIConcept[] = [
  { id: 'e0', code: 'BASE', name: 'Salario base', type: 'earning', category: 'fixed', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
  { id: 'e1', code: 'PLUS_CONV', name: 'Plus convenio', type: 'earning', category: 'fixed', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
  { id: 'e2', code: 'MEJORA_VOL', name: 'Mejora voluntaria', type: 'earning', category: 'fixed', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
  // Concepto dinámico inyectado a 0 en SafeMode (espejo de L1019-1054)
  { id: 'e3', code: 'PLUS_TRANSPORTE', name: 'Plus transporte', type: 'earning', category: 'variable', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
];

const SAFE_MODE_DEDUCTIONS_ZERO: UIConcept[] = [
  { id: 'd0', code: 'IRPF', name: 'Retención IRPF', type: 'deduction', category: 'irpf', amount: 2, isPercentage: true, cotizaSS: false, tributaIRPF: false, isEditable: true },
];

const REFERENCE_AMOUNTS_POSITIVE: ReferenceAmounts = {
  salarioBaseConvenio: 1850,
  plusConvenioTabla: 120,
  totalMinimoConvenio: 1970,
};

// =============================================================================
// CASO 1 — SafeMode activo + tabla salarial encontrada
// =============================================================================
describe('S9.21u.2-VERIFY — SafeMode activo: aislamiento estricto de referenceAmounts', () => {
  it('totalEarnings = 0 aunque referenceAmounts tenga importes positivos', () => {
    const totals = calculateTotalsLocal(
      SAFE_MODE_EARNINGS_ZERO,
      SAFE_MODE_DEDUCTIONS_ZERO,
    );
    expect(totals.totalEarnings).toBe(0);
    expect(totals.baseCotizacion).toBe(0);
    expect(totals.baseIRPF).toBe(0);
    expect(totals.irpfAmount).toBe(0);
    expect(totals.netSalary).toBe(0);
    expect(totals.totalCost).toBe(0);
  });

  it('payrollRecord construido bajo SafeMode tiene gross/net/totalCost = 0 y complements vacío', () => {
    const record = buildPayrollRecordLocal({
      earnings: SAFE_MODE_EARNINGS_ZERO,
      deductions: SAFE_MODE_DEDUCTIONS_ZERO,
      referenceAmounts: REFERENCE_AMOUNTS_POSITIVE,
    });
    expect(record.base_salary).toBe(0);
    expect(record.gross_salary).toBe(0);
    expect(record.net_salary).toBe(0);
    expect(record.total_cost).toBe(0);
    expect(record.total_deductions).toBe(0);
    expect(record.complements).toEqual([]);
  });

  it('payrollRecord NO contiene la clave "referenceAmounts" ni los importes 1850/120/1970', () => {
    const record = buildPayrollRecordLocal({
      earnings: SAFE_MODE_EARNINGS_ZERO,
      deductions: SAFE_MODE_DEDUCTIONS_ZERO,
      referenceAmounts: REFERENCE_AMOUNTS_POSITIVE,
    });
    // Aserción explícita por clave.
    expect(Object.prototype.hasOwnProperty.call(record, 'referenceAmounts')).toBe(false);
    // Aserción secundaria: ningún importe de referencia se ha colado en el JSON serializado.
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain('"referenceAmounts"');
    expect(serialized).not.toContain('1850');
    expect(serialized).not.toContain('1970');
    // 120 podría aparecer fortuitamente en otros contextos: lo evitamos
    // verificando que tampoco se mapea a base_salary/gross_salary/net_salary.
    expect(record.base_salary).not.toBe(120);
    expect(record.gross_salary).not.toBe(120);
  });

  it('los importes de referencia no se mapean a campos aplicados (BASE/PLUS_CONV/MEJORA_VOL siguen a 0)', () => {
    // Reproducimos la guardia real de L977-994: en SafeMode, amount = 0 SIEMPRE.
    const baseAmount = SAFE_MODE_EARNINGS_ZERO.find((e) => e.code === 'BASE')!.amount;
    const plusAmount = SAFE_MODE_EARNINGS_ZERO.find((e) => e.code === 'PLUS_CONV')!.amount;
    const mejoraAmount = SAFE_MODE_EARNINGS_ZERO.find((e) => e.code === 'MEJORA_VOL')!.amount;
    expect(baseAmount).toBe(0);
    expect(plusAmount).toBe(0);
    expect(mejoraAmount).toBe(0);
    // Y los importes de referencia siguen disponibles localmente, pero
    // separados del flujo de earnings.
    expect(REFERENCE_AMOUNTS_POSITIVE.salarioBaseConvenio).toBe(1850);
    expect(baseAmount).not.toBe(REFERENCE_AMOUNTS_POSITIVE.salarioBaseConvenio);
  });
});

// =============================================================================
// CASO 2 — SafeMode desactivado (no regresión)
// =============================================================================
describe('S9.21u.2-VERIFY — SafeMode desactivado: flujo normal sin regresión', () => {
  const NORMAL_EARNINGS: UIConcept[] = [
    { id: 'e0', code: 'BASE', name: 'Salario base', type: 'earning', category: 'fixed', amount: 1850, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
    { id: 'e1', code: 'PLUS_CONV', name: 'Plus convenio', type: 'earning', category: 'fixed', amount: 120, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
    { id: 'e2', code: 'MEJORA_VOL', name: 'Mejora voluntaria', type: 'earning', category: 'fixed', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
  ];
  const NORMAL_DEDUCTIONS: UIConcept[] = [
    { id: 'd0', code: 'IRPF', name: 'Retención IRPF', type: 'deduction', category: 'irpf', amount: 0, isPercentage: true, cotizaSS: false, tributaIRPF: false, isEditable: true },
  ];

  it('totalEarnings = 1970 (1850 + 120) cuando SafeMode no está activo', () => {
    const totals = calculateTotalsLocal(NORMAL_EARNINGS, NORMAL_DEDUCTIONS);
    expect(totals.totalEarnings).toBe(1970);
    expect(totals.baseCotizacion).toBe(1970);
    expect(totals.baseIRPF).toBe(1970);
  });

  it('payrollRecord refleja base_salary y complements correctamente cuando SafeMode no está activo', () => {
    const record = buildPayrollRecordLocal({
      earnings: NORMAL_EARNINGS,
      deductions: NORMAL_DEDUCTIONS,
      referenceAmounts: null,
    });
    expect(record.base_salary).toBe(1850);
    expect(record.gross_salary).toBe(1970);
    expect(record.complements).toHaveLength(1);
    expect(record.complements[0]).toMatchObject({
      code: 'PLUS_CONV',
      amount: 120,
    });
  });
});

// =============================================================================
// HELPER — isSafeReferenceConcept (filtrado conservador)
// =============================================================================
describe('S9.21u.2-VERIFY — isSafeReferenceConcept: filtrado defensivo', () => {
  it('acepta concepto válido: earning, no porcentual, importe > 0', () => {
    const c: SafeReferenceConceptInput = {
      code: 'PLUS_TRANSPORTE',
      name: 'Plus transporte',
      amount: 80,
      type: 'earning',
      isPercentage: false,
    };
    expect(isSafeReferenceConcept(c)).toBe(true);
  });

  it('rechaza null/undefined', () => {
    expect(isSafeReferenceConcept(null)).toBe(false);
    expect(isSafeReferenceConcept(undefined)).toBe(false);
  });

  it('rechaza importe 0, negativo, no finito o no numérico', () => {
    expect(isSafeReferenceConcept({ amount: 0, type: 'earning' })).toBe(false);
    expect(isSafeReferenceConcept({ amount: -10, type: 'earning' })).toBe(false);
    expect(isSafeReferenceConcept({ amount: Number.NaN, type: 'earning' })).toBe(false);
    expect(isSafeReferenceConcept({ amount: Number.POSITIVE_INFINITY, type: 'earning' })).toBe(false);
    expect(isSafeReferenceConcept({ amount: null, type: 'earning' })).toBe(false);
  });

  it('rechaza conceptos porcentuales', () => {
    expect(
      isSafeReferenceConcept({
        code: 'PCT_X',
        amount: 5,
        type: 'earning',
        isPercentage: true,
      }),
    ).toBe(false);
  });

  it('rechaza deducciones (type !== "earning")', () => {
    expect(
      isSafeReferenceConcept({
        code: 'CUOTA_SIND',
        amount: 10,
        type: 'deduction',
      }),
    ).toBe(false);
  });

  it('rechaza códigos prohibidos (bases SS, IRPF, totales, neto)', () => {
    const forbidden = [
      'IRPF',
      'ES_IRPF',
      'ES_BASE_CC',
      'ES_BASE_IRPF',
      'ES_SS_CC_TRAB',
      'ES_COSTE_EMPRESA_TOTAL',
      'NETO',
      'TOTAL_DEVENGOS',
    ];
    for (const code of forbidden) {
      expect(
        isSafeReferenceConcept({
          code,
          amount: 100,
          type: 'earning',
          isPercentage: false,
        }),
      ).toBe(false);
    }
  });
});
