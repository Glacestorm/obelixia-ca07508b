

# Plan: Quick Wins Seguridad Inicial (S1.1 + S1.5)

## Task 1: Leaked Password Protection

Use the Cloud Auth configuration to enable HIBP (Have I Been Pwned) password checking. This prevents users from signing up or changing passwords to known-compromised passwords.

**Action**: Configure auth settings to enable leaked password protection.

## Task 2: Fix SECURITY DEFINER Views

### Views identified

| View | Tables accessed | Current risk |
|---|---|---|
| `erp_account_balances_view` | `erp_chart_accounts`, `erp_journal_entry_lines`, `erp_journal_entries` | Bypasses RLS — any user sees all companies' financial data |
| `v_erp_trade_api_connections_compat` | `erp_bank_connections`, `erp_banking_providers` | Bypasses RLS — any user sees all bank connections |

### Key findings

- **Neither view is queried in application code** (only in auto-generated `types.ts` foreign key references)
- Underlying tables have RLS enabled with policies that restrict by `auth.uid()` or `company_id`
- SECURITY DEFINER bypasses those policies entirely — this is the vulnerability

### Fix

One migration that recreates both views with `security_invoker = true`:

```sql
-- View 1: erp_account_balances_view
CREATE OR REPLACE VIEW public.erp_account_balances_view
WITH (security_invoker = true)
AS
  <same SELECT as current>;

-- View 2: v_erp_trade_api_connections_compat  
CREATE OR REPLACE VIEW public.v_erp_trade_api_connections_compat
WITH (security_invoker = true)
AS
  <same SELECT as current>;
```

This makes queries through these views respect the RLS policies of the calling user instead of the view creator.

### Safety

- Zero app code queries these views directly — no UI breakage possible
- The underlying RLS policies already exist and work correctly
- `security_invoker = true` is the Postgres 15+ standard recommendation

## Files

| Target | Action |
|---|---|
| Auth config | Enable HIBP leaked password check |
| Migration | `CREATE OR REPLACE VIEW ... WITH (security_invoker = true)` for both views |

## Not touched

- Edge functions
- RLS policies
- Business logic
- Any other tables or views

