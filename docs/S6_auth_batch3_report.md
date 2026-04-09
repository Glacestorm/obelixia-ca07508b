# S6.3D — Auth Hardening Batch 3: HR Operativo Core — Report

**Date**: 2026-04-09  
**Batch**: S6.3D (Batch 3)  
**Functions**: 6 HR Operativo Core edge functions  
**Status**: ✅ Complete

---

## Per-Function Validation

### 1. erp-hr-clm-agent (410 lines) — MODERATE

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getUser()` manual | `validateTenantAccess()` |
| Membership check | `service_role` manual query (conditional on `company_id`) | `validateTenantAccess()` (mandatory) |
| Data ops client | None (AI-only) | None (AI-only) |
| service_role data ops | 0 (membership only) | **0** |
| adminClient residual | N/A | **0** |
| `createClient` import | Yes (manual) | **Removed** — uses shared `tenant-auth.ts` |
| `company_id` validation | Optional (skipped if missing) | **Required** (returns 400) |

### 2. erp-hr-credentials-agent (328 lines) — MODERATE + **SECURITY FIX**

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getClaims()` manual | `validateTenantAccess()` |
| Membership check | **NONE** ⚠️ | `validateTenantAccess()` ✅ |
| Data ops client | None (AI-only) | None (AI-only) |
| service_role data ops | 0 | **0** |
| adminClient residual | N/A | **0** |
| `createClient` import | Yes (manual) | **Removed** |
| Tenant isolation | **MISSING** — any authenticated user could invoke for any company | **ENFORCED** — membership validated |
| `company_id` validation | Not in request interface | **Required** (returns 400) |

**Critical security fix**: This function previously had NO membership check. Any authenticated user could call it with any context and access credential operations for companies they don't belong to. Now properly gated by `validateTenantAccess()`.

### 3. erp-hr-performance-agent (338 lines) — SIMPLE

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getClaims()` manual | `validateTenantAccess()` |
| Membership check | `service_role` manual (conditional on `company_id`) | `validateTenantAccess()` (mandatory) |
| Data ops client | None (AI-only) | None (AI-only) |
| service_role data ops | 0 (membership only) | **0** |
| adminClient residual | N/A | **0** |
| `createClient` import | Yes (manual, 3 clients created) | **Removed** |
| `company_id` validation | Conditional (skipped if missing) | **Required** (returns 400) |

### 4. erp-hr-smart-contracts (611 lines) — MODERATE + **SECURITY FIX**

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getClaims()` manual | `validateTenantAccess()` |
| Membership check | **NONE** ⚠️ | `validateTenantAccess()` ✅ |
| Data ops client | None (AI-only) | None (AI-only) |
| service_role data ops | 0 | **0** |
| adminClient residual | N/A | **0** |
| `createClient` import | Yes (manual) | **Removed** |
| Tenant isolation | **MISSING** — any authenticated user could invoke for any company | **ENFORCED** — membership validated |
| `company_id` validation | Not in request interface | **Required** (returns 400) |

**Critical security fix**: This function previously had NO membership check. Any authenticated user could access smart contract operations for any company. Now properly gated by `validateTenantAccess()`.

### 5. erp-hr-talent-skills-agent (471 lines) — SIMPLE

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getClaims()` manual | `validateTenantAccess()` |
| Membership check | `service_role` manual (conditional on `company_id`) | `validateTenantAccess()` (mandatory) |
| Data ops client | None (AI-only) | None (AI-only) |
| service_role data ops | 0 (membership only) | **0** |
| adminClient residual | N/A | **0** |
| `createClient` import | Yes (manual, incl. serviceKey) | **Removed** |
| `company_id` validation | Optional (skipped if missing) | **Required** (returns 400) |

### 6. erp-hr-training-agent (338 lines) — SIMPLE

| Aspect | Before | After |
|--------|--------|-------|
| JWT method | `getClaims()` manual | `validateTenantAccess()` |
| Membership check | `service_role` manual (conditional on `company_id`) | `validateTenantAccess()` (mandatory) |
| Data ops client | None (AI-only) | None (AI-only) |
| service_role data ops | 0 (membership only) | **0** |
| adminClient residual | N/A | **0** |
| `createClient` import | Yes (manual, incl. serviceKey) | **Removed** |
| `company_id` validation | Optional (skipped if missing) | **Required** (returns 400) |

---

## Global Batch Summary

```text
Function                     | adminClient remaining | service_role data ops | Status
─────────────────────────────┼───────────────────────┼───────────────────────┼─────────────────
erp-hr-clm-agent             | 0                     | 0                     | ✅ Clean (S6.3D)
erp-hr-credentials-agent     | 0                     | 0                     | ✅ Clean + SECURITY FIX
erp-hr-performance-agent     | 0                     | 0                     | ✅ Clean (S6.3D)
erp-hr-smart-contracts       | 0                     | 0                     | ✅ Clean + SECURITY FIX
erp-hr-talent-skills-agent   | 0                     | 0                     | ✅ Clean (S6.3D)
erp-hr-training-agent        | 0                     | 0                     | ✅ Clean (S6.3D)
```

### Key Metrics

| Metric | Value |
|--------|-------|
| Functions migrated | **6/6** (100%) |
| service_role membership ops eliminated | **6** (one per function with membership) |
| Tenant isolation gaps closed | **2** (credentials-agent and smart-contracts) |
| Residual adminClient usage | **0** |
| Exceptions / residual debt | **0** |
| Authorization passthrough | **0** (none had passthrough) |
| Inter-agent chaining risk | **0** (none invoke other functions) |

### Regression Risk Assessment

- **Low risk**: All 6 functions are pure AI functions with no database data operations beyond the membership check now handled by `validateTenantAccess()`
- **Breaking change**: `company_id` is now **required** for all 6 functions. Callers that previously omitted it will receive a 400 error. This is intentional — operating without tenant scope was the security gap being closed.
- **No inter-agent chaining**: None of these functions invoke other edge functions internally

---

## Cumulative Progress (S6.3B + S6.3C + S6.3D)

```text
Batch   | Functions | service_role ops eliminated | Security fixes
────────┼───────────┼────────────────────────────┼───────────────
S6.3B   | 5/5       | ~50+                       | 0
S6.3C   | 5/5       | ~20+                       | 1
S6.3D   | 6/6       | ~6 (membership only)       | 2
────────┼───────────┼────────────────────────────┼───────────────
TOTAL   | 16/16     | ~76+                       | 3
```

All 16 functions from Batches 1, 2, and 3 are now under the standard `validateTenantAccess()` pattern with zero residual `service_role` usage for data operations.
