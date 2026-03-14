
-- V2-ES.9.6: Add employee self-service RLS for time clock
-- Employees can view their own time clock entries
CREATE POLICY "employee_self_view_time_clock"
  ON public.erp_hr_time_clock FOR SELECT
  TO authenticated
  USING (
    employee_id = (
      SELECT e.id FROM public.erp_hr_employees e WHERE e.user_id = auth.uid() LIMIT 1
    )
  );

-- V2-ES.9.5: Add employee self-service RLS for admin requests
CREATE POLICY "employee_self_view_requests"
  ON public.hr_admin_requests FOR SELECT
  TO authenticated
  USING (
    employee_id = (
      SELECT e.id FROM public.erp_hr_employees e WHERE e.user_id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "employee_self_insert_requests"
  ON public.hr_admin_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (
      SELECT e.id FROM public.erp_hr_employees e WHERE e.user_id = auth.uid() LIMIT 1
    )
  );
