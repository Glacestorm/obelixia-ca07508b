
-- Pre-real approval requests/decisions for official submissions
CREATE TABLE public.erp_hr_submission_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL,
  submission_domain TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  
  -- Approval request
  requested_by UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_notes TEXT,
  
  -- Eligibility snapshot at request time
  eligibility_snapshot JSONB DEFAULT '{}'::jsonb,
  readiness_score NUMERIC DEFAULT 0,
  dry_run_count INTEGER DEFAULT 0,
  
  -- Decision
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'rejected', 'correction_requested', 'cancelled', 'expired')),
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  decision_checklist JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  approval_level INTEGER DEFAULT 1,
  required_role TEXT DEFAULT 'hr_director',
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_submission_approvals_company ON public.erp_hr_submission_approvals(company_id);
CREATE INDEX idx_submission_approvals_status ON public.erp_hr_submission_approvals(status);
CREATE INDEX idx_submission_approvals_submission ON public.erp_hr_submission_approvals(submission_id);

-- RLS
ALTER TABLE public.erp_hr_submission_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view approvals"
  ON public.erp_hr_submission_approvals FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert approvals"
  ON public.erp_hr_submission_approvals FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update approvals"
  ON public.erp_hr_submission_approvals FOR UPDATE
  TO authenticated USING (true);
