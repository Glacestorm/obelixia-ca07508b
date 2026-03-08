
-- Mesh Federations: grouping of installations for multi-site sync
CREATE TABLE IF NOT EXISTS public.mesh_federations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federation_name TEXT NOT NULL,
  client_id UUID,
  description TEXT,
  sync_policy JSONB DEFAULT '{"default_strategy": "lww", "conflict_threshold": 10, "sync_interval_seconds": 60}',
  status TEXT NOT NULL DEFAULT 'active',
  node_count INTEGER NOT NULL DEFAULT 0,
  total_syncs INTEGER NOT NULL DEFAULT 0,
  total_conflicts INTEGER NOT NULL DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mesh Federation Nodes: installations belonging to a federation
CREATE TABLE IF NOT EXISTS public.mesh_federation_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federation_id UUID NOT NULL REFERENCES public.mesh_federations(id) ON DELETE CASCADE,
  installation_id UUID,
  node_name TEXT NOT NULL,
  node_role TEXT NOT NULL DEFAULT 'replica',
  connection_status TEXT NOT NULL DEFAULT 'disconnected',
  last_heartbeat TIMESTAMPTZ,
  vector_clock JSONB DEFAULT '{}',
  pending_operations INTEGER NOT NULL DEFAULT 0,
  sync_latency_ms INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mesh Sync Log: record of sync operations between nodes
CREATE TABLE IF NOT EXISTS public.mesh_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federation_id UUID NOT NULL REFERENCES public.mesh_federations(id) ON DELETE CASCADE,
  origin_node_id UUID REFERENCES public.mesh_federation_nodes(id),
  destination_node_id UUID REFERENCES public.mesh_federation_nodes(id),
  sync_type TEXT NOT NULL DEFAULT 'incremental',
  records_synced INTEGER NOT NULL DEFAULT 0,
  conflicts_detected INTEGER NOT NULL DEFAULT 0,
  conflicts_resolved INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  sync_metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Mesh Conflict Resolutions: conflicts detected with strategy applied
CREATE TABLE IF NOT EXISTS public.mesh_conflict_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federation_id UUID NOT NULL REFERENCES public.mesh_federations(id) ON DELETE CASCADE,
  sync_log_id UUID REFERENCES public.mesh_sync_log(id),
  conflict_type TEXT NOT NULL DEFAULT 'data_divergence',
  data_type TEXT NOT NULL DEFAULT 'generic',
  table_name TEXT,
  record_id TEXT,
  origin_value JSONB,
  destination_value JSONB,
  resolved_value JSONB,
  resolution_strategy TEXT NOT NULL DEFAULT 'lww',
  resolved_by TEXT DEFAULT 'auto',
  resolution_status TEXT NOT NULL DEFAULT 'resolved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.mesh_federations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesh_federation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesh_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesh_conflict_resolutions ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can manage
CREATE POLICY "Authenticated can view federations" ON public.mesh_federations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage federations" ON public.mesh_federations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can view nodes" ON public.mesh_federation_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage nodes" ON public.mesh_federation_nodes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can view sync log" ON public.mesh_sync_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sync log" ON public.mesh_sync_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can view conflicts" ON public.mesh_conflict_resolutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage conflicts" ON public.mesh_conflict_resolutions FOR ALL TO authenticated USING (true) WITH CHECK (true);
