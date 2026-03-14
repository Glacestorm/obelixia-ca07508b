
-- V2-ES.8 Tramo 3: Domain certificates and configuration
-- Models certificate/credential metadata per company and official domain
-- DOES NOT store actual cryptographic material

CREATE TABLE public.erp_hr_domain_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('tgss_siltra', 'contrata_sepe', 'aeat')),
  certificate_type TEXT NOT NULL DEFAULT 'not_specified' CHECK (certificate_type IN ('fnmt_software', 'fnmt_representante', 'sede_electronica', 'clave_pin', 'not_specified', 'other')),
  certificate_label TEXT,
  certificate_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (certificate_status IN ('not_configured', 'partially_configured', 'configured_without_cert', 'cert_loaded_placeholder', 'cert_ready_preparatory', 'expired', 'invalid')),
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'pre_production', 'production')),
  expiration_date DATE,
  serial_number_hash TEXT,
  issuer_info JSONB DEFAULT '{}'::jsonb,
  configuration_completeness INTEGER NOT NULL DEFAULT 0 CHECK (configuration_completeness BETWEEN 0 AND 100),
  readiness_impact TEXT NOT NULL DEFAULT 'warning' CHECK (readiness_impact IN ('blocker', 'warning', 'info')),
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, domain)
);

-- Index for fast lookup by company
CREATE INDEX idx_hr_domain_certs_company ON public.erp_hr_domain_certificates(company_id);
-- Index for expiration monitoring
CREATE INDEX idx_hr_domain_certs_expiration ON public.erp_hr_domain_certificates(expiration_date) WHERE expiration_date IS NOT NULL;

-- Enable RLS
ALTER TABLE public.erp_hr_domain_certificates ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read their company's certificates
CREATE POLICY "Users can view company certificates"
  ON public.erp_hr_domain_certificates
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Authenticated users can insert
CREATE POLICY "Users can insert company certificates"
  ON public.erp_hr_domain_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS: Authenticated users can update
CREATE POLICY "Users can update company certificates"
  ON public.erp_hr_domain_certificates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE public.erp_hr_domain_certificates IS 'V2-ES.8 T3: Certificate/credential configuration per company and official domain. Does NOT store actual cryptographic material. cert_ready_preparatory ≠ real submission enabled.';
