
-- ============================================================
-- FIX 1: energy_checklists UPDATE — missing WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "energy_checklists_update" ON public.energy_checklists;
CREATE POLICY "energy_checklists_update" ON public.energy_checklists
  FOR UPDATE TO authenticated
  USING (user_has_energy_case_access(case_id))
  WITH CHECK (user_has_energy_case_access(case_id));

-- ============================================================
-- FIX 2: energy_proposals UPDATE — missing WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "energy_proposals_update" ON public.energy_proposals;
CREATE POLICY "energy_proposals_update" ON public.energy_proposals
  FOR UPDATE TO authenticated
  USING (user_has_energy_case_access(case_id))
  WITH CHECK (user_has_energy_case_access(case_id));

-- ============================================================
-- FIX 3: energy_tariff_catalog UPDATE — missing WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "energy_tariff_catalog_update" ON public.energy_tariff_catalog;
CREATE POLICY "energy_tariff_catalog_update" ON public.energy_tariff_catalog
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- FIX 4: energy_client_portal_tokens ALL → split into granular policies with WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "energy_portal_tokens_company" ON public.energy_client_portal_tokens;

CREATE POLICY "energy_portal_tokens_select" ON public.energy_client_portal_tokens
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "energy_portal_tokens_insert" ON public.energy_client_portal_tokens
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "energy_portal_tokens_update" ON public.energy_client_portal_tokens
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "energy_portal_tokens_delete" ON public.energy_client_portal_tokens
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));

-- ============================================================
-- FIX 5: energy_notifications ALL → split into granular policies with WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "energy_notifications_company" ON public.energy_notifications;

CREATE POLICY "energy_notifications_select" ON public.energy_notifications
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "energy_notifications_insert" ON public.energy_notifications
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "energy_notifications_update" ON public.energy_notifications
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "energy_notifications_delete" ON public.energy_notifications
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));

-- ============================================================
-- FIX 6: energy_smart_actions ALL → split into granular policies with WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "energy_smart_actions_company" ON public.energy_smart_actions;

CREATE POLICY "energy_smart_actions_select" ON public.energy_smart_actions
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "energy_smart_actions_insert" ON public.energy_smart_actions
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "energy_smart_actions_update" ON public.energy_smart_actions
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));

CREATE POLICY "energy_smart_actions_delete" ON public.energy_smart_actions
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM erp_user_companies WHERE user_id = auth.uid()));
