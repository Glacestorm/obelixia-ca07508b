
-- =============================================
-- PASO 0: Función helper SECURITY DEFINER
-- =============================================
CREATE OR REPLACE FUNCTION public.get_company_for_employee(p_employee_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM erp_hr_employees WHERE id = p_employee_id LIMIT 1;
$$;

-- =============================================
-- PASO 1: erp_hr_registration_data
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read registration data" ON erp_hr_registration_data;
DROP POLICY IF EXISTS "Authenticated users can insert registration data" ON erp_hr_registration_data;
DROP POLICY IF EXISTS "Authenticated users can update registration data" ON erp_hr_registration_data;

CREATE POLICY "tenant_select" ON erp_hr_registration_data
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(company_id));

CREATE POLICY "tenant_insert" ON erp_hr_registration_data
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(company_id));

CREATE POLICY "tenant_update" ON erp_hr_registration_data
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(company_id))
  WITH CHECK (user_has_erp_company_access(company_id));

-- =============================================
-- PASO 2: erp_hr_employee_custom_concepts
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage custom concepts" ON erp_hr_employee_custom_concepts;
DROP POLICY IF EXISTS "erp_hr_employee_custom_concepts_company_isolation" ON erp_hr_employee_custom_concepts;

CREATE POLICY "tenant_select" ON erp_hr_employee_custom_concepts
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(COALESCE(company_id, get_company_for_employee(employee_id))));

CREATE POLICY "tenant_insert" ON erp_hr_employee_custom_concepts
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(COALESCE(company_id, get_company_for_employee(employee_id))));

CREATE POLICY "tenant_update" ON erp_hr_employee_custom_concepts
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(COALESCE(company_id, get_company_for_employee(employee_id))))
  WITH CHECK (user_has_erp_company_access(COALESCE(company_id, get_company_for_employee(employee_id))));

CREATE POLICY "tenant_delete" ON erp_hr_employee_custom_concepts
  FOR DELETE TO authenticated
  USING (user_has_erp_company_access(COALESCE(company_id, get_company_for_employee(employee_id))));

-- =============================================
-- PASO 3: erp_hr_garnishments
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage garnishments" ON erp_hr_garnishments;

CREATE POLICY "tenant_select" ON erp_hr_garnishments
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(get_company_for_employee(employee_id)));

CREATE POLICY "tenant_insert" ON erp_hr_garnishments
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(get_company_for_employee(employee_id)));

CREATE POLICY "tenant_update" ON erp_hr_garnishments
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(get_company_for_employee(employee_id)))
  WITH CHECK (user_has_erp_company_access(get_company_for_employee(employee_id)));

CREATE POLICY "tenant_delete" ON erp_hr_garnishments
  FOR DELETE TO authenticated
  USING (user_has_erp_company_access(get_company_for_employee(employee_id)));
