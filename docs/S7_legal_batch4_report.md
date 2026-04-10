# S7.4 — Legal Hardening Batch 4 Report: Global Catalog Functions

**Date**: 2026-04-10  
**Scope**: 2 edge functions (global catalog, legitimate service_role exceptions)  
**Objective**: Standardize auth using shared utilities, document legitimate service_role exceptions, close Legal domain

---

## Summary

| Function | Auth Before | Auth After | service_role kept | Justified | admin check |
|---|---|---|---|---|---|
| erp-legal-knowledge-loader | **None** | `validateAuth(req)` | Yes (all ops) | Global catalog reads/writes | Yes (expand_knowledge only) |
| legal-knowledge-sync | Manual dual-path (~65 LOC) | Shared utils dual-path (~25 LOC) | Yes (all ops) | Global catalog upserts | Yes (user path) |

---

## Detailed Changes

### 1. erp-legal-knowledge-loader (143→~165 lines)

**Auth pattern BEFORE**:
```
- Zero auth — no Authorization header check
- No JWT validation
- No role check
- createClient(URL, SERVICE_ROLE_KEY) for ALL operations
- Any anonymous caller could read global catalogs and write via expand_knowledge
```

**Auth pattern AFTER**:
```
- Import validateAuth, isAuthError from _shared/tenant-auth.ts
- validateAuth(req) — real JWT validation via getClaims()
- Return 401 if auth fails
- For expand_knowledge: admin role check via user_roles query (service_role)
- Return 403 if user lacks admin/superadmin role
- authenticatedUserId from auth result used for logging
```

**DB ops**:
| Operation | Client | Justification |
|---|---|---|
| SELECT `erp_entity_type_rules` | service_role | Global catalog, no user-scoped RLS |
| SELECT `erp_legal_knowledge_base` | service_role | Global catalog, no user-scoped RLS |
| INSERT `erp_legal_knowledge_base` | service_role | Global catalog write (admin-gated) |
| SELECT `user_roles` | service_role | Role lookup on restricted table |

**Why service_role is legitimate**: These tables are system-level global catalogs (`erp_entity_type_rules`, `erp_legal_knowledge_base`) without tenant-scoped RLS. Same pattern as `erp-hr-agreement-updater` for system-wide salary tables.

**Key security improvements**:
1. Auth gate added where none existed (was completely open)
2. JWT is now validated via `validateAuth(req)` using `getClaims()`
3. Admin role check added for write operations (`expand_knowledge`)
4. Read operations still require authentication (no anonymous access)

---

### 2. legal-knowledge-sync (782→~755 lines)

**Auth pattern BEFORE**:
```
- Manual dual-path auth (~65 lines of boilerplate):
  - Cron: manual x-cron-secret header comparison (L630-635)
  - User: manual JWT validation via getUser() (unnecessary server round-trip)
  - User: separate adminClient creation for role check
  - User: manual role extraction and comparison
- createClient(URL, SERVICE_ROLE_KEY) for ALL DB operations
```

**Auth pattern AFTER**:
```
- Import validateCronOrServiceAuth from _shared/cron-auth.ts
- Import validateAuth, isAuthError from _shared/tenant-auth.ts
- Cron/service path: validateCronOrServiceAuth(req) — checks x-cron-secret and service_role
- User path: validateAuth(req) — real JWT validation via getClaims() (no getUser round-trip)
- User path: admin role check via user_roles query (service_role)
- ~25 lines of auth code (was ~65)
```

**DB ops**:
| Operation | Client | Justification |
|---|---|---|
| SELECT `legal_knowledge_base` | service_role | Global catalog, check existence |
| UPDATE `legal_knowledge_base` | service_role | Global catalog upsert |
| INSERT `legal_knowledge_base` | service_role | Global catalog upsert |
| SELECT `user_roles` | service_role | Role lookup (user path only) |

**Why service_role is legitimate**: `legal_knowledge_base` is a system-level global catalog. Cron path has no user JWT. User path writes system-level catalog data, not user-scoped content. Same pattern as `erp-hr-enterprise-admin` for global catalog writes.

