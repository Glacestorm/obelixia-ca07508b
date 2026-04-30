-- B13.3A — Extraction Runner schema for Curated Collective Agreements
-- Strictly isolated from payroll runtime, salary_tables (real), and pilot flags.

-- =============================================================
-- TABLE 1: extraction_runs
-- =============================================================
CREATE TABLE IF NOT EXISTS public.erp_hr_collective_agreement_extraction_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.erp_hr_collective_agreement_document_intake(id) ON DELETE RESTRICT,
  agreement_id uuid NULL REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE RESTRICT,
  version_id uuid NULL REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE RESTRICT,
  run_status text NOT NULL DEFAULT 'queued',
  extraction_mode text NOT NULL,
  source_url text NOT NULL,
  document_url text NULL,
  document_hash text NULL,
  started_by uuid NULL,
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  blockers_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT b13_3a_run_status_chk CHECK (run_status IN (
    'queued','running','completed','completed_with_warnings','failed','blocked'
  )),
  CONSTRAINT b13_3a_extraction_mode_chk CHECK (extraction_mode IN (
    'html_text','pdf_text','ocr_assisted','manual_csv','metadata_only'
  ))
);

CREATE INDEX IF NOT EXISTS idx_extraction_runs_intake
  ON public.erp_hr_collective_agreement_extraction_runs(intake_id);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_status
  ON public.erp_hr_collective_agreement_extraction_runs(run_status);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_mode
  ON public.erp_hr_collective_agreement_extraction_runs(extraction_mode);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_agreement_version
  ON public.erp_hr_collective_agreement_extraction_runs(agreement_id, version_id);

ALTER TABLE public.erp_hr_collective_agreement_extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_extraction_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY "b13_3a_runs_select_authorized"
  ON public.erp_hr_collective_agreement_extraction_runs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  );

CREATE POLICY "b13_3a_runs_insert_authorized"
  ON public.erp_hr_collective_agreement_extraction_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  );

CREATE POLICY "b13_3a_runs_update_authorized"
  ON public.erp_hr_collective_agreement_extraction_runs
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  );
-- NO DELETE policy on purpose.

-- =============================================================
-- TABLE 2: extraction_findings
-- =============================================================
CREATE TABLE IF NOT EXISTS public.erp_hr_collective_agreement_extraction_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_run_id uuid NOT NULL REFERENCES public.erp_hr_collective_agreement_extraction_runs(id) ON DELETE RESTRICT,
  intake_id uuid NOT NULL REFERENCES public.erp_hr_collective_agreement_document_intake(id) ON DELETE RESTRICT,
  agreement_id uuid NULL REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE RESTRICT,
  version_id uuid NULL REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE RESTRICT,
  finding_type text NOT NULL,
  concept_literal_from_agreement text NULL,
  normalized_concept_key text NULL,
  payroll_label text NULL,
  payslip_label text NULL,
  source_page text NULL,
  source_excerpt text NULL,
  source_article text NULL,
  source_annex text NULL,
  raw_text text NULL,
  confidence text NULL,
  requires_human_review boolean NOT NULL DEFAULT true,
  finding_status text NOT NULL DEFAULT 'pending_review',
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT b13_3a_finding_type_chk CHECK (finding_type IN (
    'salary_table_candidate','rule_candidate','concept_candidate',
    'classification_candidate','metadata_candidate','ocr_required','manual_review_required'
  )),
  CONSTRAINT b13_3a_finding_status_chk CHECK (finding_status IN (
    'pending_review','accepted_to_staging','rejected','needs_correction','blocked'
  )),
  CONSTRAINT b13_3a_finding_confidence_chk CHECK (
    confidence IS NULL OR confidence IN ('low','medium','high')
  ),
  CONSTRAINT b13_3a_finding_requires_review_chk CHECK (requires_human_review = true)
);

CREATE INDEX IF NOT EXISTS idx_extraction_findings_run
  ON public.erp_hr_collective_agreement_extraction_findings(extraction_run_id);
CREATE INDEX IF NOT EXISTS idx_extraction_findings_type
  ON public.erp_hr_collective_agreement_extraction_findings(finding_type);
CREATE INDEX IF NOT EXISTS idx_extraction_findings_status
  ON public.erp_hr_collective_agreement_extraction_findings(finding_status);
CREATE INDEX IF NOT EXISTS idx_extraction_findings_agreement_version
  ON public.erp_hr_collective_agreement_extraction_findings(agreement_id, version_id);

ALTER TABLE public.erp_hr_collective_agreement_extraction_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_extraction_findings FORCE ROW LEVEL SECURITY;

CREATE POLICY "b13_3a_findings_select_authorized"
  ON public.erp_hr_collective_agreement_extraction_findings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  );

CREATE POLICY "b13_3a_findings_insert_authorized"
  ON public.erp_hr_collective_agreement_extraction_findings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  );

CREATE POLICY "b13_3a_findings_update_authorized"
  ON public.erp_hr_collective_agreement_extraction_findings
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  );
-- NO DELETE policy on purpose.

-- =============================================================
-- updated_at triggers
-- =============================================================
CREATE OR REPLACE FUNCTION public.b13_3a_extraction_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_b13_3a_runs_updated_at
BEFORE UPDATE ON public.erp_hr_collective_agreement_extraction_runs
FOR EACH ROW EXECUTE FUNCTION public.b13_3a_extraction_set_updated_at();

