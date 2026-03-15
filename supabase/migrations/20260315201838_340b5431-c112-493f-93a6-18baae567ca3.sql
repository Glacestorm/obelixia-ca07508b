
-- Agent Registry: formal catalog of AI agents
CREATE TABLE public.erp_ai_agents_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  module_domain TEXT NOT NULL DEFAULT 'hr', -- hr, legal, cross
  specialization TEXT,
  agent_type TEXT NOT NULL DEFAULT 'specialist', -- specialist, supervisor
  execution_type TEXT NOT NULL DEFAULT 'edge_function', -- edge_function, panel, hybrid
  backend_handler TEXT, -- edge function name
  ui_entrypoint TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, beta, disabled
  supervisor_code TEXT, -- logical FK to supervisor agent code
  confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  requires_human_review BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_ai_agents_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_registry_read" ON public.erp_ai_agents_registry
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "agents_registry_admin" ON public.erp_ai_agents_registry
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Agent Invocations: traceability log
CREATE TABLE public.erp_ai_agent_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code TEXT NOT NULL,
  supervisor_code TEXT,
  company_id UUID,
  user_id UUID,
  input_summary TEXT,
  routing_reason TEXT,
  confidence_score NUMERIC(3,2),
  escalated_to TEXT,
  escalation_reason TEXT,
  outcome_status TEXT NOT NULL DEFAULT 'success', -- success, failed, escalated, human_review
  execution_time_ms INTEGER,
  response_summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_ai_agent_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invocations_read" ON public.erp_ai_agent_invocations
  FOR SELECT TO authenticated USING (
    public.user_has_erp_premium_access(company_id)
  );

CREATE POLICY "invocations_insert" ON public.erp_ai_agent_invocations
  FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX idx_ai_agents_registry_module ON public.erp_ai_agents_registry(module_domain);
CREATE INDEX idx_ai_agents_registry_status ON public.erp_ai_agents_registry(status);
CREATE INDEX idx_ai_invocations_agent ON public.erp_ai_agent_invocations(agent_code);
CREATE INDEX idx_ai_invocations_company ON public.erp_ai_agent_invocations(company_id);
CREATE INDEX idx_ai_invocations_created ON public.erp_ai_agent_invocations(created_at DESC);
CREATE INDEX idx_ai_invocations_supervisor ON public.erp_ai_agent_invocations(supervisor_code);
