
-- Phase 6: Wellbeing Enterprise
-- Employee wellness, burnout detection, pulse surveys, wellness programs

-- 1. Wellbeing Assessments
CREATE TABLE public.erp_hr_wellbeing_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  entity_id UUID REFERENCES public.erp_hr_legal_entities(id),
  assessment_type TEXT NOT NULL DEFAULT 'pulse' CHECK (assessment_type IN ('pulse', 'quarterly', 'annual', 'onboarding', 'exit')),
  overall_score NUMERIC(4,2),
  dimensions JSONB DEFAULT '{}',
  burnout_risk TEXT DEFAULT 'low' CHECK (burnout_risk IN ('critical', 'high', 'medium', 'low', 'none')),
  engagement_level NUMERIC(4,2),
  stress_level NUMERIC(4,2),
  satisfaction_level NUMERIC(4,2),
  work_life_balance NUMERIC(4,2),
  notes TEXT,
  assessed_by TEXT DEFAULT 'self',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Pulse Surveys
CREATE TABLE public.erp_hr_wellbeing_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.erp_hr_legal_entities(id),
  title TEXT NOT NULL,
  description TEXT,
  survey_type TEXT NOT NULL DEFAULT 'pulse' CHECK (survey_type IN ('pulse', 'enps', 'climate', 'exit', 'custom')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  questions JSONB DEFAULT '[]',
  target_departments TEXT[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  anonymized BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'weekly',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  total_responses INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 0,
  results_summary JSONB DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Survey Responses
CREATE TABLE public.erp_hr_wellbeing_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.erp_hr_wellbeing_surveys(id) ON DELETE CASCADE,
  respondent_id UUID,
  answers JSONB DEFAULT '[]',
  sentiment_score NUMERIC(4,2),
  completion_time_seconds INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Wellness Programs
CREATE TABLE public.erp_hr_wellness_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.erp_hr_legal_entities(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'physical' CHECK (category IN ('physical', 'mental', 'financial', 'social', 'professional', 'environmental')),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  provider TEXT,
  budget NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  schedule JSONB DEFAULT '{}',
  benefits JSONB DEFAULT '[]',
  kpis JSONB DEFAULT '{}',
  satisfaction_score NUMERIC(4,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Program Enrollments
CREATE TABLE public.erp_hr_wellness_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.erp_hr_wellness_programs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'active', 'completed', 'dropped', 'waitlisted')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  feedback TEXT,
  rating NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Burnout Alerts
CREATE TABLE public.erp_hr_burnout_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  entity_id UUID REFERENCES public.erp_hr_legal_entities(id),
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
  risk_score NUMERIC(5,2),
  contributing_factors JSONB DEFAULT '[]',
  recommended_actions JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'escalated')),
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Wellbeing KPIs
CREATE TABLE public.erp_hr_wellbeing_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.erp_hr_legal_entities(id),
  period TEXT NOT NULL,
  enps_score NUMERIC(5,2),
  engagement_index NUMERIC(5,2),
  burnout_rate NUMERIC(5,2),
  absenteeism_rate NUMERIC(5,2),
  voluntary_turnover NUMERIC(5,2),
  survey_participation NUMERIC(5,2),
  wellness_adoption NUMERIC(5,2),
  avg_satisfaction NUMERIC(4,2),
  avg_stress NUMERIC(4,2),
  avg_work_life_balance NUMERIC(4,2),
  top_concerns JSONB DEFAULT '[]',
  trends JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.erp_hr_wellbeing_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_wellbeing_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_wellbeing_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_wellness_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_wellness_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_burnout_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_wellbeing_kpis ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated access)
CREATE POLICY "auth_wellbeing_assessments" ON public.erp_hr_wellbeing_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_wellbeing_surveys" ON public.erp_hr_wellbeing_surveys FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_wellbeing_survey_responses" ON public.erp_hr_wellbeing_survey_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_wellness_programs" ON public.erp_hr_wellness_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_wellness_enrollments" ON public.erp_hr_wellness_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_burnout_alerts" ON public.erp_hr_burnout_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_wellbeing_kpis" ON public.erp_hr_wellbeing_kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime for burnout alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_burnout_alerts;
