
-- ================================================================
-- V2-RRHH-PINST: Institutional Submission Infrastructure
-- ================================================================

-- 1. Institutional Submission Queue
CREATE TABLE public.erp_hr_institutional_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL,
  artifact_type TEXT NOT NULL,
  circuit_id TEXT NOT NULL,
  target_organism TEXT NOT NULL,
  
  -- Institutional state machine
  institutional_status TEXT NOT NULL DEFAULT 'generated'
    CHECK (institutional_status IN (
      'generated', 'validated_internal', 'pending_signature', 'signed',
      'queued_for_submission', 'submitted', 'accepted', 'rejected',
      'partially_accepted', 'reconciled', 'requires_correction', 'cancelled'
    )),
  
  -- Signature reference
  signature_id UUID NULL,
  certificate_id UUID NULL,
  signed_at TIMESTAMPTZ NULL,
  signature_method TEXT NULL,
  
  -- Submission tracking
  submission_payload JSONB NULL,
  submitted_at TIMESTAMPTZ NULL,
  submission_reference TEXT NULL,
  submission_channel TEXT NULL,
  
  -- Receipt/Response
  receipt_id UUID NULL,
  receipt_data JSONB NULL,
  receipt_received_at TIMESTAMPTZ NULL,
  
  -- Reconciliation
  reconciliation_status TEXT NULL CHECK (reconciliation_status IN (
    'pending', 'matched', 'discrepancy', 'corrected', NULL
  )),
  reconciliation_data JSONB NULL,
  reconciled_at TIMESTAMPTZ NULL,
  
  -- Traceability
  ledger_event_id UUID NULL,
  evidence_id UUID NULL,
  version_registry_id UUID NULL,
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  period_year INT NULL,
  period_month INT NULL,
  fiscal_year INT NULL,
  trimester INT NULL,
  created_by UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inst_sub_company ON public.erp_hr_institutional_submissions(company_id);
CREATE INDEX idx_inst_sub_artifact ON public.erp_hr_institutional_submissions(artifact_id);
CREATE INDEX idx_inst_sub_status ON public.erp_hr_institutional_submissions(institutional_status);

-- 2. Official Receipts / Responses
CREATE TABLE public.erp_hr_official_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.erp_hr_institutional_submissions(id) ON DELETE CASCADE,
  
  receipt_type TEXT NOT NULL CHECK (receipt_type IN (
    'acknowledgment', 'acceptance', 'rejection', 'partial_acceptance',
    'processing', 'error', 'correction_request'
  )),
  
  organism TEXT NOT NULL,
  reference_code TEXT NULL,
  receipt_payload JSONB NULL,
  receipt_message TEXT NULL,
  error_codes JSONB NULL,
  
  -- Traceability
  ledger_event_id UUID NULL,
  evidence_id UUID NULL,
  version_number INT NOT NULL DEFAULT 1,
  
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipts_company ON public.erp_hr_official_receipts(company_id);
CREATE INDEX idx_receipts_submission ON public.erp_hr_official_receipts(submission_id);

-- 3. Signature Infrastructure Registry
CREATE TABLE public.erp_hr_signature_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'sign_artifact', 'verify_signature', 'revoke_signature'
  )),
  
  artifact_id UUID NULL,
  submission_id UUID NULL,
  certificate_id UUID NULL,
  
  -- Signature details
  signer_id UUID NULL,
  signer_name TEXT NULL,
  signature_algorithm TEXT NULL DEFAULT 'RSA-SHA256',
  document_hash TEXT NULL,
  signature_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (signature_status IN ('pending', 'signed', 'verified', 'failed', 'revoked')),
  
  -- Certificate reference
  certificate_serial TEXT NULL,
  certificate_issuer TEXT NULL,
  certificate_valid_from TIMESTAMPTZ NULL,
  certificate_valid_to TIMESTAMPTZ NULL,
  
  -- eIDAS compliance
  eidas_level TEXT NULL CHECK (eidas_level IN ('AdES', 'QES', NULL)),
  timestamp_token TEXT NULL,
  
  -- Traceability
  ledger_event_id UUID NULL,
  evidence_id UUID NULL,
  
  signed_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sig_ops_company ON public.erp_hr_signature_operations(company_id);
CREATE INDEX idx_sig_ops_artifact ON public.erp_hr_signature_operations(artifact_id);

-- 4. Model 190 Annual Perceptor Lines
CREATE TABLE public.erp_hr_modelo190_perceptors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  fiscal_year INT NOT NULL,
  employee_id UUID NOT NULL,
  
  -- Perceptor identification
  nif TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  
  -- Perception data
  clave_percepcion TEXT NOT NULL DEFAULT 'A',
  subclave TEXT NOT NULL DEFAULT '01',
  percepciones_integras NUMERIC(12,2) NOT NULL DEFAULT 0,
  retenciones_practicadas NUMERIC(12,2) NOT NULL DEFAULT 0,
  percepciones_en_especie NUMERIC(12,2) NOT NULL DEFAULT 0,
  ingresos_a_cuenta NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Quarterly breakdown for cross-check
  q1_percepciones NUMERIC(12,2) NOT NULL DEFAULT 0,
  q1_retenciones NUMERIC(12,2) NOT NULL DEFAULT 0,
  q2_percepciones NUMERIC(12,2) NOT NULL DEFAULT 0,
  q2_retenciones NUMERIC(12,2) NOT NULL DEFAULT 0,
  q3_percepciones NUMERIC(12,2) NOT NULL DEFAULT 0,
  q3_retenciones NUMERIC(12,2) NOT NULL DEFAULT 0,
  q4_percepciones NUMERIC(12,2) NOT NULL DEFAULT 0,
  q4_retenciones NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Source traceability
  source_payroll_ids JSONB NULL,
  source_111_ids JSONB NULL,
  
  -- Quality flags
  data_quality TEXT NOT NULL DEFAULT 'estimated'
    CHECK (data_quality IN ('real', 'estimated', 'partial', 'fallback')),
  estimation_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Regulatory edge cases
  family_situation_changes JSONB NULL,
  regional_deductions JSONB NULL,
  irregular_income JSONB NULL,
  zero_retention_justified BOOLEAN NOT NULL DEFAULT false,
  zero_retention_reason TEXT NULL,
  
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, fiscal_year, employee_id)
);

CREATE INDEX idx_m190_perceptors_company ON public.erp_hr_modelo190_perceptors(company_id, fiscal_year);

-- RLS policies
ALTER TABLE public.erp_hr_institutional_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_official_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_signature_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_modelo190_perceptors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company isolation for institutional submissions"
  ON public.erp_hr_institutional_submissions FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Company isolation for official receipts"
  ON public.erp_hr_official_receipts FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Company isolation for signature operations"
  ON public.erp_hr_signature_operations FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Company isolation for modelo 190 perceptors"
  ON public.erp_hr_modelo190_perceptors FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));
