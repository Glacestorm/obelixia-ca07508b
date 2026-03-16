
-- Fix recursive RLS: create security definer function for supervisor check
CREATE OR REPLACE FUNCTION public.is_hr_advisor_supervisor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.erp_hr_advisor_assignments
    WHERE advisor_user_id = _user_id
      AND role = 'supervisor'
      AND is_active = true
  );
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.erp_hr_advisor_assignments;

-- Recreate using security definer function
CREATE POLICY "Supervisors can manage all assignments"
  ON public.erp_hr_advisor_assignments
  FOR ALL
  TO authenticated
  USING (public.is_hr_advisor_supervisor(auth.uid()));
