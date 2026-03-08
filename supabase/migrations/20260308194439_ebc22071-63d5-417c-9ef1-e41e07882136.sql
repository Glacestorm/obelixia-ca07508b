
-- Energy Tracking table for case timeline/seguimiento
CREATE TABLE IF NOT EXISTS public.energy_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  proposal_sent_date TIMESTAMP WITH TIME ZONE,
  proposal_accepted_date TIMESTAMP WITH TIME ZONE,
  supplier_change_date TIMESTAMP WITH TIME ZONE,
  first_invoice_review_date TIMESTAMP WITH TIME ZONE,
  observed_real_savings NUMERIC(12,2),
  tracking_notes TEXT,
  closure_status TEXT DEFAULT 'open',
  timeline_events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

ALTER TABLE public.energy_tracking ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can manage energy_tracking"
    ON public.energy_tracking FOR ALL TO authenticated
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add AI columns to contracts if missing
ALTER TABLE public.energy_contracts 
  ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP WITH TIME ZONE;
