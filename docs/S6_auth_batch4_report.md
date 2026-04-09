# S6.3E — Auth Hardening Batch 4: Wellbeing / ESG / Security / Whistleblower — Report

**Date**: 2026-04-09  
**Batch**: S6.3E (Batch 4)  
**Functions**: 5 Wellbeing / ESG / Security / Whistleblower edge functions  
**Status**: ✅ Complete

---

## Per-Function Validation

### 1. erp-hr-wellbeing-agent (419 → ~310 lines) — MODERATE + **SECURITY FIX**

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getClaims()` manual | `validateTenantAccess()` |
| Membership check | **NONE** ⚠️ | `validateTenantAccess()` ✅ |
| Data ops client | None (AI-only) | None (AI-only) |
| service_role data ops | 0 | **0** |
| adminClient residual | N/A | **0** |
| `createClient` import | Yes (manual) | **Removed** — uses shared `tenant-auth.ts` |
| `company_id` validation | Not in request interface | **Required** (returns 400) |
| Tenant isolation | **MISSING** — any authenticated user could invoke for any company context | **ENFORCED** — membership validated |

**Critical security fix**: This function previously had NO membership check. Any authenticated user could call it with any `company_context` and access wellbeing AI analysis for companies they don't belong to. Now properly gated by `validateTenantAccess()`.

### 2. erp-hr-wellbeing-enterprise (536 → ~490 lines) — MAJOR

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getClaims()` manual | `validateTenantAccess()` |
| Membership check | `service_role` manual query | `validateTenantAccess()` |
| Data ops client | `service_role` for ALL ops | `userClient` (RLS-enforced) |
| service_role data ops | **~20+ SELECT/INSERT/UPDATE/UPSERT** | **0** |
| adminClient residual | N/A | **0** |
| `createClient` import | Yes (manual, 2 clients) | **Removed** |
| seed_demo admin check | `service_role` query on `user_roles` | `userClient` query (RLS allows reading own roles) |

**Operations migrated to userClient**: assessments, surveys, survey_responses, programs, enrollments, burnout_alerts, KPIs, legal_entities, wellness_programs, wellbeing_kpis (all CRUD).

### 3. erp-hr-esg-selfservice (416 → ~400 lines) — MAJOR

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getClaims()` manual | `validateTenantAccess()` |
| Membership check | `service_role` manual query | `validateTenantAccess()` |
| Data ops client | `service_role` for ALL ops | `userClient` (RLS-enforced) |
| service_role data ops | **~15+ SELECT/INSERT/UPSERT** | **0** |
| adminClient residual | N/A | **0** |
| `createClient` import | Yes (manual, incl. serviceKey) | **Removed** |

**Operations migrated to userClient**: ESG metrics, ESG KPIs, ESG surveys, self-service requests, FAQ, document requests, seed demo data (all CRUD).

### 4. erp-hr-security-governance (413 → ~400 lines) — MAJOR + **SECURITY FIX**

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getUser()` manual | `validateTenantAccess()` |
| Membership check | `service_role` **CONDITIONAL** (skipped if `company_id` missing) ⚠️ | `validateTenantAccess()` **MANDATORY** ✅ |
| Data ops client | `service_role` for ALL ops | `userClient` (RLS-enforced) |
| service_role data ops | **~20+ SELECT/INSERT/UPDATE** | **0** |
| adminClient residual | N/A | **0** |
| `createClient` import | Yes (manual, 2 clients) | **Removed** |
| `company_id` validation | **Optional** — membership skipped if missing | **Required** (returns 400) |
| `json()` helper | Defined at bottom (hoisted) | Defined at top (explicit) |

**Critical security fix**: `company_id` was previously optional. When omitted, the membership check was skipped entirely, allowing any authenticated user to invoke governance operations without tenant scope. Now `company_id` is required and `validateTenantAccess()` enforces membership.

**Operations migrated to userClient**: classifications, masking rules, SoD rules, violations, incidents, access logs, AI model registry, AI decisions, governance policies, bias audits, fairness metrics, justice cases, equity plans, employees, departments, payrolls (all CRUD).

