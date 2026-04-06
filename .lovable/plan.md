

# Plan: S1.2 — Hardening erp-hr-ai-agent

## Problem

The function (1285 lines) accepts any request with a valid anon key. It never checks who the caller is or whether they belong to the company whose data they're requesting. The service role key bypasses all RLS.

## Changes (single file only)

**File: `supabase/functions/erp-hr-ai-agent/index.ts`**

### 1. Auth gate (after line 68, before body parsing)

Add ~20 lines immediately after entering the try block:

```typescript
// --- AUTH VALIDATION ---
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
```

### 2. Company membership check (after effectiveCompanyId is set)

```typescript
// --- COMPANY ACCESS VALIDATION ---
if (effectiveCompanyId) {
  const { data: membership } = await supabase
    .from('erp_user_companies')
    .select('id')
    .eq('user_id', authUser.id)
    .eq('company_id', effectiveCompanyId)
    .maybeSingle();

  if (!membership) {
    return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
```

This uses the existing `erp_user_companies` table (already used elsewhere in the codebase for company-user mapping). The check uses the service role client so RLS doesn't interfere with the validation itself.

### 3. Sanitize error output (line 1279)

Replace raw error exposure:

```typescript
// Before:
error: error instanceof Error ? error.message : 'Unknown error'

// After:
error: 'Internal server error'
```

Keep `console.error` for server-side logging (already there at line 1276).

### 4. Audit log enrichment

Add `authUser.id` to the existing `logAction` calls where `user_id` context is available, so audit trail includes the verified identity. This is a minor addition to the existing `context` objects — no new logging infrastructure.

## What stays unchanged

- All business logic (switch cases, AI prompts, calculations)
- Service role client for DB queries (needed to bypass RLS for cross-table aggregations)
- CORS headers (separate hardening task S1.4)
- All other edge functions
- All client-side callers (`supabase.functions.invoke` already sends auth header automatically)

## Compatibility

All 22 files that call this function use `supabase.functions.invoke`, which automatically includes the user's JWT. No caller changes needed — if the user is logged in, requests work exactly as before. If not logged in, they were never supposed to access HR data.

## Verification

After deployment, test with `curl_edge_functions` to confirm:
- Request without auth → 401
- Request with valid auth but wrong company → 403
- Request with valid auth and correct company → 200 (existing behavior)

