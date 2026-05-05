
-- =============================================================================
-- B13.5B — Agreement Impact Previews (informational, never applied to payroll)
-- =============================================================================

-- 1) AFFECTED SCOPES ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.erp_hr_collective_agreement_affected_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE RESTRICT,
  version_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL,
  employee_count_estimated integer NOT NULL DEFAULT 0
    CHECK (employee_count_estimated >= 0),
  cnae_match boolean NOT NULL DEFAULT false,
  territory_match boolean NOT NULL DEFAULT false,
  runtime_setting_required boolean NOT NULL DEFAULT true,
  computed_at timestamptz NOT NULL DEFAULT now(),
  computed_by uuid NULL,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  blockers_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_affected_scopes_agreement_version
  ON public.erp_hr_collective_agreement_affected_scopes (agreement_id, version_id);
CREATE INDEX IF NOT EXISTS idx_agreement_affected_scopes_company
  ON public.erp_hr_collective_agreement_affected_scopes (company_id);
CREATE INDEX IF NOT EXISTS idx_agreement_affected_scopes_computed_at
  ON public.erp_hr_collective_agreement_affected_scopes (computed_at);

ALTER TABLE public.erp_hr_collective_agreement_affected_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_affected_scopes FORCE ROW LEVEL SECURITY;

CREATE POLICY "agr_affected_scopes_select_authorized"
ON public.erp_hr_collective_agreement_affected_scopes
FOR SELECT TO authenticated
USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "agr_affected_scopes_insert_authorized"
ON public.erp_hr_collective_agreement_affected_scopes
FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_erp_company_access(company_id)
  AND (
       public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  )
);

CREATE POLICY "agr_affected_scopes_update_authorized"
ON public.erp_hr_collective_agreement_affected_scopes
FOR UPDATE TO authenticated
USING (
  public.user_has_erp_company_access(company_id)
  AND (
       public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  )
)
WITH CHECK (
  public.user_has_erp_company_access(company_id)
  AND (
       public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  )
);

-- NOTE: No DELETE policy — append-only.

-- 2) IMPACT PREVIEWS ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.erp_hr_collective_agreement_impact_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affected_scope_id uuid NULL
    REFERENCES public.erp_hr_collective_agreement_affected_scopes(id) ON DELETE RESTRICT,
  agreement_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE RESTRICT,
  version_id uuid NOT NULL
    REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  contract_id uuid NULL,
  mapping_id uuid NULL
    REFERENCES public.erp_hr_company_agreement_registry_mappings(id) ON DELETE RESTRICT,
  runtime_setting_id uuid NULL
    REFERENCES public.erp_hr_company_agreement_registry_runtime_settings(id) ON DELETE RESTRICT,
  matched_salary_table_id uuid NULL
    REFERENCES public.erp_hr_collective_agreements_registry_salary_tables(id) ON DELETE RESTRICT,
  affected boolean NOT NULL DEFAULT false,
  blocked boolean NOT NULL DEFAULT false,
  current_salary_monthly numeric NULL,
  current_salary_annual numeric NULL,
  target_salary_monthly numeric NULL,
  target_salary_annual numeric NULL,
  delta_monthly numeric NULL,
  delta_annual numeric NULL,
  arrears_estimate numeric NULL,
  employer_cost_delta numeric NULL,
  concepts_detected jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  blockers_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_trace jsonb NOT NULL DEFAULT '{}'::jsonb,
  requires_human_review boolean NOT NULL DEFAULT true
    CHECK (requires_human_review = true),
  computed_at timestamptz NOT NULL DEFAULT now(),
  computed_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_impact_previews_agreement_version
  ON public.erp_hr_collective_agreement_impact_previews (agreement_id, version_id);
CREATE INDEX IF NOT EXISTS idx_agreement_impact_previews_company
  ON public.erp_hr_collective_agreement_impact_previews (company_id);
CREATE INDEX IF NOT EXISTS idx_agreement_impact_previews_employee
  ON public.erp_hr_collective_agreement_impact_previews (employee_id);
CREATE INDEX IF NOT EXISTS idx_agreement_impact_previews_contract
  ON public.erp_hr_collective_agreement_impact_previews (contract_id);
CREATE INDEX IF NOT EXISTS idx_agreement_impact_previews_scope
  ON public.erp_hr_collective_agreement_impact_previews (affected_scope_id);
CREATE INDEX IF NOT EXISTS idx_agreement_impact_previews_computed_at
  ON public.erp_hr_collective_agreement_impact_previews (computed_at);

ALTER TABLE public.erp_hr_collective_agreement_impact_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_impact_previews FORCE ROW LEVEL SECURITY;

