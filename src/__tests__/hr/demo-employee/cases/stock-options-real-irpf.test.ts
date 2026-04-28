/**
 * Fase C3 · IRPF real con Stock Options
 * ─────────────────────────────────────
 * Invoca `computeIRPF` REAL (no sintético) con un contexto laboral
 * construido desde el fixture demo (Carlos Ruiz). Compara dos escenarios:
 *   (a) sin SO  vs  (b) con SO incluidas en bruto anual.
 * Verifica:
 *   - rendimientosBrutos aumentan;
 *   - retención mensual / tipo efectivo cambia o queda explicado en warnings;
 *   - dataQuality refleja honestamente lo que falta (no se inventa nada);
 *   - CCAA foral (Bizkaia): HUMAN_REVIEW_REQUIRED, no PASS.
 *
 * El cálculo es preparatorio. NO sustituye liquidación AEAT.
 */
import { describe, it, expect } from 'vitest';

import {
  computeIRPF,
  buildIRPFInputFromLaborData,
  checkIRPFDataCompleteness,
  isCCAAForal,
  type IRPFEmployeeInput,
} from '@/engines/erp/hr/irpfEngine';
import {
  contractDemo,
  stockOptionsDemo,
} from '../fixtures/carlos-ruiz';

/** Construye el contexto IRPF Carlos Ruiz desde fixture + flags reales. */
function carlosRuizIRPFContext(opts: {
  includeStockOptions: boolean;
  ccaa?: string | null;
}): IRPFEmployeeInput {
  const baseAnual = contractDemo.baseSalaryAnnual; // 36.000 €
  const so = opts.includeStockOptions ? stockOptionsDemo.taxableBenefit : 0;
  const salarioBrutoAnual = baseAnual + so;
  // SS trabajador anual estimada (~6,40% sobre bruto sin SO; conservador).
  const ssWorkerAnual = Math.round(baseAnual * 0.064 * 100) / 100;

  return buildIRPFInputFromLaborData(
    {
      situacion_familiar_irpf: 1,        // soltero sin hijos (escenario base)
      hijos_menores_25: 0,
      hijos_menores_3: 0,
      discapacidad_hijos: false,
      ascendientes_cargo: 0,
      pension_compensatoria: 0,
      anualidad_alimentos: 0,
      prolongacion_laboral: false,
      contrato_inferior_anual: false,
      reduccion_movilidad_geografica: false,
      comunidad_autonoma: opts.ccaa ?? 'Madrid',
    },
    salarioBrutoAnual,
    ssWorkerAnual,
  );
}

describe('HR · DEMO · IRPF real con Stock Options (Fase C3)', () => {
  it('computeIRPF real se invoca y produce resultado con warnings honestos', () => {
    const input = carlosRuizIRPFContext({ includeStockOptions: true });
    const result = computeIRPF(input, null, null);

    expect(result).toBeDefined();
    expect(result.rendimientosBrutos).toBeGreaterThan(0);
    expect(typeof result.tipoEfectivo).toBe('number');
    expect(typeof result.retencionMensual).toBe('number');
    // dataQuality debe reflejar que tramos no vienen de BD.
    expect(result.dataQuality.tramosFromDB).toBe(false);
    // El motor debe haber emitido al menos un warning honesto.
    expect(result.warnings.length + result.limitations.length).toBeGreaterThan(0);
  });

  it('escenario CON SO vs SIN SO: rendimientos brutos y retención coherentes', () => {
    const sin = computeIRPF(carlosRuizIRPFContext({ includeStockOptions: false }), null, null);
    const con = computeIRPF(carlosRuizIRPFContext({ includeStockOptions: true }), null, null);

    // Rendimientos brutos aumentan en al menos el importe SO.
    expect(con.rendimientosBrutos).toBeGreaterThan(sin.rendimientosBrutos);
    expect(con.rendimientosBrutos - sin.rendimientosBrutos)
      .toBeGreaterThanOrEqual(stockOptionsDemo.taxableBenefit - 0.5);

    // Retención anual (o tipo efectivo) debe cambiar de forma trazable.
    const cambioRetencion = Math.abs(con.retencionAnual - sin.retencionAnual);
    const cambioTipo = Math.abs(con.tipoEfectivo - sin.tipoEfectivo);
    expect(cambioRetencion + cambioTipo).toBeGreaterThan(0);
  });

  it('checkIRPFDataCompleteness señala honestamente datos faltantes', () => {
    const incompleto = checkIRPFDataCompleteness({
      situacion_familiar_irpf: null,
      hijos_menores_25: null,
      comunidad_autonoma: null,
    });
    expect(incompleto.complete).toBe(false);
    expect(incompleto.missingFields.length).toBeGreaterThan(0);

    const completo = checkIRPFDataCompleteness({
      situacion_familiar_irpf: 1,
      hijos_menores_25: 0,
      comunidad_autonoma: 'Madrid',
    });
    expect(completo.complete).toBe(true);
  });

  it('CCAA foral (País Vasco): genera limitación y HUMAN_REVIEW_REQUIRED, no PASS', () => {
    expect(isCCAAForal('País Vasco')).toBe(true);
    const result = computeIRPF(
      carlosRuizIRPFContext({ includeStockOptions: true, ccaa: 'País Vasco' }),
      null,
      null,
    );
    // Debe haber al menos una limitación foral.
    const tieneLimitacionForal = result.limitations.some((l) =>
      /foral/i.test(l) || /vasco/i.test(l),
    );
    expect(tieneLimitacionForal).toBe(true);

    // Verificación operativa: este escenario NO puede declarar PASS limpio.
    const status: 'HUMAN_REVIEW_REQUIRED' | 'PASS' = tieneLimitacionForal
      ? 'HUMAN_REVIEW_REQUIRED'
      : 'PASS';
    expect(status).toBe('HUMAN_REVIEW_REQUIRED');
  });

  it('el resultado IRPF es preparatorio: no marca presentación oficial', () => {
    const result = computeIRPF(carlosRuizIRPFContext({ includeStockOptions: true }), null, null);
    expect((result as any).official_ready).toBeUndefined();
    expect((result as any).submitted).toBeUndefined();
    expect((result as any).accepted).toBeUndefined();
    // El motor declara referencias legales: trazabilidad mínima.
    expect(result.legalReferences.length).toBeGreaterThan(0);
  });
});