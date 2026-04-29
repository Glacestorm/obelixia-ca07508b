-- =============================================================
-- B8A — Collective Agreements Human Validation Workflow
-- =============================================================
-- Adds three registry-side tables to record human validation,
-- granular checklist items, and an append-only signature ledger.
--
-- HARD SAFETY: This migration MUST NOT touch:
--   - erp_hr_collective_agreements (operational)
--   - registry's ready_for_payroll / data_completeness /
--     salary_tables_loaded / requires_human_review
-- These guarantees are enforced by code (no UPDATE statements
-- against those tables here) and by the trigger 4.6 below.
-- =============================================================

-- 1. validations -----------------------------------------------
CREATE TABLE public.erp_hr_collective_agreement_registry_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE CASCADE,
  version_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE CASCADE,
  source_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry_sources(id) ON DELETE RESTRICT,
  sha256_hash text NOT NULL,
  validator_user_id uuid NOT NULL REFERENCES auth.users(id),
  validator_role text NOT NULL,
  validator_company_id uuid NULL,
  validation_status text NOT NULL DEFAULT 'draft',
  validation_scope text[] NOT NULL DEFAULT '{}',
  checklist_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  unresolved_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolved_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  signature_hash text,
  signature_algorithm text NOT NULL DEFAULT 'sha256-canonical-v1',
  previous_validation_id uuid
    REFERENCES public.erp_hr_collective_agreement_registry_validations(id),
  is_current boolean NOT NULL DEFAULT false,
  triggered_by_import_run_id uuid
    REFERENCES public.erp_hr_collective_agreements_registry_import_runs(id),
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_validations_status CHECK (
    validation_status IN ('draft','pending_review','approved_internal','rejected','superseded')
  ),
  CONSTRAINT chk_validations_scope CHECK (
    validation_scope <@ ARRAY['metadata','salary_tables','rules','full_payroll_readiness']::text[]
  )
);

CREATE INDEX idx_car_validations_agreement ON public.erp_hr_collective_agreement_registry_validations(agreement_id);
CREATE INDEX idx_car_validations_version   ON public.erp_hr_collective_agreement_registry_validations(version_id);
CREATE INDEX idx_car_validations_status    ON public.erp_hr_collective_agreement_registry_validations(validation_status);
CREATE UNIQUE INDEX uniq_car_validations_current
  ON public.erp_hr_collective_agreement_registry_validations(agreement_id, version_id)
  WHERE is_current = true;

-- 2. validation_items ------------------------------------------
CREATE TABLE public.erp_hr_collective_agreement_registry_validation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreement_registry_validations(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_status text NOT NULL DEFAULT 'pending',
  evidence_url text,
  evidence_excerpt text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_validation_items_status CHECK (
    item_status IN ('pending','verified','accepted_with_caveat','rejected','not_applicable')
  )
);

CREATE UNIQUE INDEX uniq_car_validation_items_key
  ON public.erp_hr_collective_agreement_registry_validation_items(validation_id, item_key);

-- 3. validation_signatures (append-only) -----------------------
CREATE TABLE public.erp_hr_collective_agreement_registry_validation_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreement_registry_validations(id) ON DELETE CASCADE,
  signed_at timestamptz NOT NULL DEFAULT now(),
  signed_by uuid NOT NULL REFERENCES auth.users(id),
  signed_by_role text NOT NULL,
  signature_hash text NOT NULL,
  payload_canonical jsonb NOT NULL,
  algorithm text NOT NULL DEFAULT 'sha256-canonical-v1',
  previous_signature_id uuid
    REFERENCES public.erp_hr_collective_agreement_registry_validation_signatures(id)
);

CREATE INDEX idx_car_validation_signatures_validation
  ON public.erp_hr_collective_agreement_registry_validation_signatures(validation_id);

-- =============================================================
-- 4. Triggers
-- =============================================================

-- 4.1 updated_at
CREATE TRIGGER trg_car_validations_updated_at
BEFORE UPDATE ON public.erp_hr_collective_agreement_registry_validations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_car_validation_items_updated_at
BEFORE UPDATE ON public.erp_hr_collective_agreement_registry_validation_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4.2 SHA-256 / signature_hash format + approval requirements
CREATE OR REPLACE FUNCTION public.car_validations_enforce_invariants()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.sha256_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'CAR_VALIDATIONS_INVALID_SHA256';
  END IF;

  IF NEW.signature_hash IS NOT NULL
     AND NEW.signature_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'CAR_VALIDATIONS_INVALID_SIGNATURE_HASH';
  END IF;

  IF NEW.validation_status IN ('approved_internal','rejected') THEN
    IF NEW.signature_hash IS NULL THEN
      RAISE EXCEPTION 'CAR_VALIDATIONS_SIGNATURE_REQUIRED';
    END IF;
    IF NEW.validated_at IS NULL THEN
      RAISE EXCEPTION 'CAR_VALIDATIONS_VALIDATED_AT_REQUIRED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_car_validations_enforce_invariants
BEFORE INSERT OR UPDATE ON public.erp_hr_collective_agreement_registry_validations
FOR EACH ROW EXECUTE FUNCTION public.car_validations_enforce_invariants();

