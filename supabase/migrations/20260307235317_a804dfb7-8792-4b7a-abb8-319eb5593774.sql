-- Add fiscal jurisdiction to employees for multi-jurisdictional payroll calculations
ALTER TABLE public.erp_hr_employees
ADD COLUMN IF NOT EXISTS fiscal_jurisdiction TEXT NOT NULL DEFAULT 'ES'
CHECK (fiscal_jurisdiction IN ('ES', 'AD', 'EU', 'PT', 'FR', 'UK', 'AE', 'US'));

COMMENT ON COLUMN public.erp_hr_employees.fiscal_jurisdiction IS 'Fiscal jurisdiction for payroll, IRPF and SS calculations (ES=Spain, AD=Andorra, etc.)';

-- Add autonomous community for regional IRPF tables (Spain)
ALTER TABLE public.erp_hr_employees
ADD COLUMN IF NOT EXISTS autonomous_community TEXT DEFAULT NULL;

COMMENT ON COLUMN public.erp_hr_employees.autonomous_community IS 'Spanish autonomous community for regional IRPF deductions';

-- Add fiscal jurisdiction to payrolls for traceability
ALTER TABLE public.erp_hr_payrolls
ADD COLUMN IF NOT EXISTS fiscal_jurisdiction TEXT DEFAULT 'ES';

-- Add fiscal jurisdiction to settlements
ALTER TABLE public.erp_hr_settlements
ADD COLUMN IF NOT EXISTS fiscal_jurisdiction TEXT DEFAULT 'ES';

-- Add fiscal jurisdiction to recalculations
ALTER TABLE public.erp_hr_payroll_recalculations
ADD COLUMN IF NOT EXISTS fiscal_jurisdiction TEXT DEFAULT 'ES';

-- Create time clock control table (Ley de Fichaje - RD-ley 8/2019, Art. 34.9 ET)
CREATE TABLE IF NOT EXISTS public.erp_hr_time_clock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  clock_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0,
  worked_hours NUMERIC(5,2) DEFAULT 0,
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  clock_in_method TEXT NOT NULL DEFAULT 'web' CHECK (clock_in_method IN ('web', 'app', 'biometric', 'nfc', 'qr', 'gps', 'manual')),
  clock_out_method TEXT CHECK (clock_out_method IN ('web', 'app', 'biometric', 'nfc', 'qr', 'gps', 'manual', 'auto')),
  clock_in_location JSONB DEFAULT NULL,
  clock_out_location JSONB DEFAULT NULL,
  ip_address_in TEXT,
  ip_address_out TEXT,
  device_info JSONB DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'anomaly', 'manual_correction', 'approved', 'rejected')),
  anomaly_type TEXT CHECK (anomaly_type IN ('missing_clock_out', 'excessive_hours', 'insufficient_break', 'location_mismatch', 'schedule_deviation', 'manual_override')),
  anomaly_notes TEXT,
  approved_by UUID REFERENCES public.erp_hr_employees(id),
  approved_at TIMESTAMPTZ,
  correction_reason TEXT,
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, clock_date, clock_in)
);

-- RLS for time clock
ALTER TABLE public.erp_hr_time_clock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view time clock for their company"
  ON public.erp_hr_time_clock FOR SELECT
  USING (company_id IN (
    SELECT uc.company_id FROM erp_user_companies uc WHERE uc.user_id = auth.uid() AND uc.is_active = true
  ));

CREATE POLICY "Users can insert time clock entries"
  ON public.erp_hr_time_clock FOR INSERT
  WITH CHECK (company_id IN (
    SELECT uc.company_id FROM erp_user_companies uc WHERE uc.user_id = auth.uid() AND uc.is_active = true
  ));

CREATE POLICY "Users can update time clock for their company"
  ON public.erp_hr_time_clock FOR UPDATE
  USING (company_id IN (
    SELECT uc.company_id FROM erp_user_companies uc WHERE uc.user_id = auth.uid() AND uc.is_active = true
  ));

CREATE POLICY "Users can delete time clock for their company"
  ON public.erp_hr_time_clock FOR DELETE
  USING (company_id IN (
    SELECT uc.company_id FROM erp_user_companies uc WHERE uc.user_id = auth.uid() AND uc.is_active = true
  ));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_erp_hr_time_clock_employee_date ON public.erp_hr_time_clock (employee_id, clock_date DESC);
CREATE INDEX IF NOT EXISTS idx_erp_hr_time_clock_company_date ON public.erp_hr_time_clock (company_id, clock_date DESC);
CREATE INDEX IF NOT EXISTS idx_erp_hr_time_clock_status ON public.erp_hr_time_clock (company_id, status);

-- Trigger for updated_at
CREATE TRIGGER update_erp_hr_time_clock_updated_at
  BEFORE UPDATE ON public.erp_hr_time_clock
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();