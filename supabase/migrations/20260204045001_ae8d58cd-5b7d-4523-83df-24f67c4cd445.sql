
-- =====================================================
-- FASE 1: COMPLIANCE LEGAL CRÍTICO
-- Canal de Denuncias, Igualdad, Registro Horario
-- =====================================================

-- ===========================================
-- 1.1 CANAL DE DENUNCIAS (EU Whistleblower)
-- Directiva (EU) 2019/1937
-- ===========================================

-- Tipos enumerados para whistleblower
CREATE TYPE public.whistleblower_report_status AS ENUM (
  'received',           -- Recibida
  'acknowledged',       -- Acuse enviado (7 días máx)
  'investigating',      -- En investigación
  'resolved',           -- Resuelta (3 meses máx)
  'archived',           -- Archivada
  'escalated'           -- Escalada a autoridades
);

CREATE TYPE public.whistleblower_category AS ENUM (
  'fraud',              -- Fraude
  'corruption',         -- Corrupción
  'harassment',         -- Acoso
  'discrimination',     -- Discriminación
  'safety_violation',   -- Violación de seguridad
  'environmental',      -- Medioambiental
  'data_protection',    -- Protección de datos
  'financial_crime',    -- Delito financiero
  'labor_violation',    -- Violación laboral
  'other'               -- Otros
);

-- Tabla principal de denuncias
CREATE TABLE public.erp_hr_whistleblower_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  
  -- Datos de la denuncia (cifrados/anonimizados)
  report_code VARCHAR(20) NOT NULL UNIQUE, -- Código único para seguimiento anónimo
  category whistleblower_category NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[], -- URLs a documentos adjuntos
  
  -- Estado y plazos legales
  status whistleblower_report_status DEFAULT 'received',
  received_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ, -- Máx 7 días desde received_at
  resolution_deadline TIMESTAMPTZ, -- 3 meses desde received_at
  resolved_at TIMESTAMPTZ,
  
  -- Anonimato
  is_anonymous BOOLEAN DEFAULT true,
  reporter_contact_encrypted TEXT, -- Contacto cifrado (si lo proporciona)
  
  -- Personas involucradas (cifrado)
  accused_info_encrypted TEXT,
  witnesses_encrypted TEXT,
  
  -- Metadatos
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  jurisdiction VARCHAR(5) DEFAULT 'ES',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de investigaciones
CREATE TABLE public.erp_hr_whistleblower_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.erp_hr_whistleblower_reports(id) ON DELETE CASCADE,
  
  -- Investigador asignado
  investigator_id UUID, -- No FK a auth.users para proteger identidad
  investigator_role VARCHAR(100),
  
  -- Progreso
  phase VARCHAR(50) DEFAULT 'initial' CHECK (phase IN ('initial', 'evidence_gathering', 'interviews', 'analysis', 'conclusions', 'actions')),
  findings TEXT,
  recommendations TEXT,
  
  -- Acciones tomadas
  corrective_actions JSONB DEFAULT '[]',
  disciplinary_actions JSONB DEFAULT '[]',
  
  -- Protección del denunciante
  retaliation_check_date TIMESTAMPTZ,
  retaliation_detected BOOLEAN DEFAULT false,
  protection_measures JSONB DEFAULT '[]',
  
  -- Fechas
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Notas internas (confidenciales)
  internal_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- 1.2 IGUALDAD Y NO DISCRIMINACIÓN
-- LO 3/2007, RD 901/2020, Ley 15/2022
-- ===========================================

-- Tipo para estado del plan de igualdad
CREATE TYPE public.equality_plan_status AS ENUM (
  'draft',              -- Borrador
  'diagnosis',          -- En diagnóstico
  'negotiation',        -- En negociación con RLT
  'approved',           -- Aprobado
  'registered',         -- Registrado en REGCON
  'active',             -- Vigente
  'expired',            -- Expirado
  'under_review'        -- En revisión
);

