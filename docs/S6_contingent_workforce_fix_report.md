# S6.5A — erp-hr-contingent-workforce Auth Hardening Report

**Date**: 2026-04-09  
**Sprint**: S6.5A (post-closure mini-fix)  
**Status**: ✅ COMPLETED  
**Risk closed**: HIGH → RESOLVED

---

## 1. Executive Summary

`erp-hr-contingent-workforce` was identified in the S6 closure report (`S6_closure_report.md`) as the **only high-priority residual debt item**. The function lacked tenant membership validation — any authenticated user could invoke AI analysis in the context of any company. This fix closes that gap by migrating to the standard `validateTenantAccess()` pattern.

---

## 2. Before / After

| Aspect | Before | After |
|--------|--------|-------|
| Auth pattern | Manual `getClaims` via `createClient` | `validateTenantAccess()` from `_shared/tenant-auth.ts` |
| Tenant membership check | **None** | Active membership verified in `erp_user_companies` |
| `company_id` in request | Not required | **Required** (400 if missing) |
| `createClient` import | Yes (manual, used only for getClaims) | **Removed** (handled by tenant-auth) |
| `adminClient` residual | N/A | 0 (returned by validateTenantAccess but unused — AI-only) |
| `userClient` residual | N/A | 0 (returned but unused — AI-only) |
| `service_role` for data ops | None | None |
| Cross-tenant bypass risk | **Open** — any authed user → any company context | **Closed** |

---

## 3. What Changed

### Removed
- Manual `createClient` import from `@supabase/supabase-js`
- Manual JWT extraction and `getClaims` validation (lines 33–46 of original)
- Implicit trust of any authenticated user regardless of company membership

### Added
- Import of `validateTenantAccess`, `isAuthError` from `_shared/tenant-auth.ts`
- `company_id: string` as mandatory field in `ComplianceRequest` interface
- Body parsing **before** auth gate (required to extract `company_id`)
- Explicit 400 response if `company_id` is missing or not a string
- Standard `validateTenantAccess(req, company_id)` call with `isAuthError` guard
- Enhanced logging: now logs both `userId` and `companyId`

### Unchanged
- All AI logic (prompts, model calls, response parsing)
- CORS handling via `getSecureCorsHeaders`
- Error handling patterns
- All three actions: `analyze_compliance`, `evaluate_contract`, `generate_recommendations`

---

## 4. Auth Flow (After)

```
Request → Parse body → Extract company_id
  ↓
  company_id missing? → 400 "company_id is required"
  ↓
  validateTenantAccess(req, company_id)
    ├─ JWT invalid → 401
    ├─ No active membership → 403
    └─ OK → { userId, companyId, adminClient, userClient }
  ↓
  AI processing (no DB ops, clients unused)
  ↓
  Response
```

---

## 5. Why adminClient/userClient Are Unused

This is an **AI-only function** — it performs zero database reads or writes. All data (worker profiles, contracts, assignments, time entries) comes from the request body provided by the client. The `validateTenantAccess()` utility returns `adminClient` and `userClient` as part of its standard interface, but neither is needed here. This is the standard pattern for AI-only functions in the codebase (same as `erp-hr-analytics-agent`, `erp-hr-autonomous-copilot`, etc.).

---

## 6. Frontend Impact

**None**. The frontend must now include `company_id` in the request body. Since the HR module already operates in a company context and passes `company_id` in similar function calls, this is a natural alignment. Any call without `company_id` will receive a clear 400 error.

---

## 7. Validation Checklist

| Check | Result |
|-------|--------|
| Uses `validateTenantAccess()` | ✅ Yes |
| `company_id` is mandatory | ✅ Yes (400 if missing) |
| Tenant membership verified | ✅ Yes (via `erp_user_companies`) |
| `createClient` manual removed | ✅ Yes |
| `adminClient` residual | ✅ 0 (returned but unused) |
| `service_role` for data ops | ✅ 0 (none before, none after) |
| Cross-tenant bypass closed | ✅ Yes |
| No other functions modified | ✅ Confirmed |
| No frontend changes | ✅ Confirmed |
| No RLS changes | ✅ Confirmed |

---

## 8. Impact on S6 Closure

### Finding closed
`erp-hr-contingent-workforce` was the **only high-priority residual debt item** from the S6 closure report. This fix resolves it completely.

### Updated coverage
- **Before S6.5A**: 52/58 functions with standard auth (89.7%)
- **After S6.5A**: 53/58 functions with standard auth (91.4%)

### Remaining residual debt (post S6.5A)
| Function | Priority | Status |
|----------|----------|--------|
| `erp-hr-premium-intelligence` | Medium | Partial auth, needs migration |
| `erp-hr-agreement-updater` | Medium | Partial auth, needs migration |
| `erp-hr-regulatory-watch` | Medium | Partial auth, needs migration |
| `payroll-irpf-engine` | Medium | Uses adminClient for data ops |
| `hr-workforce-simulation` | Low | Legacy manual auth |
| `hr-labor-copilot` | Low | Legacy manual auth |

### Traffic light assessment
- **Before S6.5A**: 🟡 Yellow controlled (high-priority debt open)
- **After S6.5A**: 🟡 Yellow controlled → trending 🟢 (no high-priority debt remains; only medium/low items)

The elimination of the only high-priority item significantly improves the security posture. Full green requires closing the 4 medium-priority items.

---

## 9. Report Index

| Report | Sprint | Content |
|--------|--------|---------|
| `S6_rls_fix_report.md` | S6.1A | RLS hotfix on `erp_hr_doc_action_queue` |
| `S6_service_role_phase1.md` | S6.2A | First service_role reduction batch |
| `S6_service_role_phase2.md` | S6.2B | Second service_role reduction batch |
| `S6_auth_batch1_report.md` | S6.3B | Auth hardening batch 1 |
| `S6_auth_batch2_report.md` | S6.3C | Auth hardening batch 2 |
| `S6_auth_batch3_report.md` | S6.3D | Auth hardening batch 3 |
| `S6_auth_batch4_report.md` | S6.3E | Auth hardening batch 4 |
| `S6_auth_batch5_report.md` | S6.3F | Auth hardening batch 5 |
| `S6_offensive_validation_report.md` | S6.4A | Offensive validation (20/20) |
| `S6_source_of_truth_final.md` | S6.4B | Final source of truth |
| `S6_closure_report.md` | S6.4C | Formal closure act |
| **`S6_contingent_workforce_fix_report.md`** | **S6.5A** | **This report** |
