
-- Add missing columns to hr_mobility_assignments
ALTER TABLE public.hr_mobility_assignments
  ADD COLUMN IF NOT EXISTS payroll_country_code TEXT NOT NULL DEFAULT 'ES',
  ADD COLUMN IF NOT EXISTS tax_residence_country TEXT NOT NULL DEFAULT 'ES',
  ADD COLUMN IF NOT EXISTS ss_regime_country TEXT NOT NULL DEFAULT 'ES',
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS compensation_approach TEXT NOT NULL DEFAULT 'tax_equalization',
  ADD COLUMN IF NOT EXISTS split_payroll BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shadow_payroll BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hypothetical_tax NUMERIC,
  ADD COLUMN IF NOT EXISTS allowance_package JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_monthly_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE public.hr_mobility_assignments RENAME COLUMN home_country TO home_country_code;
ALTER TABLE public.hr_mobility_assignments RENAME COLUMN host_country TO host_country_code;
ALTER TABLE public.hr_mobility_assignments RENAME COLUMN home_entity_id TO home_legal_entity_id;
ALTER TABLE public.hr_mobility_assignments RENAME COLUMN host_entity_id TO host_legal_entity_id;
ALTER TABLE public.hr_mobility_assignments RENAME COLUMN expected_end_date TO end_date;

CREATE TABLE IF NOT EXISTS public.hr_mobility_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.hr_mobility_assignments(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  file_url TEXT,
  reference_number TEXT,
  alert_days_before INT NOT NULL DEFAULT 60,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_mobility_cost_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.hr_mobility_assignments(id) ON DELETE CASCADE,
  projection_year INT NOT NULL,
  base_salary_home NUMERIC NOT NULL DEFAULT 0,
  base_salary_host NUMERIC NOT NULL DEFAULT 0,
  housing_allowance NUMERIC NOT NULL DEFAULT 0,
  cola_allowance NUMERIC NOT NULL DEFAULT 0,
  hardship_allowance NUMERIC NOT NULL DEFAULT 0,
  education_allowance NUMERIC NOT NULL DEFAULT 0,
  relocation_cost NUMERIC NOT NULL DEFAULT 0,
  home_leave_flights NUMERIC NOT NULL DEFAULT 0,
  tax_equalization_cost NUMERIC NOT NULL DEFAULT 0,
  ss_cost_home NUMERIC NOT NULL DEFAULT 0,
  ss_cost_host NUMERIC NOT NULL DEFAULT 0,
  medical_insurance NUMERIC NOT NULL DEFAULT 0,
  other_benefits NUMERIC NOT NULL DEFAULT 0,
  total_annual_cost NUMERIC NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'EUR',
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, projection_year)
);

CREATE TABLE IF NOT EXISTS public.hr_mobility_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.hr_mobility_assignments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mobility_documents_assignment ON public.hr_mobility_documents(assignment_id);
CREATE INDEX IF NOT EXISTS idx_mobility_documents_expiry ON public.hr_mobility_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_mobility_costs_assignment ON public.hr_mobility_cost_projections(assignment_id);
CREATE INDEX IF NOT EXISTS idx_mobility_audit_assignment ON public.hr_mobility_audit_log(assignment_id);

ALTER TABLE public.hr_mobility_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_mobility_cost_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_mobility_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage mobility documents"
  ON public.hr_mobility_documents FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage mobility cost projections"
  ON public.hr_mobility_cost_projections FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage mobility audit log"
  ON public.hr_mobility_audit_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
