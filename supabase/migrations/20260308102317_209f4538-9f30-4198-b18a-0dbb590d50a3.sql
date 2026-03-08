
-- P4: Fairness / Justice Engine

-- 1. Pay Equity Analysis
CREATE TABLE public.erp_hr_pay_equity_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  analysis_name TEXT NOT NULL,
  analysis_type TEXT NOT NULL DEFAULT 'gender_gap' CHECK (analysis_type IN ('gender_gap', 'ethnicity_gap', 'age_gap', 'disability_gap', 'intersectional', 'comprehensive')),
  scope JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  overall_equity_score NUMERIC(5,2) DEFAULT 0,
  gap_percentage NUMERIC(5,2) DEFAULT 0,
  affected_employees INTEGER DEFAULT 0,
  remediation_cost NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'approved', 'archived')),
  performed_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  regulatory_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_pay_equity_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_equity_all" ON public.erp_hr_pay_equity_analyses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Fairness Metrics
CREATE TABLE public.erp_hr_fairness_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'promotion_rate' CHECK (metric_type IN ('promotion_rate', 'hiring_rate', 'termination_rate', 'training_access', 'salary_ratio', 'bonus_distribution', 'performance_rating')),
  protected_attribute TEXT NOT NULL DEFAULT 'gender' CHECK (protected_attribute IN ('gender', 'age', 'ethnicity', 'disability', 'tenure', 'education')),
  group_a_label TEXT NOT NULL DEFAULT 'Group A',
  group_a_value NUMERIC(8,4) DEFAULT 0,
  group_b_label TEXT NOT NULL DEFAULT 'Group B',
  group_b_value NUMERIC(8,4) DEFAULT 0,
  disparate_impact_ratio NUMERIC(6,4) DEFAULT 0,
  four_fifths_compliant BOOLEAN DEFAULT true,
  period_start DATE,
  period_end DATE,
  department TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_fairness_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fairness_metrics_all" ON public.erp_hr_fairness_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Justice Cases (complaints, grievances)
CREATE TABLE public.erp_hr_justice_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  case_number TEXT NOT NULL,
  case_type TEXT NOT NULL DEFAULT 'grievance' CHECK (case_type IN ('grievance', 'discrimination_complaint', 'harassment', 'retaliation', 'accommodation_request', 'pay_dispute', 'promotion_dispute')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'mediation', 'resolved', 'escalated', 'closed', 'appealed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  complainant_id TEXT,
  respondent_id TEXT,
  department TEXT,
  assigned_to UUID,
  resolution TEXT,
  resolution_date TIMESTAMPTZ,
  days_to_resolve INTEGER,
  is_anonymous BOOLEAN DEFAULT false,
  regulatory_reference TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_justice_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "justice_cases_all" ON public.erp_hr_justice_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Equity Action Plans
CREATE TABLE public.erp_hr_equity_action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'corrective' CHECK (plan_type IN ('corrective', 'preventive', 'systemic', 'individual')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  target_metric TEXT,
  baseline_value NUMERIC(8,4) DEFAULT 0,
  target_value NUMERIC(8,4) DEFAULT 0,
  current_value NUMERIC(8,4) DEFAULT 0,
  actions JSONB DEFAULT '[]',
  responsible_id UUID,
  start_date DATE,
  end_date DATE,
  budget NUMERIC(12,2) DEFAULT 0,
  progress_percentage NUMERIC(5,2) DEFAULT 0,
  impact_assessment JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_equity_action_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equity_action_plans_all" ON public.erp_hr_equity_action_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Fairness Audit Trail
CREATE TABLE public.erp_hr_fairness_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'analysis' CHECK (event_type IN ('analysis', 'decision', 'override', 'review', 'escalation', 'remediation', 'policy_change')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  actor_id UUID,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  fairness_impact TEXT CHECK (fairness_impact IN ('positive', 'negative', 'neutral', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_fairness_audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fairness_audit_all" ON public.erp_hr_fairness_audit_trail FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for justice cases
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_justice_cases;
