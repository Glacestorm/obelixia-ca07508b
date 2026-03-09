-- ============================================
-- FIX RLS: energy_alert_preferences
-- Add company-level isolation alongside user_id check
-- ============================================
DROP POLICY IF EXISTS "Users manage own alert prefs" ON public.energy_alert_preferences;
DROP POLICY IF EXISTS "Users manage own alert prefs with company check" ON public.energy_alert_preferences;

CREATE POLICY "Users manage own alert prefs with company check"
ON public.energy_alert_preferences
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  AND public.user_has_energy_company_access(company_id)
)
WITH CHECK (
  user_id = auth.uid()
  AND public.user_has_energy_company_access(company_id)
);

-- ============================================
-- FIX RLS: energy_report_schedules
-- Add company-level isolation alongside created_by check
-- ============================================
DROP POLICY IF EXISTS "Users manage own report schedules" ON public.energy_report_schedules;
DROP POLICY IF EXISTS "Users manage own report schedules with company check" ON public.energy_report_schedules;
DROP POLICY IF EXISTS "Company members view report schedules" ON public.energy_report_schedules;

CREATE POLICY "Users manage own report schedules with company check"
ON public.energy_report_schedules
FOR ALL
TO authenticated
USING (
  created_by = auth.uid()
  AND public.user_has_energy_company_access(company_id)
)
WITH CHECK (
  created_by = auth.uid()
  AND public.user_has_energy_company_access(company_id)
);

CREATE POLICY "Company members view report schedules"
ON public.energy_report_schedules
FOR SELECT
TO authenticated
USING (
  public.user_has_energy_company_access(company_id)
);