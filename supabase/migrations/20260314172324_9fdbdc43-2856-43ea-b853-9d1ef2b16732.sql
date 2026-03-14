
-- Dry-run results persistence table
CREATE TABLE public.erp_hr_dry_run_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  submission_id UUID REFERENCES public.hr_official_submissions(id) ON DELETE SET NULL,
  submission_domain TEXT NOT NULL DEFAULT 'generic',
  submission_type TEXT NOT NULL,
  execution_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'success',
  payload_snapshot JSONB,
  validation_result JSONB,
  dry_run_output JSONB,
  readiness_score INTEGER DEFAULT 0,
  duration_ms INTEGER,
  executed_by UUID,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dry_run_results_company ON public.erp_hr_dry_run_results(company_id);
CREATE INDEX idx_dry_run_results_submission ON public.erp_hr_dry_run_results(submission_id);
CREATE INDEX idx_dry_run_results_domain ON public.erp_hr_dry_run_results(submission_domain);
CREATE INDEX idx_dry_run_results_created ON public.erp_hr_dry_run_results(created_at DESC);

-- Dry-run to evidence linking table
CREATE TABLE public.erp_hr_dry_run_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dry_run_id UUID NOT NULL REFERENCES public.erp_hr_dry_run_results(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'payload_snapshot',
  document_id UUID,
  label TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dry_run_evidence_run ON public.erp_hr_dry_run_evidence(dry_run_id);
CREATE INDEX idx_dry_run_evidence_doc ON public.erp_hr_dry_run_evidence(document_id);

-- Enable RLS
ALTER TABLE public.erp_hr_dry_run_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_dry_run_evidence ENABLE ROW LEVEL SECURITY;

-- Simple authenticated access (consistent with hr_official_submissions pattern)
CREATE POLICY "Authenticated full access on dry_run_results"
  ON public.erp_hr_dry_run_results FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on dry_run_evidence"
  ON public.erp_hr_dry_run_evidence FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
