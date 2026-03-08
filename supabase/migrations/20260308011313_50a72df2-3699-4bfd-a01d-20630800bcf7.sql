
-- Table: ai_usage_pricing - Rules per AI decision type
CREATE TABLE public.ai_usage_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type text NOT NULL,
  display_name text NOT NULL,
  description text,
  module_key text,
  base_price_per_unit numeric NOT NULL DEFAULT 0.01,
  currency text NOT NULL DEFAULT 'EUR',
  price_per_1k_tokens numeric DEFAULT 0.002,
  free_tier_units integer DEFAULT 0,
  is_active boolean DEFAULT true,
  tier_multipliers jsonb DEFAULT '{"basic": 1.0, "premium": 0.8, "enterprise": 0.5}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(decision_type, module_key)
);

ALTER TABLE public.ai_usage_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ai_usage_pricing"
  ON public.ai_usage_pricing FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage ai_usage_pricing"
  ON public.ai_usage_pricing FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Extend usage_billing_events with AI-specific columns
ALTER TABLE public.usage_billing_events ADD COLUMN IF NOT EXISTS ai_model_used text;
ALTER TABLE public.usage_billing_events ADD COLUMN IF NOT EXISTS tokens_consumed integer DEFAULT 0;
ALTER TABLE public.usage_billing_events ADD COLUMN IF NOT EXISTS decision_type text;
ALTER TABLE public.usage_billing_events ADD COLUMN IF NOT EXISTS ai_latency_ms integer;
ALTER TABLE public.usage_billing_events ADD COLUMN IF NOT EXISTS prompt_tokens integer DEFAULT 0;
ALTER TABLE public.usage_billing_events ADD COLUMN IF NOT EXISTS completion_tokens integer DEFAULT 0;

-- Table: ai_usage_invoices - Monthly invoices per installation
CREATE TABLE public.ai_usage_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL REFERENCES public.client_installations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_decisions integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  currency text DEFAULT 'EUR',
  status text DEFAULT 'draft',
  line_items jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  issued_at timestamptz,
  paid_at timestamptz,
  stripe_invoice_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_invoices_installation ON public.ai_usage_invoices(installation_id);
CREATE INDEX idx_ai_invoices_period ON public.ai_usage_invoices(period_start, period_end);
CREATE INDEX idx_ai_invoices_status ON public.ai_usage_invoices(status);

ALTER TABLE public.ai_usage_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ai_usage_invoices"
  ON public.ai_usage_invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage ai_usage_invoices"
  ON public.ai_usage_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default AI pricing rules
INSERT INTO public.ai_usage_pricing (decision_type, display_name, description, module_key, base_price_per_unit, price_per_1k_tokens, free_tier_units) VALUES
  ('irpf_calculation', 'Recálculo IRPF', 'Recálculo automático de IRPF con IA', 'fiscal', 0.05, 0.003, 100),
  ('payroll_optimization', 'Optimización Nómina', 'Sugerencias IA para optimización de nóminas', 'hr', 0.08, 0.004, 50),
  ('competency_analysis', 'Análisis Competencias', 'Evaluación IA de competencias del empleado', 'hr', 0.06, 0.003, 50),
  ('succession_planning', 'Planificación Sucesión', 'Análisis IA de planes de sucesión', 'hr', 0.10, 0.005, 20),
  ('churn_prediction', 'Predicción Churn', 'Predicción de rotación de empleados', 'hr', 0.12, 0.005, 30),
  ('financial_forecast', 'Previsión Financiera', 'Forecast financiero con IA', 'accounting', 0.15, 0.006, 20),
  ('anomaly_detection', 'Detección Anomalías', 'Detección de anomalías contables', 'accounting', 0.08, 0.004, 50),
  ('compliance_check', 'Verificación Cumplimiento', 'Chequeo automático de compliance', 'legal', 0.10, 0.005, 30),
  ('document_analysis', 'Análisis Documentos', 'Extracción y análisis de documentos con IA', 'core', 0.04, 0.002, 100),
  ('sales_prediction', 'Predicción Ventas', 'Forecast de ventas con IA', 'sales', 0.10, 0.005, 30),
  ('inventory_optimization', 'Optimización Inventario', 'Recomendaciones de stock con IA', 'inventory', 0.06, 0.003, 50),
  ('crm_lead_scoring', 'Lead Scoring', 'Puntuación automática de leads', 'crm', 0.05, 0.003, 100),
  ('esg_reporting', 'Reporting ESG', 'Generación automática de informes ESG', 'esg', 0.20, 0.008, 10),
  ('general_assistant', 'Asistente General', 'Consultas generales al asistente IA', 'ai', 0.02, 0.001, 200);
