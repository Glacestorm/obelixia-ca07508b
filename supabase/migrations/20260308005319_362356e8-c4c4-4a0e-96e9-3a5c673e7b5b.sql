
-- Phase 5: Usage billing tracking table
CREATE TABLE IF NOT EXISTS public.usage_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES public.client_installations(id) ON DELETE CASCADE NOT NULL,
  module_key text NOT NULL,
  event_type text NOT NULL DEFAULT 'usage',
  event_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,4) DEFAULT 0,
  total_amount numeric(10,4) DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  billing_period_start date,
  billing_period_end date,
  user_id uuid,
  metadata jsonb DEFAULT '{}',
  billed boolean NOT NULL DEFAULT false,
  billed_at timestamptz,
  invoice_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for billing queries
CREATE INDEX idx_usage_billing_events_installation ON public.usage_billing_events(installation_id, created_at DESC);
CREATE INDEX idx_usage_billing_events_billing ON public.usage_billing_events(billed, billing_period_start);
CREATE INDEX idx_usage_billing_events_module ON public.usage_billing_events(module_key, event_type);

-- Enable RLS
ALTER TABLE public.usage_billing_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view their billing events"
  ON public.usage_billing_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert billing events"
  ON public.usage_billing_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Billing summary view (materialized-like via function)
CREATE OR REPLACE FUNCTION public.get_usage_billing_summary(
  p_installation_id uuid,
  p_period_start date DEFAULT date_trunc('month', now())::date,
  p_period_end date DEFAULT (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date
)
RETURNS TABLE (
  module_key text,
  event_name text,
  total_quantity bigint,
  total_amount numeric,
  currency text,
  event_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ube.module_key,
    ube.event_name,
    SUM(ube.quantity)::bigint as total_quantity,
    SUM(ube.total_amount) as total_amount,
    ube.currency,
    COUNT(*)::bigint as event_count
  FROM public.usage_billing_events ube
  WHERE ube.installation_id = p_installation_id
    AND ube.created_at >= p_period_start
    AND ube.created_at < p_period_end + interval '1 day'
  GROUP BY ube.module_key, ube.event_name, ube.currency
  ORDER BY total_amount DESC;
$$;
