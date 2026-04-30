
-- ============================================================================
-- B13.1 — Source Watcher Queue for Collective Agreements
-- ============================================================================
-- This queue receives raw hits from official sources (BOE/REGCON/BOIB/BOPs).
-- It NEVER activates payroll, never sets ready_for_payroll, never flips pilot
-- flags. All mutations must go through the edge function
-- `erp-hr-agreement-source-watcher` (verify_jwt = true).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.erp_hr_collective_agreement_source_watch_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  document_url TEXT,
  jurisdiction TEXT,
  publication_date DATE,
  document_hash TEXT,
  detected_agreement_name TEXT,
  detected_regcon TEXT,
  detected_cnae TEXT[],
  confidence NUMERIC(5,4),
  status TEXT NOT NULL DEFAULT 'pending_intake',
  notes TEXT,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_by UUID,
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT b13_1_status_allowed CHECK (
    status IN (
      'pending_intake',
      'duplicate_candidate',
      'official_source_found',
      'needs_human_classification',
      'blocked_no_source',
      'dismissed'
    )
  ),
  CONSTRAINT b13_1_source_allowed CHECK (
    source IN ('BOE','REGCON','BOIB','BOCM','DOGC','DOGV','BOJA','BOPV','DOG','BOC','BOR','BON','BOPA','BOCYL','DOE','DOCM','BOP','MANUAL','OTHER')
  ),
  CONSTRAINT b13_1_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

-- Dedupe by hash (when present); allow multiple NULLs (sources without bytes yet).
CREATE UNIQUE INDEX IF NOT EXISTS idx_b13_1_source_watch_queue_hash_unique
  ON public.erp_hr_collective_agreement_source_watch_queue (document_hash)
  WHERE document_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_b13_1_source_watch_queue_status
  ON public.erp_hr_collective_agreement_source_watch_queue (status, discovered_at DESC);

CREATE INDEX IF NOT EXISTS idx_b13_1_source_watch_queue_source
  ON public.erp_hr_collective_agreement_source_watch_queue (source, jurisdiction);

-- ============================================================================
-- updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.b13_1_source_watch_queue_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b13_1_source_watch_queue_updated_at
  ON public.erp_hr_collective_agreement_source_watch_queue;
CREATE TRIGGER trg_b13_1_source_watch_queue_updated_at
BEFORE UPDATE ON public.erp_hr_collective_agreement_source_watch_queue
FOR EACH ROW
EXECUTE FUNCTION public.b13_1_source_watch_queue_set_updated_at();

-- ============================================================================
-- Anti-activation guard: forbid forbidden tokens in `notes`
-- and forbid any column not in our schema (defensive against payload smuggling).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.b13_1_source_watch_queue_anti_activation_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  forbidden TEXT[] := ARRAY[
    'ready_for_payroll',
    'salary_tables_loaded',
    'data_completeness=human_validated',
    'data_completeness="human_validated"',
    'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
    'HR_REGISTRY_PILOT_MODE',
    'REGISTRY_PILOT_SCOPE_ALLOWLIST'
  ];
  token TEXT;
BEGIN
  IF NEW.notes IS NOT NULL THEN
    FOREACH token IN ARRAY forbidden LOOP
      IF position(lower(token) IN lower(NEW.notes)) > 0 THEN
        RAISE EXCEPTION 'B13_1_FORBIDDEN_TOKEN_IN_NOTES: %', token
          USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b13_1_source_watch_queue_anti_activation
  ON public.erp_hr_collective_agreement_source_watch_queue;
CREATE TRIGGER trg_b13_1_source_watch_queue_anti_activation
BEFORE INSERT OR UPDATE ON public.erp_hr_collective_agreement_source_watch_queue
FOR EACH ROW
EXECUTE FUNCTION public.b13_1_source_watch_queue_anti_activation_guard();

-- ============================================================================
-- RLS — only authorized roles, FORCE RLS
-- ============================================================================
ALTER TABLE public.erp_hr_collective_agreement_source_watch_queue
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreement_source_watch_queue
  FORCE ROW LEVEL SECURITY;

-- Reuse existing has_role(uuid, app_role) helper.
DROP POLICY IF EXISTS b13_1_swq_select_authorized
  ON public.erp_hr_collective_agreement_source_watch_queue;
CREATE POLICY b13_1_swq_select_authorized
ON public.erp_hr_collective_agreement_source_watch_queue
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
  OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
);

DROP POLICY IF EXISTS b13_1_swq_insert_authorized
  ON public.erp_hr_collective_agreement_source_watch_queue;
CREATE POLICY b13_1_swq_insert_authorized
ON public.erp_hr_collective_agreement_source_watch_queue
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
  OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
);

DROP POLICY IF EXISTS b13_1_swq_update_authorized
  ON public.erp_hr_collective_agreement_source_watch_queue;
CREATE POLICY b13_1_swq_update_authorized
ON public.erp_hr_collective_agreement_source_watch_queue
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'legal_manager'::public.app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::public.app_role)
  OR public.has_role(auth.uid(), 'payroll_supervisor'::public.app_role)
);

-- No DELETE policy on purpose (queue rows are dismissed, never deleted).
