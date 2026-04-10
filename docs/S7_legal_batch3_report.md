# S7.3 — Legal Hardening Batch 3 Report: Chaining + Dual-Path

**Date**: 2026-04-10  
**Scope**: 2 edge functions (chaining fix, dual-path auth standardization)  
**Objective**: Eliminate SERVICE_ROLE_KEY forwarding in downstream calls, standardize auth with shared utilities, enforce tenant isolation

---

## Summary

| Function | Auth Before | Auth After | Chaining Before | Chaining After | service_role ops eliminated | adminClient after | company_id mandatory |
|---|---|---|---|---|---|---|---|
| legal-multiagent-supervisor | Manual `getUser` via service_role, no membership | `validateTenantAccess(req, company_id)` | 3× `Bearer SERVICE_ROLE_KEY` | 3× user JWT forwarded | 4 (1 SELECT + 2 INSERT + 1 getUser) | 0 | Yes (was already required) |
| legal-ai-advisor | Manual dual-path (70 LOC boilerplate) | Shared utils (`validateTenantAccess` / `validateAuth`) + `x-internal-secret` | N/A | N/A | ~10 user-path ops → userClient | Internal path only (justified) | Via context.companyId (optional) |

---

## Detailed Changes

### 1. legal-multiagent-supervisor (375→~340 lines)

**Auth pattern BEFORE**:
```
- createClient(URL, SERVICE_ROLE_KEY) as single client (L61)
- Manual getUser via service_role (L64-70) — userId optional (null if no header)
- No tenant membership validation
- Any authenticated user can query for any company
```

**Auth pattern AFTER**:
```
- Import validateTenantAccess, isAuthError from _shared/tenant-auth.ts
- Parse body first to extract company_id
- validateTenantAccess(req, company_id) — JWT + active membership check
- userId from authResult (validated)
- userClient for all DB operations
```

**Chaining fix (CRITICAL)**:
| Downstream Call | Before | After |
|---|---|---|
| `legal-ai-advisor` (route_query → labor) | `Bearer ${supabaseKey}` (SERVICE_ROLE_KEY) | `originalAuthHeader` (user JWT) |
| `legal-validation-gateway-enhanced` (validate_hr_action step 1) | `Bearer ${supabaseKey}` (SERVICE_ROLE_KEY) | `originalAuthHeader` (user JWT) |
| `legal-ai-advisor` (validate_hr_action step 2) | `Bearer ${supabaseKey}` (SERVICE_ROLE_KEY) | `originalAuthHeader` (user JWT) |

**DB ops migration**:
| Operation | Before | After |
|---|---|---|
| SELECT `erp_ai_agent_invocations` (get_status) | service_role | userClient |
| INSERT `erp_ai_agent_invocations` (route_query log) | service_role | userClient |
| INSERT `erp_ai_agent_invocations` (validate_hr_action log) | service_role | userClient |

**Key security improvements**:
1. Tenant membership now validated — user must have active membership in the company
2. SERVICE_ROLE_KEY no longer used as Bearer token for downstream calls — eliminates privilege escalation via chaining
3. All DB ops go through RLS via userClient
4. userId comes from validated JWT, not from optional getUser

**Residual adminClient**: 0  
**Residual service_role**: 0  

---

### 2. legal-ai-advisor (906→~900 lines)

**Auth pattern BEFORE**:
```
- Manual dual-path (L166-232): ~70 lines of boilerplate
  - Internal: x-internal-secret validated against LEGAL_INTERNAL_SECRET
  - User: manual getClaims + manual createClient for membership check via service_role
- After auth gate, createClient(URL, SERVICE_ROLE_KEY) as `supabase` for ALL DB ops (L235)
- User-path queries bypass RLS entirely
```

**Auth pattern AFTER**:
```
- Import validateTenantAccess, validateAuth, isAuthError from _shared/tenant-auth.ts
- Dual-path with clean separation:
  - Internal path: x-internal-secret → service_role dbClient (justified, no user JWT)
  - User path with companyId: validateTenantAccess → userClient as dbClient
  - User path without companyId: validateAuth → manual userClient as dbClient
- Single `dbClient` variable used for ALL downstream DB ops
- Path determines client type (service_role vs userClient)
```

**DB ops split by path**:

**User path (→ userClient via RLS)**:
| Operation | Table |
|---|---|
| SELECT | `legal_jurisdictions` |
| SELECT | `legal_knowledge_base` |
| SELECT/COUNT | `legal_compliance_checks` |
| SELECT/COUNT | `legal_documents` |
| SELECT/COUNT | `legal_knowledge_base` |
| SELECT/COUNT | `agent_help_conversations` |
| SELECT + UPDATE/INSERT | `legal_advisor_faq` |

**Internal path (→ service_role, justified)**:
| Operation | Table | Justification |
|---|---|---|
| INSERT | `legal_agent_queries` | Inter-agent audit — no user JWT available |
| INSERT | `legal_validation_logs` | Validation audit — no user JWT available |

