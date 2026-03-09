

# Fix: user_roles `.single()` Error + Duplicate Line Removal

## Root Cause
Users with multiple roles trigger a **406 error** ("Cannot coerce the result to a single JSON object") because `.single()` expects exactly 1 row but finds 2+. This crashes the Presence system and the manage-user edge function.

## Locations to Fix

### Fix 1: `src/contexts/PresenceContext.tsx` (line 64)
**Problem**: `.single()` on `user_roles` query crashes for multi-role users.
**Fix**: Replace with array query + priority-based role selection (same pattern already used in `useAuth.tsx`).

```typescript
// Before:
supabase.from('user_roles').select('role').eq('user_id', user.id).single(),

// After:
supabase.from('user_roles').select('role').eq('user_id', user.id),
```

Then change line 69 to pick highest-priority role from array:
```typescript
const roles = roleRes.data || [];
const ROLE_PRIORITIES: Record<string, number> = {
  'superadmin': 100, 'director_comercial': 90, 'responsable_comercial': 80,
  'director_oficina': 70, 'admin': 60, 'auditor': 50, 'gestor': 40, 'user': 10,
};
const highestRole = roles.length > 0
  ? roles.reduce((best, cur) =>
      (ROLE_PRIORITIES[cur.role] || 0) > (ROLE_PRIORITIES[best.role] || 0) ? cur : best
    ).role
  : 'user';

profileDataRef.current = {
  full_name: profileRes.data?.full_name || user.email || 'Unknown',
  role: highestRole,
  avatar_url: profileRes.data?.avatar_url,
  oficina: profileRes.data?.oficina,
};
```

### Fix 2: `supabase/functions/manage-user/index.ts` (lines 36-40)
**Problem**: `.single()` on superadmin check fails for multi-role users.
**Fix**: Query all roles, check if any is `superadmin`:

```typescript
// Before:
const { data: roles } = await supabaseAdmin
  .from('user_roles').select('role').eq('user_id', user.id).single();
if (!roles || roles.role !== 'superadmin') { throw... }

// After:
const { data: roles } = await supabaseAdmin
  .from('user_roles').select('role').eq('user_id', user.id);
const isSuperAdmin = (roles || []).some(r => r.role === 'superadmin');
if (!isSuperAdmin) { throw... }
```

### Fix 3: `src/components/erp/electrical/ElectricalConsultingModule.tsx` (line 310)
**Problem**: `ElectricalAjustesPanel` rendered twice (lines 309 and 310 are identical).
**Fix**: Delete line 310.

## Impact
- **PresenceContext**: Will stop throwing 406 errors for multi-role users. Online presence indicator works correctly.
- **manage-user edge function**: Superadmin user management operations will work for users who also have other roles.
- **useAuth**: Already correct (uses array query). No change needed.
- **useMFAEnforcement**: Already correct (uses `.maybeSingle()`). No change needed.
- **ElectricalConsultingModule**: Ajustes panel renders once instead of twice, eliminating duplicate mount side effects.

## Files Modified
1. `src/contexts/PresenceContext.tsx` — Replace `.single()` with array + priority selection
2. `supabase/functions/manage-user/index.ts` — Replace `.single()` with `.some()` check
3. `src/components/erp/electrical/ElectricalConsultingModule.tsx` — Remove duplicate line 310

## Risk: None. These are pure bug fixes with no architectural changes.

