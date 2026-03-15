
-- Regulatory Intelligence: Sources & Documents
CREATE TABLE public.erp_regulatory_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'official_bulletin',
  url TEXT,
  issuing_body TEXT,
  country TEXT,
  territorial_scope TEXT NOT NULL DEFAULT 'national',
  jurisdiction_code TEXT NOT NULL DEFAULT 'ES',
  domain_tags TEXT[] DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  refresh_frequency TEXT DEFAULT 'weekly',
  last_checked_at TIMESTAMPTZ,
  entries_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.erp_regulatory_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.erp_regulatory_sources(id) ON DELETE SET NULL,
  document_title TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'regulation',
  reference_code TEXT,
  issuing_body TEXT,
  territorial_scope TEXT DEFAULT 'national',
  jurisdiction_code TEXT DEFAULT 'ES',
  publication_date DATE,
  effective_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'active',
  summary TEXT,
  impact_summary TEXT,
  impact_domains TEXT[] DEFAULT '{}',
  impact_level TEXT DEFAULT 'medium',
  legal_area TEXT,
  tags TEXT[] DEFAULT '{}',
  source_url TEXT,
  origin_verified BOOLEAN DEFAULT false,
  requires_human_review BOOLEAN DEFAULT false,
  data_source TEXT DEFAULT 'seed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.erp_regulatory_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_regulatory_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regulatory_sources_read" ON public.erp_regulatory_sources
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "regulatory_sources_admin" ON public.erp_regulatory_sources
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "regulatory_documents_read" ON public.erp_regulatory_documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "regulatory_documents_admin" ON public.erp_regulatory_documents
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Indexes
CREATE INDEX idx_reg_docs_source ON public.erp_regulatory_documents(source_id);
CREATE INDEX idx_reg_docs_jurisdiction ON public.erp_regulatory_documents(jurisdiction_code);
CREATE INDEX idx_reg_docs_status ON public.erp_regulatory_documents(status);
CREATE INDEX idx_reg_docs_impact ON public.erp_regulatory_documents USING GIN (impact_domains);
CREATE INDEX idx_reg_sources_jurisdiction ON public.erp_regulatory_sources(jurisdiction_code);
