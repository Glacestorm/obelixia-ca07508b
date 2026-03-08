

# Stabilization Sprint / Fix & Harden — HR Premium Suite

## Scope

Fix all table name mismatches causing 404/400 errors, verify RLS on P11, and ensure all premium panels render without errors.

---

## 1. Table Name Bugs (9 mismatches confirmed via DB inspection)

The audit found **9 wrong table names** (not 4 as previously estimated):

```text
WRONG NAME IN CODE                → CORRECT TABLE IN DB
─────────────────────────────────────────────────────────
erp_hr_ai_models                  → erp_hr_ai_model_registry
erp_hr_workforce_scenarios        → erp_hr_scenarios
erp_hr_cnae_profiles              → erp_hr_cnae_sector_profiles
erp_hr_equity_analyses            → erp_hr_pay_equity_analyses
erp_hr_legal_clause_library       → erp_hr_legal_clauses
erp_hr_twin_snapshots             → erp_hr_twin_module_snapshots
erp_hr_pay_equity_rules           → erp_hr_pay_equity_snapshots (closest match)
erp_hr_role_widgets               → (table doesn't exist, remove ref)
erp_hr_twin_experiments.company_id→ no company_id column; filter via twin_id join
```

### Files to fix (8 hooks):

| File | Fixes needed |
|------|-------------|
| `useHRAnalyticsBIPremium.ts` | ai_models, workforce_scenarios, cnae_profiles, twin_experiments query |
| `useHRPremiumDashboard.ts` | ai_models |
| `useHROrchestrationBridge.ts` | ai_models, workforce_scenarios |
| `useHRPremiumActivityFeed.ts` | workforce_scenarios, cnae_profiles, equity_analyses, legal_clause_library, twin_snapshots |
| `useHRPremiumHealthCheck.ts` | workforce_scenarios, cnae_profiles, equity_analyses, legal_clause_library, twin_snapshots, twin_experiments, pay_equity_rules |
| `useHRPremiumExport.ts` | workforce_scenarios, cnae_profiles, equity_analyses, legal_clause_library, twin_snapshots, twin_experiments, pay_equity_rules |
| `useHROrchestration.ts` | workforce_scenarios, cnae_profiles, equity_analyses, legal_clause_library, twin_snapshots, pay_equity_rules, role_widgets |
| `useHRReseed.ts` | Verify edge function action names still match |

### twin_experiments special fix:
In `useHRAnalyticsBIPremium.ts`, the query `.eq('company_id', companyId)` on `erp_hr_twin_experiments` fails because this table uses `twin_id` (FK to `erp_hr_twin_instances`). Fix: remove direct count or join through `twin_instances` which does have `company_id`.

---

## 2. RLS Hardening for P11

DB inspection shows P11 tables **already have** `user_has_erp_premium_access(company_id)` RLS policies:
- `erp_hr_compliance_frameworks` — `compliance_frameworks_access` (ALL)
- `erp_hr_compliance_audits` — `p92_sel`, `p92_ins`, `p92_upd` + `compliance_audits_p11_access` (ALL)
- `erp_hr_compliance_alerts` — `compliance_alerts_p11_access` (ALL)

**Finding**: P11 RLS is already hardened. The previous audit was wrong on this point. However, `compliance_audits` has overlapping policies (both `p92_*` and `p11_access`). I will clean up the duplicate policy on `compliance_audits` to avoid confusion.

---

## 3. Plan of Changes

### Step 1: Fix all 9 table name mismatches across 7 hook files
Simple find-and-replace in each file:
- `erp_hr_ai_models` → `erp_hr_ai_model_registry`
- `erp_hr_workforce_scenarios` → `erp_hr_scenarios`
- `erp_hr_cnae_profiles` → `erp_hr_cnae_sector_profiles`
- `erp_hr_equity_analyses` → `erp_hr_pay_equity_analyses`
- `erp_hr_legal_clause_library` → `erp_hr_legal_clauses`
- `erp_hr_twin_snapshots` → `erp_hr_twin_module_snapshots`
- `erp_hr_pay_equity_rules` → `erp_hr_pay_equity_snapshots`
- `erp_hr_role_widgets` → `erp_hr_role_dashboards` (use existing table)

### Step 2: Fix twin_experiments company_id query
In `useHRAnalyticsBIPremium.ts`, replace the direct `erp_hr_twin_experiments` count with a query that first gets `twin_id`s from `erp_hr_twin_instances` for the company, then counts experiments for those twins. Or simply remove the broken count and rely on `twin_instances` count only.

### Step 3: DB migration to clean up duplicate RLS policy
Remove the redundant `compliance_audits_p11_access` ALL policy since `p92_*` granular policies already cover SELECT/INSERT/UPDATE.

### Step 4: Smoke validation
After fixes, verify all network requests return 200 (no more 404/400) by checking:
- P2 AI Governance panel loads
- P3 Workforce scenarios count > 0
- P5 Digital Twin experiments load
- P7 CNAE profiles load
- P12 Analytics BI dashboard shows non-zero data for all modules
- HealthCheck, ActivityFeed, Export panels work without errors

---

## 4. No New Screens or Modules
Zero new UI components. Zero new tables. Only corrections to existing hooks.

---

## 5. Deliverables Summary

- **9 table name bugs fixed** across 7-8 files
- **1 query logic fix** (twin_experiments company_id → twin_id join)
- **1 migration** (cleanup duplicate RLS policy)
- **Final validation table** panel-by-panel

