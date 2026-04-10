# S7 — Source of Truth Final: Legal Domain

**Date**: 2026-04-10  
**Status**: CLOSED  
**Campaign**: S7 — Legal Security Hardening  
**Result**: 12/12 functions hardened · 0 security debt · 3 legitimate exceptions

---

## 1. Scope

### Legal Domain Inventory: 12 Edge Functions

All 12 functions listed below were in scope for S7 and have been hardened.

| # | Function | Batch | Category |
|---|----------|-------|----------|
| 1 | erp-legal-spend | S7.1 | AI-only, tenant-scoped |
| 2 | legal-autonomous-copilot | S7.1 | AI-only |
| 3 | legal-entity-management | S7.1 | AI-only |
| 4 | legal-predictive-analytics | S7.1 | AI-only |
| 5 | legal-validation-gateway-enhanced | S7.1 | AI-only |
| 6 | smart-legal-contracts | S7.1 | AI-only |
| 7 | ai-legal-validator | S7.2 | DB-touching |
| 8 | legal-action-router | S7.2 | DB-touching, tenant-scoped |
| 9 | legal-multiagent-supervisor | S7.3 | Orchestrator, chaining |
| 10 | legal-ai-advisor | S7.3 | Dual-path (user + internal) |
| 11 | erp-legal-knowledge-loader | S7.4 | Global catalog |
| 12 | legal-knowledge-sync | S7.4 | Global catalog, cron |

### Out of Scope

No legal-domain edge functions were excluded. Shared utilities (`_shared/tenant-auth.ts`, `_shared/cron-auth.ts`) were consumed but not modified in S7.

---

## 2. Final Auth State

| Function | Auth Pattern | service_role | Justification |
|----------|-------------|:---:|---|
| erp-legal-spend | `validateTenantAccess(req, companyId)` | No | — |
| legal-autonomous-copilot | `validateAuth(req)` | No | — |
| legal-entity-management | `validateAuth(req)` | No | — |
| legal-predictive-analytics | `validateAuth(req)` | No | — |
| legal-validation-gateway-enhanced | `validateAuth(req)` | No | — |
| smart-legal-contracts | `validateAuth(req)` | No | — |
| ai-legal-validator | `validateAuth(req)` | No | — |
| legal-action-router | `validateTenantAccess(req, company_id)` | No | — |
| legal-multiagent-supervisor | `validateTenantAccess(req, company_id)` | No | — |
| legal-ai-advisor | `validateAuth(req)` + `x-internal-secret` dual-path | **Yes** (internal path only) | Inter-agent calls lack user JWT |
| erp-legal-knowledge-loader | `validateAuth(req)` + admin role check | **Yes** (all ops) | Global catalog tables without tenant RLS |
| legal-knowledge-sync | `validateCronOrServiceAuth()` / `validateAuth(req)` + admin role check | **Yes** (all ops) | Global catalog upserts; cron path has no JWT |

### Auth Pattern Distribution

- `validateTenantAccess()`: 3 functions (tenant-scoped data)
- `validateAuth()`: 7 functions (authenticated, no tenant scope)
- `validateCronOrServiceAuth()`: 1 function (cron + user dual-path)
- Dual-path (user + internal): 1 function

---

## 3. Legitimate Exceptions Ledger

### Exception 1 — legal-ai-advisor (internal path)

| Attribute | Value |
|-----------|-------|
| **Tables** | `legal_agent_queries`, `legal_validation_logs` |
| **Operations** | INSERT (audit logging) |
| **Why it exists** | When called by other agents via `x-internal-secret`, no user JWT is available. The service_role client is needed to write audit records. |
| **Why it is not debt** | The internal path is gated behind a shared secret (`LEGAL_INTERNAL_SECRET`). The user path uses `validateAuth(req)` + `userClient` for all DB ops. The exception is bounded to two audit tables and only on the internal code path. |
| **Limits** | service_role is used exclusively for INSERT on audit tables when `x-internal-secret` is present. No reads, no updates, no user-data tables. |

### Exception 2 — erp-legal-knowledge-loader

