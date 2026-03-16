
-- Advisory portfolio: assigns advisor users to companies they manage
CREATE TABLE public.erp_hr_advisor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'tecnico_laboral' CHECK (role IN ('tecnico_laboral', 'responsable_cartera', 'supervisor')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(advisor_user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.erp_hr_advisor_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can see their own assignments
CREATE POLICY "Users can view own assignments"
  ON public.erp_hr_advisor_assignments
  FOR SELECT
  TO authenticated
  USING (advisor_user_id = auth.uid());

-- Policy: users with admin/supervisor role can manage all assignments
CREATE POLICY "Admins can manage all assignments"
  ON public.erp_hr_advisor_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_advisor_assignments a
      WHERE a.advisor_user_id = auth.uid()
        AND a.role = 'supervisor'
        AND a.is_active = true
    )
  );

-- Index for portfolio lookups
CREATE INDEX idx_advisor_assignments_user ON public.erp_hr_advisor_assignments(advisor_user_id) WHERE is_active = true;
CREATE INDEX idx_advisor_assignments_company ON public.erp_hr_advisor_assignments(company_id) WHERE is_active = true;
