DROP POLICY "erp_audit_nomina_cycles_company_isolation" ON public.erp_audit_nomina_cycles;

CREATE POLICY "tenant_isolation_all"
  ON public.erp_audit_nomina_cycles
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));