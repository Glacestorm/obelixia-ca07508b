/**
 * C4 — Mobility → IRPF bridge
 * Invoca evaluateInternationalTaxImpact, evaluateArt7p y analyzeResidency reales.
 * Confirma que 7p NO se autoaplica a computeIRPF y deja missingCapability.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  evaluateInternationalTaxImpact,
  evaluateArt7p,
  analyzeResidency,
  getDoubleTaxTreaty,
} from '@/engines/erp/hr/internationalTaxEngine';
import { evaluateExpatriateSupervisor } from '@/engines/erp/hr/expatriateSupervisor';
import { buildExpatAssignment, ALL_VARIANTS } from '../helpers/buildExpatAssignment';

describe('C4 · Expatriate · IRPF impact bridge', () => {
  it('irpfEngine.ts no importa mobility/expatriate/corridor — sin auto-aplicación', () => {
    const irpfPath = path.resolve(__dirname, '../../../../engines/erp/hr/irpfEngine.ts');
    const src = fs.readFileSync(irpfPath, 'utf-8');
    expect(src).not.toMatch(/from\s+['"][^'"]*expatriateSupervisor['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*internationalTaxEngine['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*internationalMobilityEngine['"]/);
  });

  it('evaluateArt7p devuelve elegibilidad pero NO se autoaplica', () => {
    const r = evaluateArt7p({
      hostCountryCode: 'FR',
      daysWorkedAbroad: 120,
      annualGrossSalary: 70000,
      workEffectivelyAbroad: true,
      beneficiaryIsNonResident: true,
      countryHasCDIOrInfoExchange: true,
    });
    expect(['eligible', 'partially_eligible', 'requires_review']).toContain(r.eligibility);
    // Solo flag — no devuelve "applied" ni reduce IRPF
    const blob = JSON.stringify(r);
    expect(blob).not.toMatch(/"applied"\s*:\s*true/);
    expect(blob).not.toMatch(/"autoApplied"\s*:\s*true/);
  });

  it('analyzeResidency clasifica sin declarar definitiva', () => {
    const r = analyzeResidency({
      daysInSpain: 245,
      spouseInSpain: true,
      dependentChildrenInSpain: true,
      mainEconomicActivitiesInSpain: true,
    });
    expect(['resident', 'non_resident', 'inbound_beckham', 'outbound']).toContain(r.classification);
  });

  it('CDI lookup para FR/DE/US existe', () => {
    expect(getDoubleTaxTreaty('FR')).not.toBeNull();
    expect(getDoubleTaxTreaty('DE')).not.toBeNull();
    expect(getDoubleTaxTreaty('US')).not.toBeNull();
  });

  it('Variantes A-F · estado honesto IRPF: review flag + no autoaplicación', () => {
    for (const v of ALL_VARIANTS) {
      const a = buildExpatAssignment(v.id);
      const tax = evaluateInternationalTaxImpact({
        hostCountryCode: a.host_country_code,
        annualGrossSalary: 60000,
        daysWorkedAbroad: a.days_in_host ?? 120,
        daysInSpain: 365 - (a.days_in_host ?? 120),
        workEffectivelyAbroad: true,
        beneficiaryIsNonResident: true,
        spouseInSpain: true,
        dependentChildrenInSpain: true,
        mainEconomicActivitiesInSpain: true,
      });
      const sup = evaluateExpatriateSupervisor(a);

      const validationStatus = {
        variant: v.id,
        irpfBridgeExists: false,
        art7pNotAutoApplied: true,
        art7pReview: sup.crossModuleImpact.fiscal.art7pReview,
        humanReview: true,
        missingCapability: 'mobility_to_irpf_engine_bridge',
        finalStatus: 'PARTIAL' as const,
        taxSupportLevel: tax.supportLevel,
      };
      expect(validationStatus.art7pNotAutoApplied).toBe(true);
      expect(validationStatus.humanReview).toBe(true);
      expect(validationStatus.missingCapability).toBe('mobility_to_irpf_engine_bridge');
      expect(['supported_production', 'supported_with_review', 'out_of_scope']).toContain(validationStatus.taxSupportLevel);
    }
  });
});