-- =============================================
-- MICRO-FIX: RLS for 4 remaining weak tables
-- =============================================

-- 1. erp_hr_api_clients — drop weak policy, apply real access
DROP POLICY IF EXISTS "Users can manage API clients for their company" ON public.erp_hr_api_clients;
CREATE POLICY "rls_api_clients_access" ON public.erp_hr_api_clients
  FOR ALL TO authenticated
  USING (public.user_has_erp_premium_access(company_id))
  WITH CHECK (public.user_has_erp_premium_access(company_id));

-- 2. erp_hr_webhook_subscriptions — drop weak policy, apply real access
DROP POLICY IF EXISTS "Users can manage webhooks for their company" ON public.erp_hr_webhook_subscriptions;
CREATE POLICY "rls_webhook_subs_access" ON public.erp_hr_webhook_subscriptions
  FOR ALL TO authenticated
  USING (public.user_has_erp_premium_access(company_id))
  WITH CHECK (public.user_has_erp_premium_access(company_id));

-- 3. erp_hr_webhook_delivery_log — drop weak policy, use helper via subscription FK
DROP POLICY IF EXISTS "Users can view delivery logs for their webhooks" ON public.erp_hr_webhook_delivery_log;

CREATE OR REPLACE FUNCTION public.user_has_erp_webhook_log_access(p_subscription_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM erp_hr_webhook_subscriptions ws
    WHERE ws.id = p_subscription_id
      AND public.user_has_erp_premium_access(ws.company_id)
  );
$$;

CREATE POLICY "rls_webhook_log_access" ON public.erp_hr_webhook_delivery_log
  FOR ALL TO authenticated
  USING (public.user_has_erp_webhook_log_access(subscription_id))
  WITH CHECK (public.user_has_erp_webhook_log_access(subscription_id));

-- 4. erp_hr_compensation_analytics — drop both USING(true) policies, apply real access
DROP POLICY IF EXISTS "Users can manage compensation analytics" ON public.erp_hr_compensation_analytics;
DROP POLICY IF EXISTS "Users can view compensation analytics" ON public.erp_hr_compensation_analytics;
CREATE POLICY "rls_comp_analytics_access" ON public.erp_hr_compensation_analytics
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));