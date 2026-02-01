-- =====================================================
-- FASE 7: SISTEMA DE FORMACIÓN Y DESARROLLO PROFESIONAL
-- =====================================================

-- Tabla de competencias definidas por la empresa
CREATE TABLE public.erp_hr_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'technical', -- technical, soft, leadership, compliance
  level_definitions JSONB DEFAULT '{}', -- {1: "Básico", 2: "Intermedio", 3: "Avanzado", 4: "Experto"}
  is_mandatory BOOLEAN DEFAULT false,
  applicable_positions TEXT[] DEFAULT '{}',
  cnae_codes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Competencias asignadas a empleados
CREATE TABLE public.erp_hr_employee_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES public.erp_hr_competencies(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
  target_level INTEGER DEFAULT 3 CHECK (target_level BETWEEN 1 AND 5),
  assessed_at TIMESTAMPTZ,
  assessed_by UUID,
  evidence_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, competency_id)
);

-- Catálogo de cursos/formaciones disponibles
CREATE TABLE public.erp_hr_training_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  provider TEXT, -- interno, externo, online
  provider_name TEXT,
  modality TEXT DEFAULT 'presencial', -- presencial, online, blended
  duration_hours NUMERIC(6,2),
  cost_per_person NUMERIC(12,2) DEFAULT 0,
  max_participants INTEGER,
  competencies_covered UUID[] DEFAULT '{}',
  certification_provided BOOLEAN DEFAULT false,
  certification_name TEXT,
  certification_validity_months INTEGER,
  is_mandatory BOOLEAN DEFAULT false,
  cnae_codes TEXT[] DEFAULT '{}',
  external_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Planes de formación anuales
CREATE TABLE public.erp_hr_training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  total_budget NUMERIC(14,2) DEFAULT 0,
  spent_budget NUMERIC(14,2) DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, approved, active, completed
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  objectives JSONB DEFAULT '[]',
  kpis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, year)
);

-- Inscripciones a formaciones
CREATE TABLE public.erp_hr_training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.erp_hr_training_catalog(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.erp_hr_training_plans(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, in_progress, completed, cancelled, no_show
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  final_score NUMERIC(5,2),
  passed BOOLEAN,
  feedback TEXT,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  cost_charged NUMERIC(12,2) DEFAULT 0,
  certificate_url TEXT,
  certificate_expiry TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Certificaciones de empleados
CREATE TABLE public.erp_hr_employee_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  certification_name TEXT NOT NULL,
  issuing_organization TEXT,
  credential_id TEXT,
  issued_date DATE,
  expiry_date DATE,
  is_mandatory BOOLEAN DEFAULT false,
  verification_url TEXT,
  document_url TEXT,
  status TEXT DEFAULT 'active', -- active, expired, revoked, pending_renewal
  renewal_reminder_sent BOOLEAN DEFAULT false,
  cnae_required TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Análisis de gaps formativos generados por IA
CREATE TABLE public.erp_hr_training_gap_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE SET NULL,
  analysis_type TEXT DEFAULT 'individual', -- individual, department, company
  department_id UUID,
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  competency_gaps JSONB DEFAULT '[]',
  recommended_trainings JSONB DEFAULT '[]',
  priority_score NUMERIC(5,2),
  estimated_cost NUMERIC(12,2),
  estimated_hours NUMERIC(8,2),
  ai_insights TEXT,
  action_plan JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending', -- pending, reviewed, actioned
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Historial de formación (para reporting)
CREATE TABLE public.erp_hr_training_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  training_title TEXT NOT NULL,
  training_type TEXT,
  provider TEXT,
  completed_at TIMESTAMPTZ,
  hours_completed NUMERIC(6,2),
  cost NUMERIC(12,2) DEFAULT 0,
  certification_obtained TEXT,
  competencies_improved UUID[] DEFAULT '{}',
  performance_impact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.erp_hr_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_employee_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_training_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_training_gap_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_training_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "erp_hr_competencies_access" ON public.erp_hr_competencies
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_employee_competencies_access" ON public.erp_hr_employee_competencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_employees e
      WHERE e.id = employee_id AND user_has_erp_company_access(e.company_id)
    )
  );

CREATE POLICY "erp_hr_training_catalog_access" ON public.erp_hr_training_catalog
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_training_plans_access" ON public.erp_hr_training_plans
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_training_enrollments_access" ON public.erp_hr_training_enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_employees e
      WHERE e.id = employee_id AND user_has_erp_company_access(e.company_id)
    )
  );

CREATE POLICY "erp_hr_employee_certifications_access" ON public.erp_hr_employee_certifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_employees e
      WHERE e.id = employee_id AND user_has_erp_company_access(e.company_id)
    )
  );

CREATE POLICY "erp_hr_training_gap_analysis_access" ON public.erp_hr_training_gap_analysis
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_training_history_access" ON public.erp_hr_training_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_employees e
      WHERE e.id = employee_id AND user_has_erp_company_access(e.company_id)
    )
  );

-- Función para calcular horas de formación de un empleado
CREATE OR REPLACE FUNCTION calculate_employee_training_hours(p_employee_id UUID, p_year INTEGER DEFAULT NULL)
RETURNS NUMERIC AS $$
DECLARE
  total_hours NUMERIC;
BEGIN
  SELECT COALESCE(SUM(hours_completed), 0)
  INTO total_hours
  FROM public.erp_hr_training_history
  WHERE employee_id = p_employee_id
    AND (p_year IS NULL OR EXTRACT(YEAR FROM completed_at) = p_year);
  
  RETURN total_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar presupuesto gastado
CREATE OR REPLACE FUNCTION update_training_plan_budget()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.plan_id IS NOT NULL THEN
    UPDATE public.erp_hr_training_plans
    SET spent_budget = spent_budget + COALESCE(NEW.cost_charged, 0),
        updated_at = now()
    WHERE id = NEW.plan_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_training_budget
AFTER UPDATE OF status ON public.erp_hr_training_enrollments
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION update_training_plan_budget();

-- Trigger para registrar en historial
CREATE OR REPLACE FUNCTION record_training_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.erp_hr_training_history (
      employee_id,
      training_title,
      training_type,
      provider,
      completed_at,
      hours_completed,
      cost,
      certification_obtained
    )
    SELECT 
      NEW.employee_id,
      tc.title,
      tc.modality,
      tc.provider_name,
      COALESCE(NEW.actual_end, now()),
      tc.duration_hours,
      NEW.cost_charged,
      CASE WHEN tc.certification_provided THEN tc.certification_name ELSE NULL END
    FROM public.erp_hr_training_catalog tc
    WHERE tc.id = NEW.training_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_training_completion
AFTER UPDATE OF status ON public.erp_hr_training_enrollments
FOR EACH ROW
EXECUTE FUNCTION record_training_completion();