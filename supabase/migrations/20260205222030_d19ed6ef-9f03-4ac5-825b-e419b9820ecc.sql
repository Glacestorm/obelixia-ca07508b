-- =============================================
-- FASE 3: ADVANCED LEAD SCORING & AI INSIGHTS
-- =============================================

-- Scoring Models (configuración de modelos ML)
CREATE TABLE IF NOT EXISTS public.crm_scoring_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  model_type TEXT NOT NULL DEFAULT 'predictive', -- predictive, rule_based, hybrid, ml_ensemble
  status TEXT NOT NULL DEFAULT 'draft', -- draft, training, active, archived
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Configuración del modelo
  scoring_factors JSONB DEFAULT '[]'::jsonb,
  weights JSONB DEFAULT '{}'::jsonb,
  thresholds JSONB DEFAULT '{"hot": 80, "warm": 50, "cold": 20}'::jsonb,
  
  -- ML Parameters
  ml_config JSONB DEFAULT '{}'::jsonb,
  training_data_config JSONB DEFAULT '{}'::jsonb,
  feature_importance JSONB DEFAULT '[]'::jsonb,
  
  -- Performance metrics
  accuracy DECIMAL(5,4),
  precision_score DECIMAL(5,4),
  recall_score DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  auc_roc DECIMAL(5,4),
  last_trained_at TIMESTAMPTZ,
  training_samples INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lead Scores (puntuaciones calculadas)
CREATE TABLE IF NOT EXISTS public.crm_lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  model_id UUID REFERENCES public.crm_scoring_models(id) ON DELETE SET NULL,
  
  -- Scores principales
  total_score INTEGER NOT NULL DEFAULT 0,
  fit_score INTEGER DEFAULT 0, -- ICP fit (0-40)
  engagement_score INTEGER DEFAULT 0, -- Behavioral (0-30)
  intent_score INTEGER DEFAULT 0, -- Purchase intent (0-30)
  
  -- Clasificación
  tier TEXT DEFAULT 'D', -- A, B, C, D
  readiness TEXT DEFAULT 'cold', -- hot, warm, cold
  
  -- Score breakdown detallado
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  contributing_factors JSONB DEFAULT '[]'::jsonb,
  
  -- Predicciones ML
  conversion_probability DECIMAL(5,4),
  estimated_deal_size DECIMAL(15,2),
  predicted_close_date DATE,
  churn_risk DECIMAL(5,4),
  
  -- Tendencias
  score_trend TEXT DEFAULT 'stable', -- up, down, stable
  trend_percentage DECIMAL(5,2) DEFAULT 0,
  velocity_score INTEGER DEFAULT 0, -- Rapidez de movimiento en pipeline
  
  -- Timestamps
  calculated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Score History (historial para análisis de tendencias)
CREATE TABLE IF NOT EXISTS public.crm_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  model_id UUID REFERENCES public.crm_scoring_models(id) ON DELETE SET NULL,
  
  -- Scores en ese momento
  total_score INTEGER NOT NULL,
  fit_score INTEGER,
  engagement_score INTEGER,
  intent_score INTEGER,
  tier TEXT,
  readiness TEXT,
  
  -- Contexto
  trigger_event TEXT, -- what caused the recalculation
  score_delta INTEGER DEFAULT 0,
  snapshot JSONB DEFAULT '{}'::jsonb,
  
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Behavioral Events (tracking de comportamiento)
CREATE TABLE IF NOT EXISTS public.crm_behavioral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  contact_id UUID,
  
  -- Evento
  event_type TEXT NOT NULL, -- page_view, email_open, email_click, form_submit, demo_request, pricing_view, etc.
  event_category TEXT NOT NULL, -- website, email, form, meeting, call, social
  event_name TEXT NOT NULL,
  
  -- Datos del evento
  event_data JSONB DEFAULT '{}'::jsonb,
  page_url TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Scoring impact
  score_impact INTEGER DEFAULT 0,
  decay_rate DECIMAL(5,4) DEFAULT 0.1, -- Tasa de decaimiento temporal
  
  -- Device/Session
  session_id TEXT,
  device_type TEXT,
  browser TEXT,
  ip_country TEXT,
  ip_city TEXT,
  
  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Insights (recomendaciones de IA)
