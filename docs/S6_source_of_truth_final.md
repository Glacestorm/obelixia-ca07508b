# S6.4B — Source of Truth Final: Auth / Service_Role / Excepciones

**Date**: 2026-04-09  
**Phase**: S6.4B (Final Inventory)  
**Objective**: Single source of truth for the post-S6 security state of the HR/Payroll/Legal module

---

## Scope Definitions

Different sections of S6 documentation reference different scopes. This document normalizes them to avoid contradictions.

| Scope ID | Includes | Excludes | Total Functions | Total Tables |
|----------|----------|----------|-----------------|--------------|
| **A — HR/Payroll** | `erp-hr-*`, `hr-*`, `payroll-*`, `send-hr-*` | `legal-*`, `ai-legal-*`, all other modules | **58** | N/A |
| **B — HR/Payroll/Legal** | Scope A + `legal-*`, `ai-legal-*` | All other modules | **67** | N/A |
| **C — Tables erp_hr_*** | All tables matching `erp_hr_*` | `erp_audit_*`, `erp_user_companies`, etc. | N/A | **283** |
| **D — Tables erp_hr_* + erp_audit_*** | Scope C + `erp_audit_*` tables | Everything else | N/A | 283 + audit tables |

**Why counts differ from earlier reports**:
- The S6.3C plan referenced "72 total" — that included utility functions (mapbox-*, threat-detection) which are **not** HR/Payroll/Legal. The actual Scope B count is **67**.
- The "52 with validateTenantAccess" count is correct for **Scope A only** (52/58 HR/Payroll functions).
- Legal functions (9 total) have **0** using `validateTenantAccess` — they were out of S6 scope.
- RLS count of **283** applies to **Scope C** (`erp_hr_*` tables only).

---

## 1. Edge Functions — Final State

### Scope A: HR/Payroll (58 functions)

| Auth Pattern | Count | Functions |
|---|---|---|
| `validateTenantAccess()` | **52** | See full list below |
| `validateUserAccess()` (custom) | **2** | hr-labor-copilot, hr-workforce-simulation |
| Dual-path (JWT admin + x-cron-secret) | **1** | erp-hr-agreement-updater |
| Manual auth (getUser + membership) | **2** | erp-hr-contingent-workforce, erp-hr-premium-intelligence |
| Seed/demo (service_role, no user context) | **1** | erp-hr-regulatory-watch* |

*erp-hr-regulatory-watch uses SERVICE_ROLE with no validateTenantAccess — appears to be a scheduled/internal function pattern.

#### Full validateTenantAccess list (52 functions)

```
erp-hr-accounting-bridge       erp-hr-ai-agent                erp-hr-analytics-agent
erp-hr-analytics-intelligence  erp-hr-autonomous-copilot      erp-hr-clm-agent
erp-hr-compensation-suite      erp-hr-compliance-enterprise   erp-hr-compliance-monitor
erp-hr-copilot-twin            erp-hr-credentials-agent       erp-hr-enterprise-admin
erp-hr-esg-selfservice         erp-hr-executive-analytics     erp-hr-industry-templates
erp-hr-innovation-discovery    erp-hr-offboarding-agent       erp-hr-onboarding-agent
erp-hr-payroll-recalculation   erp-hr-people-analytics-ai     erp-hr-performance-agent
erp-hr-recruitment-agent       erp-hr-security-governance     erp-hr-seed-demo-data
erp-hr-seed-demo-master        erp-hr-smart-contracts         erp-hr-strategic-planning
erp-hr-talent-intelligence     erp-hr-talent-skills-agent     erp-hr-total-rewards
erp-hr-training-agent          erp-hr-wellbeing-agent         erp-hr-wellbeing-enterprise
erp-hr-whistleblower-agent     erp-hr-workflow-engine         hr-analytics-bi
hr-board-pack                  hr-compliance-automation       hr-country-registry
hr-enterprise-integrations     hr-multiagent-supervisor       hr-orchestration-engine
hr-premium-api                 hr-regulatory-reporting        hr-reporting-engine
payroll-calculation-engine     payroll-cross-module-bridge     payroll-file-generator
payroll-irpf-engine            payroll-it-engine              payroll-supervisor
send-hr-alert
```

**Note**: `erp-hr-seed-demo-data` and `erp-hr-seed-demo-master` import `validateTenantAccess` but are seed-only functions that primarily use SERVICE_ROLE_KEY. The import is for the shared module dependency, not for runtime user auth.

### Scope B additions: Legal (9 functions)

