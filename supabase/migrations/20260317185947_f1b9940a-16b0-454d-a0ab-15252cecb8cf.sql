
CREATE TABLE public.erp_hr_official_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  circuit_id TEXT NOT NULL,
  period_year INTEGER,
  period_month INTEGER,
  period_label TEXT,
  status TEXT NOT NULL DEFAULT 'generated',
  is_valid BOOLEAN NOT NULL DEFAULT false,
  readiness_percent INTEGER NOT NULL DEFAULT 0,
  version_number INTEGER NOT NULL DEFAULT 1,
  version_registry_id UUID,
  previous_artifact_id UUID,
  superseded_by_id UUID,
  ledger_event_id UUID,
  evidence_id UUID,
  artifact_payload JSONB NOT NULL,
  validations JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings TEXT[] NOT NULL DEFAULT '{}',
  totals JSONB,
  employee_ids TEXT[] NOT NULL DEFAULT '{}',
  effective_date DATE,
  generated_by UUID,
  engine_version TEXT NOT NULL DEFAULT '1.0-P2B',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_official_artifacts_company ON public.erp_hr_official_artifacts(company_id);
CREATE INDEX idx_hr_official_artifacts_circuit ON public.erp_hr_official_artifacts(company_id, circuit_id, period_year, period_month);

ALTER TABLE public.erp_hr_official_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sel_artifacts" ON public.erp_hr_official_artifacts
  FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "ins_artifacts" ON public.erp_hr_official_artifacts
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "upd_artifacts" ON public.erp_hr_official_artifacts
  FOR UPDATE TO authenticated
  USING (public.user_has_erp_company_access(company_id));