-- 4.3 Signature immutability (append-only)
CREATE OR REPLACE FUNCTION public.car_validation_signatures_block_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'CAR_VALIDATION_SIGNATURES_ARE_APPEND_ONLY';
END;
$$;

CREATE TRIGGER trg_car_validation_signatures_no_update
BEFORE UPDATE ON public.erp_hr_collective_agreement_registry_validation_signatures
FOR EACH ROW EXECUTE FUNCTION public.car_validation_signatures_block_mutation();

CREATE TRIGGER trg_car_validation_signatures_no_delete
BEFORE DELETE ON public.erp_hr_collective_agreement_registry_validation_signatures
FOR EACH ROW EXECUTE FUNCTION public.car_validation_signatures_block_mutation();

CREATE OR REPLACE FUNCTION public.car_validation_signatures_enforce_format()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.signature_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'CAR_VALIDATION_SIGNATURES_INVALID_HASH';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_car_validation_signatures_format
BEFORE INSERT ON public.erp_hr_collective_agreement_registry_validation_signatures
FOR EACH ROW EXECUTE FUNCTION public.car_validation_signatures_enforce_format();

-- 4.5 Supersede previous current validation when a new one is set current
CREATE OR REPLACE FUNCTION public.car_validations_supersede_previous()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.erp_hr_collective_agreement_registry_validations
       SET is_current = false,
           validation_status = CASE
             WHEN validation_status IN ('approved_internal','rejected') THEN 'superseded'
             ELSE validation_status
           END,
           updated_at = now()
     WHERE agreement_id = NEW.agreement_id
       AND version_id = NEW.version_id
       AND id <> NEW.id
       AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_car_validations_supersede
AFTER INSERT OR UPDATE OF is_current
ON public.erp_hr_collective_agreement_registry_validations
FOR EACH ROW EXECUTE FUNCTION public.car_validations_supersede_previous();

-- =============================================================
-- 5. RLS
-- =============================================================
ALTER TABLE public.erp_hr_collective_agreement_registry_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_registry_validation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_registry_validation_signatures ENABLE ROW LEVEL SECURITY;

-- Helper: authorized read roles
-- (uses existing public.has_role(uuid, app_role))

-- 5.1 Read policies (validations)
CREATE POLICY "car_validations_read_authorized"
ON public.erp_hr_collective_agreement_registry_validations
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::app_role)
  OR public.has_role(auth.uid(), 'legal_manager'::app_role)
  OR public.has_role(auth.uid(), 'auditor'::app_role)
);

-- 5.2 Insert (validations) — only as draft/pending_review for self
CREATE POLICY "car_validations_insert_self_draft"
ON public.erp_hr_collective_agreement_registry_validations
FOR INSERT TO authenticated
WITH CHECK (
  validator_user_id = auth.uid()
  AND validation_status IN ('draft','pending_review')
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::app_role)
  )
);

-- 5.3 Update (validations) — owner, only stays in draft/pending_review
CREATE POLICY "car_validations_update_self_draft"
ON public.erp_hr_collective_agreement_registry_validations
FOR UPDATE TO authenticated
USING (
  validator_user_id = auth.uid()
  AND validation_status IN ('draft','pending_review')
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::app_role)
  )
)
WITH CHECK (
  validator_user_id = auth.uid()
  AND validation_status IN ('draft','pending_review')
);

-- (No client DELETE policy.)

-- 5.4 Read (items)
CREATE POLICY "car_validation_items_read_authorized"
ON public.erp_hr_collective_agreement_registry_validation_items
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::app_role)
  OR public.has_role(auth.uid(), 'legal_manager'::app_role)
  OR public.has_role(auth.uid(), 'auditor'::app_role)
);

-- 5.5 Insert/Update (items) — only on parent validations owned and editable
CREATE POLICY "car_validation_items_insert_owned_editable"
ON public.erp_hr_collective_agreement_registry_validation_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.erp_hr_collective_agreement_registry_validations v
    WHERE v.id = validation_id
      AND v.validator_user_id = auth.uid()
      AND v.validation_status IN ('draft','pending_review')
  )
);

CREATE POLICY "car_validation_items_update_owned_editable"
ON public.erp_hr_collective_agreement_registry_validation_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.erp_hr_collective_agreement_registry_validations v
    WHERE v.id = validation_id
      AND v.validator_user_id = auth.uid()
      AND v.validation_status IN ('draft','pending_review')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.erp_hr_collective_agreement_registry_validations v
    WHERE v.id = validation_id
      AND v.validator_user_id = auth.uid()
      AND v.validation_status IN ('draft','pending_review')
  )
);

-- 5.6 Signatures — read-only for authorized roles; no INSERT/UPDATE/DELETE policy
CREATE POLICY "car_validation_signatures_read_authorized"
ON public.erp_hr_collective_agreement_registry_validation_signatures
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::app_role)
  OR public.has_role(auth.uid(), 'legal_manager'::app_role)
  OR public.has_role(auth.uid(), 'auditor'::app_role)
);
-- INSERT only by service_role / future admin-gated edge function.