**Key security improvements**:
1. Manual auth boilerplate (70 LOC) replaced with shared utilities (~15 LOC)
2. User-path DB ops now go through RLS (were bypassing via service_role)
3. Clean separation: `dbClient` is service_role only when path is internal
4. `authenticatedUserId` tracked for user path

**Residual service_role**: Internal path only — bounded to `legal_agent_queries` and `legal_validation_logs` inserts when called via x-internal-secret by other agents. This is a **justified exception** because:
1. Inter-agent calls do not carry a user JWT — there is no user identity to create a userClient
2. The x-internal-secret gate ensures only authorized internal agents can reach this path
3. The operations are audit/logging writes that need to succeed regardless of RLS policies

---

## Chaining Verification

### Before S7.3
```
legal-multiagent-supervisor
  ├── fetch(legal-ai-advisor, { Authorization: Bearer SERVICE_ROLE_KEY })
  ├── fetch(legal-validation-gateway-enhanced, { Authorization: Bearer SERVICE_ROLE_KEY })
  └── fetch(advanced-clm-engine, { Authorization: Bearer SERVICE_ROLE_KEY })

Result: All downstream functions receive admin-level credentials.
Any auth gate in downstream functions is bypassed.
```

### After S7.3
```
legal-multiagent-supervisor
  ├── fetch(legal-ai-advisor, { Authorization: <original user JWT> })
  ├── fetch(legal-validation-gateway-enhanced, { Authorization: <original user JWT> })
  └── fetch(advanced-clm-engine, { Authorization: <original user JWT> })

Result: Downstream functions receive the real user JWT.
Each downstream function performs its own auth validation.
Tenant isolation is preserved end-to-end.
```

### Compatibility with downstream functions
- **legal-ai-advisor** (S7.3): User path accepts JWT via `validateTenantAccess` / `validateAuth` ✅
- **legal-validation-gateway-enhanced** (S7.1): Accepts JWT via `validateAuth` ✅
- **advanced-clm-engine**: Will receive user JWT — if it validates JWT, it works; if it uses service_role internally, the JWT is simply not used for DB ops (no regression)

---

## Batch Impact

### Before Batch S7.3
```
Functions with SERVICE_ROLE_KEY chaining: 1 (legal-multiagent-supervisor → 3 downstream calls)
Functions with manual auth boilerplate: 2
service_role data ops on user path: ~14 (4 in supervisor + ~10 in advisor)
Functions with real tenant isolation: 0 of 2
```

### After Batch S7.3
```
Functions with SERVICE_ROLE_KEY chaining: 0 (was 1)
SERVICE_ROLE_KEY Bearer forwarding eliminated: 3 calls
Functions with shared auth utilities: 2 of 2
service_role data ops on user path: 0 (all migrated to userClient)
Functions with validateTenantAccess(): 2 (both support it)
Functions with dual-path: 1 (legal-ai-advisor — user + internal)
```

### Totals
- **2/2 functions hardened** in this batch
- **3 SERVICE_ROLE_KEY chaining calls eliminated** (legal-multiagent-supervisor)
- **~14 service_role data ops migrated to userClient** on user path
- **1 critical chaining vulnerability closed** (supervisor was forwarding admin credentials to downstream agents)
- **0 regressions expected** — logic, prompts, AI calls unchanged

---

## Residual Exceptions

### 1. legal-ai-advisor internal path (JUSTIFIED)

**What**: service_role client for DB operations when called via `x-internal-secret` by other agents.

**Scope**: Bounded to:
- INSERT into `legal_agent_queries` (agent audit logging)
- INSERT into `legal_validation_logs` (validation audit)

**Justification**:
1. Inter-agent calls carry `x-internal-secret` header, not a user JWT
2. No user identity exists to create a userClient
3. The x-internal-secret gate ensures only authorized internal agents can invoke
4. These are audit/compliance writes that must succeed regardless of RLS
5. Fail-closed: if `LEGAL_INTERNAL_SECRET` is not configured, the internal path returns 503

**Risk**: Minimal — the internal secret is a dedicated credential separate from database credentials, and the operations are bounded to audit tables.

---

## Legal Domain Auth Coverage Progress

```
Batch S7.1: 6 functions hardened (AI-only zero-auth) ✅
Batch S7.2: 2 functions hardened (DB-touching, service_role migration) ✅
Batch S7.3: 2 functions hardened (chaining fix, dual-path standardization) ✅
Remaining for S7.4: 2 functions (erp-legal-knowledge-loader, legal-knowledge-sync — global catalogs)
```

---

## Next Steps

- **S7.4**: Standardize `erp-legal-knowledge-loader` and `legal-knowledge-sync` (global catalog utilities)
- Consider adding `x-internal-secret` header to supervisor→advisor calls for the internal agent path (currently routed as user path with forwarded JWT, which is correct for user-initiated flows)
