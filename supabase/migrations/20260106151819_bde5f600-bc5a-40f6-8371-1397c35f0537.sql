-- Corregir función con search_path
DROP FUNCTION IF EXISTS public.update_agent_knowledge_updated_at CASCADE;

CREATE OR REPLACE FUNCTION public.update_agent_knowledge_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_agent_knowledge_updated_at
BEFORE UPDATE ON public.agent_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_agent_knowledge_updated_at();