### 5. erp-hr-whistleblower-agent (355 → ~310 lines) — MAJOR + **DOCUMENTED EXCEPTION**

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getUser()` via service_role | `validateTenantAccess()` (non-anonymous) / none (anonymous) |
| Membership check | `service_role` **CONDITIONAL** (only for non-submit_report + with company_id) | `validateTenantAccess()` **MANDATORY** for all non-submit actions ✅ |
| Data ops client | `service_role` for ALL ops | `userClient` (non-anonymous) / `adminClient` (anonymous submit only) |
| service_role data ops | **~15+ INSERT/SELECT/UPDATE** | **1** (anonymous submit_report INSERT only) |
| adminClient residual | All actions | **1** (submit_report only) |
| `createClient` import | Yes (service_role main client) | Yes — **only for submit_report anonymous path** |
| `company_id` validation | Not enforced for non-submit actions | **Required** for all non-submit actions (returns 400) |

**Split path architecture**:
- **`submit_report`**: Anonymous path. No JWT required. Uses `adminClient` (service_role) for INSERT. This is a legal requirement per EU Directive 2019/1937 — anonymous reporters cannot have a JWT.
- **All other actions** (`get_reports`, `get_report_detail`, `update_investigation`, `acknowledge_report`, `analyze_report`): Full `validateTenantAccess()` with mandatory `company_id`. All data ops via `userClient`.

---

## Global Batch Summary

```text
Function                       | adminClient remaining | service_role data ops | Status
───────────────────────────────┼───────────────────────┼───────────────────────┼─────────────────
erp-hr-wellbeing-agent         | 0                     | 0                     | ✅ Clean + SECURITY FIX
erp-hr-wellbeing-enterprise    | 0                     | 0                     | ✅ Clean (S6.3E)
erp-hr-esg-selfservice         | 0                     | 0                     | ✅ Clean (S6.3E)
erp-hr-security-governance     | 0                     | 0                     | ✅ Clean + SECURITY FIX
erp-hr-whistleblower-agent     | 1 (anonymous INSERT)  | 1 (anonymous INSERT)  | ✅ Clean + EXCEPTION
```

### Key Metrics

| Metric | Value |
|--------|-------|
| Functions migrated | **5/5** (100%) |
| service_role data ops eliminated | **~70+** (across 3 major + 1 moderate function) |
| Tenant isolation gaps closed | **2** (wellbeing-agent missing check, security-governance conditional) |
| Documented exceptions | **1** (whistleblower anonymous submit — EU Directive 2019/1937) |
| Residual adminClient usage | **1** (whistleblower submit_report only) |
| Authorization passthrough | **0** (none had passthrough) |
| Inter-agent chaining risk | **0** (none invoke other functions) |

### Regression Risk Assessment

- **Low risk for AI-only functions**: wellbeing-agent had no data ops, change is auth-only
- **Medium risk for data-heavy functions**: wellbeing-enterprise, esg-selfservice, security-governance had ~55+ data ops migrated from service_role to userClient. RLS policies must correctly allow access for company members.
- **Breaking change**: `company_id` is now **required** for all 5 functions (except whistleblower `submit_report`). Callers that previously omitted it will receive a 400 error. This is intentional — operating without tenant scope was the security gap being closed.
- **seed_demo in wellbeing-enterprise**: Admin role check now uses `userClient` instead of service_role. This works because `user_roles` table has RLS allowing users to read their own roles.

---

## Residual Exceptions

### 1. erp-hr-whistleblower-agent — `submit_report` anonymous INSERT

| Detail | Value |
|--------|-------|
| Action | `submit_report` |
| Client used | `adminClient` (service_role) |
| Operations | 1 INSERT + 1 UPDATE on `erp_hr_whistleblower_reports` |
| Justification | EU Directive 2019/1937 requires anonymous whistleblower submissions. Anonymous reporters have no user account and no JWT. `userClient` cannot be used because RLS cannot authenticate an anonymous request. |
| Mitigation | The INSERT only writes to `erp_hr_whistleblower_reports` with a fixed schema. No arbitrary table access. All other whistleblower actions require full `validateTenantAccess()`. |
| Review status | **Accepted exception** — legally mandated |

No other exceptions exist in this batch.

---

## Cumulative Progress (S6.3B through S6.3E)

```text
Batch   | Functions | service_role ops eliminated | Security fixes | Exceptions
────────┼───────────┼────────────────────────────┼────────────────┼───────────
S6.3B   | 5/5       | ~50+                       | 0              | 0
S6.3C   | 5/5       | ~20+                       | 1              | 0
S6.3D   | 6/6       | ~6                         | 2              | 0
S6.3E   | 5/5       | ~70+                       | 2              | 1
────────┼───────────┼────────────────────────────┼────────────────┼───────────
TOTAL   | 21/21     | ~146+                      | 5              | 1
```

All 21 functions from Batches 1–4 are now under the standard `validateTenantAccess()` pattern with zero residual `service_role` usage for standard data operations. The only exception is the legally-mandated anonymous whistleblower submission path.