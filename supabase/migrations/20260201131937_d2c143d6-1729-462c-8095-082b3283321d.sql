-- ============================================================
-- FASE 1: Infraestructura Base y Responsabilidades del Puesto
-- Sistema Avanzado de Gestión de Talento HR
-- ============================================================

-- Tabla: erp_hr_job_positions
-- Define puestos de trabajo con responsabilidades detalladas
CREATE TABLE public.erp_hr_job_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
    position_code TEXT NOT NULL,
    position_name TEXT NOT NULL,
    department_id UUID REFERENCES public.erp_hr_departments(id) ON DELETE SET NULL,
    reports_to_position_id UUID REFERENCES public.erp_hr_job_positions(id) ON DELETE SET NULL,
    
    -- Responsabilidades y obligaciones detalladas
    responsibilities JSONB DEFAULT '[]'::jsonb,
    -- Formato: [{ "description": "...", "weight": 0-100, "measurable": true/false, "kpis": [...] }]
    
    obligations JSONB DEFAULT '[]'::jsonb,
    -- Formato: [{ "description": "...", "type": "legal/contractual/internal", "mandatory": true/false }]
    
    -- Competencias requeridas
    required_competencies JSONB DEFAULT '{"hard_skills": [], "soft_skills": []}'::jsonb,
    required_certifications TEXT[] DEFAULT '{}',
    
    -- Banda salarial
    salary_band_min NUMERIC(12,2),
    salary_band_max NUMERIC(12,2),
    salary_currency TEXT DEFAULT 'EUR',
    
    -- Configuración de teletrabajo
    allows_remote_work BOOLEAN DEFAULT false,
    remote_work_percentage INTEGER DEFAULT 0 CHECK (remote_work_percentage >= 0 AND remote_work_percentage <= 100),
    
    -- Criterios de evaluación específicos del puesto
    evaluation_criteria JSONB DEFAULT '[]'::jsonb,
    -- Formato: [{ "name": "...", "type": "numeric/qualitative", "weight": 0-100, "scale": {...} }]
    
    -- Requisitos específicos por CNAE
    cnae_specific_requirements JSONB DEFAULT '{}'::jsonb,
    
    -- Metadatos
    job_level TEXT CHECK (job_level IN ('entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive')),
    employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary', 'intern')),
    min_experience_years INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(company_id, position_code)
);

-- Índices para rendimiento
CREATE INDEX idx_erp_hr_job_positions_company ON public.erp_hr_job_positions(company_id);
CREATE INDEX idx_erp_hr_job_positions_department ON public.erp_hr_job_positions(department_id);
CREATE INDEX idx_erp_hr_job_positions_reports_to ON public.erp_hr_job_positions(reports_to_position_id);
CREATE INDEX idx_erp_hr_job_positions_active ON public.erp_hr_job_positions(company_id, is_active);

-- Tabla: erp_hr_employee_responsibilities
-- Asignación personalizada de responsabilidades por empleado
CREATE TABLE public.erp_hr_employee_responsibilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES public.erp_hr_job_positions(id) ON DELETE CASCADE,
    
    -- Responsabilidades personalizadas (override del puesto)
    custom_responsibilities JSONB DEFAULT '[]'::jsonb,
    -- Formato: [{ "description": "...", "weight": 0-100, "override_type": "add/modify/remove", "original_id": "..." }]
    
    -- Objetivos individuales asignados
    individual_goals JSONB DEFAULT '[]'::jsonb,
    
    -- Tracking de asignación
    assigned_at TIMESTAMPTZ DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id),
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    
    notes TEXT,
    is_current BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_erp_hr_employee_resp_company ON public.erp_hr_employee_responsibilities(company_id);
CREATE INDEX idx_erp_hr_employee_resp_employee ON public.erp_hr_employee_responsibilities(employee_id);
CREATE INDEX idx_erp_hr_employee_resp_position ON public.erp_hr_employee_responsibilities(position_id);
CREATE INDEX idx_erp_hr_employee_resp_current ON public.erp_hr_employee_responsibilities(employee_id, is_current);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.erp_hr_job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_employee_responsibilities ENABLE ROW LEVEL SECURITY;

-- Políticas para erp_hr_job_positions
CREATE POLICY "Users can view job positions in their company"
ON public.erp_hr_job_positions FOR SELECT
TO authenticated
USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "HR managers can manage job positions"
ON public.erp_hr_job_positions FOR ALL
TO authenticated
USING (public.user_has_erp_company_access(company_id))
WITH CHECK (public.user_has_erp_company_access(company_id));

-- Políticas para erp_hr_employee_responsibilities
CREATE POLICY "Users can view responsibilities in their company"
ON public.erp_hr_employee_responsibilities FOR SELECT
TO authenticated
USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "HR managers can manage employee responsibilities"
ON public.erp_hr_employee_responsibilities FOR ALL
TO authenticated
USING (public.user_has_erp_company_access(company_id))
WITH CHECK (public.user_has_erp_company_access(company_id));

-- ============================================================
-- Triggers para updated_at
-- ============================================================

CREATE TRIGGER update_erp_hr_job_positions_updated_at
    BEFORE UPDATE ON public.erp_hr_job_positions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_hr_employee_responsibilities_updated_at
    BEFORE UPDATE ON public.erp_hr_employee_responsibilities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Comentarios de documentación
-- ============================================================

COMMENT ON TABLE public.erp_hr_job_positions IS 'Catálogo de puestos de trabajo con responsabilidades, competencias y criterios de evaluación';
COMMENT ON TABLE public.erp_hr_employee_responsibilities IS 'Asignación personalizada de responsabilidades por empleado, con posibilidad de override del puesto base';

COMMENT ON COLUMN public.erp_hr_job_positions.responsibilities IS 'Array JSON con responsabilidades: [{description, weight, measurable, kpis}]';
COMMENT ON COLUMN public.erp_hr_job_positions.obligations IS 'Obligaciones legales/contractuales: [{description, type, mandatory}]';
COMMENT ON COLUMN public.erp_hr_job_positions.evaluation_criteria IS 'Criterios específicos de evaluación del desempeño para este puesto';
COMMENT ON COLUMN public.erp_hr_job_positions.cnae_specific_requirements IS 'Requisitos específicos según el código CNAE de la empresa';