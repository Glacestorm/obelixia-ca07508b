/**
 * B6 — Collective Agreements Classifier (CNAE / Territory)
 *
 * PURE module. No DB, no React, no fetch. Given a list of unified
 * collective agreements (already loaded from the data layer or registry)
 * and an activity descriptor, returns a deterministic ranking of
 * candidates with reasons and warnings.
 *
 * HARD CONTRACT — DO NOT RELAX:
 *  - Never decides the applicable agreement automatically.
 *  - Always returns `noAutomaticDecision: true`.
 *  - When more than one candidate is plausible, sets
 *    `requiresHumanSelection: true`.
 *  - Never elevates `ready_for_payroll`.
 *  - Never touches the operational table, payroll engines, or DB.
 *
 * The classifier is intended to feed:
 *  - Future UI suggestion panels (read-only).
 *  - Onboarding wizards that propose candidates for human selection.
 *  - Reports that explain why an agreement was/was not suggested.
 */

import type { UnifiedCollectiveAgreement } from '@/lib/hr/collectiveAgreementRegistry';

// =============================================================
// Types
// =============================================================

export type ClassifierWarningCode =
  | 'AGREEMENT_NOT_READY_FOR_PAYROLL'
  | 'SALARY_TABLES_NOT_LOADED'
  | 'SOURCE_NOT_OFFICIALLY_VALIDATED'
  | 'METADATA_ONLY'
  | 'BAKERY_WORKSHOP_REQUIRES_HUMAN_VALIDATION'
  | 'MIXED_ACTIVITY_BAKERY_AND_HOSPITALITY'
  | 'TAKE_AWAY_VS_ON_PREMISE_REVIEW_REQUIRED'
  | 'RETAIL_WITHOUT_WORKSHOP_REVIEW'
  | 'NO_TERRITORIAL_MATCH'
  | 'NO_CNAE_MATCH'
  | 'MULTIPLE_CANDIDATES_HUMAN_SELECTION_REQUIRED'
  | 'JURISDICTION_FALLBACK_NATIONAL'
  | 'NO_CANDIDATES_FOUND';

export interface AgreementCandidate {
  internal_code: string;
  official_name: string;
  score: number;
  reasons: string[];
  warnings: ClassifierWarningCode[];
  source_quality: string;
  data_completeness: string;
  ready_for_payroll: boolean;
  requires_human_review: boolean;
}

export interface CollectiveAgreementClassificationResult {
  candidates: AgreementCandidate[];
  warnings: ClassifierWarningCode[];
  requiresHumanSelection: boolean;
  confidence: 'high' | 'medium' | 'low';
  noAutomaticDecision: true;
}

export interface ClassifierInput {
  agreements: UnifiedCollectiveAgreement[];
  cnae: string;
  jurisdictionCode?: string;
  autonomousRegion?: string;
  provinceCode?: string;
  hasBakeryWorkshop?: boolean;
  hasRetailShop?: boolean;
  hasOnPremiseConsumption?: boolean;
  hasBroadFoodManufacturing?: boolean;
  sectorKeywords?: string[];
}

// =============================================================
// Score weights — deterministic
// =============================================================

const W_CNAE_EXACT = 50;
const W_CNAE_PREFIX2 = 20;
const W_PROVINCE_MATCH = 25;
const W_REGION_MATCH = 20;
const W_JURISDICTION_EXACT = 15;
const W_NATIONAL_FALLBACK = 5;
const W_BAKERY_WORKSHOP_BONUS = 30;
const W_RETAIL_GENERIC_BONUS = 15;
const W_HOSPITALITY_BONUS = 25;
const W_FOOD_INDUSTRY_BONUS = 20;
const W_KEYWORD_MATCH = 8;
const W_OFFICIAL_QUALITY = 5;
const W_PAYROLL_READY = 5;

const BAKERY_KEYWORDS = ['panader', 'pasteler', 'bolleria', 'bolleria', 'bollería', 'obrador'];
const HOSPITALITY_KEYWORDS = ['hosteler', 'restaur', 'cafeter', 'bar'];
const FOOD_INDUSTRY_KEYWORDS = ['aliment', 'industria alimentaria'];
const RETAIL_KEYWORDS = ['comerc', 'retail', 'tienda'];

