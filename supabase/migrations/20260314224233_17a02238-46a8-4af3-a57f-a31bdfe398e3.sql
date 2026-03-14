
-- Security definer function: get employee_id for current auth user
CREATE OR REPLACE FUNCTION public.get_employee_id_for_auth_user()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.erp_hr_employees
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Security definer function: check if current user is an employee
CREATE OR REPLACE FUNCTION public.is_employee(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.erp_hr_employees
    WHERE user_id = check_user_id
    AND status IN ('active', 'temporary_leave', 'excedencia')
  )
$$;

-- RLS: employees can read their own record
CREATE POLICY "employees_read_own"
ON public.erp_hr_employees
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS: employees can read their own documents  
CREATE POLICY "employees_read_own_documents"
ON public.erp_hr_employee_documents
FOR SELECT
TO authenticated
USING (
  employee_id = public.get_employee_id_for_auth_user()
  OR public.has_role(auth.uid(), 'admin')
);

-- RLS: employees can read their own payroll records
CREATE POLICY "employees_read_own_payroll"
ON public.hr_payroll_records
FOR SELECT
TO authenticated
USING (
  employee_id = public.get_employee_id_for_auth_user()
  OR public.has_role(auth.uid(), 'admin')
);
