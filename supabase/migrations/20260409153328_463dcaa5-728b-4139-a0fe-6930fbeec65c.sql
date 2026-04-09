-- S5.5 Tanda 2B: Remediación RLS híbrida

-- =============================================
-- 1. erp_hr_agreement_salary_tables
-- =============================================

-- Drop dangerous policies (exact names from pg_policies)
DROP POLICY "Authenticated users can manage agreement salary tables" ON erp_hr_agreement_salary_tables;
DROP POLICY "Users can view agreement salary tables" ON erp_hr_agreement_salary_tables;

-- SELECT: global rows (company_id IS NULL) readable by all authenticated + tenant-scoped
CREATE POLICY "Hybrid read on erp_hr_agreement_salary_tables"
  ON erp_hr_agreement_salary_tables
  FOR SELECT
  TO authenticated
  USING (company_id IS NULL OR user_has_erp_company_access(company_id));

-- INSERT: tenant-scoped only
CREATE POLICY "Tenant insert on erp_hr_agreement_salary_tables"
  ON erp_hr_agreement_salary_tables
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_erp_company_access(company_id));

-- UPDATE: tenant-scoped only
CREATE POLICY "Tenant update on erp_hr_agreement_salary_tables"
  ON erp_hr_agreement_salary_tables
  FOR UPDATE
  TO authenticated
  USING (user_has_erp_company_access(company_id))
  WITH CHECK (user_has_erp_company_access(company_id));

-- DELETE: tenant-scoped only
CREATE POLICY "Tenant delete on erp_hr_agreement_salary_tables"
  ON erp_hr_agreement_salary_tables
  FOR DELETE
  TO authenticated
  USING (user_has_erp_company_access(company_id));

-- =============================================
-- 2. erp_hr_audit_log — only fix INSERT
-- =============================================

-- Drop dangerous INSERT policy (exact name)
DROP POLICY "System can insert audit logs" ON erp_hr_audit_log;

-- INSERT: allow system logs (company_id NULL) + tenant-scoped logs
CREATE POLICY "Hybrid insert on erp_hr_audit_log"
  ON erp_hr_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id IS NULL OR user_has_erp_company_access(company_id));