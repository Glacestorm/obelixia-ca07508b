
-- Phase 7: ESG Social + Self-Service Portal
-- ESG Social metrics linked to HR
CREATE TABLE public.erp_hr_esg_social_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL DEFAULT 'demo-company-id',
  period TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'social',
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '%',
  target_value NUMERIC,
  benchmark_value NUMERIC,
  trend TEXT DEFAULT 'stable',
  source TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employee self-service requests
CREATE TABLE public.erp_hr_self_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  company_id TEXT NOT NULL DEFAULT 'demo-company-id',
  request_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  assigned_to UUID,
  resolution TEXT,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Self-service FAQ / knowledge base
CREATE TABLE public.erp_hr_self_service_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL DEFAULT 'demo-company-id',
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  helpful_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employee satisfaction surveys (ESG Social)
CREATE TABLE public.erp_hr_esg_social_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL DEFAULT 'demo-company-id',
  title TEXT NOT NULL,
  description TEXT,
  survey_type TEXT DEFAULT 'pulse',
  status TEXT DEFAULT 'draft',
  questions JSONB DEFAULT '[]',
  target_audience TEXT DEFAULT 'all',
  response_count INT DEFAULT 0,
  avg_score NUMERIC DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ESG Social KPIs dashboard
CREATE TABLE public.erp_hr_esg_social_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL DEFAULT 'demo-company-id',
  kpi_name TEXT NOT NULL,
  kpi_code TEXT NOT NULL,
  category TEXT NOT NULL,
  current_value NUMERIC DEFAULT 0,
  target_value NUMERIC DEFAULT 0,
  previous_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '%',
  period TEXT NOT NULL,
  framework TEXT DEFAULT 'GRI',
  gri_disclosure TEXT,
  status TEXT DEFAULT 'on_track',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Self-service document requests
CREATE TABLE public.erp_hr_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  company_id TEXT NOT NULL DEFAULT 'demo-company-id',
  document_type TEXT NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'pending',
  generated_at TIMESTAMPTZ,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.erp_hr_esg_social_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_self_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_self_service_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_esg_social_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_esg_social_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_document_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies (authenticated access)
CREATE POLICY "auth_esg_social_metrics" ON public.erp_hr_esg_social_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_self_service_requests" ON public.erp_hr_self_service_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_self_service_faq" ON public.erp_hr_self_service_faq FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_esg_social_surveys" ON public.erp_hr_esg_social_surveys FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_esg_social_kpis" ON public.erp_hr_esg_social_kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_document_requests" ON public.erp_hr_document_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime for self-service requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_self_service_requests;
