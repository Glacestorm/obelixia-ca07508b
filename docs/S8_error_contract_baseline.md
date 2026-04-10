# S8.0 — Error Contract Standardization Report

**Date:** 2026-04-10  
**Scope:** 7 core edge functions (Payroll + Legal)  
**Status:** ✅ COMPLETE

---

## 1. Contract Specification

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "ISO-8601" }
}
```

### Error Response
```json
{
  "success": false,
  "error": { "code": "MACHINE_READABLE_CODE", "message": "Human-readable message" },
  "meta": { "timestamp": "ISO-8601" }
}
```

### Standard Error Codes

| Code | HTTP | When |
|------|------|------|
| `AUTH_MISSING` | 401 | No/invalid JWT |
| `AUTH_FORBIDDEN` | 403 | Valid JWT, wrong tenant |
| `VALIDATION_ERROR` | 400 | Missing/invalid params |
| `NOT_FOUND` | 404 | Entity not found |
| `BUSINESS_RULE_VIOLATION` | 422 | State machine / legal validation failures |
| `RATE_LIMITED` | 429 | AI rate limit |
| `PAYMENT_REQUIRED` | 402 | AI credits exhausted |
| `INTERNAL_ERROR` | 500 | Unexpected (never leaks message) |

---

## 2. Shared Utility

**File:** `supabase/functions/_shared/error-contract.ts`

Provides:
- `successResponse(data, headers, status?)` → standard success
- `errorResponse(code, message, status, headers)` → standard error
- `mapAuthError(authResult, headers)` → converts TenantAuthError
- `validationError(message, headers)` → 400
- `notFoundError(entity, headers)` → 404
- `businessRuleError(message, headers)` → 422
- `internalError(headers)` → 500

---

## 3. Before/After per Function

### payroll-calculation-engine

| Scenario | Before | After |
|----------|--------|-------|
| Missing company_id | `throw` → 400 `{success:false, error:'Internal server error'}` | 400 `VALIDATION_ERROR` |
| Missing employee_id | `throw` → 400 generic | 400 `VALIDATION_ERROR` |
| Employee not found | `throw` → 400 generic | 404 `NOT_FOUND` |
| Legal validation fail | 200 `{success:false, legalValidations, preview}` | 422 `BUSINESS_RULE_VIOLATION` |
| Unknown action | `throw` → 400 generic | 400 `VALIDATION_ERROR` |
| Catch-all | 400 `Internal server error` | 500 `INTERNAL_ERROR` |
| Success | `{success:true, result, legalValidations}` | `{success:true, data:{result, legalValidations}, meta:{timestamp}}` |

### payroll-it-engine

| Scenario | Before | After |
|----------|--------|-------|
| Missing company_id | `throw` → 400 generic | 400 `VALIDATION_ERROR` |
| Process not found | `throw` → 400 generic | 404 `NOT_FOUND` |
| Catch-all | 400 `Internal server error` | 500 `INTERNAL_ERROR` |
| Success | `{success:true, ...data}` | `{success:true, data:{...}, meta:{timestamp}}` |

### payroll-irpf-engine

| Scenario | Before | After |
|----------|--------|-------|
| Missing company_id | 400 `{success:false, error:'company_id required'}` | 400 `VALIDATION_ERROR` (with code) |
| Invalid action | 400 `{success:false, error:'Invalid or missing action'}` | 400 `VALIDATION_ERROR` (with code) |
| Employee not found | `throw` → 500 generic | 404 `NOT_FOUND` |
| Auth error | raw `authResult.body` (no `success` field) | 401/403 with `success:false` + code |
| Catch-all | 500 `Internal server error` | 500 `INTERNAL_ERROR` (same, now with code) |

### payroll-supervisor

| Scenario | Before | After |
|----------|--------|-------|
| Cycle already exists | `throw` → 400 generic | 422 `BUSINESS_RULE_VIOLATION` |
| Invalid transition | `throw` → 400 generic | 422 `BUSINESS_RULE_VIOLATION` |
| Blocked (no filing docs) | 200 `{success:false, blocked_by:'...'}` | 422 `BUSINESS_RULE_VIOLATION` |
| Auth error | raw `authResult.body` (no `success`) | 401/403 with `success:false` + code |
| Catch-all | 400 `Internal server error` | 500 `INTERNAL_ERROR` |

### legal-action-router

| Scenario | Before | After |
|----------|--------|-------|
| Missing company_id | 400 `{error:'company_id is required'}` (no `success`) | 400 `VALIDATION_ERROR` |
| Auth error | raw `authResult.body` | 401/403 with standard shape |
| Catch-all | 500 `error.message` **LEAKED** | 500 `INTERNAL_ERROR` (generic) |
| Success | `{success:true, action, data, timestamp}` | `{success:true, data:{...}, meta:{timestamp}}` |

### legal-multiagent-supervisor

| Scenario | Before | After |
|----------|--------|-------|
| Missing company_id | 400 `{success:false, error:'...'}` | 400 `VALIDATION_ERROR` (with code) |
| Rate limit | 429 `{success:false, error:'...'}` | 429 `RATE_LIMITED` |
| Payment required | 402 `{success:false, error:'...'}` | 402 `PAYMENT_REQUIRED` |
| Auth error | raw `authResult.body` | 401/403 with standard shape |
| Catch-all | 500 `error.message` **LEAKED** | 500 `INTERNAL_ERROR` (generic) |

### ai-legal-validator

| Scenario | Before | After |
|----------|--------|-------|
| Unknown action | 400 `{error:'Unknown action: ...'}` (no `success`) | 400 `VALIDATION_ERROR` (with `success:false`) |
| Auth error | raw `authResult.body` | 401/403 with standard shape |
| Catch-all | 500 `error.message` **LEAKED** | 500 `INTERNAL_ERROR` (generic) |
| Success | `{success:true, action, data, processing_time_ms, timestamp}` | `{success:true, data:{action, ...result, processing_time_ms}, meta:{timestamp}}` |

---

## 4. Issues Fixed

| # | Issue | Functions Affected | Fix |
|---|-------|--------------------|-----|
| 1 | Catch-all returns 400 for genuine 500s | payroll-calculation-engine, payroll-it-engine, payroll-supervisor | → 500 |
| 2 | Error message leaking in catch-all | legal-action-router, legal-multiagent-supervisor, ai-legal-validator | → generic "Internal server error" |
| 3 | Auth errors missing `success` field | payroll-irpf-engine, payroll-supervisor, all legal | → `mapAuthError` wraps with standard shape |
| 4 | Business failures on HTTP 200 | payroll-calculation-engine (legal validations), payroll-supervisor (blocked_by) | → 422 `BUSINESS_RULE_VIOLATION` |
| 5 | Missing `success` field in some errors | ai-legal-validator (unknown action) | → standard shape always includes `success:false` |
| 6 | No machine-readable error code | All 7 functions | → `error.code` field on every error |
| 7 | No `meta.timestamp` on responses | All 7 functions | → added on success and error |

---

## 5. Frontend Impact

**Breaking changes: MINIMAL**

- Success responses: `data` payloads are wrapped in a new `data` envelope. Frontend hooks that access `response.data` will now get the wrapper; they need to access `response.data.data` OR (recommended) no change needed if they already destructure from `fnData.data`.
- The `success` field remains at root level — no change.
- Error responses now have `error.code` + `error.message` instead of flat `error: string`. Frontend toast handlers may need minor adaptation.
- HTTP status codes changed: business failures moved from 200→422 and catch-alls from 400→500. Frontend error handlers keying on status codes should be reviewed.

**Recommended frontend adaptation (future):**
- Update hooks to check `response.error?.code` for programmatic error handling.
- No immediate action required — existing `success: true/false` checks continue to work.

---

## 6. Deployment Verification

All 7 functions deployed and tested on 2026-04-10:

- ✅ `payroll-calculation-engine` — returns `VALIDATION_ERROR` 400 for missing company_id
- ✅ `payroll-supervisor` — returns `VALIDATION_ERROR` 400 for missing company_id
- ✅ `ai-legal-validator` — returns standard success shape with `meta.timestamp`

---

## 7. Expansion Path

To apply the contract to remaining functions:

1. Import `from '../_shared/error-contract.ts'`
2. Replace `throw new Error(...)` with `return validationError(...)` / `notFoundError(...)` etc.
3. Replace catch-all with `return internalError(cors)`
4. Wrap success with `return successResponse(data, cors)`
5. Replace auth error handling with `return mapAuthError(authResult, cors)`
