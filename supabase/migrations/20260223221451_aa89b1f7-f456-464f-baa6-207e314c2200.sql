
-- Add scoring + de-duplication for course news
ALTER TABLE public.academia_course_news
ADD COLUMN IF NOT EXISTS importance_score INTEGER NOT NULL DEFAULT 50;

CREATE UNIQUE INDEX IF NOT EXISTS uq_academia_course_news_course_source_url
ON public.academia_course_news (course_id, source_url)
WHERE source_url IS NOT NULL;

-- Sources to monitor (URLs/RSS/sitemaps/search queries)
CREATE TABLE IF NOT EXISTS public.academia_news_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.academia_courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'url', -- url | rss | sitemap | search
  url TEXT,
  query TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fetch_limit INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.academia_news_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view news sources"
ON public.academia_news_sources
FOR SELECT
USING (is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can insert news sources"
ON public.academia_news_sources
FOR INSERT
WITH CHECK (is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can update news sources"
ON public.academia_news_sources
FOR UPDATE
USING (is_admin_or_superadmin(auth.uid()))
WITH CHECK (is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can delete news sources"
ON public.academia_news_sources
FOR DELETE
USING (is_admin_or_superadmin(auth.uid()));

-- Settings: schedule can be changed (daily/weekly/monthly or cron)
CREATE TABLE IF NOT EXISTS public.academia_news_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.academia_courses(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'weekly', -- daily | weekly | monthly | cron
  cron_expression TEXT, -- if frequency = cron
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id)
);

ALTER TABLE public.academia_news_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view news settings"
ON public.academia_news_settings
FOR SELECT
USING (is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can insert news settings"
ON public.academia_news_settings
FOR INSERT
WITH CHECK (is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can update news settings"
ON public.academia_news_settings
FOR UPDATE
USING (is_admin_or_superadmin(auth.uid()))
WITH CHECK (is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can delete news settings"
ON public.academia_news_settings
FOR DELETE
USING (is_admin_or_superadmin(auth.uid()));

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_academia_news_sources_updated_at ON public.academia_news_sources;
CREATE TRIGGER trg_academia_news_sources_updated_at
BEFORE UPDATE ON public.academia_news_sources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_academia_news_settings_updated_at ON public.academia_news_settings;
CREATE TRIGGER trg_academia_news_settings_updated_at
BEFORE UPDATE ON public.academia_news_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
