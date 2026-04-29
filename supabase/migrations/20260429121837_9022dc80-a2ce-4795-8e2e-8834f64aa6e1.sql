-- ============================================================================
-- B10D.1 — Apply real controlado por empresa del mapping registry
-- 3 tablas append-only + RLS forzado + triggers + índices únicos parciales
-- NO toca: bridge, flag global, tabla operativa, payroll runtime
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLA 1 — apply_requests
-- ----------------------------------------------------------------------------
CREATE TABLE public.erp_hr_company_agreement_registry_apply_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id uuid NOT NULL
    REFERENCES public.erp_hr_company_agreement_registry_mappings(id)
    ON DELETE RESTRICT,
  company_id uuid NOT NULL,
  employee_id uuid NULL,
  contract_id uuid NULL,
  request_status text NOT NULL DEFAULT 'draft'
    CHECK (request_status IN (
      'draft',
      'pending_second_approval',
      'approved_for_runtime',
      'activated',
      'rejected',
      'rolled_back',
      'superseded'
    )),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  second_approved_by uuid NULL REFERENCES auth.users(id),
  second_approved_at timestamptz NULL,
  second_approval_acknowledgements jsonb NOT NULL DEFAULT '{}'::jsonb,
  comparison_report_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  comparison_critical_diffs_count integer NOT NULL DEFAULT 0
    CHECK (comparison_critical_diffs_count >= 0),
  payroll_impact_preview_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  activation_run_id uuid NULL,
  rollback_run_id uuid NULL,
  rejection_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_car_apply_requests_mapping
  ON public.erp_hr_company_agreement_registry_apply_requests(mapping_id);
CREATE INDEX idx_car_apply_requests_company
  ON public.erp_hr_company_agreement_registry_apply_requests(company_id);
CREATE INDEX idx_car_apply_requests_status
  ON public.erp_hr_company_agreement_registry_apply_requests(request_status);
CREATE INDEX idx_car_apply_requests_requested_by
  ON public.erp_hr_company_agreement_registry_apply_requests(requested_by);
CREATE INDEX idx_car_apply_requests_second_by
  ON public.erp_hr_company_agreement_registry_apply_requests(second_approved_by);

-- Una sola request "viva" por mapping
CREATE UNIQUE INDEX uniq_car_apply_request_live_per_mapping
  ON public.erp_hr_company_agreement_registry_apply_requests(mapping_id)
  WHERE request_status IN ('draft','pending_second_approval','approved_for_runtime');

-- ----------------------------------------------------------------------------
-- TABLA 2 — apply_runs (append-only)
-- ----------------------------------------------------------------------------
CREATE TABLE public.erp_hr_company_agreement_registry_apply_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apply_request_id uuid NOT NULL
    REFERENCES public.erp_hr_company_agreement_registry_apply_requests(id)
    ON DELETE RESTRICT,
  mapping_id uuid NOT NULL
    REFERENCES public.erp_hr_company_agreement_registry_mappings(id)
    ON DELETE RESTRICT,
  company_id uuid NOT NULL,
  executed_by uuid NOT NULL REFERENCES auth.users(id),
  executed_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL
    CHECK (outcome IN ('activated','blocked_by_invariant','rolled_back')),
  pre_state_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  post_state_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  invariant_check_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_detail text NULL,
  run_signature_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_car_apply_runs_request
  ON public.erp_hr_company_agreement_registry_apply_runs(apply_request_id);
CREATE INDEX idx_car_apply_runs_mapping
  ON public.erp_hr_company_agreement_registry_apply_runs(mapping_id);
CREATE INDEX idx_car_apply_runs_company
  ON public.erp_hr_company_agreement_registry_apply_runs(company_id);
CREATE INDEX idx_car_apply_runs_outcome
  ON public.erp_hr_company_agreement_registry_apply_runs(outcome);

-- FKs cruzadas (después de existir apply_runs)
ALTER TABLE public.erp_hr_company_agreement_registry_apply_requests
  ADD CONSTRAINT fk_car_apply_requests_activation_run
  FOREIGN KEY (activation_run_id)
  REFERENCES public.erp_hr_company_agreement_registry_apply_runs(id)
  ON DELETE RESTRICT;

