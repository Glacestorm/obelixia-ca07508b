-- Drop overly permissive Phase 2A policies
DROP POLICY IF EXISTS "agreement_concepts_select_authenticated" ON public.erp_hr_agreement_salary_concepts;
DROP POLICY IF EXISTS "agreement_concepts_insert_authenticated" ON public.erp_hr_agreement_salary_concepts;
DROP POLICY IF EXISTS "agreement_concepts_update_authenticated" ON public.erp_hr_agreement_salary_concepts;
DROP POLICY IF EXISTS "agreement_concepts_delete_authenticated" ON public.erp_hr_agreement_salary_concepts;

-- The existing policies remain:
--   "Conceptos visibles si el convenio es visible" (SELECT) — hybrid read via agreement lookup
--   "HR Managers pueden gestionar conceptos" (ALL) — tenant write via role check
-- These provide proper security: reads through agreement visibility, writes restricted to HR managers.