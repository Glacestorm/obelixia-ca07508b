
-- Tabla de noticias/base de conocimiento contable del curso
CREATE TABLE IF NOT EXISTS public.academia_course_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.academia_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  source_url TEXT,
  source_name TEXT,
  category TEXT DEFAULT 'normativa',
  tags TEXT[],
  is_regulation BOOLEAN DEFAULT false,
  regulation_code TEXT,
  effective_date DATE,
  importance TEXT DEFAULT 'medium',
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.academia_course_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published course news" ON public.academia_course_news FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage course news" ON public.academia_course_news FOR ALL USING (true);

-- Tabla del simulador contable
CREATE TABLE IF NOT EXISTS public.academia_simulator_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.academia_courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.academia_lessons(id),
  session_name TEXT DEFAULT 'Sesión de práctica',
  journal_entries JSONB DEFAULT '[]'::jsonb,
  ledger_data JSONB DEFAULT '{}',
  trial_balance JSONB DEFAULT '{}',
  balance_sheet JSONB DEFAULT '{}',
  income_statement JSONB DEFAULT '{}',
  dataset_type TEXT DEFAULT 'custom',
  score NUMERIC(5,2),
  feedback JSONB,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.academia_simulator_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own simulator sessions" ON public.academia_simulator_sessions FOR ALL USING (auth.uid() = user_id);

-- Tabla de datasets predefinidos para el simulador
CREATE TABLE IF NOT EXISTS public.academia_simulator_datasets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.academia_courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.academia_lessons(id),
  title TEXT NOT NULL,
  description TEXT,
  dataset_type TEXT DEFAULT 'invoices',
  data JSONB NOT NULL DEFAULT '{}',
  difficulty TEXT DEFAULT 'intermediate',
  expected_solution JSONB,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.academia_simulator_datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published datasets" ON public.academia_simulator_datasets FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage datasets" ON public.academia_simulator_datasets FOR ALL USING (true);
