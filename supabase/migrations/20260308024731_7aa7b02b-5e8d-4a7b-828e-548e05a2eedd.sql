
-- ============================================================
-- FASE 2: HR Workflow Engine — Motor de aprobaciones y procesos
-- ============================================================

-- Definiciones de workflows
CREATE TABLE public.erp_hr_workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  process_type text NOT NULL, -- vacations, hiring, onboarding, offboarding, promotion, salary_review, bonus, disciplinary, settlement_validation
  version integer DEFAULT 1,
  trigger_conditions jsonb DEFAULT '{}', -- { min_salary: 30000, jurisdictions: ['ES'], contract_types: ['indefinido'] }
  is_active boolean DEFAULT true,
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Pasos del workflow
CREATE TABLE public.erp_hr_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.erp_hr_workflow_definitions(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  name text NOT NULL,
  description text,
  step_type text NOT NULL DEFAULT 'approval', -- approval, review, notification, condition, parallel, escalation
  approver_role text, -- HR_DIRECTOR, HR_MANAGER, MANAGER, etc.
  approver_user_id uuid, -- specific user override
  sla_hours integer DEFAULT 48,
  escalation_hours integer DEFAULT 72,
  escalation_to_role text, -- role to escalate to
  delegation_enabled boolean DEFAULT true,
  comments_required boolean DEFAULT false,
  conditions jsonb DEFAULT '{}', -- { salary_above: 50000, department_ids: [...] }
  auto_approve_conditions jsonb, -- conditions for auto-approval
  notification_template text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Instancias de workflow en ejecución
CREATE TABLE public.erp_hr_workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  definition_id uuid NOT NULL REFERENCES public.erp_hr_workflow_definitions(id) ON DELETE RESTRICT,
  entity_type text NOT NULL, -- leave_request, contract, employee, payroll, etc.
  entity_id uuid NOT NULL,
  entity_summary text, -- human-readable summary
  current_step_id uuid REFERENCES public.erp_hr_workflow_steps(id) ON DELETE SET NULL,
  current_step_order integer DEFAULT 1,
  status text DEFAULT 'pending', -- pending, in_progress, approved, rejected, cancelled, escalated
  priority text DEFAULT 'normal', -- low, normal, high, urgent
  started_by uuid NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Decisiones tomadas en cada paso
CREATE TABLE public.erp_hr_workflow_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.erp_hr_workflow_instances(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.erp_hr_workflow_steps(id) ON DELETE CASCADE,
  decision text NOT NULL, -- approved, rejected, returned, delegated, escalated, auto_approved
  decided_by uuid NOT NULL,
  comment text,
  attachments jsonb DEFAULT '[]',
  decision_time_seconds integer, -- time taken to decide
  metadata jsonb DEFAULT '{}',
  decided_at timestamptz DEFAULT now()
);

-- Delegaciones de aprobadores
CREATE TABLE public.erp_hr_workflow_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  delegator_user_id uuid NOT NULL,
  delegate_user_id uuid NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz NOT NULL,
  scope_process_types text[], -- null = all types
  reason text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tracking de SLAs por paso
CREATE TABLE public.erp_hr_workflow_sla_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.erp_hr_workflow_instances(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.erp_hr_workflow_steps(id) ON DELETE CASCADE,
  assigned_to uuid,
  assigned_role text,
  due_at timestamptz NOT NULL,
  escalation_at timestamptz,
  completed_at timestamptz,
  breached boolean DEFAULT false,
  escalated boolean DEFAULT false,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_hr_wf_instances_company ON public.erp_hr_workflow_instances(company_id);
CREATE INDEX idx_hr_wf_instances_status ON public.erp_hr_workflow_instances(status);
CREATE INDEX idx_hr_wf_instances_entity ON public.erp_hr_workflow_instances(entity_type, entity_id);
CREATE INDEX idx_hr_wf_decisions_instance ON public.erp_hr_workflow_decisions(instance_id);
CREATE INDEX idx_hr_wf_sla_instance ON public.erp_hr_workflow_sla_tracking(instance_id);
CREATE INDEX idx_hr_wf_sla_breached ON public.erp_hr_workflow_sla_tracking(breached) WHERE breached = true;
CREATE INDEX idx_hr_wf_delegations_active ON public.erp_hr_workflow_delegations(delegator_user_id) WHERE is_active = true;

-- RLS
ALTER TABLE public.erp_hr_workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_workflow_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_workflow_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_workflow_sla_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage workflow definitions" ON public.erp_hr_workflow_definitions FOR ALL TO authenticated USING (public.user_has_erp_company_access(company_id));
CREATE POLICY "Users can view workflow steps" ON public.erp_hr_workflow_steps FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.erp_hr_workflow_definitions d WHERE d.id = definition_id AND public.user_has_erp_company_access(d.company_id)));
CREATE POLICY "Users can manage workflow instances" ON public.erp_hr_workflow_instances FOR ALL TO authenticated USING (public.user_has_erp_company_access(company_id));
CREATE POLICY "Users can manage workflow decisions" ON public.erp_hr_workflow_decisions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.erp_hr_workflow_instances i WHERE i.id = instance_id AND public.user_has_erp_company_access(i.company_id)));
CREATE POLICY "Users can manage workflow delegations" ON public.erp_hr_workflow_delegations FOR ALL TO authenticated USING (public.user_has_erp_company_access(company_id));
CREATE POLICY "Users can view SLA tracking" ON public.erp_hr_workflow_sla_tracking FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.erp_hr_workflow_instances i WHERE i.id = instance_id AND public.user_has_erp_company_access(i.company_id)));

-- Enable realtime for workflow instances
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_workflow_instances;
