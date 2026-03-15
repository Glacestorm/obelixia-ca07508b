
-- A. Extend erp_regulatory_sources with refresh tracking columns
ALTER TABLE public.erp_regulatory_sources
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_message text,
  ADD COLUMN IF NOT EXISTS refresh_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS documents_found integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_refreshes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ingestion_method text NOT NULL DEFAULT 'manual';

-- Extend erp_regulatory_documents with change tracking
ALTER TABLE public.erp_regulatory_documents
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_version_id uuid REFERENCES public.erp_regulatory_documents(id),
  ADD COLUMN IF NOT EXISTS change_type text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- B. Human feedback table for supervised learning base
CREATE TABLE IF NOT EXISTS public.erp_regulatory_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.erp_regulatory_documents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  feedback_type text NOT NULL DEFAULT 'quality',
  rating integer CHECK (rating >= 1 AND rating <= 5),
  accepted boolean,
  comment text,
  field_reviewed text,
  original_value text,
  corrected_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_regulatory_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage regulatory feedback"
  ON public.erp_regulatory_feedback
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- C. Refresh log table
CREATE TABLE IF NOT EXISTS public.erp_regulatory_refresh_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.erp_regulatory_sources(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'started',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  documents_found integer DEFAULT 0,
  documents_new integer DEFAULT 0,
  documents_updated integer DEFAULT 0,
  documents_unchanged integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_regulatory_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read refresh logs"
  ON public.erp_regulatory_refresh_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service can manage refresh logs"
  ON public.erp_regulatory_refresh_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for refresh log queries
CREATE INDEX IF NOT EXISTS idx_regulatory_refresh_log_source ON public.erp_regulatory_refresh_log(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulatory_documents_hash ON public.erp_regulatory_documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_regulatory_documents_change ON public.erp_regulatory_documents(change_type, created_at DESC);
