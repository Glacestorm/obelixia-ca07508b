# S8 — Source of Truth Final: Error Contract Standardization

**Date**: 2026-04-10  
**Status**: CLOSED  
**Campaign**: S8 — Global Error Contract Standardization  
**Result**: 65/65 functions standardized · 0 residual debt · 0 outliers in scope

---

## 1. Scope Final

### Domains

HR, Payroll, and Legal — all edge functions hardened in S6/S7 campaigns.

### Functions in Scope: 65

| Phase | Count | Functions |
|-------|-------|-----------|
| S8.0 — Pilot Core | 7 | payroll-calculation-engine, payroll-it-engine, payroll-irpf-engine, payroll-supervisor, legal-action-router, legal-multiagent-supervisor, ai-legal-validator |
| S8.1 — Batch 1 (Legal) | 7 | legal-autonomous-copilot, legal-entity-management, legal-predictive-analytics, legal-validation-gateway-enhanced, smart-legal-contracts, legal-ai-advisor, legal-knowledge-sync |
| S8.1 — Batch 2 (Payroll/Bridge) | 5 | payroll-cross-module-bridge, erp-hr-accounting-bridge, erp-hr-agreement-updater, erp-hr-payroll-recalculation, erp-legal-spend |
| S8.1 — Batch 3 (erp-hr-a* to erp-hr-e*) | 14 | erp-hr-ai-agent, erp-hr-analytics-agent, erp-hr-analytics-intelligence, erp-hr-autonomous-copilot, erp-hr-clm-agent, erp-hr-compensation-suite, erp-hr-compliance-enterprise, erp-hr-compliance-monitor, erp-hr-contingent-workforce, erp-hr-copilot-twin, erp-hr-credentials-agent, erp-hr-enterprise-admin, erp-hr-esg-selfservice, erp-hr-executive-analytics |
| S8.1 — Batch 4 (erp-hr-i* to erp-hr-w*) | 20 | erp-hr-industry-templates, erp-hr-innovation-discovery, erp-hr-offboarding-agent, erp-hr-onboarding-agent, erp-hr-people-analytics-ai, erp-hr-performance-agent, erp-hr-premium-intelligence, erp-hr-recruitment-agent, erp-hr-regulatory-watch, erp-hr-security-governance, erp-hr-smart-contracts, erp-hr-strategic-planning, erp-hr-talent-intelligence, erp-hr-talent-skills-agent, erp-hr-total-rewards, erp-hr-training-agent, erp-hr-wellbeing-agent, erp-hr-wellbeing-enterprise, erp-hr-whistleblower-agent, erp-hr-workflow-engine |
| S8.1 — Batch 5 (hr-* standalone) | 12 | hr-analytics-bi, hr-board-pack, hr-compliance-automation, hr-country-registry, hr-enterprise-integrations, hr-labor-copilot, hr-multiagent-supervisor, hr-orchestration-engine, hr-premium-api, hr-regulatory-reporting, hr-reporting-engine, hr-workforce-simulation |

### Excluded from Scope

| Function | Reason |
|----------|--------|
| erp-hr-seed-demo-data | Seed/demo utility — not user-facing |
| erp-hr-seed-demo-master | Seed/demo utility — not user-facing |
| erp-legal-knowledge-loader | Global catalog utility — error paths already minimal |

---

## 2. Final Contract State

### Shared Utility

**File:** `supabase/functions/_shared/error-contract.ts`

**Helpers provided:**

| Helper | Purpose |
|--------|---------|
| `successResponse(data, headers, status?)` | Standard success envelope |
| `errorResponse(code, message, status, headers)` | Standard error envelope |
| `mapAuthError(authResult, headers)` | Converts TenantAuthError to 401/403 |
| `validationError(message, headers)` | 400 VALIDATION_ERROR |
| `notFoundError(entity, headers)` | 404 NOT_FOUND |
| `businessRuleError(message, headers)` | 422 BUSINESS_RULE_VIOLATION |
| `internalError(headers)` | 500 INTERNAL_ERROR (generic, no leak) |

### Error Response Shape

```json
{
  "success": false,
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable message"
  },
  "meta": {
    "timestamp": "ISO-8601"
  }
}
```

### HTTP Status Map

