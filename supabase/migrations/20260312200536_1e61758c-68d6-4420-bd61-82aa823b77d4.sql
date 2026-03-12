
-- ============================================================
-- HR GLOBAL DATA MODEL — 23 NEW TABLES + ALTER EXISTING
-- Organized by 6 layers
-- ============================================================

-- ============ LAYER 0: ALTER EXISTING TABLES ============

-- Add global fields to erp_hr_employees
ALTER TABLE public.erp_hr_employees 
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS secondary_nationality TEXT,
  ADD COLUMN IF NOT EXISTS tax_residence_country TEXT;

-- Add country_code to erp_hr_payroll_concepts
ALTER TABLE public.erp_hr_payroll_concepts 
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'ES';

-- ============ LAYER 1: CORE GLOBAL (country-agnostic) ============

-- 1.1 Employee Profiles (extended data separated from operational record)
CREATE TABLE public.hr_employee_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  education_level TEXT,
  education_details JSONB DEFAULT '[]'::jsonb,
  languages JSONB DEFAULT '[]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  certifications JSONB DEFAULT '[]'::jsonb,
  personal_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

-- 1.2 Job Assignments (historical tracking of role/department/entity changes)
CREATE TABLE public.hr_job_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  position_id UUID REFERENCES public.erp_hr_positions(id),
  department_id UUID REFERENCES public.erp_hr_departments(id),
  legal_entity_id UUID REFERENCES public.erp_hr_legal_entities(id),
  work_center_id UUID REFERENCES public.erp_hr_work_centers(id),
  org_unit_id UUID REFERENCES public.erp_hr_org_units(id),
  assignment_type TEXT NOT NULL DEFAULT 'primary',
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Leave Incidents (absences, medical leave, maternity, etc.)
CREATE TABLE public.hr_leave_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'ES',
  leave_type TEXT NOT NULL,
  leave_subtype TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  calendar_days INTEGER,
  working_days INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  justification TEXT,
  document_id UUID,
  leave_policy_id UUID REFERENCES public.hr_country_policies(id),
  workflow_instance_id UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  medical_certificate_ref TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 Admin Requests (generic HR requests with workflow integration)
CREATE TABLE public.hr_admin_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  request_type TEXT NOT NULL,
  request_subtype TEXT,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  workflow_instance_id UUID,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.5 HR Tasks (assignable tasks: onboarding steps, doc reviews, reminders)
CREATE TABLE public.hr_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID,
  assigned_to UUID,
  task_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  parent_task_id UUID REFERENCES public.hr_tasks(id),
  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ LAYER 2: LOCALIZATION (country plugins) ============

-- 2.1 Country Rule Sets (versioned tax/SS rules per country per fiscal year)
CREATE TABLE public.hr_country_rule_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,
  company_id UUID,
  fiscal_year INTEGER NOT NULL,
  rule_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  rules_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, fiscal_year, rule_type, version)
);

-- 2.2 Localization Configs (operational config per country)
CREATE TABLE public.hr_localization_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,
  company_id UUID,
  config_type TEXT NOT NULL,
  name TEXT NOT NULL,
  payslip_format JSONB DEFAULT '{}'::jsonb,
  rounding_rules JSONB DEFAULT '{}'::jsonb,
  calendar_config JSONB DEFAULT '{}'::jsonb,
  legal_templates JSONB DEFAULT '[]'::jsonb,
  number_format JSONB DEFAULT '{}'::jsonb,
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, company_id, config_type)
);

-- 2.3 Document Templates (versioned templates per country and type)
CREATE TABLE public.hr_document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,
  company_id UUID,
  template_type TEXT NOT NULL,
  template_subtype TEXT,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  content_template TEXT,
  header_template TEXT,
  footer_template TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  styling JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  legal_reference TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ LAYER 3: PAYROLL (generic engine + results) ============