ALTER TABLE public.erp_hr_company_agreement_registry_apply_requests
  ADD CONSTRAINT fk_car_apply_requests_rollback_run
  FOREIGN KEY (rollback_run_id)
  REFERENCES public.erp_hr_company_agreement_registry_apply_runs(id)
  ON DELETE RESTRICT;

-- ----------------------------------------------------------------------------
-- TABLA 3 — runtime_settings
-- ----------------------------------------------------------------------------
CREATE TABLE public.erp_hr_company_agreement_registry_runtime_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id uuid NOT NULL
    REFERENCES public.erp_hr_company_agreement_registry_mappings(id)
    ON DELETE RESTRICT,
  company_id uuid NOT NULL,
  employee_id uuid NULL,
  contract_id uuid NULL,
  use_registry_for_payroll boolean NOT NULL DEFAULT true,
  activated_by uuid NOT NULL REFERENCES auth.users(id),
  activated_at timestamptz NOT NULL DEFAULT now(),
  activation_run_id uuid NOT NULL
    REFERENCES public.erp_hr_company_agreement_registry_apply_runs(id)
    ON DELETE RESTRICT,
  rollback_at timestamptz NULL,
  rollback_run_id uuid NULL
    REFERENCES public.erp_hr_company_agreement_registry_apply_runs(id)
    ON DELETE RESTRICT,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_car_runtime_settings_mapping
  ON public.erp_hr_company_agreement_registry_runtime_settings(mapping_id);
CREATE INDEX idx_car_runtime_settings_company
  ON public.erp_hr_company_agreement_registry_runtime_settings(company_id);
CREATE INDEX idx_car_runtime_settings_current
  ON public.erp_hr_company_agreement_registry_runtime_settings(is_current);

