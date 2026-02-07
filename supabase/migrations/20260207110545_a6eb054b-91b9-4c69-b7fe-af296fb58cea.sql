-- =============================================
-- AI Advanced Providers - Phase 6 Migration
-- Tables for legal validations, benchmarks, and enhanced provider config
-- =============================================

-- 1. Add new columns to ai_providers table for advanced configuration
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS endpoint_url TEXT;
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS connection_timeout_ms INTEGER DEFAULT 30000;
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS benchmark_results JSONB DEFAULT '{}';
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS last_benchmark_at TIMESTAMPTZ;
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS detected_capabilities JSONB DEFAULT '[]';
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'standard';
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS allowed_data_levels TEXT[] DEFAULT ARRAY['public', 'internal'];
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS max_tokens_per_request INTEGER DEFAULT 4096;
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS max_daily_cost NUMERIC(10,4) DEFAULT 100;
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS current_daily_cost NUMERIC(10,4) DEFAULT 0;
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS daily_cost_reset_at TIMESTAMPTZ;
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 50;

-- Add check constraint for trust_level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_providers_trust_level_check'
  ) THEN
    ALTER TABLE public.ai_providers 
    ADD CONSTRAINT ai_providers_trust_level_check 
    CHECK (trust_level IN ('untrusted', 'standard', 'trusted', 'verified'));
  END IF;
END $$;

-- 2. Create ai_legal_validations table for GDPR/LOPDGDD compliance tracking
CREATE TABLE IF NOT EXISTS public.ai_legal_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  data_classification TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL,
  legal_basis TEXT[] DEFAULT '{}',
  applicable_regulations TEXT[] DEFAULT '{}',
  warnings TEXT[] DEFAULT '{}',
  blocking_issues TEXT[] DEFAULT '{}',
  requires_consent BOOLEAN DEFAULT false,
  consent_type TEXT,
  cross_border_transfer BOOLEAN DEFAULT false,
  destination_countries TEXT[] DEFAULT '{}',
  data_retention_days INTEGER,
  validated_by TEXT DEFAULT 'legal-ai-advisor',
  processing_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for ai_legal_validations
CREATE INDEX IF NOT EXISTS idx_ai_legal_validations_created ON public.ai_legal_validations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_legal_validations_user ON public.ai_legal_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_legal_validations_approved ON public.ai_legal_validations(is_approved);
CREATE INDEX IF NOT EXISTS idx_ai_legal_validations_classification ON public.ai_legal_validations(data_classification);
CREATE INDEX IF NOT EXISTS idx_ai_legal_validations_regulations ON public.ai_legal_validations USING GIN (applicable_regulations);

-- RLS for ai_legal_validations
ALTER TABLE public.ai_legal_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access legal validations" ON public.ai_legal_validations;
CREATE POLICY "Service role full access legal validations"
ON public.ai_legal_validations FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own legal validations" ON public.ai_legal_validations;
CREATE POLICY "Users view own legal validations"
ON public.ai_legal_validations FOR SELECT
USING (auth.uid() = user_id);

-- 3. Create ai_provider_benchmarks table for performance tracking
CREATE TABLE IF NOT EXISTS public.ai_provider_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  benchmark_type TEXT NOT NULL,
  tokens_per_second NUMERIC(10,2),
  time_to_first_token_ms INTEGER,
  total_time_ms INTEGER,
  quality_score NUMERIC(5,2),
  memory_used_mb INTEGER,
  gpu_used BOOLEAN DEFAULT false,
  gpu_memory_mb INTEGER,
  test_prompt_hash TEXT,
  test_prompt_tokens INTEGER,
  response_tokens INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for ai_provider_benchmarks
