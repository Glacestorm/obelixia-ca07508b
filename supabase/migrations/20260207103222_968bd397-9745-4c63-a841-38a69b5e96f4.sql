-- =============================================================
-- AI AUDIT LOGS TABLE - Compliance & Privacy Auditing
-- Supports GDPR, LOPDGDD, and other regulatory frameworks
-- =============================================================

-- Create the ai_audit_logs table
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  entity_type TEXT,
  entity_id TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  data_classification TEXT,
  ip_address INET,
  user_agent TEXT,
  compliance_flags TEXT[] DEFAULT '{}',
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  was_blocked BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add table comment for documentation
COMMENT ON TABLE public.ai_audit_logs IS 'AI compliance audit logs for GDPR/LOPDGDD tracking';

-- =============================================================
-- PERFORMANCE INDICES
-- =============================================================

-- Temporal queries (most common access pattern)
CREATE INDEX idx_ai_audit_logs_created ON public.ai_audit_logs(created_at DESC);

-- Event type filtering
CREATE INDEX idx_ai_audit_logs_type ON public.ai_audit_logs(event_type);

-- User-based lookups
CREATE INDEX idx_ai_audit_logs_user ON public.ai_audit_logs(user_id);

-- Risk level filtering (for security dashboards)
CREATE INDEX idx_ai_audit_logs_risk ON public.ai_audit_logs(risk_level);

-- Compliance framework searches (GIN for array containment)
CREATE INDEX idx_ai_audit_logs_compliance ON public.ai_audit_logs USING GIN (compliance_flags);

-- Composite index for common dashboard queries
CREATE INDEX idx_ai_audit_logs_user_created ON public.ai_audit_logs(user_id, created_at DESC);

-- Partial index for high-risk events (optimized filtering)
CREATE INDEX idx_ai_audit_logs_high_risk ON public.ai_audit_logs(created_at DESC) 
WHERE risk_level IN ('high', 'critical');

-- Partial index for blocked events
CREATE INDEX idx_ai_audit_logs_blocked ON public.ai_audit_logs(created_at DESC) 
WHERE was_blocked = TRUE;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for backend operations)
CREATE POLICY "ai_audit_logs_service_full_access"
ON public.ai_audit_logs FOR ALL
TO service_role
USING (true) 
WITH CHECK (true);

-- Users can view their own audit logs
CREATE POLICY "ai_audit_logs_users_view_own"
ON public.ai_audit_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Authenticated users can insert their own logs
CREATE POLICY "ai_audit_logs_users_insert_own"
ON public.ai_audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- UTILITY FUNCTIONS
-- =============================================================

-- Function to log AI audit events (callable from edge functions)
CREATE OR REPLACE FUNCTION public.log_ai_audit_event(
  p_event_type TEXT,
  p_action TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_data_classification TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_compliance_flags TEXT[] DEFAULT '{}',
  p_risk_level TEXT DEFAULT 'low',
  p_was_blocked BOOLEAN DEFAULT FALSE,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.ai_audit_logs (
    event_type,
    user_id,
    user_email,
    entity_type,
    entity_id,
    action,
    details,
    data_classification,
    ip_address,
    user_agent,
    compliance_flags,
    risk_level,
    was_blocked,
    metadata
  ) VALUES (
    p_event_type,
    COALESCE(p_user_id, auth.uid()),
    p_user_email,
    p_entity_type,
    p_entity_id,
    p_action,
    p_details,
    p_data_classification,
    p_ip_address,
    p_user_agent,
    p_compliance_flags,
    p_risk_level,
    p_was_blocked,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to clean old audit logs (GDPR 2-year retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_ai_audit_logs(
  p_retention_days INTEGER DEFAULT 730 -- 2 years default
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_audit_logs
  WHERE created_at < (now() - (p_retention_days || ' days')::INTERVAL)
  AND risk_level NOT IN ('high', 'critical'); -- Keep high-risk logs longer
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Function to get audit statistics
CREATE OR REPLACE FUNCTION public.get_ai_audit_stats(
  p_user_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_events BIGINT,
  blocked_events BIGINT,
  high_risk_events BIGINT,
  events_by_type JSONB,
  events_by_classification JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_events,
    COUNT(*) FILTER (WHERE was_blocked = TRUE)::BIGINT AS blocked_events,
    COUNT(*) FILTER (WHERE risk_level IN ('high', 'critical'))::BIGINT AS high_risk_events,
    COALESCE(
      jsonb_object_agg(
        COALESCE(sub.event_type, 'unknown'),
        sub.type_count
      ),
      '{}'::JSONB
    ) AS events_by_type,
    COALESCE(
      jsonb_object_agg(
        COALESCE(sub2.data_classification, 'unclassified'),
        sub2.class_count
      ),
      '{}'::JSONB
    ) AS events_by_classification
  FROM public.ai_audit_logs l
  LEFT JOIN LATERAL (
    SELECT event_type, COUNT(*) AS type_count
    FROM public.ai_audit_logs
    WHERE created_at >= (now() - (p_days || ' days')::INTERVAL)
    AND (p_user_id IS NULL OR user_id = p_user_id)
    GROUP BY event_type
  ) sub ON TRUE
  LEFT JOIN LATERAL (
    SELECT data_classification, COUNT(*) AS class_count
    FROM public.ai_audit_logs
    WHERE created_at >= (now() - (p_days || ' days')::INTERVAL)
    AND (p_user_id IS NULL OR user_id = p_user_id)
    GROUP BY data_classification
  ) sub2 ON TRUE
  WHERE l.created_at >= (now() - (p_days || ' days')::INTERVAL)
  AND (p_user_id IS NULL OR l.user_id = p_user_id)
  LIMIT 1;
END;
$$;