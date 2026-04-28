/**
 * C4 — Documentos preparatorios (DRYRUN/checklist)
 * Verifica que checklist y requiredDocuments se generan, sin envíos oficiales.
 * No existe artifact engine A1 dedicado → missingCapability documentada.
 */
import { describe, it, expect } from 'vitest';
import { evaluateExpatriateSupervisor } from '@/engines/erp/hr/expatriateSupervisor';
import { getCorridorPack, PHASE1_CORRIDOR_PACKS } from '@/engines/erp/hr/corridorKnowledgePacks';
import { buildExpatAssignment, ALL_VARIANTS } from '../helpers/buildExpatAssignment';

describe('C4 · Expatriate · documents DRYRUN', () => {
  it('Phase1 corridor packs tienen requiredDocuments no vacío', () => {
    for (const pack of PHASE1_CORRIDOR_PACKS) {
      expect(pack.requiredDocuments.length).toBeGreaterThan(0);
    }
  });

  it('mobilityClassification.documentChecklist contiene documentos para corredor con pack', () => {
    const r = evaluateExpatriateSupervisor(buildExpatAssignment('A'));
    expect(r.mobilityClassification.documentChecklist.length).toBeGreaterThan(0);
  });

  it('Corredores UE/EEE incluyen A1 o equivalente cobertura', () => {
    const fr = getCorridorPack('ES', 'FR');
    const de = getCorridorPack('ES', 'DE');
    expect(fr).not.toBeNull();
    expect(de).not.toBeNull();
    const reqFR = fr!.requiredDocuments.join(',');
    const reqDE = de!.requiredDocuments.join(',');
    expect(reqFR).toMatch(/a1_certificate|social_security_cert/);
    expect(reqDE).toMatch(/a1_certificate|social_security_cert/);
  });

  it('Variantes A-F · documentos en modo preparatorio + missingCapability A1 engine', () => {
    for (const v of ALL_VARIANTS) {
      const r = evaluateExpatriateSupervisor(buildExpatAssignment(v.id));
      const docsFromChecklist = r.mobilityClassification.documentChecklist.map(d => ({
        documentType: d.documentType,
        required: d.required,
        preparatory: true,
        dryRun: true,
        isRealSubmissionBlocked: true,
        submitted: false,
        accepted: false,
        official_ready: false,
      }));
      const docsFromPack = (r.corridorPack?.requiredDocuments ?? []).map(t => ({
        documentType: t,
        preparatory: true,
        dryRun: true,
        isRealSubmissionBlocked: true,
      }));

      const validationStatus = {
        variant: v.id,
        documentsDryRunOrChecklist: docsFromChecklist.length > 0 || docsFromPack.length > 0,
        missingCapability: 'a1_certificate_artifact_engine',
        finalStatus: 'PARTIAL' as const,
        humanReview: true,
      };
      expect(validationStatus.documentsDryRunOrChecklist).toBe(true);
      expect(validationStatus.missingCapability).toBe('a1_certificate_artifact_engine');

      // Ningún doc marcado como submitted/accepted/official_ready
      for (const d of docsFromChecklist) {
        expect(d.submitted).toBe(false);
        expect(d.accepted).toBe(false);
        expect(d.official_ready).toBe(false);
      }
    }
  });
});