**Key security improvements**:
1. Manual auth replaced with shared utilities (consistent patterns)
2. `getUser()` replaced with `getClaims()` (eliminates unnecessary server round-trip)
3. Separate adminClient creation eliminated (reuses service_role client for role check)
4. Auth boilerplate reduced from ~65 to ~25 lines

---

## Batch Impact

### Before Batch S7.4
```
Functions with zero auth: 1 (erp-legal-knowledge-loader)
Functions with manual auth: 1 (legal-knowledge-sync — 65 LOC boilerplate)
Functions using shared utilities: 0 of 2
```

### After Batch S7.4
```
Functions with zero auth: 0 (was 1)
Functions with manual auth: 0 (was 1)
Functions using shared utilities: 2 of 2
Functions with validateAuth(): 2 (both)
Functions with validateCronOrServiceAuth(): 1 (legal-knowledge-sync)
Functions with admin role check: 2 (both — for write/sync operations)
```

---

## Legitimate Exceptions

### 1. erp-legal-knowledge-loader — service_role for all DB ops

**Tables**: `erp_entity_type_rules`, `erp_legal_knowledge_base`  
**Operations**: SELECT (reads) + INSERT (expand_knowledge writes)  
**Why legitimate**:
- Global catalog tables without tenant-scoped RLS policies
- Not user-owned data — system-level legal reference material
- Write operations gated behind admin role check
- Read operations gated behind JWT authentication
- Same pattern as `erp-hr-agreement-updater` (system-wide salary tables)

### 2. legal-knowledge-sync — service_role for all DB ops

**Table**: `legal_knowledge_base`  
**Operations**: SELECT + UPDATE + INSERT (catalog upserts)  
**Why legitimate**:
- Global catalog sync — system-level knowledge base, not tenant-scoped
- Cron path has no user JWT (system-initiated sync)
- User path writes system-level catalog data, not personal content
- Both paths require authorization (cron secret or admin role)
- Same pattern as `erp-hr-enterprise-admin` (global catalog writes)

---

## Chaining Verification

Not applicable for this batch — neither function chains to downstream edge functions.

---

## Domain Closure Impact

### Legal Domain — Complete Hardening Summary

```
Batch S7.1: 6 functions hardened (AI-only zero-auth) ✅
Batch S7.2: 2 functions hardened (DB-touching, service_role migration) ✅
Batch S7.3: 2 functions hardened (chaining fix, dual-path) ✅
Batch S7.4: 2 functions hardened (global catalog, legitimate exceptions) ✅
```

### Final State: 12/12 Legal Functions Hardened

| Function | Auth Pattern | service_role | Exception Type |
|---|---|---|---|
| erp-legal-spend | validateTenantAccess | 0 | — |
| legal-autonomous-copilot | validateAuth | 0 | — |
| legal-entity-management | validateAuth | 0 | — |
| legal-predictive-analytics | validateAuth | 0 | — |
| legal-validation-gateway-enhanced | validateAuth | 0 | — |
| smart-legal-contracts | validateAuth | 0 | — |
| ai-legal-validator | validateAuth | 0 | — |
| legal-action-router | validateTenantAccess | 0 | — |
| legal-multiagent-supervisor | validateTenantAccess | 0 | — |
| legal-ai-advisor | validateAuth + x-internal-secret | Internal path only | Inter-agent auth |
| erp-legal-knowledge-loader | validateAuth + admin check | All ops | Global catalog |
| legal-knowledge-sync | validateCronOrServiceAuth + validateAuth + admin check | All ops | Global catalog |

### Legitimate Exceptions in Legal Domain: 3

1. **legal-ai-advisor** (internal path): service_role for agent_queries/validation_logs when called via x-internal-secret by other agents
2. **erp-legal-knowledge-loader**: service_role for global catalog reads/writes on `erp_entity_type_rules` and `erp_legal_knowledge_base`
3. **legal-knowledge-sync**: service_role for global catalog upserts on `legal_knowledge_base`

### Security Debt Remaining: 0

- 0 functions with zero auth
- 0 functions with fake auth (header-only checks)
- 0 functions with manual auth boilerplate (all use shared utilities)
- 0 functions with insecure chaining (SERVICE_ROLE_KEY as Bearer)
- All exceptions are documented, bounded, and justified

**The Legal domain is ready for source-of-truth closure.**
