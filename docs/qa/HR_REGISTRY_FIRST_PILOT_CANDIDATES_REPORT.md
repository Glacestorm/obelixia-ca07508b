# HR Registry — First Pilot Candidates Report (B10F.5B Preflight)

**Phase:** B10F.5B — Preflight selector de candidato piloto Registry
**Mode:** READ-ONLY. Pure evaluator + optional read-only data loader.
**Status:** No activation performed. No allow-list mutated. No flags flipped.

## 1. Invariants (verified)

| Invariant | Value |
|---|---|
| `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` | `false` (unchanged) |
| `HR_REGISTRY_PILOT_MODE` | `false` (unchanged) |
| `REGISTRY_PILOT_SCOPE_ALLOWLIST` | `[]` (empty, unchanged) |
| `useESPayrollBridge.ts` | not modified by B10F.5B |
| Operative table `erp_hr_collective_agreements` | not touched |
| `ready_for_payroll` field | not written |
| DB writes performed by B10F.5B | none (`SELECT` only, optional loader) |
| `service_role` references in B10F.5B code | none |

## 2. What B10F.5B added

- **Pure evaluator:** `src/engines/erp/hr/registryPilotCandidatePreflight.ts`
  - `evaluatePilotCandidateReadiness(input)` → `{ readiness_score (0–100), status: 'ready'|'blocked'|'needs_review', blockers[], warnings[], evidence }`
  - 16 weighted checks, total weight = 100.
  - Deterministic; no I/O; no env, no Date.now, no Math.random.
- **Optional read-only loader:** `src/engines/erp/hr/registryPilotCandidateDataLoader.ts`
  - `fetchRegistryPilotCandidateSnapshot({ companyId, year, supabaseClient })`
  - SELECT-only, accepts the caller's RLS-bound user client.
  - Touches only `*_registry`-suffixed tables and the pilot decision log (read).
- **Tests:** `src/__tests__/hr/registry-pilot-candidate-preflight.test.ts` (25 tests, all green).
- **Docs:** this file.

## 3. Readiness scoring (deterministic weights)

| Check | Weight | Failure → |
|---|---|---|
| `mapping` present | 8 | blocker `mapping_missing` |
| `mapping.mapping_status === 'approved_internal'` | 10 | blocker `mapping_not_approved_internal` |
| `mapping.is_current === true` | 6 | blocker `mapping_not_current` |
| `runtime_setting` present | 8 | blocker `runtime_setting_missing` |
| `runtime_setting.is_current === true` | 6 | blocker `runtime_setting_not_current` |
| `runtime_setting.use_registry_for_payroll === true` | 8 | blocker `runtime_setting_use_registry_for_payroll_false` |
| `registry_agreement` present | 4 | blocker `registry_agreement_missing` |
| `registry_agreement.ready_for_payroll === true` | 10 | blocker `registry_not_ready_for_payroll` |
| `registry_agreement.requires_human_review === false` | 6 | blocker `registry_requires_human_review` |
| `registry_agreement.data_completeness === 'human_validated'` | 8 | blocker `registry_data_completeness_not_human_validated` |
| `registry_agreement.source_quality === 'official'` | 6 | blocker `registry_source_quality_not_official` |
| `registry_version` present | 4 | blocker `registry_version_missing` |
| `registry_version.is_current === true` | 4 | blocker `registry_version_not_current` |
| `salary_tables.length > 0` | 6 | blocker `salary_tables_empty` |
| `rules.length > 0` | 4 | warning `rules_empty` (→ needs_review) |
| `comparisonReport.critical === 0` | 2 | blocker `comparison_report_has_critical_diffs` |

- Any blocker → `status='blocked'`.
- No blockers + warnings (e.g. comparison missing or rules empty) → `status='needs_review'`.
- All checks pass → `status='ready'` (score = 100).

## 4. Candidates found

**No automated discovery has been executed yet against the live database.**
The loader exists and is callable from a future internal admin entry point with the user's RLS-bound client. As of this report, no scan has been performed and no candidate list is published here.

| Candidate | company_id | employee_id | contract_id | status | blockers |
|---|---|---|---|---|---|
| — | PENDING_HUMAN_INPUT | PENDING_HUMAN_INPUT | PENDING_HUMAN_INPUT | unknown | scan not executed |

## 5. Required real data before B10F.6.a can resume

Confirmed bullet-by-bullet by the user in the previous turn (B10F.6.a halt):

