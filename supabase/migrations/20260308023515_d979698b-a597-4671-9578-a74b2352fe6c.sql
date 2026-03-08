
-- ============================================================
-- FASE 1: RRHH Enterprise Suite - Fundamentos de Arquitectura
-- ============================================================

-- 1A. ESTRUCTURA ORGANIZATIVA MULTI-ENTIDAD

-- Entidades Legales
CREATE TABLE public.erp_hr_legal_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  legal_name text NOT NULL,
  tax_id text, -- CIF/NIF
  entity_type text DEFAULT 'SL', -- SA, SL, SLU, cooperativa, fundacion, autonomo
  jurisdiction text NOT NULL DEFAULT 'ES',
  registration_info jsonb DEFAULT '{}', -- registro mercantil, tomo, folio, etc.
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'ES',
  phone text,
  email text,
  ss_employer_code text, -- Código cuenta cotización patronal
  cnae_code text, -- Código CNAE principal
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Centros de Trabajo
CREATE TABLE public.erp_hr_work_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  legal_entity_id uuid REFERENCES public.erp_hr_legal_entities(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  province text,
  postal_code text,
  country text DEFAULT 'ES',
  jurisdiction text DEFAULT 'ES',
  cnae_code text,
  ss_account_code text, -- Código cuenta cotización del centro
  phone text,
  email text,
  max_capacity integer,
  is_headquarters boolean DEFAULT false,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unidades Organizativas (jerárquicas)
CREATE TABLE public.erp_hr_org_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  legal_entity_id uuid REFERENCES public.erp_hr_legal_entities(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.erp_hr_org_units(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  unit_type text DEFAULT 'department', -- division, area, department, section, team
  manager_employee_id uuid,
  cost_center text,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Calendarios Laborales
CREATE TABLE public.erp_hr_work_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  legal_entity_id uuid REFERENCES public.erp_hr_legal_entities(id) ON DELETE SET NULL,
  work_center_id uuid REFERENCES public.erp_hr_work_centers(id) ON DELETE SET NULL,
  name text NOT NULL,
  year integer NOT NULL,
  jurisdiction text DEFAULT 'ES',
  weekly_hours numeric(5,2) DEFAULT 40.00,
  daily_hours numeric(4,2) DEFAULT 8.00,
  work_days integer[] DEFAULT '{1,2,3,4,5}', -- lunes a viernes
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Entradas de Calendario (festivos, días especiales)
CREATE TABLE public.erp_hr_calendar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES public.erp_hr_work_calendars(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  entry_type text NOT NULL DEFAULT 'holiday', -- holiday, half_day, special, company_day
  name text NOT NULL,
  description text,
  is_national boolean DEFAULT false,
  is_regional boolean DEFAULT false,
  is_local boolean DEFAULT false,
  hours_reduction numeric(4,2), -- for half_day
  created_at timestamptz DEFAULT now()
);

-- 1B. RBAC + ABAC + PERMISOS POR CAMPO

-- Roles HR Enterprise
CREATE TABLE public.erp_hr_enterprise_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  priority integer DEFAULT 0, -- para resolución de conflictos
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Catálogo de Permisos HR
CREATE TABLE public.erp_hr_enterprise_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL, -- employees, payroll, contracts, vacations, etc.
  action text NOT NULL, -- read, create, update, delete, approve, export
  resource text, -- specific resource or null for module-level
  description text,
  is_sensitive boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, action, resource)
);

-- Permisos por Rol
CREATE TABLE public.erp_hr_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.erp_hr_enterprise_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.erp_hr_enterprise_permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Asignación Usuario-Rol con Scope
CREATE TABLE public.erp_hr_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.erp_hr_enterprise_roles(id) ON DELETE CASCADE,
  scope_type text DEFAULT 'global', -- global, legal_entity, work_center, department, org_unit
  scope_entity_id uuid, -- ID of the scoped entity
  valid_from timestamptz DEFAULT now(),
  valid_to timestamptz,
  is_active boolean DEFAULT true,
  assigned_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id, role_id, scope_type, scope_entity_id)
);

-- Permisos a Nivel de Campo
CREATE TABLE public.erp_hr_field_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.erp_hr_enterprise_roles(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  field_name text NOT NULL,
  access_level text DEFAULT 'read', -- hidden, read, write
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, table_name, field_name)
);

