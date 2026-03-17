
-- V2-RRHH-FASE-8B: Simulation snapshots for traceability
CREATE TABLE public.erp_hr_simulation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_type TEXT NOT NULL,
  scenario_label TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  baseline_snapshot JSONB NOT NULL DEFAULT '{}',
  impact_result JSONB NOT NULL DEFAULT '{}',
  ai_narrative TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_sim_snapshots_company ON public.erp_hr_simulation_snapshots(company_id);
CREATE INDEX idx_hr_sim_snapshots_user ON public.erp_hr_simulation_snapshots(created_by);
CREATE INDEX idx_hr_sim_snapshots_created ON public.erp_hr_simulation_snapshots(created_at DESC);

ALTER TABLE public.erp_hr_simulation_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own company simulations"
  ON public.erp_hr_simulation_snapshots
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.erp_hr_advisor_assignments aa
      WHERE aa.advisor_user_id = auth.uid()
        AND aa.company_id = erp_hr_simulation_snapshots.company_id
        AND aa.is_active = true
    )
  );

CREATE POLICY "Users insert own simulations"
  ON public.erp_hr_simulation_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.erp_hr_advisor_assignments aa
        WHERE aa.advisor_user_id = auth.uid()
          AND aa.company_id = erp_hr_simulation_snapshots.company_id
          AND aa.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM public.erp_user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.company_id = erp_hr_simulation_snapshots.company_id
          AND uc.is_active = true
      )
    )
  );
