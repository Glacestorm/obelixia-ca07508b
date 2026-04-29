-- =====================================================================
-- B8B — Activation requests / approvals / runs for Collective Agreements
-- =====================================================================

-- 1) ACTIVATION REQUESTS
CREATE TABLE public.erp_hr_collective_agreement_registry_activation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE CASCADE,
  version_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE CASCADE,
  validation_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreement_registry_validations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_role text NOT NULL,
  readiness_report_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  readiness_passed boolean NOT NULL DEFAULT false,
  activation_status text NOT NULL DEFAULT 'draft',
  request_signature_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_b8b_req_status CHECK (
    activation_status IN ('draft','pending_second_approval','approved_for_activation','rejected','superseded')
  ),
  CONSTRAINT chk_b8b_req_sig_format CHECK (
    request_signature_hash ~ '^[a-f0-9]{64}$'
  )
);

CREATE INDEX idx_b8b_req_agreement  ON public.erp_hr_collective_agreement_registry_activation_requests(agreement_id);
CREATE INDEX idx_b8b_req_status     ON public.erp_hr_collective_agreement_registry_activation_requests(activation_status);
CREATE INDEX idx_b8b_req_validation ON public.erp_hr_collective_agreement_registry_activation_requests(validation_id);

CREATE UNIQUE INDEX uniq_b8b_live_request_per_agreement
  ON public.erp_hr_collective_agreement_registry_activation_requests(agreement_id)
  WHERE activation_status IN ('draft','pending_second_approval','approved_for_activation');

-- 2) ACTIVATION APPROVALS (append-only)
CREATE TABLE public.erp_hr_collective_agreement_registry_activation_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreement_registry_activation_requests(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES auth.users(id),
  approver_role text NOT NULL,
  decision text NOT NULL,
  decision_reason text,
  activation_checklist_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_signature_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_b8b_appr_decision CHECK (decision IN ('approved','rejected')),
  CONSTRAINT chk_b8b_appr_role CHECK (
    approver_role IN ('admin','superadmin','payroll_supervisor','legal_manager')
  ),
  CONSTRAINT chk_b8b_appr_sig_format CHECK (
    approval_signature_hash ~ '^[a-f0-9]{64}$'
  )
);

CREATE INDEX idx_b8b_appr_request ON public.erp_hr_collective_agreement_registry_activation_approvals(request_id);

-- 3) ACTIVATION RUNS (append-only; B9 future)
CREATE TABLE public.erp_hr_collective_agreement_registry_activation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.erp_hr_collective_agreement_registry_activation_requests(id) ON DELETE SET NULL,
  agreement_id uuid REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE SET NULL,
  version_id uuid REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE SET NULL,
  validation_id uuid REFERENCES public.erp_hr_collective_agreement_registry_validations(id) ON DELETE SET NULL,
  executed_by uuid REFERENCES auth.users(id),
  executed_at timestamptz,
  pre_state_snapshot_json jsonb,
  post_state_snapshot_json jsonb,
  outcome text,
  error_detail text,
  run_signature_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_b8b_run_outcome CHECK (
    outcome IS NULL OR outcome IN ('activated','blocked_by_trigger','blocked_by_invariant','rolled_back')
  )
);

CREATE INDEX idx_b8b_run_request   ON public.erp_hr_collective_agreement_registry_activation_runs(request_id);
CREATE INDEX idx_b8b_run_agreement ON public.erp_hr_collective_agreement_registry_activation_runs(agreement_id);

-- ===================== TRIGGERS =====================

CREATE OR REPLACE FUNCTION public.tg_b8b_requests_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_b8b_requests_updated_at
BEFORE UPDATE ON public.erp_hr_collective_agreement_registry_activation_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_b8b_requests_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_b8b_approvals_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_requested_by uuid;
BEGIN
  SELECT requested_by INTO v_requested_by
  FROM public.erp_hr_collective_agreement_registry_activation_requests
  WHERE id = NEW.request_id;

  IF v_requested_by IS NULL THEN
    RAISE EXCEPTION 'B8B approval: request % not found', NEW.request_id;
  END IF;

  IF v_requested_by = NEW.approver_id THEN
    RAISE EXCEPTION 'B8B approval: approver_id (%) must differ from requested_by (%)',
      NEW.approver_id, v_requested_by;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_b8b_approvals_insert_guard
