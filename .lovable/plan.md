

# S6.2A — SERVICE_ROLE / adminClient Hardening Phase 1

## Analysis Summary

### Function-by-function findings

```text
Function                      | validateTenantAccess | adminClient data ops | Status
──────────────────────────────┼──────────────────────┼──────────────────────┼────────────
payroll-calculation-engine    | YES                  | 0 (unused import)    | CLEAN
payroll-supervisor            | YES                  | 1 (audit SELECT)     | MIGRATE
send-hr-alert                 | YES                  | 2 (justified)        | DOCUMENT
hr-country-registry           | NO (manual auth)     | ALL (~15 ops)        | MAJOR REFACTOR
erp-hr-innovation-discovery   | YES                  | 2 (setTimeout)       | DOCUMENT
```

---

## Changes per function

### 1. payroll-calculation-engine — NO-OP
Already fully migrated to `userClient`. The `adminClient` is destructured but never used.
- **Change**: Remove unused `adminClient` from destructuring (line 120).
- **Risk**: None.

### 2. payroll-supervisor — 1 migration
Line 159: `adminClient.from('erp_audit_events').select(...)` in `get_cycle_status`.
The same function already uses `userClient` for `erp_audit_events.insert()` (lines 60, 130), proving RLS works for this table.
- **Change**: Replace `adminClient` → `userClient` on line 159. Remove the stale comment.
- **Risk**: None — same table is already queried via `userClient` in other actions.

### 3. send-hr-alert — 2 documented exceptions
- **Line 234**: `adminClient.from('notifications').insert(...)` — Cross-user push notification. The sender inserts notifications for OTHER users who may belong to different RLS scopes. `adminClient` is justified.
- **Line 271**: `adminClient.functions.invoke('erp-hr-ai-agent')` — Service-to-service invocation requiring service_role for internal auth. Justified.
- **Change**: Add explicit security comments documenting why each usage is retained. No functional changes.

### 4. hr-country-registry — MAJOR REFACTOR
Currently does NOT use `validateTenantAccess`. Has manual auth (JWT claims check) + manual `adminClient` creation. ALL ~15 data operations use `adminClient`.

Tables involved: `hr_country_registry`, `hr_country_policies`, `hr_employee_extensions` — all have `company_id` and RLS enabled (currently with `USING(true)` open policies, but migrating to `userClient` now ensures future RLS tightening is automatically enforced).

- **Change**:
  1. Replace manual auth block with `validateTenantAccess(req, companyId)`
  2. Migrate all SELECT/INSERT/UPDATE/UPSERT operations to `userClient`
  3. Exception: `seed_defaults` action — bulk upserts that could be argued either way. Migrate to `userClient` since the user is authenticated and the data is company-scoped.
  4. `analyze_compliance` AI reads — migrate to `userClient`
- **Risk**: Low — tables have open RLS policies (`USING(true)`) so `userClient` will work. When policies are later tightened, the function will automatically respect them.

### 5. erp-hr-innovation-discovery — 2 documented exceptions
Lines 233-250: `setTimeout` block uses `adminClient` for post-response updates. The user's JWT may expire after the HTTP response is sent, so `userClient` would fail.
- **Change**: Add explicit security comments documenting the setTimeout exception. No functional changes.

---

## Deliverables

1. **payroll-calculation-engine/index.ts** — Remove unused `adminClient` destructuring
2. **payroll-supervisor/index.ts** — Migrate 1 audit SELECT to `userClient`
3. **send-hr-alert/index.ts** — Add security exception comments (no functional change)
4. **hr-country-registry/index.ts** — Full refactor to `validateTenantAccess` + `userClient`
5. **erp-hr-innovation-discovery/index.ts** — Add security exception comments (no functional change)
6. **`/docs/S6_service_role_phase1.md`** — Full report with before/after for each function

## Post-migration state

```text
Function                      | adminClient remaining | Justification
──────────────────────────────┼───────────────────────┼──────────────────────────────
payroll-calculation-engine    | 0                     | —
payroll-supervisor            | 0                     | —
send-hr-alert                 | 2                     | Cross-user notification + S2S invoke
hr-country-registry           | 0                     | —
erp-hr-innovation-discovery   | 2                     | setTimeout post-response ops
```

Total adminClient data ops: 10 → 4 (60% reduction). Remaining 4 are all documented exceptions.

