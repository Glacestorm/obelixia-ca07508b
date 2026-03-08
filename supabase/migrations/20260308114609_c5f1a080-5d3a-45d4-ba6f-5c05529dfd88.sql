
-- ============================================================
-- P9.1 — RLS & TENANT ISOLATION FOR 41 PREMIUM TABLES
-- ============================================================

-- STEP 1: Security definer functions
CREATE OR REPLACE FUNCTION public.user_has_erp_premium_access(p_company_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.erp_user_roles
    WHERE user_id = auth.uid()
      AND company_id::text = p_company_id
  )
$$;

CREATE OR REPLACE FUNCTION public.user_has_erp_twin_access(p_twin_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.erp_hr_twin_instances t
    JOIN public.erp_user_roles r ON r.company_id::text = t.company_id
    WHERE t.id = p_twin_id
      AND r.user_id = auth.uid()
  )
$$;

-- ============================================================
-- STEP 2: DROP PERMISSIVE POLICIES
-- ============================================================

-- P1: Security
DROP POLICY IF EXISTS "Authenticated users can manage data classifications" ON public.erp_hr_data_classifications;
DROP POLICY IF EXISTS "Authenticated users can manage masking rules" ON public.erp_hr_masking_rules;
DROP POLICY IF EXISTS "Authenticated users can manage sod rules" ON public.erp_hr_sod_rules;
DROP POLICY IF EXISTS "Authenticated users can manage sod violations" ON public.erp_hr_sod_violations;
DROP POLICY IF EXISTS "Authenticated users can manage security incidents" ON public.erp_hr_security_incidents;
DROP POLICY IF EXISTS "Authenticated users can manage data access log" ON public.erp_hr_data_access_log;
DROP POLICY IF EXISTS "auth_data_classifications" ON public.erp_hr_data_classifications;
DROP POLICY IF EXISTS "auth_masking_rules" ON public.erp_hr_masking_rules;
DROP POLICY IF EXISTS "auth_sod_rules" ON public.erp_hr_sod_rules;
DROP POLICY IF EXISTS "auth_sod_violations" ON public.erp_hr_sod_violations;
DROP POLICY IF EXISTS "auth_security_incidents" ON public.erp_hr_security_incidents;
DROP POLICY IF EXISTS "auth_data_access_log" ON public.erp_hr_data_access_log;

-- P2: AI Governance
DROP POLICY IF EXISTS "Authenticated read ai_model_registry" ON public.erp_hr_ai_model_registry;
DROP POLICY IF EXISTS "Authenticated insert ai_model_registry" ON public.erp_hr_ai_model_registry;
DROP POLICY IF EXISTS "Authenticated update ai_model_registry" ON public.erp_hr_ai_model_registry;
DROP POLICY IF EXISTS "Authenticated read ai_decisions" ON public.erp_hr_ai_decisions;
DROP POLICY IF EXISTS "Authenticated insert ai_decisions" ON public.erp_hr_ai_decisions;
DROP POLICY IF EXISTS "Authenticated read ai_bias_audits" ON public.erp_hr_ai_bias_audits;
DROP POLICY IF EXISTS "Authenticated insert ai_bias_audits" ON public.erp_hr_ai_bias_audits;
DROP POLICY IF EXISTS "Authenticated read ai_governance_policies" ON public.erp_hr_ai_governance_policies;
DROP POLICY IF EXISTS "Authenticated manage ai_governance_policies" ON public.erp_hr_ai_governance_policies;
DROP POLICY IF EXISTS "Authenticated read ai_explainability_reports" ON public.erp_hr_ai_explainability_reports;
DROP POLICY IF EXISTS "Authenticated insert ai_explainability_reports" ON public.erp_hr_ai_explainability_reports;

-- P3: Workforce Planning
DROP POLICY IF EXISTS "wfp_auth" ON public.erp_hr_workforce_plans;
DROP POLICY IF EXISTS "hcm_auth" ON public.erp_hr_headcount_models;
DROP POLICY IF EXISTS "scen_auth" ON public.erp_hr_scenarios;
DROP POLICY IF EXISTS "sgf_auth" ON public.erp_hr_skill_gap_forecasts;
DROP POLICY IF EXISTS "cp_auth" ON public.erp_hr_cost_projections;

