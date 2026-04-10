# S7.2 — Legal Hardening Batch 2 Report: DB-Touching Functions

**Date**: 2026-04-10  
**Scope**: 2 edge functions (DB-touching, service_role migration)  
**Objective**: Replace fake/missing auth with real JWT validation, migrate DB ops to userClient, enforce tenant isolation

---

## Summary

| Function | Auth Before | Auth After | DB Client Before | DB Client After | service_role ops eliminated | adminClient after | company_id mandatory |
|---|---|---|---|---|---|---|---|
| ai-legal-validator | Header presence check (fake) | `validateAuth(req)` | service_role | userClient | 2 (rpc + insert) | 0 | No (not tenant-scoped) |
| legal-action-router | **None** | `validateTenantAccess(req, company_id)` | service_role | userClient | 3 (INSERT + SELECT + UPDATE) | 0 | **Yes** |

---

## Detailed Changes

### 1. ai-legal-validator (417→~420 lines)

**Auth pattern BEFORE**:
```
- Checks Authorization header EXISTS (line 100-106) but never validates the JWT
- Creates service_role client for ALL operations (line 108-111)
- Trusts body.user_id for audit logs — no server-side identity verification
```

**Auth pattern AFTER**:
```
- Import validateAuth, isAuthError from _shared/tenant-auth.ts
- validateAuth(req) — real JWT validation via getClaims()
- userClient created with anon key + user JWT (goes through RLS)
- authenticatedUserId from auth result used for ALL audit logs
- body.user_id is ignored — server-side identity only
```

**DB ops migration**:
| Operation | Before | After |
|---|---|---|
| `rpc('log_ai_legal_validation', ...)` | service_role | userClient |
| `from('ai_audit_logs').insert(...)` | service_role | userClient |
| `checkConsent()` | service_role (stub, no real query) | userClient (still stub) |

**Why `validateAuth()` (not `validateTenantAccess`)**: Function operates on data classification levels (public/internal/confidential/restricted), not on company-scoped data. No `company_id` in the request interface. Tenant isolation is not applicable — auth ensures only authenticated users can invoke.

**Key security improvements**:
1. JWT is now actually validated (was only checking header existence)
2. `user_id` in audit logs comes from validated JWT, not from untrusted body
3. service_role client eliminated — all DB ops go through RLS

**Residual adminClient**: 0  
**Risk**: Low — if RLS blocks audit inserts, the function gracefully handles the error (logged: false). No data loss, no crash.

---

### 2. legal-action-router (271→~270 lines)

**Auth pattern BEFORE**:
```
- Zero auth gate — no Authorization header check
- createClient(URL, SERVICE_ROLE_KEY) for ALL operations (line 57-59)
- Optional supabase.auth.getUser() only to extract userId (line 165)
- All INSERT/SELECT/UPDATE on erp_legal_procedures bypass RLS
```

**Auth pattern AFTER**:
```
- Import validateTenantAccess, isAuthError from _shared/tenant-auth.ts
- Parse body first to extract company_id
- Return 400 if company_id missing
- validateTenantAccess(req, company_id) — JWT + active membership check
- userClient from auth result used for ALL DB operations
- userId from auth result (not body.user_id or getUser)
```

**DB ops migration**:
| Operation | Before | After |
|---|---|---|
| INSERT `erp_legal_procedures` | service_role | userClient |
| SELECT `erp_legal_procedures` | service_role | userClient |
| UPDATE `erp_legal_procedures` | service_role | userClient |

**Why `validateTenantAccess()` with mandatory `company_id`**: Every operation in this function is company-scoped — procedures are created, queried, and updated by `company_id`. Tenant isolation is critical to prevent cross-company data leakage.

**Key security improvements**:
1. Auth gate added where none existed
2. Tenant membership verified — user must have active membership in the company
3. All DB ops go through RLS via userClient
4. userId comes from validated JWT, not from body or optional getUser
5. company_id is mandatory (400 if missing)

**Residual adminClient**: 0  
**Risk**: None — all operations are user-scoped and tenant-isolated

---

## Batch Impact

### Before Batch S7.2
```
Functions with fake/no auth + service_role: 2
service_role data ops in legal domain: 5 (2 in ai-legal-validator + 3 in legal-action-router)
Functions with real tenant isolation: 0 of 2
```

### After Batch S7.2
```
Functions with fake/no auth: 0 (was 2)
service_role data ops eliminated: 5 (all migrated to userClient)
Functions with validateAuth(): 1 (ai-legal-validator)
Functions with validateTenantAccess(): 1 (legal-action-router)
Functions with mandatory company_id: 1 (legal-action-router)
```

### Totals
- **2/2 functions hardened** in this batch
- **5 service_role data ops eliminated** (2 in ai-legal-validator + 3 in legal-action-router)
- **1 tenant isolation gap closed** (legal-action-router had zero auth)
- **1 fake auth replaced** (ai-legal-validator only checked header existence)
- **0 regressions expected** — logic, prompts, AI calls unchanged

---

## Residual Exceptions

**0 adminClient/service_role exceptions remain.**

Both functions now operate entirely through `userClient` (anon key + user JWT). If RLS policies on `ai_audit_logs` or `log_ai_legal_validation` RPC block userClient writes, the ai-legal-validator handles this gracefully with `{ logged: false }` — no crash, no data corruption. This is acceptable because:
1. Audit logging failure is non-blocking (the validation result is still returned)
2. The correct fix for audit log RLS is a separate RLS policy change (out of scope for S7.2)
3. No service_role fallback is introduced — fail-open on audit is better than privilege escalation

---

## Legal Domain Auth Coverage Progress

```
Batch S7.1: 6 functions hardened (AI-only zero-auth) ✅
Batch S7.2: 2 functions hardened (DB-touching, service_role migration) ✅
Remaining for S7.3: 2 functions (legal-multiagent-supervisor, legal-ai-advisor — chaining/dual-path)
Remaining for S7.4: 2 functions (erp-legal-knowledge-loader, legal-knowledge-sync — global catalogs)
```

---

## Next Steps

- **S7.3**: Fix `legal-multiagent-supervisor` (forwards SERVICE_ROLE_KEY to downstream agents) + `legal-ai-advisor` dual-path
- **S7.4**: Standardize `erp-legal-knowledge-loader` and `legal-knowledge-sync` (global catalogs)