| Function | Auth Pattern | validateTenantAccess | SERVICE_ROLE |
|----------|-------------|---------------------|--------------|
| ai-legal-validator | None (manual) | ❌ | ✅ |
| legal-action-router | None (manual) | ❌ | ✅ |
| legal-ai-advisor | None (manual) | ❌ | ✅ |
| legal-autonomous-copilot | None | ❌ | ❌ |
| legal-entity-management | None | ❌ | ❌ |
| legal-knowledge-sync | Cron-based | ❌ | ✅ |
| legal-multiagent-supervisor | None (manual) | ❌ | ✅ |
| legal-predictive-analytics | None | ❌ | ❌ |
| legal-validation-gateway-enhanced | None | ❌ | ❌ |

**All 9 legal functions were out of S6 scope.** They retain pre-S6 auth patterns and are candidates for a future S7 Legal hardening campaign.

---

## 2. adminClient / service_role Residual — Final Ledger

### Legitimate Exceptions (runtime, justified)

| Function | adminClient ops | Purpose | Justification | Documented in |
|----------|----------------|---------|---------------|---------------|
| erp-hr-whistleblower-agent | 5 | Anonymous INSERT (submit_report) | EU Directive 2019/1937 — anonymous reporting legally required | S6.3E |
| send-hr-alert | 5 | Cross-user notification INSERT + service invocation | Must write to OTHER users' notification rows (RLS blocks cross-user writes) | S6.2A |
| erp-hr-innovation-discovery | 4 | Async setTimeout post-response ops | JWT may expire before deferred operations complete | S6.2A |
| erp-hr-compliance-enterprise | 16 | Seed_demo action DELETE + INSERT ops | Tables lack RLS DELETE policies; confined to seed_demo action only | S6.2B |
| erp-hr-enterprise-admin | 15 | Seed_enterprise_data action | Global catalog tables lack write RLS; confined to seed action only | S6.2B |

### Seed/Demo Functions (not runtime)

| Function | Classification | Justification |
|----------|---------------|---------------|
| erp-hr-seed-demo-data | Seed-only | Entire function uses SERVICE_ROLE for demo data population. No user context. |
| erp-hr-seed-demo-master | Seed-only | Entire function uses SERVICE_ROLE for master demo data. No user context. |

### Residual Debt (should be migrated)

| Function | adminClient ops | Issue | Proposed Fix | Priority |
|----------|----------------|-------|--------------|----------|
| payroll-irpf-engine | 1 | Uses adminClient for data ops despite having validateTenantAccess | Migrate to userClient | Medium |
| hr-workforce-simulation | 0 (uses SERVICE_ROLE directly) | Uses custom `validateUserAccess()` instead of standard `validateTenantAccess()` | Migrate to standard pattern | Low |
| erp-hr-premium-intelligence | 0 (uses SERVICE_ROLE directly) | Manual getUser auth, no tenant membership check | Add validateTenantAccess | Medium |
| erp-hr-contingent-workforce | 0 | No auth at all — no validateTenantAccess, no manual auth, no SERVICE_ROLE | Add validateTenantAccess | **High** |
| erp-hr-agreement-updater | 2 | Dual-path (JWT admin + cron) but uses adminClient for all data ops | Migrate runtime data ops to userClient | Medium |
| erp-hr-regulatory-watch | 2 | No validateTenantAccess, uses SERVICE_ROLE | Determine if scheduled-only or add auth | Medium |

### Functions with adminClient imported but minimal/controlled usage

These functions import adminClient via `validateTenantAccess` return value but use it only for membership checks or controlled operations — **not for general data ops**:

| Function | adminClient refs | Usage |
|----------|-----------------|-------|
| erp-hr-accounting-bridge | 1 | Controlled — from authResult only |
| erp-hr-industry-templates | 6 | Controlled — S6.2B migrated data ops to userClient |
| erp-hr-recruitment-agent | 3 | Controlled — S6.2B migrated data ops to userClient |
| erp-hr-payroll-recalculation | 1 | Controlled — from authResult only |
| hr-analytics-bi | 1 | Controlled — from authResult only |
| hr-compliance-automation | 1 | Controlled — from authResult only |
| hr-country-registry | 2 | Controlled — S6.2A migrated data ops |
| hr-enterprise-integrations | 1 | Controlled — from authResult only |
| hr-regulatory-reporting | 1 | Controlled — from authResult only |
| hr-reporting-engine | 1 | Controlled — from authResult only |
| payroll-calculation-engine | 1 | Controlled — from authResult only |
| payroll-cross-module-bridge | 2 | Controlled — from authResult only |
| payroll-supervisor | 1 | Controlled — from authResult only |

---

## 3. Exceptions Ledger — Definitive