- `company_id` — **PENDING_HUMAN_INPUT**
- `employee_id` — **PENDING_HUMAN_INPUT**
- `contract_id` — **PENDING_HUMAN_INPUT**
- `mapping_id` (status `approved_internal`, `is_current=true`) — **PENDING_HUMAN_INPUT**
- `runtime_setting_id` (`is_current=true`, `use_registry_for_payroll=true`) — **PENDING_HUMAN_INPUT**
- `registry_agreement_id` (`ready_for_payroll=true`, `requires_human_review=false`, `data_completeness='human_validated'`, `source_quality='official'`) — **PENDING_HUMAN_INPUT**
- `registry_version_id` (`is_current=true`) — **PENDING_HUMAN_INPUT**
- B10B comparison report on the scope with `critical === 0` — **PENDING_HUMAN_INPUT**
- `target_year` (provisional: `2026`) — provisional, not blocking
- `pilot_started_at` (provisional: `2026-04-30T08:00:00Z`) — provisional, not blocking
- `owner` — **PENDING_HUMAN_INPUT**
- `rollback_contact` — **PENDING_HUMAN_INPUT**

## 6. Suggested SELECT queries (for human DBA, not executed by code)

These are the queries an authorized operator may run against the **user-scoped** client (RLS enforced). They are illustrative only; B10F.5B does not run them automatically.

```sql
-- Mappings approved + current for a candidate company
SELECT id, company_id, registry_agreement_id, registry_version_id, mapping_status, is_current
FROM erp_hr_company_agreement_registry_mappings
WHERE company_id = :company_id
  AND mapping_status = 'approved_internal'
  AND is_current = true;

-- Runtime settings active for that company
SELECT id, company_id, mapping_id, is_current, use_registry_for_payroll
FROM erp_hr_company_agreement_registry_runtime_settings
WHERE company_id = :company_id
  AND is_current = true
  AND use_registry_for_payroll = true;

-- Registry agreement readiness
SELECT id, ready_for_payroll, requires_human_review, data_completeness, source_quality
FROM erp_hr_collective_agreements_registry
WHERE id = :registry_agreement_id;

-- Registry version current
SELECT id, is_current FROM erp_hr_collective_agreements_registry_versions
WHERE id = :registry_version_id;

-- Salary tables for target year
SELECT id FROM erp_hr_collective_agreements_registry_salary_tables
WHERE agreement_id = :registry_agreement_id AND year = :target_year;

-- Rules
SELECT id FROM erp_hr_collective_agreements_registry_rules
WHERE agreement_id = :registry_agreement_id;

-- Recent pilot decision logs (audit context)
SELECT * FROM erp_hr_company_agreement_registry_pilot_decision_logs
WHERE company_id = :company_id
ORDER BY decided_at DESC LIMIT 20;
```

## 7. Risks acknowledged

- **No candidate has been confirmed.** Activation (B10F.6.a) remains explicitly halted.
- **No discovery scan has been executed against the production DB by code.** Any list will require a human-triggered, RLS-bound run.
- **Comparison report production:** B10B comparator must be run for the chosen scope before the candidate can move from `needs_review` to `ready`.

## 8. Decision pending (human)

1. Pick a real `(company_id, employee_id, contract_id, target_year)`.
2. Confirm `owner` and `rollback_contact` are signed and on-call.
3. Run B10B comparator for that scope; require `critical === 0`.
4. Re-run preflight; require `status='ready'`, `readiness_score=100`.
5. Only then resume **B10F.6.a DRY-RUN** with the confirmed scope.
6. After DRY-RUN green and monitor green, proceed to **B10F.6.b ARM**.

## 9. Test summary

| Suite | Result |
|---|---|
| `registry-pilot-candidate-preflight.test.ts` | **25 / 25** |
| B10 / B10E / B10F full suite (57 files) | **996 / 996** |
| Payroll critical (positive path, SS, IT, garnishment) | **21 / 21** |

## 10. Confirmation block

- ✅ Preflight created (pure, deterministic, no I/O).
- ✅ Optional read-only loader created (SELECT only).
- ✅ Tests created and green (25 / 25).
- ✅ Doc created.
- ✅ No bridge changes.
- ✅ No payroll changes.
- ✅ No DB writes.
- ✅ No flag mutation (`HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`, `HR_REGISTRY_PILOT_MODE`).
- ✅ No allow-list mutation (`REGISTRY_PILOT_SCOPE_ALLOWLIST` still `[]`).
- ✅ No operative table touched.
- ✅ `ready_for_payroll` not written.
- ✅ No `service_role`.
- ✅ Payroll critical green.
- ✅ Full B10/B10E/B10F suite green.

**B10F.6.a remains halted. No real activation performed.**