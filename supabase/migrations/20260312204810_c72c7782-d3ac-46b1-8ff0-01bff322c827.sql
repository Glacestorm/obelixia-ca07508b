
-- Enhance hr_payroll_periods with missing columns
ALTER TABLE public.hr_payroll_periods ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE public.hr_payroll_periods ADD COLUMN IF NOT EXISTS employee_count INT DEFAULT 0;
ALTER TABLE public.hr_payroll_periods ADD COLUMN IF NOT EXISTS total_gross NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.hr_payroll_periods ADD COLUMN IF NOT EXISTS total_net NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.hr_payroll_periods ADD COLUMN IF NOT EXISTS total_employer_cost NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.hr_payroll_periods ADD COLUMN IF NOT EXISTS validation_results JSONB DEFAULT '{}';
ALTER TABLE public.hr_payroll_periods ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

-- Enhance hr_payroll_record_lines with missing columns
ALTER TABLE public.hr_payroll_record_lines ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'fixed';
ALTER TABLE public.hr_payroll_record_lines ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15,4) DEFAULT 0;
ALTER TABLE public.hr_payroll_record_lines ADD COLUMN IF NOT EXISTS is_percentage BOOLEAN DEFAULT false;
ALTER TABLE public.hr_payroll_record_lines ADD COLUMN IF NOT EXISTS percentage_base TEXT;
ALTER TABLE public.hr_payroll_record_lines ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.hr_payroll_record_lines ADD COLUMN IF NOT EXISTS incident_id UUID;
ALTER TABLE public.hr_payroll_record_lines ADD COLUMN IF NOT EXISTS concept_id UUID;

-- Add period_id to legacy payrolls
ALTER TABLE public.erp_hr_payrolls ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES public.hr_payroll_periods(id) ON DELETE SET NULL;

-- Create hr_payroll_concept_templates
CREATE TABLE IF NOT EXISTS public.hr_payroll_concept_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  line_type TEXT NOT NULL DEFAULT 'earning',
  category TEXT NOT NULL DEFAULT 'fixed',
  default_amount NUMERIC(15,2),
  is_percentage BOOLEAN DEFAULT false,
  default_percentage NUMERIC(8,4),
  percentage_base TEXT,
  taxable BOOLEAN DEFAULT true,
  contributable BOOLEAN DEFAULT true,
  country_code TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  legal_reference TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE public.hr_payroll_concept_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage concept templates" ON public.hr_payroll_concept_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create hr_payroll_simulations
CREATE TABLE IF NOT EXISTS public.hr_payroll_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  simulation_type TEXT NOT NULL DEFAULT 'what_if',
  input_params JSONB DEFAULT '{}',
  result_lines JSONB DEFAULT '[]',
  result_summary JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_payroll_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage simulations" ON public.hr_payroll_simulations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create hr_payroll_audit_log
CREATE TABLE IF NOT EXISTS public.hr_payroll_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  payroll_id UUID,
  period_id UUID,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT 'payroll',
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_payroll_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage payroll audit" ON public.hr_payroll_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_audit_company ON public.hr_payroll_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_audit_period ON public.hr_payroll_audit_log(period_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_payroll_periods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_payroll_record_lines;
