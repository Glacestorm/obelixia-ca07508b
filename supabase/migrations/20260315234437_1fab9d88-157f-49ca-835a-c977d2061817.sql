-- Add trigger_type column to refresh log for manual vs scheduled tracking
ALTER TABLE public.erp_regulatory_refresh_log
  ADD COLUMN IF NOT EXISTS trigger_type text NOT NULL DEFAULT 'manual';

-- Add comment
COMMENT ON COLUMN public.erp_regulatory_refresh_log.trigger_type IS 'manual | scheduled | seed';