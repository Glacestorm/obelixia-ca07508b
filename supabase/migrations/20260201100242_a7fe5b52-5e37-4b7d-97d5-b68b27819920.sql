-- =====================================================
-- EXPANSIÓN MÓDULO RRHH - INFRAESTRUCTURA COMPLETA
-- Versión corregida: incluye tabla de departamentos
-- =====================================================

-- 0. DEPARTAMENTOS HR (debe crearse primero)
CREATE TABLE IF NOT EXISTS erp_hr_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES erp_hr_departments(id),
  manager_id UUID, -- Se actualizará después con FK a employees
  location TEXT,
  budget NUMERIC(14,2) DEFAULT 0,
  cost_center TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- 1. EMPLEADOS (Ficha maestra completa)
CREATE TABLE IF NOT EXISTS erp_hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  employee_code TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  national_id TEXT,
  ss_number TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('M', 'F', 'other')),
  email TEXT,
  phone TEXT,
  address JSONB DEFAULT '{}',
  bank_account TEXT,
  hire_date DATE NOT NULL,
  termination_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  department_id UUID REFERENCES erp_hr_departments(id),
  position_id UUID,
  category TEXT,
  job_title TEXT,
  base_salary NUMERIC(12,2) DEFAULT 0,
  contract_type TEXT,
  work_schedule TEXT DEFAULT 'full_time',
  weekly_hours NUMERIC(5,2) DEFAULT 40,
  reports_to UUID REFERENCES erp_hr_employees(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ahora añadir FK de manager_id en departments a employees
ALTER TABLE erp_hr_departments 
ADD CONSTRAINT fk_department_manager 
FOREIGN KEY (manager_id) REFERENCES erp_hr_employees(id) ON DELETE SET NULL;

-- 2. DOCUMENTOS DE EMPLEADO
CREATE TABLE IF NOT EXISTS erp_hr_employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES erp_hr_employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  expiry_date DATE,
  uploaded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  is_confidential BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CONCEPTOS SALARIALES
CREATE TABLE IF NOT EXISTS erp_hr_payroll_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  concept_type TEXT NOT NULL CHECK (concept_type IN ('devengo', 'deduccion')),
  category TEXT CHECK (category IN ('fijo', 'variable', 'en_especie', 'indemnizacion')),
  subcategory TEXT,
  default_amount NUMERIC(12,2),
  is_percentage BOOLEAN DEFAULT false,
  percentage_value NUMERIC(6,4),
  percentage_base TEXT,
  cotiza_ss BOOLEAN DEFAULT true,
  tributa_irpf BOOLEAN DEFAULT true,
  is_prorrateado BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  legal_reference TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- 4. NÓMINAS GENERADAS
CREATE TABLE IF NOT EXISTS erp_hr_payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES erp_hr_employees(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  payroll_type TEXT DEFAULT 'mensual' CHECK (payroll_type IN ('mensual', 'extra', 'liquidacion', 'atraso')),
  base_salary NUMERIC(12,2) DEFAULT 0,
  complements JSONB DEFAULT '[]',
  gross_salary NUMERIC(12,2) DEFAULT 0,
  ss_worker NUMERIC(12,2) DEFAULT 0,
  irpf_amount NUMERIC(12,2) DEFAULT 0,
  irpf_percentage NUMERIC(5,2) DEFAULT 0,
  other_deductions JSONB DEFAULT '[]',
  total_deductions NUMERIC(12,2) DEFAULT 0,
  net_salary NUMERIC(12,2) DEFAULT 0,
  ss_company NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'approved', 'paid', 'cancelled')),
  calculated_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id, period_month, period_year, payroll_type)
);

-- 5. COTIZACIONES SEGURIDAD SOCIAL
CREATE TABLE IF NOT EXISTS erp_hr_ss_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  total_workers INTEGER DEFAULT 0,
  total_base_cc NUMERIC(14,2) DEFAULT 0,
  total_base_at NUMERIC(14,2) DEFAULT 0,
  cc_company NUMERIC(12,2) DEFAULT 0,
  at_ep_company NUMERIC(12,2) DEFAULT 0,
  unemployment_company NUMERIC(12,2) DEFAULT 0,
  fogasa NUMERIC(12,2) DEFAULT 0,
  fp_company NUMERIC(12,2) DEFAULT 0,
  total_company NUMERIC(14,2) DEFAULT 0,
  cc_worker NUMERIC(12,2) DEFAULT 0,
  unemployment_worker NUMERIC(12,2) DEFAULT 0,
  fp_worker NUMERIC(12,2) DEFAULT 0,
  total_worker NUMERIC(14,2) DEFAULT 0,
  total_amount NUMERIC(14,2) DEFAULT 0,
  status TEXT DEFAULT 'calculated' CHECK (status IN ('calculated', 'pending', 'filed', 'paid', 'error')),
  filing_reference TEXT,
  filing_type TEXT,
  filed_at TIMESTAMPTZ,
  filed_by UUID REFERENCES auth.users(id),
  payment_date DATE,
  payment_reference TEXT,
  error_message TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, period_month, period_year)
);

