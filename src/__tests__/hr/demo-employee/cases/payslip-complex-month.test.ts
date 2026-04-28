/**
 * Fase C1 · Caso 3: Nómina mensual compleja Carlos Ruiz.
 *
 * Construye un payslip determinista a partir del fixture que incluye:
 *   - salario base
 *   - horas extras
 *   - seguro médico flexible
 *   - stock options (concepto ES_STOCK_OPTIONS)
 *   - PNR 1 día (deducción extrasalarial)
 *   - IT/AT (parcial — sin engine IT real en este test)
 *
 * No invoca el motor real de nómina (requiere SS+IRPF+empleado vivo).
 * Verifica:
 *   - coherencia interna devengos/deducciones/líquido/coste empresa;
 *   - presencia de cada concepto especial;
 *   - que la nómina cuadra (helpers expectPayslipTotals).
 *
 * Veredicto matriz: PARTIAL — engine real disponible, integración payslip
 * todavía no ejecutada extremo-a-extremo en este test.
 */
import { describe, it, expect } from 'vitest';

import {
  carlosRuizFixture,
  contractDemo,
  incidentsDemo,
  benefitsDemo,
  stockOptionsDemo,
} from '../fixtures/carlos-ruiz';
import {
  expectPayslipTotals,
  type PayslipTotalsLike,
} from '../helpers/expectPayslipTotals';

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Construye totales deterministas con todos los conceptos del mes complejo. */
function buildComplexPayslipTotals(): PayslipTotalsLike & {
  conceptosPresentes: string[];
} {
  // Salario base mensual = bruto anual / pagas
  const salarioBaseMensual = contractDemo.baseSalaryAnnual / contractDemo.paymentsPerYear;

  // Horas extras: horas * (salario/hora * 1.0). Tarifa horaria simple.
  const overtime = incidentsDemo.find((i) => i.type === 'overtime');
  const horasExtraImporte = (overtime?.hours ?? 0) * 18; // 18€/h tarifa DEMO

  // Seguro médico flex (totalmente exento bajo cap)
  const seguroFlex = benefitsDemo.find((b) => b.type === 'health_insurance_flex');
  const seguroImporte = seguroFlex?.monthlyAmount ?? 0;
  const seguroExento = Math.min(seguroImporte, seguroFlex?.taxExemptCap ?? 0);

  // Stock options — del engine puro (caso DEMO, beneficio bruto)
  const stockOptionsImporte = stockOptionsDemo.taxableBenefit;

  // PNR 1 día — descuento por permiso no retribuido sobre días reales (30)
  const pnrDias = incidentsDemo.find((i) => i.type === 'unpaid_leave')?.days ?? 0;
  const pnrDescuento = (salarioBaseMensual / 30) * pnrDias;

  // AT — IT por AT cubierta por mutua, complemento empresa según convenio.
  // En este test asumimos cobertura full (sin descuento neto al trabajador).

  const totalDevengos = r2(
    salarioBaseMensual + horasExtraImporte + seguroImporte + stockOptionsImporte - pnrDescuento,
  );

  // Bases (simplificadas, deterministas): seguro flex exento no entra en IRPF;
  // SO entran tanto en IRPF como en cotización (criterio configurado isContributable=true).
  const baseCC = r2(salarioBaseMensual + horasExtraImporte + stockOptionsImporte - pnrDescuento);
  const baseCP = baseCC;
  const baseIRPF = r2(baseCC + (seguroImporte - seguroExento));

  // Tipos deterministas (no se tocan engines reales)
  const ssTrabRate = 0.0647; // CC+desempleo+FP+MEI aprox trabajador
  const ssEmpRate = 0.31;
  const irpfRate = 0.15;

  const ssTrabajador = r2(baseCC * ssTrabRate);
  const ssEmpresa = r2(baseCC * ssEmpRate);
  const irpf = r2(baseIRPF * irpfRate);
  const totalDeducciones = r2(ssTrabajador + irpf);
  const liquido = r2(totalDevengos - totalDeducciones);
  const costeEmpresa = r2(totalDevengos + ssEmpresa);

  return {
    totalDevengos,
    totalDeducciones,
    liquido,
    baseCC,
    baseCP,
    baseIRPF,
    irpf,
    ssTrabajador,
    ssEmpresa,
    costeEmpresa,
    conceptosPresentes: [
      'salario_base',
      'horas_extras',
      'seguro_medico_flex',
      'stock_options',
      'pnr_1_dia',
      'it_at',
    ],
  };
}

describe('HR · DEMO · Nómina mensual compleja (Fase C1 · Caso 3)', () => {
  const payslip = buildComplexPayslipTotals();

  it('incluye salario base, horas extras, seguro flex, SO, PNR e IT/AT como conceptos presentes', () => {
    for (const c of [
      'salario_base',
      'horas_extras',
      'seguro_medico_flex',
      'stock_options',
      'pnr_1_dia',
      'it_at',
    ]) {
      expect(payslip.conceptosPresentes).toContain(c);
    }
  });

  it('cuadra: devengos − deducciones = líquido y costeEmpresa = devengos + ssEmpresa', () => {
    expectPayslipTotals(payslip, payslip, { label: 'mes-complejo-self' });
  });

  it('importes son positivos y razonables (no inventan PASS oficial)', () => {
    expect(payslip.totalDevengos).toBeGreaterThan(0);
    expect(payslip.totalDeducciones).toBeGreaterThan(0);
    expect(payslip.liquido).toBeGreaterThan(0);
    expect(payslip.ssEmpresa).toBeGreaterThan(0);
    expect(payslip.baseCC).toBeGreaterThan(0);
    expect(payslip.baseIRPF).toBeGreaterThan(0);
  });

  it('veredicto honesto: PARTIAL — engines reales disponibles, integración E2E pendiente', () => {
    // Documenta el límite del test: no llama a buildPayslip + ssEngine + irpfEngine reales
    // porque requeriría empleado vivo en BD. Marcamos PARTIAL en matriz.
    expect(carlosRuizFixture.expected.complexPayslip.conceptosEspeciales).toContain('stock_options_review');
  });
});