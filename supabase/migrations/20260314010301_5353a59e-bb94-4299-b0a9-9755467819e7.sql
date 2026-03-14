-- V2-ES.5 Paso 4: Add operational closure columns to erp_hr_registration_data
ALTER TABLE public.erp_hr_registration_data
  ADD COLUMN IF NOT EXISTS closure_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS closed_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS closure_notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS closure_snapshot jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS closure_blockers jsonb DEFAULT NULL;

-- Index for quickly finding closed processes
CREATE INDEX IF NOT EXISTS idx_erp_hr_registration_closure
  ON public.erp_hr_registration_data (company_id, closure_status)
  WHERE closure_status IS NOT NULL;