CREATE POLICY "agr_impact_previews_select_authorized"
ON public.erp_hr_collective_agreement_impact_previews
FOR SELECT TO authenticated
USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "agr_impact_previews_insert_authorized"
ON public.erp_hr_collective_agreement_impact_previews
FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_erp_company_access(company_id)
  AND (
       public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  )
);

CREATE POLICY "agr_impact_previews_update_authorized"
ON public.erp_hr_collective_agreement_impact_previews
FOR UPDATE TO authenticated
USING (
  public.user_has_erp_company_access(company_id)
  AND (
       public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  )
)
WITH CHECK (
  public.user_has_erp_company_access(company_id)
  AND (
       public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
  )
);

-- NOTE: No DELETE policy — append-only.

-- 3) updated_at TRIGGERS ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_agreement_impact_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agr_affected_scopes_updated_at
BEFORE UPDATE ON public.erp_hr_collective_agreement_affected_scopes
FOR EACH ROW EXECUTE FUNCTION public.tg_agreement_impact_set_updated_at();

CREATE TRIGGER trg_agr_impact_previews_updated_at
BEFORE UPDATE ON public.erp_hr_collective_agreement_impact_previews
FOR EACH ROW EXECUTE FUNCTION public.tg_agreement_impact_set_updated_at();

-- 4) ANTI-ACTIVATION GUARD TRIGGERS ------------------------------------------
-- Reject any JSON / textual payload that tries to include payroll-activation
-- flags or operative artifacts (CRA/SILTRA/SEPA/accounting). Also enforce
-- requires_human_review = true on the previews table.

CREATE OR REPLACE FUNCTION public.tg_agreement_impact_block_activation_keys()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_blob text;
  v_forbidden text[] := ARRAY[
    'ready_for_payroll',
    'salary_tables_loaded',
    'human_validated',
    'data_completeness',
    'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
    'HR_REGISTRY_PILOT_MODE',
    'REGISTRY_PILOT_SCOPE_ALLOWLIST',
    'use_registry_for_payroll',
    'activation_run_id',
    'runtime_setting',
    'payroll_apply',
    'apply_to_payroll',
    'human_approved_single',
    'human_approved_first',
    'human_approved_second',
    'cra_file',
    'siltra_file',
    'sepa_file',
    'accounting_entry'
  ];
  k text;
BEGIN
  v_blob := COALESCE(NEW.summary_json::text, '{}')
         || COALESCE(NEW.risk_flags::text, '[]')
         || COALESCE(NEW.blockers_json::text, '[]')
         || COALESCE(NEW.warnings_json::text, '[]');
  FOREACH k IN ARRAY v_forbidden LOOP
    IF v_blob ILIKE '%"' || k || '"%' THEN
      RAISE EXCEPTION 'agreement_impact_blocked: forbidden activation key % present', k;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agr_affected_scopes_block_activation
BEFORE INSERT OR UPDATE ON public.erp_hr_collective_agreement_affected_scopes
FOR EACH ROW EXECUTE FUNCTION public.tg_agreement_impact_block_activation_keys();

CREATE OR REPLACE FUNCTION public.tg_agreement_impact_previews_guard()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_blob text;
  v_forbidden text[] := ARRAY[
    'ready_for_payroll',
    'salary_tables_loaded',
    'human_validated',
    'data_completeness',
    'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
    'HR_REGISTRY_PILOT_MODE',
    'REGISTRY_PILOT_SCOPE_ALLOWLIST',
    'use_registry_for_payroll',
    'activation_run_id',
    'runtime_setting',
    'payroll_apply',
    'apply_to_payroll',
    'human_approved_single',
    'human_approved_first',
    'human_approved_second',
    'cra_file',
    'siltra_file',
    'sepa_file',
    'accounting_entry'
  ];
  k text;
BEGIN
  IF NEW.requires_human_review IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'agreement_impact_blocked: requires_human_review must remain true';
  END IF;

  v_blob := COALESCE(NEW.concepts_detected::text, '[]')
         || COALESCE(NEW.missing_concepts::text, '[]')
         || COALESCE(NEW.risk_flags::text, '[]')
         || COALESCE(NEW.blockers_json::text, '[]')
         || COALESCE(NEW.warnings_json::text, '[]')
         || COALESCE(NEW.source_trace::text, '{}');
  FOREACH k IN ARRAY v_forbidden LOOP
    IF v_blob ILIKE '%"' || k || '"%' THEN
      RAISE EXCEPTION 'agreement_impact_blocked: forbidden activation key % present', k;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agr_impact_previews_guard
BEFORE INSERT OR UPDATE ON public.erp_hr_collective_agreement_impact_previews
FOR EACH ROW EXECUTE FUNCTION public.tg_agreement_impact_previews_guard();
