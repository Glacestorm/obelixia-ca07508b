-- =====================================================
-- FASE 5: CRM ADVANCED ANALYTICS & REPORTING
-- Dashboards ejecutivos, análisis predictivo, reportería automatizada
-- =====================================================

-- Tabla de dashboards CRM personalizados
CREATE TABLE public.crm_analytics_dashboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL,
  description TEXT,
  dashboard_type TEXT NOT NULL DEFAULT 'executive', -- executive, sales, marketing, support
  layout_config JSONB DEFAULT '{}',
  widgets JSONB DEFAULT '[]',
  filters JSONB DEFAULT '{}',
  refresh_interval_seconds INTEGER DEFAULT 300,
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  shared_with_roles TEXT[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de widgets de analytics
CREATE TABLE public.crm_analytics_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID REFERENCES public.crm_analytics_dashboards(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL, -- metric, chart, table, funnel, heatmap, cohort, forecast
  title TEXT NOT NULL,
  description TEXT,
  data_source TEXT NOT NULL, -- deals, contacts, activities, campaigns, touchpoints
  query_config JSONB NOT NULL DEFAULT '{}',
  visualization_config JSONB DEFAULT '{}',
  position JSONB DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 3}',
  refresh_independently BOOLEAN DEFAULT false,
  cache_duration_seconds INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de reportes programados
CREATE TABLE public.crm_scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL, -- sales_summary, pipeline_analysis, marketing_performance, executive_summary
  template_config JSONB NOT NULL DEFAULT '{}',
  sections JSONB DEFAULT '[]',
  schedule_cron TEXT, -- Cron expression para programación
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  recipients JSONB DEFAULT '[]', -- Array de emails/user_ids
  delivery_channels TEXT[] DEFAULT '{email}', -- email, slack, webhook
  export_format TEXT DEFAULT 'pdf', -- pdf, excel, csv, html
  filters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de ejecuciones de reportes
CREATE TABLE public.crm_report_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.crm_scheduled_reports(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  output_url TEXT, -- URL del reporte generado
  output_size_bytes INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de métricas CRM calculadas
CREATE TABLE public.crm_calculated_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  metric_name TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- sales, marketing, support, revenue
  calculation_formula TEXT, -- Fórmula o lógica de cálculo
  data_sources TEXT[] DEFAULT '{}',
  aggregation_type TEXT DEFAULT 'sum', -- sum, avg, count, min, max, custom
  unit TEXT, -- currency, percentage, count, time
  current_value NUMERIC,
  previous_value NUMERIC,
  target_value NUMERIC,
  trend TEXT, -- up, down, stable
  trend_percentage NUMERIC,
  period_type TEXT DEFAULT 'monthly', -- daily, weekly, monthly, quarterly, yearly
  calculated_at TIMESTAMPTZ,
  sparkline_data JSONB DEFAULT '[]',
  breakdown_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, metric_key)
);

-- Tabla de análisis predictivo CRM
CREATE TABLE public.crm_predictive_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  analysis_type TEXT NOT NULL, -- churn_risk, deal_forecast, lead_conversion, revenue_prediction
  entity_type TEXT NOT NULL, -- contact, deal, account, campaign
  entity_id UUID,
  prediction_score NUMERIC, -- 0-100
  confidence_level NUMERIC, -- 0-100
  risk_factors JSONB DEFAULT '[]',
  opportunity_factors JSONB DEFAULT '[]',
  recommended_actions JSONB DEFAULT '[]',
  model_version TEXT,
  predicted_outcome JSONB DEFAULT '{}',
  predicted_value NUMERIC,
  predicted_date TIMESTAMPTZ,
  actual_outcome JSONB,
  was_accurate BOOLEAN,
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de alertas de analytics
CREATE TABLE public.crm_analytics_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  alert_name TEXT NOT NULL,
  description TEXT,
  metric_id UUID REFERENCES public.crm_calculated_metrics(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- threshold, anomaly, trend, goal
  condition_operator TEXT NOT NULL, -- gt, lt, eq, gte, lte, change_pct
  threshold_value NUMERIC,
  severity TEXT DEFAULT 'info', -- info, warning, critical
  notification_channels TEXT[] DEFAULT '{in_app}',
  recipients JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  cooldown_minutes INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de historial de alertas disparadas
CREATE TABLE public.crm_alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES public.crm_analytics_alerts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  metric_value NUMERIC,
  threshold_value NUMERIC,
  severity TEXT,
  notification_sent BOOLEAN DEFAULT false,
  notification_channels TEXT[],
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Tabla de cohort analysis
CREATE TABLE public.crm_cohort_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  cohort_type TEXT NOT NULL, -- acquisition, conversion, retention, revenue
  cohort_period TEXT NOT NULL, -- weekly, monthly, quarterly
  cohort_date DATE NOT NULL,
  period_index INTEGER NOT NULL, -- 0 = cohort period, 1 = first period after, etc.
  total_entities INTEGER,
  active_entities INTEGER,
  metric_value NUMERIC,
  retention_rate NUMERIC,
  cumulative_value NUMERIC,
  segmentation JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, cohort_type, cohort_date, period_index)
);

