
-- Cross-domain feedback for ObelixIA cases
CREATE TABLE public.erp_cross_domain_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invocation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  case_type TEXT NOT NULL DEFAULT 'regulatory_cross_domain',
  
  -- Escalation quality
  escalation_correct BOOLEAN,
  escalation_comment TEXT,
  
  -- Conflict resolution quality
  conflict_resolution_correct BOOLEAN,
  conflict_resolution_comment TEXT,
  
  -- Severity/risk quality
  severity_correct BOOLEAN,
  corrected_severity TEXT,
  
  -- priority_actions quality
  actions_useful BOOLEAN,
  actions_rating INTEGER CHECK (actions_rating BETWEEN 1 AND 5),
  corrected_actions JSONB,
  
  -- adaptation_deadline quality
  deadline_reasonable BOOLEAN,
  corrected_deadline TEXT,
  
  -- Composition quality
  recommendation_useful BOOLEAN,
  recommendation_rating INTEGER CHECK (recommendation_rating BETWEEN 1 AND 5),
  corrected_recommendation TEXT,
  
  -- Domain precision
  hr_impact_correct BOOLEAN,
  legal_impact_correct BOOLEAN,
  domain_assignment_correct BOOLEAN,
  
  -- Human review decision quality
  human_review_decision_correct BOOLEAN,
  
  -- General
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  comment TEXT,
  reviewer_role TEXT,
  reviewer_domain TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validated cases memory / dataset
CREATE TABLE public.erp_validated_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invocation_id UUID,
  document_id UUID,
  
  -- Case metadata
  case_type TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'regulatory',
  impact_domains TEXT[] DEFAULT '{}',
  
  -- Validated outputs
  validated_severity TEXT NOT NULL,
  validated_has_conflict BOOLEAN NOT NULL DEFAULT false,
  validated_conflict_type TEXT,
  validated_recommendation TEXT,
  validated_priority_actions JSONB,
  validated_deadline TEXT,
  validated_human_review_needed BOOLEAN NOT NULL DEFAULT false,
  
  -- Escalation verdict
  escalation_was_correct BOOLEAN NOT NULL DEFAULT true,
  
  -- Quality scores (aggregated from feedback)
  quality_score NUMERIC(3,2) DEFAULT 0,
  feedback_count INTEGER DEFAULT 0,
  
  -- Context for few-shot / pattern matching
  input_summary TEXT,
  document_type TEXT,
  legal_area TEXT,
  source_code TEXT,
  
  -- Governance
  validated_by UUID,
  validated_at TIMESTAMPTZ DEFAULT now(),
  validator_role TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.erp_cross_domain_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_validated_cases ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can insert feedback, admins can read all
CREATE POLICY "Authenticated users can insert cross-domain feedback"
  ON public.erp_cross_domain_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read cross-domain feedback"
  ON public.erp_cross_domain_feedback FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read validated cases"
  ON public.erp_validated_cases FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage validated cases"
  ON public.erp_validated_cases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Index for fast lookup
CREATE INDEX idx_cross_domain_feedback_invocation ON public.erp_cross_domain_feedback(invocation_id);
CREATE INDEX idx_validated_cases_type ON public.erp_validated_cases(case_type, origin);
CREATE INDEX idx_validated_cases_domains ON public.erp_validated_cases USING GIN(impact_domains);
