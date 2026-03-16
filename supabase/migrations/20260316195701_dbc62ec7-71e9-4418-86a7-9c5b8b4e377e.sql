
-- V2-RRHH-FASE-2: IMMUTABLE LEDGER + EVIDENCE ENGINE + VERSION REGISTRY

DO $$ BEGIN
  CREATE TYPE public.hr_ledger_event_type AS ENUM (
    'employee_created','employee_updated','master_data_changed',
    'contract_created','contract_updated','contract_terminated',
    'salary_changed','payroll_incident_created','payroll_incident_resolved',
    'payroll_calculated','payroll_recalculated','payroll_closed',
    'payroll_reopened','payroll_rectified','document_generated',
    'document_uploaded','document_signed','document_expired',
    'document_version_created','settlement_created','settlement_calculated',
    'termination_initiated','official_export_prepared','official_export_submitted',
    'expedient_action','consent_granted','consent_revoked',
    'approval_requested','approval_granted','approval_rejected',
    'period_closed','period_reopened','rectification_issued',
    'reversion_applied','bulk_operation','system_event'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_version_state AS ENUM (
    'draft','validated','closed','rectified','reopened','superseded','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_evidence_type AS ENUM (
    'document','snapshot','approval','signature','export_package',
    'closure_package','calculation_result','validation_result',
    'external_receipt','system_generated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.erp_hr_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  event_type public.hr_ledger_event_type NOT NULL,
  event_label TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  aggregate_type TEXT,
  aggregate_id TEXT,
  process_id TEXT,
  correlation_id TEXT,
  parent_event_id UUID REFERENCES public.erp_hr_ledger(id),
  actor_id UUID,
  actor_role TEXT,
  source_module TEXT NOT NULL DEFAULT 'hr',
  before_snapshot JSONB,
  after_snapshot JSONB,
  changed_fields TEXT[],
  financial_impact JSONB,
  compliance_impact JSONB,
  immutable_hash TEXT NOT NULL,
  is_rectification BOOLEAN NOT NULL DEFAULT false,
  is_reopening BOOLEAN NOT NULL DEFAULT false,
  is_reversion BOOLEAN NOT NULL DEFAULT false,
  is_reemission BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_ledger_company ON public.erp_hr_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_ledger_entity ON public.erp_hr_ledger(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_ledger_aggregate ON public.erp_hr_ledger(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_hr_ledger_process ON public.erp_hr_ledger(process_id);
CREATE INDEX IF NOT EXISTS idx_hr_ledger_correlation ON public.erp_hr_ledger(correlation_id);
CREATE INDEX IF NOT EXISTS idx_hr_ledger_event_type ON public.erp_hr_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_hr_ledger_created ON public.erp_hr_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_ledger_actor ON public.erp_hr_ledger(actor_id);

CREATE TABLE IF NOT EXISTS public.erp_hr_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  ledger_event_id UUID REFERENCES public.erp_hr_ledger(id),
  evidence_type public.hr_evidence_type NOT NULL,
  evidence_label TEXT NOT NULL,
  ref_entity_type TEXT NOT NULL,
  ref_entity_id TEXT NOT NULL,
  document_id UUID,
  file_version_id UUID,
  storage_path TEXT,
  storage_bucket TEXT,
  content_hash TEXT,
  evidence_snapshot JSONB,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by UUID,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_evidence_company ON public.erp_hr_evidence(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_evidence_ledger ON public.erp_hr_evidence(ledger_event_id);
CREATE INDEX IF NOT EXISTS idx_hr_evidence_ref ON public.erp_hr_evidence(ref_entity_type, ref_entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_evidence_document ON public.erp_hr_evidence(document_id);
CREATE INDEX IF NOT EXISTS idx_hr_evidence_captured ON public.erp_hr_evidence(captured_at DESC);

CREATE TABLE IF NOT EXISTS public.erp_hr_version_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  state public.hr_version_state NOT NULL DEFAULT 'draft',
  previous_state public.hr_version_state,
  content_snapshot JSONB,
  content_hash TEXT,
  parent_version_id UUID REFERENCES public.erp_hr_version_registry(id),
  superseded_by_id UUID REFERENCES public.erp_hr_version_registry(id),
  created_by UUID,
  state_changed_by UUID,
  state_changed_at TIMESTAMPTZ,
  state_change_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, entity_type, entity_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_hr_version_company ON public.erp_hr_version_registry(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_version_entity ON public.erp_hr_version_registry(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_version_state ON public.erp_hr_version_registry(state);

ALTER TABLE public.erp_hr_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_version_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read ledger"
  ON public.erp_hr_ledger FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Company members can insert ledger"
  ON public.erp_hr_ledger FOR INSERT TO authenticated
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "Company members can read evidence"
  ON public.erp_hr_evidence FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Company members can insert evidence"
  ON public.erp_hr_evidence FOR INSERT TO authenticated
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "Company members can read versions"
  ON public.erp_hr_version_registry FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Company members can insert versions"
  ON public.erp_hr_version_registry FOR INSERT TO authenticated
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "Company members can update versions"
  ON public.erp_hr_version_registry FOR UPDATE TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'erp_hr_ledger is immutable';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_prevent_ledger_update
  BEFORE UPDATE ON public.erp_hr_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();

CREATE TRIGGER trg_prevent_ledger_delete
  BEFORE DELETE ON public.erp_hr_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();

CREATE OR REPLACE FUNCTION public.validate_version_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_new_state TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state THEN
    NEW.previous_state := OLD.state;
    NEW.state_changed_at := now();
    NEW.updated_at := now();
    v_new_state := NEW.state::TEXT;
    IF OLD.state = 'cancelled' THEN
      RAISE EXCEPTION 'Cannot transition from cancelled state';
    END IF;
    IF OLD.state = 'closed' AND NEW.state NOT IN ('rectified', 'reopened', 'superseded') THEN
      RAISE EXCEPTION 'Invalid transition from closed to %', v_new_state;
    END IF;
    IF OLD.state = 'superseded' THEN
      RAISE EXCEPTION 'Cannot transition from superseded state';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_version_transition
  BEFORE UPDATE ON public.erp_hr_version_registry
  FOR EACH ROW EXECUTE FUNCTION public.validate_version_state_transition();