-- Tabla de funnel analysis
CREATE TABLE public.crm_funnel_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  funnel_name TEXT NOT NULL,
  funnel_type TEXT NOT NULL, -- sales, marketing, onboarding, support
  analysis_period_start DATE,
  analysis_period_end DATE,
  stages JSONB NOT NULL, -- Array de stages con counts y conversion rates
  total_entered INTEGER,
  total_converted INTEGER,
  overall_conversion_rate NUMERIC,
  average_time_to_convert INTERVAL,
  drop_off_analysis JSONB DEFAULT '{}',
  bottleneck_stage TEXT,
  recommendations JSONB DEFAULT '[]',
  compared_to_previous JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_crm_dashboards_company ON public.crm_analytics_dashboards(company_id);
CREATE INDEX idx_crm_widgets_dashboard ON public.crm_analytics_widgets(dashboard_id);
CREATE INDEX idx_crm_scheduled_reports_company ON public.crm_scheduled_reports(company_id);
CREATE INDEX idx_crm_scheduled_reports_next_run ON public.crm_scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX idx_crm_report_executions_report ON public.crm_report_executions(report_id);
CREATE INDEX idx_crm_calculated_metrics_company ON public.crm_calculated_metrics(company_id);
CREATE INDEX idx_crm_calculated_metrics_category ON public.crm_calculated_metrics(category);
CREATE INDEX idx_crm_predictive_analytics_company ON public.crm_predictive_analytics(company_id);
CREATE INDEX idx_crm_predictive_analytics_entity ON public.crm_predictive_analytics(entity_type, entity_id);
CREATE INDEX idx_crm_analytics_alerts_company ON public.crm_analytics_alerts(company_id);
CREATE INDEX idx_crm_alert_history_alert ON public.crm_alert_history(alert_id);
CREATE INDEX idx_crm_cohort_analysis_company ON public.crm_cohort_analysis(company_id, cohort_type);
CREATE INDEX idx_crm_funnel_analysis_company ON public.crm_funnel_analysis(company_id);

-- RLS Policies
ALTER TABLE public.crm_analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_analytics_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_report_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_calculated_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_predictive_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_analytics_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cohort_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_funnel_analysis ENABLE ROW LEVEL SECURITY;

-- Políticas para dashboards
CREATE POLICY "Users can view company dashboards" ON public.crm_analytics_dashboards
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR is_shared = true
  );

CREATE POLICY "Users can manage company dashboards" ON public.crm_analytics_dashboards
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Políticas para widgets
CREATE POLICY "Users can view dashboard widgets" ON public.crm_analytics_widgets
  FOR SELECT USING (
    dashboard_id IN (
      SELECT id FROM public.crm_analytics_dashboards 
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage dashboard widgets" ON public.crm_analytics_widgets
  FOR ALL USING (
    dashboard_id IN (
      SELECT id FROM public.crm_analytics_dashboards 
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Políticas para reportes programados
CREATE POLICY "Users can view company reports" ON public.crm_scheduled_reports
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage company reports" ON public.crm_scheduled_reports
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Políticas para ejecuciones de reportes
CREATE POLICY "Users can view report executions" ON public.crm_report_executions
  FOR SELECT USING (
    report_id IN (
      SELECT id FROM public.crm_scheduled_reports 
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Políticas para métricas calculadas
CREATE POLICY "Users can view company metrics" ON public.crm_calculated_metrics
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage company metrics" ON public.crm_calculated_metrics
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Políticas para analytics predictivo
CREATE POLICY "Users can view company predictions" ON public.crm_predictive_analytics
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage company predictions" ON public.crm_predictive_analytics
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Políticas para alertas
CREATE POLICY "Users can view company alerts" ON public.crm_analytics_alerts
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage company alerts" ON public.crm_analytics_alerts
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Políticas para historial de alertas
CREATE POLICY "Users can view alert history" ON public.crm_alert_history
  FOR SELECT USING (
    alert_id IN (
      SELECT id FROM public.crm_analytics_alerts 
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Políticas para cohort analysis
CREATE POLICY "Users can view company cohorts" ON public.crm_cohort_analysis
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage company cohorts" ON public.crm_cohort_analysis
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Políticas para funnel analysis
CREATE POLICY "Users can view company funnels" ON public.crm_funnel_analysis
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage company funnels" ON public.crm_funnel_analysis
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Trigger para timestamps
CREATE OR REPLACE FUNCTION update_crm_analytics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_dashboards_timestamp
  BEFORE UPDATE ON public.crm_analytics_dashboards
  FOR EACH ROW EXECUTE FUNCTION update_crm_analytics_timestamp();

CREATE TRIGGER update_crm_widgets_timestamp
  BEFORE UPDATE ON public.crm_analytics_widgets
  FOR EACH ROW EXECUTE FUNCTION update_crm_analytics_timestamp();

CREATE TRIGGER update_crm_reports_timestamp
  BEFORE UPDATE ON public.crm_scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION update_crm_analytics_timestamp();

CREATE TRIGGER update_crm_metrics_timestamp
  BEFORE UPDATE ON public.crm_calculated_metrics
  FOR EACH ROW EXECUTE FUNCTION update_crm_analytics_timestamp();

CREATE TRIGGER update_crm_alerts_timestamp
  BEFORE UPDATE ON public.crm_analytics_alerts
  FOR EACH ROW EXECUTE FUNCTION update_crm_analytics_timestamp();