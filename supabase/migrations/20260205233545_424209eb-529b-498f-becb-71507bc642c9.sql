-- =====================================================
-- FASE 7: TOTAL REWARDS - TABLAS ADICIONALES
-- Solo crear tablas que no existen
-- =====================================================

-- Tabla: Salary Bands / Pay Grades
CREATE TABLE IF NOT EXISTS public.erp_hr_salary_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  band_code TEXT NOT NULL,
  band_name TEXT NOT NULL,
  job_family TEXT,
  level TEXT,
  min_salary NUMERIC(15,2) NOT NULL,
  mid_salary NUMERIC(15,2) NOT NULL,
  max_salary NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  country_code TEXT DEFAULT 'ES',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  market_percentile INTEGER DEFAULT 50,
  benchmark_source TEXT,
  last_benchmarked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Employee Compensation Records
CREATE TABLE IF NOT EXISTS public.erp_hr_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  salary_band_id UUID,
  base_salary NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  pay_frequency TEXT DEFAULT 'monthly',
  effective_from DATE NOT NULL,
  effective_to DATE,
  bonus_target_percent NUMERIC(5,2) DEFAULT 0,
  bonus_actual NUMERIC(15,2),
  commission_plan TEXT,
  commission_rate NUMERIC(5,2),
  equity_type TEXT,
  equity_grant_value NUMERIC(15,2),
  equity_vesting_schedule TEXT,
  equity_vested_value NUMERIC(15,2),
  compa_ratio NUMERIC(5,2),
  range_penetration NUMERIC(5,2),
  change_type TEXT,
  change_reason TEXT,
  change_percent NUMERIC(5,2),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Benefits Plans
CREATE TABLE IF NOT EXISTS public.erp_hr_benefits_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  provider_name TEXT,
  provider_contact TEXT,
  coverage_type TEXT,
  employer_contribution NUMERIC(15,2),
  employer_contribution_percent NUMERIC(5,2),
  employee_contribution NUMERIC(15,2),
  annual_cost NUMERIC(15,2),
  eligibility_criteria JSONB DEFAULT '{}',
  waiting_period_days INTEGER DEFAULT 0,
  enrollment_period TEXT,
  plan_document_url TEXT,
  summary_document_url TEXT,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_taxable BOOLEAN DEFAULT false,
  tax_treatment TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Employee Benefits Enrollments
CREATE TABLE IF NOT EXISTS public.erp_hr_benefits_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  plan_id UUID,
  enrollment_status TEXT DEFAULT 'active',
  coverage_level TEXT,
  enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_date DATE NOT NULL,
  termination_date DATE,
  employee_contribution NUMERIC(15,2),
  employer_contribution NUMERIC(15,2),
  contribution_frequency TEXT DEFAULT 'monthly',
  dependents JSONB DEFAULT '[]',
  beneficiaries JSONB DEFAULT '[]',
  election_amount NUMERIC(15,2),
  election_reason TEXT,
  waiver_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Recognition & Awards
CREATE TABLE IF NOT EXISTS public.erp_hr_recognition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL,
  nominator_id UUID,
  approver_id UUID,
  recognition_type TEXT NOT NULL,
  category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  award_date DATE NOT NULL DEFAULT CURRENT_DATE,
  points_awarded INTEGER DEFAULT 0,
  monetary_value NUMERIC(15,2),
  currency TEXT DEFAULT 'EUR',
  gift_type TEXT,
  gift_details TEXT,
  is_public BOOLEAN DEFAULT true,
  shared_to_feed BOOLEAN DEFAULT false,
  celebration_type TEXT,
  status TEXT DEFAULT 'approved',
  approved_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Recognition Programs Configuration
CREATE TABLE IF NOT EXISTS public.erp_hr_recognition_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  program_type TEXT NOT NULL,
  annual_budget NUMERIC(15,2),
  budget_per_manager NUMERIC(15,2),
  budget_per_employee NUMERIC(15,2),
  currency TEXT DEFAULT 'EUR',
  points_per_currency NUMERIC(10,4),
  min_award_value NUMERIC(15,2),
  max_award_value NUMERIC(15,2),
  requires_approval BOOLEAN DEFAULT false,
  approval_threshold NUMERIC(15,2),
  recognition_categories JSONB DEFAULT '[]',
  company_values JSONB DEFAULT '[]',
  eligible_nominators TEXT DEFAULT 'all',
  eligible_recipients TEXT DEFAULT 'all',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Compensation Analytics & Benchmarking
CREATE TABLE IF NOT EXISTS public.erp_hr_compensation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  analysis_type TEXT NOT NULL,
  total_headcount INTEGER,
  total_payroll NUMERIC(15,2),
  avg_salary NUMERIC(15,2),
  median_salary NUMERIC(15,2),
  salary_spread NUMERIC(5,2),
  gender_pay_gap NUMERIC(5,2),
  adjusted_pay_gap NUMERIC(5,2),
  equity_score NUMERIC(5,2),
  market_position_index NUMERIC(5,2),
  below_market_count INTEGER,
  above_market_count INTEGER,
  at_market_count INTEGER,
  high_performers_below_market INTEGER,
  flight_risk_compensation INTEGER,
  compression_issues INTEGER,
  ai_insights JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  forecast_next_year JSONB DEFAULT '{}',
  currency TEXT DEFAULT 'EUR',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices (solo si no existen)