-- 3.1 Payroll Periods (per legal entity, period type)
CREATE TABLE public.hr_payroll_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  legal_entity_id UUID REFERENCES public.erp_hr_legal_entities(id),
  country_code TEXT NOT NULL DEFAULT 'ES',
  period_type TEXT NOT NULL DEFAULT 'monthly',
  period_name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  period_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(legal_entity_id, period_type, start_date)
);

-- 3.2 Payroll Records (individual payroll result, multi-country)
CREATE TABLE public.hr_payroll_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  payroll_period_id UUID NOT NULL REFERENCES public.hr_payroll_periods(id),
  country_rule_set_id UUID REFERENCES public.hr_country_rule_sets(id),
  country_code TEXT NOT NULL DEFAULT 'ES',
  contract_id UUID,
  gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  employer_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  calculation_details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  validated_at TIMESTAMPTZ,
  validated_by UUID,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  is_retroactive BOOLEAN NOT NULL DEFAULT false,
  retroactive_period_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 Payroll Record Lines (detail lines per payroll)
CREATE TABLE public.hr_payroll_record_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_record_id UUID NOT NULL REFERENCES public.hr_payroll_records(id) ON DELETE CASCADE,
  concept_code TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  line_type TEXT NOT NULL,
  base_amount NUMERIC(12,2) DEFAULT 0,
  percentage NUMERIC(8,4) DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  units NUMERIC(10,2) DEFAULT 0,
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  is_ss_contributable BOOLEAN NOT NULL DEFAULT true,
  calculation_formula TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.4 Payroll Variables (per employee per period: extras, bonuses, incidents)
CREATE TABLE public.hr_payroll_variables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  payroll_period_id UUID NOT NULL REFERENCES public.hr_payroll_periods(id),
  variable_code TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  variable_type TEXT NOT NULL DEFAULT 'amount',
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  units NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.5 Social Security Events (generic: altas, bajas, IT, AT, maternity)
CREATE TABLE public.hr_social_security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'ES',
  event_type TEXT NOT NULL,
  event_subtype TEXT,
  event_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  reference_number TEXT,
  official_response JSONB DEFAULT '{}'::jsonb,
  submission_id UUID,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.6 Tax Events (retention changes, regularizations, certificates)
CREATE TABLE public.hr_tax_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'ES',
  fiscal_year INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  previous_value JSONB DEFAULT '{}'::jsonb,
  new_value JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  document_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ LAYER 4: GLOBAL MOBILITY ============

-- 4.1 Mobility Assignments (international assignments)
CREATE TABLE public.hr_mobility_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  home_country TEXT NOT NULL,
  host_country TEXT NOT NULL,
  home_entity_id UUID REFERENCES public.erp_hr_legal_entities(id),
  host_entity_id UUID REFERENCES public.erp_hr_legal_entities(id),
  assignment_type TEXT NOT NULL DEFAULT 'long_term',
  status TEXT NOT NULL DEFAULT 'planned',
  start_date DATE NOT NULL,
  expected_end_date DATE,
  actual_end_date DATE,
  job_title_host TEXT,
  reporting_to TEXT,
  assignment_letter_ref TEXT,
  days_in_host INTEGER DEFAULT 0,
  pe_risk_flag BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 Expatriate Packages (compensation packages for assignees)
