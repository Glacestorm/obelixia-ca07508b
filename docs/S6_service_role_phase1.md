# S6.2A — Service Role / adminClient Hardening Phase 1 Report

**Date**: 2026-04-09  
**Scope**: 5 critical edge functions  
**Objective**: Reduce/eliminate `adminClient` usage for data operations

---

## Summary

| Function | Before (adminClient data ops) | After | Change |
|---|---|---|---|
| payroll-calculation-engine | 0 (unused import) | 0 | Removed unused destructuring |
| payroll-supervisor | 1 (audit SELECT) | 0 | Migrated to userClient |
| send-hr-alert | 2 (justified) | 2 | Documented exceptions |
| hr-country-registry | ~15 (ALL ops) | 0 | Full refactor to validateTenantAccess + userClient |
| erp-hr-innovation-discovery | 2 (setTimeout) | 2 | Documented exceptions |
| **TOTAL** | **~20** | **4** | **80% reduction** |

---

## Detailed Changes

### 1. payroll-calculation-engine

**Change**: Removed unused `adminClient` from destructuring.

```diff
- const { userClient, adminClient } = authResult;
+ const { userClient } = authResult;
```

**Risk**: None. `adminClient` was already unused.

---

### 2. payroll-supervisor

**Change**: Migrated 1 `erp_audit_events` SELECT from `adminClient` to `userClient`.

```diff
- const { data: events } = await adminClient
+ const { data: events } = await userClient
```

**Justification**: The same function already uses `userClient` for `erp_audit_events.insert()` in other actions, proving RLS works for this table.

**Risk**: None.

---

### 3. send-hr-alert

**Change**: No functional changes. Added explicit security exception comments.

**Exception 1** — `adminClient.from('notifications').insert(...)`:
- Cross-user push notification insert
- Sender inserts notifications for OTHER users in different RLS scopes
- `userClient` would be blocked by RLS → `adminClient` justified

**Exception 2** — `adminClient.functions.invoke('erp-hr-ai-agent')`:
- Service-to-service invocation requiring service_role for internal auth
- Uses `x-internal-secret` pattern → `adminClient` justified

---

### 4. hr-country-registry — MAJOR REFACTOR

**Before**:
- Manual JWT auth (no `validateTenantAccess`)
- Manual `adminClient` creation via `createClient(url, serviceKey)`
- ALL ~15 data operations used `adminClient`
- Tables: `hr_country_registry`, `hr_country_policies`, `hr_employee_extensions`, `erp_hr_employees`

**After**:
- Uses `validateTenantAccess(req, companyId)` + `isAuthError()` guard
- ALL data operations migrated to `userClient`
- `adminClient` completely eliminated
- Removed manual `createClient` import (now from shared utility)

**Operations migrated**:
| Action | Table | Operation |
|---|---|---|
| list_countries | hr_country_registry | SELECT |
| upsert_country | hr_country_registry | UPSERT |
| toggle_country | hr_country_registry | UPDATE |
| list_policies | hr_country_policies | SELECT |
| upsert_policy | hr_country_policies | UPSERT |
| resolve_policy | erp_hr_employees + hr_country_policies | SELECT × 2 |
| get_employee_extension | hr_employee_extensions | SELECT |
| upsert_employee_extension | hr_employee_extensions | UPSERT |
| list_extensions_by_country | hr_employee_extensions | SELECT |
| get_stats | 3 tables | SELECT × 3 |
| seed_defaults | hr_country_registry + hr_country_policies | UPSERT × 6 |
| analyze_compliance | hr_country_registry + hr_country_policies | SELECT × 2 |

**Risk**: Low — tables currently have open RLS policies (`USING(true)`). When policies are later tightened (future S6 phase), `userClient` will automatically respect them.

---

### 5. erp-hr-innovation-discovery

**Change**: No functional changes. Added explicit security exception comments.

**Exception** — `setTimeout` block (2 ops):
- `adminClient.from('erp_hr_innovation_features').update(...)`
- `adminClient.from('erp_hr_innovation_logs').insert(...)`
- These run 3 seconds AFTER the HTTP response is sent
- User's JWT may have expired → `userClient` would fail with 401
- `adminClient` justified for post-response background operations

---

## Remaining adminClient Usage (4 documented exceptions)

| Function | Operation | Justification |
|---|---|---|
| send-hr-alert | `notifications` INSERT | Cross-user RLS scope |
| send-hr-alert | `erp-hr-ai-agent` invoke | Service-to-service auth |
| erp-hr-innovation-discovery | `erp_hr_innovation_features` UPDATE | setTimeout post-response |
| erp-hr-innovation-discovery | `erp_hr_innovation_logs` INSERT | setTimeout post-response |

All 4 exceptions are explicitly documented with `S6.2A EXCEPTION` comments in code.

---

## Next Steps

- **S6.2B**: Extend hardening to remaining 41 functions without auth gates
- **S6.3**: Tighten RLS on `hr_country_registry`, `hr_country_policies`, `hr_employee_extensions` (currently `USING(true)`)
- **S6.4**: Address seed data patterns across all functions
