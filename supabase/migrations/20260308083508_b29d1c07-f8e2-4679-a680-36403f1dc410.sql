
-- Phase 8: HR Copilot + Digital Twin
-- Table 1: Copilot sessions
CREATE TABLE public.erp_hr_copilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL DEFAULT 'demo-company-id',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL DEFAULT 'general' CHECK (session_type IN ('general','onboarding','payroll','legal','performance','wellness')),
  title TEXT NOT NULL DEFAULT 'Nueva sesión',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  autonomy_level TEXT NOT NULL DEFAULT 'assisted' CHECK (autonomy_level IN ('manual','assisted','semi_autonomous','autonomous')),
  actions_taken JSONB DEFAULT '[]'::jsonb,
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: Copilot actions log
CREATE TABLE public.erp_hr_copilot_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.erp_hr_copilot_sessions(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL DEFAULT 'demo-company-id',
  action_type TEXT NOT NULL CHECK (action_type IN ('recommendation','auto_action','alert','prediction','report_generation','workflow_trigger')),
  description TEXT NOT NULL,
  target_entity TEXT,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','executed','rejected','failed')),
  result JSONB,
  confidence_score NUMERIC(5,2) CHECK (confidence_score BETWEEN 0 AND 100),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 3: Digital Twin snapshots
CREATE TABLE public.erp_hr_digital_twin_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL DEFAULT 'demo-company-id',
  snapshot_name TEXT NOT NULL,
  snapshot_type TEXT NOT NULL DEFAULT 'full' CHECK (snapshot_type IN ('full','partial','incremental')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','simulating')),
  org_structure JSONB DEFAULT '{}'::jsonb,
  workforce_metrics JSONB DEFAULT '{}'::jsonb,
  payroll_snapshot JSONB DEFAULT '{}'::jsonb,
  compliance_status JSONB DEFAULT '{}'::jsonb,
  wellness_metrics JSONB DEFAULT '{}'::jsonb,
  divergence_score NUMERIC(5,2) DEFAULT 0 CHECK (divergence_score BETWEEN 0 AND 100),
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 4: Digital Twin simulations
CREATE TABLE public.erp_hr_digital_twin_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.erp_hr_digital_twin_snapshots(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL DEFAULT 'demo-company-id',
  simulation_name TEXT NOT NULL,
  simulation_type TEXT NOT NULL CHECK (simulation_type IN ('workforce_change','salary_adjustment','policy_change','restructuring','hiring_plan','attrition_scenario')),
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  results JSONB,
  impact_analysis JSONB,
  risk_score NUMERIC(5,2) CHECK (risk_score BETWEEN 0 AND 100),
  recommendation TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 5: Copilot KPIs
CREATE TABLE public.erp_hr_copilot_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL DEFAULT 'demo-company-id',
  kpi_name TEXT NOT NULL,
  kpi_category TEXT NOT NULL CHECK (kpi_category IN ('efficiency','accuracy','adoption','satisfaction','autonomy')),
  current_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  target_value NUMERIC(10,2),
  previous_value NUMERIC(10,2),
  unit TEXT NOT NULL DEFAULT '%',
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('up','down','stable')),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.erp_hr_copilot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_copilot_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_digital_twin_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_digital_twin_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_copilot_kpis ENABLE ROW LEVEL SECURITY;

-- RLS policies (authenticated access)
CREATE POLICY "Authenticated users can manage copilot sessions" ON public.erp_hr_copilot_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage copilot actions" ON public.erp_hr_copilot_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage twin snapshots" ON public.erp_hr_digital_twin_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage twin simulations" ON public.erp_hr_digital_twin_simulations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage copilot kpis" ON public.erp_hr_copilot_kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for actions
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_copilot_actions;

-- Seed demo data
INSERT INTO public.erp_hr_copilot_kpis (company_id, kpi_name, kpi_category, current_value, target_value, previous_value, unit, trend) VALUES
('demo-company-id', 'Tasa de resolución automática', 'efficiency', 73.5, 85.0, 68.2, '%', 'up'),
('demo-company-id', 'Tiempo medio de respuesta', 'efficiency', 2.3, 1.5, 3.1, 'seg', 'up'),
('demo-company-id', 'Precisión de predicciones', 'accuracy', 89.1, 95.0, 85.7, '%', 'up'),
('demo-company-id', 'Adopción del copilot', 'adoption', 62.0, 80.0, 45.0, '%', 'up'),
('demo-company-id', 'Satisfacción de usuarios', 'satisfaction', 4.2, 4.5, 3.8, 'pts', 'up'),
('demo-company-id', 'Nivel de autonomía alcanzado', 'autonomy', 45.0, 70.0, 30.0, '%', 'up'),
('demo-company-id', 'Acciones auto-ejecutadas', 'autonomy', 156, 250, 98, 'count', 'up'),
('demo-company-id', 'Workflows automatizados', 'efficiency', 12, 20, 7, 'count', 'up');

INSERT INTO public.erp_hr_digital_twin_snapshots (company_id, snapshot_name, snapshot_type, status, org_structure, workforce_metrics, payroll_snapshot, compliance_status, wellness_metrics, divergence_score) VALUES
('demo-company-id', 'Snapshot Principal Q1-2026', 'full', 'active',
  '{"departments": 8, "teams": 24, "positions": 156, "hierarchy_levels": 5}'::jsonb,
  '{"headcount": 156, "avg_tenure_years": 4.2, "turnover_rate": 8.5, "open_positions": 12, "avg_age": 35.7}'::jsonb,
  '{"total_monthly_cost": 892000, "avg_salary": 42500, "benefits_cost": 178400, "overtime_cost": 23100}'::jsonb,
  '{"gdpr_score": 92, "prl_score": 88, "equality_score": 85, "training_compliance": 91}'::jsonb,
  '{"enps_score": 42, "burnout_risk_high": 8, "wellness_adoption": 67, "satisfaction_avg": 4.1}'::jsonb,
  3.2);
