import { describe, it, expect } from 'vitest';
import { SS_CONTRIBUTION_RATES_2026 } from '@/shared/legal/rules/ssRules2026';

/**
 * F8 — Verifies that Shared Legal Core canonical rates match expected 2026 values.
 * Guards against silent drift in the shared core constants.
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
});
