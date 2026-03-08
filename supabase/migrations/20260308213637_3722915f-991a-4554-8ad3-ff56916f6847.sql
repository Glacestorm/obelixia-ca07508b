
-- ============================================
-- PHASE 3: OPERATIONAL LAYER TABLES
-- ============================================

-- 1. WORKFLOW DE CAMBIO DE COMERCIALIZADORA
CREATE TABLE public.energy_workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendiente_propuesta',
  assigned_user_id UUID REFERENCES auth.users(id),
  comments TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by case
CREATE INDEX idx_energy_workflow_case ON public.energy_workflow_states(case_id, changed_at DESC);

-- 2. CHECKLIST OPERATIVO
CREATE TABLE public.energy_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  label TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT false,
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMPTZ,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, item_key)
);

-- 3. PROPUESTAS COMERCIALES
CREATE TABLE public.energy_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.energy_customers(id),
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  cups TEXT,
  current_supplier TEXT,
  current_tariff TEXT,
  current_annual_cost NUMERIC(12,2),
  recommended_supplier TEXT,
  recommended_tariff TEXT,
  estimated_annual_cost NUMERIC(12,2),
  estimated_annual_savings NUMERIC(12,2),
  conditions TEXT,
  observations TEXT,
  issued_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_energy_proposals_case ON public.energy_proposals(case_id);

-- 4. AUDIT LOG
CREATE TABLE public.energy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.energy_cases(id) ON DELETE SET NULL,
  company_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_energy_audit_case ON public.energy_audit_log(case_id, performed_at DESC);
CREATE INDEX idx_energy_audit_company ON public.energy_audit_log(company_id, performed_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.energy_workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_audit_log ENABLE ROW LEVEL SECURITY;

-- Workflow: access via case → company
CREATE POLICY "energy_workflow_select" ON public.energy_workflow_states
  FOR SELECT TO authenticated
  USING (public.user_has_energy_case_access(case_id));

CREATE POLICY "energy_workflow_insert" ON public.energy_workflow_states
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_energy_case_access(case_id));

-- Checklists: access via case → company
CREATE POLICY "energy_checklists_select" ON public.energy_checklists
  FOR SELECT TO authenticated
  USING (public.user_has_energy_case_access(case_id));

CREATE POLICY "energy_checklists_insert" ON public.energy_checklists
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_energy_case_access(case_id));

CREATE POLICY "energy_checklists_update" ON public.energy_checklists
  FOR UPDATE TO authenticated
  USING (public.user_has_energy_case_access(case_id));

-- Proposals: access via case → company
CREATE POLICY "energy_proposals_select" ON public.energy_proposals
  FOR SELECT TO authenticated
  USING (public.user_has_energy_case_access(case_id));

CREATE POLICY "energy_proposals_insert" ON public.energy_proposals
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_energy_case_access(case_id));

CREATE POLICY "energy_proposals_update" ON public.energy_proposals
  FOR UPDATE TO authenticated
  USING (public.user_has_energy_case_access(case_id));

-- Audit log: access via company
CREATE POLICY "energy_audit_select" ON public.energy_audit_log
  FOR SELECT TO authenticated
  USING (public.user_has_energy_company_access(company_id));

CREATE POLICY "energy_audit_insert" ON public.energy_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_energy_company_access(company_id));

-- Enable realtime for workflow
ALTER PUBLICATION supabase_realtime ADD TABLE public.energy_workflow_states;
