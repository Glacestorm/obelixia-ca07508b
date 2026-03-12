
-- hr_admin_request_comments: Comments and internal notes per request
CREATE TABLE public.hr_admin_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.hr_admin_requests(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT NOT NULL DEFAULT 'Sistema',
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_admin_request_comments_request ON public.hr_admin_request_comments(request_id);

ALTER TABLE public.hr_admin_request_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage request comments"
  ON public.hr_admin_request_comments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- hr_admin_request_activity: Immutable activity log
CREATE TABLE public.hr_admin_request_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.hr_admin_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT NOT NULL DEFAULT 'Sistema',
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_admin_request_activity_request ON public.hr_admin_request_activity(request_id);

ALTER TABLE public.hr_admin_request_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read request activity"
  ON public.hr_admin_request_activity
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert request activity"
  ON public.hr_admin_request_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_admin_request_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_admin_request_activity;

-- Add reference_number column to hr_admin_requests if not exists
ALTER TABLE public.hr_admin_requests ADD COLUMN IF NOT EXISTS reference_number TEXT;
