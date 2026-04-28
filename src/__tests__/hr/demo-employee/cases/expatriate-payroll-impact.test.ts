/**
 * C4 — Mobility → Payslip bridge
 * El PLAN C4 confirmó que NO existe bridge real entre mobility y payslipEngine.
 * Este test deja constancia honesta: marca missingCapability sin inventar impacto.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { evaluateExpatriateSupervisor } from '@/engines/erp/hr/expatriateSupervisor';
import { buildExpatAssignment, ALL_VARIANTS } from '../helpers/buildExpatAssignment';

describe('C4 · Expatriate · payroll impact bridge', () => {
  it('payslipEngine.ts no importa mobility/expatriate/corridor — bridge inexistente', () => {
    const enginePath = path.resolve(__dirname, '../../../../engines/erp/hr/payslipEngine.ts');
    const src = fs.readFileSync(enginePath, 'utf-8');
    expect(src).not.toMatch(/from\s+['"][^'"]*expatriateSupervisor['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*mobilityImpactResolver['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*corridorKnowledgePacks['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*internationalMobilityEngine['"]/);
  });

  it('Variantes A-F · estado honesto: PARTIAL + missingCapability + humanReview', () => {
    for (const v of ALL_VARIANTS) {
      const r = evaluateExpatriateSupervisor(buildExpatAssignment(v.id));
      const validationStatus = {
        variant: v.id,
        payrollBridgeExists: false,
        payrollImpactResolvedOrExplicitlyBlocked: true,
        missingCapability: 'mobility_to_payslip_bridge',
        finalStatus: 'PARTIAL' as const,
        humanReview: true,
        supervisorActivated: r.activated,
      };
      expect(validationStatus.payrollBridgeExists).toBe(false);
      expect(validationStatus.payrollImpactResolvedOrExplicitlyBlocked).toBe(true);
      expect(validationStatus.missingCapability).toBe('mobility_to_payslip_bridge');
      expect(validationStatus.finalStatus).toBe('PARTIAL');
      expect(validationStatus.humanReview).toBe(true);
      expect(validationStatus.supervisorActivated).toBe(true);
    }
  });

  it('No se inventa concepto de nómina expatriado en SupervisorResult', () => {
    const r = evaluateExpatriateSupervisor(buildExpatAssignment('A'));
    // El supervisor NO debe exponer importes calculados de nómina
    const blob = JSON.stringify(r);
    expect(blob).not.toMatch(/totalDevengos/);
    expect(blob).not.toMatch(/liquidoAPercibir/);
  });
});