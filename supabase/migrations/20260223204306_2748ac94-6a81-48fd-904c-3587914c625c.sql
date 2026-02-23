
-- Fix overly-permissive RLS policies introduced for new tables

-- academia_course_news
DROP POLICY IF EXISTS "Admins can manage course news" ON public.academia_course_news;

CREATE POLICY "Admins can insert course news"
ON public.academia_course_news
FOR INSERT
WITH CHECK (is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can update course news"
ON public.academia_course_news
FOR UPDATE
USING (is_admin_or_superadmin(auth.uid()))
WITH CHECK (is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can delete course news"
ON public.academia_course_news
FOR DELETE
USING (is_admin_or_superadmin(auth.uid()));

-- academia_simulator_datasets
DROP POLICY IF EXISTS "Admins can manage datasets" ON public.academia_simulator_datasets;

CREATE POLICY "Admins can insert datasets"
ON public.academia_simulator_datasets
FOR INSERT
WITH CHECK (is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can update datasets"
ON public.academia_simulator_datasets
FOR UPDATE
USING (is_admin_or_superadmin(auth.uid()))
WITH CHECK (is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can delete datasets"
ON public.academia_simulator_datasets
FOR DELETE
USING (is_admin_or_superadmin(auth.uid()));

-- academia_simulator_sessions: ensure INSERT works (WITH CHECK)
DROP POLICY IF EXISTS "Users can manage own simulator sessions" ON public.academia_simulator_sessions;

CREATE POLICY "Users can view own simulator sessions"
ON public.academia_simulator_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own simulator sessions"
ON public.academia_simulator_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulator sessions"
ON public.academia_simulator_sessions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulator sessions"
ON public.academia_simulator_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_academia_course_news_updated_at ON public.academia_course_news;
CREATE TRIGGER trg_academia_course_news_updated_at
BEFORE UPDATE ON public.academia_course_news
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_academia_simulator_sessions_updated_at ON public.academia_simulator_sessions;
CREATE TRIGGER trg_academia_simulator_sessions_updated_at
BEFORE UPDATE ON public.academia_simulator_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
