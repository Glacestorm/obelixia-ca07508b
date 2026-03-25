
-- AI Command Center: Fase 0+1 — Approval Queue & Decisions

-- Table: erp_ai_approval_queue
CREATE TABLE public.erp_ai_approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  agent_code TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'general',
  task_type TEXT NOT NULL DEFAULT 'analysis',
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 5,
  semaphore TEXT NOT NULL DEFAULT 'green',
  confidence_score NUMERIC(5,2) DEFAULT 0,
  payload_summary TEXT,
  action_required TEXT,
  cost_tokens INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: erp_ai_approval_decisions
CREATE TABLE public.erp_ai_approval_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id UUID NOT NULL REFERENCES public.erp_ai_approval_queue(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  decided_by UUID REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_approval_queue_status ON public.erp_ai_approval_queue(status);
CREATE INDEX idx_approval_queue_domain ON public.erp_ai_approval_queue(domain);
CREATE INDEX idx_approval_queue_semaphore ON public.erp_ai_approval_queue(semaphore);
CREATE INDEX idx_approval_queue_priority ON public.erp_ai_approval_queue(priority DESC);
CREATE INDEX idx_approval_queue_company ON public.erp_ai_approval_queue(company_id);
CREATE INDEX idx_approval_decisions_queue ON public.erp_ai_approval_decisions(queue_item_id);

-- RLS
ALTER TABLE public.erp_ai_approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_ai_approval_decisions ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read
CREATE POLICY "Authenticated users can read approval queue"
  ON public.erp_ai_approval_queue FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert approval queue"
  ON public.erp_ai_approval_queue FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update approval queue"
  ON public.erp_ai_approval_queue FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read approval decisions"
  ON public.erp_ai_approval_decisions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert approval decisions"
  ON public.erp_ai_approval_decisions FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime for live feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_ai_approval_queue;
