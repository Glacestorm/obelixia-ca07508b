# S7.1 — Legal Hardening Batch 1 Report: Zero-Auth AI-Only Functions

**Date**: 2026-04-10  
**Scope**: 6 edge functions (legal AI-only, zero auth)  
**Objective**: Eliminate zero-auth state and align with standard auth patterns

---

## Summary

| Function | Auth Before | Auth After | company_id mandatory | adminClient after | Notes |
|---|---|---|---|---|---|
| erp-legal-spend | **None** | `validateTenantAccess()` | **Yes** | 0 | Typed companyId in interface — tenant gate applied |
| legal-autonomous-copilot | **None** | `validateAuth()` | No | 0 | Generic context, no company scope |
| legal-entity-management | **None** | `validateAuth()` | No | 0 | Generic context, no company scope |
| legal-predictive-analytics | **None** | `validateAuth()` | No | 0 | Generic context, no company scope |
| legal-validation-gateway-enhanced | **None** | `validateAuth()` | No | 0 | Generic context, no company scope |
| smart-legal-contracts | **None** | `validateAuth()` | No | 0 | Generic context, no company scope |

---

## Detailed Changes

### 1. erp-legal-spend (343→~362 lines)

**Auth pattern BEFORE**:
```
- Zero auth — no Authorization header check
- No JWT validation
- No tenant/membership check
- company context in typed interface but never validated
```

**Auth pattern AFTER**:
```
- Import validateTenantAccess, isAuthError from _shared/tenant-auth.ts
- Parse body first to extract companyId
- companyId mandatory — return 400 if missing (from context.companyId or params.companyId)
- validateTenantAccess(req, companyId) — JWT + active membership check
- isAuthError() guard — return 401/403 on failure
```

**Changes**:
- Added import of `validateTenantAccess`, `isAuthError`
- Added companyId extraction + 400 guard
- Added auth block (7 lines) after body parse
- All AI logic, prompts, response structure **unchanged**

**Why `validateTenantAccess()`**: Function has typed `companyId` in its `LegalSpendRequest.context` interface. Every action analyzes company-specific spend data. Tenant isolation is required.

**Residual adminClient**: 0  
**Risk**: None — AI-only function, no DB operations

---

### 2. legal-autonomous-copilot (666→~680 lines)

**Auth pattern BEFORE**:
```
- Zero auth — no Authorization header check
- No JWT validation
- Generic context (Record<string, unknown>)
```

**Auth pattern AFTER**:
```
- Import validateAuth, isAuthError from _shared/tenant-auth.ts
- validateAuth(req) before body parse
- isAuthError() guard — return 401 on failure
```

**Changes**:
- Added import of `validateAuth`, `isAuthError`
- Added auth block (7 lines) before body parse
- All AI logic, autonomy levels, prompt structures **unchanged**

**Why `validateAuth()` (not `validateTenantAccess`)**: Generic `Record<string, unknown>` context with no guaranteed companyId. Function performs legal advisory/analysis without company-specific DB access. Auth ensures only authenticated users can invoke.

**Residual adminClient**: 0  
**Risk**: None — AI-only function

---

### 3. legal-entity-management (716→~730 lines)

**Auth pattern BEFORE**:
```
- Zero auth — no Authorization header check
- No JWT validation
- Generic context for entity analysis
```

**Auth pattern AFTER**:
```
- Import validateAuth, isAuthError from _shared/tenant-auth.ts
- validateAuth(req) before body parse
- isAuthError() guard — return 401 on failure
```

**Changes**:
- Added import of `validateAuth`, `isAuthError`
- Added auth block (7 lines) before body parse
- All AI logic (10 actions: entity structure, governance, IP, eDiscovery, etc.) **unchanged**

**Why `validateAuth()`**: Context is generic `Record<string, unknown>`. Entity management operates on submitted context data, not company-scoped DB queries. No reliable companyId to enforce tenant isolation.

**Residual adminClient**: 0  
**Risk**: None — AI-only function

---

### 4. legal-predictive-analytics (542→~556 lines)

