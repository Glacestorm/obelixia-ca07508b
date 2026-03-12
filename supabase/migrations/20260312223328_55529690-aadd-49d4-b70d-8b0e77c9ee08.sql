
-- FIX RLS: Remaining 3 tables (5, 6, 7) after previous partial migration

-- 5. hr_payroll_record_lines — uses payroll_record_id (not record_id)
DROP POLICY IF EXISTS "hr_payroll_record_lines_select" ON public.hr_payroll_record_lines;
DROP POLICY IF EXISTS "hr_payroll_record_lines_insert" ON public.hr_payroll_record_lines;
DROP POLICY IF EXISTS "hr_payroll_record_lines_update" ON public.hr_payroll_record_lines;
DROP POLICY IF EXISTS "hr_payroll_record_lines_delete" ON public.hr_payroll_record_lines;
DROP POLICY IF EXISTS "Allow authenticated users full access to hr_payroll_record_lines" ON public.hr_payroll_record_lines;
DROP POLICY IF EXISTS "Authenticated users can manage payroll record lines" ON public.hr_payroll_record_lines;

CREATE POLICY "hr_payroll_record_lines_select" ON public.hr_payroll_record_lines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_payroll_records r
    WHERE r.id = hr_payroll_record_lines.payroll_record_id
    AND public.user_has_erp_company_access(r.company_id)
  ));

CREATE POLICY "hr_payroll_record_lines_insert" ON public.hr_payroll_record_lines
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.hr_payroll_records r
    WHERE r.id = hr_payroll_record_lines.payroll_record_id
    AND public.user_has_erp_company_access(r.company_id)
  ));

CREATE POLICY "hr_payroll_record_lines_update" ON public.hr_payroll_record_lines
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_payroll_records r
    WHERE r.id = hr_payroll_record_lines.payroll_record_id
    AND public.user_has_erp_company_access(r.company_id)
  ));

CREATE POLICY "hr_payroll_record_lines_delete" ON public.hr_payroll_record_lines
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_payroll_records r
    WHERE r.id = hr_payroll_record_lines.payroll_record_id
    AND public.user_has_erp_company_access(r.company_id)
  ));

-- 6. hr_es_employee_labor_data — has company_id directly
DROP POLICY IF EXISTS "hr_es_employee_labor_data_select" ON public.hr_es_employee_labor_data;
DROP POLICY IF EXISTS "hr_es_employee_labor_data_insert" ON public.hr_es_employee_labor_data;
DROP POLICY IF EXISTS "hr_es_employee_labor_data_update" ON public.hr_es_employee_labor_data;
DROP POLICY IF EXISTS "hr_es_employee_labor_data_delete" ON public.hr_es_employee_labor_data;
DROP POLICY IF EXISTS "Allow authenticated users full access to hr_es_employee_labor_data" ON public.hr_es_employee_labor_data;
DROP POLICY IF EXISTS "Authenticated users can manage ES labor data" ON public.hr_es_employee_labor_data;

CREATE POLICY "hr_es_employee_labor_data_select" ON public.hr_es_employee_labor_data
  FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "hr_es_employee_labor_data_insert" ON public.hr_es_employee_labor_data
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "hr_es_employee_labor_data_update" ON public.hr_es_employee_labor_data
  FOR UPDATE TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "hr_es_employee_labor_data_delete" ON public.hr_es_employee_labor_data
  FOR DELETE TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- 7. hr_admin_request_comments — JOIN via hr_admin_requests
DROP POLICY IF EXISTS "hr_admin_request_comments_select" ON public.hr_admin_request_comments;
DROP POLICY IF EXISTS "hr_admin_request_comments_insert" ON public.hr_admin_request_comments;
DROP POLICY IF EXISTS "hr_admin_request_comments_update" ON public.hr_admin_request_comments;
DROP POLICY IF EXISTS "hr_admin_request_comments_delete" ON public.hr_admin_request_comments;
DROP POLICY IF EXISTS "Allow authenticated users full access to hr_admin_request_comments" ON public.hr_admin_request_comments;
DROP POLICY IF EXISTS "Authenticated users can manage request comments" ON public.hr_admin_request_comments;

CREATE POLICY "hr_admin_request_comments_select" ON public.hr_admin_request_comments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_admin_requests req
    WHERE req.id = hr_admin_request_comments.request_id
    AND public.user_has_erp_company_access(req.company_id)
  ));

CREATE POLICY "hr_admin_request_comments_insert" ON public.hr_admin_request_comments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.hr_admin_requests req
    WHERE req.id = hr_admin_request_comments.request_id
    AND public.user_has_erp_company_access(req.company_id)
  ));

CREATE POLICY "hr_admin_request_comments_update" ON public.hr_admin_request_comments
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_admin_requests req
    WHERE req.id = hr_admin_request_comments.request_id
    AND public.user_has_erp_company_access(req.company_id)
  ));

CREATE POLICY "hr_admin_request_comments_delete" ON public.hr_admin_request_comments
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_admin_requests req
    WHERE req.id = hr_admin_request_comments.request_id
    AND public.user_has_erp_company_access(req.company_id)
  ));
