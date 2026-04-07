
-- =============================================
-- S3.5 PASO 1: erp_hr_bridge_approvals
-- =============================================
DROP POLICY IF EXISTS "Auth users manage own company bridge approvals" ON erp_hr_bridge_approvals;

CREATE POLICY "tenant_select" ON erp_hr_bridge_approvals
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(company_id::uuid));

CREATE POLICY "tenant_insert" ON erp_hr_bridge_approvals
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(company_id::uuid));

CREATE POLICY "tenant_update" ON erp_hr_bridge_approvals
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(company_id::uuid))
  WITH CHECK (user_has_erp_company_access(company_id::uuid));

-- =============================================
-- S3.5 PASO 2: erp_hr_bridge_logs
-- =============================================
DROP POLICY IF EXISTS "Auth users manage own company bridge logs" ON erp_hr_bridge_logs;

CREATE POLICY "tenant_select" ON erp_hr_bridge_logs
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(company_id::uuid));

CREATE POLICY "tenant_insert" ON erp_hr_bridge_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(company_id::uuid));

CREATE POLICY "tenant_update" ON erp_hr_bridge_logs
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(company_id::uuid))
  WITH CHECK (user_has_erp_company_access(company_id::uuid));

-- =============================================
-- S3.5 PASO 3: erp_hr_bridge_mappings
-- =============================================
DROP POLICY IF EXISTS "Auth users manage own company bridge mappings" ON erp_hr_bridge_mappings;

CREATE POLICY "tenant_select" ON erp_hr_bridge_mappings
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(company_id::uuid));

CREATE POLICY "tenant_insert" ON erp_hr_bridge_mappings
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(company_id::uuid));

CREATE POLICY "tenant_update" ON erp_hr_bridge_mappings
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(company_id::uuid))
  WITH CHECK (user_has_erp_company_access(company_id::uuid));
