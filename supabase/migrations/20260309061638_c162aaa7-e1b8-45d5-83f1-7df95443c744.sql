
CREATE TABLE IF NOT EXISTS public.integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  company_id TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'configured',
  credentials_encrypted JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_validated_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, company_id)
);

ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage integration credentials"
ON public.integration_credentials
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add processed_event_ids column to energy_signatures for idempotency
ALTER TABLE public.energy_signatures ADD COLUMN IF NOT EXISTS processed_events JSONB DEFAULT '[]'::jsonb;
