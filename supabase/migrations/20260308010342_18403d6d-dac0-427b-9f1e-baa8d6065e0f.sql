
-- Add health_score to client_installations
ALTER TABLE public.client_installations ADD COLUMN IF NOT EXISTS health_score integer DEFAULT 100;
ALTER TABLE public.client_installations ADD COLUMN IF NOT EXISTS self_healing_enabled boolean DEFAULT true;
ALTER TABLE public.client_installations ADD COLUMN IF NOT EXISTS health_thresholds jsonb DEFAULT '{"critical": 20, "warning": 50, "degraded": 70}'::jsonb;

-- Table: installation_health_checks
CREATE TABLE public.installation_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL REFERENCES public.client_installations(id) ON DELETE CASCADE,
  cpu_usage numeric DEFAULT 0,
  memory_usage numeric DEFAULT 0,
  disk_usage numeric DEFAULT 0,
  response_latency_ms numeric DEFAULT 0,
  error_rate numeric DEFAULT 0,
  active_connections integer DEFAULT 0,
  health_score integer DEFAULT 100,
  metrics_raw jsonb DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_checks_installation ON public.installation_health_checks(installation_id);
CREATE INDEX idx_health_checks_checked_at ON public.installation_health_checks(checked_at DESC);

ALTER TABLE public.installation_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view health checks"
  ON public.installation_health_checks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert health checks"
  ON public.installation_health_checks FOR INSERT TO authenticated WITH CHECK (true);

-- Table: installation_incidents
CREATE TABLE public.installation_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL REFERENCES public.client_installations(id) ON DELETE CASCADE,
  incident_type text NOT NULL DEFAULT 'performance_degradation',
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  description text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  auto_resolved boolean DEFAULT false,
  resolution_type text,
  resolution_details jsonb DEFAULT '{}'::jsonb,
  trigger_metrics jsonb DEFAULT '{}'::jsonb,
  affected_modules text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_installation ON public.installation_incidents(installation_id);
CREATE INDEX idx_incidents_status ON public.installation_incidents(status);
CREATE INDEX idx_incidents_severity ON public.installation_incidents(severity);

ALTER TABLE public.installation_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view incidents"
  ON public.installation_incidents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage incidents"
  ON public.installation_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for health monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.installation_incidents;
