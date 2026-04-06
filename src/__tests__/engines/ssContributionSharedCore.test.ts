import { describe, it, expect } from 'vitest';
import {
  SS_CONTRIBUTION_RATES_2026,
  SS_GROUP_BASES_2026,
  SS_GROUP_MIN_BASES_MENSUAL_2026,
  SS_BASE_MAX_MENSUAL_2026,
  SS_BASE_MAX_DIARIA_2026,
} from '@/shared/legal/rules/ssRules2026';

/**
 * F8+F10 — Verifies Shared Legal Core canonical values match RDL 3/2026.
 */
describe('SS Contribution Shared Core — canonical values 2026', () => {
  it('CC empresa = 23.60, trabajador = 4.70', () => {
    expect(SS_CONTRIBUTION_RATES_2026.contingenciasComunes.empresa).toBe(23.60);
    expect(SS_CONTRIBUTION_RATES_2026.contingenciasComunes.trabajador).toBe(4.70);
  });

  it('Desempleo indefinido empresa = 5.50, trabajador = 1.55', () => {
    expect(SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.empresa).toBe(5.50);
    expect(SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.trabajador).toBe(1.55);
  });

  it('Desempleo temporal empresa = 6.70, trabajador = 1.60', () => {
    expect(SS_CONTRIBUTION_RATES_2026.desempleoTemporal.empresa).toBe(6.70);
    expect(SS_CONTRIBUTION_RATES_2026.desempleoTemporal.trabajador).toBe(1.60);
  });

  it('FOGASA = 0.20, FP empresa = 0.60, FP trabajador = 0.10', () => {
    expect(SS_CONTRIBUTION_RATES_2026.fogasa.empresa).toBe(0.20);
    expect(SS_CONTRIBUTION_RATES_2026.formacionProfesional.empresa).toBe(0.60);
    expect(SS_CONTRIBUTION_RATES_2026.formacionProfesional.trabajador).toBe(0.10);
  });

  it('MEI total = 0.90 (empresa 0.75 + trabajador 0.15)', () => {
    expect(SS_CONTRIBUTION_RATES_2026.mei.total).toBe(0.90);
    expect(SS_CONTRIBUTION_RATES_2026.mei.empresa).toBe(0.75);
    expect(SS_CONTRIBUTION_RATES_2026.mei.trabajador).toBe(0.15);
  });

  it('AT/EP referencia empresa = 1.50', () => {
    expect(SS_CONTRIBUTION_RATES_2026.atepReferencia.empresa).toBe(1.50);
  });

  // F10 — Group base equivalence tests
  it('G1 base mínima = 1929.00 (RDL 3/2026)', () => {
    expect(SS_GROUP_BASES_2026[1].minMensual).toBe(1929.00);
    expect(SS_GROUP_MIN_BASES_MENSUAL_2026[1]).toBe(1929.00);
  });

  it('G2 base mínima = 1599.60, G3 = 1391.70', () => {
    expect(SS_GROUP_BASES_2026[2].minMensual).toBe(1599.60);
    expect(SS_GROUP_BASES_2026[3].minMensual).toBe(1391.70);
  });

  it('G8 base mínima diaria = 46.04', () => {
    expect(SS_GROUP_BASES_2026[8].minMensual).toBe(46.04);
    expect(SS_GROUP_BASES_2026[8].isDailyBase).toBe(true);
  });

  it('All groups 4-11 min mensual = 1381.20', () => {
    for (let g = 4; g <= 11; g++) {
      expect(SS_GROUP_MIN_BASES_MENSUAL_2026[g]).toBe(1381.20);
    }
  });

  it('Base máxima mensual = 5101.20, diaria = 170.04', () => {
    expect(SS_BASE_MAX_MENSUAL_2026).toBe(5101.20);
    expect(SS_BASE_MAX_DIARIA_2026).toBe(170.04);
  });
});
