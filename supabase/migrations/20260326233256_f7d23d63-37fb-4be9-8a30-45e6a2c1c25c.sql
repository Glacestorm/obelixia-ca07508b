
CREATE TABLE IF NOT EXISTS public.erp_employee_legal_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  employee_id UUID NOT NULL,
  profile_data JSONB NOT NULL DEFAULT '{}',
  ai_context TEXT NOT NULL DEFAULT '',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id)
);

ALTER TABLE public.erp_employee_legal_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read legal profiles"
  ON public.erp_employee_legal_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert legal profiles"
  ON public.erp_employee_legal_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update legal profiles"
  ON public.erp_employee_legal_profiles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_erp_employee_legal_profiles_company ON public.erp_employee_legal_profiles(company_id);
CREATE INDEX idx_erp_employee_legal_profiles_employee ON public.erp_employee_legal_profiles(employee_id);