CREATE TABLE IF NOT EXISTS public.crm_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID,
  deal_id UUID,
  contact_id UUID,
  account_id UUID,
  
  -- Insight
  insight_type TEXT NOT NULL, -- recommendation, prediction, alert, opportunity, risk
  category TEXT NOT NULL, -- scoring, engagement, timing, content, channel, pricing
  priority TEXT DEFAULT 'medium', -- critical, high, medium, low
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_items JSONB DEFAULT '[]'::jsonb,
  
  -- AI Analysis
  confidence DECIMAL(5,4) NOT NULL,
  reasoning TEXT,
  supporting_data JSONB DEFAULT '{}'::jsonb,
  model_version TEXT,
  
  -- Impact estimation
  estimated_impact JSONB DEFAULT '{}'::jsonb, -- revenue, conversion, time
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, viewed, accepted, dismissed, completed
  actioned_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES auth.users(id),
  feedback TEXT,
  was_helpful BOOLEAN,
  
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scoring Rules (reglas personalizables)
CREATE TABLE IF NOT EXISTS public.crm_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.crm_scoring_models(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL, -- attribute, behavior, demographic, firmographic, engagement
  
  -- Condiciones
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  operator TEXT DEFAULT 'AND', -- AND, OR
  
  -- Impacto
  score_impact INTEGER NOT NULL DEFAULT 0,
  impact_type TEXT DEFAULT 'add', -- add, subtract, multiply, set
  max_occurrences INTEGER, -- Límite de veces que aplica
  decay_days INTEGER, -- Días hasta que el impacto decae
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Predictive Signals (señales predictivas detectadas)
CREATE TABLE IF NOT EXISTS public.crm_predictive_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  
  signal_type TEXT NOT NULL, -- buying_intent, budget_available, timeline_urgent, competitor_evaluation, etc.
  signal_strength DECIMAL(5,4) NOT NULL, -- 0-1
  
  -- Detección
  detected_from TEXT NOT NULL, -- behavior, content, timing, external
  source_events JSONB DEFAULT '[]'::jsonb,
  evidence TEXT,
  
  -- Scoring
  score_contribution INTEGER DEFAULT 0,
  
  -- Validez
  detected_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_lead ON public.crm_lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_model ON public.crm_lead_scores(model_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_tier ON public.crm_lead_scores(tier);
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_readiness ON public.crm_lead_scores(readiness);
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_total ON public.crm_lead_scores(total_score DESC);

CREATE INDEX IF NOT EXISTS idx_crm_score_history_lead ON public.crm_score_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_score_history_recorded ON public.crm_score_history(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_behavioral_events_lead ON public.crm_behavioral_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_behavioral_events_type ON public.crm_behavioral_events(event_type);
CREATE INDEX IF NOT EXISTS idx_crm_behavioral_events_occurred ON public.crm_behavioral_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_behavioral_events_session ON public.crm_behavioral_events(session_id);

CREATE INDEX IF NOT EXISTS idx_crm_ai_insights_lead ON public.crm_ai_insights(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_ai_insights_status ON public.crm_ai_insights(status);
CREATE INDEX IF NOT EXISTS idx_crm_ai_insights_priority ON public.crm_ai_insights(priority);
CREATE INDEX IF NOT EXISTS idx_crm_ai_insights_type ON public.crm_ai_insights(insight_type);

CREATE INDEX IF NOT EXISTS idx_crm_scoring_rules_model ON public.crm_scoring_rules(model_id);
CREATE INDEX IF NOT EXISTS idx_crm_predictive_signals_lead ON public.crm_predictive_signals(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_predictive_signals_active ON public.crm_predictive_signals(is_active) WHERE is_active = true;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.crm_scoring_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_behavioral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_predictive_signals ENABLE ROW LEVEL SECURITY;

-- Policies para scoring_models
CREATE POLICY "scoring_models_select" ON public.crm_scoring_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "scoring_models_insert" ON public.crm_scoring_models FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
);
CREATE POLICY "scoring_models_update" ON public.crm_scoring_models FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
);
CREATE POLICY "scoring_models_delete" ON public.crm_scoring_models FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'superadmin'::app_role)
);

-- Policies para lead_scores (todos pueden ver, admins modifican)
CREATE POLICY "lead_scores_select" ON public.crm_lead_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_scores_all" ON public.crm_lead_scores FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
);

-- Policies para score_history
CREATE POLICY "score_history_select" ON public.crm_score_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "score_history_insert" ON public.crm_score_history FOR INSERT TO authenticated WITH CHECK (true);

-- Policies para behavioral_events
CREATE POLICY "behavioral_events_select" ON public.crm_behavioral_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "behavioral_events_insert" ON public.crm_behavioral_events FOR INSERT TO authenticated WITH CHECK (true);

-- Policies para ai_insights
CREATE POLICY "ai_insights_select" ON public.crm_ai_insights FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_insights_all" ON public.crm_ai_insights FOR ALL TO authenticated USING (true);

-- Policies para scoring_rules
CREATE POLICY "scoring_rules_select" ON public.crm_scoring_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "scoring_rules_all" ON public.crm_scoring_rules FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
);

-- Policies para predictive_signals
CREATE POLICY "predictive_signals_select" ON public.crm_predictive_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "predictive_signals_insert" ON public.crm_predictive_signals FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- TRIGGERS
-- =============================================
CREATE OR REPLACE TRIGGER update_crm_scoring_models_updated_at
  BEFORE UPDATE ON public.crm_scoring_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_crm_lead_scores_updated_at
  BEFORE UPDATE ON public.crm_lead_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_crm_ai_insights_updated_at
  BEFORE UPDATE ON public.crm_ai_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_crm_scoring_rules_updated_at
  BEFORE UPDATE ON public.crm_scoring_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- DEFAULT SCORING MODEL
-- =============================================
INSERT INTO public.crm_scoring_models (
  name, description, model_type, status, is_default,
  scoring_factors, weights, thresholds
) VALUES (
  'Default B2B Lead Scoring Model',
  'Modelo predictivo por defecto para puntuación de leads B2B con factores de fit, engagement e intent',
  'hybrid',
  'active',
  true,
  '[
    {"name": "company_size", "category": "fit", "weight": 15},
    {"name": "industry_match", "category": "fit", "weight": 10},
    {"name": "budget_range", "category": "fit", "weight": 15},
    {"name": "email_opens", "category": "engagement", "weight": 5},
    {"name": "email_clicks", "category": "engagement", "weight": 8},
    {"name": "page_views", "category": "engagement", "weight": 5},
    {"name": "demo_requests", "category": "engagement", "weight": 12},
    {"name": "pricing_views", "category": "intent", "weight": 10},
    {"name": "competitor_mentions", "category": "intent", "weight": 8},
    {"name": "timeline_urgency", "category": "intent", "weight": 12}
  ]'::jsonb,
  '{"fit": 0.4, "engagement": 0.3, "intent": 0.3}'::jsonb,
  '{"hot": 80, "warm": 50, "cold": 20}'::jsonb
) ON CONFLICT DO NOTHING;