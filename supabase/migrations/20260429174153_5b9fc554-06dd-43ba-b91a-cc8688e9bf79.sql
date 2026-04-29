-- =====================================================================
-- B10F.4 — Registry pilot decision logs (append-only audit table)
-- =====================================================================
-- Separate from erp_hr_company_agreement_registry_apply_runs.outcome on
-- purpose: pilot decisions are an observability concern of the bridge
-- pilot branch (B10F.3) and must NOT pollute the operative apply_runs
-- audit trail. Writes are server-only via the dedicated edge function
-- after JWT + role + company-access checks.
-- =====================================================================

CREATE TABLE public.erp_hr_company_agreement_registry_pilot_decision_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  target_year integer NOT NULL,
  runtime_setting_id uuid NULL REFERENCES public.erp_hr_company_agreement_registry_runtime_settings(id) ON DELETE RESTRICT,
  mapping_id uuid NULL REFERENCES public.erp_hr_company_agreement_registry_mappings(id) ON DELETE RESTRICT,
  registry_agreement_id uuid NULL REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE RESTRICT,
  registry_version_id uuid NULL REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE RESTRICT,
  decision_outcome text NOT NULL,
  decision_reason text NOT NULL,
  comparison_summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  blockers_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  trace_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  decided_by uuid NULL REFERENCES auth.users(id),
  decided_at timestamptz NOT NULL DEFAULT now(),
  signature_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT car_pilot_decision_outcome_check
    CHECK (decision_outcome IN ('pilot_applied','pilot_blocked','pilot_fallback'))
);

-- Indexes
CREATE INDEX idx_car_pilot_decision_logs_company
  ON public.erp_hr_company_agreement_registry_pilot_decision_logs(company_id);
CREATE INDEX idx_car_pilot_decision_logs_employee
  ON public.erp_hr_company_agreement_registry_pilot_decision_logs(employee_id);
CREATE INDEX idx_car_pilot_decision_logs_contract
  ON public.erp_hr_company_agreement_registry_pilot_decision_logs(contract_id);
CREATE INDEX idx_car_pilot_decision_logs_outcome
  ON public.erp_hr_company_agreement_registry_pilot_decision_logs(decision_outcome);
CREATE INDEX idx_car_pilot_decision_logs_decided_at
  ON public.erp_hr_company_agreement_registry_pilot_decision_logs(decided_at DESC);

-- =====================================================================
-- Validation trigger (BEFORE INSERT)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.tg_car_pilot_decision_logs_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.signature_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'pilot_decision_logs_invalid_signature_hash';
  END IF;
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'pilot_decision_logs_company_required';
  END IF;
  IF NEW.employee_id IS NULL THEN
    RAISE EXCEPTION 'pilot_decision_logs_employee_required';
  END IF;
  IF NEW.contract_id IS NULL THEN
    RAISE EXCEPTION 'pilot_decision_logs_contract_required';
  END IF;
  IF NEW.target_year IS NULL OR NEW.target_year <= 0 THEN
    RAISE EXCEPTION 'pilot_decision_logs_invalid_target_year';
  END IF;
  IF NEW.decision_reason IS NULL OR length(NEW.decision_reason) = 0 THEN
    RAISE EXCEPTION 'pilot_decision_logs_reason_required';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_car_pilot_decision_logs_validate
  BEFORE INSERT ON public.erp_hr_company_agreement_registry_pilot_decision_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_car_pilot_decision_logs_validate();

-- =====================================================================
-- Append-only triggers
-- =====================================================================
CREATE OR REPLACE FUNCTION public.tg_car_pilot_decision_logs_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'pilot_decision_logs_append_only';
END;
$$;

CREATE TRIGGER trg_car_pilot_decision_logs_no_update
  BEFORE UPDATE ON public.erp_hr_company_agreement_registry_pilot_decision_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_car_pilot_decision_logs_append_only();

CREATE TRIGGER trg_car_pilot_decision_logs_no_delete
  BEFORE DELETE ON public.erp_hr_company_agreement_registry_pilot_decision_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_car_pilot_decision_logs_append_only();

-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE public.erp_hr_company_agreement_registry_pilot_decision_logs
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_company_agreement_registry_pilot_decision_logs
  FORCE ROW LEVEL SECURITY;

-- SELECT only — no write policies. Writes happen via edge service-role.
CREATE POLICY car_pilot_decision_logs_select_authorized
  ON public.erp_hr_company_agreement_registry_pilot_decision_logs
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_erp_company_access(company_id)
    AND (
      has_role(auth.uid(), 'superadmin'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'hr_manager'::app_role)
      OR has_role(auth.uid(), 'legal_manager'::app_role)
      OR has_role(auth.uid(), 'payroll_supervisor'::app_role)
      OR has_role(auth.uid(), 'auditor'::app_role)
    )
  );

COMMENT ON TABLE public.erp_hr_company_agreement_registry_pilot_decision_logs IS
  'B10F.4 — Append-only audit log for registry pilot payroll decisions. Separate from apply_runs.outcome by design. Writes server-only via edge erp-hr-pilot-runtime-decision-log.';
