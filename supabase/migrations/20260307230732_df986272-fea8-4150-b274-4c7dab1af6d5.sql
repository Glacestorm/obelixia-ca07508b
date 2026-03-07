
-- Table for Internal Marketplace Opportunities
CREATE TABLE public.erp_hr_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'project' CHECK (type IN ('project','rotation','mentoring','committee','stretch')),
  title TEXT NOT NULL,
  description TEXT,
  department TEXT,
  duration TEXT,
  time_commitment TEXT,
  skills_required TEXT[] DEFAULT '{}',
  skills_developed TEXT[] DEFAULT '{}',
  posted_by TEXT,
  posted_date DATE DEFAULT CURRENT_DATE,
  deadline DATE,
  applicants INTEGER DEFAULT 0,
  spots INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','closed','filled','cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for Succession Planning Critical Positions
CREATE TABLE public.erp_hr_succession_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  incumbent_name TEXT,
  incumbent_employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE SET NULL,
  incumbent_tenure_years INTEGER DEFAULT 0,
  criticality TEXT DEFAULT 'medium' CHECK (criticality IN ('critical','high','medium')),
  vacancy_risk TEXT DEFAULT 'low' CHECK (vacancy_risk IN ('high','medium','low')),
  bench_strength TEXT DEFAULT 'adequate' CHECK (bench_strength IN ('strong','adequate','weak')),
  candidates_count INTEGER DEFAULT 0,
  ready_now_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.erp_hr_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_succession_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view opportunities" ON public.erp_hr_opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage opportunities" ON public.erp_hr_opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can view succession positions" ON public.erp_hr_succession_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage succession positions" ON public.erp_hr_succession_positions FOR ALL TO authenticated USING (true) WITH CHECK (true);
