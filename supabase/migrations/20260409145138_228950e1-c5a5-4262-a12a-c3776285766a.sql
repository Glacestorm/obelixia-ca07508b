
-- =============================================
-- S5.5 TANDA 1: Remediación RLS High-Risk
-- =============================================

-- 1. erp_hr_dry_run_results (company_id uuid)
DROP POLICY IF EXISTS "Authenticated full access on dry_run_results" ON erp_hr_dry_run_results;
CREATE POLICY "Tenant isolation on erp_hr_dry_run_results"
  ON erp_hr_dry_run_results FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

-- 2. erp_hr_sandbox_executions (company_id text → cast to uuid)
DROP POLICY IF EXISTS "Authenticated users can insert sandbox executions" ON erp_hr_sandbox_executions;
DROP POLICY IF EXISTS "Authenticated users can read sandbox executions" ON erp_hr_sandbox_executions;
DROP POLICY IF EXISTS "Authenticated users can update sandbox executions" ON erp_hr_sandbox_executions;
CREATE POLICY "Tenant isolation on erp_hr_sandbox_executions"
  ON erp_hr_sandbox_executions FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id::uuid))
  WITH CHECK (public.user_has_erp_company_access(company_id::uuid));

-- 3. erp_hr_submission_approvals (company_id uuid)
DROP POLICY IF EXISTS "Authenticated users can insert approvals" ON erp_hr_submission_approvals;
DROP POLICY IF EXISTS "Authenticated users can view approvals" ON erp_hr_submission_approvals;
DROP POLICY IF EXISTS "Authenticated users can update approvals" ON erp_hr_submission_approvals;
CREATE POLICY "Tenant isolation on erp_hr_submission_approvals"
  ON erp_hr_submission_approvals FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

-- 4. erp_hr_domain_certificates (company_id uuid)
DROP POLICY IF EXISTS "Users can insert company certificates" ON erp_hr_domain_certificates;
DROP POLICY IF EXISTS "Users can view company certificates" ON erp_hr_domain_certificates;
DROP POLICY IF EXISTS "Users can update company certificates" ON erp_hr_domain_certificates;
CREATE POLICY "Tenant isolation on erp_hr_domain_certificates"
  ON erp_hr_domain_certificates FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));