function normalizeStr(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function nameMatchesAny(agreement: UnifiedCollectiveAgreement, keywords: string[]): boolean {
  const haystack = normalizeStr(
    `${agreement.official_name ?? ''} ${agreement.short_name ?? ''} ${agreement.sector ?? ''} ${agreement.internal_code ?? ''}`
  );
  return keywords.some(k => haystack.includes(normalizeStr(k)));
}

// =============================================================
// Pure helpers
// =============================================================

export function buildAgreementClassificationWarnings(
  agreement: UnifiedCollectiveAgreement
): ClassifierWarningCode[] {
  const warnings: ClassifierWarningCode[] = [];
  if (!agreement.ready_for_payroll) warnings.push('AGREEMENT_NOT_READY_FOR_PAYROLL');
  if (!agreement.salary_tables_loaded) warnings.push('SALARY_TABLES_NOT_LOADED');
  if (agreement.source_quality !== 'official') warnings.push('SOURCE_NOT_OFFICIALLY_VALIDATED');
  if (agreement.data_completeness === 'metadata_only') warnings.push('METADATA_ONLY');
  return warnings;
}

export function scoreAgreementCandidate(
  agreement: UnifiedCollectiveAgreement,
  input: ClassifierInput
): { score: number; reasons: string[]; activityWarnings: ClassifierWarningCode[] } {
  const reasons: string[] = [];
  const activityWarnings: ClassifierWarningCode[] = [];
  let score = 0;

  const cnae = (input.cnae ?? '').trim();
  const cnaePrefix2 = cnae.slice(0, 2);
  const aCnaes = agreement.cnae_codes ?? [];

  // CNAE matching — exact > 2-digit prefix
  if (cnae && aCnaes.includes(cnae)) {
    score += W_CNAE_EXACT;
    reasons.push(`Coincidencia CNAE exacta (${cnae}).`);
  } else if (cnae && aCnaes.some(c => c.startsWith(cnaePrefix2))) {
    score += W_CNAE_PREFIX2;
    reasons.push(`Coincidencia CNAE por prefijo (${cnaePrefix2}).`);
  }

  // Territorial matching
  if (input.provinceCode && agreement.province_code === input.provinceCode) {
    score += W_PROVINCE_MATCH;
    reasons.push(`Misma provincia (${input.provinceCode}).`);
  }
  if (input.autonomousRegion && agreement.autonomous_region === input.autonomousRegion) {
    score += W_REGION_MATCH;
    reasons.push(`Misma comunidad autónoma (${input.autonomousRegion}).`);
  }
  if (input.jurisdictionCode && agreement.jurisdiction_code === input.jurisdictionCode) {
    score += W_JURISDICTION_EXACT;
    reasons.push(`Misma jurisdicción (${input.jurisdictionCode}).`);
  } else if (
    input.jurisdictionCode &&
    agreement.jurisdiction_code === 'ES' &&
    input.jurisdictionCode.startsWith('ES-')
  ) {
    score += W_NATIONAL_FALLBACK;
    reasons.push('Convenio estatal aplicable como fallback territorial.');
    activityWarnings.push('JURISDICTION_FALLBACK_NATIONAL');
  }

  // Activity-aware bonuses
  const isBakeryAgreement = nameMatchesAny(agreement, BAKERY_KEYWORDS);
  const isHospitalityAgreement = nameMatchesAny(agreement, HOSPITALITY_KEYWORDS);
  const isFoodIndustryAgreement = nameMatchesAny(agreement, FOOD_INDUSTRY_KEYWORDS);
  const isRetailAgreement = nameMatchesAny(agreement, RETAIL_KEYWORDS);

  if (input.hasBakeryWorkshop && isBakeryAgreement) {
    score += W_BAKERY_WORKSHOP_BONUS;
    reasons.push('Empresa con obrador de panadería/pastelería.');
    activityWarnings.push('BAKERY_WORKSHOP_REQUIRES_HUMAN_VALIDATION');
  }
  if (input.hasRetailShop && isRetailAgreement && !input.hasBakeryWorkshop) {
    score += W_RETAIL_GENERIC_BONUS;
    reasons.push('Punto de venta minorista sin obrador.');
    activityWarnings.push('RETAIL_WITHOUT_WORKSHOP_REVIEW');
  }
  if ((input.hasOnPremiseConsumption || cnae.startsWith('56') || cnae.startsWith('55')) && isHospitalityAgreement) {
    score += W_HOSPITALITY_BONUS;
    reasons.push('Actividad de hostelería con consumo en local.');
  }
  if (input.hasBroadFoodManufacturing && isFoodIndustryAgreement) {
    score += W_FOOD_INDUSTRY_BONUS;
    reasons.push('Fabricación alimentaria amplia.');
  }

  // Sector keywords
  if (input.sectorKeywords && input.sectorKeywords.length > 0) {
    const matches = input.sectorKeywords.filter(k => nameMatchesAny(agreement, [k]));
    if (matches.length > 0) {
      score += W_KEYWORD_MATCH * matches.length;
      reasons.push(`Coincidencia por palabras clave de sector: ${matches.join(', ')}.`);
    }
  }

  // Quality micro-bonuses (do not affect human-selection logic)
  if (agreement.source_quality === 'official') score += W_OFFICIAL_QUALITY;
  if (agreement.ready_for_payroll) score += W_PAYROLL_READY;

  // Mixed activity warning: bakery workshop + on-premise consumption
  if (input.hasBakeryWorkshop && input.hasOnPremiseConsumption) {
    activityWarnings.push('MIXED_ACTIVITY_BAKERY_AND_HOSPITALITY');
  }
  // Take-away vs on-premise ambiguity for hospitality CNAEs
  if ((cnae.startsWith('56') || cnae.startsWith('55')) && input.hasOnPremiseConsumption === false) {
    activityWarnings.push('TAKE_AWAY_VS_ON_PREMISE_REVIEW_REQUIRED');
  }

  return { score, reasons, activityWarnings };
}

/**
 * Deterministic candidate sort. Higher score first; ties broken by
 * `internal_code` ascending so the output is stable across runs and
 * platforms.
 */
export function sortAgreementCandidates(
  candidates: AgreementCandidate[]
): AgreementCandidate[] {
  return [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.internal_code.localeCompare(b.internal_code);
  });
}

