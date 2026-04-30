-- ============================================================
-- B11.2C.1 — TIC-NAC Salary Table Staging (persistent + audit)
-- Read-only towards payroll. No operative tables touched.
-- ============================================================

-- ---------- STAGING TABLE ----------
CREATE TABLE public.erp_hr_collective_agreement_salary_table_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE RESTRICT,
  version_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE RESTRICT,

  source_document text NOT NULL,
  source_page text NOT NULL,
  source_excerpt text NOT NULL,
  source_article text NULL,
  source_annex text NULL,
  ocr_raw_text text NULL,

  extraction_method text NOT NULL
    CHECK (extraction_method IN ('ocr','manual_csv','manual_form')),
  approval_mode text NOT NULL
    CHECK (approval_mode IN (
      'ocr_single_human_approval',
      'ocr_dual_human_approval',
      'manual_upload_single_approval',
      'manual_upload_dual_approval'
    )),

  year integer NOT NULL CHECK (year IN (2025,2026,2027)),
  area_code text NULL,
  area_name text NULL,
  professional_group text NOT NULL,
  level text NULL,
  category text NULL,

  concept_literal_from_agreement text NOT NULL,
  normalized_concept_key text NOT NULL,
  payroll_label text NOT NULL,
  payslip_label text NOT NULL,

  cra_mapping_status text NOT NULL DEFAULT 'pending'
    CHECK (cra_mapping_status IN ('pending','suggested','confirmed','not_applicable')),
  cra_code_suggested text NULL,
  taxable_irpf_hint boolean NULL,
  cotization_included_hint boolean NULL,

  salary_base_annual numeric NULL CHECK (salary_base_annual IS NULL OR salary_base_annual >= 0),
  salary_base_monthly numeric NULL CHECK (salary_base_monthly IS NULL OR salary_base_monthly >= 0),
  extra_pay_amount numeric NULL CHECK (extra_pay_amount IS NULL OR extra_pay_amount >= 0),
  plus_convenio_annual numeric NULL CHECK (plus_convenio_annual IS NULL OR plus_convenio_annual >= 0),
  plus_convenio_monthly numeric NULL CHECK (plus_convenio_monthly IS NULL OR plus_convenio_monthly >= 0),
  plus_transport numeric NULL CHECK (plus_transport IS NULL OR plus_transport >= 0),
  plus_antiguedad numeric NULL CHECK (plus_antiguedad IS NULL OR plus_antiguedad >= 0),
  other_amount numeric NULL CHECK (other_amount IS NULL OR other_amount >= 0),
  currency text NOT NULL DEFAULT 'EUR',

  row_confidence text NULL,
  requires_human_review boolean NOT NULL DEFAULT true
    CHECK (requires_human_review = true),
  validation_status text NOT NULL
    CHECK (validation_status IN (
      'ocr_pending_review',
      'manual_pending_review',
      'human_approved_single',
      'human_approved_first',
      'human_approved_second',
      'needs_correction',
      'rejected'
    )),

  first_reviewed_by uuid NULL REFERENCES auth.users(id),
  first_reviewed_at timestamptz NULL,
  second_reviewed_by uuid NULL REFERENCES auth.users(id),
  second_reviewed_at timestamptz NULL,
  review_notes text NULL,

  content_hash text NOT NULL,
  approval_hash text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tic_nac_staging_agreement_version_status
  ON public.erp_hr_collective_agreement_salary_table_staging
  (agreement_id, version_id, validation_status);

CREATE INDEX idx_tic_nac_staging_concept
  ON public.erp_hr_collective_agreement_salary_table_staging
  (agreement_id, version_id, year, normalized_concept_key);

-- Functional unique index that handles NULL columns via COALESCE
CREATE UNIQUE INDEX uq_tic_nac_staging_dedupe
  ON public.erp_hr_collective_agreement_salary_table_staging (
    agreement_id,
    version_id,
    year,
    COALESCE(area_code, ''),
    professional_group,
    COALESCE(level, ''),
    COALESCE(category, ''),
    normalized_concept_key
  );

-- ---------- AUDIT TABLE ----------
CREATE TABLE public.erp_hr_collective_agreement_staging_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_row_id uuid NULL
    REFERENCES public.erp_hr_collective_agreement_salary_table_staging(id) ON DELETE RESTRICT,
  agreement_id uuid NOT NULL,
  version_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN (
    'create',
    'edit',
    'approve_first',
    'approve_second',
    'approve_single',
    'reject',
    'needs_correction'
  )),
  actor_id uuid NULL REFERENCES auth.users(id),
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NULL,
  approval_hash text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tic_nac_staging_audit_row
  ON public.erp_hr_collective_agreement_staging_audit (staging_row_id, created_at DESC);
