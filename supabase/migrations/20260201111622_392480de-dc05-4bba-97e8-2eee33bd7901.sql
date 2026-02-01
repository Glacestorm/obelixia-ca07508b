-- =============================================
-- FASE 1: INFRAESTRUCTURA HR AVANZADA
-- =============================================

-- ENUM para niveles de acceso a módulos
DO $$ BEGIN
  CREATE TYPE public.erp_module_access_level AS ENUM ('none', 'read', 'write', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ENUM para tipos de alerta HR
DO $$ BEGIN
  CREATE TYPE public.hr_alert_type AS ENUM (
    'contract_expiry',
    'accident',
    'death_employee',
    'death_family',
    'medical_leave',
    'vacation_request',
    'vacation_approved',
    'document_expiry',
    'probation_end',
    'anniversary',
    'birthday',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ENUM para canales de notificación
DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM ('email', 'whatsapp', 'push', 'sms', 'in_app');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ENUM para estado de workflow de vacaciones
DO $$ BEGIN
  CREATE TYPE public.leave_workflow_status AS ENUM ('draft', 'pending_dept', 'pending_hr', 'approved', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABLA: Acceso de empleados a módulos ERP
-- =============================================
CREATE TABLE IF NOT EXISTS public.erp_hr_employee_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL, -- 'maestros', 'ventas', 'compras', 'almacen', 'tesoreria', 'fiscal', 'hr', 'trade', 'logistics', 'banking'
  access_level public.erp_module_access_level NOT NULL DEFAULT 'none',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, module_code)
);

-- =============================================
-- TABLA: Alertas HR
-- =============================================
CREATE TABLE IF NOT EXISTS public.erp_hr_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  alert_type public.hr_alert_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  trigger_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  notified_via JSONB DEFAULT '[]', -- Array of channels used
  ai_notified BOOLEAN DEFAULT false,
  ai_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLA: Preferencias de alertas por responsable
-- =============================================
CREATE TABLE IF NOT EXISTS public.erp_hr_alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type public.hr_alert_type NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  channels public.notification_channel[] DEFAULT ARRAY['in_app']::public.notification_channel[],
  advance_days INTEGER DEFAULT 7, -- Days before to alert
  email_address TEXT,
  whatsapp_number TEXT,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id, alert_type)
);

-- =============================================
-- TABLA: Relaciones familiares de empleados
-- =============================================
CREATE TABLE IF NOT EXISTS public.erp_hr_family_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild',
    'parent_in_law', 'sibling_in_law', 'child_in_law', 'other'
  )),
  blood_degree INTEGER, -- Grado de consanguinidad (1, 2, 3, 4)
  affinity_degree INTEGER, -- Grado de afinidad
  first_name TEXT NOT NULL,
  last_name TEXT,
  birth_date DATE,
  death_date DATE,
  is_dependent BOOLEAN DEFAULT false,
  disability_percentage NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLA: Responsables de departamento
