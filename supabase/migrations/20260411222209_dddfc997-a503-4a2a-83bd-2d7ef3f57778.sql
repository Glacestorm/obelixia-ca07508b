-- S9.4B Prepaso: Guard server-side for VPT score immutability outside draft
-- Prevents score modifications on non-draft valuations while allowing status transitions

CREATE OR REPLACE FUNCTION public.guard_vpt_score_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Allow all changes on draft valuations
  IF OLD.status = 'draft' THEN
    RETURN NEW;
  END IF;

  -- For non-draft: block changes to scoring fields
  IF NEW.factor_scores IS DISTINCT FROM OLD.factor_scores
     OR NEW.total_score IS DISTINCT FROM OLD.total_score
     OR NEW.ai_suggestions IS DISTINCT FROM OLD.ai_suggestions
     OR NEW.methodology_snapshot IS DISTINCT FROM OLD.methodology_snapshot
  THEN
    RAISE EXCEPTION 'Cannot modify scores on a valuation with status "%". Only draft valuations can be scored.', OLD.status;
  END IF;

  -- Allow status transitions and other metadata changes
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vpt_score_immutability
  BEFORE UPDATE ON public.erp_hr_job_valuations
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_vpt_score_immutability();