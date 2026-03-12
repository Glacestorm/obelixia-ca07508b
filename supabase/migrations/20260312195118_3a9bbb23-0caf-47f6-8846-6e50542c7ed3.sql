
-- FASE G1: Country Registry + Policy Engine + Employee Extensions

-- 1. Country Registry
CREATE TABLE IF NOT EXISTS public.hr_country_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  currency_code TEXT NOT NULL DEFAULT 'EUR',
  language_code TEXT NOT NULL DEFAULT 'es',
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  nif_format TEXT,
  nif_label TEXT DEFAULT 'NIF',
  fiscal_year_start INTEGER DEFAULT 1,
  social_security_system TEXT,
  labor_law_framework TEXT,
  min_wage_annual NUMERIC(12,2),
  max_working_hours_week NUMERIC(4,1) DEFAULT 40,
  min_vacation_days INTEGER DEFAULT 22,
  probation_max_days INTEGER,
  notice_period_default_days INTEGER,
  severance_formula TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, country_code)
);

ALTER TABLE public.hr_country_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage country registry"
ON public.hr_country_registry FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 2. Country Policies
CREATE TABLE IF NOT EXISTS public.hr_country_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  country_code TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  policy_key TEXT NOT NULL,
  policy_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  scope_level TEXT NOT NULL DEFAULT 'country',
  scope_entity_id UUID,
  scope_center_id UUID,
  priority INTEGER NOT NULL DEFAULT 0,
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  legal_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_country_policies_unique
ON public.hr_country_policies (company_id, country_code, policy_type, policy_key, scope_level, COALESCE(scope_entity_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(scope_center_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.hr_country_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage country policies"
ON public.hr_country_policies FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 3. Employee Extensions
CREATE TABLE IF NOT EXISTS public.hr_employee_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  country_code TEXT NOT NULL,
  extension_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  tax_jurisdiction TEXT,
  social_security_number TEXT,
  local_id_number TEXT,
  local_id_type TEXT,
  tax_residence_country TEXT,
  immigration_status TEXT,
  work_permit_expiry DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, country_code)
);

ALTER TABLE public.hr_employee_extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage employee extensions"
ON public.hr_employee_extensions FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 4. Add country_code to employees
ALTER TABLE public.erp_hr_employees ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'ES';
ALTER TABLE public.erp_hr_employees ADD COLUMN IF NOT EXISTS tax_jurisdiction TEXT;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_country_registry;
