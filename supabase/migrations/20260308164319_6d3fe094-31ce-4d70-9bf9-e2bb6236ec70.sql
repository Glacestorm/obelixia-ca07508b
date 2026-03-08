
-- =============================================
-- Premium API & Webhooks Schema
-- =============================================

-- API Clients (external consumers)
CREATE TABLE public.erp_hr_api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_minute INT DEFAULT 60,
  allowed_ips TEXT[],
  created_by UUID REFERENCES auth.users(id),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.erp_hr_api_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage API clients for their company"
  ON public.erp_hr_api_clients FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.erp_companies));

-- Webhook Subscriptions
CREATE TABLE public.erp_hr_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  retry_policy JSONB DEFAULT '{"max_retries": 3, "backoff_ms": 1000}',
  last_triggered_at TIMESTAMPTZ,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.erp_hr_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage webhooks for their company"
  ON public.erp_hr_webhook_subscriptions FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.erp_companies));

-- Webhook Delivery Log
CREATE TABLE public.erp_hr_webhook_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.erp_hr_webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INT,
  response_body TEXT,
  response_time_ms INT,
  attempt_number INT DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','success','failed','retrying')),
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.erp_hr_webhook_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery logs for their webhooks"
  ON public.erp_hr_webhook_delivery_log FOR ALL TO authenticated
  USING (subscription_id IN (
    SELECT id FROM public.erp_hr_webhook_subscriptions
    WHERE company_id IN (SELECT id FROM public.erp_companies)
  ));

-- API Access Log
CREATE TABLE public.erp_hr_api_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.erp_hr_api_clients(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INT,
  request_params JSONB DEFAULT '{}',
  response_time_ms INT,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.erp_hr_api_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view access logs for their company"
  ON public.erp_hr_api_access_log FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.erp_companies));

-- Event Catalog
CREATE TABLE public.erp_hr_api_event_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  payload_schema JSONB DEFAULT '{}',
  example_payload JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.erp_hr_api_event_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read event catalog"
  ON public.erp_hr_api_event_catalog FOR SELECT TO authenticated USING (true);

-- Seed event catalog
INSERT INTO public.erp_hr_api_event_catalog (event_type, category, description, example_payload) VALUES
  ('report.generated', 'reporting', 'Un reporte ejecutivo ha sido generado', '{"report_id": "uuid", "template": "ceo_dashboard", "format": "pdf"}'),
  ('report.reviewed', 'reporting', 'Un reporte ha sido revisado', '{"report_id": "uuid", "reviewer": "user_id", "status": "reviewed"}'),
  ('report.approved', 'reporting', 'Un reporte ha sido aprobado', '{"report_id": "uuid", "approver": "user_id"}'),
  ('regulatory_report.generated', 'compliance', 'Un informe regulatorio ha sido generado', '{"report_id": "uuid", "type": "plan_igualdad"}'),
  ('regulatory_report.approved', 'compliance', 'Un informe regulatorio ha sido aprobado', '{"report_id": "uuid", "type": "auditoria_retributiva"}'),
  ('compliance.alert_created', 'compliance', 'Se ha creado una alerta de cumplimiento', '{"alert_id": "uuid", "severity": "high", "module": "gdpr"}'),
  ('fairness.risk_detected', 'fairness', 'Se ha detectado un riesgo de equidad', '{"risk_type": "pay_gap", "severity": "critical", "department": "engineering"}'),
  ('security.incident_created', 'security', 'Se ha registrado un incidente de seguridad', '{"incident_id": "uuid", "type": "sod_violation", "severity": "high"}'),
  ('legal.contract_synced', 'legal', 'Un contrato ha sido sincronizado desde el ERP', '{"contract_id": "uuid", "employee_id": "uuid", "action": "sync"}'),
  ('orchestration.chain_completed', 'orchestration', 'Una cadena de orquestación ha finalizado', '{"chain_id": "uuid", "steps_completed": 5, "status": "success"}'),
  ('workforce.gap_detected', 'workforce', 'Se ha detectado un gap de plantilla', '{"department": "sales", "gap_type": "headcount", "severity": "medium"}'),
  ('api_client.created', 'admin', 'Un nuevo cliente API ha sido registrado', '{"client_id": "uuid", "name": "External BI System"}'),
  ('webhook.delivery_failed', 'admin', 'Una entrega de webhook ha fallado', '{"subscription_id": "uuid", "event_type": "report.generated", "attempts": 3}');
