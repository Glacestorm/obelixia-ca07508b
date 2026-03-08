
-- Phase 4: Client portal tokens for secure read-only access
CREATE TABLE IF NOT EXISTS public.energy_client_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_name TEXT,
  client_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_accessed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications table for backend alerts
CREATE TABLE IF NOT EXISTS public.energy_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.energy_cases(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  target_user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Smart automation: next-best-action suggestions
CREATE TABLE IF NOT EXISTS public.energy_smart_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 50,
  urgency TEXT NOT NULL DEFAULT 'medium',
  risk_level TEXT DEFAULT 'low',
  estimated_savings NUMERIC(12,2),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proposal signature tracking
ALTER TABLE public.energy_proposals ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE public.energy_proposals ADD COLUMN IF NOT EXISTS signed_by TEXT;
ALTER TABLE public.energy_proposals ADD COLUMN IF NOT EXISTS signature_method TEXT DEFAULT 'digital_acceptance';
ALTER TABLE public.energy_proposals ADD COLUMN IF NOT EXISTS pdf_path TEXT;

-- RLS for new tables
ALTER TABLE public.energy_client_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_smart_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies for portal tokens
CREATE POLICY "energy_portal_tokens_company" ON public.energy_client_portal_tokens
  FOR ALL TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()
  ));

-- RLS policies for notifications
CREATE POLICY "energy_notifications_company" ON public.energy_notifications
  FOR ALL TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()
  ));

-- RLS policies for smart actions
CREATE POLICY "energy_smart_actions_company" ON public.energy_smart_actions
  FOR ALL TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()
  ));

-- Index for portal token lookup
CREATE INDEX IF NOT EXISTS idx_energy_portal_tokens_token ON public.energy_client_portal_tokens(token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_energy_notifications_company ON public.energy_notifications(company_id, is_read);
CREATE INDEX IF NOT EXISTS idx_energy_smart_actions_case ON public.energy_smart_actions(case_id, is_completed);
