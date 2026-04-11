CREATE TABLE public.erp_hr_job_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  position_id uuid NOT NULL,
  version_id uuid,
  status text NOT NULL DEFAULT 'draft',
  methodology_snapshot jsonb NOT NULL DEFAULT '{}',
  factor_scores jsonb NOT NULL DEFAULT '{}',
  total_score numeric NOT NULL DEFAULT 0,
  equivalent_band_min numeric,
  equivalent_band_max numeric,
  notes text,
  scored_by uuid,
  reviewed_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  ai_suggestions jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_job_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.erp_hr_job_valuations
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "tenant_insert" ON public.erp_hr_job_valuations
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "tenant_update" ON public.erp_hr_job_valuations
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

CREATE INDEX idx_job_valuations_company ON public.erp_hr_job_valuations(company_id);
CREATE INDEX idx_job_valuations_position ON public.erp_hr_job_valuations(position_id);
CREATE INDEX idx_job_valuations_status ON public.erp_hr_job_valuations(status);