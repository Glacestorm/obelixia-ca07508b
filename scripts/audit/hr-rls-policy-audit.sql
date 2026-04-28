-- =====================================================================
-- HR / Payroll / Legal — RLS Policy Audit (read-only)
-- ---------------------------------------------------------------------
-- Companion to scripts/audit/hr-edge-functions-audit.ts
-- Source of truth: docs/qa/HR_CURRENT_STATE_VERIFICATION.md
--
-- Run:
--   psql "$DATABASE_URL" -f scripts/audit/hr-rls-policy-audit.sql
--
-- This script ONLY runs SELECTs. It does not modify any policy or row.
-- =====================================================================

\echo
\echo '== A) Permissive write policies on erp_hr_* (must be EMPTY) =='
\echo

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename LIKE 'erp_hr_%'
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  AND (
    qual       ILIKE '%true%' AND qual       NOT ILIKE '%user_has_%'
    OR with_check ILIKE '%true%' AND with_check NOT ILIKE '%user_has_%'
  );

\echo
\echo '== B) Same check broadened to payroll_*, erp_payroll_*, erp_legal_* =='
\echo

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE (tablename LIKE 'payroll_%'
       OR tablename LIKE 'erp_payroll_%'
       OR tablename LIKE 'erp_legal_%')
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  AND (
    qual       ILIKE '%true%' AND qual       NOT ILIKE '%user_has_%'
    OR with_check ILIKE '%true%' AND with_check NOT ILIKE '%user_has_%'
  );

\echo
\echo '== C) erp_hr_doc_action_queue — must show 4 tenant-isolated policies =='
\echo

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'erp_hr_doc_action_queue'
ORDER BY cmd;

\echo
\echo '== D) Tables with prefix erp_hr_/erp_payroll_/erp_legal_ that have RLS DISABLED =='
\echo

SELECT
  n.nspname AS schemaname,
  c.relname AS tablename,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND (c.relname LIKE 'erp_hr_%'
       OR c.relname LIKE 'erp_payroll_%'
       OR c.relname LIKE 'erp_legal_%'
       OR c.relname LIKE 'payroll_%')
  AND c.relrowsecurity = false
ORDER BY c.relname;

\echo
\echo '== E) Tables in scope WITHOUT any policy at all (RLS on but unprotected) =='
\echo

WITH scope AS (
  SELECT c.oid, c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND n.nspname = 'public'
    AND (c.relname LIKE 'erp_hr_%'
         OR c.relname LIKE 'erp_payroll_%'
         OR c.relname LIKE 'erp_legal_%'
         OR c.relname LIKE 'payroll_%')
    AND c.relrowsecurity = true
)
SELECT s.relname AS tablename
FROM scope s
LEFT JOIN pg_policy p ON p.polrelid = s.oid
WHERE p.polname IS NULL
ORDER BY s.relname;

\echo
\echo '== Done. Sections A, B, D, E should be EMPTY. Section C should show 4 rows. =='
