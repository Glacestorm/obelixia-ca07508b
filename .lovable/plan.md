

# S8.0 — Error Contract Standardization (Baseline + Pilot Core)

## Step 0 — Baseline: Current Error Contracts

### Inconsistencies Inventory

| Function | Auth error shape | Missing param shape | Business error shape | Catch-all status | Catch-all shape |
|----------|-----------------|---------------------|---------------------|------------------|-----------------|
| payroll-calculation-engine | `{success:false, error/body}` via authResult | `throw new Error` → caught as 400 | `{success:false, legalValidations, preview}` (200!) | **400** | `{success:false, error:'Internal server error'}` |
| payroll-it-engine | `{success:false, error}` via authResult | `throw new Error` → caught as 400 | N/A | **400** | `{success:false, error:'Internal server error'}` |
| payroll-irpf-engine | `authResult.body` (no `success` wrapper) | proper 400 for company_id/action | `throw new Error` → caught as 500 | **500** | `{success:false, error:'Internal server error'}` |
| payroll-supervisor | `authResult.body` (no `success` wrapper) | `throw new Error` → caught as 400 | `{success:false, blocked_by:...}` (200!) | **400** | `{success:false, error:'Internal server error'}` |
| legal-action-router | `authResult.body` (no `success` wrapper) | proper 400 for company_id | `throw` → caught as 500 | **500** | `{success:false, error: error.message}` (leaks!) |
| legal-multiagent-supervisor | `authResult.body` (no `success` wrapper) | proper 400 | N/A | **500** | `{success:false, error: error.message}` (leaks!) |
| ai-legal-validator | `authResult.body` (no `success` wrapper) | `{error:'Unknown action'}` 400 (no `success` field) | N/A | **500** | `{success:false, error: error.message}` (leaks!) |

### Critical Issues Found

1. **Inconsistent catch-all status**: payroll-calculation-engine, payroll-it-engine, payroll-supervisor return **400** for ALL caught errors (including genuine 500s). payroll-irpf-engine and legal functions return **500**.
2. **Error message leaking**: Legal functions expose `error.message` in catch-all — can leak internal details. Payroll functions hide it behind "Internal server error".
3. **Auth error shape inconsistency**: Some wrap in `{success:false, ...authResult.body}`, others return raw `authResult.body` (just `{error:'...'}`), missing the `success` field.
4. **Business validation errors on 200**: payroll-calculation-engine returns legal validation failures as 200 with `success:false`. payroll-supervisor returns blocked transitions as 200 with `success:false`.
5. **Missing `success` field in some errors**: ai-legal-validator unknown action returns `{error:...}` without `success:false`.
6. **No error `code` field**: None of the functions return a machine-readable error code.
7. **No `meta.timestamp`** on any error response.

---

## Step 1 — Error Contract Definition

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
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable message"
  },
  "meta": { "timestamp": "ISO-8601" }
}
```

### Standard Error Codes & HTTP Status

| Code | HTTP | When |
|------|------|------|
| `AUTH_MISSING` | 401 | No Authorization header or invalid JWT |
| `AUTH_FORBIDDEN` | 403 | Valid JWT but no tenant membership |
| `VALIDATION_ERROR` | 400 | Missing/invalid required fields (company_id, action, employee_id) |
| `BUSINESS_RULE_VIOLATION` | 422 | Legal validations failed, invalid state transition, blocked operation |
| `NOT_FOUND` | 404 | Entity not found (employee, cycle, process) |
| `RATE_LIMITED` | 429 | AI API rate limit |
| `PAYMENT_REQUIRED` | 402 | AI credits exhausted |
| `INTERNAL_ERROR` | 500 | Unexpected errors (message always generic, never leaked) |

---

## Step 2 — Implementation Plan

### 2.1 Create shared helper: `_shared/error-contract.ts`

A ~40 line utility providing:
- `successResponse(data, corsHeaders, meta?)` → Response with standard success shape
- `errorResponse(code, message, status, corsHeaders)` → Response with standard error shape
- `mapAuthError(authResult, corsHeaders)` → Converts `TenantAuthError` to standard error response
- Predefined error builders: `validationError(message)`, `notFoundError(entity)`, `businessRuleError(message, details?)`, `internalError()`

### 2.2 Refactor each function (7 functions)

For each function, the changes are mechanical:
1. Import `{ successResponse, errorResponse, mapAuthError, ... }` from `_shared/error-contract.ts`
2. Replace auth error handling: `if (isAuthError(authResult)) return mapAuthError(authResult, corsHeaders)`
3. Replace `throw new Error('company_id required')` → `return validationError('company_id required', corsHeaders)`
4. Replace `throw new Error('Employee not found')` → `return notFoundError('Employee', corsHeaders)`
5. Replace business validation 200s with 422 + `BUSINESS_RULE_VIOLATION`
6. Replace catch-all with `internalError(corsHeaders)` (always 500, never leaks message)
7. Wrap all success responses with `successResponse(data, corsHeaders)`

**Key constraint**: Success response `data` field keeps the exact same shape as today — no breaking changes for frontend consumers.

### 2.3 Per-function specifics

**payroll-calculation-engine**:
- `!company_id` → `VALIDATION_ERROR` 400
- `!employee_id` → `VALIDATION_ERROR` 400
- `!emp` → `NOT_FOUND` 404
- Legal validation failures with `success:false` → `BUSINESS_RULE_VIOLATION` 422 (keep `legalValidations` and `preview` in error details)
- Unknown action → `VALIDATION_ERROR` 400
- Catch-all → `INTERNAL_ERROR` 500

**payroll-it-engine**:
- Same pattern. `!company_id` / missing params → 400. Not found → 404. Catch-all → 500.

**payroll-irpf-engine**:
- Already has proper 400 for company_id/action — just wrap in standard shape.
- `!emp` → 404. Catch-all → 500.

**payroll-supervisor**:
- `blocked_by` response (filed without docs) → `BUSINESS_RULE_VIOLATION` 422.
- Invalid transition → `BUSINESS_RULE_VIOLATION` 422.
- Cycle already exists → `BUSINESS_RULE_VIOLATION` 422.

**legal-action-router**:
- Already has proper 400 for company_id. Standardize shape.
- Stop leaking `error.message` in catch-all.

**legal-multiagent-supervisor**:
- Same: standardize shapes, stop leaking messages.

**ai-legal-validator**:
- Unknown action → wrap in standard error shape with `success:false`.
- Stop leaking messages in catch-all.

### 2.4 Documentation

Generate `/docs/S8_error_contract_baseline.md` with:
- Contract specification
- Before/after per function
- Migration notes for frontend consumers (no breaking changes expected since `data` shapes preserved)

---

## Deliverables

1. **New file**: `supabase/functions/_shared/error-contract.ts` (~40-50 lines)
2. **7 function edits** — mechanical refactors, no logic changes
3. **Report**: `/docs/S8_error_contract_baseline.md`

## Constraints

- No frontend changes
- No RLS changes
- No new features
- Success `data` payloads remain identical
- Only error response shapes change (wrapped in standard contract)
- All 7 functions deployed after changes

