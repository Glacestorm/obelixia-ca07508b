
-- Table 1: Payroll cycle tracking (state machine)
CREATE TABLE IF NOT EXISTS public.erp_audit_nomina_cycles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  period_year int NOT NULL,
  period_month int NOT NULL,
  status text DEFAULT 'draft',
  total_gross numeric(14,2),
  total_ss_company numeric(14,2),
  total_irpf numeric(14,2),
  total_net numeric(14,2),
  employee_count int,
  calculated_at timestamptz,
  calculated_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  filed_at timestamptz,
  accounted_at timestamptz,
  paid_at timestamptz,
  cycle_hash text,
  deviations jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.erp_audit_nomina_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_audit_nomina_cycles_company_isolation"
  ON public.erp_audit_nomina_cycles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_nomina_cycles_period ON public.erp_audit_nomina_cycles(company_id, period_year, period_month);
CREATE UNIQUE INDEX idx_nomina_cycles_unique ON public.erp_audit_nomina_cycles(company_id, period_year, period_month);

-- Create validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_nomina_cycle_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('draft','calculated','legal_validated','approved','filed','accounted','paid') THEN
    RAISE EXCEPTION 'Invalid cycle status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_nomina_cycle_status
  BEFORE INSERT OR UPDATE ON public.erp_audit_nomina_cycles
  FOR EACH ROW EXECUTE FUNCTION public.validate_nomina_cycle_status();

-- Table 2: Employee custom concepts
CREATE TABLE IF NOT EXISTS public.erp_hr_employee_custom_concepts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  employee_id uuid NOT NULL,
  concept_code text NOT NULL,
  concept_name text NOT NULL,
  valid_from date NOT NULL,
  valid_until date,
  fixed_value numeric(12,2),
  formula text,
  nature text,
  convention_definition text,
  calculation_algorithm text,
  priority int DEFAULT 10,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.erp_hr_employee_custom_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_hr_employee_custom_concepts_company_isolation"
  ON public.erp_hr_employee_custom_concepts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create validation trigger for nature
CREATE OR REPLACE FUNCTION public.validate_custom_concept_nature()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nature IS NOT NULL AND NEW.nature NOT IN ('salary','non_salary','in_kind','deduction') THEN
    RAISE EXCEPTION 'Invalid concept nature: %', NEW.nature;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_custom_concept_nature
  BEFORE INSERT OR UPDATE ON public.erp_hr_employee_custom_concepts
  FOR EACH ROW EXECUTE FUNCTION public.validate_custom_concept_nature();

-- Table 3: Payslip texts (OM 27/12/1994)
CREATE TABLE IF NOT EXISTS public.erp_hr_payslip_texts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  employee_id uuid,
  text_type text NOT NULL,
  title text,
  body text NOT NULL,
  valid_from date NOT NULL,
  valid_until date,
  applies_to_all boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.erp_hr_payslip_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_hr_payslip_texts_company_isolation"
  ON public.erp_hr_payslip_texts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create validation trigger for text_type
CREATE OR REPLACE FUNCTION public.validate_payslip_text_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.text_type NOT IN ('legal_notice','company_communication','seasonal','erte_info','other') THEN
    RAISE EXCEPTION 'Invalid payslip text type: %', NEW.text_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_payslip_text_type
  BEFORE INSERT OR UPDATE ON public.erp_hr_payslip_texts
  FOR EACH ROW EXECUTE FUNCTION public.validate_payslip_text_type();
