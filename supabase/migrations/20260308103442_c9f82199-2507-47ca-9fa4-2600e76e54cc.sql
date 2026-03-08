
-- P5: Organizational Digital Twin Complete
-- 5 tables for full twin lifecycle

-- 1. Twin Instances (organizational replicas)
CREATE TABLE public.erp_hr_twin_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  twin_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','syncing','paused','archived','error')),
  source_type TEXT NOT NULL DEFAULT 'organization' CHECK (source_type IN ('organization','department','team','process')),
  source_entity_id TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  sync_frequency_minutes INTEGER DEFAULT 60,
  divergence_score NUMERIC(5,2) DEFAULT 0,
  health_score NUMERIC(5,2) DEFAULT 100,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Twin Module Snapshots (state of each HR module in the twin)
CREATE TABLE public.erp_hr_twin_module_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID REFERENCES public.erp_hr_twin_instances(id) ON DELETE CASCADE NOT NULL,
  module_key TEXT NOT NULL,
  module_name TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'synced' CHECK (status IN ('synced','diverged','error','pending')),
  snapshot_data JSONB DEFAULT '{}'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  divergence_details JSONB DEFAULT '[]'::jsonb,
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Twin Metrics History (time-series performance data)
CREATE TABLE public.erp_hr_twin_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID REFERENCES public.erp_hr_twin_instances(id) ON DELETE CASCADE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  unit TEXT DEFAULT 'count',
  dimension TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Twin Experiments (what-if simulations on the twin)
