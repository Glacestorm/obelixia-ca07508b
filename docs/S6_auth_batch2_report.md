# S6.3C — Auth Hardening Batch 2: AI + Datos Sensibles — Report

**Date**: 2026-04-09  
**Batch**: S6.3C (Batch 2)  
**Functions**: 5 AI-focused edge functions  
**Status**: ✅ Complete

---

## Per-Function Validation

### 1. erp-hr-ai-agent (1322 → ~1300 lines) — MAJOR REFACTOR

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getUser()` manual | `validateTenantAccess()` |
| Membership check | `service_role` manual query | `validateTenantAccess()` (shared utility) |
| Data ops client | `createClient(SERVICE_ROLE_KEY)` for ALL ops | `userClient` (anon + JWT, RLS enforced) |
| service_role data ops | ~20+ (knowledge base, leave requests, employees, contracts, payrolls, alerts, agent actions, performance reviews, safety incidents) | **0** |
| adminClient residual | N/A | **0** |
| `createClient` import | Yes (manual) | **Removed** — uses shared `tenant-auth.ts` |

**Key changes**:
- Removed `import { createClient }` — no longer needed
- Body parsed before auth to extract `effectiveCompanyId`
- All `supabase.from(...)` calls replaced with `userClient.from(...)`
- `company_id` now required (returns 400 if missing)

### 2. erp-hr-analytics-agent (460 lines) — SIMPLE

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getClaims()` manual | `validateTenantAccess()` |
| Membership check | `createClient(serviceKey)` manual | `validateTenantAccess()` (shared utility) |
| Data ops client | None (AI-only) | None (AI-only) |
| service_role data ops | 0 (membership only) | **0** |
| adminClient residual | N/A | **0** |

### 3. erp-hr-analytics-intelligence (727 lines) — MODERATE + **SECURITY FIX**

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getClaims()` manual | `validateTenantAccess()` |
| Membership check | **NONE** ⚠️ | `validateTenantAccess()` ✅ |
| Data ops client | None (AI-only) | None (AI-only) |
| service_role data ops | 0 | **0** |
| adminClient residual | N/A | **0** |
| Tenant isolation | **MISSING** — any authenticated user could invoke for any company | **ENFORCED** — membership validated |

**Critical security fix**: This function previously had NO membership check. Any authenticated user could call it with any `companyId` and receive analytics intelligence for companies they don't belong to. Now properly gated by `validateTenantAccess()`.

### 4. erp-hr-autonomous-copilot (448 lines) — MODERATE

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getUser()` manual | `validateTenantAccess()` |
| Membership check | `createClient(SERVICE_ROLE_KEY)` manual | `validateTenantAccess()` (shared utility) |
| Data ops client | None (AI-only) | None (AI-only) |
| service_role data ops | 0 (membership only) | **0** |
| adminClient residual | N/A | **0** |
| `company_id` validation | Optional (skipped if missing) | **Required** (returns 400) |

### 5. erp-hr-people-analytics-ai (232 lines) — SIMPLE

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getClaims()` manual | `validateTenantAccess()` |
| Membership check | `createClient(serviceKey)` manual | `validateTenantAccess()` (shared utility) |
| Data ops client | None (AI-only) | None (AI-only) |
| service_role data ops | 0 (membership only) | **0** |
| adminClient residual | N/A | **0** |

---

## Global Batch Summary

```text
Function                        | adminClient remaining | service_role data ops | Status
────────────────────────────────┼───────────────────────┼───────────────────────┼─────────────────
erp-hr-ai-agent                 | 0                     | 0 (was ~20+)          | ✅ Clean (S6.3C)
erp-hr-analytics-agent          | 0                     | 0                     | ✅ Clean (S6.3C)
erp-hr-analytics-intelligence   | 0                     | 0                     | ✅ Clean + SECURITY FIX
erp-hr-autonomous-copilot       | 0                     | 0                     | ✅ Clean (S6.3C)
erp-hr-people-analytics-ai      | 0                     | 0                     | ✅ Clean (S6.3C)
```

### Key Metrics

| Metric | Value |
|--------|-------|
| Functions migrated | **5/5** (100%) |
| service_role data ops eliminated | **~20+** (all in erp-hr-ai-agent) |
| Tenant isolation gaps closed | **1** (erp-hr-analytics-intelligence) |
| Residual adminClient usage | **0** |
| Exceptions / residual debt | **0** |
| Authorization passthrough hardened | **0** (none had passthrough) |

### Regression Risk Assessment

- **Low risk**: All 5 functions now use the same `validateTenantAccess()` pattern already proven in Batch 1 (S6.3B)
- **erp-hr-ai-agent**: Highest risk due to ~20+ data ops migrated from service_role to userClient. If any table lacks proper RLS policies for the user's JWT context, queries may return empty results. All referenced tables (`erp_hr_knowledge_base`, `erp_hr_collective_agreements`, `erp_hr_leave_requests`, `erp_hr_alerts`, `erp_hr_employees`, `erp_hr_contracts`, `erp_hr_payrolls`, `erp_hr_safety_incidents`, `erp_hr_performance_reviews`, `erp_hr_compliance_alerts`, `erp_hr_agent_actions`, `erp_hr_prl_requirements`) should have company-scoped RLS policies
- **No inter-agent chaining risk**: None of these functions invoke other edge functions internally — they all call the AI gateway directly

---

## Cumulative Progress (S6.3B + S6.3C)

```text
Batch   | Functions | service_role ops eliminated | Security fixes
────────┼───────────┼────────────────────────────┼───────────────
S6.3B   | 5/5       | ~50+                       | 0
S6.3C   | 5/5       | ~20+                       | 1 (tenant isolation gap)
────────┼───────────┼────────────────────────────┼───────────────
TOTAL   | 10/10     | ~70+                       | 1
```

All 10 functions from Batches 1 and 2 are now under the standard `validateTenantAccess()` pattern with zero residual `service_role` usage for data operations.
