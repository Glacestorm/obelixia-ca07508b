
-- =============================================
-- MÓDULO CONSULTORÍA ELÉCTRICA - RLS HARDENING
-- Superadmin bypass + multi-tenant via erp_user_companies
-- =============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "energy_tariff_catalog_select" ON public.energy_tariff_catalog;
DROP POLICY IF EXISTS "energy_tariff_catalog_insert" ON public.energy_tariff_catalog;
DROP POLICY IF EXISTS "energy_tariff_catalog_update" ON public.energy_tariff_catalog;
DROP POLICY IF EXISTS "energy_tariff_catalog_delete" ON public.energy_tariff_catalog;

DROP POLICY IF EXISTS "energy_cases_select" ON public.energy_cases;
DROP POLICY IF EXISTS "energy_cases_insert" ON public.energy_cases;
DROP POLICY IF EXISTS "energy_cases_update" ON public.energy_cases;
DROP POLICY IF EXISTS "energy_cases_delete" ON public.energy_cases;

DROP POLICY IF EXISTS "energy_supplies_select" ON public.energy_supplies;
DROP POLICY IF EXISTS "energy_supplies_insert" ON public.energy_supplies;
DROP POLICY IF EXISTS "energy_supplies_update" ON public.energy_supplies;
DROP POLICY IF EXISTS "energy_supplies_delete" ON public.energy_supplies;

DROP POLICY IF EXISTS "energy_invoices_select" ON public.energy_invoices;
DROP POLICY IF EXISTS "energy_invoices_insert" ON public.energy_invoices;
DROP POLICY IF EXISTS "energy_invoices_update" ON public.energy_invoices;
DROP POLICY IF EXISTS "energy_invoices_delete" ON public.energy_invoices;

DROP POLICY IF EXISTS "energy_contracts_select" ON public.energy_contracts;
DROP POLICY IF EXISTS "energy_contracts_insert" ON public.energy_contracts;
DROP POLICY IF EXISTS "energy_contracts_update" ON public.energy_contracts;
DROP POLICY IF EXISTS "energy_contracts_delete" ON public.energy_contracts;

DROP POLICY IF EXISTS "energy_consumption_profiles_select" ON public.energy_consumption_profiles;
DROP POLICY IF EXISTS "energy_consumption_profiles_insert" ON public.energy_consumption_profiles;
DROP POLICY IF EXISTS "energy_consumption_profiles_update" ON public.energy_consumption_profiles;
DROP POLICY IF EXISTS "energy_consumption_profiles_delete" ON public.energy_consumption_profiles;

DROP POLICY IF EXISTS "energy_recommendations_select" ON public.energy_recommendations;
DROP POLICY IF EXISTS "energy_recommendations_insert" ON public.energy_recommendations;
DROP POLICY IF EXISTS "energy_recommendations_update" ON public.energy_recommendations;
DROP POLICY IF EXISTS "energy_recommendations_delete" ON public.energy_recommendations;

DROP POLICY IF EXISTS "energy_reports_select" ON public.energy_reports;
DROP POLICY IF EXISTS "energy_reports_insert" ON public.energy_reports;
DROP POLICY IF EXISTS "energy_reports_update" ON public.energy_reports;
DROP POLICY IF EXISTS "energy_reports_delete" ON public.energy_reports;

DROP POLICY IF EXISTS "energy_tasks_select" ON public.energy_tasks;
DROP POLICY IF EXISTS "energy_tasks_insert" ON public.energy_tasks;
DROP POLICY IF EXISTS "energy_tasks_update" ON public.energy_tasks;
DROP POLICY IF EXISTS "energy_tasks_delete" ON public.energy_tasks;

-- =============================================
-- Helper function for energy tenant check
-- =============================================
CREATE OR REPLACE FUNCTION public.user_has_energy_company_access(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.erp_user_companies
      WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND is_active = true
    );
$$;

-- Helper: check if user can access a case
CREATE OR REPLACE FUNCTION public.user_has_energy_case_access(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.energy_cases ec
      JOIN public.erp_user_companies euc ON euc.company_id = ec.company_id
      WHERE ec.id = p_case_id
        AND euc.user_id = auth.uid()
        AND euc.is_active = true
    );
$$;

-- =============================================
-- energy_tariff_catalog: readable by all authenticated, writable by superadmin/admin
-- =============================================
CREATE POLICY "energy_tariff_catalog_select" ON public.energy_tariff_catalog
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "energy_tariff_catalog_insert" ON public.energy_tariff_catalog
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "energy_tariff_catalog_update" ON public.energy_tariff_catalog
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "energy_tariff_catalog_delete" ON public.energy_tariff_catalog
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- =============================================
-- energy_cases: tenant-isolated with superadmin bypass
-- =============================================
CREATE POLICY "energy_cases_select" ON public.energy_cases
  FOR SELECT TO authenticated USING (public.user_has_energy_company_access(company_id));
