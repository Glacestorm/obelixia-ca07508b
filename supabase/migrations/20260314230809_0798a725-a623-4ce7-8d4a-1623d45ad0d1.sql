
-- RLS for erp_hr_leave_balances: employee can view own balances
ALTER TABLE public.erp_hr_leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_self_view_leave_balances"
ON public.erp_hr_leave_balances
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.erp_hr_employees WHERE user_id = auth.uid()
  )
);

-- RLS for erp_hr_leave_requests: employee can view and insert own requests
ALTER TABLE public.erp_hr_leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_self_view_leave_requests"
ON public.erp_hr_leave_requests
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.erp_hr_employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "employee_self_insert_leave_requests"
ON public.erp_hr_leave_requests
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.erp_hr_employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "employee_self_update_leave_requests"
ON public.erp_hr_leave_requests
FOR UPDATE
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.erp_hr_employees WHERE user_id = auth.uid()
  )
  AND status IN ('draft', 'pending_dept')
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.erp_hr_employees WHERE user_id = auth.uid()
  )
);

-- RLS for erp_hr_leave_types: all authenticated can read types
ALTER TABLE public.erp_hr_leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_leave_types"
ON public.erp_hr_leave_types
FOR SELECT
TO authenticated
USING (true);
