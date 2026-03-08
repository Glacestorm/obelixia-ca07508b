
-- P2: AI Governance Layer - Model Registry, Decision Audit, Bias Detection, Explainability

-- 1. AI Model Registry
CREATE TABLE public.erp_hr_ai_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL DEFAULT '1.0',
  model_type TEXT NOT NULL DEFAULT 'classification',
  provider TEXT NOT NULL DEFAULT 'lovable_ai',
  purpose TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'limited' CHECK (risk_level IN ('minimal', 'limited', 'high', 'unacceptable')),
  eu_ai_act_category TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'testing', 'active', 'deprecated', 'suspended')),
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  bias_metrics JSONB DEFAULT '{}',
  data_sources TEXT[] DEFAULT '{}',
  responsible_team TEXT,
  last_audit_at TIMESTAMPTZ,
  next_audit_due TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. AI Decision Log (immutable audit trail)
CREATE TABLE public.erp_hr_ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  model_id UUID REFERENCES public.erp_hr_ai_model_registry(id),
  decision_type TEXT NOT NULL,
  input_data JSONB NOT NULL DEFAULT '{}',
  output_data JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC(5,4),
  risk_level TEXT DEFAULT 'low',
  explanation TEXT,
  shap_values JSONB,
  lime_weights JSONB,
  human_override BOOLEAN DEFAULT false,
  override_reason TEXT,
  override_by TEXT,
  affected_employees TEXT[] DEFAULT '{}',
  affected_entity TEXT,
  outcome_status TEXT DEFAULT 'pending' CHECK (outcome_status IN ('pending', 'accepted', 'rejected', 'overridden', 'escalated')),
  escalated_to TEXT,
  feedback_score INTEGER,
  feedback_comment TEXT,
  processing_time_ms INTEGER,
  token_usage JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. AI Bias Audits
CREATE TABLE public.erp_hr_ai_bias_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  model_id UUID REFERENCES public.erp_hr_ai_model_registry(id),
  audit_type TEXT NOT NULL DEFAULT 'scheduled' CHECK (audit_type IN ('scheduled', 'triggered', 'manual', 'regulatory')),
  protected_attributes TEXT[] NOT NULL DEFAULT '{}',
  fairness_metrics JSONB NOT NULL DEFAULT '{}',
  disparate_impact_ratios JSONB DEFAULT '{}',
  statistical_parity JSONB DEFAULT '{}',
  equal_opportunity_diff JSONB DEFAULT '{}',
  demographic_parity JSONB DEFAULT '{}',
  overall_fairness_score NUMERIC(5,2),
  bias_detected BOOLEAN DEFAULT false,
  bias_details JSONB DEFAULT '{}',
  remediation_actions JSONB DEFAULT '{}',
  remediation_status TEXT DEFAULT 'pending',
  audited_by TEXT,
  approved_by TEXT,
  regulatory_framework TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 4. AI Governance Policies
CREATE TABLE public.erp_hr_ai_governance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('usage', 'data', 'fairness', 'transparency', 'accountability', 'risk_management')),
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]',
  applies_to_models TEXT[] DEFAULT '{}',
  enforcement_level TEXT DEFAULT 'mandatory' CHECK (enforcement_level IN ('advisory', 'recommended', 'mandatory', 'regulatory')),
  regulatory_reference TEXT,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  review_frequency_days INTEGER DEFAULT 90,
  next_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. AI Explainability Reports
CREATE TABLE public.erp_hr_ai_explainability_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  decision_id UUID REFERENCES public.erp_hr_ai_decisions(id),
  model_id UUID REFERENCES public.erp_hr_ai_model_registry(id),
  report_type TEXT NOT NULL DEFAULT 'individual' CHECK (report_type IN ('individual', 'aggregate', 'comparative', 'regulatory')),
  explanation_method TEXT NOT NULL DEFAULT 'shap',
  feature_importance JSONB DEFAULT '[]',
  counterfactuals JSONB DEFAULT '[]',
  natural_language_explanation TEXT,
  confidence_intervals JSONB DEFAULT '{}',
  visualization_data JSONB DEFAULT '{}',
  audience TEXT DEFAULT 'technical' CHECK (audience IN ('technical', 'business', 'employee', 'regulator')),
  generated_by TEXT DEFAULT 'ai',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Realtime for decisions
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_ai_decisions;

-- RLS
ALTER TABLE public.erp_hr_ai_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_ai_bias_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_ai_governance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_ai_explainability_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read ai_model_registry" ON public.erp_hr_ai_model_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert ai_model_registry" ON public.erp_hr_ai_model_registry FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update ai_model_registry" ON public.erp_hr_ai_model_registry FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read ai_decisions" ON public.erp_hr_ai_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert ai_decisions" ON public.erp_hr_ai_decisions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read ai_bias_audits" ON public.erp_hr_ai_bias_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert ai_bias_audits" ON public.erp_hr_ai_bias_audits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update ai_bias_audits" ON public.erp_hr_ai_bias_audits FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read ai_governance_policies" ON public.erp_hr_ai_governance_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert ai_governance_policies" ON public.erp_hr_ai_governance_policies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update ai_governance_policies" ON public.erp_hr_ai_governance_policies FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read ai_explainability_reports" ON public.erp_hr_ai_explainability_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert ai_explainability_reports" ON public.erp_hr_ai_explainability_reports FOR INSERT TO authenticated WITH CHECK (true);

-- Seed minimal demo data
INSERT INTO public.erp_hr_ai_model_registry (company_id, model_name, model_version, model_type, provider, purpose, risk_level, eu_ai_act_category, status, performance_metrics, responsible_team) VALUES
('demo-company-id', 'HR Turnover Predictor', '2.1', 'prediction', 'lovable_ai', 'Predecir riesgo de rotación de empleados', 'high', 'employment_decisions', 'active', '{"accuracy": 0.87, "precision": 0.82, "recall": 0.91, "f1": 0.86, "auc_roc": 0.93}', 'People Analytics'),
('demo-company-id', 'Salary Equity Analyzer', '1.3', 'analysis', 'lovable_ai', 'Detectar brechas salariales por género/edad', 'high', 'employment_decisions', 'active', '{"accuracy": 0.94, "bias_score": 0.12}', 'Compensation Team'),
('demo-company-id', 'CV Screening Assistant', '3.0', 'classification', 'lovable_ai', 'Pre-filtrado de CVs en reclutamiento', 'high', 'employment_decisions', 'testing', '{"accuracy": 0.79, "precision": 0.75}', 'Talent Acquisition');

INSERT INTO public.erp_hr_ai_governance_policies (company_id, policy_name, policy_type, description, enforcement_level, regulatory_reference, rules) VALUES
('demo-company-id', 'Human-in-the-Loop obligatorio', 'accountability', 'Toda decisión IA que afecte a un empleado requiere validación humana antes de ejecutarse', 'mandatory', 'EU AI Act Art. 14', '[{"rule": "No autonomous execution for employee-affecting decisions", "threshold": "all"}]'),
('demo-company-id', 'Auditoría de sesgo trimestral', 'fairness', 'Todos los modelos de alto riesgo deben ser auditados para sesgo cada 90 días', 'regulatory', 'EU AI Act Art. 9', '[{"rule": "Quarterly bias audit", "applies_to": "high_risk_models"}]');
