
-- Create advisory lock helper functions for regulatory refresh
CREATE OR REPLACE FUNCTION public.try_acquire_regulatory_refresh_lock()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lock key 73001 is reserved for regulatory-refresh
  RETURN pg_try_advisory_lock(73001);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_regulatory_refresh_lock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_unlock(73001);
END;
$$;

COMMENT ON FUNCTION public.try_acquire_regulatory_refresh_lock() IS 'Advisory lock for regulatory-refresh concurrency control. Key: 73001';
COMMENT ON FUNCTION public.release_regulatory_refresh_lock() IS 'Release advisory lock for regulatory-refresh. Key: 73001';
