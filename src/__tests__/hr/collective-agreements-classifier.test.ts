/**
 * B6 — Collective Agreements Classifier tests.
 *
 * Pure unit tests. The classifier is given an in-memory list of
 * UnifiedCollectiveAgreement records (mirroring the 4 Baleares seeds)
 * and asserts the deterministic ranking + warnings.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyCollectiveAgreementsForCompany,
  scoreAgreementCandidate,
  buildAgreementClassificationWarnings,
  sortAgreementCandidates,
  type AgreementCandidate,
} from '@/engines/erp/hr/collectiveAgreementClassifier';
import type { UnifiedCollectiveAgreement } from '@/lib/hr/collectiveAgreementRegistry';

function makeAgreement(
  partial: Partial<UnifiedCollectiveAgreement> & {
    internal_code: string;
    official_name: string;
  }
): UnifiedCollectiveAgreement {
  return {
    internal_code: partial.internal_code,
    agreement_code: null,
    official_name: partial.official_name,
    short_name: partial.short_name ?? partial.official_name,
    cnae_codes: partial.cnae_codes ?? [],
    jurisdiction_code: partial.jurisdiction_code ?? 'ES-IB',
    province_code: partial.province_code ?? null,
    autonomous_region: partial.autonomous_region ?? 'IB',
    sector: partial.sector ?? null,
    sourceLayer: partial.sourceLayer ?? 'registry',
    source_quality: partial.source_quality ?? 'pending_official_validation',
    data_completeness: partial.data_completeness ?? 'metadata_only',
    status: partial.status ?? 'pendiente_validacion',
    salary_tables_loaded: partial.salary_tables_loaded ?? false,
    ready_for_payroll: partial.ready_for_payroll ?? false,
    requires_human_review: partial.requires_human_review ?? true,
    official_submission_blocked: partial.official_submission_blocked ?? true,
    notes: partial.notes ?? null,
    warnings: partial.warnings ?? [],
  };
}

const COM_GEN_IB = makeAgreement({
  internal_code: 'COM-GEN-IB',
  official_name: 'Convenio Colectivo de Comercio en General de las Illes Balears',
  cnae_codes: ['47'],
  sector: 'Comercio',
});
const PAN_PAST_IB = makeAgreement({
  internal_code: 'PAN-PAST-IB',
  official_name: 'Convenio Colectivo de Industrias de Panadería y Pastelería de las Illes Balears',
  cnae_codes: ['1071', '1072', '4724'],
  sector: 'Panadería y Pastelería',
});
const HOST_IB = makeAgreement({
  internal_code: 'HOST-IB',
  official_name: 'Convenio Colectivo de Hostelería de las Illes Balears',
  cnae_codes: ['55', '56'],
  sector: 'Hostelería',
});
const IND_ALIM_IB = makeAgreement({
  internal_code: 'IND-ALIM-IB',
  official_name: 'Convenio Colectivo de Industria Alimentaria de las Illes Balears',
  cnae_codes: ['10'],
  sector: 'Industria Alimentaria',
});

const ALL = [COM_GEN_IB, PAN_PAST_IB, HOST_IB, IND_ALIM_IB];

describe('B6 — collectiveAgreementClassifier', () => {
  it('1. CNAE 1071 + obrador en ES-IB prioriza PAN-PAST-IB', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '1071',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
      hasBakeryWorkshop: true,
    });
    expect(r.candidates[0].internal_code).toBe('PAN-PAST-IB');
    expect(r.noAutomaticDecision).toBe(true);
  });

  it('2. CNAE 1072 + obrador prioriza PAN-PAST-IB', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '1072',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
      hasBakeryWorkshop: true,
    });
    expect(r.candidates[0].internal_code).toBe('PAN-PAST-IB');
  });

  it('3. CNAE 4724 devuelve PAN-PAST-IB y COM-GEN-IB', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '4724',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
    });
    const codes = r.candidates.map(c => c.internal_code);
    expect(codes).toContain('PAN-PAST-IB');
    expect(codes).toContain('COM-GEN-IB');
    expect(r.requiresHumanSelection).toBe(true);
  });

  it('4. CNAE 4724 + obrador pone PAN-PAST-IB primero', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '4724',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
      hasBakeryWorkshop: true,
    });
    expect(r.candidates[0].internal_code).toBe('PAN-PAST-IB');
  });

  it('5. CNAE 4724 + solo tienda exige selección humana', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '4724',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
      hasRetailShop: true,
    });
    const codes = r.candidates.map(c => c.internal_code);
    expect(codes).toContain('COM-GEN-IB');
    expect(codes).toContain('PAN-PAST-IB');
    expect(r.requiresHumanSelection).toBe(true);
    // COM-GEN-IB at least tied or ahead
    const com = r.candidates.find(c => c.internal_code === 'COM-GEN-IB')!;
    const pan = r.candidates.find(c => c.internal_code === 'PAN-PAST-IB')!;
    expect(com.score).toBeGreaterThanOrEqual(pan.score);
  });

  it('6. CNAE 47 genérico devuelve COM-GEN-IB', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '47',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
    });
    expect(r.candidates[0].internal_code).toBe('COM-GEN-IB');
  });

  it('7. CNAE 47 + obrador añade warning y candidato PAN-PAST-IB', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '4711',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
      hasBakeryWorkshop: true,
    });
    const codes = r.candidates.map(c => c.internal_code);
    expect(codes).toContain('PAN-PAST-IB');
    const pan = r.candidates.find(c => c.internal_code === 'PAN-PAST-IB')!;
    expect(pan.warnings).toContain('BAKERY_WORKSHOP_REQUIRES_HUMAN_VALIDATION');
  });

  it('8. CNAE 56 devuelve HOST-IB', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '56',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
      hasOnPremiseConsumption: true,
    });
    expect(r.candidates[0].internal_code).toBe('HOST-IB');
  });

  it('9. CNAE 10 + fabricación amplia devuelve IND-ALIM-IB', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '10',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
      hasBroadFoodManufacturing: true,
    });
    expect(r.candidates[0].internal_code).toBe('IND-ALIM-IB');
  });

  it('10. Actividad mixta obrador + consumo local devuelve PAN-PAST-IB y HOST-IB', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '56',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
      hasBakeryWorkshop: true,
      hasOnPremiseConsumption: true,
    });
    const codes = r.candidates.map(c => c.internal_code);
    expect(codes).toContain('HOST-IB');
    // PAN-PAST-IB shows up via bakery workshop bonus
    expect(codes).toContain('PAN-PAST-IB');
    const anyMixedWarning = r.candidates.some(c =>
      c.warnings.includes('MIXED_ACTIVITY_BAKERY_AND_HOSPITALITY')
    );
    expect(anyMixedWarning).toBe(true);
  });

  it('11. Todos los candidatos metadata_only tienen warning METADATA_ONLY', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '4724',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
    });
    for (const c of r.candidates) {
      expect(c.warnings).toContain('METADATA_ONLY');
    }
  });

  it('12. Todos los candidatos sin tablas salariales tienen warning SALARY_TABLES_NOT_LOADED', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '4724',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
    });
    for (const c of r.candidates) {
      expect(c.warnings).toContain('SALARY_TABLES_NOT_LOADED');
    }
  });

  it('13. Todos los candidatos no official tienen warning SOURCE_NOT_OFFICIALLY_VALIDATED', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '4724',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
    });
    for (const c of r.candidates) {
      expect(c.warnings).toContain('SOURCE_NOT_OFFICIALLY_VALIDATED');
    }
  });

  it('14. Resultado siempre tiene noAutomaticDecision=true', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '1071',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
      hasBakeryWorkshop: true,
    });
    expect(r.noAutomaticDecision).toBe(true);
    const empty = classifyCollectiveAgreementsForCompany({
      agreements: [],
      cnae: '9999',
    });
    expect(empty.noAutomaticDecision).toBe(true);
  });

  it('15. Si hay más de un candidato, requiresHumanSelection=true', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '4724',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
    });
    expect(r.candidates.length).toBeGreaterThan(1);
    expect(r.requiresHumanSelection).toBe(true);
    expect(r.warnings).toContain('MULTIPLE_CANDIDATES_HUMAN_SELECTION_REQUIRED');
  });

  it('16. Ningún candidato se marca como definitivo', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '1071',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
      hasBakeryWorkshop: true,
    });
    for (const c of r.candidates) {
      // Result type guarantees no "definitive" flag exists, but assert
      // safety properties remain conservative.
      expect(c.ready_for_payroll).toBe(false);
      expect(c.requires_human_review).toBe(true);
    }
  });

  it('17. Ranking es determinista (mismo input → mismo orden)', () => {
    const a = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '4724',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
    });
    const b = classifyCollectiveAgreementsForCompany({
      agreements: [...ALL].reverse(),
      cnae: '4724',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
    });
    expect(a.candidates.map(c => c.internal_code)).toEqual(
      b.candidates.map(c => c.internal_code)
    );
  });

  it('18. Sin agreements devuelve NO_CANDIDATES_FOUND', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: [],
      cnae: '1071',
    });
    expect(r.candidates).toEqual([]);
    expect(r.warnings).toContain('NO_CANDIDATES_FOUND');
    expect(r.confidence).toBe('low');
  });

  it('19. CNAE no representado emite NO_CNAE_MATCH', () => {
    const r = classifyCollectiveAgreementsForCompany({
      agreements: ALL,
      cnae: '9999',
      jurisdictionCode: 'ES-IB',
    });
    expect(r.candidates).toEqual([]);
    expect(r.warnings).toContain('NO_CNAE_MATCH');
  });

  it('20. Helper scoreAgreementCandidate es puro', () => {
    const { score, reasons } = scoreAgreementCandidate(PAN_PAST_IB, {
      agreements: ALL,
      cnae: '1071',
      jurisdictionCode: 'ES-IB',
      autonomousRegion: 'IB',
      hasBakeryWorkshop: true,
    });
    expect(score).toBeGreaterThan(0);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it('21. buildAgreementClassificationWarnings refleja el perfil de seguridad', () => {
    const w = buildAgreementClassificationWarnings(PAN_PAST_IB);
    expect(w).toContain('AGREEMENT_NOT_READY_FOR_PAYROLL');
    expect(w).toContain('SALARY_TABLES_NOT_LOADED');
    expect(w).toContain('SOURCE_NOT_OFFICIALLY_VALIDATED');
    expect(w).toContain('METADATA_ONLY');
  });

  it('22. sortAgreementCandidates ordena por score desc y desempata por internal_code', () => {
    const a: AgreementCandidate = {
      internal_code: 'B-CODE',
      official_name: 'b',
      score: 10,
      reasons: [],
      warnings: [],
      source_quality: 'pending_official_validation',
      data_completeness: 'metadata_only',
      ready_for_payroll: false,
      requires_human_review: true,
    };
    const b: AgreementCandidate = { ...a, internal_code: 'A-CODE' };
    const c: AgreementCandidate = { ...a, internal_code: 'Z-CODE', score: 50 };
    const sorted = sortAgreementCandidates([a, b, c]);
    expect(sorted.map(x => x.internal_code)).toEqual(['Z-CODE', 'A-CODE', 'B-CODE']);
  });
});
