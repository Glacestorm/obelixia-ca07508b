
-- =============================================
-- FASE C: Embargos Judiciales (Art. 607-608 LEC)
-- =============================================

-- Tabla principal de embargos
CREATE TABLE public.erp_hr_garnishments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  procedure_number TEXT NOT NULL,
  court_name TEXT,
  court_type TEXT DEFAULT 'social',
  beneficiary_name TEXT,
  beneficiary_id_number TEXT,
  garnishment_type TEXT NOT NULL DEFAULT 'judicial',
  priority_order INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC(12,2),
  monthly_cap NUMERIC(12,2),
  accumulated_paid NUMERIC(12,2) DEFAULT 0,
  remaining_amount NUMERIC(12,2),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  art608_alimentos BOOLEAN DEFAULT false,
  cargas_familiares INTEGER DEFAULT 0,
  conceptos_embargables_100pct BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_garnishments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage garnishments"
  ON public.erp_hr_garnishments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_garnishments_employee ON public.erp_hr_garnishments(employee_id);
CREATE INDEX idx_garnishments_status ON public.erp_hr_garnishments(status);

-- Tabla de cálculos mensuales
CREATE TABLE public.erp_hr_garnishment_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  garnishment_id UUID NOT NULL REFERENCES public.erp_hr_garnishments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  net_salary NUMERIC(12,2) NOT NULL,
  smi_reference NUMERIC(12,2) NOT NULL,
  has_extra_pay BOOLEAN DEFAULT false,
  inembargable_limit NUMERIC(12,2) NOT NULL,
  tranches_applied JSONB NOT NULL DEFAULT '[]',
  total_garnished NUMERIC(12,2) NOT NULL DEFAULT 0,
  accumulated_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_after NUMERIC(12,2) NOT NULL DEFAULT 0,
  art608_override BOOLEAN DEFAULT false,
  calculation_details JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_garnishment_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage garnishment calculations"
  ON public.erp_hr_garnishment_calculations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_garnishment_calc_period ON public.erp_hr_garnishment_calculations(period_year, period_month);
CREATE INDEX idx_garnishment_calc_garnishment ON public.erp_hr_garnishment_calculations(garnishment_id);

-- Trigger updated_at
CREATE TRIGGER update_erp_hr_garnishments_updated_at
  BEFORE UPDATE ON public.erp_hr_garnishments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
