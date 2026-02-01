-- =====================================================
-- FASE 6: SISTEMA DE EVALUACIÓN DEL DESEMPEÑO Y BONUS
-- =====================================================

-- Ciclos de evaluación (mensual, trimestral, anual)
CREATE TABLE public.erp_hr_evaluation_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle_type TEXT NOT NULL CHECK (cycle_type IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'review', 'completed', 'cancelled')),
  evaluation_deadline DATE,
  self_evaluation_enabled BOOLEAN DEFAULT true,
  peer_evaluation_enabled BOOLEAN DEFAULT false,
  manager_evaluation_required BOOLEAN DEFAULT true,
  hr_approval_required BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Objetivos de empleados
CREATE TABLE public.erp_hr_employee_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.erp_hr_evaluation_cycles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  objective_type TEXT NOT NULL CHECK (objective_type IN ('quantitative', 'qualitative', 'project', 'competency', 'development')),
  target_value NUMERIC,
  target_unit TEXT,
  current_value NUMERIC DEFAULT 0,
  weight_percentage NUMERIC DEFAULT 0 CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'achieved', 'partially_achieved', 'not_achieved', 'cancelled')),
  achievement_percentage NUMERIC DEFAULT 0,
  due_date DATE,
  proposed_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  ai_suggested BOOLEAN DEFAULT false,
  ai_suggestion_context JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Evaluaciones de desempeño
CREATE TABLE public.erp_hr_performance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.erp_hr_evaluation_cycles(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id),
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('self', 'manager', 'peer', 'hr')),
  overall_score NUMERIC CHECK (overall_score >= 0 AND overall_score <= 100),
  rating TEXT CHECK (rating IN ('exceptional', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory')),
  competency_scores JSONB DEFAULT '{}',
  strengths TEXT[],
  areas_for_improvement TEXT[],
  development_recommendations TEXT[],
  manager_comments TEXT,
  employee_comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'disputed')),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  ai_analysis JSONB,
  ai_recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, cycle_id, evaluation_type, evaluator_id)
);

-- Configuración de bonus anual
CREATE TABLE public.erp_hr_bonus_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  total_bonus_pool_percentage NUMERIC NOT NULL CHECK (total_bonus_pool_percentage >= 0 AND total_bonus_pool_percentage <= 100),
  minimum_profit_threshold NUMERIC DEFAULT 0,
  distribution_method TEXT NOT NULL DEFAULT 'performance_weighted' CHECK (distribution_method IN ('equal', 'salary_weighted', 'performance_weighted', 'hybrid')),
  performance_weight NUMERIC DEFAULT 70 CHECK (performance_weight >= 0 AND performance_weight <= 100),
  tenure_weight NUMERIC DEFAULT 15 CHECK (tenure_weight >= 0 AND tenure_weight <= 100),
  department_weight NUMERIC DEFAULT 15 CHECK (department_weight >= 0 AND department_weight <= 100),
  min_tenure_months INTEGER DEFAULT 6,
  excluded_contract_types TEXT[] DEFAULT ARRAY['intern', 'temporary'],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'calculating', 'distributed', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, fiscal_year)
);

-- Asignaciones de bonus individuales
CREATE TABLE public.erp_hr_bonus_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES public.erp_hr_bonus_config(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  base_salary NUMERIC NOT NULL,
  performance_score NUMERIC,
  tenure_months INTEGER,
  calculated_amount NUMERIC NOT NULL DEFAULT 0,
  adjusted_amount NUMERIC,
  adjustment_reason TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid', 'cancelled')),
  payment_date DATE,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(config_id, employee_id)
);

