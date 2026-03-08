
-- ============================================
-- FASE 5: Digital Twin de Instalación
-- ============================================

-- Tabla principal de digital twins
CREATE TABLE public.digital_twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.client_installations(id) ON DELETE CASCADE,
  twin_name TEXT NOT NULL DEFAULT 'Twin Principal',
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'syncing', 'simulating', 'error', 'outdated')),
  last_sync_at TIMESTAMPTZ,
  snapshot_config JSONB DEFAULT '{}',
  snapshot_modules JSONB DEFAULT '[]',
  snapshot_metrics JSONB DEFAULT '{}',
  divergence_score NUMERIC(5,2) DEFAULT 0,
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_interval_minutes INTEGER DEFAULT 60,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(installation_id)
);

-- Snapshots periódicos
CREATE TABLE public.twin_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES public.digital_twins(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL DEFAULT 'auto' CHECK (snapshot_type IN ('auto', 'manual', 'pre_update', 'post_update', 'diagnostic')),
  config_snapshot JSONB DEFAULT '{}',
  modules_snapshot JSONB DEFAULT '[]',
  metrics_snapshot JSONB DEFAULT '{}',
  health_score NUMERIC(5,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Simulaciones ejecutadas
CREATE TABLE public.twin_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES public.digital_twins(id) ON DELETE CASCADE,
  simulation_type TEXT NOT NULL DEFAULT 'update_test' CHECK (simulation_type IN ('update_test', 'stress_test', 'rollback_test', 'module_install', 'config_change', 'diagnostic')),
  simulation_name TEXT NOT NULL,
  input_params JSONB DEFAULT '{}',
  result_status TEXT NOT NULL DEFAULT 'pending' CHECK (result_status IN ('pending', 'running', 'success', 'failed', 'warning')),
  result_data JSONB DEFAULT '{}',
  risk_score NUMERIC(5,2),
  risk_factors JSONB DEFAULT '[]',
  ai_analysis TEXT,
  ai_recommendation TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.digital_twins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twin_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twin_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage digital_twins" ON public.digital_twins FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage twin_snapshots" ON public.twin_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage twin_simulations" ON public.twin_simulations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_twins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.twin_simulations;
