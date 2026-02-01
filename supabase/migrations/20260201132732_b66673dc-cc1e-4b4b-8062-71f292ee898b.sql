-- ============================================
-- FASE 2: Sistema de Reclutamiento Inteligente
-- ============================================

-- Tabla: Ofertas de trabajo
CREATE TABLE public.erp_hr_job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.erp_hr_job_positions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  requirements JSONB DEFAULT '[]'::jsonb,
  nice_to_have JSONB DEFAULT '[]'::jsonb,
  salary_range_min NUMERIC(12,2),
  salary_range_max NUMERIC(12,2),
  employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'temporary')),
  location TEXT,
  remote_option TEXT DEFAULT 'no' CHECK (remote_option IN ('no', 'hybrid', 'full')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'closed')),
  auto_screen_cvs BOOLEAN DEFAULT true,
  max_candidates_to_interview INTEGER DEFAULT 5,
  interview_mode TEXT DEFAULT 'hybrid' CHECK (interview_mode IN ('virtual', 'presencial', 'hybrid')),
  published_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Candidatos
CREATE TABLE public.erp_hr_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_opening_id UUID NOT NULL REFERENCES public.erp_hr_job_openings(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cv_file_url TEXT,
  cv_parsed_data JSONB DEFAULT '{}'::jsonb,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  ai_recommendation TEXT CHECK (ai_recommendation IN ('hire', 'consider', 'reject')),
  ai_score NUMERIC(5,2),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'screening', 'shortlisted', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn')),
  rejection_reason TEXT,
  rejection_email_sent_at TIMESTAMPTZ,
  source TEXT DEFAULT 'portal' CHECK (source IN ('email', 'portal', 'linkedin', 'referral', 'agency', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Entrevistas
CREATE TABLE public.erp_hr_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.erp_hr_candidates(id) ON DELETE CASCADE,
  job_opening_id UUID NOT NULL REFERENCES public.erp_hr_job_openings(id) ON DELETE CASCADE,
  interview_type TEXT DEFAULT 'screening' CHECK (interview_type IN ('screening', 'technical', 'cultural', 'final', 'hr')),
  mode TEXT DEFAULT 'virtual' CHECK (mode IN ('virtual', 'presencial')),
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  location_or_link TEXT,
  interviewers UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  feedback JSONB DEFAULT '{}'::jsonb,
  score NUMERIC(5,2),
  recommendation TEXT CHECK (recommendation IN ('strong_hire', 'hire', 'no_hire', 'strong_no_hire')),
  calendar_invite_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Comunicaciones con candidatos
CREATE TABLE public.erp_hr_candidate_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.erp_hr_candidates(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'sms', 'call', 'whatsapp', 'system')),
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body TEXT,
  template_used TEXT,
  auto_generated BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX idx_job_openings_company ON public.erp_hr_job_openings(company_id);
CREATE INDEX idx_job_openings_status ON public.erp_hr_job_openings(status);
CREATE INDEX idx_candidates_company ON public.erp_hr_candidates(company_id);
CREATE INDEX idx_candidates_opening ON public.erp_hr_candidates(job_opening_id);
CREATE INDEX idx_candidates_status ON public.erp_hr_candidates(status);
CREATE INDEX idx_candidates_email ON public.erp_hr_candidates(email);
CREATE INDEX idx_interviews_candidate ON public.erp_hr_interviews(candidate_id);
CREATE INDEX idx_interviews_scheduled ON public.erp_hr_interviews(scheduled_at);
CREATE INDEX idx_communications_candidate ON public.erp_hr_candidate_communications(candidate_id);

-- Triggers para updated_at
CREATE TRIGGER set_updated_at_job_openings
  BEFORE UPDATE ON public.erp_hr_job_openings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_candidates
  BEFORE UPDATE ON public.erp_hr_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_interviews
  BEFORE UPDATE ON public.erp_hr_interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.erp_hr_job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_candidate_communications ENABLE ROW LEVEL SECURITY;

-- Policies para job_openings
CREATE POLICY "Users can view job openings from their company"
  ON public.erp_hr_job_openings FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "HR can manage job openings"
  ON public.erp_hr_job_openings FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ));

-- Policies para candidates
CREATE POLICY "Users can view candidates from their company"
  ON public.erp_hr_candidates FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "HR can manage candidates"
  ON public.erp_hr_candidates FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ));

-- Policies para interviews
CREATE POLICY "Users can view interviews from their company"
  ON public.erp_hr_interviews FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "HR can manage interviews"
  ON public.erp_hr_interviews FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ));

-- Policies para communications
CREATE POLICY "Users can view communications from their company"
  ON public.erp_hr_candidate_communications FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "HR can manage communications"
  ON public.erp_hr_candidate_communications FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.erp_user_roles WHERE user_id = auth.uid()
  ));