-- Reglas ABAC (condiciones dinámicas)
CREATE TABLE public.erp_hr_data_access_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.erp_hr_enterprise_roles(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  description text,
  conditions jsonb NOT NULL DEFAULT '{}', -- { jurisdiction: ['ES','AD'], salary_max: 50000, department_ids: [...] }
  applies_to_tables text[] DEFAULT '{}',
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1C. AUDIT TRAIL TOTAL

-- Log de auditoría inmutable
CREATE TABLE public.erp_hr_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.erp_companies(id) ON DELETE SET NULL,
  user_id uuid,
  action text NOT NULL, -- INSERT, UPDATE, DELETE, VIEW, EXPORT, APPROVE, REJECT
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  category text DEFAULT 'general', -- employees, payroll, contracts, vacations, compliance, security
  severity text DEFAULT 'info', -- info, warning, critical
  ip_address text,
  user_agent text,
  session_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índices para búsquedas rápidas en audit
CREATE INDEX idx_hr_audit_log_company ON public.erp_hr_audit_log(company_id);
CREATE INDEX idx_hr_audit_log_user ON public.erp_hr_audit_log(user_id);
CREATE INDEX idx_hr_audit_log_table ON public.erp_hr_audit_log(table_name);
CREATE INDEX idx_hr_audit_log_action ON public.erp_hr_audit_log(action);
CREATE INDEX idx_hr_audit_log_created ON public.erp_hr_audit_log(created_at DESC);
CREATE INDEX idx_hr_audit_log_category ON public.erp_hr_audit_log(category);
CREATE INDEX idx_hr_audit_log_severity ON public.erp_hr_audit_log(severity);

-- Eventos Críticos
CREATE TABLE public.erp_hr_critical_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.erp_companies(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- salary_change, termination, data_breach, bulk_operation, compliance_violation
  severity text DEFAULT 'high', -- medium, high, critical
  title text NOT NULL,
  description text,
  affected_entity_type text, -- employee, department, legal_entity
  affected_entity_id uuid,
  requires_action boolean DEFAULT false,
  action_taken text,
  resolved_at timestamptz,
  resolved_by uuid,
  audit_log_id uuid REFERENCES public.erp_hr_audit_log(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_hr_critical_events_company ON public.erp_hr_critical_events(company_id);
CREATE INDEX idx_hr_critical_events_type ON public.erp_hr_critical_events(event_type);
CREATE INDEX idx_hr_critical_events_severity ON public.erp_hr_critical_events(severity);

-- Añadir columnas enterprise a empleados
ALTER TABLE public.erp_hr_employees 
  ADD COLUMN IF NOT EXISTS legal_entity_id uuid REFERENCES public.erp_hr_legal_entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_center_id uuid REFERENCES public.erp_hr_work_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS org_unit_id uuid REFERENCES public.erp_hr_org_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_calendar_id uuid REFERENCES public.erp_hr_work_calendars(id) ON DELETE SET NULL;

-- Añadir entidad legal a departamentos
ALTER TABLE public.erp_hr_departments
  ADD COLUMN IF NOT EXISTS legal_entity_id uuid REFERENCES public.erp_hr_legal_entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_center_id uuid REFERENCES public.erp_hr_work_centers(id) ON DELETE SET NULL;

-- Añadir vinculación enterprise a convenios colectivos
ALTER TABLE public.erp_hr_collective_agreements
  ADD COLUMN IF NOT EXISTS legal_entity_id uuid REFERENCES public.erp_hr_legal_entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_center_id uuid REFERENCES public.erp_hr_work_centers(id) ON DELETE SET NULL;

-- SECURITY DEFINER: verificar permisos HR
CREATE OR REPLACE FUNCTION public.hr_check_permission(
  _user_id uuid,
  _company_id uuid,
  _module text,
  _action text,
  _resource text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM erp_hr_role_assignments ra
    JOIN erp_hr_role_permissions rp ON rp.role_id = ra.role_id
    JOIN erp_hr_enterprise_permissions ep ON ep.id = rp.permission_id
    WHERE ra.user_id = _user_id
      AND ra.company_id = _company_id
      AND ra.is_active = true
      AND (ra.valid_to IS NULL OR ra.valid_to > now())
      AND ep.module = _module
      AND ep.action = _action
      AND (ep.resource IS NULL OR ep.resource = _resource OR _resource IS NULL)
  )
$$;

-- SECURITY DEFINER: log de auditoría
CREATE OR REPLACE FUNCTION public.hr_log_audit(
  _company_id uuid,
  _user_id uuid,
  _action text,
  _table_name text,
  _record_id text,
  _old_data jsonb DEFAULT NULL,
  _new_data jsonb DEFAULT NULL,
  _category text DEFAULT 'general',
  _severity text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _audit_id uuid;
  _changed text[];
BEGIN
  -- Detect changed fields
  IF _old_data IS NOT NULL AND _new_data IS NOT NULL THEN
    SELECT array_agg(key) INTO _changed
    FROM (
      SELECT key FROM jsonb_each(_new_data)
      EXCEPT
      SELECT key FROM jsonb_each(_old_data) WHERE jsonb_each.value = _new_data->jsonb_each.key
    ) changed_keys;
  END IF;

  INSERT INTO erp_hr_audit_log (company_id, user_id, action, table_name, record_id, old_data, new_data, changed_fields, category, severity)
  VALUES (_company_id, _user_id, _action, _table_name, _record_id, _old_data, _new_data, _changed, _category, _severity)
  RETURNING id INTO _audit_id;

  -- Auto-create critical event for sensitive actions
  IF _severity IN ('warning', 'critical') OR _action IN ('DELETE', 'APPROVE', 'REJECT') THEN
    INSERT INTO erp_hr_critical_events (company_id, event_type, severity, title, description, audit_log_id)
    VALUES (_company_id, _action, _severity, 
            _action || ' on ' || _table_name, 
            'Record ' || COALESCE(_record_id, 'unknown'),
            _audit_id);
  END IF;

  RETURN _audit_id;
END;
$$;

-- RLS POLICIES

ALTER TABLE public.erp_hr_legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_work_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_enterprise_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_enterprise_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_data_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_critical_events ENABLE ROW LEVEL SECURITY;

-- Policies basadas en company access
CREATE POLICY "Users can manage legal entities of their companies" ON public.erp_hr_legal_entities FOR ALL TO authenticated USING (public.user_has_erp_company_access(company_id));
CREATE POLICY "Users can manage work centers of their companies" ON public.erp_hr_work_centers FOR ALL TO authenticated USING (public.user_has_erp_company_access(company_id));
CREATE POLICY "Users can manage org units of their companies" ON public.erp_hr_org_units FOR ALL TO authenticated USING (public.user_has_erp_company_access(company_id));
CREATE POLICY "Users can manage work calendars of their companies" ON public.erp_hr_work_calendars FOR ALL TO authenticated USING (public.user_has_erp_company_access(company_id));
CREATE POLICY "Users can view calendar entries" ON public.erp_hr_calendar_entries FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.erp_hr_work_calendars c WHERE c.id = calendar_id AND public.user_has_erp_company_access(c.company_id)));
CREATE POLICY "Users can manage enterprise roles of their companies" ON public.erp_hr_enterprise_roles FOR ALL TO authenticated USING (public.user_has_erp_company_access(company_id));
CREATE POLICY "Authenticated users can read permissions" ON public.erp_hr_enterprise_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage role permissions" ON public.erp_hr_role_permissions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.erp_hr_enterprise_roles r WHERE r.id = role_id AND public.user_has_erp_company_access(r.company_id)));
CREATE POLICY "Users can manage role assignments of their companies" ON public.erp_hr_role_assignments FOR ALL TO authenticated USING (public.user_has_erp_company_access(company_id));
CREATE POLICY "Users can manage field permissions" ON public.erp_hr_field_permissions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.erp_hr_enterprise_roles r WHERE r.id = role_id AND public.user_has_erp_company_access(r.company_id)));
CREATE POLICY "Users can manage data access rules of their companies" ON public.erp_hr_data_access_rules FOR ALL TO authenticated USING (public.user_has_erp_company_access(company_id));
CREATE POLICY "Users can view audit logs of their companies" ON public.erp_hr_audit_log FOR SELECT TO authenticated USING (public.user_has_erp_company_access(company_id));
CREATE POLICY "System can insert audit logs" ON public.erp_hr_audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can manage critical events of their companies" ON public.erp_hr_critical_events FOR ALL TO authenticated USING (public.user_has_erp_company_access(company_id));