-- 6. AFILIACIÓN SINDICAL
CREATE TABLE IF NOT EXISTS erp_hr_union_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES erp_hr_employees(id) ON DELETE CASCADE,
  union_name TEXT NOT NULL,
  union_code TEXT,
  union_section TEXT,
  membership_number TEXT,
  membership_date DATE NOT NULL,
  end_date DATE,
  monthly_fee NUMERIC(8,2) DEFAULT 0,
  payroll_deduction BOOLEAN DEFAULT true,
  is_representative BOOLEAN DEFAULT false,
  representative_type TEXT CHECK (representative_type IN ('delegado_personal', 'comite_empresa', 'delegado_sindical', 'seccion_sindical')),
  representative_start DATE,
  representative_end DATE,
  credit_hours_monthly INTEGER DEFAULT 0,
  credit_hours_used INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. POSICIONES/PUESTOS EN ORGANIGRAMA
CREATE TABLE IF NOT EXISTS erp_hr_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES erp_hr_departments(id),
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  level INTEGER DEFAULT 1,
  parent_position_id UUID REFERENCES erp_hr_positions(id),
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  default_category TEXT,
  required_complements JSONB DEFAULT '[]',
  is_management BOOLEAN DEFAULT false,
  headcount INTEGER DEFAULT 1,
  current_occupancy INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir FK de position_id en employees
ALTER TABLE erp_hr_employees 
ADD CONSTRAINT fk_employee_position 
FOREIGN KEY (position_id) REFERENCES erp_hr_positions(id) ON DELETE SET NULL;

