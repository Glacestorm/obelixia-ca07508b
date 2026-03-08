
-- HARDENING RLS WAVE 2 — Final

-- === HELPER FUNCTIONS ===

CREATE OR REPLACE FUNCTION public.user_has_erp_wellbeing_access(p_entity_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM erp_hr_legal_entities le JOIN erp_user_roles eur ON eur.company_id = le.company_id WHERE le.id = p_entity_id AND eur.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.user_has_erp_twin_sub_access(p_twin_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM erp_hr_twin_instances ti JOIN erp_user_roles eur ON eur.company_id = ti.company_id WHERE ti.id = p_twin_id AND eur.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.user_has_erp_board_pack_access(p_pack_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM erp_hr_board_packs bp JOIN erp_user_roles eur ON eur.company_id = bp.company_id WHERE bp.id = p_pack_id AND eur.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.user_has_erp_compensation_access(p_component_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM erp_hr_compensation_components cc JOIN erp_user_roles eur ON eur.company_id = cc.company_id WHERE cc.id = p_component_id AND eur.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.user_has_erp_employee_access(p_employee_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM erp_hr_employees e JOIN erp_user_roles eur ON eur.company_id = e.company_id WHERE e.id = p_employee_id AND eur.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.user_has_erp_wellbeing_survey_access(p_survey_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM erp_hr_wellbeing_surveys s JOIN erp_hr_legal_entities le ON le.id = s.entity_id JOIN erp_user_roles eur ON eur.company_id = le.company_id WHERE s.id = p_survey_id AND eur.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.user_has_erp_wellness_program_access(p_program_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM erp_hr_wellness_programs p JOIN erp_hr_legal_entities le ON le.id = p.entity_id JOIN erp_user_roles eur ON eur.company_id = le.company_id WHERE p.id = p_program_id AND eur.user_id = auth.uid())
$$;

-- === DROP ALL OLD POLICIES ===
DO $$ 
DECLARE tbl TEXT; pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'erp_hr_salary_bands','erp_hr_compensation','erp_hr_benefits_plans','erp_hr_benefits_enrollments','erp_hr_recognition','erp_hr_compensation_components','erp_hr_employee_compensation','erp_hr_rewards_statements','erp_hr_benefit_valuations','erp_hr_market_benchmarks','erp_hr_recognition_programs',
    'erp_hr_board_pack_templates','erp_hr_board_packs','erp_hr_board_pack_sections','erp_hr_board_pack_distribution','erp_hr_board_pack_reviews',
    'erp_hr_wellbeing_assessments','erp_hr_wellbeing_surveys','erp_hr_wellbeing_survey_responses','erp_hr_wellness_programs','erp_hr_wellness_enrollments','erp_hr_burnout_alerts','erp_hr_wellbeing_kpis',
    'erp_hr_twin_module_snapshots','erp_hr_twin_metrics_history','erp_hr_twin_experiments','erp_hr_twin_alerts',
    'erp_hr_opportunities','erp_hr_succession_positions','erp_hr_api_access_log'
  ]) LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- === STRICT POLICIES ===

-- A: Compensation (direct company_id)
CREATE POLICY "rls_w2" ON public.erp_hr_salary_bands FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
CREATE POLICY "rls_w2" ON public.erp_hr_compensation FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
CREATE POLICY "rls_w2" ON public.erp_hr_benefits_plans FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
CREATE POLICY "rls_w2" ON public.erp_hr_benefits_enrollments FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
CREATE POLICY "rls_w2" ON public.erp_hr_recognition FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
CREATE POLICY "rls_w2" ON public.erp_hr_compensation_components FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
CREATE POLICY "rls_w2" ON public.erp_hr_benefit_valuations FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
CREATE POLICY "rls_w2" ON public.erp_hr_market_benchmarks FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
CREATE POLICY "rls_w2" ON public.erp_hr_recognition_programs FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
-- Indirect
CREATE POLICY "rls_w2" ON public.erp_hr_employee_compensation FOR ALL TO authenticated USING (user_has_erp_compensation_access(component_id)) WITH CHECK (user_has_erp_compensation_access(component_id));
CREATE POLICY "rls_w2" ON public.erp_hr_rewards_statements FOR ALL TO authenticated USING (user_has_erp_employee_access(employee_id)) WITH CHECK (user_has_erp_employee_access(employee_id));

-- B: Board Pack
CREATE POLICY "rls_w2" ON public.erp_hr_board_pack_templates FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
CREATE POLICY "rls_w2" ON public.erp_hr_board_packs FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
CREATE POLICY "rls_w2" ON public.erp_hr_board_pack_sections FOR ALL TO authenticated USING (user_has_erp_board_pack_access(board_pack_id)) WITH CHECK (user_has_erp_board_pack_access(board_pack_id));
CREATE POLICY "rls_w2" ON public.erp_hr_board_pack_distribution FOR ALL TO authenticated USING (user_has_erp_board_pack_access(board_pack_id)) WITH CHECK (user_has_erp_board_pack_access(board_pack_id));
CREATE POLICY "rls_w2" ON public.erp_hr_board_pack_reviews FOR ALL TO authenticated USING (user_has_erp_board_pack_access(board_pack_id)) WITH CHECK (user_has_erp_board_pack_access(board_pack_id));

-- C: Wellbeing
CREATE POLICY "rls_w2" ON public.erp_hr_wellbeing_assessments FOR ALL TO authenticated USING (user_has_erp_wellbeing_access(entity_id)) WITH CHECK (user_has_erp_wellbeing_access(entity_id));
CREATE POLICY "rls_w2" ON public.erp_hr_wellbeing_surveys FOR ALL TO authenticated USING (user_has_erp_wellbeing_access(entity_id)) WITH CHECK (user_has_erp_wellbeing_access(entity_id));
CREATE POLICY "rls_w2" ON public.erp_hr_wellbeing_survey_responses FOR ALL TO authenticated USING (user_has_erp_wellbeing_survey_access(survey_id)) WITH CHECK (user_has_erp_wellbeing_survey_access(survey_id));
CREATE POLICY "rls_w2" ON public.erp_hr_wellness_programs FOR ALL TO authenticated USING (user_has_erp_wellbeing_access(entity_id)) WITH CHECK (user_has_erp_wellbeing_access(entity_id));
CREATE POLICY "rls_w2" ON public.erp_hr_wellness_enrollments FOR ALL TO authenticated USING (user_has_erp_wellness_program_access(program_id)) WITH CHECK (user_has_erp_wellness_program_access(program_id));
CREATE POLICY "rls_w2" ON public.erp_hr_burnout_alerts FOR ALL TO authenticated USING (user_has_erp_wellbeing_access(entity_id)) WITH CHECK (user_has_erp_wellbeing_access(entity_id));
CREATE POLICY "rls_w2" ON public.erp_hr_wellbeing_kpis FOR ALL TO authenticated USING (user_has_erp_wellbeing_access(entity_id)) WITH CHECK (user_has_erp_wellbeing_access(entity_id));

-- D: Digital Twin
CREATE POLICY "rls_w2" ON public.erp_hr_twin_module_snapshots FOR ALL TO authenticated USING (user_has_erp_twin_sub_access(twin_id)) WITH CHECK (user_has_erp_twin_sub_access(twin_id));
CREATE POLICY "rls_w2" ON public.erp_hr_twin_metrics_history FOR ALL TO authenticated USING (user_has_erp_twin_sub_access(twin_id)) WITH CHECK (user_has_erp_twin_sub_access(twin_id));
CREATE POLICY "rls_w2" ON public.erp_hr_twin_experiments FOR ALL TO authenticated USING (user_has_erp_twin_sub_access(twin_id)) WITH CHECK (user_has_erp_twin_sub_access(twin_id));
CREATE POLICY "rls_w2" ON public.erp_hr_twin_alerts FOR ALL TO authenticated USING (user_has_erp_twin_sub_access(twin_id)) WITH CHECK (user_has_erp_twin_sub_access(twin_id));

-- F: API
CREATE POLICY "rls_w2" ON public.erp_hr_api_access_log FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));

-- G: Opportunities/Succession
CREATE POLICY "rls_w2" ON public.erp_hr_opportunities FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
CREATE POLICY "rls_w2" ON public.erp_hr_succession_positions FOR ALL TO authenticated USING (user_has_erp_company_access(company_id)) WITH CHECK (user_has_erp_company_access(company_id));
