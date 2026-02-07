-- CRM Integration Hub - Phase 9 Tables with correct RLS using crm_user_workspaces

-- Drop existing to start fresh
DROP TABLE IF EXISTS public.crm_sync_history CASCADE;
DROP TABLE IF EXISTS public.crm_field_mappings CASCADE;
DROP TABLE IF EXISTS public.crm_integration_events CASCADE;
DROP TABLE IF EXISTS public.crm_api_keys CASCADE;
DROP TABLE IF EXISTS public.crm_webhook_logs CASCADE;
DROP TABLE IF EXISTS public.crm_webhooks CASCADE;

-- 1. Webhooks Configuration
CREATE TABLE public.crm_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL DEFAULT '{}',
  headers JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  retry_config JSONB DEFAULT '{"max_retries": 3, "retry_delay_ms": 1000}',
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Webhook Logs
CREATE TABLE public.crm_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES public.crm_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  execution_time_ms INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. API Keys
CREATE TABLE public.crm_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Integration Events
CREATE TABLE public.crm_integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB,
  source TEXT DEFAULT 'system',
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Field Mappings
CREATE TABLE public.crm_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  connector_id UUID REFERENCES public.crm_connectors(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL,
  transformation JSONB,
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Sync History
CREATE TABLE public.crm_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  connector_id UUID REFERENCES public.crm_connectors(id) ON DELETE SET NULL,
  sync_type TEXT DEFAULT 'full' CHECK (sync_type IN ('full', 'incremental', 'manual')),
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Indices
CREATE INDEX idx_crm_webhooks_workspace ON public.crm_webhooks(workspace_id);
CREATE INDEX idx_crm_webhook_logs_webhook ON public.crm_webhook_logs(webhook_id);
CREATE INDEX idx_crm_api_keys_workspace ON public.crm_api_keys(workspace_id);
CREATE INDEX idx_crm_api_keys_prefix ON public.crm_api_keys(key_prefix);
CREATE INDEX idx_crm_integration_events_workspace ON public.crm_integration_events(workspace_id);
CREATE INDEX idx_crm_field_mappings_connector ON public.crm_field_mappings(connector_id);
CREATE INDEX idx_crm_sync_history_workspace ON public.crm_sync_history(workspace_id);

-- Enable RLS
ALTER TABLE public.crm_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sync_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies using crm_user_workspaces
CREATE POLICY "crm_webhooks_select" ON public.crm_webhooks FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_webhooks_insert" ON public.crm_webhooks FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_webhooks_update" ON public.crm_webhooks FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_webhooks_delete" ON public.crm_webhooks FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_webhook_logs_select" ON public.crm_webhook_logs FOR SELECT
  USING (webhook_id IN (SELECT id FROM public.crm_webhooks));

CREATE POLICY "crm_api_keys_select" ON public.crm_api_keys FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_api_keys_insert" ON public.crm_api_keys FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_api_keys_update" ON public.crm_api_keys FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_api_keys_delete" ON public.crm_api_keys FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_integration_events_select" ON public.crm_integration_events FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_integration_events_insert" ON public.crm_integration_events FOR INSERT WITH CHECK (true);

CREATE POLICY "crm_field_mappings_select" ON public.crm_field_mappings FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_field_mappings_insert" ON public.crm_field_mappings FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_field_mappings_update" ON public.crm_field_mappings FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_field_mappings_delete" ON public.crm_field_mappings FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_sync_history_select" ON public.crm_sync_history FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "crm_sync_history_insert" ON public.crm_sync_history FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.crm_user_workspaces WHERE user_id = auth.uid()));

-- Triggers
CREATE TRIGGER update_crm_webhooks_updated_at BEFORE UPDATE ON public.crm_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_api_keys_updated_at BEFORE UPDATE ON public.crm_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_field_mappings_updated_at BEFORE UPDATE ON public.crm_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();