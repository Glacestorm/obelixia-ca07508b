-- =====================================================
-- FASE 4: CUSTOMER 360 & CDP (Customer Data Platform)
-- Perfiles unificados, timeline, touchpoints e identidad
-- =====================================================

-- Función genérica para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_cdp_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Perfiles unificados de cliente (Golden Record)
CREATE TABLE IF NOT EXISTS public.crm_unified_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID,
  deal_id UUID,
  display_name TEXT NOT NULL,
  primary_email TEXT,
  secondary_emails TEXT[] DEFAULT '{}',
  primary_phone TEXT,
  secondary_phones TEXT[] DEFAULT '{}',
  company_name TEXT,
  job_title TEXT,
  industry TEXT,
  company_size TEXT,
  annual_revenue DECIMAL(15,2),
  employee_count INTEGER,
  headquarters_location JSONB DEFAULT '{}',
  total_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  fit_score INTEGER DEFAULT 0,
  intent_score INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 0,
  lifetime_value DECIMAL(15,2) DEFAULT 0,
  lifecycle_stage TEXT DEFAULT 'lead' CHECK (lifecycle_stage IN ('visitor', 'lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist', 'churned')),
  customer_segment TEXT,
  persona_type TEXT,
  account_tier TEXT DEFAULT 'standard' CHECK (account_tier IN ('standard', 'silver', 'gold', 'platinum', 'enterprise')),
  preferred_channel TEXT DEFAULT 'email' CHECK (preferred_channel IN ('email', 'phone', 'sms', 'whatsapp', 'chat', 'social')),
  preferred_language TEXT DEFAULT 'es',
  timezone TEXT DEFAULT 'Europe/Madrid',
  first_touch_at TIMESTAMPTZ,
  last_touch_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  total_touchpoints INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  is_merged BOOLEAN DEFAULT false,
  merge_source_ids UUID[] DEFAULT '{}',
  data_quality_score INTEGER DEFAULT 0,
  requires_enrichment BOOLEAN DEFAULT true,
  custom_attributes JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Resolución de identidad
CREATE TABLE IF NOT EXISTS public.crm_identity_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  master_profile_id UUID NOT NULL REFERENCES public.crm_unified_profiles(id) ON DELETE CASCADE,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'phone', 'cookie', 'device_id', 'social_id', 'crm_id', 'external_id')),
  identifier_value TEXT NOT NULL,
  identifier_hash TEXT,
  confidence_score DECIMAL(5,4) DEFAULT 1.0,
  match_source TEXT DEFAULT 'manual' CHECK (match_source IN ('manual', 'deterministic', 'probabilistic', 'ai_match')),
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, identifier_type, identifier_value)
);

-- Timeline de touchpoints
CREATE TABLE IF NOT EXISTS public.crm_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.crm_unified_profiles(id) ON DELETE CASCADE,
  touchpoint_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  source TEXT,
  campaign_id TEXT,
  utm_params JSONB DEFAULT '{}',
  performed_by UUID,
  engagement_value INTEGER DEFAULT 1,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  reference_type TEXT,
  reference_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Segmentos dinámicos CDP
CREATE TABLE IF NOT EXISTS public.crm_cdp_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  segment_type TEXT DEFAULT 'dynamic' CHECK (segment_type IN ('static', 'dynamic', 'predictive', 'ai_generated')),
  conditions JSONB NOT NULL DEFAULT '[]',
  condition_logic TEXT DEFAULT 'AND' CHECK (condition_logic IN ('AND', 'OR')),
  member_count INTEGER DEFAULT 0,
  last_computed_at TIMESTAMPTZ,
  computation_duration_ms INTEGER,
  is_active BOOLEAN DEFAULT true,
  auto_refresh BOOLEAN DEFAULT true,
  refresh_interval_hours INTEGER DEFAULT 24,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Miembros de segmentos
CREATE TABLE IF NOT EXISTS public.crm_cdp_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES public.crm_cdp_segments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.crm_unified_profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  removed_at TIMESTAMPTZ,
  match_score DECIMAL(5,4) DEFAULT 1.0,
  matching_conditions JSONB DEFAULT '[]',
  UNIQUE(segment_id, profile_id)
);

-- Customer journeys
CREATE TABLE IF NOT EXISTS public.crm_customer_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.crm_unified_profiles(id) ON DELETE CASCADE,
  journey_name TEXT NOT NULL,
  journey_type TEXT DEFAULT 'acquisition' CHECK (journey_type IN ('acquisition', 'onboarding', 'engagement', 'retention', 'expansion', 'renewal', 'custom')),
  current_stage TEXT NOT NULL,
  current_stage_entered_at TIMESTAMPTZ DEFAULT now(),
  previous_stage TEXT,
  stages_completed TEXT[] DEFAULT '{}',
  stages_history JSONB DEFAULT '[]',
  progress_percentage INTEGER DEFAULT 0,
  time_in_journey_days INTEGER DEFAULT 0,
  engagement_trend TEXT CHECK (engagement_trend IN ('increasing', 'stable', 'decreasing')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'dropped')),
  completed_at TIMESTAMPTZ,
  dropped_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Data enrichment queue
