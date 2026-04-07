
-- =============================================
-- TANDA 2 PASO 1: erp_hr_garnishment_calculations
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage garnishment calculations" ON erp_hr_garnishment_calculations;

CREATE POLICY "tenant_select" ON erp_hr_garnishment_calculations
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(get_company_for_employee(employee_id)));

CREATE POLICY "tenant_insert" ON erp_hr_garnishment_calculations
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(get_company_for_employee(employee_id)));

CREATE POLICY "tenant_update" ON erp_hr_garnishment_calculations
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(get_company_for_employee(employee_id)))
  WITH CHECK (user_has_erp_company_access(get_company_for_employee(employee_id)));

CREATE POLICY "tenant_delete" ON erp_hr_garnishment_calculations
  FOR DELETE TO authenticated
  USING (user_has_erp_company_access(get_company_for_employee(employee_id)));

-- =============================================
-- TANDA 2 PASO 2: erp_hr_contract_process_data
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read contract process data" ON erp_hr_contract_process_data;
DROP POLICY IF EXISTS "Authenticated users can insert contract process data" ON erp_hr_contract_process_data;
DROP POLICY IF EXISTS "Authenticated users can update contract process data" ON erp_hr_contract_process_data;

CREATE POLICY "tenant_select" ON erp_hr_contract_process_data
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(company_id));

CREATE POLICY "tenant_insert" ON erp_hr_contract_process_data
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(company_id));

CREATE POLICY "tenant_update" ON erp_hr_contract_process_data
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(company_id))
  WITH CHECK (user_has_erp_company_access(company_id));

-- =============================================
-- TANDA 2 PASO 3: erp_hr_payslip_texts
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage payslip texts" ON erp_hr_payslip_texts;
DROP POLICY IF EXISTS "erp_hr_payslip_texts_company_isolation" ON erp_hr_payslip_texts;

CREATE POLICY "tenant_select" ON erp_hr_payslip_texts
  FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_erp_company_access(company_id));

CREATE POLICY "tenant_insert" ON erp_hr_payslip_texts
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(company_id));

CREATE POLICY "tenant_update" ON erp_hr_payslip_texts
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(company_id))
  WITH CHECK (user_has_erp_company_access(company_id));

CREATE POLICY "tenant_delete" ON erp_hr_payslip_texts
  FOR DELETE TO authenticated
  USING (user_has_erp_company_access(company_id));