-- 8. ÍNDICE DE AYUDA HR
CREATE TABLE IF NOT EXISTS erp_hr_help_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_code TEXT NOT NULL UNIQUE,
  section_name TEXT NOT NULL,
  parent_section TEXT,
  description TEXT,
  content TEXT,
  keywords TEXT[],
  related_sections TEXT[],
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_hr_departments_company ON erp_hr_departments(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_departments_parent ON erp_hr_departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_company ON erp_hr_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_status ON erp_hr_employees(status);
CREATE INDEX IF NOT EXISTS idx_hr_employees_department ON erp_hr_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_employee_docs_employee ON erp_hr_employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_concepts_company ON erp_hr_payroll_concepts(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_payrolls_employee ON erp_hr_payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_payrolls_period ON erp_hr_payrolls(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_hr_ss_period ON erp_hr_ss_contributions(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_hr_unions_employee ON erp_hr_union_memberships(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_positions_department ON erp_hr_positions(department_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE erp_hr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_payroll_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_ss_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_union_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_help_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_departments_access" ON erp_hr_departments FOR ALL USING (user_has_erp_company_access(company_id));
CREATE POLICY "hr_employees_access" ON erp_hr_employees FOR ALL USING (user_has_erp_company_access(company_id));
CREATE POLICY "hr_employee_docs_access" ON erp_hr_employee_documents FOR ALL USING (user_has_erp_company_access(company_id));
CREATE POLICY "hr_payroll_concepts_access" ON erp_hr_payroll_concepts FOR ALL USING (user_has_erp_company_access(company_id));
CREATE POLICY "hr_payrolls_access" ON erp_hr_payrolls FOR ALL USING (user_has_erp_company_access(company_id));
CREATE POLICY "hr_ss_contributions_access" ON erp_hr_ss_contributions FOR ALL USING (user_has_erp_company_access(company_id));
CREATE POLICY "hr_unions_access" ON erp_hr_union_memberships FOR ALL USING (user_has_erp_company_access(company_id));
CREATE POLICY "hr_positions_access" ON erp_hr_positions FOR ALL USING (user_has_erp_company_access(company_id));
CREATE POLICY "hr_help_index_read" ON erp_hr_help_index FOR SELECT USING (true);

-- =====================================================
-- STORAGE BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hr-employee-documents',
  'hr-employee-documents',
  false,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "hr_docs_select" ON storage.objects FOR SELECT 
USING (bucket_id = 'hr-employee-documents' AND auth.role() = 'authenticated');

CREATE POLICY "hr_docs_insert" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'hr-employee-documents' AND auth.role() = 'authenticated');

CREATE POLICY "hr_docs_update" ON storage.objects FOR UPDATE 
USING (bucket_id = 'hr-employee-documents' AND auth.role() = 'authenticated');

CREATE POLICY "hr_docs_delete" ON storage.objects FOR DELETE 
USING (bucket_id = 'hr-employee-documents' AND auth.role() = 'authenticated');

-- =====================================================
-- DATOS INICIALES - ÍNDICE DE AYUDA
-- =====================================================
INSERT INTO erp_hr_help_index (section_code, section_name, parent_section, description, keywords, sort_order) VALUES
('dashboard', 'Dashboard', NULL, 'Panel principal con KPIs, alertas y resumen de RRHH', ARRAY['inicio', 'resumen', 'kpi'], 1),
('empleados', 'Gestión de Empleados', NULL, 'Fichas completas de empleados, altas, bajas y modificaciones', ARRAY['empleado', 'ficha', 'alta', 'baja'], 2),
('nominas', 'Nóminas', NULL, 'Generación y gestión de nóminas mensuales', ARRAY['nomina', 'salario', 'pago'], 3),
('nominas.conceptos', 'Conceptos Salariales', 'nominas', 'Configuración de devengos y deducciones', ARRAY['concepto', 'devengo', 'deducción'], 31),
('nominas.calculo', 'Cálculo de Nóminas', 'nominas', 'Proceso de cálculo automático de nóminas', ARRAY['calcular', 'generar'], 32),
('nominas.historico', 'Histórico de Nóminas', 'nominas', 'Consulta de nóminas anteriores', ARRAY['histórico', 'anterior'], 33),
('nominas.remesas', 'Remesas Bancarias', 'nominas', 'Exportación para pago por transferencia', ARRAY['banco', 'sepa', 'remesa'], 34),
('seguridad_social', 'Seguridad Social', NULL, 'Cotizaciones, presentaciones y trámites con la TGSS', ARRAY['ss', 'cotización', 'tgss'], 4),
('seguridad_social.cotizaciones', 'Cotizaciones', 'seguridad_social', 'Cálculo de bases y tipos', ARRAY['base', 'contingencias'], 41),
('seguridad_social.red', 'Sistema RED', 'seguridad_social', 'Presentaciones electrónicas vía Sistema RED', ARRAY['red', 'siltra'], 42),
('seguridad_social.certificados', 'Certificados', 'seguridad_social', 'Solicitud de vida laboral', ARRAY['certificado', 'vida laboral'], 43),
('vacaciones', 'Vacaciones y Permisos', NULL, 'Gestión de vacaciones, permisos y ausencias', ARRAY['vacaciones', 'permiso'], 5),
('contratos', 'Contratos', NULL, 'Gestión de contratos laborales', ARRAY['contrato', 'tipo'], 6),
('contratos.tipos', 'Tipos de Contrato', 'contratos', 'Indefinido, temporal, formación...', ARRAY['indefinido', 'temporal'], 61),
('contratos.finiquito', 'Finiquitos', 'contratos', 'Cálculo de finiquitos y liquidaciones', ARRAY['finiquito', 'liquidación'], 62),
('contratos.indemnizacion', 'Indemnizaciones', 'contratos', 'Cálculo de indemnizaciones por despido', ARRAY['indemnización', 'despido'], 63),
('sindicatos', 'Sindicatos', NULL, 'Afiliación sindical y representación laboral', ARRAY['sindicato', 'afiliación'], 7),
('sindicatos.afiliacion', 'Afiliación', 'sindicatos', 'Gestión de afiliaciones sindicales', ARRAY['cuota', 'retención'], 71),
('sindicatos.representantes', 'Representantes', 'sindicatos', 'Delegados y comité de empresa', ARRAY['delegado', 'comité'], 72),
('sindicatos.horas', 'Crédito Horario', 'sindicatos', 'Gestión de horas sindicales (art. 68 ET)', ARRAY['horas', 'crédito'], 73),
('documentos', 'Documentación', NULL, 'Gestión documental por empleado', ARRAY['documento', 'archivo'], 8),
('organizacion', 'Organigrama', NULL, 'Estructura organizativa de la empresa', ARRAY['organigrama', 'departamento'], 9),
('organizacion.departamentos', 'Departamentos', 'organizacion', 'Gestión de departamentos', ARRAY['departamento', 'área'], 91),
('organizacion.puestos', 'Puestos', 'organizacion', 'Definición de puestos y categorías', ARRAY['puesto', 'categoría'], 92),
('prl', 'Seguridad y Salud (PRL)', NULL, 'Prevención de riesgos laborales', ARRAY['prl', 'seguridad', 'salud'], 10),
('agente_ia', 'Agente IA', NULL, 'Asistente inteligente de RRHH', ARRAY['ia', 'agente', 'asistente'], 11),
('normativa', 'Normativa Laboral', NULL, 'Legislación y convenios aplicables', ARRAY['ley', 'convenio'], 12)
ON CONFLICT (section_code) DO NOTHING;