function dedupeWarnings(warnings: ClassifierWarningCode[]): ClassifierWarningCode[] {
  return Array.from(new Set(warnings));
}

// =============================================================
// Main classifier
// =============================================================

export function classifyCollectiveAgreementsForCompany(
  input: ClassifierInput
): CollectiveAgreementClassificationResult {
  const globalWarnings: ClassifierWarningCode[] = [];

  if (!input.agreements || input.agreements.length === 0) {
    return {
      candidates: [],
      warnings: ['NO_CANDIDATES_FOUND'],
      requiresHumanSelection: false,
      confidence: 'low',
      noAutomaticDecision: true,
    };
  }

  const cnae = (input.cnae ?? '').trim();
  const cnaePrefix2 = cnae.slice(0, 2);

  const scored = input.agreements
    .map(agreement => {
      const { score, reasons, activityWarnings } = scoreAgreementCandidate(agreement, input);
      const safetyWarnings = buildAgreementClassificationWarnings(agreement);
      const candidate: AgreementCandidate = {
        internal_code: agreement.internal_code,
        official_name: agreement.official_name,
        score,
        reasons,
        warnings: dedupeWarnings([...safetyWarnings, ...activityWarnings]),
        source_quality: agreement.source_quality,
        data_completeness: agreement.data_completeness,
        ready_for_payroll: agreement.ready_for_payroll,
        requires_human_review: agreement.requires_human_review,
      };
      return candidate;
    })
    // Drop pure noise: candidates with score 0 and no CNAE/territory tie
    .filter(c => c.score > 0);

  const candidates = sortAgreementCandidates(scored);

  if (candidates.length === 0) {
    // Determine why nothing matched
    const anyCnaeMatch = input.agreements.some(
      a => (a.cnae_codes ?? []).includes(cnae) || (a.cnae_codes ?? []).some(c => c.startsWith(cnaePrefix2))
    );
    if (!anyCnaeMatch) globalWarnings.push('NO_CNAE_MATCH');
    if (input.jurisdictionCode) {
      const anyJurisdictionMatch = input.agreements.some(
        a =>
          a.jurisdiction_code === input.jurisdictionCode ||
          (a.jurisdiction_code === 'ES' && input.jurisdictionCode!.startsWith('ES-'))
      );
      if (!anyJurisdictionMatch) globalWarnings.push('NO_TERRITORIAL_MATCH');
    }
    globalWarnings.push('NO_CANDIDATES_FOUND');
    return {
      candidates: [],
      warnings: dedupeWarnings(globalWarnings),
      requiresHumanSelection: false,
      confidence: 'low',
      noAutomaticDecision: true,
    };
  }

  const requiresHumanSelection = candidates.length > 1;
  if (requiresHumanSelection) {
    globalWarnings.push('MULTIPLE_CANDIDATES_HUMAN_SELECTION_REQUIRED');
  }

  // Confidence is informative only — never permits automatic decision.
  const top = candidates[0];
  const second = candidates[1];
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (top.score >= 70 && (!second || top.score - second.score >= 25)) {
    confidence = 'high';
  } else if (top.score >= 40) {
    confidence = 'medium';
  }

  return {
    candidates,
    warnings: dedupeWarnings(globalWarnings),
    requiresHumanSelection,
    confidence,
    noAutomaticDecision: true,
  };
}