-- Planes de Igualdad (obligatorio +50 empleados)
CREATE TABLE public.erp_hr_equality_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  
  -- Identificación
  plan_code VARCHAR(50),
  plan_name VARCHAR(255) NOT NULL,
  version INTEGER DEFAULT 1,
  
  -- Vigencia (máx 4 años según RD 901/2020)
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  registration_number VARCHAR(100), -- Número REGCON
  registration_date DATE,
  
  -- Estado
  status equality_plan_status DEFAULT 'draft',
  
  -- Diagnóstico de situación
  diagnosis_data JSONB DEFAULT '{
    "workforce_distribution": {},
    "hiring_selection": {},
    "professional_classification": {},
    "training": {},
    "promotion": {},
    "work_conditions": {},
    "remuneration": {},
    "work_life_balance": {},
    "underrepresentation": {},
    "harassment_prevention": {}
  }',
  
  -- Objetivos y medidas
  objectives JSONB DEFAULT '[]',
  measures JSONB DEFAULT '[]',
  
  -- Comisión de Igualdad
  equality_commission JSONB DEFAULT '[]',
  
  -- Seguimiento
  review_dates JSONB DEFAULT '[]',
  last_review_date DATE,
  
  -- Documentos
  document_urls TEXT[],
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auditorías Retributivas (obligatorio con Plan de Igualdad)
CREATE TABLE public.erp_hr_salary_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  equality_plan_id UUID REFERENCES public.erp_hr_equality_plans(id),
  
  -- Período auditado
  audit_year INTEGER NOT NULL,
  audit_period VARCHAR(20) DEFAULT 'annual',
  
  -- Datos agregados por género (Art. 28.2 ET)
  salary_data JSONB DEFAULT '{
    "by_category": [],
    "by_department": [],
    "by_position": [],
    "by_seniority": []
  }',
  
  -- Brecha salarial
  overall_gap_percentage DECIMAL(5,2),
  gap_by_category JSONB DEFAULT '[]',
  gap_by_concept JSONB DEFAULT '[]', -- Salario base, complementos, etc.
  
  -- Análisis de causas
  gap_causes JSONB DEFAULT '[]',
  
  -- Plan de corrección
  correction_measures JSONB DEFAULT '[]',
  correction_timeline JSONB DEFAULT '[]',
  
  -- Justificación legal (si brecha >25%)
  legal_justification TEXT,
  
  -- Estado
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'approved')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Protocolos de Acoso
CREATE TABLE public.erp_hr_harassment_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  
  -- Tipo de protocolo
  protocol_type VARCHAR(50) NOT NULL CHECK (protocol_type IN ('sexual', 'gender', 'moral', 'all')),
  protocol_name VARCHAR(255) NOT NULL,
  
  -- Vigencia
  effective_date DATE NOT NULL,
  review_date DATE,
  
  -- Contenido del protocolo
  declaration_principles TEXT,
  scope_application TEXT,
  definitions JSONB DEFAULT '{}',
  prevention_measures JSONB DEFAULT '[]',
  complaint_procedure JSONB DEFAULT '{}',
  investigation_procedure JSONB DEFAULT '{}',
  sanctions JSONB DEFAULT '[]',
  support_measures JSONB DEFAULT '[]',
  
  -- Responsables
  contact_person_id UUID,
  investigation_committee JSONB DEFAULT '[]',
  
  -- Formación
  training_requirements JSONB DEFAULT '[]',
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  document_url TEXT,
  
  -- Comunicación
  communicated_at TIMESTAMPTZ,
  communication_proof TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- 1.3 REGISTRO HORARIO AVANZADO
-- Art. 34.9 ET, RD-ley 8/2019
-- ===========================================

