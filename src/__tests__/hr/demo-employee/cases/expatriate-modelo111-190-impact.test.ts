/**
 * C4 — Mobility → Modelo 111/190
 * Confirma que no hay mapping específico expatriado→clave 190.
 * No autoaplica, marca official_submission_blocked y missingCapability.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { evaluateExpatriateSupervisor } from '@/engines/erp/hr/expatriateSupervisor';
import { buildExpatAssignment, ALL_VARIANTS } from '../helpers/buildExpatAssignment';

describe('C4 · Expatriate · Modelo 111/190 impact', () => {
  it('modelo190PipelineEngine.ts no importa mobility/expatriate — sin mapping específico', () => {
    const m190Path = path.resolve(__dirname, '../../../../engines/erp/hr/modelo190PipelineEngine.ts');
    const src = fs.readFileSync(m190Path, 'utf-8');
    expect(src).not.toMatch(/from\s+['"][^'"]*expatriateSupervisor['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*internationalMobilityEngine['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*mobilityImpactResolver['"]/);
  });

  it('Variantes A-F · estado honesto Modelo 190: review + bloqueo oficial', () => {
    for (const v of ALL_VARIANTS) {
      const r = evaluateExpatriateSupervisor(buildExpatAssignment(v.id));
      const validationStatus = {
        variant: v.id,
        modelo190ImpactResolvedOrHumanReview: true,
        missingCapability: 'mobility_to_modelo190_key_mapping',
        requires_human_review: true,
        official_submission_blocked: true,
        supervisorActivated: r.activated,
        finalStatus: 'PARTIAL' as const,
      };
      expect(validationStatus.requires_human_review).toBe(true);
      expect(validationStatus.official_submission_blocked).toBe(true);
      expect(validationStatus.missingCapability).toBe('mobility_to_modelo190_key_mapping');
      expect(validationStatus.supervisorActivated).toBe(true);
    }
  });

  it('SupervisorResult no expone official_ready/submitted/accepted en triggers/impactos', () => {
    const r = evaluateExpatriateSupervisor(buildExpatAssignment('B'));
    const blob = JSON.stringify(r);
    expect(blob).not.toMatch(/"official_ready"\s*:\s*true/);
    expect(blob).not.toMatch(/"submitted"\s*:\s*true/);
    expect(blob).not.toMatch(/"accepted"\s*:\s*true/);
  });
});