**Auth pattern BEFORE**:
```
- Zero auth — no Authorization header check
- No JWT validation
- Generic context for litigation prediction
```

**Auth pattern AFTER**:
```
- Import validateAuth, isAuthError from _shared/tenant-auth.ts
- validateAuth(req) before body parse
- isAuthError() guard — return 401 on failure
```

**Changes**:
- Added import of `validateAuth`, `isAuthError`
- Added auth block (7 lines) before body parse
- All AI logic (8 actions: litigation prediction, cost estimation, jurisprudence trends, etc.) **unchanged**

**Why `validateAuth()`**: Generic context, no company scope. Predictive analysis is performed on submitted case data, not company DB records.

**Residual adminClient**: 0  
**Risk**: None — AI-only function

---

### 5. legal-validation-gateway-enhanced (579→~593 lines)

**Auth pattern BEFORE**:
```
- Zero auth — no Authorization header check
- No JWT validation
- Validates legal operations with no caller verification
```

**Auth pattern AFTER**:
```
- Import validateAuth, isAuthError from _shared/tenant-auth.ts
- validateAuth(req) before body parse
- isAuthError() guard — return 401 on failure
```

**Changes**:
- Added import of `validateAuth`, `isAuthError`
- Added auth block (7 lines) before body parse
- All AI logic (10 actions: validate_operation, create_rule, audit_trail, compliance_matrix, etc.) **unchanged**

**Why `validateAuth()`**: Context is generic `Record<string, unknown>`. Gateway validates operations conceptually via AI prompts, not via company-scoped DB reads.

**Residual adminClient**: 0  
**Risk**: None — AI-only function

---

### 6. smart-legal-contracts (697→~711 lines)

**Auth pattern BEFORE**:
```
- Zero auth — no Authorization header check
- No JWT validation
- Contract simulation with no caller verification
```

**Auth pattern AFTER**:
```
- Import validateAuth, isAuthError from _shared/tenant-auth.ts
- validateAuth(req) before body parse
- isAuthError() guard — return 401 on failure
```

**Changes**:
- Added import of `validateAuth`, `isAuthError`
- Added auth block (7 lines) before body parse
- All AI logic (9 actions: create_smart_contract, execute_clause, resolve_dispute, simulate_execution, etc.) **unchanged**

**Why `validateAuth()`**: Generic context, no company scope. Smart contract operations are AI-simulated, not DB-backed.

**Residual adminClient**: 0  
**Risk**: None — AI-only function

---

## Batch Impact

### Before Batch S7.1
```
Legal zero-auth functions: 6
Legal functions with any auth: 6 (of 12 total)
```

### After Batch S7.1
```
Legal zero-auth functions: 0 (was 6)
Legal functions with standard auth: 12 (of 12 total — 6 new + 6 existing)
Functions with validateTenantAccess(): 1 (erp-legal-spend)
Functions with validateAuth(): 5 (other 5)
```

### Totals
- **6/6 functions hardened** in this batch
- **0 zero-auth legal AI-only functions remaining**
- **0 adminClient/service_role introduced** (all AI-only, no DB ops)
- **0 regressions expected** — only auth gates added, no logic changes
- **1 function with mandatory companyId** (erp-legal-spend)
- **5 functions with minimum auth gate** (validateAuth)

### Legal Domain Auth Coverage Progress
```
Batch S7.1: 6 functions hardened (AI-only zero-auth)
Remaining for S7.2: 2 functions (ai-legal-validator, legal-action-router — DB-touching)
Remaining for S7.3: 2 functions (legal-multiagent-supervisor, legal-ai-advisor — chaining/dual-path)
Remaining for S7.4: 2 functions (erp-legal-knowledge-loader, legal-knowledge-sync — global catalogs)
```

---

## Next Steps

- **S7.2**: Harden `ai-legal-validator` and `legal-action-router` (DB-touching, service_role migration)
- **S7.3**: Fix `legal-multiagent-supervisor` chaining + `legal-ai-advisor` dual-path
- **S7.4**: Standardize `erp-legal-knowledge-loader` and `legal-knowledge-sync` (global catalogs)