CREATE INDEX IF NOT EXISTS idx_ai_provider_benchmarks_provider ON public.ai_provider_benchmarks(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_benchmarks_model ON public.ai_provider_benchmarks(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_benchmarks_created ON public.ai_provider_benchmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_provider_benchmarks_type ON public.ai_provider_benchmarks(benchmark_type);

-- RLS for ai_provider_benchmarks
ALTER TABLE public.ai_provider_benchmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view benchmarks" ON public.ai_provider_benchmarks;
CREATE POLICY "Authenticated users view benchmarks"
ON public.ai_provider_benchmarks FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Service role manage benchmarks" ON public.ai_provider_benchmarks;
CREATE POLICY "Service role manage benchmarks"
ON public.ai_provider_benchmarks FOR ALL
USING (true) WITH CHECK (true);

-- 4. Create ai_routing_decisions table for tracking smart router decisions
CREATE TABLE IF NOT EXISTS public.ai_routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data_classification TEXT NOT NULL,
  selected_provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  selected_model TEXT,
  fallback_used BOOLEAN DEFAULT false,
  fallback_provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  security_score NUMERIC(5,2),
  cost_score NUMERIC(5,2),
  latency_score NUMERIC(5,2),
  capability_score NUMERIC(5,2),
  total_score NUMERIC(5,2),
  legal_validation_id UUID REFERENCES public.ai_legal_validations(id) ON DELETE SET NULL,
  was_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  estimated_cost NUMERIC(10,6),
  actual_cost NUMERIC(10,6),
  estimated_tokens INTEGER,
  actual_tokens INTEGER,
  latency_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for ai_routing_decisions
CREATE INDEX IF NOT EXISTS idx_ai_routing_decisions_created ON public.ai_routing_decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_routing_decisions_provider ON public.ai_routing_decisions(selected_provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_decisions_user ON public.ai_routing_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_decisions_blocked ON public.ai_routing_decisions(was_blocked) WHERE was_blocked = true;
CREATE INDEX IF NOT EXISTS idx_ai_routing_decisions_classification ON public.ai_routing_decisions(data_classification);

-- RLS for ai_routing_decisions
ALTER TABLE public.ai_routing_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view routing decisions" ON public.ai_routing_decisions;
CREATE POLICY "Authenticated users view routing decisions"
ON public.ai_routing_decisions FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Service role manage routing decisions" ON public.ai_routing_decisions;
CREATE POLICY "Service role manage routing decisions"
ON public.ai_routing_decisions FOR ALL
USING (true) WITH CHECK (true);

-- 5. Create function to log legal validation
CREATE OR REPLACE FUNCTION public.log_ai_legal_validation(
  p_request_id TEXT,
  p_user_id UUID,
  p_operation_type TEXT,
  p_data_classification TEXT,
  p_is_approved BOOLEAN,
  p_legal_basis TEXT[] DEFAULT '{}',
  p_applicable_regulations TEXT[] DEFAULT '{}',
  p_warnings TEXT[] DEFAULT '{}',
  p_blocking_issues TEXT[] DEFAULT '{}',
  p_requires_consent BOOLEAN DEFAULT false,
  p_consent_type TEXT DEFAULT NULL,
  p_cross_border_transfer BOOLEAN DEFAULT false,
  p_destination_countries TEXT[] DEFAULT '{}',
  p_processing_time_ms INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.ai_legal_validations (
    request_id, user_id, operation_type, data_classification,
    is_approved, legal_basis, applicable_regulations, warnings,
    blocking_issues, requires_consent, consent_type, cross_border_transfer,
    destination_countries, processing_time_ms, metadata
  ) VALUES (
    p_request_id, p_user_id, p_operation_type, p_data_classification,
    p_is_approved, p_legal_basis, p_applicable_regulations, p_warnings,
    p_blocking_issues, p_requires_consent, p_consent_type, p_cross_border_transfer,
    p_destination_countries, p_processing_time_ms, p_metadata
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 6. Create function to log routing decision
CREATE OR REPLACE FUNCTION public.log_ai_routing_decision(
  p_request_id TEXT,
  p_user_id UUID,
  p_data_classification TEXT,
  p_selected_provider_id UUID,
  p_selected_model TEXT,
  p_security_score NUMERIC,
  p_cost_score NUMERIC,
  p_latency_score NUMERIC,
  p_capability_score NUMERIC,
  p_total_score NUMERIC,
  p_legal_validation_id UUID DEFAULT NULL,
  p_was_blocked BOOLEAN DEFAULT false,
  p_block_reason TEXT DEFAULT NULL,
  p_estimated_cost NUMERIC DEFAULT NULL,
  p_estimated_tokens INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.ai_routing_decisions (
    request_id, user_id, data_classification, selected_provider_id,
    selected_model, security_score, cost_score, latency_score,
    capability_score, total_score, legal_validation_id, was_blocked,
    block_reason, estimated_cost, estimated_tokens, metadata
  ) VALUES (
    p_request_id, p_user_id, p_data_classification, p_selected_provider_id,
    p_selected_model, p_security_score, p_cost_score, p_latency_score,
    p_capability_score, p_total_score, p_legal_validation_id, p_was_blocked,
    p_block_reason, p_estimated_cost, p_estimated_tokens, p_metadata
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 7. Create function to reset daily costs
CREATE OR REPLACE FUNCTION public.reset_ai_provider_daily_costs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_providers
  SET current_daily_cost = 0,
      daily_cost_reset_at = now()
  WHERE daily_cost_reset_at IS NULL 
     OR daily_cost_reset_at < now() - interval '1 day';
END;
$$;

-- 8. Create function to get provider stats for smart routing
CREATE OR REPLACE FUNCTION public.get_ai_provider_routing_stats(
  p_provider_id UUID
) RETURNS TABLE (
  avg_latency_ms NUMERIC,
  success_rate NUMERIC,
  total_requests BIGINT,
  avg_cost_per_request NUMERIC,
  last_24h_requests BIGINT,
  last_24h_avg_latency NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(AVG(rd.latency_ms), 0)::NUMERIC as avg_latency_ms,
    COALESCE(
      (COUNT(*) FILTER (WHERE NOT rd.was_blocked))::NUMERIC / 
      NULLIF(COUNT(*)::NUMERIC, 0) * 100,
      100
    ) as success_rate,
    COUNT(*) as total_requests,
    COALESCE(AVG(rd.actual_cost), 0)::NUMERIC as avg_cost_per_request,
    COUNT(*) FILTER (WHERE rd.created_at > now() - interval '24 hours') as last_24h_requests,
    COALESCE(
      AVG(rd.latency_ms) FILTER (WHERE rd.created_at > now() - interval '24 hours'),
      0
    )::NUMERIC as last_24h_avg_latency
  FROM public.ai_routing_decisions rd
  WHERE rd.selected_provider_id = p_provider_id;
END;
$$;

-- 9. Add realtime for legal validations
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_legal_validations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_routing_decisions;