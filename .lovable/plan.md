

# S6.3C — Auth Hardening Batch 2: AI + Datos Sensibles

## Step 0 — Current Auth State

```text
Function                        | JWT method     | Membership check         | Data ops client          | service_role data ops | Target
────────────────────────────────┼────────────────┼──────────────────────────┼──────────────────────────┼───────────────────────┼────────────────────
erp-hr-ai-agent (1322 lines)    | getUser manual | service_role (manual)    | service_role for ALL ops | ~20+ SELECT/INSERT    | validateTenantAccess() — MAJOR
erp-hr-analytics-agent (460 ln) | getClaims man. | service_role (manual)    | AI-only (no data ops)    | 0 (membership only)   | validateTenantAccess()
erp-hr-analytics-intelligence   | getClaims man. | NONE (no membership!)    | AI-only (no data ops)    | 0                     | validateTenantAccess()
erp-hr-autonomous-copilot       | getUser manual | service_role (manual)    | AI-only (no data ops)    | 0 (membership only)   | validateTenantAccess()
erp-hr-people-analytics-ai      | getClaims man. | service_role (manual)    | AI-only (no data ops)    | 0 (membership only)   | validateTenantAccess()
```

All 5 touch company-scoped data or operate on company context. All go to `validateTenantAccess()`.

**Critical finding**: `erp-hr-analytics-intelligence` has NO membership check at all — any authenticated user can call it for any company. This is a tenant isolation gap.

---

## Changes per Function

### 1. erp-hr-ai-agent (1322 lines) — MAJOR REFACTOR

**Before**: Manual `getUser()` + `createClient(SERVICE_ROLE_KEY)` as `supabase`. ALL ~20+ data operations (knowledge base, collective agreements, PRL, leave requests, alerts, employees, contracts, payrolls, performance reviews, compliance alerts, agent actions) use the service_role client.

**Change**:
- Replace lines 56-84 (manual auth + manual service_role client) with `validateTenantAccess(req, effectiveCompanyId)`
- Body must be parsed before auth call to extract `company_id` — parse body first, then call `validateTenantAccess`
- Rename all `supabase.from(...)` references to `userClient.from(...)`
- All ~20+ data ops migrate to `userClient`
- Remove manual `createClient` import for service_role
- **adminClient after**: 0

### 2. erp-hr-analytics-agent (460 lines) — SIMPLE

**Before**: Manual `getClaims` + manual `adminClient` for membership only. No data ops beyond membership.

**Change**:
- Replace lines 26-71 (manual auth + manual adminClient membership) with `validateTenantAccess(req, companyId)`
- Remove `createClient` for service_role
- No data ops to migrate (pure AI function)
- **adminClient after**: 0

### 3. erp-hr-analytics-intelligence (727 lines) — MODERATE + SECURITY FIX

**Before**: Manual `getClaims` only. **NO membership check** — any authenticated user can invoke for any company context passed in params. No data ops (pure AI).

**Change**:
- Replace lines 26-39 (manual auth) with `validateTenantAccess(req, companyId)` where `companyId` comes from `context.companyId` or `params.companyId`
- This ADDS tenant isolation that was completely missing
- Remove manual `createClient`
- **adminClient after**: 0
- **Security improvement**: Closes tenant isolation gap

### 4. erp-hr-autonomous-copilot (448 lines) — MODERATE

**Before**: Manual `getUser()` + `createClient(SERVICE_ROLE_KEY)` as `supabase`. Membership check uses service_role. No data ops beyond membership (pure AI).

**Change**:
- Replace lines 21-64 (manual auth + manual service_role membership) with `validateTenantAccess(req, company_id)`
- Remove manual `createClient` for service_role
- No data ops to migrate
- **adminClient after**: 0

### 5. erp-hr-people-analytics-ai (232 lines) — SIMPLE

**Before**: Manual `getClaims` + manual `adminClient` for membership only. No data ops beyond membership (pure AI).

**Change**:
- Replace lines 21-64 (manual auth + manual adminClient membership) with `validateTenantAccess(req, companyId)`
- Remove `createClient` for service_role
- No data ops to migrate
- **adminClient after**: 0

---

## Post-Batch State

```text
Function                        | adminClient remaining | Status
────────────────────────────────┼───────────────────────┼─────────────────
erp-hr-ai-agent                 | 0                     | Clean (S6.3C)
erp-hr-analytics-agent          | 0                     | Clean (S6.3C)
erp-hr-analytics-intelligence   | 0                     | Clean (S6.3C) + security fix
erp-hr-autonomous-copilot       | 0                     | Clean (S6.3C)
erp-hr-people-analytics-ai      | 0                     | Clean (S6.3C)
```

- **5/5 functions migrated** to `validateTenantAccess()`
- **~20+ service_role data ops eliminated** (all in erp-hr-ai-agent)
- **1 tenant isolation gap closed** (erp-hr-analytics-intelligence had no membership check)
- **0 exceptions** — no residual adminClient needed

## Deliverables

1. Code changes in all 5 edge functions
2. `/docs/S6_auth_batch2_report.md` with before/after validation

