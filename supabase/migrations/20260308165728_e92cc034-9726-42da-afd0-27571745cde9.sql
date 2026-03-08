
-- Enterprise External Integrations Wave 1 (retry - avoid collision with existing table)

-- 1. Enterprise Integration Connectors
CREATE TABLE IF NOT EXISTS public.erp_hr_enterprise_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  connector_type TEXT NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  auth_type TEXT NOT NULL DEFAULT 'api_key',
  credentials_ref TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  health_status TEXT NOT NULL DEFAULT 'unknown',
  last_health_check_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_enterprise_connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enterprise_connectors_company_access" ON public.erp_hr_enterprise_connectors
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

-- 2. BI Export Datasets
CREATE TABLE IF NOT EXISTS public.erp_hr_bi_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  connector_id UUID REFERENCES public.erp_hr_enterprise_connectors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  dataset_type TEXT NOT NULL,
  schema_definition JSONB NOT NULL DEFAULT '{}',
  refresh_frequency TEXT NOT NULL DEFAULT 'daily',
  last_exported_at TIMESTAMPTZ,
  export_format TEXT NOT NULL DEFAULT 'json',
  row_count INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_bi_datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_datasets_company_access" ON public.erp_hr_bi_datasets
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

-- 3. DMS Archival Records
CREATE TABLE IF NOT EXISTS public.erp_hr_dms_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  connector_id UUID REFERENCES public.erp_hr_enterprise_connectors(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  remote_path TEXT,
  remote_id TEXT,
  archive_status TEXT NOT NULL DEFAULT 'pending',
  file_size_bytes BIGINT,
  mime_type TEXT DEFAULT 'application/pdf',
  metadata JSONB DEFAULT '{}',
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_dms_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dms_archives_company_access" ON public.erp_hr_dms_archives
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

-- 4. E-Sign Envelopes
CREATE TABLE IF NOT EXISTS public.erp_hr_esign_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  connector_id UUID REFERENCES public.erp_hr_enterprise_connectors(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  document_name TEXT NOT NULL,
  envelope_status TEXT NOT NULL DEFAULT 'draft',
  remote_envelope_id TEXT,
  signers JSONB NOT NULL DEFAULT '[]',
  expiration_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  signed_document_url TEXT,
  metadata JSONB DEFAULT '{}',
  initiated_by UUID REFERENCES auth.users(id),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_esign_envelopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "esign_envelopes_company_access" ON public.erp_hr_esign_envelopes
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

-- 5. Enterprise Integration Activity Log (different name to avoid collision)
CREATE TABLE public.erp_hr_ext_integration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  connector_id UUID REFERENCES public.erp_hr_enterprise_connectors(id) ON DELETE SET NULL,
  integration_type TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'info',
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  error_message TEXT,
  duration_ms INTEGER,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_ext_integration_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ext_integration_log_read" ON public.erp_hr_ext_integration_log
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));
CREATE POLICY "ext_integration_log_insert" ON public.erp_hr_ext_integration_log
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ent_connectors_company ON public.erp_hr_enterprise_connectors(company_id);
CREATE INDEX IF NOT EXISTS idx_bi_datasets_company ON public.erp_hr_bi_datasets(company_id);
CREATE INDEX IF NOT EXISTS idx_dms_archives_company ON public.erp_hr_dms_archives(company_id);
CREATE INDEX IF NOT EXISTS idx_dms_archives_status ON public.erp_hr_dms_archives(archive_status);
CREATE INDEX IF NOT EXISTS idx_esign_envelopes_company ON public.erp_hr_esign_envelopes(company_id);
CREATE INDEX IF NOT EXISTS idx_esign_envelopes_status ON public.erp_hr_esign_envelopes(envelope_status);
CREATE INDEX IF NOT EXISTS idx_ext_int_log_company ON public.erp_hr_ext_integration_log(company_id);
CREATE INDEX IF NOT EXISTS idx_ext_int_log_type ON public.erp_hr_ext_integration_log(integration_type);
