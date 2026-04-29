/**
 * B10C.2A — Pure mapping preview helper:
 * company / contract / employee → registry agreement candidate.
 *
 * HARD SAFETY (B10C.2A):
 *  - Pure: no Supabase, no fetch, no React, no hooks, no DB, no storage.
 *  - Does NOT import the operative agreement resolver, salary normalizer,
 *    payroll engine, payslip engine, payroll bridge, registry shadow flag,
 *    registry shadow preview, comparator or safety gate.
 *  - Does NOT touch the operative table (erp_hr_collective_agreements).
 *  - Does NOT write ready_for_payroll, does NOT activate any flag,
 *    does NOT auto-apply mapping to payroll.
 *  - Output ALWAYS sets requiresHumanSelection: true. Even when a clear
 *    recommended candidate exists, the human MUST confirm in B10C.2B/B10D.
 */

import type {
  RegistryAgreementSnapshot,
  RegistryAgreementVersionSnapshot,
  RegistryAgreementSourceSnapshot,
} from './registryAwareAgreementResolver';

// ===================== Types =====================

export interface CompanySnapshot {
  company_id: string;
  cnae_codes: string[];
  province_code?: string;
  autonomous_region?: string;
  sector?: string;
  legacy_operative_agreement_code?: string;
}

export interface EmployeeContractSnapshot {
  employee_id?: string;
  contract_id?: string;
  professional_group?: string;
  category?: string;
  work_center_province?: string;
  work_center_region?: string;
}

export interface RegistryAgreementCandidateInput {
  agreement: RegistryAgreementSnapshot;
  version: RegistryAgreementVersionSnapshot | null;
  source: RegistryAgreementSourceSnapshot | null;
  cnae_codes?: string[];
  province_code?: string;
  autonomous_region?: string;
  scope_type?: string;
  effective_end_date?: string | null;
  sector?: string;
  name_match_only?: boolean;
}

export interface RankedCandidateSignal {
  key: string;
  weight: number;
  matched: boolean;
  note?: string;
}

export interface RankedCandidate {
  registry_agreement_id: string;
  registry_version_id: string | null;
  score: number;
  signals: RankedCandidateSignal[];
  blockers: string[];
  warnings: string[];
  payroll_ready: boolean;
}

export interface MappingPreviewInput {
  company: CompanySnapshot;
  contract?: EmployeeContractSnapshot;
  candidates: RegistryAgreementCandidateInput[];
  today?: string; // ISO yyyy-mm-dd
}

export interface MappingPreviewResult {
  candidates: RankedCandidate[];
  recommendedCandidateId?: string;
  confidence: number;
  warnings: string[];
  blockers: string[];
  requiresHumanSelection: true;
}

// ===================== Helpers =====================

const WEIGHTS = {
  cnae: 25,
  province: 15,
  region: 10,
  sector: 8,
  legacyCode: 12,
  readyForPayroll: 10,
  versionCurrent: 8,
  sourceOfficial: 7,
  humanValidated: 5,
  inForce: 5,
  nameOnly: 0,
} as const;

const RECOMMEND_MARGIN = 20;