| Code | HTTP | When |
|------|------|------|
| `AUTH_MISSING` | 401 | No/invalid JWT |
| `AUTH_FORBIDDEN` | 403 | Valid JWT, wrong tenant or role |
| `VALIDATION_ERROR` | 400 | Missing/invalid params |
| `NOT_FOUND` | 404 | Entity not found |
| `BUSINESS_RULE_VIOLATION` | 422 | State machine / semantic validation failures |
| `RATE_LIMITED` | 429 | AI rate limit exceeded |
| `PAYMENT_REQUIRED` | 402 | AI credits exhausted |
| `INTERNAL_ERROR` | 500 | Unexpected error (never leaks message) |

### Confirmations

- ✅ `error.code` present on every error response
- ✅ `meta.timestamp` present on every error response
- ✅ No raw `{ error: "..." }` without wrapper in scope
- ✅ No `error.message` leaks in catch-all blocks
- ✅ No status 200 for semantic failures (moved to 422)

---

## 3. Functions Coverage

| Metric | Value |
|--------|-------|
| Total functions in S8 scope | 65 |
| Functions with standard error contract | 65 |
| Error contract coverage | **100%** |

All 65 functions import and use `_shared/error-contract.ts` for auth errors, validation errors, and catch-all/internal errors.

---

## 4. Success Shape Compatibility

Two groups exist **by design**:

### Group 1 — S8.0 Pilot (7 functions): Full `successResponse()` wrapper

These functions return:

```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "ISO-8601" }
}
```

Functions: payroll-calculation-engine, payroll-it-engine, payroll-irpf-engine, payroll-supervisor, legal-action-router, legal-multiagent-supervisor, ai-legal-validator

### Group 2 — S8.1 Expansion (58 functions): Legacy success shape preserved

These functions return their original success shape:

```json
{
  "success": true,
  "action": "...",
  "data": { ... },
  "timestamp": "ISO-8601"
}
```

**This is intentional.** Success shapes were preserved to avoid breaking frontend consumers. The error contract was the priority for S8. A future "S8.x — Success Contract Migration" phase can unify success shapes after frontend compatibility is verified.

---

## 5. Out-of-Scope Inventory

Functions detected during S8.2 validation that are **outside S8 scope**:

| Function | Domain | Reason |
|----------|--------|--------|
| self-healing-monitor | Infrastructure | Not HR/Payroll/Legal |
| galia-chat | Galia | Not HR/Payroll/Legal |
| galia-document-processor | Galia | Not HR/Payroll/Legal |
| galia-knowledge-manager | Galia | Not HR/Payroll/Legal |
| galia-search | Galia | Not HR/Payroll/Legal |

These functions remain on their original error patterns. **They do not invalidate S8 closure.** They can be addressed in a future S8.3 expansion if needed.

---

## 6. Residual Debt

**Residual error contract debt in S8 scope: 0**

- 0 functions with raw error shapes
- 0 functions leaking `error.message` in catch blocks
- 0 functions with auth errors missing standard wrapper
- 0 functions returning 200 for semantic failures
- 0 functions missing `error.code`
- 0 functions missing `meta.timestamp` on errors

---

## 7. Residual Non-Security / Non-Contract Notes

These are improvement opportunities, not debt:

1. **Success shape unification**: 58 functions retain legacy `{ success, action, data, timestamp }`. A future phase can migrate these to `{ success, data, meta }` after frontend audit. No urgency — the current shapes work correctly.

2. **Out-of-scope functions**: 5 non-HR/Payroll/Legal functions (self-healing-monitor, galia-*) still use ad-hoc error shapes. These can be standardized in a future expansion phase.

3. **Frontend error handler**: A unified `handleEdgeError(response)` utility could be created to parse the standard contract on the client side. This would complete the contract loop end-to-end.

---

## 8. Cross-Reference

| Document | Path |
|----------|------|
| S8.0 — Baseline report | `docs/S8_error_contract_baseline.md` |
| S8.1 — Expansion report | `docs/S8_error_contract_expansion.md` |
| S8.2 — Validation report | `docs/S8_error_contract_validation_report.md` |
| S8.3A — Source of truth | `docs/S8_source_of_truth_final.md` (this file) |

---

## 9. Campaign Summary

| Phase | Functions | Focus | Status |
|-------|-----------|-------|--------|
| S8.0 | 7 | Pilot: contract definition + core functions | ✅ Complete |
| S8.1 | 58 | Expansion: all HR/Payroll/Legal functions | ✅ Complete |
| S8.2 | 65 (validation) | Global QA: live testing + outlier detection | ✅ Complete |
| S8.3A | — | Source of truth documentation | ✅ Complete |

---

**S8 is closed. The error contract is standardized across all 65 HR/Payroll/Legal edge functions. No further S8 batches are required.**
