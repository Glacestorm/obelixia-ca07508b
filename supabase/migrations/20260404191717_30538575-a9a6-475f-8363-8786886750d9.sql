-- Bridge logs: every cross-module sync event
CREATE TABLE public.erp_hr_bridge_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  bridge_type TEXT NOT NULL DEFAULT 'accounting',
  source_module TEXT NOT NULL DEFAULT 'payroll',
  target_module TEXT NOT NULL DEFAULT 'accounting',
  source_record_id TEXT,
  payload_snapshot JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  processed_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_bridge_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage own company bridge logs"
  ON public.erp_hr_bridge_logs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_bridge_logs_company ON public.erp_hr_bridge_logs(company_id);
CREATE INDEX idx_bridge_logs_status ON public.erp_hr_bridge_logs(status);

-- Bridge approvals
CREATE TABLE public.erp_hr_bridge_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  bridge_log_id UUID REFERENCES public.erp_hr_bridge_logs(id) ON DELETE CASCADE NOT NULL,
  approval_type TEXT NOT NULL DEFAULT 'sync',
  requested_by UUID,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  comments TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_bridge_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage own company bridge approvals"
  ON public.erp_hr_bridge_approvals FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_bridge_approvals_status ON public.erp_hr_bridge_approvals(status);

-- Bridge mappings: HR concepts → accounting/treasury codes
CREATE TABLE public.erp_hr_bridge_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  mapping_type TEXT NOT NULL DEFAULT 'account',
  hr_code TEXT NOT NULL,
  hr_label TEXT,
  target_code TEXT NOT NULL,
  target_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_bridge_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage own company bridge mappings"
  ON public.erp_hr_bridge_mappings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_bridge_mappings_company ON public.erp_hr_bridge_mappings(company_id);
CREATE UNIQUE INDEX idx_bridge_mappings_unique ON public.erp_hr_bridge_mappings(company_id, mapping_type, hr_code) WHERE is_active = true;