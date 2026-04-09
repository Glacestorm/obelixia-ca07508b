CREATE POLICY "insert_innovation_logs"
  ON public.erp_hr_innovation_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_erp_company_access(company_id));