-- ≤1 current por scope (empresa+empleado+contrato), normalizando NULLs con UUID centinela
CREATE UNIQUE INDEX uniq_car_runtime_setting_current_per_scope
  ON public.erp_hr_company_agreement_registry_runtime_settings (
    company_id,
    COALESCE(employee_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(contract_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE is_current = true;

-- ============================================================================
-- RLS — habilitar y FORZAR (3 tablas)
-- ============================================================================
ALTER TABLE public.erp_hr_company_agreement_registry_apply_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_company_agreement_registry_apply_requests FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.erp_hr_company_agreement_registry_apply_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_company_agreement_registry_apply_runs FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.erp_hr_company_agreement_registry_runtime_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_company_agreement_registry_runtime_settings FORCE  ROW LEVEL SECURITY;

-- SELECT policies (única superficie de lectura). Sin policies de INSERT/UPDATE/DELETE:
-- las escrituras las hará la edge B10D.3 con service-role tras gates.

CREATE POLICY "car_apply_requests_select_authorized"
  ON public.erp_hr_company_agreement_registry_apply_requests
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_erp_company_access(company_id)
    AND (
      public.has_role(auth.uid(), 'superadmin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'hr_manager'::app_role)
      OR public.has_role(auth.uid(), 'legal_manager'::app_role)
      OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
    )
  );

CREATE POLICY "car_apply_runs_select_authorized"
  ON public.erp_hr_company_agreement_registry_apply_runs
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_erp_company_access(company_id)
    AND (
      public.has_role(auth.uid(), 'superadmin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'hr_manager'::app_role)
      OR public.has_role(auth.uid(), 'legal_manager'::app_role)
      OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
    )
  );

CREATE POLICY "car_runtime_settings_select_authorized"
  ON public.erp_hr_company_agreement_registry_runtime_settings
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_erp_company_access(company_id)
    AND (
      public.has_role(auth.uid(), 'superadmin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'hr_manager'::app_role)
      OR public.has_role(auth.uid(), 'legal_manager'::app_role)
      OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
    )
  );

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- updated_at genérico (reusable)
CREATE OR REPLACE FUNCTION public.tg_car_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- prevent self approval + (cuando aplica) invariantes de second approval
CREATE OR REPLACE FUNCTION public.tg_car_apply_requests_second_approval_invariants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_mapping RECORD;
  v_ack jsonb;
BEGIN
  -- self-approval guard
  IF NEW.second_approved_by IS NOT NULL
     AND NEW.second_approved_by = NEW.requested_by THEN
    RAISE EXCEPTION 'runtime_apply_blocked: self_approval_forbidden';
  END IF;

  IF NEW.request_status = 'approved_for_runtime' THEN
    IF NEW.second_approved_by IS NULL OR NEW.second_approved_at IS NULL THEN
      RAISE EXCEPTION 'runtime_apply_blocked: second_approval_required';
    END IF;

    IF NEW.second_approved_by = NEW.requested_by THEN
      RAISE EXCEPTION 'runtime_apply_blocked: self_approval_forbidden';
    END IF;

    -- second approver role
    IF NOT (
         public.has_role(NEW.second_approved_by, 'superadmin'::app_role)
      OR public.has_role(NEW.second_approved_by, 'admin'::app_role)
      OR public.has_role(NEW.second_approved_by, 'payroll_supervisor'::app_role)
      OR public.has_role(NEW.second_approved_by, 'legal_manager'::app_role)
    ) THEN
      RAISE EXCEPTION 'runtime_apply_blocked: second_approver_role_invalid';
    END IF;

    -- 4 acknowledgements obligatorios
    v_ack := COALESCE(NEW.second_approval_acknowledgements, '{}'::jsonb);
    IF NOT (
         (v_ack->>'understands_runtime_enable')::boolean IS TRUE
      AND (v_ack->>'reviewed_comparison_report')::boolean IS TRUE
      AND (v_ack->>'reviewed_payroll_impact')::boolean IS TRUE
      AND (v_ack->>'confirms_rollback_available')::boolean IS TRUE
    ) THEN
      RAISE EXCEPTION 'runtime_apply_blocked: acknowledgements_incomplete';
    END IF;

    -- comparison sin diffs críticos
    IF NEW.comparison_critical_diffs_count <> 0 THEN
      RAISE EXCEPTION 'runtime_apply_blocked: comparison_critical_diffs_present';
    END IF;

    -- mapping debe estar approved_internal + is_current + approved_*
    SELECT mapping_status, is_current, approved_by, approved_at
      INTO v_mapping
      FROM public.erp_hr_company_agreement_registry_mappings
      WHERE id = NEW.mapping_id;

    IF v_mapping IS NULL THEN
      RAISE EXCEPTION 'runtime_apply_blocked: mapping_not_found';
    END IF;
    IF v_mapping.mapping_status <> 'approved_internal' THEN
      RAISE EXCEPTION 'runtime_apply_blocked: mapping_not_approved_internal';
    END IF;
    IF v_mapping.is_current IS NOT TRUE THEN
      RAISE EXCEPTION 'runtime_apply_blocked: mapping_not_current';
    END IF;
    IF v_mapping.approved_by IS NULL OR v_mapping.approved_at IS NULL THEN
      RAISE EXCEPTION 'runtime_apply_blocked: mapping_missing_internal_approval';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- immutable fields en apply_requests
CREATE OR REPLACE FUNCTION public.tg_car_apply_requests_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.mapping_id    IS DISTINCT FROM OLD.mapping_id    THEN RAISE EXCEPTION 'runtime_apply_immutable_field: mapping_id'; END IF;
  IF NEW.company_id    IS DISTINCT FROM OLD.company_id    THEN RAISE EXCEPTION 'runtime_apply_immutable_field: company_id'; END IF;
  IF NEW.employee_id   IS DISTINCT FROM OLD.employee_id   THEN RAISE EXCEPTION 'runtime_apply_immutable_field: employee_id'; END IF;
  IF NEW.contract_id   IS DISTINCT FROM OLD.contract_id   THEN RAISE EXCEPTION 'runtime_apply_immutable_field: contract_id'; END IF;
  IF NEW.requested_by  IS DISTINCT FROM OLD.requested_by  THEN RAISE EXCEPTION 'runtime_apply_immutable_field: requested_by'; END IF;
  IF NEW.requested_at  IS DISTINCT FROM OLD.requested_at  THEN RAISE EXCEPTION 'runtime_apply_immutable_field: requested_at'; END IF;
  RETURN NEW;
END;
$$;

-- apply_runs: append-only (no UPDATE, no DELETE)
CREATE OR REPLACE FUNCTION public.tg_car_apply_runs_no_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'runtime_apply_runs_append_only';
END;
$$;

-- apply_runs: SHA-256 signature
CREATE OR REPLACE FUNCTION public.tg_car_apply_runs_signature_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.run_signature_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'runtime_apply_invalid_signature_hash';
  END IF;
  RETURN NEW;
END;
$$;

-- runtime_settings: supersede previous current per scope
CREATE OR REPLACE FUNCTION public.tg_car_runtime_settings_supersede_previous()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.erp_hr_company_agreement_registry_runtime_settings AS s
       SET is_current = false,
           updated_at = now()
     WHERE s.id <> NEW.id
       AND s.company_id = NEW.company_id
       AND COALESCE(s.employee_id, '00000000-0000-0000-0000-000000000000'::uuid)
           = COALESCE(NEW.employee_id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND COALESCE(s.contract_id, '00000000-0000-0000-0000-000000000000'::uuid)
           = COALESCE(NEW.contract_id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND s.is_current = true;
  END IF;
  RETURN NEW;
END;
$$;

-- runtime_settings: immutable fields
CREATE OR REPLACE FUNCTION public.tg_car_runtime_settings_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.mapping_id        IS DISTINCT FROM OLD.mapping_id        THEN RAISE EXCEPTION 'runtime_setting_immutable_field: mapping_id'; END IF;
  IF NEW.company_id        IS DISTINCT FROM OLD.company_id        THEN RAISE EXCEPTION 'runtime_setting_immutable_field: company_id'; END IF;
  IF NEW.employee_id       IS DISTINCT FROM OLD.employee_id       THEN RAISE EXCEPTION 'runtime_setting_immutable_field: employee_id'; END IF;
  IF NEW.contract_id       IS DISTINCT FROM OLD.contract_id       THEN RAISE EXCEPTION 'runtime_setting_immutable_field: contract_id'; END IF;
  IF NEW.activation_run_id IS DISTINCT FROM OLD.activation_run_id THEN RAISE EXCEPTION 'runtime_setting_immutable_field: activation_run_id'; END IF;
  IF NEW.activated_by      IS DISTINCT FROM OLD.activated_by      THEN RAISE EXCEPTION 'runtime_setting_immutable_field: activated_by'; END IF;
  IF NEW.activated_at      IS DISTINCT FROM OLD.activated_at      THEN RAISE EXCEPTION 'runtime_setting_immutable_field: activated_at'; END IF;
  RETURN NEW;
END;
$$;

-- runtime_settings: no DELETE
CREATE OR REPLACE FUNCTION public.tg_car_runtime_settings_no_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'runtime_settings_no_delete';
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- apply_requests
CREATE TRIGGER trg_car_apply_requests_updated_at
  BEFORE UPDATE ON public.erp_hr_company_agreement_registry_apply_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_set_updated_at();

CREATE TRIGGER trg_car_apply_requests_second_approval
  BEFORE INSERT OR UPDATE ON public.erp_hr_company_agreement_registry_apply_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_apply_requests_second_approval_invariants();

CREATE TRIGGER trg_car_apply_requests_immutable
  BEFORE UPDATE ON public.erp_hr_company_agreement_registry_apply_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_apply_requests_immutable();

-- apply_runs
CREATE TRIGGER trg_car_apply_runs_signature
  BEFORE INSERT ON public.erp_hr_company_agreement_registry_apply_runs
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_apply_runs_signature_check();

CREATE TRIGGER trg_car_apply_runs_no_update
  BEFORE UPDATE ON public.erp_hr_company_agreement_registry_apply_runs
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_apply_runs_no_update();

CREATE TRIGGER trg_car_apply_runs_no_delete
  BEFORE DELETE ON public.erp_hr_company_agreement_registry_apply_runs
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_apply_runs_no_update();

-- runtime_settings
CREATE TRIGGER trg_car_runtime_settings_updated_at
  BEFORE UPDATE ON public.erp_hr_company_agreement_registry_runtime_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_set_updated_at();

CREATE TRIGGER trg_car_runtime_settings_supersede
  AFTER INSERT OR UPDATE ON public.erp_hr_company_agreement_registry_runtime_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_runtime_settings_supersede_previous();

CREATE TRIGGER trg_car_runtime_settings_immutable
  BEFORE UPDATE ON public.erp_hr_company_agreement_registry_runtime_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_runtime_settings_immutable();

CREATE TRIGGER trg_car_runtime_settings_no_delete
  BEFORE DELETE ON public.erp_hr_company_agreement_registry_runtime_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_runtime_settings_no_delete();