CREATE INDEX idx_tic_nac_staging_audit_agreement
  ON public.erp_hr_collective_agreement_staging_audit (agreement_id, version_id, created_at DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at on staging
CREATE OR REPLACE FUNCTION public.tic_nac_staging_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tic_nac_staging_updated_at
  BEFORE UPDATE ON public.erp_hr_collective_agreement_salary_table_staging
  FOR EACH ROW EXECUTE FUNCTION public.tic_nac_staging_set_updated_at();

-- enforce_staging_approval_rules
CREATE OR REPLACE FUNCTION public.enforce_staging_approval_rules()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  literal_lower text;
  payslip_lower text;
  kw text;
  keywords text[] := ARRAY[
    'transporte','nocturnidad','festivo','antigüedad',
    'dieta','kilomet','responsabilidad','convenio'
  ];
  approved_states text[] := ARRAY[
    'human_approved_single','human_approved_first','human_approved_second'
  ];
BEGIN
  -- 1) requires_human_review must remain true
  IF NEW.requires_human_review IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'requires_human_review must be true (got %)', NEW.requires_human_review;
  END IF;

  -- 8) OCR rows must have row_confidence
  IF NEW.extraction_method = 'ocr' AND (NEW.row_confidence IS NULL OR length(trim(NEW.row_confidence)) = 0) THEN
    RAISE EXCEPTION 'OCR rows require row_confidence';
  END IF;

  -- 2..5) approved states require traceability fields
  IF NEW.validation_status = ANY(approved_states) THEN
    IF NEW.source_page IS NULL OR length(trim(NEW.source_page)) = 0 THEN
      RAISE EXCEPTION 'approved row requires source_page';
    END IF;
    IF NEW.source_excerpt IS NULL OR length(trim(NEW.source_excerpt)) = 0 THEN
      RAISE EXCEPTION 'approved row requires source_excerpt';
    END IF;
    IF NEW.concept_literal_from_agreement IS NULL OR length(trim(NEW.concept_literal_from_agreement)) = 0 THEN
      RAISE EXCEPTION 'approved row requires concept_literal_from_agreement';
    END IF;
    IF NEW.payslip_label IS NULL OR length(trim(NEW.payslip_label)) = 0 THEN
      RAISE EXCEPTION 'approved row requires payslip_label';
    END IF;
  END IF;

  -- 7) dual mode + second approved must have first_reviewed_by
  IF NEW.validation_status = 'human_approved_second' THEN
    IF NEW.approval_mode NOT IN ('ocr_dual_human_approval','manual_upload_dual_approval') THEN
      RAISE EXCEPTION 'human_approved_second only allowed in dual approval modes';
    END IF;
    IF NEW.first_reviewed_by IS NULL THEN
      RAISE EXCEPTION 'human_approved_second requires first_reviewed_by';
    END IF;
    -- 6) second reviewer must differ from first
    IF NEW.second_reviewed_by IS NULL THEN
      RAISE EXCEPTION 'human_approved_second requires second_reviewed_by';
    END IF;
    IF NEW.second_reviewed_by = NEW.first_reviewed_by THEN
      RAISE EXCEPTION 'second_reviewed_by must differ from first_reviewed_by';
    END IF;
  END IF;

  -- single approved must only happen in single modes
  IF NEW.validation_status = 'human_approved_single'
     AND NEW.approval_mode NOT IN ('ocr_single_human_approval','manual_upload_single_approval') THEN
    RAISE EXCEPTION 'human_approved_single only allowed in single approval modes';
  END IF;

  -- 9) keyword conservation literal -> payslip_label
  literal_lower := lower(coalesce(NEW.concept_literal_from_agreement, ''));
  payslip_lower := lower(coalesce(NEW.payslip_label, ''));
  FOREACH kw IN ARRAY keywords LOOP
    IF position(kw IN literal_lower) > 0 AND position(kw IN payslip_lower) = 0 THEN
      RAISE EXCEPTION 'payslip_label must conserve keyword "%" present in concept_literal_from_agreement', kw;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tic_nac_staging_enforce_approval
  BEFORE INSERT OR UPDATE ON public.erp_hr_collective_agreement_salary_table_staging
  FOR EACH ROW EXECUTE FUNCTION public.enforce_staging_approval_rules();

-- audit append-only
CREATE OR REPLACE FUNCTION public.tic_nac_staging_audit_block_mutations()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'erp_hr_collective_agreement_staging_audit is append-only';
END;
$$;

CREATE TRIGGER trg_tic_nac_staging_audit_no_update
  BEFORE UPDATE ON public.erp_hr_collective_agreement_staging_audit
  FOR EACH ROW EXECUTE FUNCTION public.tic_nac_staging_audit_block_mutations();

CREATE TRIGGER trg_tic_nac_staging_audit_no_delete
  BEFORE DELETE ON public.erp_hr_collective_agreement_staging_audit
  FOR EACH ROW EXECUTE FUNCTION public.tic_nac_staging_audit_block_mutations();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.erp_hr_collective_agreement_salary_table_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_salary_table_staging FORCE ROW LEVEL SECURITY;

ALTER TABLE public.erp_hr_collective_agreement_staging_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_staging_audit FORCE ROW LEVEL SECURITY;

-- Helper inline expression: any of the authorized roles
-- (kept as a SQL expression, not a USING(true))

CREATE POLICY "staging_select_authorized_roles"
  ON public.erp_hr_collective_agreement_salary_table_staging
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
  );

CREATE POLICY "staging_insert_authorized_roles"
  ON public.erp_hr_collective_agreement_salary_table_staging
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
  );

CREATE POLICY "staging_update_authorized_roles"
  ON public.erp_hr_collective_agreement_salary_table_staging
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
  );

-- NO DELETE policy on staging.

-- Audit policies
CREATE POLICY "staging_audit_select_authorized_roles"
  ON public.erp_hr_collective_agreement_staging_audit
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
  );

CREATE POLICY "staging_audit_insert_authorized_roles"
  ON public.erp_hr_collective_agreement_staging_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
  );

-- NO UPDATE / DELETE policy on audit (and triggers also block).

COMMENT ON TABLE public.erp_hr_collective_agreement_salary_table_staging IS
'B11.2C.1 — Staging persistente para tablas salariales TIC-NAC. No es nómina. No activa ready_for_payroll. Filas requieren revisión humana antes de poder ser consumidas por el writer B11.3B.';
COMMENT ON TABLE public.erp_hr_collective_agreement_staging_audit IS
'B11.2C.1 — Auditoría append-only de acciones sobre staging TIC-NAC. Sin UPDATE ni DELETE permitidos.';