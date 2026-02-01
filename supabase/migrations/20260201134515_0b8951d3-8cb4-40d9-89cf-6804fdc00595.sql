-- =============================================
-- FASE 3: Proceso de Onboarding Adaptativo por CNAE
-- =============================================

-- Tabla de plantillas de onboarding por sector
CREATE TABLE public.erp_hr_onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  cnae_code TEXT,
  template_name TEXT NOT NULL,
  description TEXT,
  phases JSONB NOT NULL DEFAULT '[]',
  estimated_duration_days INTEGER DEFAULT 30,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de onboarding por empleado
CREATE TABLE public.erp_hr_employee_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.erp_hr_onboarding_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'paused', 'cancelled')),
  started_at TIMESTAMPTZ,
  target_completion_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  current_phase TEXT,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  assigned_buddy_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE SET NULL,
  tasks_completed JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de tareas de onboarding
CREATE TABLE public.erp_hr_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID REFERENCES public.erp_hr_employee_onboarding(id) ON DELETE CASCADE NOT NULL,
  task_code TEXT NOT NULL,
  task_name TEXT NOT NULL,
  description TEXT,
  phase TEXT NOT NULL,
  order_in_phase INTEGER DEFAULT 1,
  responsible TEXT NOT NULL DEFAULT 'employee' CHECK (responsible IN ('employee', 'buddy', 'hr', 'manager', 'it', 'finance')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  requires_signature BOOLEAN DEFAULT false,
  signature_url TEXT,
  documents_required TEXT[] DEFAULT '{}',
  documents_uploaded TEXT[] DEFAULT '{}',
  ai_generated BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX idx_onboarding_templates_company ON public.erp_hr_onboarding_templates(company_id);
CREATE INDEX idx_onboarding_templates_cnae ON public.erp_hr_onboarding_templates(cnae_code);
CREATE INDEX idx_employee_onboarding_company ON public.erp_hr_employee_onboarding(company_id);
CREATE INDEX idx_employee_onboarding_employee ON public.erp_hr_employee_onboarding(employee_id);
CREATE INDEX idx_employee_onboarding_status ON public.erp_hr_employee_onboarding(status);
CREATE INDEX idx_onboarding_tasks_onboarding ON public.erp_hr_onboarding_tasks(onboarding_id);
CREATE INDEX idx_onboarding_tasks_phase ON public.erp_hr_onboarding_tasks(phase);

-- RLS
ALTER TABLE public.erp_hr_onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_employee_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para templates
CREATE POLICY "Users can view onboarding templates of their company"
ON public.erp_hr_onboarding_templates FOR SELECT
TO authenticated
USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage onboarding templates of their company"
ON public.erp_hr_onboarding_templates FOR ALL
TO authenticated
USING (public.user_has_erp_company_access(company_id))
WITH CHECK (public.user_has_erp_company_access(company_id));

-- Políticas RLS para employee onboarding
CREATE POLICY "Users can view employee onboarding of their company"
ON public.erp_hr_employee_onboarding FOR SELECT
TO authenticated
USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage employee onboarding of their company"
ON public.erp_hr_employee_onboarding FOR ALL
TO authenticated
USING (public.user_has_erp_company_access(company_id))
WITH CHECK (public.user_has_erp_company_access(company_id));

-- Políticas RLS para tasks (a través del onboarding)
CREATE POLICY "Users can view onboarding tasks"
ON public.erp_hr_onboarding_tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.erp_hr_employee_onboarding eo
    WHERE eo.id = onboarding_id
    AND public.user_has_erp_company_access(eo.company_id)
  )
);

CREATE POLICY "Users can manage onboarding tasks"
ON public.erp_hr_onboarding_tasks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.erp_hr_employee_onboarding eo
    WHERE eo.id = onboarding_id
    AND public.user_has_erp_company_access(eo.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.erp_hr_employee_onboarding eo
    WHERE eo.id = onboarding_id
    AND public.user_has_erp_company_access(eo.company_id)
  )
);

-- Triggers de actualización
CREATE TRIGGER update_erp_hr_onboarding_templates_updated_at
BEFORE UPDATE ON public.erp_hr_onboarding_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_hr_employee_onboarding_updated_at
BEFORE UPDATE ON public.erp_hr_employee_onboarding
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_hr_onboarding_tasks_updated_at
BEFORE UPDATE ON public.erp_hr_onboarding_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para calcular progreso automáticamente
CREATE OR REPLACE FUNCTION public.calculate_onboarding_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  new_progress INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks, completed_tasks
  FROM public.erp_hr_onboarding_tasks
  WHERE onboarding_id = NEW.onboarding_id;

  IF total_tasks > 0 THEN
    new_progress := (completed_tasks * 100) / total_tasks;
  ELSE
    new_progress := 0;
  END IF;

  UPDATE public.erp_hr_employee_onboarding
  SET progress_percentage = new_progress,
      status = CASE 
        WHEN new_progress = 100 THEN 'completed'
        WHEN new_progress > 0 THEN 'in_progress'
        ELSE status
      END,
      completed_at = CASE WHEN new_progress = 100 THEN now() ELSE completed_at END
  WHERE id = NEW.onboarding_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_calculate_onboarding_progress
AFTER INSERT OR UPDATE OF status ON public.erp_hr_onboarding_tasks
FOR EACH ROW EXECUTE FUNCTION public.calculate_onboarding_progress();