CREATE TRIGGER trg_b13_3a_findings_updated_at
BEFORE UPDATE ON public.erp_hr_collective_agreement_extraction_findings
FOR EACH ROW EXECUTE FUNCTION public.b13_3a_extraction_set_updated_at();

-- =============================================================
-- Anti-activation guard for runs (scans summary/warnings/blockers)
-- =============================================================
CREATE OR REPLACE FUNCTION public.b13_3a_extraction_runs_anti_activation_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  forbidden_tokens TEXT[] := ARRAY[
    'ready_for_payroll',
    'salary_tables_loaded',
    'data_completeness=human_validated',
    'data_completeness="human_validated"',
    'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
    'HR_REGISTRY_PILOT_MODE',
    'REGISTRY_PILOT_SCOPE_ALLOWLIST',
    'use_registry_for_payroll',
    'activation_run_id',
    'runtime_setting',
    'payroll_apply',
    'apply_to_payroll'
  ];
  forbidden_payload_keys TEXT[] := ARRAY[
    'ready_for_payroll',
    'salary_tables_loaded',
    'data_completeness',
    'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
    'HR_REGISTRY_PILOT_MODE',
    'REGISTRY_PILOT_SCOPE_ALLOWLIST',
    'use_registry_for_payroll',
    'activation_run_id',
    'runtime_setting',
    'payroll_apply',
    'apply_to_payroll'
  ];
  token TEXT;
  k TEXT;
  combined TEXT;
BEGIN
  combined := lower(
    coalesce(NEW.summary_json::text, '') || ' | ' ||
    coalesce(NEW.warnings_json::text, '') || ' | ' ||
    coalesce(NEW.blockers_json::text, '')
  );
  FOREACH token IN ARRAY forbidden_tokens LOOP
    IF position(lower(token) IN combined) > 0 THEN
      RAISE EXCEPTION 'B13_3A_FORBIDDEN_ACTIVATION_TOKEN: %', token
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  IF NEW.summary_json IS NOT NULL AND jsonb_typeof(NEW.summary_json) = 'object' THEN
    FOREACH k IN ARRAY forbidden_payload_keys LOOP
      IF NEW.summary_json ? k THEN
        RAISE EXCEPTION 'B13_3A_FORBIDDEN_PAYLOAD_KEY: %', k USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_b13_3a_runs_anti_activation
BEFORE INSERT OR UPDATE ON public.erp_hr_collective_agreement_extraction_runs
FOR EACH ROW EXECUTE FUNCTION public.b13_3a_extraction_runs_anti_activation_guard();

-- =============================================================
-- Anti-activation guard for findings
-- =============================================================
CREATE OR REPLACE FUNCTION public.b13_3a_extraction_findings_anti_activation_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  forbidden_tokens TEXT[] := ARRAY[
    'ready_for_payroll',
    'salary_tables_loaded',
    'data_completeness=human_validated',
    'data_completeness="human_validated"',
    'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
    'HR_REGISTRY_PILOT_MODE',
    'REGISTRY_PILOT_SCOPE_ALLOWLIST',
    'use_registry_for_payroll',
    'activation_run_id',
    'runtime_setting',
    'payroll_apply',
    'apply_to_payroll'
  ];
  forbidden_payload_keys TEXT[] := ARRAY[
    'ready_for_payroll',
    'salary_tables_loaded',
    'data_completeness',
    'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
    'HR_REGISTRY_PILOT_MODE',
    'REGISTRY_PILOT_SCOPE_ALLOWLIST',
    'use_registry_for_payroll',
    'activation_run_id',
    'runtime_setting',
    'payroll_apply',
    'apply_to_payroll'
  ];
  token TEXT;
  k TEXT;
  combined TEXT;
BEGIN
  -- Block lowering requires_human_review (defense in depth on top of CHECK)
  IF NEW.requires_human_review IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'B13_3A_FINDING_HUMAN_REVIEW_REQUIRED' USING ERRCODE = 'check_violation';
  END IF;

  combined := lower(
    coalesce(NEW.payload_json::text, '') || ' | ' ||
    coalesce(NEW.raw_text, '') || ' | ' ||
    coalesce(NEW.source_excerpt, '')
  );
  FOREACH token IN ARRAY forbidden_tokens LOOP
    IF position(lower(token) IN combined) > 0 THEN
      RAISE EXCEPTION 'B13_3A_FORBIDDEN_ACTIVATION_TOKEN: %', token
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  IF NEW.payload_json IS NOT NULL AND jsonb_typeof(NEW.payload_json) = 'object' THEN
    FOREACH k IN ARRAY forbidden_payload_keys LOOP
      IF NEW.payload_json ? k THEN
        RAISE EXCEPTION 'B13_3A_FORBIDDEN_PAYLOAD_KEY: %', k USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_b13_3a_findings_anti_activation
BEFORE INSERT OR UPDATE ON public.erp_hr_collective_agreement_extraction_findings
FOR EACH ROW EXECUTE FUNCTION public.b13_3a_extraction_findings_anti_activation_guard();

COMMENT ON TABLE public.erp_hr_collective_agreement_extraction_runs IS
  'B13.3A — Extraction runs over intake documents. NEVER touches salary_tables, payroll runtime, or activation flags.';
COMMENT ON TABLE public.erp_hr_collective_agreement_extraction_findings IS
  'B13.3A — Findings produced by extraction runs. requires_human_review forced true. NEVER feeds payroll directly.';