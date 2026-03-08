
-- Extend client_installations with deployment fields
ALTER TABLE public.client_installations 
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'linux',
  ADD COLUMN IF NOT EXISTS deployment_type TEXT DEFAULT 'on_premise',
  ADD COLUMN IF NOT EXISTS os_version TEXT,
  ADD COLUMN IF NOT EXISTS architecture TEXT DEFAULT 'x86_64',
  ADD COLUMN IF NOT EXISTS core_version TEXT DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS hostname TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS device_fingerprint_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_update_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS update_channel TEXT DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS auto_update BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES public.licenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS installed_at TIMESTAMPTZ DEFAULT now();

-- Installation modules (N:N)
CREATE TABLE public.installation_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.client_installations(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  module_name TEXT NOT NULL,
  module_version TEXT NOT NULL DEFAULT '1.0.0',
  target_version TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  installed_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}'::jsonb,
  dependencies TEXT[] DEFAULT '{}',
  health_status TEXT DEFAULT 'unknown',
  last_health_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(installation_id, module_key)
);

-- Installation update history
CREATE TABLE public.installation_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.client_installations(id) ON DELETE CASCADE,
  module_key TEXT,
  update_type TEXT NOT NULL DEFAULT 'module',
  from_version TEXT NOT NULL,
  to_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  changelog TEXT,
  file_size_bytes BIGINT,
  download_url TEXT,
  checksum TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  rollback_version TEXT,
  applied_by TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage billing rules
CREATE TABLE public.usage_billing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  action_key TEXT NOT NULL,
  action_name TEXT NOT NULL,
  unit_price NUMERIC(10,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  free_tier_limit INTEGER DEFAULT 0,
  tier_pricing JSONB DEFAULT '[]'::jsonb,
  reset_period TEXT DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module_key, action_key)
);

-- Enable RLS
ALTER TABLE public.installation_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_billing_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Auth users view installation modules" ON public.installation_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users manage installation modules" ON public.installation_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users view updates" ON public.installation_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users manage updates" ON public.installation_updates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users view billing rules" ON public.usage_billing_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users manage billing rules" ON public.usage_billing_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_installation_modules_installation ON public.installation_modules(installation_id);
CREATE INDEX idx_installation_modules_key ON public.installation_modules(module_key);
CREATE INDEX idx_installation_updates_installation ON public.installation_updates(installation_id);
CREATE INDEX idx_client_installations_license ON public.client_installations(license_id);
CREATE INDEX idx_client_installations_platform ON public.client_installations(platform);