CREATE POLICY "energy_cases_insert" ON public.energy_cases
  FOR INSERT TO authenticated WITH CHECK (public.user_has_energy_company_access(company_id));
CREATE POLICY "energy_cases_update" ON public.energy_cases
  FOR UPDATE TO authenticated
  USING (public.user_has_energy_company_access(company_id))
  WITH CHECK (public.user_has_energy_company_access(company_id));
CREATE POLICY "energy_cases_delete" ON public.energy_cases
  FOR DELETE TO authenticated USING (public.user_has_energy_company_access(company_id));

-- =============================================
-- Child tables: tenant-isolated via case_id with superadmin bypass
-- =============================================

-- energy_supplies
CREATE POLICY "energy_supplies_select" ON public.energy_supplies
  FOR SELECT TO authenticated USING (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_supplies_insert" ON public.energy_supplies
  FOR INSERT TO authenticated WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_supplies_update" ON public.energy_supplies
  FOR UPDATE TO authenticated USING (public.user_has_energy_case_access(case_id)) WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_supplies_delete" ON public.energy_supplies
  FOR DELETE TO authenticated USING (public.user_has_energy_case_access(case_id));

-- energy_invoices
CREATE POLICY "energy_invoices_select" ON public.energy_invoices
  FOR SELECT TO authenticated USING (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_invoices_insert" ON public.energy_invoices
  FOR INSERT TO authenticated WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_invoices_update" ON public.energy_invoices
  FOR UPDATE TO authenticated USING (public.user_has_energy_case_access(case_id)) WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_invoices_delete" ON public.energy_invoices
  FOR DELETE TO authenticated USING (public.user_has_energy_case_access(case_id));

-- energy_contracts
CREATE POLICY "energy_contracts_select" ON public.energy_contracts
  FOR SELECT TO authenticated USING (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_contracts_insert" ON public.energy_contracts
  FOR INSERT TO authenticated WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_contracts_update" ON public.energy_contracts
  FOR UPDATE TO authenticated USING (public.user_has_energy_case_access(case_id)) WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_contracts_delete" ON public.energy_contracts
  FOR DELETE TO authenticated USING (public.user_has_energy_case_access(case_id));

-- energy_consumption_profiles
CREATE POLICY "energy_consumption_profiles_select" ON public.energy_consumption_profiles
  FOR SELECT TO authenticated USING (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_consumption_profiles_insert" ON public.energy_consumption_profiles
  FOR INSERT TO authenticated WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_consumption_profiles_update" ON public.energy_consumption_profiles
  FOR UPDATE TO authenticated USING (public.user_has_energy_case_access(case_id)) WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_consumption_profiles_delete" ON public.energy_consumption_profiles
  FOR DELETE TO authenticated USING (public.user_has_energy_case_access(case_id));

-- energy_recommendations
CREATE POLICY "energy_recommendations_select" ON public.energy_recommendations
  FOR SELECT TO authenticated USING (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_recommendations_insert" ON public.energy_recommendations
  FOR INSERT TO authenticated WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_recommendations_update" ON public.energy_recommendations
  FOR UPDATE TO authenticated USING (public.user_has_energy_case_access(case_id)) WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_recommendations_delete" ON public.energy_recommendations
  FOR DELETE TO authenticated USING (public.user_has_energy_case_access(case_id));

-- energy_reports
CREATE POLICY "energy_reports_select" ON public.energy_reports
  FOR SELECT TO authenticated USING (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_reports_insert" ON public.energy_reports
  FOR INSERT TO authenticated WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_reports_update" ON public.energy_reports
  FOR UPDATE TO authenticated USING (public.user_has_energy_case_access(case_id)) WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_reports_delete" ON public.energy_reports
  FOR DELETE TO authenticated USING (public.user_has_energy_case_access(case_id));

-- energy_tasks
CREATE POLICY "energy_tasks_select" ON public.energy_tasks
  FOR SELECT TO authenticated USING (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_tasks_insert" ON public.energy_tasks
  FOR INSERT TO authenticated WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_tasks_update" ON public.energy_tasks
  FOR UPDATE TO authenticated USING (public.user_has_energy_case_access(case_id)) WITH CHECK (public.user_has_energy_case_access(case_id));
CREATE POLICY "energy_tasks_delete" ON public.energy_tasks
  FOR DELETE TO authenticated USING (public.user_has_energy_case_access(case_id));
