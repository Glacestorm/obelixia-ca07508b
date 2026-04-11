-- Add methodology_version for audit traceability
ALTER TABLE public.erp_hr_job_valuations
  ADD COLUMN methodology_version text NOT NULL DEFAULT 'v1.0';

-- Ensure only ONE approved (active) valuation per position per company
CREATE UNIQUE INDEX idx_job_valuations_unique_approved
  ON public.erp_hr_job_valuations (company_id, position_id)
  WHERE status = 'approved';