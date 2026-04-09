
-- =============================================
-- S5.5 TANDA 2A: Remediación RLS High-Risk
-- =============================================

-- 1. erp_hr_labor_observations (company_id uuid nullable, 0 filas)
DROP POLICY IF EXISTS "Authenticated full access on labor_observations" ON erp_hr_labor_observations;
CREATE POLICY "Tenant isolation on erp_hr_labor_observations"
  ON erp_hr_labor_observations FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

-- 2. erp_hr_multi_employment (company_id uuid nullable, 0 filas)
DROP POLICY IF EXISTS "Authenticated full access on multi_employment" ON erp_hr_multi_employment;
CREATE POLICY "Tenant isolation on erp_hr_multi_employment"
  ON erp_hr_multi_employment FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

-- 3. erp_hr_dry_run_evidence (sin company_id, lookup via dry_run_id)
DROP POLICY IF EXISTS "Authenticated full access on dry_run_evidence" ON erp_hr_dry_run_evidence;
CREATE POLICY "Tenant isolation on erp_hr_dry_run_evidence"
  ON erp_hr_dry_run_evidence FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM erp_hr_dry_run_results r
    WHERE r.id = dry_run_id
    AND public.user_has_erp_company_access(r.company_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM erp_hr_dry_run_results r
    WHERE r.id = dry_run_id
    AND public.user_has_erp_company_access(r.company_id)
  ));