| Attribute | Value |
|-----------|-------|
| **Tables** | `erp_entity_type_rules` (SELECT), `erp_legal_knowledge_base` (SELECT, INSERT), `user_roles` (SELECT) |
| **Operations** | Read global catalogs + write via `expand_knowledge` |
| **Why it exists** | These are system-level global catalog tables without tenant-scoped RLS. No user owns this data. |
| **Why it is not debt** | All actions require `validateAuth(req)`. Write actions (`expand_knowledge`) additionally require admin/superadmin role verified via `user_roles` query. Same pattern as `erp-hr-agreement-updater` in the HR domain. |
| **Limits** | service_role is used for 3 tables only. Writes are admin-gated. Reads require authentication. No anonymous access. |

### Exception 3 — legal-knowledge-sync

| Attribute | Value |
|-----------|-------|
| **Tables** | `legal_knowledge_base` (SELECT, UPDATE, INSERT), `user_roles` (SELECT) |
| **Operations** | Global catalog upserts (sync) |
| **Why it exists** | Cron path has no user JWT. User path writes system-level catalog data, not tenant-scoped content. The `legal_knowledge_base` table lacks tenant-scoped RLS by design. |
| **Why it is not debt** | Cron path is gated by `validateCronOrServiceAuth()` (cron secret or service_role). User path requires `validateAuth(req)` + admin role check. Both paths require authorization. Same pattern as `erp-hr-enterprise-admin` in the HR domain. |
| **Limits** | service_role is used for 1 catalog table + role lookup. User path is admin-only. Cron path is secret-gated. |

---

## 4. Security Debt

**Residual security debt in the Legal domain: 0**

- 0 functions with zero auth
- 0 functions with fake auth (header-only checks without JWT validation)
- 0 functions with manual auth boilerplate (all use shared utilities)
- 0 functions with insecure chaining (SERVICE_ROLE_KEY forwarded as Bearer)
- 0 functions with unjustified service_role usage
- All 3 exceptions are documented, bounded, and justified

---

## 5. Campaign Results

| Metric | Value |
|--------|-------|
| Total functions hardened | 12 |
| Zero-auth functions closed | 7 (6 in S7.1 + 1 in S7.4) |
| Manual auth replaced with shared utilities | 3 (legal-knowledge-sync, legal-ai-advisor user path, legal-multiagent-supervisor) |
| Insecure chaining fixes | 3 calls in legal-multiagent-supervisor (SERVICE_ROLE_KEY → user JWT) |
| Tenant isolation added | 3 functions (erp-legal-spend, legal-action-router, legal-multiagent-supervisor) |
| service_role ops eliminated (approx.) | ~18 (across ai-legal-validator, legal-action-router, legal-multiagent-supervisor, legal-ai-advisor user path) |
| service_role ops remaining (justified) | ~8 (across 3 exception functions) |
| Legitimate exceptions | 3 |
| Batches executed | 4 (S7.1–S7.4) |

### Batch Summary

| Batch | Functions | Focus |
|-------|-----------|-------|
| S7.1 | 6 | Zero-auth AI-only → `validateAuth` / `validateTenantAccess` |
| S7.2 | 2 | DB-touching → userClient migration, tenant isolation |
| S7.3 | 2 | Chaining fix (JWT forwarding), dual-path standardization |
| S7.4 | 2 | Global catalog auth gates, legitimate exception documentation |

---

## 6. Residual Non-Security Findings

These are maintenance observations, not security issues:

1. **legal-knowledge-sync static data size**: The `ESSENTIAL_KNOWLEDGE` array (~600 lines of hardcoded legal content) is embedded directly in the function. This works but could be externalized to a config or DB table for easier updates. No security impact.

2. **AI prompt consistency**: The 6 AI-only functions (S7.1) use slightly different prompt structures and temperature settings. Standardizing prompt templates would improve maintainability. No security impact.

3. **Error response format**: Minor inconsistencies in error response shapes across functions (some return `{ error: string }`, others `{ success: false, error: string }`). Cosmetic only.

---

## 7. Cross-Reference

| Document | Path |
|----------|------|
| Batch 1 report | `docs/S7_legal_batch1_report.md` |
| Batch 2 report | `docs/S7_legal_batch2_report.md` |
| Batch 3 report | `docs/S7_legal_batch3_report.md` |
| Batch 4 report | `docs/S7_legal_batch4_report.md` |
| Source of truth | `docs/S7_source_of_truth_final.md` (this file) |

---

**The Legal domain is closed. No further S7 batches are required.**
