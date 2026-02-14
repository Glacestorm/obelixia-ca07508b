
-- =============================================
-- FASE 1: Formación GAL + Feedback Piloto
-- =============================================

-- Tabla de progreso formativo de técnicos GAL
CREATE TABLE public.galia_training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_key TEXT NOT NULL,
  module_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  progress_percentage NUMERIC DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_key)
);

ALTER TABLE public.galia_training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training progress"
  ON public.galia_training_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training progress"
  ON public.galia_training_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training progress"
  ON public.galia_training_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Tabla de necesidades formativas
CREATE TABLE public.galia_training_needs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  area TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.galia_training_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own training needs"
  ON public.galia_training_needs FOR ALL
  USING (auth.uid() = user_id);

-- Tabla de feedback piloto
CREATE TABLE public.galia_pilot_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL CHECK (category IN ('bug', 'mejora', 'consulta', 'usabilidad', 'rendimiento')),
  area TEXT NOT NULL CHECK (area IN ('asistente', 'panel', 'documentos', 'circuito', 'toolkit', 'otro')),
  comment TEXT,
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'deferred')),
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.galia_pilot_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON public.galia_pilot_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert feedback"
  ON public.galia_pilot_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_galia_training_progress_updated_at
  BEFORE UPDATE ON public.galia_training_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_galia_training_needs_updated_at
  BEFORE UPDATE ON public.galia_training_needs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
