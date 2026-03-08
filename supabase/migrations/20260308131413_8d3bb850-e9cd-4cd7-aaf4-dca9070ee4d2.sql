
-- P10: Inter-Module Orchestration Rules Engine
CREATE TABLE public.erp_hr_orchestration_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 50,
  trigger_module TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_table TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  action_module TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.erp_hr_orchestration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.erp_hr_orchestration_rules(id) ON DELETE CASCADE,
  trigger_module TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}',
  action_module TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_result JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_orchestration_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_orchestration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p10_rules_sel" ON public.erp_hr_orchestration_rules FOR SELECT TO authenticated USING (user_has_erp_premium_access(company_id));
CREATE POLICY "p10_rules_ins" ON public.erp_hr_orchestration_rules FOR INSERT TO authenticated WITH CHECK (user_has_erp_premium_access(company_id));
CREATE POLICY "p10_rules_upd" ON public.erp_hr_orchestration_rules FOR UPDATE TO authenticated USING (user_has_erp_premium_access(company_id));
CREATE POLICY "p10_rules_del" ON public.erp_hr_orchestration_rules FOR DELETE TO authenticated USING (user_has_erp_premium_access(company_id));

CREATE POLICY "p10_log_sel" ON public.erp_hr_orchestration_log FOR SELECT TO authenticated USING (user_has_erp_premium_access(company_id));
CREATE POLICY "p10_log_ins" ON public.erp_hr_orchestration_log FOR INSERT TO authenticated WITH CHECK (user_has_erp_premium_access(company_id));

CREATE INDEX idx_orch_rules_company ON public.erp_hr_orchestration_rules(company_id);
CREATE INDEX idx_orch_rules_trigger ON public.erp_hr_orchestration_rules(trigger_module, trigger_event);
CREATE INDEX idx_orch_log_company ON public.erp_hr_orchestration_log(company_id);
CREATE INDEX idx_orch_log_rule ON public.erp_hr_orchestration_log(rule_id);
CREATE INDEX idx_orch_log_created ON public.erp_hr_orchestration_log(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_orchestration_log;
