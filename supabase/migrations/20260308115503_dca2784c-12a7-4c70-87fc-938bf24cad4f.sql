
-- P9.2 — Referential Integrity & Data Consistency (54 tables)

-- STEP 1: Drop functions CASCADE
DROP FUNCTION IF EXISTS public.user_has_erp_premium_access(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_erp_twin_access(UUID) CASCADE;

-- STEP 2: Drop remaining policies
DO $$
DECLARE
  t TEXT;
  p RECORD;
  tables TEXT[] := ARRAY[
    'erp_hr_ai_bias_audits','erp_hr_ai_decisions','erp_hr_ai_explainability_reports','erp_hr_ai_governance_policies','erp_hr_ai_model_registry',
    'erp_hr_cnae_benchmarks','erp_hr_cnae_compliance_rules','erp_hr_cnae_intelligence_log','erp_hr_cnae_risk_assessments','erp_hr_cnae_sector_profiles',
    'erp_hr_compliance_audits','erp_hr_compliance_incidents','erp_hr_compliance_kpis','erp_hr_compliance_policies','erp_hr_compliance_risk_assessments','erp_hr_compliance_training',
    'erp_hr_copilot_actions','erp_hr_copilot_kpis','erp_hr_copilot_sessions',
    'erp_hr_cost_projections','erp_hr_data_access_log','erp_hr_data_classifications',
    'erp_hr_digital_twin_simulations','erp_hr_digital_twin_snapshots',
    'erp_hr_document_requests','erp_hr_equity_action_plans',
    'erp_hr_esg_social_kpis','erp_hr_esg_social_metrics','erp_hr_esg_social_surveys',
    'erp_hr_fairness_audit_trail','erp_hr_fairness_metrics',
    'erp_hr_headcount_models','erp_hr_justice_cases',
    'erp_hr_legal_audit_trail','erp_hr_legal_clauses','erp_hr_legal_compliance_checks','erp_hr_legal_contracts','erp_hr_legal_templates',
    'erp_hr_masking_rules','erp_hr_pay_equity_analyses',
    'erp_hr_role_analytics','erp_hr_role_dashboards','erp_hr_role_experience_profiles','erp_hr_role_onboarding',
    'erp_hr_scenarios','erp_hr_security_incidents',
    'erp_hr_self_service_faq','erp_hr_self_service_requests',
    'erp_hr_skill_gap_forecasts','erp_hr_sod_rules','erp_hr_sod_violations',
    'erp_hr_twin_instances','erp_hr_user_experience','erp_hr_workforce_plans'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- STEP 3: Truncate
TRUNCATE TABLE public.erp_hr_ai_bias_audits, public.erp_hr_ai_decisions, public.erp_hr_ai_explainability_reports, public.erp_hr_ai_governance_policies, public.erp_hr_ai_model_registry CASCADE;
TRUNCATE TABLE public.erp_hr_cnae_benchmarks, public.erp_hr_cnae_compliance_rules, public.erp_hr_cnae_intelligence_log, public.erp_hr_cnae_risk_assessments, public.erp_hr_cnae_sector_profiles CASCADE;
TRUNCATE TABLE public.erp_hr_compliance_audits, public.erp_hr_compliance_incidents, public.erp_hr_compliance_kpis, public.erp_hr_compliance_policies, public.erp_hr_compliance_risk_assessments, public.erp_hr_compliance_training CASCADE;
TRUNCATE TABLE public.erp_hr_copilot_actions, public.erp_hr_copilot_kpis, public.erp_hr_copilot_sessions CASCADE;
TRUNCATE TABLE public.erp_hr_cost_projections, public.erp_hr_data_access_log, public.erp_hr_data_classifications CASCADE;
TRUNCATE TABLE public.erp_hr_digital_twin_simulations, public.erp_hr_digital_twin_snapshots CASCADE;
TRUNCATE TABLE public.erp_hr_document_requests, public.erp_hr_equity_action_plans CASCADE;
TRUNCATE TABLE public.erp_hr_esg_social_kpis, public.erp_hr_esg_social_metrics, public.erp_hr_esg_social_surveys CASCADE;
TRUNCATE TABLE public.erp_hr_fairness_audit_trail, public.erp_hr_fairness_metrics CASCADE;
TRUNCATE TABLE public.erp_hr_headcount_models, public.erp_hr_justice_cases CASCADE;
TRUNCATE TABLE public.erp_hr_legal_audit_trail, public.erp_hr_legal_clauses, public.erp_hr_legal_compliance_checks, public.erp_hr_legal_contracts, public.erp_hr_legal_templates CASCADE;
TRUNCATE TABLE public.erp_hr_masking_rules, public.erp_hr_pay_equity_analyses CASCADE;
TRUNCATE TABLE public.erp_hr_role_analytics, public.erp_hr_role_dashboards, public.erp_hr_role_experience_profiles, public.erp_hr_role_onboarding CASCADE;
TRUNCATE TABLE public.erp_hr_scenarios, public.erp_hr_security_incidents CASCADE;
TRUNCATE TABLE public.erp_hr_self_service_faq, public.erp_hr_self_service_requests CASCADE;
TRUNCATE TABLE public.erp_hr_skill_gap_forecasts, public.erp_hr_sod_rules, public.erp_hr_sod_violations CASCADE;
TRUNCATE TABLE public.erp_hr_twin_instances, public.erp_hr_user_experience, public.erp_hr_workforce_plans CASCADE;

-- STEP 4: ALTER company_id TEXT → UUID
ALTER TABLE public.erp_hr_data_classifications ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_masking_rules ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_sod_rules ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_sod_violations ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_security_incidents ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_data_access_log ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_ai_model_registry ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_ai_decisions ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_ai_bias_audits ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_ai_governance_policies ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_ai_explainability_reports ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_workforce_plans ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_headcount_models ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_scenarios ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_skill_gap_forecasts ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_cost_projections ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_pay_equity_analyses ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_fairness_metrics ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_justice_cases ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_equity_action_plans ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_fairness_audit_trail ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_twin_instances ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_legal_templates ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_legal_clauses ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_legal_contracts ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_legal_compliance_checks ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_legal_audit_trail ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_cnae_sector_profiles ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_cnae_compliance_rules ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_cnae_benchmarks ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_cnae_risk_assessments ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_cnae_intelligence_log ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_role_experience_profiles ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_role_dashboards ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_role_onboarding ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_user_experience ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_role_analytics ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_compliance_policies ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_compliance_audits ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_compliance_incidents ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_compliance_training ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_compliance_risk_assessments ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_compliance_kpis ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_esg_social_metrics ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_self_service_requests ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_self_service_faq ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_esg_social_surveys ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_esg_social_kpis ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_document_requests ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_copilot_sessions ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_copilot_actions ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_digital_twin_snapshots ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_digital_twin_simulations ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;
ALTER TABLE public.erp_hr_copilot_kpis ALTER COLUMN company_id DROP DEFAULT, ALTER COLUMN company_id TYPE UUID USING company_id::UUID;

-- STEP 5: Add FK constraints
ALTER TABLE public.erp_hr_data_classifications ADD CONSTRAINT fk_p92_data_class FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_masking_rules ADD CONSTRAINT fk_p92_mask FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_sod_rules ADD CONSTRAINT fk_p92_sod FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_sod_violations ADD CONSTRAINT fk_p92_sod_viol FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_security_incidents ADD CONSTRAINT fk_p92_sec_inc FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_data_access_log ADD CONSTRAINT fk_p92_dal FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_ai_model_registry ADD CONSTRAINT fk_p92_ai_mod FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_ai_decisions ADD CONSTRAINT fk_p92_ai_dec FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_ai_bias_audits ADD CONSTRAINT fk_p92_ai_bias FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_ai_governance_policies ADD CONSTRAINT fk_p92_ai_gov FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_ai_explainability_reports ADD CONSTRAINT fk_p92_ai_xai FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_workforce_plans ADD CONSTRAINT fk_p92_wf_plan FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_headcount_models ADD CONSTRAINT fk_p92_hc_mod FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_scenarios ADD CONSTRAINT fk_p92_scen FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_skill_gap_forecasts ADD CONSTRAINT fk_p92_skill FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_cost_projections ADD CONSTRAINT fk_p92_cost FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_pay_equity_analyses ADD CONSTRAINT fk_p92_pay_eq FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_fairness_metrics ADD CONSTRAINT fk_p92_fair_met FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_justice_cases ADD CONSTRAINT fk_p92_just FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_equity_action_plans ADD CONSTRAINT fk_p92_eq_act FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_fairness_audit_trail ADD CONSTRAINT fk_p92_fair_aud FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_twin_instances ADD CONSTRAINT fk_p92_twin FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_legal_templates ADD CONSTRAINT fk_p92_leg_tmpl FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_legal_clauses ADD CONSTRAINT fk_p92_leg_cl FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_legal_contracts ADD CONSTRAINT fk_p92_leg_con FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_legal_compliance_checks ADD CONSTRAINT fk_p92_leg_chk FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_legal_audit_trail ADD CONSTRAINT fk_p92_leg_aud FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_cnae_sector_profiles ADD CONSTRAINT fk_p92_cnae_sec FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_cnae_compliance_rules ADD CONSTRAINT fk_p92_cnae_comp FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_cnae_benchmarks ADD CONSTRAINT fk_p92_cnae_bench FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_cnae_risk_assessments ADD CONSTRAINT fk_p92_cnae_risk FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_cnae_intelligence_log ADD CONSTRAINT fk_p92_cnae_log FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_role_experience_profiles ADD CONSTRAINT fk_p92_role_prof FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_role_dashboards ADD CONSTRAINT fk_p92_role_dash FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_role_onboarding ADD CONSTRAINT fk_p92_role_onb FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_user_experience ADD CONSTRAINT fk_p92_user_exp FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_role_analytics ADD CONSTRAINT fk_p92_role_ana FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_compliance_policies ADD CONSTRAINT fk_p92_comp_pol FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_compliance_audits ADD CONSTRAINT fk_p92_comp_aud FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_compliance_incidents ADD CONSTRAINT fk_p92_comp_inc FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_compliance_training ADD CONSTRAINT fk_p92_comp_trn FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_compliance_risk_assessments ADD CONSTRAINT fk_p92_comp_rsk FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_compliance_kpis ADD CONSTRAINT fk_p92_comp_kpi FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_esg_social_metrics ADD CONSTRAINT fk_p92_esg_met FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_self_service_requests ADD CONSTRAINT fk_p92_ss_req FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_self_service_faq ADD CONSTRAINT fk_p92_ss_faq FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_esg_social_surveys ADD CONSTRAINT fk_p92_esg_surv FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_esg_social_kpis ADD CONSTRAINT fk_p92_esg_kpi FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_document_requests ADD CONSTRAINT fk_p92_doc_req FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_copilot_sessions ADD CONSTRAINT fk_p92_cop_ses FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_copilot_actions ADD CONSTRAINT fk_p92_cop_act FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_digital_twin_snapshots ADD CONSTRAINT fk_p92_dt_snap FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_digital_twin_simulations ADD CONSTRAINT fk_p92_dt_sim FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;
ALTER TABLE public.erp_hr_copilot_kpis ADD CONSTRAINT fk_p92_cop_kpi FOREIGN KEY (company_id) REFERENCES public.erp_companies(id) ON DELETE CASCADE;

-- STEP 6: Recreate security definer (fixed: no is_active column)
CREATE OR REPLACE FUNCTION public.user_has_erp_premium_access(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.erp_user_roles eur
    WHERE eur.user_id = auth.uid()
      AND eur.company_id = p_company_id
  )
$$;

-- STEP 7: Recreate RLS policies
DO $$
DECLARE
  t TEXT;
  tables_all TEXT[] := ARRAY[
    'erp_hr_data_classifications','erp_hr_masking_rules','erp_hr_sod_rules','erp_hr_sod_violations','erp_hr_security_incidents','erp_hr_data_access_log',
    'erp_hr_ai_model_registry','erp_hr_ai_decisions','erp_hr_ai_bias_audits','erp_hr_ai_governance_policies','erp_hr_ai_explainability_reports',
    'erp_hr_workforce_plans','erp_hr_headcount_models','erp_hr_scenarios','erp_hr_skill_gap_forecasts','erp_hr_cost_projections',
    'erp_hr_pay_equity_analyses','erp_hr_fairness_metrics','erp_hr_justice_cases','erp_hr_equity_action_plans','erp_hr_fairness_audit_trail',
    'erp_hr_twin_instances',
    'erp_hr_legal_templates','erp_hr_legal_clauses','erp_hr_legal_contracts','erp_hr_legal_compliance_checks','erp_hr_legal_audit_trail',
    'erp_hr_cnae_sector_profiles','erp_hr_cnae_compliance_rules','erp_hr_cnae_benchmarks','erp_hr_cnae_risk_assessments','erp_hr_cnae_intelligence_log',
    'erp_hr_role_experience_profiles','erp_hr_role_dashboards','erp_hr_role_onboarding','erp_hr_user_experience','erp_hr_role_analytics',
    'erp_hr_compliance_policies','erp_hr_compliance_audits','erp_hr_compliance_incidents','erp_hr_compliance_training','erp_hr_compliance_risk_assessments','erp_hr_compliance_kpis',
    'erp_hr_esg_social_metrics','erp_hr_self_service_requests','erp_hr_self_service_faq','erp_hr_esg_social_surveys','erp_hr_esg_social_kpis','erp_hr_document_requests',
    'erp_hr_copilot_sessions','erp_hr_copilot_actions','erp_hr_digital_twin_snapshots','erp_hr_digital_twin_simulations','erp_hr_copilot_kpis'
  ];
  tables_readonly TEXT[] := ARRAY['erp_hr_data_access_log','erp_hr_fairness_audit_trail','erp_hr_legal_audit_trail','erp_hr_cnae_intelligence_log'];
BEGIN
  FOREACH t IN ARRAY tables_all LOOP
    EXECUTE format('CREATE POLICY "p92_sel" ON public.%I FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id))', t);
    EXECUTE format('CREATE POLICY "p92_ins" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id))', t);
    IF NOT (t = ANY(tables_readonly)) THEN
      EXECUTE format('CREATE POLICY "p92_upd" ON public.%I FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id))', t);
    END IF;
  END LOOP;
END $$;
