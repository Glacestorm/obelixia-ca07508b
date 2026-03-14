
-- Sandbox execution persistence table
CREATE TABLE public.erp_hr_sandbox_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  adapter_id TEXT NOT NULL,
  adapter_name TEXT NOT NULL,
  legal_entity_id TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  submission_type TEXT NOT NULL,
  reference_period TEXT,
  execution_mode TEXT NOT NULL DEFAULT 'advanced_simulation',
  payload_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  executed_by TEXT NOT NULL DEFAULT 'system',
  duration_ms INTEGER,
  related_dry_run_id UUID,
  related_approval_id UUID,
  audit_event_ids TEXT[] DEFAULT '{}',
  disclaimers TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sandbox_exec_company ON public.erp_hr_sandbox_executions(company_id);
CREATE INDEX idx_sandbox_exec_domain ON public.erp_hr_sandbox_executions(domain);
CREATE INDEX idx_sandbox_exec_adapter ON public.erp_hr_sandbox_executions(adapter_id);
CREATE INDEX idx_sandbox_exec_status ON public.erp_hr_sandbox_executions(status);
CREATE INDEX idx_sandbox_exec_env ON public.erp_hr_sandbox_executions(environment);
CREATE INDEX idx_sandbox_exec_executed_at ON public.erp_hr_sandbox_executions(executed_at DESC);

-- RLS
ALTER TABLE public.erp_hr_sandbox_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sandbox executions"
  ON public.erp_hr_sandbox_executions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sandbox executions"
  ON public.erp_hr_sandbox_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sandbox executions"
  ON public.erp_hr_sandbox_executions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_sandbox_executions;
