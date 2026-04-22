import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SS_BASE_MAX_MENSUAL_2026,
  SS_GROUP_MIN_BASES_MENSUAL_2026,
  SS_CONTRIBUTION_RATES_2026,
} from '@/shared/legal/rules/ssRules2026';

/**
 * S9.21k — Guardrail: el edge function `payroll-calculation-engine` no puede
 * importar el shared legal core (Deno aislado), pero DEBE mirrorearlo.
 * Este test parsea los literales del index.ts y los compara con los canónicos.
 */
describe('payroll-calculation-engine backend mirrors shared legal core', () => {
  const backendPath = join(process.cwd(), 'supabase/functions/payroll-calculation-engine/index.ts');
  const src = readFileSync(backendPath, 'utf-8');

  it('SS_BASE_MAX matches shared core', () => {
    const m = src.match(/const SS_BASE_MAX = ([\d.]+);/);
    expect(m).not.toBeNull();
    expect(parseFloat(m![1])).toBe(SS_BASE_MAX_MENSUAL_2026);
  });

  it('SS_GROUP_MIN[1..11] matches canonical mensual bases', () => {
    for (let g = 1; g <= 11; g++) {
      const re = new RegExp(`\\b${g}:\\s*([\\d.]+)`);
      const m = src.match(re);
      expect(m, `Group ${g} not found`).not.toBeNull();
      expect(parseFloat(m![1])).toBe(SS_GROUP_MIN_BASES_MENSUAL_2026[g]);
    }
  });

  it('SS_EMPLOYER_RATES matches canonical', () => {
    const block = src.match(/const SS_EMPLOYER_RATES = \{([^}]+)\}/)![1];
    expect(block).toContain(`cc: ${SS_CONTRIBUTION_RATES_2026.contingenciasComunes.empresa}`);
    expect(block).toContain(`mei: ${SS_CONTRIBUTION_RATES_2026.mei.empresa}`);
    expect(block).toContain(`fogasa: ${SS_CONTRIBUTION_RATES_2026.fogasa.empresa}`);
    expect(block).toContain(`fp: ${SS_CONTRIBUTION_RATES_2026.formacionProfesional.empresa}`);
  });

  it('SS_EMPLOYEE_RATES matches canonical', () => {
    const block = src.match(/const SS_EMPLOYEE_RATES = \{([^}]+)\}/)![1];
    expect(block).toContain(`cc: ${SS_CONTRIBUTION_RATES_2026.contingenciasComunes.trabajador}`);
    expect(block).toContain(`mei: ${SS_CONTRIBUTION_RATES_2026.mei.trabajador}`);
    expect(block).toContain(`fp: ${SS_CONTRIBUTION_RATES_2026.formacionProfesional.trabajador}`);
  });
});