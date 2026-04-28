/**
 * C4 — Expatriados / Variantes A-F
 * Invoca evaluateExpatriateSupervisor real y valida triggers + corredor.
 * Prudencia: nunca submitted/accepted/official_ready.
 */
import { describe, it, expect } from 'vitest';
import { evaluateExpatriateSupervisor } from '@/engines/erp/hr/expatriateSupervisor';
import { buildExpatAssignment, ALL_VARIANTS } from '../helpers/buildExpatAssignment';

describe('C4 · Expatriate Supervisor · activation triggers', () => {
  for (const v of ALL_VARIANTS) {
    it(`Variante ${v.id} (${v.label}) activa supervisor con triggers esperados`, () => {
      const assignment = buildExpatAssignment(v.id);
      const r = evaluateExpatriateSupervisor(assignment);

      expect(r.activated).toBe(true);

      const trig = (id: string) => r.activationTriggers.find(t => t.id === id);
      expect(trig('country_mismatch')?.detected).toBe(true);
      expect(trig('assignment_type_international')?.detected).toBe(true);
      expect(trig('days_in_host_significant')?.detected).toBe(true);

      expect(trig('split_payroll')?.detected).toBe(v.splitPayroll);
      expect(trig('shadow_payroll')?.detected).toBe(v.shadowPayroll);
      expect(trig('pe_risk')?.detected).toBe(v.peRiskFlag);
      expect(trig('equity_mobility_overlap')?.detected).toBe(v.stockOptionsActive);

      // Corridor
      expect(r.corridorLabel).toBe(`ES↔${v.host}`);
      expect(r.hasCorridorPack).toBe(v.expectsCorridorPack);

      // Sin pack → nunca production limpio
      if (!r.hasCorridorPack) {
        expect(r.overallSupportLevel).not.toBe('supported_production');
      }

      // PE risk → severidad mínima review_required
      if (v.peRiskFlag) {
        expect(['review_required', 'critical_review_required']).toContain(r.worstTriggerSeverity);
      }

      // Prudencia: ningún campo de envío oficial en el resultado
      const blob = JSON.stringify(r);
      expect(blob).not.toMatch(/"official_ready"\s*:\s*true/);
      expect(blob).not.toMatch(/"submitted"\s*:\s*true/);
      expect(blob).not.toMatch(/"accepted"\s*:\s*true/);
    });
  }
});