CREATE TABLE IF NOT EXISTS public.crm_data_enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.crm_unified_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  enrichment_source TEXT NOT NULL CHECK (enrichment_source IN ('ai', 'clearbit', 'zoominfo', 'apollo', 'linkedin', 'manual', 'internal')),
  enrichment_type TEXT DEFAULT 'full' CHECK (enrichment_type IN ('full', 'firmographic', 'contact', 'social', 'intent')),
  enriched_data JSONB DEFAULT '{}',
  fields_updated TEXT[] DEFAULT '{}',
  confidence_score DECIMAL(5,4),
  requested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  requested_by UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_crm_unified_profiles_company ON public.crm_unified_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_unified_profiles_email ON public.crm_unified_profiles(primary_email);
CREATE INDEX IF NOT EXISTS idx_crm_unified_profiles_lifecycle ON public.crm_unified_profiles(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_crm_identity_graph_master ON public.crm_identity_graph(master_profile_id);
CREATE INDEX IF NOT EXISTS idx_crm_touchpoints_profile ON public.crm_touchpoints(profile_id);
CREATE INDEX IF NOT EXISTS idx_crm_touchpoints_occurred ON public.crm_touchpoints(occurred_at);
CREATE INDEX IF NOT EXISTS idx_crm_cdp_segments_company ON public.crm_cdp_segments(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_cdp_segment_members_segment ON public.crm_cdp_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_crm_customer_journeys_profile ON public.crm_customer_journeys(profile_id);

-- RLS
ALTER TABLE public.crm_unified_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_identity_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cdp_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cdp_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customer_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_data_enrichment_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "crm_unified_profiles_select" ON public.crm_unified_profiles FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "crm_unified_profiles_all" ON public.crm_unified_profiles FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "crm_identity_graph_select" ON public.crm_identity_graph FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "crm_identity_graph_all" ON public.crm_identity_graph FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "crm_touchpoints_select" ON public.crm_touchpoints FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "crm_touchpoints_all" ON public.crm_touchpoints FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "crm_cdp_segments_select" ON public.crm_cdp_segments FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "crm_cdp_segments_all" ON public.crm_cdp_segments FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "crm_cdp_segment_members_select" ON public.crm_cdp_segment_members FOR SELECT USING (segment_id IN (SELECT id FROM public.crm_cdp_segments WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "crm_cdp_segment_members_all" ON public.crm_cdp_segment_members FOR ALL USING (segment_id IN (SELECT id FROM public.crm_cdp_segments WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "crm_customer_journeys_select" ON public.crm_customer_journeys FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "crm_customer_journeys_all" ON public.crm_customer_journeys FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "crm_data_enrichment_queue_select" ON public.crm_data_enrichment_queue FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "crm_data_enrichment_queue_all" ON public.crm_data_enrichment_queue FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Triggers
CREATE TRIGGER update_crm_unified_profiles_ts BEFORE UPDATE ON public.crm_unified_profiles FOR EACH ROW EXECUTE FUNCTION update_cdp_timestamp();
CREATE TRIGGER update_crm_cdp_segments_ts BEFORE UPDATE ON public.crm_cdp_segments FOR EACH ROW EXECUTE FUNCTION update_cdp_timestamp();
CREATE TRIGGER update_crm_customer_journeys_ts BEFORE UPDATE ON public.crm_customer_journeys FOR EACH ROW EXECUTE FUNCTION update_cdp_timestamp();

-- Función para actualizar touchpoint count
CREATE OR REPLACE FUNCTION update_profile_touchpoint_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.crm_unified_profiles SET total_touchpoints = total_touchpoints + 1, last_touch_at = NEW.occurred_at, last_activity_at = now() WHERE id = NEW.profile_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.crm_unified_profiles SET total_touchpoints = total_touchpoints - 1 WHERE id = OLD.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_touchpoints AFTER INSERT OR DELETE ON public.crm_touchpoints FOR EACH ROW EXECUTE FUNCTION update_profile_touchpoint_count();

-- Función para actualizar segment member count
CREATE OR REPLACE FUNCTION update_segment_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.crm_cdp_segments SET member_count = member_count + 1 WHERE id = NEW.segment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.crm_cdp_segments SET member_count = member_count - 1 WHERE id = OLD.segment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_segment_members AFTER INSERT OR DELETE ON public.crm_cdp_segment_members FOR EACH ROW EXECUTE FUNCTION update_segment_member_count();