
-- P7: CNAE-Specific HR Intelligence
-- Sector-specific regulations, benchmarks, risk profiles, and AI insights

-- 1. CNAE HR Sector Profiles - Regulations and benchmarks per CNAE
CREATE TABLE public.erp_hr_cnae_sector_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  cnae_code TEXT NOT NULL,
  cnae_description TEXT,
  sector_key TEXT,
  applicable_regulations JSONB DEFAULT '[]'::jsonb,
  collective_agreements JSONB DEFAULT '[]'::jsonb,
  sector_benchmarks JSONB DEFAULT '{}'::jsonb,
  risk_profile JSONB DEFAULT '{}'::jsonb,
  specific_requirements JSONB DEFAULT '[]'::jsonb,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CNAE HR Compliance Rules - Sector-specific compliance rules
CREATE TABLE public.erp_hr_cnae_compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  cnae_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'regulation',
  description TEXT,
  legal_basis TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  is_mandatory BOOLEAN DEFAULT true,
  applicable_from DATE,
  applicable_until DATE,
  validation_criteria JSONB DEFAULT '{}'::jsonb,
  penalty_info JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CNAE HR Benchmarks - Sector benchmarks for HR KPIs
CREATE TABLE public.erp_hr_cnae_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  cnae_code TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL DEFAULT 'general',
  sector_average NUMERIC,
  sector_median NUMERIC,
  sector_p25 NUMERIC,
  sector_p75 NUMERIC,
  company_value NUMERIC,
  deviation_percentage NUMERIC,
  benchmark_source TEXT,
  period TEXT,
  is_favorable BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CNAE HR Risk Assessments - Sector-specific risk analysis
CREATE TABLE public.erp_hr_cnae_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  cnae_code TEXT NOT NULL,
  assessment_type TEXT NOT NULL DEFAULT 'general',
  risk_category TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  risk_score NUMERIC DEFAULT 50,
  description TEXT,
  mitigation_actions JSONB DEFAULT '[]'::jsonb,
  impact_areas JSONB DEFAULT '[]'::jsonb,
  regulatory_impact TEXT,
  assessed_by TEXT,
  assessed_at TIMESTAMPTZ DEFAULT now(),
  next_review_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CNAE HR Intelligence Log - AI analysis history
CREATE TABLE public.erp_hr_cnae_intelligence_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  cnae_code TEXT,
  analysis_type TEXT NOT NULL,
  input_context JSONB DEFAULT '{}'::jsonb,
  ai_result JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC,
  recommendations_count INTEGER DEFAULT 0,
  performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime for risk assessments
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_cnae_risk_assessments;

-- RLS
ALTER TABLE public.erp_hr_cnae_sector_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_cnae_compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_cnae_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_cnae_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_cnae_intelligence_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage cnae_sector_profiles" ON public.erp_hr_cnae_sector_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage cnae_compliance_rules" ON public.erp_hr_cnae_compliance_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage cnae_benchmarks" ON public.erp_hr_cnae_benchmarks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage cnae_risk_assessments" ON public.erp_hr_cnae_risk_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage cnae_intelligence_log" ON public.erp_hr_cnae_intelligence_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_cnae_profiles_company ON public.erp_hr_cnae_sector_profiles(company_id);
CREATE INDEX idx_cnae_profiles_cnae ON public.erp_hr_cnae_sector_profiles(cnae_code);
CREATE INDEX idx_cnae_rules_company ON public.erp_hr_cnae_compliance_rules(company_id, cnae_code);
CREATE INDEX idx_cnae_benchmarks_company ON public.erp_hr_cnae_benchmarks(company_id, cnae_code);
CREATE INDEX idx_cnae_risks_company ON public.erp_hr_cnae_risk_assessments(company_id, cnae_code);
CREATE INDEX idx_cnae_intel_company ON public.erp_hr_cnae_intelligence_log(company_id);
