
-- ============================================================
-- FASE 4: Talent Intelligence
-- Skill Graph, Role-Skill Mapping, Career Paths, Talent Pools, Mentoring, Gig
-- ============================================================

-- Skill Graph multinivel
CREATE TABLE IF NOT EXISTS public.erp_hr_skill_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.erp_hr_skill_graph(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'technical',
  skill_type TEXT DEFAULT 'hard',
  level INTEGER DEFAULT 0,
  is_core BOOLEAN DEFAULT false,
  description TEXT,
  icon TEXT,
  color TEXT,
  market_demand TEXT DEFAULT 'medium',
  obsolescence_risk TEXT DEFAULT 'low',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_skill_graph ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skill_graph_company_access" ON public.erp_hr_skill_graph;
CREATE POLICY "skill_graph_company_access" ON public.erp_hr_skill_graph
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Role-Skill Mapping
CREATE TABLE IF NOT EXISTS public.erp_hr_role_skill_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  department TEXT,
  skill_id UUID REFERENCES public.erp_hr_skill_graph(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  required_level INTEGER NOT NULL DEFAULT 3,
  importance TEXT DEFAULT 'required',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_role_skill_mapping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_skill_mapping_company_access" ON public.erp_hr_role_skill_mapping;
CREATE POLICY "role_skill_mapping_company_access" ON public.erp_hr_role_skill_mapping
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Career Paths
CREATE TABLE IF NOT EXISTS public.erp_hr_career_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  from_role TEXT NOT NULL,
  to_role TEXT NOT NULL,
  path_type TEXT DEFAULT 'vertical',
  department TEXT,
  requirements JSONB DEFAULT '[]',
  required_skills JSONB DEFAULT '[]',
  avg_time_months INTEGER,
  required_experience_years NUMERIC(3,1),
  training_required JSONB DEFAULT '[]',
  certification_required JSONB DEFAULT '[]',
  typical_salary_increase_percent NUMERIC(5,2),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_career_paths ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "career_paths_company_access" ON public.erp_hr_career_paths;
CREATE POLICY "career_paths_company_access" ON public.erp_hr_career_paths
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Talent Pools
CREATE TABLE IF NOT EXISTS public.erp_hr_talent_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pool_type TEXT NOT NULL DEFAULT 'high_potential',
  description TEXT,
  criteria JSONB DEFAULT '{}',
  members JSONB DEFAULT '[]',
  member_count INTEGER DEFAULT 0,
  target_roles JSONB DEFAULT '[]',
  review_frequency TEXT DEFAULT 'quarterly',
  last_reviewed_at TIMESTAMPTZ,
  owner_id UUID,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_talent_pools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "talent_pools_company_access" ON public.erp_hr_talent_pools;
CREATE POLICY "talent_pools_company_access" ON public.erp_hr_talent_pools
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Mentoring Matches
CREATE TABLE IF NOT EXISTS public.erp_hr_mentoring_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  mentor_employee_id UUID NOT NULL,
  mentor_name TEXT,
  mentee_employee_id UUID NOT NULL,
  mentee_name TEXT,
  program_name TEXT,
  focus_areas JSONB DEFAULT '[]',
  goals JSONB DEFAULT '[]',
  compatibility_score NUMERIC(5,2),
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  sessions_completed INTEGER DEFAULT 0,
  next_session_date DATE,
  feedback JSONB DEFAULT '{}',
  ai_match_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_mentoring_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentoring_matches_company_access" ON public.erp_hr_mentoring_matches;
CREATE POLICY "mentoring_matches_company_access" ON public.erp_hr_mentoring_matches
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Gig Assignments (internal marketplace)
CREATE TABLE IF NOT EXISTS public.erp_hr_gig_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.erp_hr_opportunities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  department TEXT,
  required_skills JSONB DEFAULT '[]',
  assigned_employee_id UUID,
  assigned_employee_name TEXT,
  status TEXT DEFAULT 'open',
  gig_type TEXT DEFAULT 'project',
  estimated_hours INTEGER,
  actual_hours INTEGER,
  start_date DATE,
  end_date DATE,
  deliverables JSONB DEFAULT '[]',
  rating NUMERIC(3,1),
  feedback TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_gig_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gig_assignments_company_access" ON public.erp_hr_gig_assignments;
CREATE POLICY "gig_assignments_company_access" ON public.erp_hr_gig_assignments
  FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skill_graph_company ON public.erp_hr_skill_graph(company_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_role_skill_company ON public.erp_hr_role_skill_mapping(company_id, role_name);
CREATE INDEX IF NOT EXISTS idx_career_paths_company ON public.erp_hr_career_paths(company_id, from_role);
CREATE INDEX IF NOT EXISTS idx_talent_pools_company ON public.erp_hr_talent_pools(company_id, pool_type);
CREATE INDEX IF NOT EXISTS idx_mentoring_company ON public.erp_hr_mentoring_matches(company_id, status);
CREATE INDEX IF NOT EXISTS idx_gig_company ON public.erp_hr_gig_assignments(company_id, status);
