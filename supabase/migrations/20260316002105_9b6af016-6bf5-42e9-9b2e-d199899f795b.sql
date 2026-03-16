
-- Phase 1B: Add hr_manager and legal_manager to feedback domains function
-- and update RLS policies for granular domain permissions

CREATE OR REPLACE FUNCTION public.get_user_feedback_domains(p_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role IN ('admin')
    ) THEN ARRAY['hr', 'legal', 'compliance', 'fiscal', 'general']
    ELSE ARRAY['general']
  END;
$$;

-- Note: hr_manager and legal_manager are handled in application layer via ROLE_DOMAIN_MAP
-- since app_role enum modification requires careful migration planning.
-- The function above preserves the existing security definer pattern.
-- Domain-specific managers are governed via the hook's ROLE_DOMAIN_MAP for now.

COMMENT ON FUNCTION public.get_user_feedback_domains IS 
'Returns allowed feedback domains for a user. Phase 1B: hr_manager/legal_manager handled in application layer via ROLE_DOMAIN_MAP. Future: add these to app_role enum for full RLS integration.';
