
-- Phase 1C Step 2: Update functions and RLS using new enum values

-- 1. Update get_user_feedback_domains with full role support
CREATE OR REPLACE FUNCTION public.get_user_feedback_domains(p_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role IN ('superadmin', 'admin')
    ) THEN ARRAY['hr', 'legal', 'compliance', 'fiscal', 'general']
    WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'hr_manager'
    ) THEN ARRAY['hr', 'compliance', 'general']
    WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'legal_manager'
    ) THEN ARRAY['legal', 'compliance', 'general']
    WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role IN ('responsable_comercial', 'director_comercial')
    ) THEN ARRAY['compliance', 'fiscal', 'general']
    WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'auditor'
    ) THEN ARRAY['compliance', 'general']
    ELSE ARRAY['general']
  END;
$$;

-- 2. Domain-based agent configuration check
CREATE OR REPLACE FUNCTION public.can_configure_agent_domain(p_user_id uuid, p_domain text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role IN ('superadmin', 'admin')
    ) THEN true
    WHEN p_domain = 'hr' AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'hr_manager'
    ) THEN true
    WHEN p_domain = 'legal' AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'legal_manager'
    ) THEN true
    ELSE false
  END;
$$;

-- 3. Human review closure permissions
CREATE OR REPLACE FUNCTION public.can_close_review_domain(p_user_id uuid, p_domain text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role IN ('superadmin', 'admin')
    ) THEN true
    WHEN p_domain = 'hr' AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'hr_manager'
    ) THEN true
    WHEN p_domain = 'legal' AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'legal_manager'
    ) THEN true
    WHEN p_domain = 'compliance' AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role IN ('hr_manager', 'legal_manager', 'auditor')
    ) THEN true
    ELSE false
  END;
$$;

-- 4. Update erp_regulatory_feedback RLS
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.erp_regulatory_feedback;
DROP POLICY IF EXISTS "Users can view feedback" ON public.erp_regulatory_feedback;
DROP POLICY IF EXISTS "erp_regulatory_feedback_insert" ON public.erp_regulatory_feedback;
DROP POLICY IF EXISTS "erp_regulatory_feedback_select" ON public.erp_regulatory_feedback;
DROP POLICY IF EXISTS "feedback_select_authenticated" ON public.erp_regulatory_feedback;
DROP POLICY IF EXISTS "feedback_insert_domain_check" ON public.erp_regulatory_feedback;
DROP POLICY IF EXISTS "feedback_update_own" ON public.erp_regulatory_feedback;

CREATE POLICY "feedback_select_authenticated" ON public.erp_regulatory_feedback
FOR SELECT TO authenticated USING (true);

CREATE POLICY "feedback_insert_domain_check" ON public.erp_regulatory_feedback
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    reviewer_domain IS NULL
    OR reviewer_domain = ANY(public.get_user_feedback_domains(auth.uid()))
  )
);

CREATE POLICY "feedback_update_own" ON public.erp_regulatory_feedback
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
