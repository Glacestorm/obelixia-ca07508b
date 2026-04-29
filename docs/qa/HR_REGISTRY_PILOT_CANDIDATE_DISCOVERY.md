# HR Registry — Pilot Candidate Discovery (B10F.5C)

**Phase:** B10F.5C — Discovery read-only de candidatos piloto Registry
**Mode:** READ-ONLY. Pure aggregator + optional read-only hook + read-only UI panel.
**Status:** No activation performed. No allow-list mutated. No flags flipped.

## 1. Objective

Provide an internal, fully read-only layer that answers:

> "Among the (mapping × runtime_setting) pairs of a company, which ones could be a real first-pilot candidate, which need review, and which are blocked?"

The answer is informational. Selecting and resuming **B10F.6.a DRY-RUN** still requires explicit human confirmation of every scope field.

## 2. Architecture

```
 Supabase (RLS, user JWT, SELECT-only)
        │
        ▼
 registryPilotCandidateDataLoader.ts          (B10F.5B, SELECT-only adapter)
        │   raw snapshot
        ▼
 registryPilotCandidatePreflight.ts           (B10F.5B, pure evaluator)
        │   RegistryPilotCandidate[]
        ▼
 registryPilotCandidateDiscovery.ts           (B10F.5C, pure aggregator)
        │   PilotCandidateDiscoveryResult
        ▼
 useRegistryPilotCandidateDiscovery.ts        (B10F.5C, read-only hook)
        │
        ▼
 RegistryPilotCandidateDiscoveryPanel.tsx     (B10F.5C, read-only UI)
```

## 3. Classification

- **ready** — preflight returned `status='ready'`, score = 100, no blockers, no warnings.
- **needs_review** — no blockers, but at least one warning (e.g. comparison report missing, rules empty).
- **blocked** — at least one blocker (e.g. mapping not approved, runtime not current, registry not ready, critical diffs).

Sorting inside each group: `readiness_score` desc, then deterministic stable key (`company|employee|contract|year|mapping|runtime|agreement|version`).

## 4. Recommendation rule

`recommendedCandidate` is set **only** when:

- exactly **1** ready candidate → `recommendationReason = 'single_ready'`, OR
- top ready beats the second by ≥ `RECOMMENDATION_DOMINANCE_MARGIN` (10) → `recommendationReason = 'top_score_dominates'`.

Otherwise `recommendedCandidate` is `undefined` and `recommendationReason` is `'tie_no_recommendation'` (or `'no_ready'` if there are no ready candidates).

The recommendation is **informational only**. Nothing is auto-activated.

## 5. What it produces

```ts
interface PilotCandidateDiscoveryResult {
  ready: RegistryPilotCandidate[];
  needsReview: RegistryPilotCandidate[];
  blocked: RegistryPilotCandidate[];
  summary: { total; ready; needsReview; blocked };
  recommendedCandidate?: RegistryPilotCandidate;
  recommendationReason: 'single_ready' | 'top_score_dominates' | 'no_ready' | 'tie_no_recommendation';
}
```

Each `RegistryPilotCandidate` contains the IDs the operator will need to assemble the future B10F.6.a scope: `company_id`, `mapping_id`, `runtime_setting_id`, `registry_agreement_id`, `registry_version_id`, plus `blockers[]`, `warnings[]`, `evidence`.

## 6. How to use the result for B10F.6.a

1. Pick a candidate from `report.ready` (preferably `report.recommendedCandidate`).
2. Manually confirm:
   - `employee_id` and `contract_id` (discovery uses `null` for these — they must come from the human operator).
   - `owner` and `rollback_contact` (signed and on-call).
   - B10B comparator on the exact `(company, employee, contract, year)` returns `critical === 0`.
3. Re-run preflight with `comparisonReport` filled — must be `status='ready'`, `readiness_score=100`.
4. Only then resume **B10F.6.a DRY-RUN** with the confirmed scope.
5. After DRY-RUN green and pilot monitor green, proceed to **B10F.6.b ARM**.

## 7. What B10F.5C does NOT do

- Does NOT touch `useESPayrollBridge`.
- Does NOT touch payroll, payslip, salary normalizer or agreement safety gate.
- Does NOT mutate `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`, `HR_REGISTRY_PILOT_MODE`, or `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- Does NOT write to the database (`.insert / .update / .upsert / .delete / .rpc` are all forbidden in this layer).
- Does NOT use `service_role` or any admin client.
- Does NOT touch the operative table `erp_hr_collective_agreements`. Only `*_registry`-suffixed tables and the pilot decision log are read.
- Does NOT auto-activate any candidate. Recommendation is informational.
- Does NOT expose any UI CTA for activation, allow-list edits, applying registry, running payroll, or flipping flags.

## 8. Checklist: from READY candidate to DRY-RUN

- [ ] `report.ready.length >= 1`.
- [ ] Chosen candidate has `readiness_score = 100`.
- [ ] `mapping_id`, `runtime_setting_id`, `registry_agreement_id`, `registry_version_id` recorded.
- [ ] `employee_id` and `contract_id` confirmed by human operator.
- [ ] `target_year` confirmed (default provisional `2026`).
- [ ] `pilot_started_at` confirmed.
- [ ] `owner` confirmed (signed).
- [ ] `rollback_contact` confirmed (on-call during pilot window).
- [ ] B10B comparator on the scope: `critical === 0`.
- [ ] No recent `pilot_blocked` decisions in `erp_hr_company_agreement_registry_pilot_decision_logs` for the scope.
- [ ] B10F.6.a doc updated with all the above before allow-list edit.

## 9. Test summary

| Suite | Result |
|---|---|
| `registry-pilot-candidate-discovery.test.ts` | **17 / 17** |
| B10 / B10E / B10F full suite (58 files) | **1020 / 1020** |
| Payroll critical (positive path, SS, IT, garnishment) | **21 / 21** |

## 10. Confirmation block

- ✅ Discovery aggregator created (pure, deterministic, no I/O).
- ✅ Read-only hook created (no writes, no service_role, no write edges).
- ✅ Read-only UI panel created (no forbidden CTAs, banner present).
- ✅ Tests created and green (17 / 17).
- ✅ Doc created.
- ✅ No bridge changes.
- ✅ No payroll changes.
- ✅ No DB writes.
- ✅ No flag mutation.
- ✅ No allow-list mutation (`REGISTRY_PILOT_SCOPE_ALLOWLIST` still `[]`).
- ✅ No operative table touched.
- ✅ No `service_role`.
- ✅ Payroll critical green.
- ✅ Full B10/B10E/B10F suite green.

**B10F.6.a remains halted until a READY candidate is chosen and signed off by a human operator.**