| # | Exception | Type | Scope | Justification |
|---|-----------|------|-------|---------------|
| 1 | erp-hr-whistleblower-agent `submit_report` | Anonymous INSERT | Runtime | EU Directive 2019/1937 — legally required anonymous channel |
| 2 | send-hr-alert cross-user writes | adminClient for INSERT | Runtime | RLS correctly blocks cross-user writes; notifications must reach other users |
| 3 | erp-hr-innovation-discovery async ops | adminClient for setTimeout | Runtime | JWT expiry risk in deferred operations |
| 4 | erp-hr-compliance-enterprise seed_demo | adminClient for DELETE/INSERT | Seed action | No RLS DELETE policies on compliance tables |
| 5 | erp-hr-enterprise-admin seed_enterprise_data | adminClient for catalog writes | Seed action | Global catalog tables lack write RLS |
| 6 | erp-hr-seed-demo-data | Full SERVICE_ROLE | Seed function | Demo-only, no user context |
| 7 | erp-hr-seed-demo-master | Full SERVICE_ROLE | Seed function | Demo-only, no user context |

**Total: 3 runtime exceptions + 2 seed-action exceptions + 2 seed-only functions = 7 documented exceptions**

All exceptions are confined and do not expose cross-tenant data access in normal runtime operations.

---

## 4. RLS Status — Final

### Scope C: erp_hr_* tables

| Metric | Value |
|--------|-------|
| Total erp_hr_* tables | **283** |
| RLS enabled | **283** (100%) |
| erp_hr_doc_action_queue | **Closed** (S6.1A) |
| Open USING(true) policies remaining | **0** critical (all 16 high-risk policies remediated in S5.5) |

### Key RLS patterns in use

- **Direct tenant isolation**: `company_id = ANY(get_user_company_ids(auth.uid()))` — majority of tables
- **Indirect tenant lookup**: `get_company_for_employee(employee_id)` — for garnishments, calculations
- **Hybrid global+tenant**: `company_id IS NULL OR company_id = ANY(...)` — for catalogs, audit logs
- **EXISTS subquery**: For child tables inheriting parent's tenant scope (e.g., dry_run_evidence)

---

## 5. Security Findings Resolved — S6 Campaign Summary

### Batches Executed

| Batch | Scope | Actions | Functions Affected |
|-------|-------|---------|--------------------|
| S6.1A | RLS hotfix | Closed erp_hr_doc_action_queue open policy | 0 functions, 1 table |
| S6.2A | service_role phase 1 | Migrated adminClient data ops to userClient | 5 functions (payroll-calculation-engine, payroll-supervisor, hr-country-registry + exceptions documented) |
| S6.2B | service_role phase 2 | Migrated runtime adminClient, documented seed exceptions | 6 functions (erp-hr-industry-templates, erp-hr-recruitment-agent + 4 seed exceptions) |
| S6.3B | Auth hardening batch 1 | Added validateTenantAccess to workflow/orchestration | 5 functions |
| S6.3C | Auth hardening batch 2 | Added validateTenantAccess to AI/sensitive data | 5 functions |
| S6.3D | Auth hardening batch 3 | Added validateTenantAccess to talent/training | 5 functions |
| S6.3E | Auth hardening batch 4 | Added validateTenantAccess to wellbeing/governance/whistleblower | 5 functions |
| S6.3F | Auth hardening batch 5 | Added validateTenantAccess to enterprise/analytics/payroll | 8 functions |
| S6.4A | Offensive validation | 20/20 tests passed, 0 bypasses | 28 functions tested |

### Key Security Improvements

1. **Tenant isolation gap closed**: erp-hr-analytics-intelligence had NO membership check — any authenticated user could invoke it for any company. Fixed in S6.3C.
2. **~20+ service_role data ops eliminated**: erp-hr-ai-agent alone had ~20 data operations on service_role client, all migrated to userClient.
3. **Chaining secured**: hr-multiagent-supervisor now forwards user JWT (not SERVICE_ROLE_KEY) to all downstream agents.
4. **16 open RLS policies remediated**: All USING(true) policies on HR tables replaced with tenant-scoped policies (S5.5, pre-S6).
5. **28 functions hardened**: S6.3B-F brought 28 functions to standard `validateTenantAccess()` pattern.

---

## 6. Residual Non-Security Findings

These are **functional bugs**, not security vulnerabilities. Auth gates work correctly in both cases.

| ID | Function | Issue | Impact | Proposed Fix |
|----|----------|-------|--------|-------------|
| NS.1 | erp-hr-whistleblower-agent | `get_reports` SELECT references non-existent column `title` | Query fails at data layer (after auth succeeds) | Update SELECT to match actual table schema |
| NS.2 | erp-hr-whistleblower-agent | `submit_report` expects `body.category` but callers send `body.report.category` | Payload mismatch causes insert failure (after auth succeeds) | Align payload extraction with caller convention |

