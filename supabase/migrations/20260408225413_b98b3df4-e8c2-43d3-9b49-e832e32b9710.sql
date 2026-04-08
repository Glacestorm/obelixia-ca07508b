-- S3-Fix: Replace permissive USING(true) policy with tenant-scoped isolation

-- Step 1: Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated full access on hr_payroll_records" 
  ON public.hr_payroll_records;

-- Step 2: Create tenant-scoped policy using existing proven function
CREATE POLICY "tenant_isolation_all" 
  ON public.hr_payroll_records
  FOR ALL
  TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));