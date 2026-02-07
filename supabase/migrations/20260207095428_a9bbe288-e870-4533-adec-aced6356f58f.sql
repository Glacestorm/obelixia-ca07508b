-- Create ai_usage_metrics table for AI analytics
CREATE TABLE IF NOT EXISTS public.ai_usage_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  provider TEXT NOT NULL DEFAULT 'unknown',
  model TEXT NOT NULL DEFAULT 'unknown',
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_type TEXT,
  routing_mode TEXT NOT NULL DEFAULT 'hybrid_auto',
  data_classification TEXT NOT NULL DEFAULT 'public',
  was_anonymized BOOLEAN NOT NULL DEFAULT false,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  user_id UUID,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_timestamp ON public.ai_usage_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_provider ON public.ai_usage_metrics(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_model ON public.ai_usage_metrics(model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_classification ON public.ai_usage_metrics(data_classification);
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_user ON public.ai_usage_metrics(user_id);

-- Enable RLS
ALTER TABLE public.ai_usage_metrics ENABLE ROW LEVEL SECURITY;

-- Policy for service role (edge functions)
CREATE POLICY "Service role can manage ai_usage_metrics"
ON public.ai_usage_metrics
FOR ALL
USING (true)
WITH CHECK (true);

-- Policy for authenticated users to read their own metrics
CREATE POLICY "Users can view their own ai_usage_metrics"
ON public.ai_usage_metrics
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Add comment
COMMENT ON TABLE public.ai_usage_metrics IS 'Stores AI usage metrics for the hybrid AI system analytics';