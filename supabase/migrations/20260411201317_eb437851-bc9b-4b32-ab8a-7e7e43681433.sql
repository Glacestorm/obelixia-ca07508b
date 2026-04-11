CREATE TABLE public.erp_hr_remote_work_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  employee_id uuid NOT NULL,
  agreement_date date NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'draft',
  remote_percentage integer NOT NULL DEFAULT 30,
  work_location jsonb DEFAULT '{}',
  equipment_inventory jsonb DEFAULT '[]',
  expense_compensation jsonb DEFAULT '{}',
  schedule_details jsonb DEFAULT '{}',
  disconnection_policy_id uuid,
  agreement_content jsonb DEFAULT '{}',
  signed_at timestamptz,
  signed_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.erp_hr_remote_work_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.erp_hr_remote_work_agreements
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "tenant_insert" ON public.erp_hr_remote_work_agreements
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "tenant_update" ON public.erp_hr_remote_work_agreements
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.erp_user_companies WHERE user_id = auth.uid()));

CREATE INDEX idx_remote_work_company ON public.erp_hr_remote_work_agreements(company_id);
CREATE INDEX idx_remote_work_employee ON public.erp_hr_remote_work_agreements(employee_id);
CREATE INDEX idx_remote_work_status ON public.erp_hr_remote_work_agreements(status);