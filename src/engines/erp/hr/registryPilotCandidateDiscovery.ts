/**
 * B10F.5C — Registry Pilot Candidate Discovery (PURE, READ-ONLY).
 *
 * Pure aggregator that, given an array of evaluated candidates from
 * `evaluatePilotCandidateReadiness` (B10F.5B preflight), groups them
 * by status, sorts deterministically by readiness_score and proposes
 * a single recommended candidate when unambiguous.
 *
 * HARD SAFETY (B10F.5C):
 *  - PURE function: no Supabase, no fetch, no Deno, no React, no hooks,
 *    no env vars, no localStorage/sessionStorage, no remote sources.
 *  - No DB writes (`.from(`, `.insert(`, `.update(`, `.delete(`,
 *    `.upsert(`, `.rpc(`).
 *  - No service_role, no SUPABASE_SERVICE_ROLE_KEY, no admin client.
 *  - No imports from useESPayrollBridge, registryShadowFlag,
 *    registryPilotGate, agreementSalaryResolver, salaryNormalizer,
 *    payrollEngine, payslipEngine, agreementSafetyGate,
 *    registryRuntimeBridgeDecision, registryPilotBridgeDecision.
 *  - Does NOT mutate flags, pilot mode or allow-list.
 *  - Does NOT touch the operative table `erp_hr_collective_agreements`.
 *  - Does NOT auto-activate any pilot scope. Output is informational.
 *  - Output is deterministic: identical input → identical output.
 *  - Does NOT mutate the input array (defensive copy).
 */

import type { RegistryPilotCandidate } from './registryPilotCandidatePreflight';

export interface PilotCandidateDiscoverySummary {
  total: number;
  ready: number;
  needsReview: number;
  blocked: number;
}

export interface PilotCandidateDiscoveryResult {
  ready: RegistryPilotCandidate[];
  needsReview: RegistryPilotCandidate[];
  blocked: RegistryPilotCandidate[];
  summary: PilotCandidateDiscoverySummary;
  recommendedCandidate?: RegistryPilotCandidate;
  recommendationReason:
    | 'single_ready'
    | 'top_score_dominates'
    | 'no_ready'
    | 'tie_no_recommendation';
}

/** Margin (points) the top READY must beat the second by to be auto-recommended. */
export const RECOMMENDATION_DOMINANCE_MARGIN = 10 as const;

function tieBreakerKey(c: RegistryPilotCandidate): string {
  return [
    c.company_id ?? '',
    c.employee_id ?? '',
    c.contract_id ?? '',
    String(c.target_year ?? 0),
    c.mapping_id ?? '',
    c.runtime_setting_id ?? '',
    c.registry_agreement_id ?? '',
    c.registry_version_id ?? '',
  ].join('|');
}

function sortByScoreDesc(arr: RegistryPilotCandidate[]): RegistryPilotCandidate[] {
  return [...arr].sort((a, b) => {
    const sa = typeof a.readiness_score === 'number' ? a.readiness_score : 0;
    const sb = typeof b.readiness_score === 'number' ? b.readiness_score : 0;
    if (sb !== sa) return sb - sa;
    // Deterministic tie-breaker: lexicographic on a stable key.
    const ka = tieBreakerKey(a);
    const kb = tieBreakerKey(b);
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return 0;
  });
}

export function buildPilotCandidateDiscoveryReport(
  candidates: ReadonlyArray<RegistryPilotCandidate>,
): PilotCandidateDiscoveryResult {
  const safe: RegistryPilotCandidate[] = Array.isArray(candidates) ? [...candidates] : [];

  const ready = sortByScoreDesc(safe.filter((c) => c?.status === 'ready'));
  const needsReview = sortByScoreDesc(safe.filter((c) => c?.status === 'needs_review'));
  const blocked = sortByScoreDesc(safe.filter((c) => c?.status === 'blocked'));

  let recommendedCandidate: RegistryPilotCandidate | undefined;
  let recommendationReason: PilotCandidateDiscoveryResult['recommendationReason'] = 'no_ready';

  if (ready.length === 1) {
    recommendedCandidate = ready[0];
    recommendationReason = 'single_ready';
  } else if (ready.length >= 2) {
    const top = ready[0];
    const second = ready[1];
    const ts = typeof top.readiness_score === 'number' ? top.readiness_score : 0;
    const ss = typeof second.readiness_score === 'number' ? second.readiness_score : 0;
    if (ts - ss >= RECOMMENDATION_DOMINANCE_MARGIN) {
      recommendedCandidate = top;
      recommendationReason = 'top_score_dominates';
    } else {
      recommendationReason = 'tie_no_recommendation';
    }
  }

  return {
    ready,
    needsReview,
    blocked,
    summary: {
      total: safe.length,
      ready: ready.length,
      needsReview: needsReview.length,
      blocked: blocked.length,
    },
    recommendedCandidate,
    recommendationReason,
  };
}

export default buildPilotCandidateDiscoveryReport;