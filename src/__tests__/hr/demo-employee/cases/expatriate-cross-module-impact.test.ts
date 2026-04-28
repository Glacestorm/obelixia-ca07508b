/**
 * C4 — Cross-module impact (HR/Fiscal/Legal/Audit/Preflight)
 * Valida resolveCrossModuleImpact via supervisor real.
 */
import { describe, it, expect } from 'vitest';
import { evaluateExpatriateSupervisor } from '@/engines/erp/hr/expatriateSupervisor';
import { buildExpatAssignment, EXPAT_VARIANTS } from '../helpers/buildExpatAssignment';

describe('C4 · Expatriate · crossModuleImpact', () => {
  it('A · Base ES→FR · impactos coherentes con corredor con pack', () => {
    const r = evaluateExpatriateSupervisor(buildExpatAssignment('A'));
    const cmi = r.crossModuleImpact;

    expect(cmi.hr.fieldsToUpdate.length).toBeGreaterThan(0);
    expect(cmi.hr.fieldsToUpdate).toContain('host_country_code');

    expect(cmi.legal.documentsRequired.length).toBeGreaterThan(0);
    expect(cmi.audit.packVersionUsed).toBeTruthy();
    expect(cmi.preflight.corridorActive).toBe(true);
    expect(cmi.preflight.corridorLabel).toBe('ES↔FR');
    expect(cmi.preflight.confidenceScore).toBeGreaterThan(0);

    // Tipos boolean
    expect(typeof cmi.fiscal.residencyReview).toBe('boolean');
    expect(typeof cmi.fiscal.art7pReview).toBe('boolean');
    expect(typeof cmi.fiscal.cdiApplicable).toBe('boolean');
  });

  it('B · Split payroll ES→DE · retentionAdjustment=true', () => {
    const r = evaluateExpatriateSupervisor(buildExpatAssignment('B'));
    expect(r.crossModuleImpact.fiscal.retentionAdjustment).toBe(true);
    expect(r.crossModuleImpact.preflight.reviewRequired).toBe(true);
  });

  it('C · Shadow payroll ES→US · shadowPayroll=true', () => {
    const r = evaluateExpatriateSupervisor(buildExpatAssignment('C'));
    expect(r.crossModuleImpact.fiscal.shadowPayroll).toBe(true);
    expect(r.crossModuleImpact.preflight.reviewRequired).toBe(true);
  });

  it('D · PE risk ES→FR · peAssessment=true + evidence requerida', () => {
    const r = evaluateExpatriateSupervisor(buildExpatAssignment('D'));
    expect(r.crossModuleImpact.legal.peAssessment).toBe(true);
    expect(r.crossModuleImpact.iaCenter.reviewGatesActive).toBeGreaterThan(0);
  });

  it('E · Equity overlap ES→DE · review fiscal por equity', () => {
    const r = evaluateExpatriateSupervisor(buildExpatAssignment('E'));
    // Equity overlap eleva revisión fiscal o legal según engine
    const hasEquityReview = r.reviewTriggers.some(
      t => /equity|stock|option/i.test(t.reason) || t.category === 'tax',
    );
    expect(hasEquityReview).toBe(true);
  });

  it('F · Sin pack ES→JP · packVersionUsed=null y staleWarning o ausencia', () => {
    const r = evaluateExpatriateSupervisor(buildExpatAssignment('F'));
    expect(r.hasCorridorPack).toBe(false);
    expect(r.crossModuleImpact.audit.packVersionUsed).toBeNull();
    expect(r.overallSupportLevel).not.toBe('supported_production');
  });
});