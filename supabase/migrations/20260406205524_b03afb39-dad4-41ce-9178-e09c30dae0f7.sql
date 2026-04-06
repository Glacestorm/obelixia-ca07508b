-- Fix SECURITY DEFINER views → SECURITY INVOKER
-- This ensures queries through these views respect RLS policies of the calling user

-- View 1: erp_account_balances_view
CREATE OR REPLACE VIEW public.erp_account_balances_view
WITH (security_invoker = true)
AS
SELECT a.id,
    a.company_id,
    a.code,
    a.name,
    a.account_type,
    a.level,
    a.is_header,
    COALESCE(sum(jel.debit), 0::numeric) AS total_debit,
    COALESCE(sum(jel.credit), 0::numeric) AS total_credit,
    CASE
        WHEN a.account_type::text = ANY (ARRAY['asset'::character varying, 'expense'::character varying]::text[]) THEN COALESCE(sum(jel.debit), 0::numeric) - COALESCE(sum(jel.credit), 0::numeric)
        ELSE COALESCE(sum(jel.credit), 0::numeric) - COALESCE(sum(jel.debit), 0::numeric)
    END AS balance
FROM erp_chart_accounts a
LEFT JOIN erp_journal_entry_lines jel ON jel.account_id = a.id
LEFT JOIN erp_journal_entries je ON je.id = jel.entry_id AND je.is_posted = true
WHERE a.is_active = true
GROUP BY a.id, a.company_id, a.code, a.name, a.account_type, a.level, a.is_header;

-- View 2: v_erp_trade_api_connections_compat
CREATE OR REPLACE VIEW public.v_erp_trade_api_connections_compat
WITH (security_invoker = true)
AS
SELECT bc.id,
    bc.company_id,
    bp.provider_code AS provider_type,
    bc.connection_name,
    bc.status,
    NULL::jsonb AS api_key_encrypted,
    NULL::jsonb AS api_secret_encrypted,
    NULL::text AS certificate_data,
    bc.consent_expires_at AS token_expires_at,
    bc.auto_reconcile AS is_active,
    bc.last_sync_at,
    bc.created_at,
    bc.updated_at
FROM erp_bank_connections bc
JOIN erp_banking_providers bp ON bc.provider_id = bp.id;