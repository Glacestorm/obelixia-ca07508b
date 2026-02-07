-- =============================================
-- CRM Integration Hub - Schema alignment + security hardening
-- =============================================

-- 0) Connector instances table (workspace-scoped)
CREATE TABLE IF NOT EXISTS public.crm_connector_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  connector_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','error','syncing')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_connector_instances_workspace ON public.crm_connector_instances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_connector_instances_status ON public.crm_connector_instances(status);

ALTER TABLE public.crm_connector_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_connector_instances_select" ON public.crm_connector_instances;
DROP POLICY IF EXISTS "crm_connector_instances_insert" ON public.crm_connector_instances;
DROP POLICY IF EXISTS "crm_connector_instances_update" ON public.crm_connector_instances;
DROP POLICY IF EXISTS "crm_connector_instances_delete" ON public.crm_connector_instances;

CREATE POLICY "crm_connector_instances_select"
  ON public.crm_connector_instances
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.crm_user_workspaces
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "crm_connector_instances_insert"
  ON public.crm_connector_instances
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.crm_user_workspaces
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "crm_connector_instances_update"
  ON public.crm_connector_instances
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.crm_user_workspaces
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "crm_connector_instances_delete"
  ON public.crm_connector_instances
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.crm_user_workspaces
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP TRIGGER IF EXISTS update_crm_connector_instances_updated_at ON public.crm_connector_instances;
CREATE TRIGGER update_crm_connector_instances_updated_at
  BEFORE UPDATE ON public.crm_connector_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 1) Align crm_webhooks to app expectations
ALTER TABLE public.crm_webhooks
  ADD COLUMN IF NOT EXISTS webhook_type TEXT NOT NULL DEFAULT 'outgoing' CHECK (webhook_type IN ('incoming','outgoing')),
  ADD COLUMN IF NOT EXISTS secret_key TEXT,
  ADD COLUMN IF NOT EXISTS payload_template JSONB,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS retry_delay_seconds INTEGER NOT NULL DEFAULT 1;

-- url should be nullable for incoming webhooks
ALTER TABLE public.crm_webhooks ALTER COLUMN url DROP NOT NULL;

-- If old column name exists, try to map it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='crm_webhooks' AND column_name='secret'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='crm_webhooks' AND column_name='secret_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.crm_webhooks RENAME COLUMN secret TO secret_key';
  END IF;
END $$;

-- Do not allow client reads/updates of webhook secrets
REVOKE SELECT (secret_key) ON public.crm_webhooks FROM anon, authenticated;
REVOKE UPDATE (secret_key) ON public.crm_webhooks FROM anon, authenticated;


-- 2) Align crm_webhook_logs to app expectations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='crm_webhook_logs' AND column_name='payload'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='crm_webhook_logs' AND column_name='request_payload'
  ) THEN
    EXECUTE 'ALTER TABLE public.crm_webhook_logs RENAME COLUMN payload TO request_payload';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='crm_webhook_logs' AND column_name='attempt_number'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='crm_webhook_logs' AND column_name='retry_attempt'
  ) THEN
    EXECUTE 'ALTER TABLE public.crm_webhook_logs RENAME COLUMN attempt_number TO retry_attempt';
  END IF;
END $$;

ALTER TABLE public.crm_webhook_logs
  ADD COLUMN IF NOT EXISTS response_payload JSONB,
  ADD COLUMN IF NOT EXISTS retry_attempt INTEGER NOT NULL DEFAULT 0;

-- Drop legacy response_body column if present (text)
ALTER TABLE public.crm_webhook_logs DROP COLUMN IF EXISTS response_body;

-- Harden webhook logs SELECT policy (workspace-scoped)
DROP POLICY IF EXISTS "crm_webhook_logs_select" ON public.crm_webhook_logs;
CREATE POLICY "crm_webhook_logs_select"
  ON public.crm_webhook_logs
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT w.id
      FROM public.crm_webhooks w
      WHERE w.workspace_id IN (
        SELECT workspace_id FROM public.crm_user_workspaces
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );


-- 3) Align crm_api_keys to app expectations
ALTER TABLE public.crm_api_keys
  ADD COLUMN IF NOT EXISTS rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS rate_limit_per_day INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS allowed_ips TEXT[];

ALTER TABLE public.crm_api_keys DROP COLUMN IF EXISTS rate_limit;

-- Do not allow client reads/updates of API key hashes
REVOKE SELECT (key_hash) ON public.crm_api_keys FROM anon, authenticated;
REVOKE UPDATE (key_hash) ON public.crm_api_keys FROM anon, authenticated;


-- 4) Align crm_integration_events to app expectations + fix permissive insert policy
ALTER TABLE public.crm_integration_events
  ADD COLUMN IF NOT EXISTS event_source TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS processing_results JSONB;

-- Rename 'source' -> 'event_source' if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='crm_integration_events' AND column_name='source'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='crm_integration_events' AND column_name='event_source'
  ) THEN
    EXECUTE 'ALTER TABLE public.crm_integration_events RENAME COLUMN source TO event_source';
  END IF;
END $$;

DROP POLICY IF EXISTS "crm_integration_events_insert" ON public.crm_integration_events;
CREATE POLICY "crm_integration_events_insert"
  ON public.crm_integration_events
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.crm_user_workspaces
      WHERE user_id = auth.uid() AND is_active = true
    )
  );


-- 5) Align crm_sync_history to app expectations
ALTER TABLE public.crm_sync_history
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (direction IN ('inbound','outbound','bidirectional')),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();


-- 6) Re-attach updated_at triggers where missing
DROP TRIGGER IF EXISTS update_crm_webhooks_updated_at ON public.crm_webhooks;
CREATE TRIGGER update_crm_webhooks_updated_at
  BEFORE UPDATE ON public.crm_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_api_keys_updated_at ON public.crm_api_keys;
CREATE TRIGGER update_crm_api_keys_updated_at
  BEFORE UPDATE ON public.crm_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_field_mappings_updated_at ON public.crm_field_mappings;
CREATE TRIGGER update_crm_field_mappings_updated_at
  BEFORE UPDATE ON public.crm_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_integration_events_updated_at ON public.crm_integration_events;

-- Note: crm_integration_events intentionally has no updated_at

