

# S6.3B — Auth Hardening Batch 1: Payroll / Compliance / Reporting

## Step 0 — Current Auth State

| Function | JWT method | Membership check | Data ops client | service_role data ops | Target |
|---|---|---|---|---|---|
| erp-hr-payroll-recalculation | getClaims (manual) | adminClient (manual) | userClient (anon+JWT) | 0 (only membership) | `validateTenantAccess()` |
| hr-compliance-automation | getClaims (manual) | adminClient (manual) | None (AI-only) | 0 (only membership) | `validateTenantAccess()` |
| erp-hr-accounting-bridge | getClaims (manual) | service_role (manual) | **service_role for ALL ops** | ~15+ INSERT/SELECT/UPDATE | `validateTenantAccess()` — MAJOR |
| hr-regulatory-reporting | getUser (manual) | service_role (manual) | **service_role for ALL ops** | ~20+ SELECT/INSERT/UPDATE | `validateTenantAccess()` — MAJOR |
| hr-reporting-engine | getUser (manual) | service_role (manual) | **service_role for ALL ops** | ~15+ SELECT/INSERT/UPDATE/UPSERT | `validateTenantAccess()` — MAJOR |

All 5 touch company-scoped data → all go to `validateTenantAccess()`. No exceptions needed.

---

## Changes per Function

### 1. erp-hr-payroll-recalculation (826 lines) — MODERATE
**Before**: Manual JWT via `getClaims` + manual `adminClient` for membership only. Data ops already on userClient.
**Change**:
- Replace lines 336-378 (manual auth + manual adminClient membership) with `validateTenantAccess(req, company_id)` + `isAuthError()` guard
- Remove `createClient` import (use shared)
- Rename existing `supabase` variable to use `userClient` from `validateTenantAccess`
- All data ops already use the user-scoped client — minimal refactor
**adminClient after**: 0

### 2. hr-compliance-automation (230 lines) — SIMPLE
**Before**: Manual JWT via `getClaims` + manual `adminClient` for membership. No DB data ops (pure AI function).
**Change**:
- Replace lines 31-70 (manual auth + manual adminClient membership) with `validateTenantAccess(req, body.company_id)` + `isAuthError()` guard
- Remove manual `createClient` for service_role
- No data ops to migrate (function only calls AI gateway)
**adminClient after**: 0

### 3. erp-hr-accounting-bridge (947 lines) — MAJOR
**Before**: Manual JWT via `getClaims` + service_role `supabase` for ALL operations. The `supabase` var on line 93 is `createClient(url, serviceKey)` — every INSERT/SELECT/UPDATE in all 7 handler functions uses it.
**Change**:
- Replace lines 82-121 (manual auth + manual membership) with `validateTenantAccess(req, companyId)` + `isAuthError()` guard
- Pass `userClient` instead of `supabase` (service_role) to all handler functions: `generatePayrollEntry`, `generateSettlementEntry`, `generateSSContributionEntry`, `generateBatchPayrollEntries`, `reverseEntry`, `validateEntry`, `getAccountingStatus`
- All ~15+ data ops on `erp_journal_entries`, `erp_journal_entry_lines`, `erp_hr_journal_entries`, `erp_hr_integration_log` migrate to `userClient`
- Remove manual `createClient` for service_role
**adminClient after**: 0

### 4. hr-regulatory-reporting (581 lines) — MAJOR
**Before**: `getUser()` + service_role `supabase` for ALL operations (~20+ SELECTs on employee, compliance, fairness, security, AI governance tables + INSERTs on reports and evidence).
**Change**:
- Replace lines 104-132 (manual auth + manual membership) with `validateTenantAccess(req, company_id)` + `isAuthError()` guard
- Replace all `supabase` (service_role) references with `userClient` throughout the function
- All SELECTs on `erp_hr_employees`, `erp_hr_pay_equity_analyses`, `erp_hr_compliance_frameworks`, etc. and INSERTs on `erp_hr_generated_reports`, `erp_hr_regulatory_report_evidence`, `erp_hr_regulatory_report_reviews` move to `userClient`
- Remove manual `createClient` for service_role
**adminClient after**: 0

### 5. hr-reporting-engine (361 lines) — MAJOR
**Before**: `getUser()` + service_role `supabase` for ALL operations (~15+ SELECTs + INSERTs/UPDATEs on report tables, template tables, schedule tables).
**Change**:
- Replace lines 19-47 (manual auth + manual membership) with `validateTenantAccess(req, company_id)` + `isAuthError()` guard
- Replace all `supabase` (service_role) references with `userClient`
- All operations on `erp_hr_report_templates`, `erp_hr_generated_reports`, `erp_hr_report_schedules` move to `userClient`
- Remove manual `createClient` for service_role
**adminClient after**: 0

---

## Post-Batch State

```text
Function                        | adminClient remaining | Status
────────────────────────────────┼───────────────────────┼─────────────────
erp-hr-payroll-recalculation    | 0                     | Clean (S6.3B)
hr-compliance-automation        | 0                     | Clean (S6.3B)
erp-hr-accounting-bridge        | 0                     | Clean (S6.3B)
hr-regulatory-reporting         | 0                     | Clean (S6.3B)
hr-reporting-engine             | 0                     | Clean (S6.3B)
```

- **5/5 functions migrated** to `validateTenantAccess()`
- **~50+ service_role data ops eliminated** across 3 major functions
- **0 exceptions** — no residual adminClient needed
- **Risk**: Low — all tables have existing RLS policies. Functions will now respect them instead of bypassing.

## Deliverables

1. Code changes in all 5 edge functions
2. `/docs/S6_auth_batch1_report.md` with before/after validation