-- Políticas de tiempo
CREATE TABLE public.erp_hr_time_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  
  -- Identificación
  policy_name VARCHAR(255) NOT NULL,
  policy_code VARCHAR(50),
  
  -- Jornada estándar
  weekly_hours DECIMAL(4,2) DEFAULT 40.00,
  daily_hours DECIMAL(4,2) DEFAULT 8.00,
  
  -- Flexibilidad
  is_flexible BOOLEAN DEFAULT false,
  flex_start_time TIME,
  flex_end_time TIME,
  core_hours_start TIME,
  core_hours_end TIME,
  
  -- Horas extra
  overtime_allowed BOOLEAN DEFAULT true,
  max_daily_overtime DECIMAL(4,2) DEFAULT 2.00,
  max_annual_overtime DECIMAL(6,2) DEFAULT 80.00, -- Máx legal 80h/año
  overtime_compensation VARCHAR(20) DEFAULT 'monetary' CHECK (overtime_compensation IN ('monetary', 'time_off', 'both')),
  
  -- Pausas
  break_duration_minutes INTEGER DEFAULT 30,
  break_is_paid BOOLEAN DEFAULT false,
  
  -- Trabajo remoto
  remote_work_allowed BOOLEAN DEFAULT false,
  remote_days_per_week INTEGER DEFAULT 0,
  
  -- Métodos de fichaje permitidos
  allowed_methods JSONB DEFAULT '["web", "app", "biometric"]',
  geolocation_required BOOLEAN DEFAULT false,
  geolocation_radius_meters INTEGER,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  applies_to_departments UUID[],
  applies_to_positions TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Registros de tiempo (fichajes)
CREATE TABLE public.erp_hr_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.erp_hr_time_policies(id),
  
  -- Fecha del registro
  entry_date DATE NOT NULL,
  
  -- Tiempos
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  
  -- Duración calculada
  worked_hours DECIMAL(5,2),
  break_minutes INTEGER,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  
  -- Método de registro
  entry_method VARCHAR(20) CHECK (entry_method IN ('web', 'app', 'biometric', 'manual', 'auto')),
  
  -- Geolocalización (si aplica)
  clock_in_location JSONB, -- {lat, lng, accuracy, address}
  clock_out_location JSONB,
  
  -- Validación
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  
  -- Incidencias
  has_incident BOOLEAN DEFAULT false,
  incident_type VARCHAR(50),
  incident_notes TEXT,
  
  -- Modificaciones manuales
  was_modified BOOLEAN DEFAULT false,
  modification_reason TEXT,
  modified_by UUID,
  original_values JSONB,
  
  -- Estado
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disputed')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(employee_id, entry_date)
);

-- Políticas de desconexión digital (Art. 88 LOPDGDD)
CREATE TABLE public.erp_hr_disconnection_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  
  -- Identificación
  policy_name VARCHAR(255) NOT NULL,
  
  -- Horarios de desconexión
  disconnection_start TIME NOT NULL, -- Ej: 19:00
  disconnection_end TIME NOT NULL,   -- Ej: 08:00
  
  -- Días aplicables
  applies_weekdays BOOLEAN DEFAULT true,
  applies_weekends BOOLEAN DEFAULT true,
  applies_holidays BOOLEAN DEFAULT true,
  
  -- Excepciones
  exception_roles TEXT[], -- Roles que pueden recibir comunicaciones
  exception_situations JSONB DEFAULT '[]', -- Emergencias, etc.
  
  -- Comunicaciones permitidas
  urgent_contact_method VARCHAR(50), -- Teléfono para emergencias
  
  -- Medidas
  email_delay_enabled BOOLEAN DEFAULT false,
  notification_blocking BOOLEAN DEFAULT false,
  awareness_training_required BOOLEAN DEFAULT true,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  effective_date DATE NOT NULL,
  
  -- Comunicación
  communicated_to_employees BOOLEAN DEFAULT false,
  communication_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- ÍNDICES PARA RENDIMIENTO
-- ===========================================

CREATE INDEX idx_whistleblower_reports_company ON public.erp_hr_whistleblower_reports(company_id);
CREATE INDEX idx_whistleblower_reports_status ON public.erp_hr_whistleblower_reports(status);
CREATE INDEX idx_whistleblower_reports_code ON public.erp_hr_whistleblower_reports(report_code);

