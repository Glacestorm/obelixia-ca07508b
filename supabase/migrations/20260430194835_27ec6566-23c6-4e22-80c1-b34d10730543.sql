-- B13.2 — Legal Document Intake Queue for Curated Collective Agreements
-- Strictly isolated from payroll runtime, salary_tables, and pilot flags.

CREATE TABLE IF NOT EXISTS public.erp_hr_collective_agreement_document_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_queue_id uuid NULL REFERENCES public.erp_hr_collective_agreement_source_watch_queue(id) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_url text NOT NULL,
  document_url text NULL,
  jurisdiction text NULL,
  territorial_scope text NULL,
  publication_date date NULL,
  document_hash text NULL,
  detected_agreement_name text NULL,
  detected_regcon text NULL,
  detected_cnae text[] NULL,
  detected_sector text NULL,
  confidence numeric(5,2) NULL,
  status text NOT NULL DEFAULT 'pending_review',
  classification text NULL,
  candidate_registry_agreement_id uuid NULL REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE RESTRICT,
  candidate_registry_version_id uuid NULL REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE RESTRICT,
  duplicate_of uuid NULL REFERENCES public.erp_hr_collective_agreement_document_intake(id) ON DELETE RESTRICT,
  human_reviewer uuid NULL,
  claimed_at timestamptz NULL,
  classified_by uuid NULL,
  classified_at timestamptz NULL,
  blocked_by uuid NULL,
  blocked_at timestamptz NULL,
  block_reason text NULL,
  notes text NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT b13_2_source_type_chk CHECK (source_type IN (
    'boe','regcon','boletin_autonomico','bop_provincial','manual_official_url','other_official'
  )),
  CONSTRAINT b13_2_status_chk CHECK (status IN (
    'pending_review','claimed_for_review','classified','duplicate','blocked','ready_for_extraction','dismissed'
  )),
  CONSTRAINT b13_2_classification_chk CHECK (
    classification IS NULL OR classification IN (
      'new_agreement','salary_revision','errata','paritaria_act','scope_clarification','unknown'
    )
  ),
  CONSTRAINT b13_2_confidence_range CHECK (
    confidence IS NULL OR (confidence >= 0 AND confidence <= 100)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_intake_status
  ON public.erp_hr_collective_agreement_document_intake(status);
CREATE INDEX IF NOT EXISTS idx_document_intake_source_type
  ON public.erp_hr_collective_agreement_document_intake(source_type);
CREATE INDEX IF NOT EXISTS idx_document_intake_publication_date
  ON public.erp_hr_collective_agreement_document_intake(publication_date);
CREATE INDEX IF NOT EXISTS idx_document_intake_document_hash
  ON public.erp_hr_collective_agreement_document_intake(document_hash);
CREATE INDEX IF NOT EXISTS idx_document_intake_candidate_registry
  ON public.erp_hr_collective_agreement_document_intake(candidate_registry_agreement_id, candidate_registry_version_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_intake_document_hash
  ON public.erp_hr_collective_agreement_document_intake(document_hash)
  WHERE document_hash IS NOT NULL AND status <> 'duplicate';

-- RLS
ALTER TABLE public.erp_hr_collective_agreement_document_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_document_intake FORCE ROW LEVEL SECURITY;

CREATE POLICY "b13_2_di_select_authorized"
  ON public.erp_hr_collective_agreement_document_intake
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  );

CREATE POLICY "b13_2_di_insert_authorized"
  ON public.erp_hr_collective_agreement_document_intake
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  );

CREATE POLICY "b13_2_di_update_authorized"
  ON public.erp_hr_collective_agreement_document_intake
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  );

-- NO DELETE policy on purpose.

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.b13_2_document_intake_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_b13_2_document_intake_updated_at
BEFORE UPDATE ON public.erp_hr_collective_agreement_document_intake
FOR EACH ROW
EXECUTE FUNCTION public.b13_2_document_intake_set_updated_at();

-- Anti-activation guard + dedupe trigger
CREATE OR REPLACE FUNCTION public.b13_2_document_intake_anti_activation_guard()
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
    'runtime_setting'
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
    'runtime_setting'
  ];
  token TEXT;
  k TEXT;
  combined TEXT;
  existing_id uuid;
BEGIN
  -- Token scan over notes / block_reason / payload (stringified)
  combined := lower(
    coalesce(NEW.notes, '') || ' | ' ||
    coalesce(NEW.block_reason, '') || ' | ' ||
    coalesce(NEW.payload_json::text, '')
  );

  FOREACH token IN ARRAY forbidden_tokens LOOP
    IF position(lower(token) IN combined) > 0 THEN
      RAISE EXCEPTION 'B13_2_FORBIDDEN_ACTIVATION_TOKEN: %', token
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  -- Forbid these as TOP-LEVEL JSON keys
  IF NEW.payload_json IS NOT NULL AND jsonb_typeof(NEW.payload_json) = 'object' THEN
    FOREACH k IN ARRAY forbidden_payload_keys LOOP
      IF NEW.payload_json ? k THEN
        RAISE EXCEPTION 'B13_2_FORBIDDEN_PAYLOAD_KEY: %', k
          USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;

  -- Server-side dedupe on document_hash (only on INSERT and only when not already marked duplicate)
  IF TG_OP = 'INSERT' AND NEW.document_hash IS NOT NULL AND NEW.status <> 'duplicate' THEN
    SELECT id INTO existing_id
      FROM public.erp_hr_collective_agreement_document_intake
     WHERE document_hash = NEW.document_hash
       AND status <> 'duplicate'
     LIMIT 1;
    IF existing_id IS NOT NULL THEN
      NEW.status := 'duplicate';
      NEW.duplicate_of := existing_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_b13_2_document_intake_anti_activation
BEFORE INSERT OR UPDATE ON public.erp_hr_collective_agreement_document_intake
FOR EACH ROW
EXECUTE FUNCTION public.b13_2_document_intake_anti_activation_guard();

COMMENT ON TABLE public.erp_hr_collective_agreement_document_intake IS
  'B13.2 — Legal Document Intake Queue. Triage of official agreement documents. NEVER touches salary_tables, payroll runtime, or activation flags.';