
-- V2-ES.6 Paso 1.1: Contract process data table (hiring/SEPE/Contrat@)

CREATE TABLE public.erp_hr_contract_process_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  contract_process_status TEXT NOT NULL DEFAULT 'pending_data'
    CHECK (contract_process_status IN ('pending_data', 'pending_documents', 'ready_to_submit', 'submitted', 'confirmed')),
  contract_type_code TEXT,
  contract_subtype TEXT,
  contract_start_date TEXT,
  contract_end_date TEXT,
  contract_duration_type TEXT,
  working_hours_type TEXT,
  working_hours_percent NUMERIC,
  weekly_hours NUMERIC,
  trial_period_days INTEGER,
  occupation_code TEXT,
  job_title TEXT,
  workplace_address TEXT,
  collective_agreement TEXT,
  salary_gross_annual NUMERIC,
  salary_base_monthly NUMERIC,
  num_extra_payments INTEGER DEFAULT 2,
  dni_nie TEXT,
  naf TEXT,
  ccc TEXT,
  legal_entity TEXT,
  sepe_communication_date TEXT,
  contrata_code TEXT,
  previous_contract_id TEXT,
  is_conversion BOOLEAN DEFAULT false,
  conversion_from_type TEXT,
  data_validated_at TIMESTAMPTZ,
  data_validated_by UUID,
  docs_validated_at TIMESTAMPTZ,
  docs_validated_by UUID,
  ready_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_reference TEXT,
  validation_notes TEXT,
  internal_deadline_at TIMESTAMPTZ,
  deadline_urgency TEXT DEFAULT 'ok',
  is_overdue BOOLEAN DEFAULT false,
  payload_status TEXT,
  payload_ready BOOLEAN DEFAULT false,
  payload_missing_fields TEXT[],
  payload_format_errors TEXT[],
  payload_snapshot JSONB,
  last_payload_computed_at TIMESTAMPTZ,
  deadline_computed_at TIMESTAMPTZ,
  closure_status TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  closure_notes TEXT,
  closure_snapshot JSONB,
  closure_blockers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_erp_hr_contract_process_employee ON public.erp_hr_contract_process_data (employee_id, company_id);
CREATE INDEX idx_erp_hr_contract_process_status ON public.erp_hr_contract_process_data (contract_process_status) WHERE contract_process_status NOT IN ('confirmed');

ALTER TABLE public.erp_hr_contract_process_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contract process data"
  ON public.erp_hr_contract_process_data FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contract process data"
  ON public.erp_hr_contract_process_data FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contract process data"
  ON public.erp_hr_contract_process_data FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
