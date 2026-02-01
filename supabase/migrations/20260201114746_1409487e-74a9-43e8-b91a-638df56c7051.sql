-- ============================================
-- HR Module Advanced Features - Phase 2, 3, 4
-- Control de acceso IA + Innovación 2026+
-- ============================================

-- 1. CONTROL DE ACCESO PARA AGENTE IA (Fase 2)
CREATE TABLE IF NOT EXISTS public.erp_hr_agent_access_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  can_view_all_employees BOOLEAN DEFAULT false,
  can_view_salaries BOOLEAN DEFAULT false,
  can_view_sensitive_data BOOLEAN DEFAULT false,
  hierarchy_level INTEGER DEFAULT 4,
  department_ids UUID[] DEFAULT '{}',
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- 2. SISTEMA DE INNOVACIÓN 2026+
CREATE TABLE IF NOT EXISTS public.erp_hr_innovation_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  implementation_status TEXT DEFAULT 'available',
  is_implemented BOOLEAN DEFAULT false,
  implemented_at TIMESTAMPTZ,
  implemented_by UUID,
  implementation_config JSONB DEFAULT '{}',
  readiness_score INTEGER DEFAULT 0,
  estimated_impact TEXT,
  requirements JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, feature_code)
);

CREATE TABLE IF NOT EXISTS public.erp_hr_innovation_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT DEFAULT 'ai_discovery',
  source_url TEXT,
  category TEXT DEFAULT 'general',
  relevance_score INTEGER DEFAULT 50,
  potential_impact TEXT,
  implementation_complexity TEXT DEFAULT 'medium',
  is_reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  is_rejected BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.erp_hr_innovation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES public.erp_hr_innovation_features(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  status_message TEXT,
  error_message TEXT,
  performed_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CONTRATOS
CREATE TABLE IF NOT EXISTS public.erp_hr_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL,
  contract_code TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  probation_end_date DATE,
  base_salary NUMERIC(10,2),
  annual_salary NUMERIC(12,2),
  working_hours NUMERIC(4,2) DEFAULT 40.00,
  workday_type TEXT DEFAULT 'completa',
  category TEXT,
  professional_group TEXT,
  collective_agreement_id UUID,
  bonuses JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  termination_date DATE,
  termination_type TEXT,
  termination_reason TEXT,
  document_url TEXT,
  signed_at TIMESTAMPTZ,
  signed_by_employee BOOLEAN DEFAULT false,
  signed_by_company BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INCIDENTES PRL
CREATE TABLE IF NOT EXISTS public.erp_hr_safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.erp_hr_employees(id),
  incident_date DATE NOT NULL,
  incident_time TIME,
  incident_type TEXT NOT NULL,
  severity TEXT DEFAULT 'low',
  location TEXT,
  area TEXT,
  description TEXT NOT NULL,
  immediate_actions TEXT,
  witnesses TEXT[],
  reported_by UUID,
  reported_at TIMESTAMPTZ DEFAULT now(),
  investigation_status TEXT DEFAULT 'pending',
  investigation_notes TEXT,
  investigation_closed_at TIMESTAMPTZ,
  investigation_closed_by UUID,
  days_lost INTEGER DEFAULT 0,
  is_reportable BOOLEAN DEFAULT false,
  authority_notified BOOLEAN DEFAULT false,
  authority_notification_date DATE,
  corrective_actions JSONB DEFAULT '[]',
  preventive_measures JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ENABLE RLS
ALTER TABLE public.erp_hr_agent_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_innovation_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_innovation_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_innovation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_safety_incidents ENABLE ROW LEVEL SECURITY;

-- 6. SECURITY DEFINER FUNCTION (fixed column name: access_level)
CREATE OR REPLACE FUNCTION public.check_hr_agent_access(
  p_user_id UUID,
  p_company_id UUID,
  p_access_type TEXT DEFAULT 'view_employees'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access RECORD;
BEGIN
  SELECT * INTO v_access
  FROM erp_hr_agent_access_control
  WHERE user_id = p_user_id 
    AND company_id = p_company_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1 FROM erp_hr_employee_module_access ema
      JOIN erp_hr_employees e ON e.id = ema.employee_id
      WHERE e.user_id = p_user_id 
        AND ema.module_code = 'hr' 
        AND ema.access_level::text IN ('admin', 'write')
    ) THEN
      RETURN jsonb_build_object(
        'allowed', true,
        'level', 'hr_staff',
        'can_view_all_employees', true,
        'can_view_salaries', true,
        'can_view_sensitive_data', false,
        'hierarchy_level', 3
      );
    END IF;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'level', 'none',
      'reason', 'No HR access'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_access.can_view_all_employees,
    'level', CASE v_access.hierarchy_level 
               WHEN 1 THEN 'executive'
               WHEN 2 THEN 'director'
               WHEN 3 THEN 'manager'
               ELSE 'employee'
             END,
    'can_view_all_employees', v_access.can_view_all_employees,
    'can_view_salaries', v_access.can_view_salaries,
    'can_view_sensitive_data', v_access.can_view_sensitive_data,
    'hierarchy_level', v_access.hierarchy_level,
    'department_ids', v_access.department_ids
  );
END;
$$;

-- 7. RLS POLICIES
CREATE POLICY "Users view own agent access" ON public.erp_hr_agent_access_control
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "HR admins manage agent access" ON public.erp_hr_agent_access_control
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM erp_hr_employee_module_access ema
      JOIN erp_hr_employees e ON e.id = ema.employee_id
      WHERE e.user_id = auth.uid() 
        AND ema.module_code = 'hr' 
        AND ema.access_level::text = 'admin'
    )
  );

CREATE POLICY "View innovation features" ON public.erp_hr_innovation_features
  FOR SELECT USING (user_has_erp_company_access(company_id));

CREATE POLICY "Manage innovation features" ON public.erp_hr_innovation_features
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "View innovation ideas" ON public.erp_hr_innovation_ideas
  FOR SELECT USING (user_has_erp_company_access(company_id));

CREATE POLICY "Manage innovation ideas" ON public.erp_hr_innovation_ideas
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "View innovation logs" ON public.erp_hr_innovation_logs
  FOR SELECT USING (user_has_erp_company_access(company_id));

CREATE POLICY "View contracts" ON public.erp_hr_contracts
  FOR SELECT USING (user_has_erp_company_access(company_id));

CREATE POLICY "Manage contracts" ON public.erp_hr_contracts
  FOR ALL USING (user_has_erp_company_access(company_id));

CREATE POLICY "View safety incidents" ON public.erp_hr_safety_incidents
  FOR SELECT USING (user_has_erp_company_access(company_id));

CREATE POLICY "Manage safety incidents" ON public.erp_hr_safety_incidents
  FOR ALL USING (user_has_erp_company_access(company_id));

-- 8. INDEXES
CREATE INDEX IF NOT EXISTS idx_hr_agent_access_user ON public.erp_hr_agent_access_control(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_innovation_features_company ON public.erp_hr_innovation_features(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_innovation_ideas_company ON public.erp_hr_innovation_ideas(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_employee ON public.erp_hr_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_safety_incidents_company ON public.erp_hr_safety_incidents(company_id);