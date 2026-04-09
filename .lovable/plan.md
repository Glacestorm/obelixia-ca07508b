

# S3 Fix: INSERT Policy for erp_hr_innovation_logs

## Current State

**Table:** `erp_hr_innovation_logs`
- Has `company_id` column (uuid, nullable)
- Has `performed_by` column (uuid, nullable)

**Existing policies:**
| Policy | Command | USING | WITH CHECK |
|--------|---------|-------|------------|
| View innovation logs | SELECT | `user_has_erp_company_access(company_id)` | — |

No INSERT policy exists — this is the blocker for `erp-hr-innovation-discovery` migration.

## Proposed Fix

Add one INSERT policy using the same tenant isolation function:

```sql
CREATE POLICY "insert_innovation_logs"
  ON public.erp_hr_innovation_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_erp_company_access(company_id));
```

## Risk Assessment

- **No rupture**: Existing SELECT policy untouched. INSERT was previously done via service_role (bypassing RLS), so no existing userClient path is affected.
- **Nullable company_id**: `user_has_erp_company_access(NULL)` returns false, so inserts without company_id will be rejected via userClient — this is correct behavior since the edge function always provides company_id.
- **Scope**: Single table, single policy, zero logic changes.

## Deliverable

| Item | Value |
|------|-------|
| Table | `erp_hr_innovation_logs` |
| Policy added | `insert_innovation_logs` (INSERT, authenticated) |
| Isolation | `user_has_erp_company_access(company_id)` |
| Tables touched | 1 |
| Breaking changes | None |