CREATE INDEX idx_equality_plans_company ON public.erp_hr_equality_plans(company_id);
CREATE INDEX idx_equality_plans_status ON public.erp_hr_equality_plans(status);

CREATE INDEX idx_salary_audits_company ON public.erp_hr_salary_audits(company_id);
CREATE INDEX idx_salary_audits_year ON public.erp_hr_salary_audits(audit_year);

CREATE INDEX idx_time_entries_employee ON public.erp_hr_time_entries(employee_id);
CREATE INDEX idx_time_entries_date ON public.erp_hr_time_entries(entry_date);
CREATE INDEX idx_time_entries_company_date ON public.erp_hr_time_entries(company_id, entry_date);

-- ===========================================
-- RLS POLICIES
-- ===========================================

ALTER TABLE public.erp_hr_whistleblower_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_whistleblower_investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_equality_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_salary_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_harassment_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_time_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_disconnection_policies ENABLE ROW LEVEL SECURITY;

-- Políticas para whistleblower (acceso muy restringido)
CREATE POLICY "Whistleblower reports company access" ON public.erp_hr_whistleblower_reports
  FOR ALL USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Whistleblower investigations company access" ON public.erp_hr_whistleblower_investigations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_whistleblower_reports r
      WHERE r.id = report_id AND public.user_has_erp_company_access(r.company_id)
    )
  );

-- Políticas para igualdad
CREATE POLICY "Equality plans company access" ON public.erp_hr_equality_plans
  FOR ALL USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Salary audits company access" ON public.erp_hr_salary_audits
  FOR ALL USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Harassment protocols company access" ON public.erp_hr_harassment_protocols
  FOR ALL USING (public.user_has_erp_company_access(company_id));

-- Políticas para registro horario
CREATE POLICY "Time policies company access" ON public.erp_hr_time_policies
  FOR ALL USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Time entries company access" ON public.erp_hr_time_entries
  FOR ALL USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Disconnection policies company access" ON public.erp_hr_disconnection_policies
  FOR ALL USING (public.user_has_erp_company_access(company_id));

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Trigger para generar código único de denuncia
CREATE OR REPLACE FUNCTION public.generate_whistleblower_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.report_code := 'WB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  NEW.resolution_deadline := NEW.received_at + INTERVAL '3 months';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_whistleblower_code
  BEFORE INSERT ON public.erp_hr_whistleblower_reports
  FOR EACH ROW EXECUTE FUNCTION public.generate_whistleblower_code();

-- Trigger para calcular horas trabajadas
CREATE OR REPLACE FUNCTION public.calculate_worked_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    NEW.worked_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
    
    -- Restar pausas si existen
    IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
      NEW.break_minutes := EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 60;
      NEW.worked_hours := NEW.worked_hours - (NEW.break_minutes / 60.0);
    END IF;
    
    -- Calcular horas extra (más de 8h diarias)
    IF NEW.worked_hours > 8 THEN
      NEW.overtime_hours := NEW.worked_hours - 8;
    ELSE
      NEW.overtime_hours := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_time_entry_hours
  BEFORE INSERT OR UPDATE ON public.erp_hr_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.calculate_worked_hours();

-- Trigger para updated_at
CREATE TRIGGER set_whistleblower_reports_updated_at
  BEFORE UPDATE ON public.erp_hr_whistleblower_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_whistleblower_investigations_updated_at
  BEFORE UPDATE ON public.erp_hr_whistleblower_investigations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_equality_plans_updated_at
  BEFORE UPDATE ON public.erp_hr_equality_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_salary_audits_updated_at
  BEFORE UPDATE ON public.erp_hr_salary_audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_time_policies_updated_at
  BEFORE UPDATE ON public.erp_hr_time_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_time_entries_updated_at
  BEFORE UPDATE ON public.erp_hr_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