**These do not invalidate S6 security closure.** Auth gates reject unauthorized requests before these code paths execute.

---

## 7. Known Residual Debt After S6

### Functions requiring future hardening (Scope A — HR/Payroll)

| Function | Current Pattern | Risk | Recommended Action | Priority |
|----------|----------------|------|--------------------|----------|
| erp-hr-contingent-workforce | **No auth at all** | High — any request can invoke | Add validateTenantAccess | **High** |
| erp-hr-premium-intelligence | Manual getUser, no tenant check | Medium — authenticated but no tenant isolation | Add validateTenantAccess | Medium |
| erp-hr-agreement-updater | Dual-path (JWT+cron), adminClient for data | Medium — data ops bypass RLS | Migrate data ops to userClient | Medium |
| erp-hr-regulatory-watch | SERVICE_ROLE, no auth | Medium — depends on invocation pattern | Determine if internal-only; add auth if user-facing | Medium |
| payroll-irpf-engine | validateTenantAccess but adminClient for data | Low — auth gate exists, data ops bypass RLS | Migrate to userClient | Low |
| hr-workforce-simulation | Custom validateUserAccess | Low — has auth, non-standard pattern | Migrate to validateTenantAccess | Low |
| hr-labor-copilot | Custom validateUserAccess | Low — has auth, non-standard pattern | Migrate to validateTenantAccess | Low |

**Total residual debt: 7 functions** (1 high, 3 medium, 3 low priority)

---

## 8. Out of S6 Scope

### Legal Functions (9 functions — all out of scope)

S6 targeted HR/Payroll functions only. Legal functions retain pre-S6 auth patterns.

| Function | Has Auth | Has SERVICE_ROLE | Notes |
|----------|----------|-----------------|-------|
| ai-legal-validator | ❌ | ✅ | Candidate for S7 |
| legal-action-router | ❌ | ✅ | Candidate for S7 |
| legal-ai-advisor | ❌ | ✅ | Candidate for S7 |
| legal-autonomous-copilot | ❌ | ❌ | Candidate for S7 |
| legal-entity-management | ❌ | ❌ | Candidate for S7 |
| legal-knowledge-sync | Cron-based | ✅ | Scheduled function |
| legal-multiagent-supervisor | ❌ | ✅ | Candidate for S7 |
| legal-predictive-analytics | ❌ | ❌ | Candidate for S7 |
| legal-validation-gateway-enhanced | ❌ | ❌ | Candidate for S7 |

### Utility Functions (not HR/Payroll/Legal)

mapbox-directions, mapbox-elevation, mapbox-isochrone, mapbox-matrix, mapbox-static, threat-detection — all infrastructure utilities, not part of S6.

---

## 9. Final Metrics Summary

### By Scope

| Metric | Scope A (HR/Payroll) | Scope B (+Legal) |
|--------|---------------------|------------------|
| Total functions | 58 | 67 |
| validateTenantAccess | 52 (89.7%) | 52 (77.6%) |
| Custom auth (validateUserAccess) | 2 | 2 |
| No standard auth | 4 | 13 |
| Seed/demo functions | 2 | 2 |
| Documented exceptions | 7 | 7 |
| Residual debt functions | 7 | 16 (7 HR + 9 Legal) |

| Metric | Scope C (erp_hr_* tables) |
|--------|--------------------------|
| Total tables | 283 |
| RLS enabled | 283 (100%) |
| Open USING(true) critical | 0 |

### S6 Campaign Totals

| Metric | Value |
|--------|-------|
| Functions hardened (S6.3B-F) | 28 |
| Functions hardened (S6.2A/B) | ~11 |
| service_role data ops eliminated | ~30+ |
| Tenant isolation gaps closed | 1 (erp-hr-analytics-intelligence) |
| Offensive tests executed | 20 |
| Offensive tests passed | 20 |
| Critical bypasses found | **0** |
| Documented exceptions | 7 (3 runtime + 2 seed-action + 2 seed-only) |

---

## Verdict

S6 auth hardening campaign is **complete** for Scope A (HR/Payroll). The module has:

- ✅ **89.7%** standard auth coverage (52/58 functions)
- ✅ **100%** RLS coverage (283/283 tables)
- ✅ **0** critical bypasses (validated offensively)
- ✅ **7** documented and justified exceptions
- ⚠️ **7** residual debt items for future hardening (1 high priority: erp-hr-contingent-workforce)
- ⚠️ **9** legal functions out of scope (candidate for S7)
