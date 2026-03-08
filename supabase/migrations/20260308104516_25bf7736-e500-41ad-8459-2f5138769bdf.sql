
-- P6: Documentary Legal Engine Premium

CREATE TABLE public.erp_hr_legal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'employment',
  category TEXT NOT NULL DEFAULT 'general',
  jurisdiction TEXT NOT NULL DEFAULT 'ES',
  language TEXT NOT NULL DEFAULT 'es',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  content_template JSONB NOT NULL DEFAULT '{}',
  required_variables TEXT[] NOT NULL DEFAULT '{}',
  optional_variables TEXT[] DEFAULT '{}',
  applicable_regulations TEXT[] DEFAULT '{}',
  approval_required BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  usage_count INTEGER DEFAULT 0,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.erp_hr_legal_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  clause_name TEXT NOT NULL,
  clause_type TEXT NOT NULL DEFAULT 'standard',
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  legal_basis TEXT,
  jurisdiction TEXT NOT NULL DEFAULT 'ES',
  language TEXT NOT NULL DEFAULT 'es',
  risk_level TEXT DEFAULT 'low',
  is_mandatory BOOLEAN DEFAULT false,
  is_negotiable BOOLEAN DEFAULT true,
  applies_to_types TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  ai_review_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.erp_hr_legal_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  contract_number TEXT NOT NULL,
  template_id UUID REFERENCES public.erp_hr_legal_templates(id),
  employee_name TEXT,
  employee_id TEXT,
  contract_type TEXT NOT NULL DEFAULT 'employment',
  status TEXT NOT NULL DEFAULT 'draft',
  generated_content JSONB DEFAULT '{}',
  variables_used JSONB DEFAULT '{}',
  clauses_included UUID[] DEFAULT '{}',
  custom_clauses JSONB DEFAULT '[]',
  compliance_score INTEGER DEFAULT 0,
  compliance_issues JSONB DEFAULT '[]',
  risk_assessment JSONB DEFAULT '{}',
  signed_at TIMESTAMPTZ,
  effective_date DATE,
  expiration_date DATE,
  generated_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  pdf_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.erp_hr_legal_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  contract_id UUID REFERENCES public.erp_hr_legal_contracts(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL DEFAULT 'regulatory',
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  regulation_reference TEXT,
  passed BOOLEAN NOT NULL DEFAULT false,
  severity TEXT DEFAULT 'medium',
  details TEXT,
  remediation_suggestion TEXT,
  auto_fixable BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE TABLE public.erp_hr_legal_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_legal_contracts;

ALTER TABLE public.erp_hr_legal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_legal_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_legal_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_legal_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_legal_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.erp_hr_legal_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.erp_hr_legal_clauses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.erp_hr_legal_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.erp_hr_legal_compliance_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.erp_hr_legal_audit_trail FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_hr_legal_templates_company ON public.erp_hr_legal_templates(company_id);
CREATE INDEX idx_hr_legal_clauses_company ON public.erp_hr_legal_clauses(company_id);
CREATE INDEX idx_hr_legal_contracts_company ON public.erp_hr_legal_contracts(company_id);
CREATE INDEX idx_hr_legal_contracts_st ON public.erp_hr_legal_contracts(status);
CREATE INDEX idx_hr_legal_compliance_contract ON public.erp_hr_legal_compliance_checks(contract_id);
CREATE INDEX idx_hr_legal_audit_entity ON public.erp_hr_legal_audit_trail(entity_type, entity_id);
