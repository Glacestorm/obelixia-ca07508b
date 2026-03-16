
CREATE OR REPLACE FUNCTION public.count_active_employees_by_company(p_company_ids UUID[])
RETURNS TABLE(company_id UUID, active_count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT e.company_id, COUNT(*)::BIGINT AS active_count
  FROM public.erp_hr_employees e
  WHERE e.company_id = ANY(p_company_ids)
    AND e.status = 'active'
  GROUP BY e.company_id;
$$;
