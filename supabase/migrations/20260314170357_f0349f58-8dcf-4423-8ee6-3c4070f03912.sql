
-- V2-ES.8: Extend hr_official_submissions for preparatory integration lifecycle
-- Additive only — no existing columns modified

-- 1. Add submission_domain to classify by regulatory organism
ALTER TABLE public.hr_official_submissions 
  ADD COLUMN IF NOT EXISTS submission_domain text NOT NULL DEFAULT 'generic';

-- 2. Add submission_mode to distinguish dry-run from real
ALTER TABLE public.hr_official_submissions 
  ADD COLUMN IF NOT EXISTS submission_mode text NOT NULL DEFAULT 'dry_run';

-- 3. Add validation_result for structured internal validation output
ALTER TABLE public.hr_official_submissions 
  ADD COLUMN IF NOT EXISTS validation_result jsonb DEFAULT NULL;

-- 4. Add payload_snapshot for immutable snapshot at generation time
ALTER TABLE public.hr_official_submissions 
  ADD COLUMN IF NOT EXISTS payload_snapshot jsonb DEFAULT NULL;

-- 5. Add readiness_status for pre-submission readiness level
ALTER TABLE public.hr_official_submissions 
  ADD COLUMN IF NOT EXISTS readiness_status text NOT NULL DEFAULT 'pending';

-- 6. Add related_run_id for payroll run linkage
ALTER TABLE public.hr_official_submissions 
  ADD COLUMN IF NOT EXISTS related_run_id uuid DEFAULT NULL;

-- 7. Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_hr_official_submissions_domain 
  ON public.hr_official_submissions(submission_domain);

CREATE INDEX IF NOT EXISTS idx_hr_official_submissions_mode 
  ON public.hr_official_submissions(submission_mode);

CREATE INDEX IF NOT EXISTS idx_hr_official_submissions_readiness 
  ON public.hr_official_submissions(readiness_status);

CREATE INDEX IF NOT EXISTS idx_hr_official_submissions_domain_mode 
  ON public.hr_official_submissions(submission_domain, submission_mode, status);

-- 8. Comment for documentation
COMMENT ON COLUMN public.hr_official_submissions.submission_domain IS 'Regulatory domain: TGSS, CONTRATA, AEAT_111, AEAT_190, CERTIFICA2, DELTA, generic';
COMMENT ON COLUMN public.hr_official_submissions.submission_mode IS 'Operation mode: dry_run (default, safe), manual, real (blocked by default)';
COMMENT ON COLUMN public.hr_official_submissions.validation_result IS 'Structured result from internal pre-validation: {errors, warnings, checks, score}';
COMMENT ON COLUMN public.hr_official_submissions.payload_snapshot IS 'Immutable snapshot of payload at generation time for audit trail';
COMMENT ON COLUMN public.hr_official_submissions.readiness_status IS 'Pre-submission readiness: pending, partial, ready, blocked';
COMMENT ON COLUMN public.hr_official_submissions.related_run_id IS 'Optional link to payroll run (erp_hr_payroll_runs)';