-- P4: Fairness
DROP POLICY IF EXISTS "pay_equity_all" ON public.erp_hr_pay_equity_analyses;
DROP POLICY IF EXISTS "fairness_metrics_all" ON public.erp_hr_fairness_metrics;
DROP POLICY IF EXISTS "justice_cases_all" ON public.erp_hr_justice_cases;
DROP POLICY IF EXISTS "equity_action_plans_all" ON public.erp_hr_equity_action_plans;
DROP POLICY IF EXISTS "fairness_audit_all" ON public.erp_hr_fairness_audit_trail;

-- P5: Digital Twin
DROP POLICY IF EXISTS "Auth users full access twin_instances" ON public.erp_hr_twin_instances;
DROP POLICY IF EXISTS "Auth users full access twin_module_snapshots" ON public.erp_hr_twin_module_snapshots;
DROP POLICY IF EXISTS "Auth users full access twin_metrics_history" ON public.erp_hr_twin_metrics_history;
DROP POLICY IF EXISTS "Auth users full access twin_experiments" ON public.erp_hr_twin_experiments;
DROP POLICY IF EXISTS "Auth users full access twin_alerts" ON public.erp_hr_twin_alerts;

-- P6: Legal Engine
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.erp_hr_legal_templates;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.erp_hr_legal_clauses;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.erp_hr_legal_contracts;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.erp_hr_legal_compliance_checks;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.erp_hr_legal_audit_trail;

-- P7: CNAE
DROP POLICY IF EXISTS "Auth users manage cnae_sector_profiles" ON public.erp_hr_cnae_sector_profiles;
DROP POLICY IF EXISTS "Auth users manage cnae_compliance_rules" ON public.erp_hr_cnae_compliance_rules;
DROP POLICY IF EXISTS "Auth users manage cnae_benchmarks" ON public.erp_hr_cnae_benchmarks;
DROP POLICY IF EXISTS "Auth users manage cnae_risk_assessments" ON public.erp_hr_cnae_risk_assessments;
DROP POLICY IF EXISTS "Auth users manage cnae_intelligence_log" ON public.erp_hr_cnae_intelligence_log;

-- P8: Role Experience
DROP POLICY IF EXISTS "Authenticated users can manage role profiles" ON public.erp_hr_role_experience_profiles;
DROP POLICY IF EXISTS "Authenticated users can manage role dashboards" ON public.erp_hr_role_dashboards;
DROP POLICY IF EXISTS "Authenticated users can manage role onboarding" ON public.erp_hr_role_onboarding;
DROP POLICY IF EXISTS "Authenticated users can manage user experience" ON public.erp_hr_user_experience;
DROP POLICY IF EXISTS "Authenticated users can manage role analytics" ON public.erp_hr_role_analytics;

-- ============================================================
-- STEP 3: TENANT-ISOLATED POLICIES
-- ============================================================

-- P1: Security (6 tables with company_id TEXT)
CREATE POLICY "p9_select" ON public.erp_hr_data_classifications FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_data_classifications FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_data_classifications FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_delete" ON public.erp_hr_data_classifications FOR DELETE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_masking_rules FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_masking_rules FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_masking_rules FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_delete" ON public.erp_hr_masking_rules FOR DELETE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_sod_rules FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_sod_rules FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_sod_rules FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_delete" ON public.erp_hr_sod_rules FOR DELETE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_sod_violations FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_sod_violations FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_sod_violations FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_security_incidents FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_security_incidents FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_security_incidents FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_data_access_log FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_data_access_log FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));

-- P2: AI Governance (5 tables)
CREATE POLICY "p9_select" ON public.erp_hr_ai_model_registry FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_ai_model_registry FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_ai_model_registry FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_ai_decisions FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_ai_decisions FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_ai_bias_audits FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_ai_bias_audits FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_ai_bias_audits FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_ai_governance_policies FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_ai_governance_policies FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_ai_governance_policies FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_ai_explainability_reports FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_ai_explainability_reports FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));

-- P3: Workforce Planning (5 tables)
CREATE POLICY "p9_select" ON public.erp_hr_workforce_plans FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_workforce_plans FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_workforce_plans FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_delete" ON public.erp_hr_workforce_plans FOR DELETE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_headcount_models FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_headcount_models FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_headcount_models FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_delete" ON public.erp_hr_headcount_models FOR DELETE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_scenarios FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_scenarios FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_scenarios FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_delete" ON public.erp_hr_scenarios FOR DELETE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_skill_gap_forecasts FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_skill_gap_forecasts FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_skill_gap_forecasts FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_cost_projections FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_cost_projections FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_cost_projections FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