CREATE TABLE public.erp_hr_twin_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID REFERENCES public.erp_hr_twin_instances(id) ON DELETE CASCADE NOT NULL,
  experiment_name TEXT NOT NULL,
  description TEXT,
  experiment_type TEXT NOT NULL DEFAULT 'what_if' CHECK (experiment_type IN ('what_if','stress_test','optimization','rollback','forecast')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','running','completed','failed','cancelled')),
  parameters JSONB DEFAULT '{}'::jsonb,
  baseline_snapshot JSONB DEFAULT '{}'::jsonb,
  result_snapshot JSONB DEFAULT '{}'::jsonb,
  impact_analysis JSONB DEFAULT '{}'::jsonb,
  risk_score NUMERIC(5,2),
  recommendation TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Twin Alerts (divergence and health alerts)
CREATE TABLE public.erp_hr_twin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID REFERENCES public.erp_hr_twin_instances(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('divergence','health','sync_failure','experiment_result','anomaly')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  title TEXT NOT NULL,
  description TEXT,
  module_key TEXT,
  metric_key TEXT,
  threshold_value NUMERIC,
  actual_value NUMERIC,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_twin_instances_company ON public.erp_hr_twin_instances(company_id);
CREATE INDEX idx_twin_modules_twin ON public.erp_hr_twin_module_snapshots(twin_id);
CREATE INDEX idx_twin_metrics_twin_time ON public.erp_hr_twin_metrics_history(twin_id, recorded_at DESC);
CREATE INDEX idx_twin_experiments_twin ON public.erp_hr_twin_experiments(twin_id);
CREATE INDEX idx_twin_alerts_twin ON public.erp_hr_twin_alerts(twin_id, is_resolved);

-- Enable realtime for experiments
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_twin_experiments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_twin_alerts;

-- RLS
ALTER TABLE public.erp_hr_twin_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_twin_module_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_twin_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_twin_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_twin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users full access twin_instances" ON public.erp_hr_twin_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access twin_module_snapshots" ON public.erp_hr_twin_module_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access twin_metrics_history" ON public.erp_hr_twin_metrics_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access twin_experiments" ON public.erp_hr_twin_experiments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access twin_alerts" ON public.erp_hr_twin_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed data
INSERT INTO public.erp_hr_twin_instances (company_id, twin_name, description, status, source_type, divergence_score, health_score, last_sync_at, config) VALUES
('demo-company-id', 'Twin Organizacional Principal', 'Réplica virtual completa de la organización', 'active', 'organization', 3.2, 94.5, now(), '{"sync_mode":"auto","modules_tracked":12,"alerts_enabled":true}'),
('demo-company-id', 'Twin Departamento IT', 'Gemelo digital del departamento tecnológico', 'active', 'department', 1.8, 97.2, now(), '{"sync_mode":"auto","source_department":"IT","focus":"performance"}'),
('demo-company-id', 'Twin Proceso Onboarding', 'Simulación del flujo de incorporación', 'paused', 'process', 8.5, 82.0, now() - interval '2 hours', '{"sync_mode":"manual","process_id":"onboarding","last_experiment":"stress_test"}');

-- Seed module snapshots for main twin
INSERT INTO public.erp_hr_twin_module_snapshots (twin_id, module_key, module_name, status, metrics, snapshot_data) 
SELECT i.id, m.module_key, m.module_name, m.status, m.metrics::jsonb, m.snapshot_data::jsonb
FROM public.erp_hr_twin_instances i,
(VALUES
  ('payroll', 'Nóminas', 'synced', '{"accuracy":99.2,"avg_processing_ms":340,"errors_last_30d":2}', '{"total_payrolls":245,"last_run":"2026-03-07"}'),
  ('contracts', 'Contratos', 'synced', '{"active":180,"expiring_30d":12,"compliance":98.5}', '{"types":{"indefinido":120,"temporal":45,"practicas":15}}'),
  ('time_tracking', 'Control Horario', 'diverged', '{"avg_hours_day":7.8,"absenteeism_rate":3.2,"overtime_pct":8.5}', '{"policies":3,"violations_pending":5}'),
  ('recruitment', 'Reclutamiento', 'synced', '{"open_positions":8,"avg_time_to_hire_days":32,"pipeline":45}', '{"sources":["portal","linkedin","referral"]}'),
  ('wellbeing', 'Bienestar', 'synced', '{"satisfaction":78,"burnout_risk":15,"engagement":82}', '{"programs_active":4,"surveys_pending":1}'),
  ('compliance', 'Compliance', 'synced', '{"score":92,"pending_audits":1,"policies_active":28}', '{"frameworks":["GDPR","LOPDGDD","ET"]}')
) AS m(module_key, module_name, status, metrics, snapshot_data)
WHERE i.twin_name = 'Twin Organizacional Principal';

-- Seed experiments
INSERT INTO public.erp_hr_twin_experiments (twin_id, experiment_name, description, experiment_type, status, parameters, impact_analysis, risk_score, recommendation, completed_at)
SELECT i.id, e.name, e.description, e.etype, e.status, e.params::jsonb, e.impact::jsonb, e.risk, e.rec, e.completed
FROM public.erp_hr_twin_instances i,
(VALUES
  ('Incremento salarial 5% global', 'Simular impacto de subida salarial generalizada', 'what_if', 'completed', '{"salary_increase_pct":5,"scope":"all_departments"}', '{"annual_cost_increase":185000,"retention_improvement_pct":12,"payroll_delta_monthly":15400,"roi_months":8}', 35.0, 'proceed', now() - interval '1 day'),
  ('Reducción jornada 4 días', 'Test de semana laboral de 4 días', 'what_if', 'completed', '{"work_days":4,"hours_per_day":9.5,"departments":["IT","Marketing"]}', '{"productivity_delta_pct":-2,"satisfaction_delta":18,"cost_impact":null,"absenteeism_reduction_pct":25}', 45.0, 'caution', now() - interval '3 days'),
  ('Stress test: 30% rotación', 'Simular pérdida masiva de talento', 'stress_test', 'completed', '{"turnover_rate":30,"departments":"all","timeframe_months":6}', '{"critical_roles_lost":8,"knowledge_loss_risk":"high","recovery_months":14,"estimated_cost":420000}', 85.0, 'abort', now() - interval '5 days')
) AS e(name, description, etype, status, params, impact, risk, rec, completed)
WHERE i.twin_name = 'Twin Organizacional Principal';

-- Seed alerts
INSERT INTO public.erp_hr_twin_alerts (twin_id, alert_type, severity, title, description, module_key, threshold_value, actual_value, is_resolved)
SELECT i.id, a.atype, a.sev, a.title, a.descr, a.mkey, a.thresh, a.actual, a.resolved
FROM public.erp_hr_twin_instances i,
(VALUES
  ('divergence', 'warning', 'Divergencia en Control Horario', 'El módulo de control horario muestra diferencias significativas con producción', 'time_tracking', 5.0, 8.5, false),
  ('health', 'info', 'Health score estable', 'El score de salud se mantiene por encima del umbral', null, 90.0, 94.5, true),
  ('experiment_result', 'warning', 'Stress test: alto riesgo', 'La simulación de 30% rotación indica riesgo crítico de pérdida de conocimiento', null, 50.0, 85.0, false)
) AS a(atype, sev, title, descr, mkey, thresh, actual, resolved)
WHERE i.twin_name = 'Twin Organizacional Principal';
