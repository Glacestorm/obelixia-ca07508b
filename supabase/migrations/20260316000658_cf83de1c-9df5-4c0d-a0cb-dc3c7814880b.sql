
-- Add reviewer_domain to erp_regulatory_feedback for granular domain tracking
ALTER TABLE public.erp_regulatory_feedback
  ADD COLUMN IF NOT EXISTS reviewer_domain text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS reviewer_role text;

-- Enable RLS on erp_regulatory_feedback
ALTER TABLE public.erp_regulatory_feedback ENABLE ROW LEVEL SECURITY;

-- Helper function: get user's regulatory feedback domain based on their role
CREATE OR REPLACE FUNCTION public.get_user_feedback_domains(p_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role IN ('superadmin', 'admin'))
      THEN ARRAY['hr', 'legal', 'compliance', 'fiscal', 'general']
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role IN ('director_comercial', 'responsable_comercial'))
      THEN ARRAY['compliance', 'fiscal', 'general']
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'auditor')
      THEN ARRAY['compliance', 'general']
    ELSE ARRAY['general']
  END;
$$;

-- Policy: users can read all feedback (transparency)
CREATE POLICY "Authenticated users can read feedback"
  ON public.erp_regulatory_feedback
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: users can insert feedback only for their allowed domains
CREATE POLICY "Users can insert feedback for their domains"
  ON public.erp_regulatory_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND reviewer_domain = ANY(public.get_user_feedback_domains(auth.uid()))
  );

-- Policy: users can update only their own feedback
CREATE POLICY "Users can update own feedback"
  ON public.erp_regulatory_feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
