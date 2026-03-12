
-- 4. Consents (consentimientos formales)
CREATE TABLE IF NOT EXISTS public.erp_hr_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL DEFAULT 'gdpr',
  consent_text TEXT,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  granted_via TEXT NOT NULL DEFAULT 'digital',
  evidence_url TEXT,
  ip_address TEXT,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_hr_consents_access" ON public.erp_hr_consents
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE INDEX idx_hr_consents_employee ON public.erp_hr_consents(employee_id);
CREATE INDEX idx_hr_consents_status_v2 ON public.erp_hr_consents(status);
CREATE INDEX idx_hr_consents_company_v2 ON public.erp_hr_consents(company_id);

-- 5. Retention Policies
CREATE TABLE IF NOT EXISTS public.erp_hr_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'ES',
  retention_years INT NOT NULL DEFAULT 5,
  legal_basis TEXT,
  auto_archive BOOLEAN NOT NULL DEFAULT false,
  auto_delete BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_hr_retention_policies_access" ON public.erp_hr_retention_policies
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE INDEX idx_hr_retention_company ON public.erp_hr_retention_policies(company_id);

-- 6. ALTER erp_hr_employee_documents
ALTER TABLE public.erp_hr_employee_documents
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS retention_policy_id UUID REFERENCES public.erp_hr_retention_policies(id),
  ADD COLUMN IF NOT EXISTS consent_id UUID REFERENCES public.erp_hr_consents(id),
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS integrity_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS integrity_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_hr_emp_docs_category ON public.erp_hr_employee_documents(category);
