
-- =============================================
-- FASE D: Contratos Avanzados + Observaciones
-- =============================================

-- Ampliar erp_hr_contracts con campos avanzados
ALTER TABLE public.erp_hr_contracts
  ADD COLUMN IF NOT EXISTS extension_date DATE,
  ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ss_bonus_code TEXT,
  ADD COLUMN IF NOT EXISTS ss_bonus_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS ss_bonus_start DATE,
  ADD COLUMN IF NOT EXISTS ss_bonus_end DATE,
  ADD COLUMN IF NOT EXISTS part_time_coefficient NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS part_time_days_week JSONB,
  ADD COLUMN IF NOT EXISTS weekly_hours_distribution JSONB,
  ADD COLUMN IF NOT EXISTS maternity_reincorporation_date DATE,
  ADD COLUMN IF NOT EXISTS maternity_reserve_until DATE,
  ADD COLUMN IF NOT EXISTS conversion_from_contract_id UUID,
  ADD COLUMN IF NOT EXISTS ta2_movement_code TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Observaciones laborales
CREATE TABLE public.erp_hr_labor_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  employee_id UUID NOT NULL,
  contract_id UUID REFERENCES public.erp_hr_contracts(id) ON DELETE SET NULL,
  observation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  observation_data JSONB DEFAULT '{}',
  effective_date DATE,
  resolution_date DATE,
  resolution_notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_labor_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage labor observations"
  ON public.erp_hr_labor_observations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_labor_obs_employee ON public.erp_hr_labor_observations(employee_id);
CREATE INDEX idx_labor_obs_contract ON public.erp_hr_labor_observations(contract_id);
CREATE INDEX idx_labor_obs_type ON public.erp_hr_labor_observations(observation_type);

CREATE TRIGGER update_erp_hr_labor_observations_updated_at
  BEFORE UPDATE ON public.erp_hr_labor_observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
