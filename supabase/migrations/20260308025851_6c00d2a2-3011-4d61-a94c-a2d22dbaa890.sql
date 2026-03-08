
-- FASE 3: Compensation Suite Enterprise (skip existing tables)

-- Merit Cycles
CREATE TABLE IF NOT EXISTS public.erp_hr_merit_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  budget_percent NUMERIC(5,2) DEFAULT 3.0,
  budget_amount NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  effective_date DATE,
  approval_workflow_id UUID,
  guidelines JSONB DEFAULT '{}',
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_merit_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merit_cycles_company_access" ON public.erp_hr_merit_cycles;
CREATE POLICY "merit_cycles_company_access" ON public.erp_hr_merit_cycles
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Merit Proposals
CREATE TABLE IF NOT EXISTS public.erp_hr_merit_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.erp_hr_merit_cycles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  employee_name TEXT,
  department TEXT,
  position_title TEXT,
  current_salary NUMERIC(12,2) NOT NULL,
  proposed_salary NUMERIC(12,2) NOT NULL,
  salary_increase NUMERIC(12,2) GENERATED ALWAYS AS (proposed_salary - current_salary) STORED,
  increase_percent NUMERIC(5,2),
  current_band TEXT,
  current_compa_ratio NUMERIC(5,2),
  proposed_compa_ratio NUMERIC(5,2),
  performance_rating TEXT,
  merit_type TEXT DEFAULT 'merit',
  manager_justification TEXT,
  hr_comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  effective_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_merit_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merit_proposals_company_access" ON public.erp_hr_merit_proposals;
CREATE POLICY "merit_proposals_company_access" ON public.erp_hr_merit_proposals
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Bonus Cycles
CREATE TABLE IF NOT EXISTS public.erp_hr_bonus_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  bonus_type TEXT NOT NULL DEFAULT 'annual',
  status TEXT NOT NULL DEFAULT 'draft',
  target_pool NUMERIC(14,2),
  actual_pool NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  distribution_method TEXT DEFAULT 'performance',
  performance_weight NUMERIC(3,2) DEFAULT 0.60,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_date DATE,
  guidelines JSONB DEFAULT '{}',
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_bonus_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bonus_cycles_company_access" ON public.erp_hr_bonus_cycles;
CREATE POLICY "bonus_cycles_company_access" ON public.erp_hr_bonus_cycles
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Salary Letters
CREATE TABLE IF NOT EXISTS public.erp_hr_salary_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  employee_name TEXT,
  letter_type TEXT NOT NULL DEFAULT 'salary_review',
  effective_date DATE NOT NULL,
  previous_salary NUMERIC(12,2),
  new_salary NUMERIC(12,2) NOT NULL,
  change_percent NUMERIC(5,2),
  components JSONB DEFAULT '[]',
  template_id TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  merit_proposal_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_salary_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "salary_letters_company_access" ON public.erp_hr_salary_letters;
CREATE POLICY "salary_letters_company_access" ON public.erp_hr_salary_letters
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Total Rewards Config
CREATE TABLE IF NOT EXISTS public.erp_hr_total_rewards_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  component_category TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  is_monetary BOOLEAN DEFAULT true,
  calculation_type TEXT DEFAULT 'fixed',
  calculation_formula TEXT,
  icon TEXT,
  color TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_total_rewards_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "total_rewards_config_company_access" ON public.erp_hr_total_rewards_config;
CREATE POLICY "total_rewards_config_company_access" ON public.erp_hr_total_rewards_config
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Pay Equity Snapshots
CREATE TABLE IF NOT EXISTS public.erp_hr_pay_equity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scope TEXT DEFAULT 'company',
  scope_id TEXT,
  gender_gap_percent NUMERIC(5,2),
  gender_gap_adjusted NUMERIC(5,2),
  median_male_salary NUMERIC(12,2),
  median_female_salary NUMERIC(12,2),
  mean_male_salary NUMERIC(12,2),
  mean_female_salary NUMERIC(12,2),
  total_employees_analyzed INTEGER,
  anomalies_detected INTEGER DEFAULT 0,
  anomalies_detail JSONB DEFAULT '[]',
  salary_compression_score NUMERIC(5,2),
  compa_ratio_distribution JSONB DEFAULT '{}',
  band_distribution JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  ai_narrative TEXT,
  created_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_pay_equity_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pay_equity_snapshots_company_access" ON public.erp_hr_pay_equity_snapshots;
CREATE POLICY "pay_equity_snapshots_company_access" ON public.erp_hr_pay_equity_snapshots
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_merit_cycles_company ON public.erp_hr_merit_cycles(company_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_merit_proposals_cycle ON public.erp_hr_merit_proposals(cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_bonus_cycles_company ON public.erp_hr_bonus_cycles(company_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_salary_letters_company ON public.erp_hr_salary_letters(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_pay_equity_company ON public.erp_hr_pay_equity_snapshots(company_id, analysis_date);