-- P4: Fairness (5 tables)
CREATE POLICY "p9_select" ON public.erp_hr_pay_equity_analyses FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_pay_equity_analyses FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_pay_equity_analyses FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_fairness_metrics FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_fairness_metrics FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_fairness_metrics FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_justice_cases FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_justice_cases FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_justice_cases FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_equity_action_plans FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_equity_action_plans FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_equity_action_plans FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_fairness_audit_trail FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_fairness_audit_trail FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));

-- P5: Digital Twin (parent + 4 children)
CREATE POLICY "p9_select" ON public.erp_hr_twin_instances FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_twin_instances FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_twin_instances FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_delete" ON public.erp_hr_twin_instances FOR DELETE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_twin_module_snapshots FOR SELECT TO authenticated USING (public.user_has_erp_twin_access(twin_id));
CREATE POLICY "p9_insert" ON public.erp_hr_twin_module_snapshots FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_twin_access(twin_id));
CREATE POLICY "p9_update" ON public.erp_hr_twin_module_snapshots FOR UPDATE TO authenticated USING (public.user_has_erp_twin_access(twin_id));

CREATE POLICY "p9_select" ON public.erp_hr_twin_metrics_history FOR SELECT TO authenticated USING (public.user_has_erp_twin_access(twin_id));
CREATE POLICY "p9_insert" ON public.erp_hr_twin_metrics_history FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_twin_access(twin_id));

CREATE POLICY "p9_select" ON public.erp_hr_twin_experiments FOR SELECT TO authenticated USING (public.user_has_erp_twin_access(twin_id));
CREATE POLICY "p9_insert" ON public.erp_hr_twin_experiments FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_twin_access(twin_id));
CREATE POLICY "p9_update" ON public.erp_hr_twin_experiments FOR UPDATE TO authenticated USING (public.user_has_erp_twin_access(twin_id));

CREATE POLICY "p9_select" ON public.erp_hr_twin_alerts FOR SELECT TO authenticated USING (public.user_has_erp_twin_access(twin_id));
CREATE POLICY "p9_insert" ON public.erp_hr_twin_alerts FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_twin_access(twin_id));
CREATE POLICY "p9_update" ON public.erp_hr_twin_alerts FOR UPDATE TO authenticated USING (public.user_has_erp_twin_access(twin_id));

-- P6: Legal Engine (5 tables)
CREATE POLICY "p9_select" ON public.erp_hr_legal_templates FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_legal_templates FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_legal_templates FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_delete" ON public.erp_hr_legal_templates FOR DELETE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_legal_clauses FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_legal_clauses FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_legal_clauses FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_delete" ON public.erp_hr_legal_clauses FOR DELETE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_legal_contracts FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_legal_contracts FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_legal_contracts FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_legal_compliance_checks FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_legal_compliance_checks FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_legal_audit_trail FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_legal_audit_trail FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));

-- P7: CNAE Intelligence (5 tables)
CREATE POLICY "p9_select" ON public.erp_hr_cnae_sector_profiles FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_cnae_sector_profiles FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_cnae_sector_profiles FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_cnae_compliance_rules FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_cnae_compliance_rules FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_cnae_compliance_rules FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_cnae_benchmarks FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_cnae_benchmarks FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_cnae_benchmarks FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_cnae_risk_assessments FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_cnae_risk_assessments FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_cnae_risk_assessments FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_cnae_intelligence_log FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_cnae_intelligence_log FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));

-- P8: Role Experience (5 tables)
CREATE POLICY "p9_select" ON public.erp_hr_role_experience_profiles FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_role_experience_profiles FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_role_experience_profiles FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_role_dashboards FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_role_dashboards FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_role_dashboards FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_role_onboarding FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_role_onboarding FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_role_onboarding FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_user_experience FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_user_experience FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_update" ON public.erp_hr_user_experience FOR UPDATE TO authenticated USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "p9_select" ON public.erp_hr_role_analytics FOR SELECT TO authenticated USING (public.user_has_erp_premium_access(company_id));
CREATE POLICY "p9_insert" ON public.erp_hr_role_analytics FOR INSERT TO authenticated WITH CHECK (public.user_has_erp_premium_access(company_id));
