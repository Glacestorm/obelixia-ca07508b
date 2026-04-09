# S6.3F — Auth Hardening Batch 5: Orquestación / Bridges / Integraciones

## Execution Summary

- **Date**: 2026-04-09
- **Batch**: S6.3F (Batch 5)
- **Functions migrated**: 7/7
- **Pattern**: `validateTenantAccess()` from `_shared/tenant-auth.ts`

---

## Per-Function BEFORE / AFTER

### 1. hr-orchestration-engine

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| JWT method | `getUser()` via service_role client | `validateTenantAccess()` → `getClaims()` |
| Membership check | service_role manual query | `validateTenantAccess()` built-in |
| Data ops client | `createClient(SERVICE_ROLE_KEY)` — ALL ops | `userClient` (anon + JWT, RLS enforced) |
| service_role data ops | ~10 (rules SELECT, log INSERT, rules UPDATE) | **0** |
| createClient import | Yes (service_role) | **Removed** |
| Chaining | `invoke_ai` via Lovable AI Gateway (no SR) | Unchanged (no SR involved) |
| Security gap | All data ops bypass RLS | **Fixed** — RLS enforced |

### 2. hr-multiagent-supervisor

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| JWT method | `getUser()` via service_role client | `validateTenantAccess()` → `getClaims()` |
| Membership check | service_role manual query | `validateTenantAccess()` built-in |
| Data ops client | `createClient(SERVICE_ROLE_KEY)` — ALL ops | `userClient` (anon + JWT, RLS enforced) |
| service_role data ops | ~5 (registry SELECT, invocations SELECT/INSERT) | **0** |
| createClient import | Yes (service_role) | **Removed** |
| Chaining | `Bearer ${SERVICE_ROLE_KEY}` to 4+ downstream agents | **`Authorization: ${userAuthHeader}`** — user JWT forwarded |
| Security gap | Downstream agents received service_role, bypassing their own auth | **Fixed** — downstream agents validate actual user |

### 3. erp-hr-workflow-engine

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| JWT method | `getUser()` via service_role client | `validateTenantAccess()` → `getClaims()` |
| Membership check | CONDITIONAL (skipped if `company_id` absent) | **MANDATORY** — returns 400 if missing |
| Data ops client | `createClient(SERVICE_ROLE_KEY)` — ALL ~30+ ops | `userClient` (anon + JWT, RLS enforced) |
| service_role data ops | ~30+ (definitions, steps, instances, decisions, SLA, delegations, audit, payroll sync, admin request sync) | **0** |
| createClient import | Yes (service_role) | **Removed** |
| Security gap | `company_id` optional → membership skipped | **Fixed** — `company_id` required, 400 if missing |

### 4. payroll-cross-module-bridge

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| JWT method | `getClaims()` via anon client | `validateTenantAccess()` → `getClaims()` |
| Membership check | Manual `adminClient` (service_role) for membership only | `validateTenantAccess()` built-in |
| Data ops client | `userClient` (anon + JWT) — already good | `userClient` from `validateTenantAccess()` |
| service_role data ops | 1 (membership check only) | **0** |
| createClient import | Yes (2 clients: anon + service_role) | **Removed** |
| Security gap | None (already validates) | Clean |

### 5. hr-enterprise-integrations

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| JWT method | `getClaims()` via anon client | `validateTenantAccess()` → `getClaims()` |
| Membership check | Manual `adminClient` (service_role) for membership | `validateTenantAccess()` built-in |
| Data ops client | AI-only (no data ops) | Unchanged |
| service_role data ops | 0 (membership only) | **0** |
| createClient import | Yes (anon + service_role) | **Removed** |
| Security gap | None | Clean |

### 6. hr-premium-api

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| JWT method | `getClaims()` via anon client | `validateTenantAccess()` → `getClaims()` |
| Membership check | CONDITIONAL (skipped if `companyId` falsy) | **MANDATORY** — returns 400 if missing |
| Data ops client | `userClient` (anon + JWT) — already good | `userClient` from `validateTenantAccess()` |
| service_role data ops | 0 | **0** |
| createClient import | Yes (anon) | **Removed** |
| Security gap | `company_id` optional → membership skipped for some actions | **Fixed** — `company_id` required, 400 if missing |

### 7. hr-analytics-bi

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| JWT method | `getClaims()` via anon client | `validateTenantAccess()` → `getClaims()` |
| Membership check | Manual `adminClient` (service_role) for membership | `validateTenantAccess()` built-in |
| Data ops client | AI-only (no data ops) | Unchanged |
| service_role data ops | 0 (membership only) | **0** |
| createClient import | Yes (anon + service_role) | **Removed** |
| Security gap | None | Clean |

---

## Summary Table

| Function | validateTenantAccess | adminClient remaining | service_role data ops | Security fix | Chaining fix |
|----------|---------------------|----------------------|----------------------|--------------|--------------|
| hr-orchestration-engine | ✅ | 0 | 0 | RLS bypass fixed | — |
| hr-multiagent-supervisor | ✅ | 0 | 0 | — | ✅ JWT forwarding |
| erp-hr-workflow-engine | ✅ | 0 | 0 | company_id mandatory | — |
| payroll-cross-module-bridge | ✅ | 0 | 0 | — | — |
| hr-enterprise-integrations | ✅ | 0 | 0 | — | — |
| hr-premium-api | ✅ | 0 | 0 | company_id mandatory | — |
| hr-analytics-bi | ✅ | 0 | 0 | — | — |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Functions migrated | **7/7** |
| service_role data ops eliminated | **~45+** |
| Tenant isolation gaps closed | **2** (workflow-engine, premium-api) |
| Chaining fixes | **1** (multiagent-supervisor: user JWT forwarding) |
| Documented exceptions | **0** |
| Residual adminClient | **0** |

---

## Residual Exceptions

**None.** All 7 functions in this batch are fully migrated to `validateTenantAccess()` with zero residual `adminClient` or `service_role` usage for data operations.

---

## Cumulative Progress (S6.3B through S6.3F)

| Batch | Functions | service_role ops eliminated | Security fixes | Exceptions |
|-------|-----------|----------------------------|----------------|------------|
| S6.3B | 5/5 | ~50+ | 0 | 0 |
| S6.3C | 5/5 | ~20+ | 1 | 0 |
| S6.3D | 6/6 | ~6 | 2 | 0 |
| S6.3E | 5/5 | ~70+ | 2 | 1 |
| S6.3F | 7/7 | ~45+ | 3 | 0 |
| **TOTAL** | **28/28** | **~191+** | **8** | **1** |

The single exception across all batches is `erp-hr-whistleblower-agent.submit_report` (anonymous INSERT per EU Directive 2019/1937).
