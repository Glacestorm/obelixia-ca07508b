
-- P11: Compliance Automation - only new tables

-- Check and create only missing tables
CREATE TABLE IF NOT EXISTS public.erp_hr_compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'labor',
  jurisdiction TEXT NOT NULL DEFAULT 'ES',
  description TEXT,
  version TEXT DEFAULT '1.0',
  effective_date DATE,
  expiry_date DATE,
  source_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_requirements INTEGER NOT NULL DEFAULT 0,
  met_requirements INTEGER NOT NULL DEFAULT 0,
  compliance_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns to existing erp_hr_compliance_checklist if missing
ALTER TABLE public.erp_hr_compliance_checklist
  ADD COLUMN IF NOT EXISTS framework_id UUID REFERENCES public.erp_hr_compliance_frameworks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS requirement_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS evidence_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS evidence_description TEXT,
  ADD COLUMN IF NOT EXISTS evidence_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS responsible_role TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS auto_check_function TEXT,
  ADD COLUMN IF NOT EXISTS last_auto_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_check_result JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.erp_hr_compliance_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  framework_id UUID REFERENCES public.erp_hr_compliance_frameworks(id) ON DELETE SET NULL,
  audit_name TEXT NOT NULL,
  audit_type TEXT NOT NULL DEFAULT 'internal',
  scope TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  auditor_name TEXT,
  auditor_role TEXT,
  findings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  overall_score NUMERIC(5,2),
  risk_level TEXT DEFAULT 'low',
  report_url TEXT,
  next_audit_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.erp_hr_compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  framework_id UUID REFERENCES public.erp_hr_compliance_frameworks(id) ON DELETE SET NULL,
  checklist_item_id UUID,
  alert_type TEXT NOT NULL DEFAULT 'non_conformity',
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  regulation_reference TEXT,
  remediation_action TEXT,
  remediation_deadline DATE,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (IF NOT EXISTS not available for policies, use DO block)
ALTER TABLE public.erp_hr_compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_compliance_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_compliance_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'compliance_frameworks_access') THEN
    CREATE POLICY "compliance_frameworks_access" ON public.erp_hr_compliance_frameworks
      FOR ALL TO authenticated USING (public.user_has_erp_premium_access(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'compliance_audits_p11_access') THEN
    CREATE POLICY "compliance_audits_p11_access" ON public.erp_hr_compliance_audits
      FOR ALL TO authenticated USING (public.user_has_erp_premium_access(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'compliance_alerts_p11_access') THEN
    CREATE POLICY "compliance_alerts_p11_access" ON public.erp_hr_compliance_alerts
      FOR ALL TO authenticated USING (public.user_has_erp_premium_access(company_id));
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_compliance_alerts;
