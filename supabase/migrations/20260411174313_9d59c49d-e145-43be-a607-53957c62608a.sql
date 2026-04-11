-- Add pipeline columns to erp_hr_termination_analysis
ALTER TABLE public.erp_hr_termination_analysis
  ADD COLUMN IF NOT EXISTS pipeline_state text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS pipeline_timeline jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS settlement_snapshot jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz DEFAULT NULL;

-- Add index for pipeline state queries
CREATE INDEX IF NOT EXISTS idx_erp_hr_termination_pipeline_state
  ON public.erp_hr_termination_analysis (company_id, pipeline_state);