

# S4.3 Batch B: payroll-supervisor Migration Plan

## Current State

The function has **13 data operations** all using `supabase` (service_role client). It already validates JWT and membership inline but bypasses RLS for all queries.

## Prerequisite: S3-fix on erp_audit_nomina_cycles

The table has `company_id NOT NULL` but its only policy is `erp_audit_nomina_cycles_company_isolation` with `USING(true) WITH CHECK(true)` — fully permissive.

**Migration SQL:**
```sql
DROP POLICY "erp_audit_nomina_cycles_company_isolation" ON public.erp_audit_nomina_cycles;

CREATE POLICY "tenant_isolation_all"
  ON public.erp_audit_nomina_cycles
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));
```

## Data Operations Inventory

| # | Action | Table | Operation | Migrable |
|---|--------|-------|-----------|----------|
| 1 | start_cycle | erp_audit_nomina_cycles | SELECT (exists check) | Yes (after S3-fix) |
| 2 | start_cycle | erp_audit_nomina_cycles | INSERT | Yes (after S3-fix) |
| 3 | start_cycle | erp_audit_events | INSERT | Yes (INSERT policy OK) |
| 4 | advance_status | erp_audit_nomina_cycles | SELECT | Yes |
| 5 | advance_status | erp_hr_generated_files | SELECT (count) | Yes |
| 6 | advance_status | erp_audit_nomina_cycles | UPDATE | Yes |
| 7 | advance_status | erp_audit_events | INSERT | Yes |
| 8 | get_cycle_status | erp_audit_nomina_cycles | SELECT | Yes |
| 9 | get_cycle_status | erp_audit_events | SELECT | **Exception** |
| 10 | get_kpis | erp_audit_nomina_cycles | SELECT | Yes |
| 11 | get_kpis | erp_hr_generated_files | SELECT | Yes |
| 12 | get_kpis | erp_audit_findings | SELECT (count) | Yes |
| 13 | get_kpis | erp_audit_reports | SELECT | Yes |
| 14 | get_kpis | erp_hr_it_processes | SELECT (count) | Yes |
| 15 | get_kpis | erp_hr_garnishments | SELECT (count) | Yes |
| 16 | escalate_to_legal | erp_audit_findings | INSERT | Yes |

## Exception: erp_audit_events SELECT (#9)

The SELECT policy on `erp_audit_events` requires `erp_has_permission(auth.uid(), company_id, 'audit.read')`. Users who can manage payroll cycles should be able to see the transition history. Two options:

- **Option A (recommended)**: Keep this single SELECT on `adminClient`. The user already passed membership validation, so it's safe. Minimal risk.
- **Option B**: Add a separate SELECT policy for payroll cycle events. This would expand RLS scope beyond this task.

I recommend **Option A** — retain `adminClient` for this one query only.

## Implementation Plan

### Step 1: SQL Migration
Drop permissive policy on `erp_audit_nomina_cycles`, create tenant-scoped policy.

### Step 2: Code Changes in payroll-supervisor/index.ts
1. Import `validateTenantAccess`, `isAuthError` from `_shared/tenant-auth.ts`
2. Replace inline auth block (L20-60) with `validateTenantAccess(req, company_id)` — note: `company_id` comes from the body, so we parse body first, then validate
3. Destructure `{ userClient, adminClient }` from result
4. Replace all `supabase` references with `userClient` except the `erp_audit_events` SELECT in `get_cycle_status`
5. Remove manual `createClient` calls (L27-41)

### Structural note
The current code parses `company_id` from the body (L44) before the membership check (L49). With `validateTenantAccess`, we need to parse the body first, extract `company_id`, then call the shared utility. This is a minor reorder but preserves the same logic.

## Summary

| Metric | Value |
|--------|-------|
| Total data ops | 16 |
| Migrated to userClient | **15** |
| Retained on adminClient | **1** (erp_audit_events SELECT — requires audit.read permission) |
| S3-fix required | Yes (erp_audit_nomina_cycles) |
| Contract changes | None |
| Logic changes | None |

**Batch is apt for build.**

