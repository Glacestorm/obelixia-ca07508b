-- =====================================================
-- FASE 1: PRESTACIONES SOCIALES (Social Benefits)
-- =====================================================

-- Tabla principal de beneficios disponibles
CREATE TABLE IF NOT EXISTS public.erp_hr_social_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  benefit_code TEXT NOT NULL,
  benefit_name TEXT NOT NULL,
  benefit_type TEXT NOT NULL CHECK (benefit_type IN (
    'health_insurance', 'life_insurance', 'dental_insurance',
    'childcare', 'meal_vouchers', 'transport', 'gym',
    'pension', 'education', 'remote_work_allowance',
    'wellness', 'stock_options', 'sabbatical', 'pet_insurance',
    'coworking', 'telemedicine', 'mental_health', 'other'
  )),
  provider_name TEXT,
  provider_contact TEXT,
  monthly_cost_company NUMERIC(12, 2) DEFAULT 0,
  monthly_cost_employee NUMERIC(12, 2) DEFAULT 0,
  is_taxable BOOLEAN DEFAULT true,
  tax_percentage NUMERIC(5, 2) DEFAULT 0,
  eligibility_criteria JSONB DEFAULT '{}',
  max_beneficiaries INTEGER DEFAULT 1,
  annual_limit NUMERIC(12, 2),
  is_flex_benefit BOOLEAN DEFAULT false,
  flex_points_cost INTEGER,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  terms_document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, benefit_code)
);

-- Tabla de inscripciones de empleados en beneficios
CREATE TABLE IF NOT EXISTS public.erp_hr_employee_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  benefit_id UUID NOT NULL REFERENCES public.erp_hr_social_benefits(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'cancelled', 'suspended', 'expired')),
  employee_contribution NUMERIC(12, 2) DEFAULT 0,
  company_contribution NUMERIC(12, 2) DEFAULT 0,
  beneficiaries JSONB DEFAULT '[]',
  coverage_level TEXT DEFAULT 'individual',
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, benefit_id, enrollment_date)
);

-- Tabla de presupuesto flex benefits por empleado
CREATE TABLE IF NOT EXISTS public.erp_hr_flex_benefit_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  used_points INTEGER NOT NULL DEFAULT 0,
  monetary_value NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, fiscal_year)
);

-- Indices para rendimiento
CREATE INDEX IF NOT EXISTS idx_hr_social_benefits_company ON public.erp_hr_social_benefits(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_social_benefits_type ON public.erp_hr_social_benefits(benefit_type);
CREATE INDEX IF NOT EXISTS idx_hr_employee_benefits_employee ON public.erp_hr_employee_benefits(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_employee_benefits_benefit ON public.erp_hr_employee_benefits(benefit_id);
CREATE INDEX IF NOT EXISTS idx_hr_employee_benefits_status ON public.erp_hr_employee_benefits(status);

-- Enable RLS
ALTER TABLE public.erp_hr_social_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_employee_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_flex_benefit_budget ENABLE ROW LEVEL SECURITY;

-- RLS Policies para erp_hr_social_benefits
CREATE POLICY "erp_hr_social_benefits_select" ON public.erp_hr_social_benefits
  FOR SELECT USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_social_benefits_insert" ON public.erp_hr_social_benefits
  FOR INSERT WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_social_benefits_update" ON public.erp_hr_social_benefits
  FOR UPDATE USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_social_benefits_delete" ON public.erp_hr_social_benefits
  FOR DELETE USING (public.user_has_erp_company_access(company_id));

-- RLS Policies para erp_hr_employee_benefits
CREATE POLICY "erp_hr_employee_benefits_select" ON public.erp_hr_employee_benefits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_employees e
      WHERE e.id = employee_id AND public.user_has_erp_company_access(e.company_id)
    )
  );

CREATE POLICY "erp_hr_employee_benefits_insert" ON public.erp_hr_employee_benefits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.erp_hr_employees e
      WHERE e.id = employee_id AND public.user_has_erp_company_access(e.company_id)
    )
  );

CREATE POLICY "erp_hr_employee_benefits_update" ON public.erp_hr_employee_benefits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_employees e
      WHERE e.id = employee_id AND public.user_has_erp_company_access(e.company_id)
    )
  );

CREATE POLICY "erp_hr_employee_benefits_delete" ON public.erp_hr_employee_benefits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_employees e
      WHERE e.id = employee_id AND public.user_has_erp_company_access(e.company_id)
    )
  );

-- RLS Policies para erp_hr_flex_benefit_budget
CREATE POLICY "erp_hr_flex_benefit_budget_select" ON public.erp_hr_flex_benefit_budget
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_employees e
      WHERE e.id = employee_id AND public.user_has_erp_company_access(e.company_id)
    )
  );

CREATE POLICY "erp_hr_flex_benefit_budget_insert" ON public.erp_hr_flex_benefit_budget
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.erp_hr_employees e
      WHERE e.id = employee_id AND public.user_has_erp_company_access(e.company_id)
    )
  );

CREATE POLICY "erp_hr_flex_benefit_budget_update" ON public.erp_hr_flex_benefit_budget
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_employees e
      WHERE e.id = employee_id AND public.user_has_erp_company_access(e.company_id)
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_hr_benefits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_erp_hr_social_benefits_updated
  BEFORE UPDATE ON public.erp_hr_social_benefits
  FOR EACH ROW EXECUTE FUNCTION update_hr_benefits_timestamp();

CREATE TRIGGER trigger_erp_hr_employee_benefits_updated
  BEFORE UPDATE ON public.erp_hr_employee_benefits
  FOR EACH ROW EXECUTE FUNCTION update_hr_benefits_timestamp();

CREATE TRIGGER trigger_erp_hr_flex_benefit_budget_updated
  BEFORE UPDATE ON public.erp_hr_flex_benefit_budget
  FOR EACH ROW EXECUTE FUNCTION update_hr_benefits_timestamp();