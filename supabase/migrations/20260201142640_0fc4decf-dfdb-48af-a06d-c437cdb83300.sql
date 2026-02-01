-- =====================================================
-- FASE 5: Sistema de Offboarding - Gestión de Salidas
-- =====================================================

-- Tabla: Análisis de Terminación
CREATE TABLE public.erp_hr_termination_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES erp_hr_employees(id) ON DELETE CASCADE,
  requested_by UUID,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Tipo de desvinculación
  termination_type TEXT NOT NULL CHECK (termination_type IN (
    'voluntary',
    'objective',
    'disciplinary',
    'collective',
    'mutual',
    'retirement',
    'end_contract',
    'probation',
    'death',
    'disability'
  )),
  
  -- Motivo detallado
  termination_reason TEXT,
  termination_reason_code TEXT,
  
  -- Análisis IA
  ai_analysis JSONB DEFAULT '{}',
  optimal_dates JSONB DEFAULT '[]',
  legal_risks JSONB DEFAULT '[]',
  recommended_approach TEXT,
  
  -- Costes estimados
  estimated_cost_min DECIMAL(12,2),
  estimated_cost_max DECIMAL(12,2),
  final_cost DECIMAL(12,2),
  cost_breakdown JSONB DEFAULT '{}',
  
  -- Fechas clave
  proposed_termination_date DATE,
  actual_termination_date DATE,
  notice_period_days INTEGER,
  notice_given_at TIMESTAMPTZ,
  
  -- Documentación
  documents JSONB DEFAULT '[]',
  severance_calculated BOOLEAN DEFAULT false,
  indemnity_calculated BOOLEAN DEFAULT false,
  
  -- Coordinación con módulo jurídico
  coordination_legal_module_id UUID,
  legal_review_required BOOLEAN DEFAULT false,
  legal_review_status TEXT CHECK (legal_review_status IN ('pending', 'in_review', 'approved', 'rejected')),
  legal_notes TEXT,
  
  -- Estado del proceso
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'under_review',
    'approved',
    'in_progress',
    'executed',
    'cancelled'
  )),
  
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para termination_analysis
CREATE INDEX idx_termination_analysis_company ON erp_hr_termination_analysis(company_id);
CREATE INDEX idx_termination_analysis_employee ON erp_hr_termination_analysis(employee_id);
CREATE INDEX idx_termination_analysis_status ON erp_hr_termination_analysis(status);
CREATE INDEX idx_termination_analysis_type ON erp_hr_termination_analysis(termination_type);

-- RLS para termination_analysis usando función de seguridad correcta
ALTER TABLE erp_hr_termination_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR termination analysis access by company"
  ON erp_hr_termination_analysis
  FOR ALL
  TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

-- Tabla: Tareas de Offboarding
CREATE TABLE public.erp_hr_offboarding_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  termination_id UUID NOT NULL REFERENCES erp_hr_termination_analysis(id) ON DELETE CASCADE,
  
  -- Información de tarea
  task_code TEXT NOT NULL,
  task_name TEXT NOT NULL,
  description TEXT,
  
  -- Tipo y fase
  task_type TEXT NOT NULL CHECK (task_type IN (
    'documentation',
    'access_revocation',
    'knowledge_transfer',
    'exit_interview',
    'equipment_return',
    'final_payment',
    'certificate_issuance',
    'notification',
    'compliance'
  )),
  phase TEXT NOT NULL DEFAULT 'pre_termination' CHECK (phase IN (
    'pre_termination',
    'termination_day',
    'post_termination'
  )),
  order_in_phase INTEGER DEFAULT 0,
  
  -- Responsable
  responsible_type TEXT NOT NULL CHECK (responsible_type IN ('employee', 'hr', 'manager', 'it', 'legal', 'finance')),
  assigned_to UUID,
  
  -- Fechas y estado
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  
  -- Notas
  notes TEXT,
  blocking_reason TEXT,
  
  -- Generado por IA
  ai_generated BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para offboarding_tasks
CREATE INDEX idx_offboarding_tasks_termination ON erp_hr_offboarding_tasks(termination_id);
CREATE INDEX idx_offboarding_tasks_status ON erp_hr_offboarding_tasks(status);
CREATE INDEX idx_offboarding_tasks_due_date ON erp_hr_offboarding_tasks(due_date);

-- RLS para offboarding_tasks
ALTER TABLE erp_hr_offboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR offboarding tasks access"
  ON erp_hr_offboarding_tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM erp_hr_termination_analysis ta
      WHERE ta.id = erp_hr_offboarding_tasks.termination_id
      AND public.user_has_erp_company_access(ta.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM erp_hr_termination_analysis ta
      WHERE ta.id = erp_hr_offboarding_tasks.termination_id
      AND public.user_has_erp_company_access(ta.company_id)
    )
  );

-- Tabla: Historial de offboarding completados
CREATE TABLE public.erp_hr_offboarding_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  termination_id UUID REFERENCES erp_hr_termination_analysis(id) ON DELETE SET NULL,
  
  -- Datos del empleado al momento del offboarding
  employee_snapshot JSONB NOT NULL DEFAULT '{}',
  
  -- Resumen
  termination_type TEXT NOT NULL,
  termination_date DATE NOT NULL,
  tenure_months INTEGER,
  final_settlement_amount DECIMAL(12,2),
  
  -- Exit interview
  exit_interview_conducted BOOLEAN DEFAULT false,
  exit_interview_data JSONB DEFAULT '{}',
  
  -- Métricas
  offboarding_duration_days INTEGER,
  tasks_completed INTEGER,
  tasks_total INTEGER,
  
  -- Feedback y notas
  employee_feedback TEXT,
  hr_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para history
CREATE INDEX idx_offboarding_history_company ON erp_hr_offboarding_history(company_id);
CREATE INDEX idx_offboarding_history_date ON erp_hr_offboarding_history(termination_date);

-- RLS para history
ALTER TABLE erp_hr_offboarding_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR offboarding history access"
  ON erp_hr_offboarding_history
  FOR ALL
  TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_termination_analysis_updated_at
  BEFORE UPDATE ON erp_hr_termination_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offboarding_tasks_updated_at
  BEFORE UPDATE ON erp_hr_offboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para calcular progreso de offboarding
CREATE OR REPLACE FUNCTION calculate_offboarding_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE erp_hr_termination_analysis
  SET updated_at = now()
  WHERE id = NEW.termination_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_offboarding_task_progress
  AFTER INSERT OR UPDATE OF status ON erp_hr_offboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION calculate_offboarding_progress();