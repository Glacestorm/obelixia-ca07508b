

# Plan: S1.3 — Hardening Top-10 HR Edge Functions

## Functions Selected (by criticality and invocation count)

| # | Function | Lines | Auth? | Data sensitivity |
|---|----------|-------|-------|-----------------|
| 1 | `payroll-calculation-engine` | 234 | No | Salaries, SS bases, IRPF |
| 2 | `payroll-supervisor` | 275 | No | Payroll cycle lifecycle |
| 3 | `payroll-it-engine` | 248 | Partial (reads header, no getUser) | IT processes |
| 4 | `payroll-file-generator` | 292 | Yes (already has getUser) | TGSS/AEAT files |
| 5 | `erp-hr-strategic-planning` | 407 | No | Workforce plans, scenarios |
| 6 | `erp-hr-copilot-twin` | ~220 | No | Copilot sessions, KPIs |
| 7 | `erp-hr-autonomous-copilot` | ~410 | No | Autonomous actions |
| 8 | `erp-hr-compliance-monitor` | ~300 | No | Compliance alerts |
| 9 | `erp-hr-clm-agent` | ~370 | No | Contract lifecycle |
| 10 | `erp-hr-premium-intelligence` | ~450 | No | Premium analytics |

`payroll-file-generator` already has auth — will be skipped. Replaced by `erp-hr-security-governance` (~380 lines, no auth, security audit data).

## Uniform Pattern (identical for all 10 functions)

Each function gets the same ~25-line auth block inserted immediately after entering the `try` block, before any body parsing or business logic:

```typescript
// --- AUTH GATE ---
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } }
});
const { data: { user: authUser }, error: authError } = await userClient.auth.getUser();
if (authError || !authUser) {
  return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// --- COMPANY ACCESS VALIDATION ---
// (inserted after company_id is extracted from body)
if (effectiveCompanyId) {
  const { data: membership } = await supabase
    .from('erp_user_companies')
    .select('id')
    .eq('user_id', authUser.id)
    .eq('company_id', effectiveCompanyId)
    .eq('is_active', true)
    .maybeSingle();
  if (!membership) {
    return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
```

## Additional fixes per function

1. **Error sanitization**: Replace `error: error.message` / `error: error instanceof Error ? error.message : 'Unknown error'` with `error: 'Internal server error'` in the global catch block (keep `console.error` for server logs).

2. **`payroll-it-engine`** (special case): Already reads `authHeader` but never validates it — will replace the incomplete auth with the full pattern.

3. **CORS migration** (3 functions): `erp-hr-strategic-planning`, `erp-hr-copilot-twin`, and others still use hardcoded `corsHeaders` with `'*'`. Will migrate to `getSecureCorsHeaders(req)` from `_shared/edge-function-template.ts` where not already using it.

## What stays unchanged

- All business logic (switch cases, DB queries, AI prompts)
- API contracts (request/response shapes)
- Service role client for DB queries (still needed)
- Functions outside the top-10 list
- `erp-hr-ai-agent` (already hardened in S1.2)
- `payroll-file-generator` (already has auth)

## Compatibility

All callers use `supabase.functions.invoke()` which automatically sends the JWT. No client-side changes needed. Authenticated users with company membership see zero behavioral change.

## Implementation order

Batch 1 (payroll core): `payroll-calculation-engine`, `payroll-supervisor`, `payroll-it-engine`
Batch 2 (HR agents): `erp-hr-strategic-planning`, `erp-hr-copilot-twin`, `erp-hr-autonomous-copilot`
Batch 3 (compliance/intel): `erp-hr-compliance-monitor`, `erp-hr-clm-agent`, `erp-hr-premium-intelligence`, `erp-hr-security-governance`

Deploy and test after each batch.

