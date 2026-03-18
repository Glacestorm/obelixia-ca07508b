
CREATE TABLE public.erp_hr_agreement_salary_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  agreement_code TEXT NOT NULL,
  agreement_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  professional_group TEXT NOT NULL,
  professional_group_description TEXT,
  level TEXT NOT NULL DEFAULT '',
  base_salary_monthly NUMERIC(12,2) NOT NULL,
  base_salary_annual NUMERIC(12,2),
  plus_convenio_monthly NUMERIC(12,2) DEFAULT 0,
  extra_pay_amount NUMERIC(12,2),
  total_annual_compensation NUMERIC(12,2),
  is_active BOOLEAN DEFAULT true,
  effective_date DATE NOT NULL,
  expiration_date DATE,
  source_reference TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, agreement_code, year, professional_group, level)
);

ALTER TABLE public.erp_hr_agreement_salary_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agreement salary tables"
  ON public.erp_hr_agreement_salary_tables FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage agreement salary tables"
  ON public.erp_hr_agreement_salary_tables FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_agreement_salary_lookup 
  ON public.erp_hr_agreement_salary_tables(company_id, agreement_code, year, professional_group, is_active);

COMMENT ON TABLE public.erp_hr_agreement_salary_tables IS 'Tablas salariales por categoría/grupo profesional de convenios colectivos. Art. 26 ET.';