CREATE TABLE public.hr_expatriate_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.hr_mobility_assignments(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  base_salary_home NUMERIC(12,2) DEFAULT 0,
  base_salary_host NUMERIC(12,2) DEFAULT 0,
  housing_allowance NUMERIC(12,2) DEFAULT 0,
  cola_allowance NUMERIC(12,2) DEFAULT 0,
  hardship_allowance NUMERIC(12,2) DEFAULT 0,
  education_allowance NUMERIC(12,2) DEFAULT 0,
  relocation_budget NUMERIC(12,2) DEFAULT 0,
  travel_allowance NUMERIC(12,2) DEFAULT 0,
  tax_gross_up BOOLEAN NOT NULL DEFAULT false,
  other_allowances JSONB DEFAULT '[]'::jsonb,
  total_package_value NUMERIC(14,2) DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.3 Immigration Documents (visas, work permits, residence permits)
CREATE TABLE public.hr_immigration_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.hr_mobility_assignments(id),
  company_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_subtype TEXT,
  country TEXT NOT NULL,
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'valid',
  issuing_authority TEXT,
  renewal_lead_days INTEGER DEFAULT 90,
  alert_sent BOOLEAN NOT NULL DEFAULT false,
  document_url TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.4 Tax Equalization (hypothetical tax calculations)
CREATE TABLE public.hr_tax_equalization (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.hr_mobility_assignments(id) ON DELETE CASCADE,
  payroll_period_id UUID REFERENCES public.hr_payroll_periods(id),
  fiscal_year INTEGER NOT NULL,
  hypothetical_tax_home NUMERIC(12,2) DEFAULT 0,
  actual_tax_home NUMERIC(12,2) DEFAULT 0,
  actual_tax_host NUMERIC(12,2) DEFAULT 0,
  equalization_amount NUMERIC(12,2) DEFAULT 0,
  settlement_status TEXT NOT NULL DEFAULT 'pending',
  settlement_date DATE,
  calculation_details JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.5 Split Payroll Config (payroll split between home/host)
CREATE TABLE public.hr_split_payroll_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.hr_mobility_assignments(id) ON DELETE CASCADE,
  home_percentage NUMERIC(5,2) NOT NULL DEFAULT 50,
  host_percentage NUMERIC(5,2) NOT NULL DEFAULT 50,
  home_currency TEXT NOT NULL DEFAULT 'EUR',
  host_currency TEXT NOT NULL DEFAULT 'EUR',
  exchange_rate_type TEXT DEFAULT 'monthly_avg',
  concepts_home JSONB DEFAULT '[]'::jsonb,
  concepts_host JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ LAYER 5: COMPLIANCE ============

-- 5.1 Compliance Requirements (per country/sector obligations)
CREATE TABLE public.hr_compliance_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,
  company_id UUID,
  requirement_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  legal_reference TEXT,
  frequency TEXT DEFAULT 'annual',
  mandatory BOOLEAN NOT NULL DEFAULT true,
  applies_to TEXT DEFAULT 'all_employees',
  renewal_period_days INTEGER,
  penalty_info TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.2 Compliance Evidence (documentary proof of compliance)
CREATE TABLE public.hr_compliance_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  requirement_id UUID NOT NULL REFERENCES public.hr_compliance_requirements(id),
  document_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  issue_date DATE,
  expiry_date DATE,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  alert_days_before INTEGER DEFAULT 30,
  alert_sent BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ LAYER 6: OFFICIAL INTEGRATIONS ============

-- 6.1 Integration Adapters (registered connectors per country)
CREATE TABLE public.hr_integration_adapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,
  company_id UUID,
  adapter_name TEXT NOT NULL,
  adapter_type TEXT NOT NULL,
  system_name TEXT NOT NULL,
  endpoint_url TEXT,
  auth_type TEXT DEFAULT 'certificate',
  status TEXT NOT NULL DEFAULT 'inactive',
  last_execution_at TIMESTAMPTZ,
  last_execution_status TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6.2 Official Submissions (submissions to government systems)
CREATE TABLE public.hr_official_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  legal_entity_id UUID REFERENCES public.erp_hr_legal_entities(id),
  country_code TEXT NOT NULL DEFAULT 'ES',
  adapter_id UUID REFERENCES public.hr_integration_adapters(id),
  submission_type TEXT NOT NULL,
  submission_subtype TEXT,
  reference_period TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url TEXT,
  file_format TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  external_reference TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6.3 Official Submission Receipts (acknowledgements from government systems)
CREATE TABLE public.hr_official_submission_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.hr_official_submissions(id) ON DELETE CASCADE,
  receipt_reference TEXT,
  receipt_date TIMESTAMPTZ,
  receipt_document_url TEXT,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  validation_errors JSONB DEFAULT '[]'::jsonb,
  official_response JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ RLS POLICIES ============

ALTER TABLE public.hr_employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_admin_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_country_rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_localization_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_record_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_social_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_tax_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_mobility_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_expatriate_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_immigration_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_tax_equalization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_split_payroll_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_integration_adapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_official_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_official_submission_receipts ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can access all (enterprise module, further restricted by app logic)
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'hr_employee_profiles','hr_job_assignments','hr_leave_incidents','hr_admin_requests','hr_tasks',
    'hr_country_rule_sets','hr_localization_configs','hr_document_templates',
    'hr_payroll_periods','hr_payroll_records','hr_payroll_record_lines','hr_payroll_variables',
    'hr_social_security_events','hr_tax_events',
    'hr_mobility_assignments','hr_expatriate_packages','hr_immigration_documents','hr_tax_equalization','hr_split_payroll_config',
    'hr_compliance_requirements','hr_compliance_evidence',
    'hr_integration_adapters','hr_official_submissions','hr_official_submission_receipts'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Authenticated full access on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ============ INDEXES ============

CREATE INDEX idx_hr_job_assignments_employee ON public.hr_job_assignments(employee_id);
CREATE INDEX idx_hr_job_assignments_current ON public.hr_job_assignments(employee_id, is_current) WHERE is_current = true;
CREATE INDEX idx_hr_leave_incidents_employee ON public.hr_leave_incidents(employee_id);
CREATE INDEX idx_hr_leave_incidents_status ON public.hr_leave_incidents(status);
CREATE INDEX idx_hr_admin_requests_employee ON public.hr_admin_requests(employee_id);
CREATE INDEX idx_hr_admin_requests_status ON public.hr_admin_requests(status);
CREATE INDEX idx_hr_tasks_assigned ON public.hr_tasks(assigned_to);
CREATE INDEX idx_hr_tasks_status ON public.hr_tasks(status);
CREATE INDEX idx_hr_country_rule_sets_lookup ON public.hr_country_rule_sets(country_code, fiscal_year, rule_type);
CREATE INDEX idx_hr_payroll_records_employee ON public.hr_payroll_records(employee_id);
CREATE INDEX idx_hr_payroll_records_period ON public.hr_payroll_records(payroll_period_id);
CREATE INDEX idx_hr_payroll_record_lines_record ON public.hr_payroll_record_lines(payroll_record_id);
CREATE INDEX idx_hr_payroll_variables_lookup ON public.hr_payroll_variables(employee_id, payroll_period_id);
CREATE INDEX idx_hr_ss_events_employee ON public.hr_social_security_events(employee_id);
CREATE INDEX idx_hr_tax_events_employee ON public.hr_tax_events(employee_id, fiscal_year);
CREATE INDEX idx_hr_mobility_employee ON public.hr_mobility_assignments(employee_id);
CREATE INDEX idx_hr_mobility_status ON public.hr_mobility_assignments(status);
CREATE INDEX idx_hr_immigration_employee ON public.hr_immigration_documents(employee_id);
CREATE INDEX idx_hr_immigration_expiry ON public.hr_immigration_documents(expiry_date) WHERE status = 'valid';
CREATE INDEX idx_hr_compliance_evidence_employee ON public.hr_compliance_evidence(employee_id);
CREATE INDEX idx_hr_compliance_evidence_expiry ON public.hr_compliance_evidence(expiry_date) WHERE status != 'expired';
CREATE INDEX idx_hr_official_submissions_status ON public.hr_official_submissions(status);
CREATE INDEX idx_hr_official_submissions_country ON public.hr_official_submissions(country_code, submission_type);

-- ============ REALTIME ============

ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_payroll_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_official_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_mobility_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_leave_incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_admin_requests;
