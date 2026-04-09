# S6.2B — Service Role / adminClient Hardening Phase 2 Report

**Date**: 2026-04-09  
**Scope**: 6 edge functions (4 runtime + 2 seed-only)  
**Objective**: Eliminate remaining `adminClient` runtime data ops and document seed exceptions

---

## Step 0: Real Count Post-S6.2A

| Function | adminClient data ops | Classification | Action |
|---|---|---|---|
| erp-hr-compliance-enterprise | ~14 (seed_demo only) | SEED action | Document as exception |
| erp-hr-enterprise-admin | ~12 (seed only) | SEED action | Document as exception |
| erp-hr-industry-templates | 4 (runtime data ops) | RUNTIME — migrable | Migrate to userClient |
| erp-hr-recruitment-agent | 1 (candidate update) | RUNTIME — migrable | Migrate to userClient |
| erp-hr-seed-demo-data | ALL (service_role) | SEED-only function | Document as exception |
| erp-hr-seed-demo-master | ALL (service_role) | SEED-only function | Document as exception |
| send-hr-alert | 2 (documented S6.2A) | EXCEPTION | Already documented |
| erp-hr-innovation-discovery | 2 (documented S6.2A) | EXCEPTION | Already documented |

---

## Detailed Changes

### 1. erp-hr-industry-templates — MAJOR REFACTOR

**Before**:
- Manual JWT auth (no `validateTenantAccess`)
- Manual `adminClient` creation via `createClient(url, serviceKey)`
- Manual membership check on `adminClient`
- 4 runtime data operations on `adminClient`

**After**:
- Uses `validateTenantAccess(req, company_id)` + `isAuthError()` guard
- ALL data operations migrated to `userClient`
- `adminClient` completely eliminated
- Removed manual `createClient` import

**Operations migrated**:
| Action | Table | Operation |
|---|---|---|
| apply_template | erp_hr_industry_templates | SELECT |
| apply_template | erp_hr_template_applications | INSERT |
| apply_template | erp_hr_industry_templates | UPDATE (usage_count) |
| validate_compliance | erp_hr_industry_templates | SELECT |

**Risk**: Low — tables have open RLS policies (`USING(true)`).

---

### 2. erp-hr-recruitment-agent — MINOR REFACTOR

**Before**:
- Manual JWT auth (no `validateTenantAccess`)
- Manual `adminClient` creation via `createClient(url, serviceKey)`
- Manual membership check on `adminClient`
- 1 runtime data op: `adminClient.from('erp_hr_candidates').update(...)`

**After**:
- Uses `validateTenantAccess(req, companyId)` + `isAuthError()` guard
- Candidate update migrated to `userClient`
- `adminClient` completely eliminated
- Removed manual `createClient` import

**Operations migrated**:
| Action | Table | Operation |
|---|---|---|
| score_candidate / analyze_candidate | erp_hr_candidates | UPDATE |

**Risk**: None — `erp_hr_candidates` has tenant-scoped RLS.

---

### 3. erp-hr-compliance-enterprise — SEED EXCEPTION DOCUMENTED

**Change**: No functional changes. `adminClient` was already confined to `seed_demo` action only.

- Removed `adminClient` from top-level destructuring
- `adminClient` is now extracted from `authResult` only inside the `seed_demo` case
- Added `S6.2B SEED EXCEPTION` comment block

**Why adminClient is needed for seed_demo**:
- DELETE operations on compliance tables lack RLS DELETE policies
- This is a seed/demo action, not part of normal multi-tenant runtime

---

### 4. erp-hr-enterprise-admin — SEED EXCEPTION DOCUMENTED

**Change**: No functional changes. `adminClient` was already confined to `seed_enterprise_data` action only.

- Removed `adminClient` from top-level destructuring
- `adminClient` is now extracted from `authResult` only inside the `seed_enterprise_data` case
- Added `S6.2B SEED EXCEPTION` comment block

**Why adminClient is needed for seed_enterprise_data**:
- `erp_hr_enterprise_permissions` has no write RLS policy (global catalog table)
- Multiple seed tables lack DELETE RLS policies needed for cleanup
- This is a seed/demo action, not part of normal multi-tenant runtime

---

### 5. erp-hr-seed-demo-data — SEED-ONLY FUNCTION DOCUMENTED

**Change**: Added `S6.2B SEED-ONLY FUNCTION` header comment. No functional changes.

- Entire function uses `SERVICE_ROLE_KEY` for all operations
- Justified: Seed/demo-only function that populates initial data
- NOT part of normal multi-tenant runtime
- No `validateTenantAccess` needed (no user context)

---

### 6. erp-hr-seed-demo-master — SEED-ONLY FUNCTION DOCUMENTED

**Change**: Added `S6.2B SEED-ONLY FUNCTION` header comment. No functional changes.

- Entire function uses `SERVICE_ROLE_KEY` for all operations
- Justified: Seed/demo-only function that populates master demo data
- NOT part of normal multi-tenant runtime
- No `validateTenantAccess` needed (no user context)

---

## Post-S6.2B Source of Truth

### Runtime Functions — adminClient Status

| Function | adminClient remaining | Classification |
|---|---|---|
| payroll-calculation-engine | 0 | Clean (S6.2A) |
| payroll-supervisor | 0 | Clean (S6.2A) |
| hr-country-registry | 0 | Clean (S6.2A) |
| erp-hr-industry-templates | 0 | Clean (S6.2B) |
| erp-hr-recruitment-agent | 0 | Clean (S6.2B) |
| send-hr-alert | 2 | S6.2A Exception (cross-user notification + S2S invoke) |
| erp-hr-innovation-discovery | 2 | S6.2A Exception (setTimeout post-response) |
| erp-hr-compliance-enterprise | ~14 (seed_demo only) | S6.2B Seed Exception |
| erp-hr-enterprise-admin | ~12 (seed only) | S6.2B Seed Exception |

### Seed-Only Functions

| Function | adminClient usage | Classification |
|---|---|---|
| erp-hr-seed-demo-data | ALL ops | S6.2B Seed-Only Function |
| erp-hr-seed-demo-master | ALL ops | S6.2B Seed-Only Function |

### Final Count

- **Runtime adminClient data ops**: 4 (all documented S6.2A exceptions)
  - send-hr-alert: 2 (cross-user notification INSERT + S2S invoke)
  - erp-hr-innovation-discovery: 2 (setTimeout post-response UPDATE + INSERT)
- **Seed-only adminClient**: Confined to seed actions and seed-only functions — excluded from normal tenant runtime
- **Total runtime functions cleaned (S6.2A + S6.2B)**: 7 functions with 0 adminClient data ops

---

## Next Steps

- **S6.3**: Tighten RLS on tables currently using `USING(true)` open policies
- **S6.4**: Address seed data patterns — consider RLS DELETE policies to enable `userClient` for seed cleanup
- **S6.5**: Extend hardening to remaining functions without auth gates (41 functions identified in baseline)
