
-- V2-RRHH-FASE-5B: Hardening RLS + integrity for erp_hr_advisor_assignments

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can view own assignments" ON public.erp_hr_advisor_assignments;
DROP POLICY IF EXISTS "Supervisors can manage all assignments" ON public.erp_hr_advisor_assignments;

-- 2. Granular SELECT policies
-- All authenticated advisors can see their own assignments
CREATE POLICY "Advisors see own assignments"
  ON public.erp_hr_advisor_assignments
  FOR SELECT
  TO authenticated
  USING (advisor_user_id = auth.uid());

-- Supervisors can see all assignments (for management)
CREATE POLICY "Supervisors see all assignments"
  ON public.erp_hr_advisor_assignments
  FOR SELECT
  TO authenticated
  USING (public.is_hr_advisor_supervisor(auth.uid()));

-- 3. INSERT: only supervisors, and they must set valid data
CREATE POLICY "Supervisors can insert assignments"
  ON public.erp_hr_advisor_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_hr_advisor_supervisor(auth.uid())
    AND advisor_user_id IS NOT NULL
    AND company_id IS NOT NULL
  );

-- 4. UPDATE: supervisors can update, but cannot change advisor_user_id or company_id (unique key)
CREATE POLICY "Supervisors can update assignments"
  ON public.erp_hr_advisor_assignments
  FOR UPDATE
  TO authenticated
  USING (public.is_hr_advisor_supervisor(auth.uid()))
  WITH CHECK (public.is_hr_advisor_supervisor(auth.uid()));

-- 5. DELETE: only supervisors
CREATE POLICY "Supervisors can delete assignments"
  ON public.erp_hr_advisor_assignments
  FOR DELETE
  TO authenticated
  USING (public.is_hr_advisor_supervisor(auth.uid()));

-- 6. Add FK for advisor_user_id to guarantee referential integrity
-- Use a DO block to handle case where constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'erp_hr_advisor_assignments_advisor_user_id_fkey'
      AND table_name = 'erp_hr_advisor_assignments'
  ) THEN
    ALTER TABLE public.erp_hr_advisor_assignments
      ADD CONSTRAINT erp_hr_advisor_assignments_advisor_user_id_fkey
      FOREIGN KEY (advisor_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
