-- Fix RLS on erp_hr_regulatory_watch
DROP POLICY IF EXISTS "Users can view regulatory watch for their company" ON erp_hr_regulatory_watch;
DROP POLICY IF EXISTS "Users can manage regulatory watch for their company" ON erp_hr_regulatory_watch;

CREATE POLICY "Users can view regulatory watch"
ON erp_hr_regulatory_watch FOR SELECT
TO authenticated
USING (user_has_erp_company_access(company_id) OR company_id IS NULL);

CREATE POLICY "Users can manage regulatory watch"
ON erp_hr_regulatory_watch FOR ALL
TO authenticated
USING (user_has_erp_company_access(company_id))
WITH CHECK (user_has_erp_company_access(company_id));

-- Fix RLS on erp_hr_regulatory_alerts
DROP POLICY IF EXISTS "Users can view alerts for their company" ON erp_hr_regulatory_alerts;
DROP POLICY IF EXISTS "Users can update alerts for their company" ON erp_hr_regulatory_alerts;

CREATE POLICY "Users can view regulatory alerts"
ON erp_hr_regulatory_alerts FOR SELECT
TO authenticated
USING (user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage regulatory alerts"
ON erp_hr_regulatory_alerts FOR ALL
TO authenticated
USING (user_has_erp_company_access(company_id))
WITH CHECK (user_has_erp_company_access(company_id));