CREATE INDEX IF NOT EXISTS idx_hr_salary_bands_company ON public.erp_hr_salary_bands(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_salary_bands_active ON public.erp_hr_salary_bands(is_active, effective_from);
CREATE INDEX IF NOT EXISTS idx_hr_compensation_employee ON public.erp_hr_compensation(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_compensation_company ON public.erp_hr_compensation(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_benefits_plans_company ON public.erp_hr_benefits_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_benefits_plans_type ON public.erp_hr_benefits_plans(plan_type, is_active);
CREATE INDEX IF NOT EXISTS idx_hr_benefits_enrollments_employee ON public.erp_hr_benefits_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_recognition_recipient ON public.erp_hr_recognition(recipient_id);
CREATE INDEX IF NOT EXISTS idx_hr_recognition_company_date ON public.erp_hr_recognition(company_id, award_date);
CREATE INDEX IF NOT EXISTS idx_hr_compensation_analytics_company ON public.erp_hr_compensation_analytics(company_id, analysis_date);

-- RLS Policies
ALTER TABLE public.erp_hr_salary_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_benefits_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_benefits_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_recognition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_recognition_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_compensation_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DO $$ 
BEGIN
  -- Salary Bands
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_salary_bands' AND policyname = 'Users can view salary bands') THEN
    CREATE POLICY "Users can view salary bands" ON public.erp_hr_salary_bands FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_salary_bands' AND policyname = 'Users can manage salary bands') THEN
    CREATE POLICY "Users can manage salary bands" ON public.erp_hr_salary_bands FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  
  -- Compensation
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_compensation' AND policyname = 'Users can view compensation') THEN
    CREATE POLICY "Users can view compensation" ON public.erp_hr_compensation FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_compensation' AND policyname = 'Users can manage compensation') THEN
    CREATE POLICY "Users can manage compensation" ON public.erp_hr_compensation FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  
  -- Benefits Plans
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_benefits_plans' AND policyname = 'Users can view benefits plans') THEN
    CREATE POLICY "Users can view benefits plans" ON public.erp_hr_benefits_plans FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_benefits_plans' AND policyname = 'Users can manage benefits plans') THEN
    CREATE POLICY "Users can manage benefits plans" ON public.erp_hr_benefits_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  
  -- Benefits Enrollments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_benefits_enrollments' AND policyname = 'Users can view enrollments') THEN
    CREATE POLICY "Users can view enrollments" ON public.erp_hr_benefits_enrollments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_benefits_enrollments' AND policyname = 'Users can manage enrollments') THEN
    CREATE POLICY "Users can manage enrollments" ON public.erp_hr_benefits_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  
  -- Recognition
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_recognition' AND policyname = 'Users can view recognition') THEN
    CREATE POLICY "Users can view recognition" ON public.erp_hr_recognition FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_recognition' AND policyname = 'Users can manage recognition') THEN
    CREATE POLICY "Users can manage recognition" ON public.erp_hr_recognition FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  
  -- Recognition Programs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_recognition_programs' AND policyname = 'Users can view recognition programs') THEN
    CREATE POLICY "Users can view recognition programs" ON public.erp_hr_recognition_programs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_recognition_programs' AND policyname = 'Users can manage recognition programs') THEN
    CREATE POLICY "Users can manage recognition programs" ON public.erp_hr_recognition_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  
  -- Compensation Analytics
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_compensation_analytics' AND policyname = 'Users can view compensation analytics') THEN
    CREATE POLICY "Users can view compensation analytics" ON public.erp_hr_compensation_analytics FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_hr_compensation_analytics' AND policyname = 'Users can manage compensation analytics') THEN
    CREATE POLICY "Users can manage compensation analytics" ON public.erp_hr_compensation_analytics FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Triggers para updated_at (solo si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_erp_hr_salary_bands_updated_at') THEN
    CREATE TRIGGER update_erp_hr_salary_bands_updated_at BEFORE UPDATE ON public.erp_hr_salary_bands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_erp_hr_compensation_updated_at') THEN
    CREATE TRIGGER update_erp_hr_compensation_updated_at BEFORE UPDATE ON public.erp_hr_compensation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_erp_hr_benefits_plans_updated_at') THEN
    CREATE TRIGGER update_erp_hr_benefits_plans_updated_at BEFORE UPDATE ON public.erp_hr_benefits_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_erp_hr_benefits_enrollments_updated_at') THEN
    CREATE TRIGGER update_erp_hr_benefits_enrollments_updated_at BEFORE UPDATE ON public.erp_hr_benefits_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_erp_hr_recognition_updated_at') THEN
    CREATE TRIGGER update_erp_hr_recognition_updated_at BEFORE UPDATE ON public.erp_hr_recognition FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_erp_hr_recognition_programs_updated_at') THEN
    CREATE TRIGGER update_erp_hr_recognition_programs_updated_at BEFORE UPDATE ON public.erp_hr_recognition_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;