-- Ranking de desempeño (9-Box Grid)
CREATE TABLE public.erp_hr_talent_grid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.erp_hr_evaluation_cycles(id) ON DELETE CASCADE,
  performance_axis NUMERIC NOT NULL CHECK (performance_axis >= 1 AND performance_axis <= 3),
  potential_axis NUMERIC NOT NULL CHECK (potential_axis >= 1 AND potential_axis <= 3),
  grid_position TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN performance_axis = 3 AND potential_axis = 3 THEN 'star'
      WHEN performance_axis = 3 AND potential_axis = 2 THEN 'high_performer'
      WHEN performance_axis = 3 AND potential_axis = 1 THEN 'solid_performer'
      WHEN performance_axis = 2 AND potential_axis = 3 THEN 'high_potential'
      WHEN performance_axis = 2 AND potential_axis = 2 THEN 'core_player'
      WHEN performance_axis = 2 AND potential_axis = 1 THEN 'effective'
      WHEN performance_axis = 1 AND potential_axis = 3 THEN 'inconsistent'
      WHEN performance_axis = 1 AND potential_axis = 2 THEN 'dilemma'
      ELSE 'underperformer'
    END
  ) STORED,
  assessed_by UUID REFERENCES auth.users(id),
  assessment_notes TEXT,
  development_plan TEXT,
  succession_candidate_for TEXT[],
  flight_risk_score NUMERIC CHECK (flight_risk_score >= 0 AND flight_risk_score <= 100),
  ai_flight_risk_factors JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, cycle_id)
);

-- Índices para rendimiento
CREATE INDEX idx_evaluation_cycles_company ON public.erp_hr_evaluation_cycles(company_id);
CREATE INDEX idx_evaluation_cycles_status ON public.erp_hr_evaluation_cycles(status);
CREATE INDEX idx_employee_objectives_employee ON public.erp_hr_employee_objectives(employee_id);
CREATE INDEX idx_employee_objectives_cycle ON public.erp_hr_employee_objectives(cycle_id);
CREATE INDEX idx_performance_evaluations_employee ON public.erp_hr_performance_evaluations(employee_id);
CREATE INDEX idx_performance_evaluations_cycle ON public.erp_hr_performance_evaluations(cycle_id);
CREATE INDEX idx_bonus_allocations_config ON public.erp_hr_bonus_allocations(config_id);
CREATE INDEX idx_talent_grid_employee ON public.erp_hr_talent_grid(employee_id);
CREATE INDEX idx_talent_grid_position ON public.erp_hr_talent_grid(grid_position);

-- Triggers para updated_at
CREATE TRIGGER set_erp_hr_evaluation_cycles_updated_at
  BEFORE UPDATE ON public.erp_hr_evaluation_cycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_erp_hr_employee_objectives_updated_at
  BEFORE UPDATE ON public.erp_hr_employee_objectives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_erp_hr_performance_evaluations_updated_at
  BEFORE UPDATE ON public.erp_hr_performance_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_erp_hr_bonus_config_updated_at
  BEFORE UPDATE ON public.erp_hr_bonus_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_erp_hr_bonus_allocations_updated_at
  BEFORE UPDATE ON public.erp_hr_bonus_allocations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_erp_hr_talent_grid_updated_at
  BEFORE UPDATE ON public.erp_hr_talent_grid
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
ALTER TABLE public.erp_hr_evaluation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_employee_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_performance_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_bonus_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_bonus_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_talent_grid ENABLE ROW LEVEL SECURITY;

-- Políticas usando función existente
CREATE POLICY "Users can view evaluation cycles of their company"
  ON public.erp_hr_evaluation_cycles FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage evaluation cycles of their company"
  ON public.erp_hr_evaluation_cycles FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can view objectives of their company"
  ON public.erp_hr_employee_objectives FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage objectives of their company"
  ON public.erp_hr_employee_objectives FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can view evaluations of their company"
  ON public.erp_hr_performance_evaluations FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage evaluations of their company"
  ON public.erp_hr_performance_evaluations FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can view bonus config of their company"
  ON public.erp_hr_bonus_config FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage bonus config of their company"
  ON public.erp_hr_bonus_config FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can view bonus allocations of their company"
  ON public.erp_hr_bonus_allocations FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage bonus allocations of their company"
  ON public.erp_hr_bonus_allocations FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can view talent grid of their company"
  ON public.erp_hr_talent_grid FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage talent grid of their company"
  ON public.erp_hr_talent_grid FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

-- Función para calcular score de evaluación agregado
CREATE OR REPLACE FUNCTION public.calculate_employee_performance_score(
  p_employee_id UUID,
  p_cycle_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score NUMERIC;
BEGIN
  SELECT AVG(overall_score) INTO v_score
  FROM erp_hr_performance_evaluations
  WHERE employee_id = p_employee_id 
    AND cycle_id = p_cycle_id
    AND status = 'approved';
  
  RETURN COALESCE(v_score, 0);
END;
$$;