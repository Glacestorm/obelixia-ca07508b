
-- V2-ES.8 T2: Add missing fields requested in Prompt 1/2 for full traceability
ALTER TABLE public.erp_hr_dry_run_results
  ADD COLUMN IF NOT EXISTS related_period_id UUID,
  ADD COLUMN IF NOT EXISTS related_process_id UUID,
  ADD COLUMN IF NOT EXISTS related_run_id UUID,
  ADD COLUMN IF NOT EXISTS execution_mode TEXT NOT NULL DEFAULT 'dry_run',
  ADD COLUMN IF NOT EXISTS simulated_result TEXT NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS readiness_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS submission_status TEXT NOT NULL DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_dry_run_results_period ON public.erp_hr_dry_run_results(related_period_id);
CREATE INDEX IF NOT EXISTS idx_dry_run_results_process ON public.erp_hr_dry_run_results(related_process_id);
CREATE INDEX IF NOT EXISTS idx_dry_run_results_run ON public.erp_hr_dry_run_results(related_run_id);