function norm(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function isExpired(effectiveEnd: string | null | undefined, today: string | undefined): boolean {
  if (!effectiveEnd) return false;
  const ref = (today ?? '').trim();
  if (!ref) return false;
  // ISO yyyy-mm-dd lexicographic comparison is correct.
  return effectiveEnd < ref;
}

function rankCandidate(
  candidate: RegistryAgreementCandidateInput,
  company: CompanySnapshot,
  contract: EmployeeContractSnapshot | undefined,
  today: string | undefined,
): RankedCandidate {
  const signals: RankedCandidateSignal[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // ---------- CNAE ----------
  const candCnae = (candidate.cnae_codes ?? []).map(norm).filter(Boolean);
  const compCnae = (company.cnae_codes ?? []).map(norm).filter(Boolean);
  const cnaeMatch = compCnae.some((c) => candCnae.includes(c));
  signals.push({ key: 'cnae_exact', weight: WEIGHTS.cnae, matched: cnaeMatch });
  if (cnaeMatch) score += WEIGHTS.cnae;

  // ---------- Province ----------
  const provinceFromContract = norm(contract?.work_center_province);
  const provinceFromCompany = norm(company.province_code);
  const effectiveProvince = provinceFromContract || provinceFromCompany;
  const provinceMatch = !!effectiveProvince && norm(candidate.province_code) === effectiveProvince;
  signals.push({
    key: 'province',
    weight: WEIGHTS.province,
    matched: provinceMatch,
    note: provinceFromContract ? 'work_center_province' : 'company.province_code',
  });
  if (provinceMatch) score += WEIGHTS.province;

  // ---------- Region ----------
  const regionFromContract = norm(contract?.work_center_region);
  const regionFromCompany = norm(company.autonomous_region);
  const effectiveRegion = regionFromContract || regionFromCompany;
  const regionMatch = !!effectiveRegion && norm(candidate.autonomous_region) === effectiveRegion;
  signals.push({
    key: 'autonomous_region',
    weight: WEIGHTS.region,
    matched: regionMatch,
    note: regionFromContract ? 'work_center_region' : 'company.autonomous_region',
  });
  if (regionMatch) score += WEIGHTS.region;

  // ---------- Sector ----------
  const sectorMatch = !!norm(company.sector) && norm(candidate.sector) === norm(company.sector);
  signals.push({ key: 'sector', weight: WEIGHTS.sector, matched: sectorMatch });
  if (sectorMatch) score += WEIGHTS.sector;

  // ---------- Legacy operative code (soft) ----------
  const legacyCode = norm(company.legacy_operative_agreement_code);
  const legacyMatch = !!legacyCode && norm(candidate.agreement.internal_code) === legacyCode;
  signals.push({
    key: 'legacy_operative_code',
    weight: WEIGHTS.legacyCode,
    matched: legacyMatch,
    note: 'soft_signal_does_not_decide_alone',
  });
  if (legacyMatch) score += WEIGHTS.legacyCode;

  // ---------- ready_for_payroll ----------
  const readyOk = candidate.agreement.ready_for_payroll === true;
  signals.push({ key: 'ready_for_payroll', weight: WEIGHTS.readyForPayroll, matched: readyOk });
  if (readyOk) {
    score += WEIGHTS.readyForPayroll;
  } else {
    blockers.push('not_payroll_ready');
  }

  // ---------- version current ----------
  const versionOk = !!candidate.version && candidate.version.is_current === true;
  signals.push({ key: 'version_current', weight: WEIGHTS.versionCurrent, matched: versionOk });
  if (versionOk) {
    score += WEIGHTS.versionCurrent;
  } else {
    blockers.push('version_not_current');
  }

  // ---------- source official ----------
  const sourceOk = !!candidate.source && candidate.source.source_quality === 'official';
  signals.push({ key: 'source_official', weight: WEIGHTS.sourceOfficial, matched: sourceOk });
  if (sourceOk) {
    score += WEIGHTS.sourceOfficial;
  } else {
    blockers.push('source_not_official');
  }

  // ---------- human validated ----------
  const humanValidatedOk = candidate.agreement.data_completeness === 'human_validated';
  signals.push({ key: 'human_validated', weight: WEIGHTS.humanValidated, matched: humanValidatedOk });
  if (humanValidatedOk) {
    score += WEIGHTS.humanValidated;
  } else {
    blockers.push('not_human_validated');
  }

  // ---------- in force ----------
  const expired = isExpired(candidate.effective_end_date, today);
  const inForceOk = !expired;
  signals.push({
    key: 'in_force',
    weight: WEIGHTS.inForce,
    matched: inForceOk,
    note: candidate.effective_end_date ?? 'no_end_date',
  });
  if (inForceOk) {
    score += WEIGHTS.inForce;
  } else {
    blockers.push('expired');
  }

  // ---------- name-only match (warning, weight 0) ----------
  if (candidate.name_match_only === true) {
    signals.push({
      key: 'name_only_match',
      weight: WEIGHTS.nameOnly,
      matched: true,
      note: 'soft_text_match_does_not_score',
    });
    warnings.push('name_only_match_not_decisive');
  }

  // ---------- payroll_ready aggregate ----------
  const requiresHumanReviewBlock = candidate.agreement.requires_human_review === true;
  if (requiresHumanReviewBlock) {
    blockers.push('requires_human_review');
  }

  const payrollReady =
    readyOk &&
    !requiresHumanReviewBlock &&
    humanValidatedOk &&
    versionOk &&
    sourceOk &&
    inForceOk;

  // Deduplicate blockers/warnings deterministically.
  const dedupedBlockers = Array.from(new Set(blockers));
  const dedupedWarnings = Array.from(new Set(warnings));

  return {
    registry_agreement_id: candidate.agreement.id,
    registry_version_id: candidate.version?.id ?? null,
    score,
    signals,
    blockers: dedupedBlockers,
    warnings: dedupedWarnings,
    payroll_ready: payrollReady,
  };
}

function sortDeterministic(a: RankedCandidate, b: RankedCandidate): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.blockers.length !== b.blockers.length) {
    return a.blockers.length - b.blockers.length;
  }
  if (a.registry_agreement_id < b.registry_agreement_id) return -1;
  if (a.registry_agreement_id > b.registry_agreement_id) return 1;
  return 0;
}

// ===================== Main =====================

export function previewRegistryAgreementMapping(
  input: MappingPreviewInput,
): MappingPreviewResult {
  const candidates = Array.isArray(input.candidates) ? input.candidates : [];

  if (candidates.length === 0) {
    return {
      candidates: [],
      confidence: 0,
      blockers: ['no_candidates'],
      warnings: [],
      requiresHumanSelection: true,
    };
  }

  const ranked = candidates
    .map((c) => rankCandidate(c, input.company, input.contract, input.today))
    .sort(sortDeterministic);

  const eligible = ranked.filter((r) => r.payroll_ready && r.blockers.length === 0);

  const warnings: string[] = [];
  const blockers: string[] = [];

  let recommendedCandidateId: string | undefined;
  let confidence = 0;

  if (eligible.length === 0) {
    blockers.push('no_payroll_ready_candidate');
    confidence = 0;
  } else {
    const top = eligible[0];
    const second = eligible[1];
    const margin = second ? top.score - second.score : Infinity;

    if (margin >= RECOMMEND_MARGIN) {
      recommendedCandidateId = top.registry_agreement_id;
      // Confidence proxied as min(score, 100); never absolute certainty.
      confidence = Math.max(0, Math.min(100, top.score));
    } else {
      warnings.push('ambiguous_candidates_require_human_selection');
      confidence = Math.max(0, Math.min(100, Math.round(top.score / 2)));
    }
  }

  // Surface name-only warnings at the global level too if any candidate has them.
  if (ranked.some((r) => r.warnings.includes('name_only_match_not_decisive'))) {
    if (!warnings.includes('name_only_match_present')) {
      warnings.push('name_only_match_present');
    }
  }

  return {
    candidates: ranked,
    recommendedCandidateId,
    confidence,
    warnings,
    blockers,
    requiresHumanSelection: true,
  };
}