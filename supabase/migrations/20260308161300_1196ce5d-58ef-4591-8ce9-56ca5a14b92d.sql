-- Advanced Reporting Engine tables

-- 1. Report Templates
CREATE TABLE public.erp_hr_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  template_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  target_role text,
  target_module text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  kpi_definitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  filters_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  supported_formats text[] NOT NULL DEFAULT ARRAY['pdf','excel'],
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Generated Reports
CREATE TABLE public.erp_hr_generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.erp_hr_report_templates(id),
  report_name text NOT NULL,
  report_type text NOT NULL DEFAULT 'on_demand',
  format text NOT NULL DEFAULT 'pdf',
  status text NOT NULL DEFAULT 'pending',
  generated_by uuid NOT NULL,
  filters_applied jsonb NOT NULL DEFAULT '{}'::jsonb,
  modules_included text[] NOT NULL DEFAULT '{}',
  data_sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_snapshot jsonb,
  file_url text,
  file_size_bytes bigint,
  generation_time_ms integer,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 3. Report Schedules
CREATE TABLE public.erp_hr_report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.erp_hr_report_templates(id),
  schedule_name text NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly',
  cron_expression text,
  format text NOT NULL DEFAULT 'pdf',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_method text NOT NULL DEFAULT 'download',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.erp_hr_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_report_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies using existing premium access function
CREATE POLICY "report_templates_access" ON public.erp_hr_report_templates
  FOR ALL TO authenticated
  USING (company_id IS NULL OR public.user_has_erp_premium_access(company_id));

CREATE POLICY "generated_reports_access" ON public.erp_hr_generated_reports
  FOR ALL TO authenticated
  USING (public.user_has_erp_premium_access(company_id));

CREATE POLICY "report_schedules_access" ON public.erp_hr_report_schedules
  FOR ALL TO authenticated
  USING (public.user_has_erp_premium_access(company_id));

-- Index for performance
CREATE INDEX idx_generated_reports_company ON public.erp_hr_generated_reports(company_id, created_at DESC);
CREATE INDEX idx_report_schedules_active ON public.erp_hr_report_schedules(company_id, is_active) WHERE is_active = true;
