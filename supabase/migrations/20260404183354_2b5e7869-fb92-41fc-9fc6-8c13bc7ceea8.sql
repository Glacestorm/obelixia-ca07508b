
-- =============================================
-- FASE B: Motor IT/Bajas + Datos Simbólicos
-- =============================================

-- 1. erp_hr_it_processes — Procesos de Incapacidad Temporal
CREATE TABLE public.erp_hr_it_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  process_type TEXT NOT NULL DEFAULT 'EC',
  start_date DATE NOT NULL,
  end_date DATE,
  expected_end_date DATE,
  issuing_entity TEXT,
  issuing_entity_type TEXT DEFAULT 'INSS',
  diagnosis_code TEXT,
  diagnosis_description TEXT,
  cno_code TEXT,
  worker_situation TEXT DEFAULT 'active',
  assistance_type TEXT DEFAULT 'ambulatory',
  has_relapse BOOLEAN DEFAULT false,
  relapse_of_id UUID REFERENCES public.erp_hr_it_processes(id) ON DELETE SET NULL,
  direct_payment BOOLEAN DEFAULT false,
  partial_compatibility BOOLEAN DEFAULT false,
  partial_percentage NUMERIC(5,2),
  milestone_365_date DATE,
  milestone_545_date DATE,
  milestone_365_notified BOOLEAN DEFAULT false,
  milestone_545_notified BOOLEAN DEFAULT false,
  complement_scheme TEXT DEFAULT 'convention',
  complement_percentage NUMERIC(5,2) DEFAULT 100.00,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_it_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_hr_it_processes_select" ON public.erp_hr_it_processes FOR SELECT TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_hr_it_processes_insert" ON public.erp_hr_it_processes FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_hr_it_processes_update" ON public.erp_hr_it_processes FOR UPDATE TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE INDEX idx_hr_it_processes_company ON public.erp_hr_it_processes(company_id);
CREATE INDEX idx_hr_it_processes_employee ON public.erp_hr_it_processes(employee_id);
CREATE INDEX idx_hr_it_processes_status ON public.erp_hr_it_processes(status);
CREATE INDEX idx_hr_it_processes_dates ON public.erp_hr_it_processes(start_date, end_date);

-- 2. erp_hr_it_parts — Partes baja/alta/confirmación (RD 625/2014)
CREATE TABLE public.erp_hr_it_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  process_id UUID NOT NULL REFERENCES public.erp_hr_it_processes(id) ON DELETE CASCADE,
  part_type TEXT NOT NULL DEFAULT 'baja',
  part_number INTEGER DEFAULT 1,
  issue_date DATE NOT NULL,
  reception_date DATE,
  communication_date DATE,
  effective_date DATE,
  next_review_date DATE,
  issuing_doctor TEXT,
  issuing_center TEXT,
  observations TEXT,
  file_url TEXT,
  file_hash TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_it_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_hr_it_parts_select" ON public.erp_hr_it_parts FOR SELECT TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_hr_it_parts_insert" ON public.erp_hr_it_parts FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_hr_it_parts_update" ON public.erp_hr_it_parts FOR UPDATE TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE INDEX idx_hr_it_parts_process ON public.erp_hr_it_parts(process_id);
CREATE INDEX idx_hr_it_parts_company ON public.erp_hr_it_parts(company_id);

-- 3. erp_hr_it_bases — Bases reguladoras IT
CREATE TABLE public.erp_hr_it_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  process_id UUID NOT NULL REFERENCES public.erp_hr_it_processes(id) ON DELETE CASCADE,
  calculation_date DATE NOT NULL,
  base_monthly NUMERIC(12,2) DEFAULT 0,
  base_daily_ec NUMERIC(12,2) DEFAULT 0,
  base_daily_at NUMERIC(12,2) DEFAULT 0,
  base_daily_extra_hours NUMERIC(12,2) DEFAULT 0,
  base_fdi_ec NUMERIC(12,2) DEFAULT 0,
  base_fdi_at NUMERIC(12,2) DEFAULT 0,
  base_fdi_maternity NUMERIC(12,2) DEFAULT 0,
  days_in_period INTEGER DEFAULT 30,
  prorrata_extras NUMERIC(12,2) DEFAULT 0,
  total_base_reguladora NUMERIC(12,2) DEFAULT 0,
  pct_subsidy NUMERIC(5,2) DEFAULT 60.00,
  daily_subsidy NUMERIC(12,2) DEFAULT 0,
  employer_complement NUMERIC(12,2) DEFAULT 0,
  calculation_method TEXT DEFAULT 'standard',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_it_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_hr_it_bases_select" ON public.erp_hr_it_bases FOR SELECT TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_hr_it_bases_insert" ON public.erp_hr_it_bases FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_hr_it_bases_update" ON public.erp_hr_it_bases FOR UPDATE TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE INDEX idx_hr_it_bases_process ON public.erp_hr_it_bases(process_id);
CREATE INDEX idx_hr_it_bases_company ON public.erp_hr_it_bases(company_id);

-- 4. erp_hr_employee_symbolic_data — Flags/datos simbólicos por empleado
CREATE TABLE public.erp_hr_employee_symbolic_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  symbol_name TEXT NOT NULL,
  symbol_value TEXT NOT NULL DEFAULT '',
  value_type TEXT NOT NULL DEFAULT 'boolean',
  valid_from DATE,
  valid_to DATE,
  description TEXT,
  category TEXT DEFAULT 'general',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id, symbol_name, valid_from)
);

ALTER TABLE public.erp_hr_employee_symbolic_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_hr_employee_symbolic_data_select" ON public.erp_hr_employee_symbolic_data FOR SELECT TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_hr_employee_symbolic_data_insert" ON public.erp_hr_employee_symbolic_data FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_hr_employee_symbolic_data_update" ON public.erp_hr_employee_symbolic_data FOR UPDATE TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_hr_employee_symbolic_data_delete" ON public.erp_hr_employee_symbolic_data FOR DELETE TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE INDEX idx_hr_symbolic_data_company ON public.erp_hr_employee_symbolic_data(company_id);
CREATE INDEX idx_hr_symbolic_data_employee ON public.erp_hr_employee_symbolic_data(employee_id);
CREATE INDEX idx_hr_symbolic_data_symbol ON public.erp_hr_employee_symbolic_data(symbol_name);

-- Triggers
CREATE TRIGGER update_erp_hr_it_processes_updated_at BEFORE UPDATE ON public.erp_hr_it_processes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_erp_hr_it_parts_updated_at BEFORE UPDATE ON public.erp_hr_it_parts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_erp_hr_it_bases_updated_at BEFORE UPDATE ON public.erp_hr_it_bases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_erp_hr_employee_symbolic_data_updated_at BEFORE UPDATE ON public.erp_hr_employee_symbolic_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