-- =============================================
CREATE TABLE IF NOT EXISTS public.erp_hr_department_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.erp_hr_departments(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  is_primary BOOLEAN DEFAULT true,
  can_approve_vacations BOOLEAN DEFAULT true,
  can_approve_expenses BOOLEAN DEFAULT false,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MODIFICAR: leave_requests para workflow 2 niveles
-- =============================================
ALTER TABLE public.erp_hr_leave_requests 
  ADD COLUMN IF NOT EXISTS workflow_status public.leave_workflow_status DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS dept_approver_id UUID REFERENCES public.erp_hr_employees(id),
  ADD COLUMN IF NOT EXISTS dept_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dept_comments TEXT,
  ADD COLUMN IF NOT EXISTS hr_approver_id UUID REFERENCES public.erp_hr_employees(id),
  ADD COLUMN IF NOT EXISTS hr_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hr_comments TEXT,
  ADD COLUMN IF NOT EXISTS ai_notified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_notified_at TIMESTAMPTZ;

-- =============================================
-- MODIFICAR: employees para búsqueda avanzada
-- =============================================
ALTER TABLE public.erp_hr_employees
  ADD COLUMN IF NOT EXISTS employee_number TEXT,
  ADD COLUMN IF NOT EXISTS social_security_number TEXT,
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Crear índice para búsqueda full-text
CREATE INDEX IF NOT EXISTS idx_employees_search ON public.erp_hr_employees USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_employees_ss_number ON public.erp_hr_employees(social_security_number);
CREATE INDEX IF NOT EXISTS idx_employees_emp_number ON public.erp_hr_employees(employee_number);

-- Función para actualizar search_vector
CREATE OR REPLACE FUNCTION update_employee_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('spanish', COALESCE(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.employee_number, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.social_security_number, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.email, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para search_vector
DROP TRIGGER IF EXISTS trigger_update_employee_search ON public.erp_hr_employees;
CREATE TRIGGER trigger_update_employee_search
  BEFORE INSERT OR UPDATE ON public.erp_hr_employees
  FOR EACH ROW EXECUTE FUNCTION update_employee_search_vector();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Employee Module Access
ALTER TABLE public.erp_hr_employee_module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_hr_employee_module_access_select" ON public.erp_hr_employee_module_access
  FOR SELECT USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_employee_module_access_insert" ON public.erp_hr_employee_module_access
  FOR INSERT WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_employee_module_access_update" ON public.erp_hr_employee_module_access
  FOR UPDATE USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_employee_module_access_delete" ON public.erp_hr_employee_module_access
  FOR DELETE USING (public.user_has_erp_company_access(company_id));

-- HR Alerts
ALTER TABLE public.erp_hr_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_hr_alerts_select" ON public.erp_hr_alerts
  FOR SELECT USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_alerts_insert" ON public.erp_hr_alerts
  FOR INSERT WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_alerts_update" ON public.erp_hr_alerts
  FOR UPDATE USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_alerts_delete" ON public.erp_hr_alerts
  FOR DELETE USING (public.user_has_erp_company_access(company_id));

-- Alert Preferences
ALTER TABLE public.erp_hr_alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_hr_alert_preferences_select" ON public.erp_hr_alert_preferences
  FOR SELECT USING (auth.uid() = user_id OR public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_alert_preferences_insert" ON public.erp_hr_alert_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "erp_hr_alert_preferences_update" ON public.erp_hr_alert_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "erp_hr_alert_preferences_delete" ON public.erp_hr_alert_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Family Relations
ALTER TABLE public.erp_hr_family_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_hr_family_relations_select" ON public.erp_hr_family_relations
  FOR SELECT USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_family_relations_insert" ON public.erp_hr_family_relations
  FOR INSERT WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_family_relations_update" ON public.erp_hr_family_relations
  FOR UPDATE USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_family_relations_delete" ON public.erp_hr_family_relations
  FOR DELETE USING (public.user_has_erp_company_access(company_id));

-- Department Managers
ALTER TABLE public.erp_hr_department_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_hr_department_managers_select" ON public.erp_hr_department_managers
  FOR SELECT USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_department_managers_insert" ON public.erp_hr_department_managers
  FOR INSERT WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_department_managers_update" ON public.erp_hr_department_managers
  FOR UPDATE USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "erp_hr_department_managers_delete" ON public.erp_hr_department_managers
  FOR DELETE USING (public.user_has_erp_company_access(company_id));

-- =============================================
-- FUNCIÓN: Generar alertas automáticas
-- =============================================
CREATE OR REPLACE FUNCTION generate_hr_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp RECORD;
  contract_alert_days INTEGER := 30;
BEGIN
  -- Alertas de vencimiento de contratos
  FOR emp IN 
    SELECT e.*, c.id as company_id
    FROM erp_hr_employees e
    JOIN companies c ON e.company_id = c.id
    WHERE e.contract_end_date IS NOT NULL
      AND e.contract_end_date <= CURRENT_DATE + INTERVAL '30 days'
      AND e.contract_end_date >= CURRENT_DATE
      AND e.status = 'active'
  LOOP
    INSERT INTO erp_hr_alerts (
      company_id, employee_id, alert_type, title, description,
      severity, trigger_date, due_date
    )
    SELECT 
      emp.company_id,
      emp.id,
      'contract_expiry',
      'Vencimiento de contrato: ' || emp.first_name || ' ' || emp.last_name,
      'El contrato vence el ' || emp.contract_end_date::TEXT,
      CASE 
        WHEN emp.contract_end_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
        WHEN emp.contract_end_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'high'
        ELSE 'medium'
      END,
      now(),
      emp.contract_end_date
    WHERE NOT EXISTS (
      SELECT 1 FROM erp_hr_alerts 
      WHERE employee_id = emp.id 
        AND alert_type = 'contract_expiry'
        AND due_date = emp.contract_end_date
        AND is_resolved = false
    );
  END LOOP;
END;
$$;

-- =============================================
-- DATOS INICIALES: Módulos ERP disponibles
-- =============================================
CREATE TABLE IF NOT EXISTS public.erp_available_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code TEXT UNIQUE NOT NULL,
  module_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.erp_available_modules (module_code, module_name, description, icon, display_order) VALUES
  ('maestros', 'Maestros', 'Gestión de datos maestros', 'Database', 1),
  ('ventas', 'Ventas', 'Gestión comercial y ventas', 'ShoppingCart', 2),
  ('compras', 'Compras', 'Gestión de compras y proveedores', 'Package', 3),
  ('almacen', 'Almacén', 'Control de inventario', 'Warehouse', 4),
  ('tesoreria', 'Tesorería', 'Gestión de tesorería', 'Wallet', 5),
  ('fiscal', 'Fiscal', 'Contabilidad y fiscal', 'Calculator', 6),
  ('hr', 'RRHH', 'Recursos Humanos', 'Users', 7),
  ('trade', 'Comercio Exterior', 'Importación y exportación', 'Globe', 8),
  ('logistics', 'Logística', 'Gestión logística', 'Truck', 9),
  ('banking', 'Banca', 'Gestión bancaria', 'Building', 10),
  ('advisor', 'Asesor IA', 'Asistente inteligente', 'Brain', 11)
ON CONFLICT (module_code) DO NOTHING;

ALTER TABLE public.erp_available_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_available_modules_select" ON public.erp_available_modules
  FOR SELECT USING (true);