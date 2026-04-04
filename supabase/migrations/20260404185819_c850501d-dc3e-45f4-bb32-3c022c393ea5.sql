
-- =============================================
-- FASE E: Pluriempleo / Pluriactividad
-- =============================================

CREATE TABLE public.erp_hr_multi_employment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  employee_id UUID NOT NULL,
  multi_type TEXT NOT NULL DEFAULT 'pluriempleo',
  authorization_date DATE,
  authorization_number TEXT,
  other_employer_name TEXT,
  other_employer_ccc TEXT,
  other_employer_activity TEXT,
  base_distribution_own NUMERIC(5,4),
  base_distribution_other NUMERIC(5,4),
  own_weekly_hours NUMERIC(5,2),
  other_weekly_hours NUMERIC(5,2),
  solidarity_rate NUMERIC(5,2),
  solidarity_bracket INTEGER,
  solidarity_amount NUMERIC(12,2),
  reimbursement_right BOOLEAN DEFAULT false,
  reimbursement_amount NUMERIC(12,2),
  effective_from DATE NOT NULL,
  effective_to DATE,
  status TEXT NOT NULL DEFAULT 'active',
  calculation_details JSONB DEFAULT '{}',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_multi_employment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage multi employment"
  ON public.erp_hr_multi_employment FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_multi_employment_employee ON public.erp_hr_multi_employment(employee_id);
CREATE INDEX idx_multi_employment_status ON public.erp_hr_multi_employment(status);
CREATE INDEX idx_multi_employment_type ON public.erp_hr_multi_employment(multi_type);

CREATE TRIGGER update_erp_hr_multi_employment_updated_at
  BEFORE UPDATE ON public.erp_hr_multi_employment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
