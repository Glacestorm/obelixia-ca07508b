
-- =============================================================================
-- B10C.2B.1 — erp_hr_company_agreement_registry_mappings
-- Persistence-only mapping table. Not consumed by payroll.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.erp_hr_company_agreement_registry_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NULL,
  contract_id uuid NULL,
  registry_agreement_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry(id)
    ON DELETE RESTRICT,
  registry_version_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry_versions(id)
    ON DELETE RESTRICT,
  source_type text NOT NULL
    CHECK (source_type IN (
      'manual_selection',
      'cnae_suggestion',
      'legacy_operational_match',
      'imported_mapping'
    )),
  mapping_status text NOT NULL DEFAULT 'draft'
    CHECK (mapping_status IN (
      'draft',
      'pending_review',
      'approved_internal',
      'rejected',
      'superseded'
    )),
  confidence_score numeric(5,2) NULL
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
  rationale_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_urls text[] NOT NULL DEFAULT '{}'::text[],
  is_current boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_car_mappings_company_id
  ON public.erp_hr_company_agreement_registry_mappings (company_id);

CREATE INDEX IF NOT EXISTS idx_car_mappings_registry_agreement_id
  ON public.erp_hr_company_agreement_registry_mappings (registry_agreement_id);

CREATE INDEX IF NOT EXISTS idx_car_mappings_mapping_status
  ON public.erp_hr_company_agreement_registry_mappings (mapping_status);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_car_mappings_current_per_scope
  ON public.erp_hr_company_agreement_registry_mappings (
    company_id,
    COALESCE(employee_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(contract_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE is_current = true;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.erp_hr_company_agreement_registry_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_company_agreement_registry_mappings FORCE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "car_mappings_select_authorized"
ON public.erp_hr_company_agreement_registry_mappings
FOR SELECT
TO authenticated
USING (
  public.user_has_erp_company_access(company_id)
  AND (
       public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  )
);

-- INSERT
CREATE POLICY "car_mappings_insert_authorized"
ON public.erp_hr_company_agreement_registry_mappings
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.user_has_erp_company_access(company_id)
  AND (
       public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  )
);

-- UPDATE — both USING and WITH CHECK include role authorization
CREATE POLICY "car_mappings_update_authorized"
ON public.erp_hr_company_agreement_registry_mappings
FOR UPDATE
TO authenticated
USING (
  public.user_has_erp_company_access(company_id)
  AND (
       public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  )
)
WITH CHECK (
  public.user_has_erp_company_access(company_id)
  AND (
       public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  )
);

-- NOTE: No DELETE policy — append-only.

-- =============================================================================
-- Trigger 1: updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tg_car_mappings_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_car_mappings_updated_at
BEFORE UPDATE ON public.erp_hr_company_agreement_registry_mappings
FOR EACH ROW EXECUTE FUNCTION public.tg_car_mappings_set_updated_at();

-- =============================================================================
-- Trigger 2: enforce_approval_invariants
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tg_car_mappings_enforce_approval_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement RECORD;
  v_version RECORD;
  v_approver_authorized boolean;
BEGIN
  IF NEW.mapping_status = 'approved_internal' THEN
    IF NEW.approved_by IS NULL THEN
      RAISE EXCEPTION 'mapping_approval_blocked: approved_by is required for approved_internal';
    END IF;

    IF NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'mapping_approval_blocked: approved_at is required for approved_internal';
    END IF;

    SELECT (
         public.has_role(NEW.approved_by, 'superadmin'::public.app_role)
      OR public.has_role(NEW.approved_by, 'admin'::public.app_role)
      OR public.has_role(NEW.approved_by, 'hr_manager'::public.app_role)
      OR public.has_role(NEW.approved_by, 'legal_manager'::public.app_role)
      OR public.has_role(NEW.approved_by, 'payroll_supervisor'::public.app_role)
    ) INTO v_approver_authorized;

    IF NOT v_approver_authorized THEN
      RAISE EXCEPTION 'mapping_approval_blocked: approved_by lacks an authorized role';
    END IF;

    SELECT id, ready_for_payroll, requires_human_review, data_completeness, source_quality
    INTO v_agreement
    FROM public.erp_hr_collective_agreements_registry
    WHERE id = NEW.registry_agreement_id;

    IF v_agreement.id IS NULL THEN
      RAISE EXCEPTION 'mapping_approval_blocked: registry agreement not found';
    END IF;

    IF v_agreement.ready_for_payroll IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'mapping_approval_blocked: registry agreement is not ready_for_payroll';
    END IF;

    IF v_agreement.requires_human_review IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'mapping_approval_blocked: registry agreement requires_human_review';
    END IF;

    IF v_agreement.data_completeness IS DISTINCT FROM 'human_validated' THEN
      RAISE EXCEPTION 'mapping_approval_blocked: registry agreement data_completeness must be human_validated';
    END IF;

    IF v_agreement.source_quality IS DISTINCT FROM 'official' THEN
      RAISE EXCEPTION 'mapping_approval_blocked: registry agreement source_quality must be official';
    END IF;

    SELECT id, agreement_id, is_current
    INTO v_version
    FROM public.erp_hr_collective_agreements_registry_versions
    WHERE id = NEW.registry_version_id;

    IF v_version.id IS NULL THEN
      RAISE EXCEPTION 'mapping_approval_blocked: registry version not found';
    END IF;

    IF v_version.agreement_id IS DISTINCT FROM NEW.registry_agreement_id THEN
      RAISE EXCEPTION 'mapping_approval_blocked: registry version does not belong to registry agreement';
    END IF;

    IF v_version.is_current IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'mapping_approval_blocked: registry version is not current';
    END IF;

    IF NEW.source_type = 'cnae_suggestion' THEN
      -- Already validated approved_by is present and authorized above.
      -- This branch makes the no-auto-approval rule explicit.
      IF NEW.approved_by IS NULL OR NOT v_approver_authorized THEN
        RAISE EXCEPTION 'mapping_approval_blocked: cnae_suggestion requires authorized human approver';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_car_mappings_enforce_approval
BEFORE INSERT OR UPDATE ON public.erp_hr_company_agreement_registry_mappings
FOR EACH ROW EXECUTE FUNCTION public.tg_car_mappings_enforce_approval_invariants();

-- =============================================================================
-- Trigger 3: supersede_previous_current
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tg_car_mappings_supersede_previous_current()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.erp_hr_company_agreement_registry_mappings
    SET is_current = false,
        mapping_status = 'superseded',
        updated_at = now()
    WHERE id <> NEW.id
      AND company_id = NEW.company_id
      AND COALESCE(employee_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(NEW.employee_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(contract_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(NEW.contract_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_car_mappings_supersede_previous
AFTER INSERT OR UPDATE ON public.erp_hr_company_agreement_registry_mappings
FOR EACH ROW EXECUTE FUNCTION public.tg_car_mappings_supersede_previous_current();

-- =============================================================================
-- Trigger 4: block_destructive_changes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tg_car_mappings_block_destructive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.registry_agreement_id IS DISTINCT FROM OLD.registry_agreement_id THEN
    RAISE EXCEPTION 'mapping_immutable_field: registry_agreement_id cannot be changed; insert a new row';
  END IF;
  IF NEW.registry_version_id IS DISTINCT FROM OLD.registry_version_id THEN
    RAISE EXCEPTION 'mapping_immutable_field: registry_version_id cannot be changed; insert a new row';
  END IF;
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'mapping_immutable_field: company_id cannot be changed; insert a new row';
  END IF;
  IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
    RAISE EXCEPTION 'mapping_immutable_field: employee_id cannot be changed; insert a new row';
  END IF;
  IF NEW.contract_id IS DISTINCT FROM OLD.contract_id THEN
    RAISE EXCEPTION 'mapping_immutable_field: contract_id cannot be changed; insert a new row';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_car_mappings_block_destructive
BEFORE UPDATE ON public.erp_hr_company_agreement_registry_mappings
FOR EACH ROW EXECUTE FUNCTION public.tg_car_mappings_block_destructive_changes();
