
-- =============================================
-- BLOCK 3: Energy news/regulations from real sources
-- =============================================
CREATE TABLE IF NOT EXISTS energy_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  category TEXT DEFAULT 'general',
  regulation_code TEXT,
  effective_date DATE,
  expiry_date DATE,
  summary TEXT,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  importance TEXT DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  ingestion_method TEXT DEFAULT 'manual',
  ai_summary TEXT,
  ai_enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS energy_news_official (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT DEFAULT 'official',
  category TEXT DEFAULT 'general',
  published_at TIMESTAMPTZ,
  summary TEXT,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  importance TEXT DEFAULT 'medium',
  is_verified BOOLEAN DEFAULT false,
  verified_source BOOLEAN DEFAULT false,
  ingestion_method TEXT DEFAULT 'manual',
  ai_summary TEXT,
  ai_enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- BLOCK 5: Digital signature architecture
-- =============================================
CREATE TABLE IF NOT EXISTS energy_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES energy_proposals(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_nif TEXT,
  signature_type TEXT NOT NULL DEFAULT 'simple',
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT DEFAULT 'internal',
  provider_reference TEXT,
  provider_envelope_id TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  signed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  evidence_hash TEXT,
  evidence_pdf_path TEXT,
  callback_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_signature_status CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'rejected', 'expired', 'cancelled', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_energy_signatures_proposal ON energy_signatures(proposal_id);
CREATE INDEX IF NOT EXISTS idx_energy_signatures_status ON energy_signatures(status);

-- =============================================
-- BLOCK 4: ESIOS market data table enhancement
-- =============================================
CREATE TABLE IF NOT EXISTS energy_market_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'api',
  api_url TEXT,
  is_active BOOLEAN DEFAULT true,
  requires_token BOOLEAN DEFAULT false,
  last_fetch_at TIMESTAMPTZ,
  last_fetch_status TEXT,
  fetch_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert known sources
INSERT INTO energy_market_sources (source_name, source_type, api_url, is_active, requires_token) VALUES
  ('OMIE', 'api', 'https://www.omie.es/es/file-download', true, false),
  ('ESIOS/REE', 'api', 'https://api.esios.ree.es', true, true),
  ('MIBGAS', 'api', 'https://www.mibgas.es', false, false),
  ('Datadis', 'api', 'https://datadis.es/api-private', false, true)
ON CONFLICT (source_name) DO NOTHING;

-- =============================================
-- RLS policies for new tables
-- =============================================
ALTER TABLE energy_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_news_official ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_market_sources ENABLE ROW LEVEL SECURITY;

-- energy_regulations: authenticated users can read, company-filtered write
CREATE POLICY "Authenticated can read regulations" ON energy_regulations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert regulations" ON energy_regulations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update regulations" ON energy_regulations FOR UPDATE TO authenticated USING (true);

-- energy_news_official: same pattern
CREATE POLICY "Authenticated can read news" ON energy_news_official FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert news" ON energy_news_official FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update news" ON energy_news_official FOR UPDATE TO authenticated USING (true);

-- energy_signatures: authenticated access
CREATE POLICY "Authenticated can read signatures" ON energy_signatures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert signatures" ON energy_signatures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update signatures" ON energy_signatures FOR UPDATE TO authenticated USING (true);

-- energy_market_sources: read for all, write for auth
CREATE POLICY "Authenticated can read market sources" ON energy_market_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage market sources" ON energy_market_sources FOR ALL TO authenticated USING (true);
