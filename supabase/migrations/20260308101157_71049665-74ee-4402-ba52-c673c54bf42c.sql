
-- P3: Workforce Planning & Scenario Studio - ALL TABLES

CREATE TABLE public.erp_hr_workforce_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  description TEXT,
  time_horizon TEXT NOT NULL DEFAULT '12_months',
  status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  budget_total NUMERIC(15,2) DEFAULT 0,
  budget_used NUMERIC(15,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_workforce_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wfp_auth" ON public.erp_hr_workforce_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.erp_hr_headcount_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  plan_id UUID REFERENCES public.erp_hr_workforce_plans(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  role_title TEXT NOT NULL,
  current_headcount INT NOT NULL DEFAULT 0,
  projected_headcount INT NOT NULL DEFAULT 0,
  gap INT GENERATED ALWAYS AS (projected_headcount - current_headcount) STORED,
  hiring_priority TEXT DEFAULT 'medium',
  estimated_cost_per_hire NUMERIC(12,2) DEFAULT 0,
  avg_time_to_fill_days INT DEFAULT 45,
  skill_requirements JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_headcount_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hcm_auth" ON public.erp_hr_headcount_models FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.erp_hr_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  plan_id UUID REFERENCES public.erp_hr_workforce_plans(id) ON DELETE SET NULL,
  scenario_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL DEFAULT 'custom',
  description TEXT,
  assumptions JSONB DEFAULT '{}',
  variables JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  impact_summary TEXT,
  probability NUMERIC(5,2) DEFAULT 50,
  risk_level TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'draft',
  simulated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scen_auth" ON public.erp_hr_scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.erp_hr_skill_gap_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  plan_id UUID REFERENCES public.erp_hr_workforce_plans(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_category TEXT DEFAULT 'technical',
  current_supply INT NOT NULL DEFAULT 0,
  projected_demand INT NOT NULL DEFAULT 0,
  gap INT GENERATED ALWAYS AS (projected_demand - current_supply) STORED,
  criticality TEXT DEFAULT 'medium',
  mitigation_strategy TEXT,
  estimated_resolution_months INT DEFAULT 6,
  market_availability TEXT DEFAULT 'moderate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_skill_gap_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sgf_auth" ON public.erp_hr_skill_gap_forecasts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.erp_hr_cost_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  plan_id UUID REFERENCES public.erp_hr_workforce_plans(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.erp_hr_scenarios(id) ON DELETE SET NULL,
  period TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  variance_vs_budget NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_cost_projections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_auth" ON public.erp_hr_cost_projections FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_scenarios;

-- Seed plans
INSERT INTO public.erp_hr_workforce_plans (company_id, plan_name, description, time_horizon, status, budget_total)
VALUES
  ('demo-company-id', 'Plan Estratégico 2026', 'Planificación de plantilla para el ejercicio 2026', '12_months', 'active', 2500000),
  ('demo-company-id', 'Expansión Internacional Q3', 'Apertura de oficina en Portugal', '6_months', 'draft', 800000);

-- Seed headcount
INSERT INTO public.erp_hr_headcount_models (company_id, plan_id, department, role_title, current_headcount, projected_headcount, hiring_priority, estimated_cost_per_hire, avg_time_to_fill_days)
SELECT 'demo-company-id', p.id, v.dept, v.role, v.cur, v.proj, v.pri, v.cost, v.days
FROM erp_hr_workforce_plans p,
(VALUES
  ('Engineering', 'Senior Developer', 12, 18, 'high', 8500.00, 35),
  ('Engineering', 'DevOps Engineer', 3, 5, 'critical', 9000.00, 45),
  ('Product', 'Product Manager', 4, 5, 'medium', 7500.00, 40),
  ('People', 'HR Business Partner', 2, 3, 'medium', 6000.00, 30)
) AS v(dept, role, cur, proj, pri, cost, days)
WHERE p.plan_name = 'Plan Estratégico 2026' AND p.company_id = 'demo-company-id';

-- Seed scenarios
INSERT INTO public.erp_hr_scenarios (company_id, plan_id, scenario_name, scenario_type, description, assumptions, variables, probability, risk_level)
SELECT 'demo-company-id', p.id, v.sname, v.stype, v.sdescr, v.sassump::jsonb, v.svars::jsonb, v.sprob, v.srisk
FROM erp_hr_workforce_plans p,
(VALUES
  ('Crecimiento Agresivo', 'growth', 'Crecimiento acelerado +30% plantilla', '{"market_growth":"15%"}', '{"turnover_rate":0.12,"growth_rate":0.30}', 35.0, 'medium'),
  ('Contracción Económica', 'contraction', 'Escenario adverso con reducción', '{"recession_probability":"40%"}', '{"turnover_rate":0.18,"growth_rate":-0.10}', 20.0, 'high'),
  ('Reestructuración Tech', 'restructuring', 'Migración a IA con reskilling', '{"ai_adoption":"aggressive"}', '{"automation_rate":0.15,"reskilling_rate":0.60}', 45.0, 'medium')
) AS v(sname, stype, sdescr, sassump, svars, sprob, srisk)
WHERE p.plan_name = 'Plan Estratégico 2026' AND p.company_id = 'demo-company-id';

-- Seed skill gaps
INSERT INTO public.erp_hr_skill_gap_forecasts (company_id, plan_id, skill_name, skill_category, current_supply, projected_demand, criticality, mitigation_strategy, market_availability)
SELECT 'demo-company-id', p.id, v.skill, v.cat, v.supply, v.demand, v.crit, v.strat, v.avail
FROM erp_hr_workforce_plans p,
(VALUES
  ('Machine Learning', 'technical', 2, 6, 'critical', 'hire', 'scarce'),
  ('Cloud Architecture', 'technical', 4, 7, 'high', 'train', 'limited'),
  ('Data Privacy (GDPR)', 'compliance', 3, 5, 'high', 'train', 'moderate')
) AS v(skill, cat, supply, demand, crit, strat, avail)
WHERE p.plan_name = 'Plan Estratégico 2026' AND p.company_id = 'demo-company-id';