BEFORE INSERT ON public.erp_hr_collective_agreement_registry_activation_approvals
FOR EACH ROW EXECUTE FUNCTION public.tg_b8b_approvals_insert_guard();

CREATE OR REPLACE FUNCTION public.tg_b8b_approvals_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'B8B approvals are append-only (% on %)', TG_OP, TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER trg_b8b_approvals_no_update
BEFORE UPDATE ON public.erp_hr_collective_agreement_registry_activation_approvals
FOR EACH ROW EXECUTE FUNCTION public.tg_b8b_approvals_append_only();

CREATE TRIGGER trg_b8b_approvals_no_delete
BEFORE DELETE ON public.erp_hr_collective_agreement_registry_activation_approvals
FOR EACH ROW EXECUTE FUNCTION public.tg_b8b_approvals_append_only();

CREATE OR REPLACE FUNCTION public.tg_b8b_runs_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'B8B activation runs are append-only (% on %)', TG_OP, TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER trg_b8b_runs_no_update
BEFORE UPDATE ON public.erp_hr_collective_agreement_registry_activation_runs
FOR EACH ROW EXECUTE FUNCTION public.tg_b8b_runs_append_only();

CREATE TRIGGER trg_b8b_runs_no_delete
BEFORE DELETE ON public.erp_hr_collective_agreement_registry_activation_runs
FOR EACH ROW EXECUTE FUNCTION public.tg_b8b_runs_append_only();

CREATE OR REPLACE FUNCTION public.tg_b8b_requests_decided_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.activation_status IN ('approved_for_activation','rejected','superseded') THEN
    IF NEW.readiness_report_json IS DISTINCT FROM OLD.readiness_report_json THEN
      RAISE EXCEPTION 'B8B request %: readiness_report_json is immutable after decision (status=%)',
        OLD.id, OLD.activation_status;
    END IF;
    IF NEW.request_signature_hash IS DISTINCT FROM OLD.request_signature_hash THEN
      RAISE EXCEPTION 'B8B request %: request_signature_hash is immutable after decision', OLD.id;
    END IF;
    IF NEW.readiness_passed IS DISTINCT FROM OLD.readiness_passed THEN
      RAISE EXCEPTION 'B8B request %: readiness_passed is immutable after decision', OLD.id;
    END IF;
    IF NEW.validation_id IS DISTINCT FROM OLD.validation_id
       OR NEW.version_id IS DISTINCT FROM OLD.version_id
       OR NEW.agreement_id IS DISTINCT FROM OLD.agreement_id
       OR NEW.requested_by IS DISTINCT FROM OLD.requested_by THEN
      RAISE EXCEPTION 'B8B request %: identity fields are immutable after decision', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_b8b_requests_decided_immutable
BEFORE UPDATE ON public.erp_hr_collective_agreement_registry_activation_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_b8b_requests_decided_immutable();

-- ===================== RLS =====================
ALTER TABLE public.erp_hr_collective_agreement_registry_activation_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_registry_activation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_registry_activation_runs     ENABLE ROW LEVEL SECURITY;

CREATE POLICY b8b_req_select_authorized
ON public.erp_hr_collective_agreement_registry_activation_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::app_role)
  OR public.has_role(auth.uid(), 'legal_manager'::app_role)
  OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
  OR public.has_role(auth.uid(), 'auditor'::app_role)
);

CREATE POLICY b8b_appr_select_authorized
ON public.erp_hr_collective_agreement_registry_activation_approvals
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::app_role)
  OR public.has_role(auth.uid(), 'legal_manager'::app_role)
  OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
  OR public.has_role(auth.uid(), 'auditor'::app_role)
);

CREATE POLICY b8b_runs_select_authorized
ON public.erp_hr_collective_agreement_registry_activation_runs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::app_role)
  OR public.has_role(auth.uid(), 'legal_manager'::app_role)
  OR public.has_role(auth.uid(), 'payroll_supervisor'::app_role)
  OR public.has_role(auth.uid(), 'auditor'::app_role)
);
-- No INSERT/UPDATE/DELETE policies for authenticated. Writes via service role.
