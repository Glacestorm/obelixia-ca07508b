-- Fix CRITICAL RLS: energy_customers - was USING(true), needs company isolation
DROP POLICY IF EXISTS "Users can view energy_customers" ON public.energy_customers;
DROP POLICY IF EXISTS "Users can insert energy_customers" ON public.energy_customers;
DROP POLICY IF EXISTS "Users can update energy_customers" ON public.energy_customers;
DROP POLICY IF EXISTS "Users can delete energy_customers" ON public.energy_customers;

CREATE POLICY "energy_customers_select" ON public.energy_customers
  FOR SELECT TO authenticated USING (user_has_energy_company_access(company_id));

CREATE POLICY "energy_customers_insert" ON public.energy_customers
  FOR INSERT TO authenticated WITH CHECK (user_has_energy_company_access(company_id));

CREATE POLICY "energy_customers_update" ON public.energy_customers
  FOR UPDATE TO authenticated USING (user_has_energy_company_access(company_id)) WITH CHECK (user_has_energy_company_access(company_id));

CREATE POLICY "energy_customers_delete" ON public.energy_customers
  FOR DELETE TO authenticated USING (user_has_energy_company_access(company_id));

-- Fix CRITICAL RLS: energy_simulations - was USING(true), needs company isolation
DROP POLICY IF EXISTS "Authenticated users can manage simulations" ON public.energy_simulations;

CREATE POLICY "energy_simulations_select" ON public.energy_simulations
  FOR SELECT TO authenticated USING (user_has_energy_company_access(company_id));

CREATE POLICY "energy_simulations_insert" ON public.energy_simulations
  FOR INSERT TO authenticated WITH CHECK (user_has_energy_company_access(company_id));

CREATE POLICY "energy_simulations_update" ON public.energy_simulations
  FOR UPDATE TO authenticated USING (user_has_energy_company_access(company_id)) WITH CHECK (user_has_energy_company_access(company_id));

CREATE POLICY "energy_simulations_delete" ON public.energy_simulations
  FOR DELETE TO authenticated USING (user_has_energy_company_access(company_id));

-- Fix CRITICAL RLS: energy_tracking - was USING(true), needs case-level isolation
DROP POLICY IF EXISTS "Authenticated users can manage energy_tracking" ON public.energy_tracking;

CREATE POLICY "energy_tracking_select" ON public.energy_tracking
  FOR SELECT TO authenticated USING (user_has_energy_case_access(case_id));

CREATE POLICY "energy_tracking_insert" ON public.energy_tracking
  FOR INSERT TO authenticated WITH CHECK (user_has_energy_case_access(case_id));

CREATE POLICY "energy_tracking_update" ON public.energy_tracking
  FOR UPDATE TO authenticated USING (user_has_energy_case_access(case_id)) WITH CHECK (user_has_energy_case_access(case_id));

CREATE POLICY "energy_tracking_delete" ON public.energy_tracking
  FOR DELETE TO authenticated USING (user_has_energy_case_access(case_id));