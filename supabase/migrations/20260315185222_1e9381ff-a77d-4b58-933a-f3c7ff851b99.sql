-- Employee self-insert policy for time clock (portal fichaje)
CREATE POLICY "employee_self_insert_time_clock"
ON public.erp_hr_time_clock
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = (
    SELECT e.id FROM erp_hr_employees e WHERE e.user_id = auth.uid() LIMIT 1
  )
);

-- Employee self-update policy for time clock (clock out)
CREATE POLICY "employee_self_update_time_clock"
ON public.erp_hr_time_clock
FOR UPDATE
TO authenticated
USING (
  employee_id = (
    SELECT e.id FROM erp_hr_employees e WHERE e.user_id = auth.uid() LIMIT 1
  )
)
WITH CHECK (
  employee_id = (
    SELECT e.id FROM erp_hr_employees e WHERE e.user_id = auth.uid() LIMIT 1
  )
);