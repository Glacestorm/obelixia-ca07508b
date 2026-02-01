-- =====================================================
-- FASE 1: Tablas para sistema avanzado de vacaciones
-- y reglas de permisos por jurisdicción
-- =====================================================

-- Reglas de vacaciones por departamento
CREATE TABLE IF NOT EXISTS erp_hr_vacation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES erp_hr_departments(id) ON DELETE CASCADE,
  max_simultaneous_percentage NUMERIC(5,2) DEFAULT 30.00,
  min_advance_days INTEGER DEFAULT 15,
  priority_by_seniority BOOLEAN DEFAULT true,
  restricted_start_date DATE,
  restricted_end_date DATE,
  jurisdiction TEXT DEFAULT 'ES',
  blackout_periods JSONB DEFAULT '[]',
  allow_half_days BOOLEAN DEFAULT false,
  require_approval_chain BOOLEAN DEFAULT true,
  auto_approve_if_no_conflict BOOLEAN DEFAULT false,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de permiso por jurisdicción
CREATE TABLE IF NOT EXISTS erp_hr_leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  category TEXT DEFAULT 'leave',
  days_entitled INTEGER,
  is_calendar_days BOOLEAN DEFAULT true,
  is_paid BOOLEAN DEFAULT true,
  requires_documentation BOOLEAN DEFAULT false,
  documentation_types TEXT[],
  legal_reference TEXT,
  description TEXT,
  can_be_split BOOLEAN DEFAULT true,
  min_consecutive_days INTEGER DEFAULT 1,
  max_advance_booking_days INTEGER,
  applies_to_all_contracts BOOLEAN DEFAULT true,
  contract_types TEXT[],
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, jurisdiction)
);

-- Solicitudes de vacaciones/permisos
CREATE TABLE IF NOT EXISTS erp_hr_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES erp_hr_employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES erp_hr_leave_types(id),
  leave_type_code TEXT,
  jurisdiction TEXT DEFAULT 'ES',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested NUMERIC(5,2) NOT NULL,
  is_half_day BOOLEAN DEFAULT false,
  half_day_period TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'in_review')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  documents_url TEXT[],
  conflict_employees UUID[],
  conflict_percentage NUMERIC(5,2),
  validation_warnings TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saldos de vacaciones por empleado y año
CREATE TABLE IF NOT EXISTS erp_hr_leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES erp_hr_employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  leave_type_code TEXT NOT NULL,
  jurisdiction TEXT DEFAULT 'ES',
  entitled_days NUMERIC(5,2) NOT NULL,
  used_days NUMERIC(5,2) DEFAULT 0,
  pending_days NUMERIC(5,2) DEFAULT 0,
  carried_over_days NUMERIC(5,2) DEFAULT 0,
  adjustment_days NUMERIC(5,2) DEFAULT 0,
  adjustment_reason TEXT,
  expires_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, year, leave_type_code, jurisdiction)
);

-- Enable RLS
ALTER TABLE erp_hr_vacation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_leave_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for vacation_rules
CREATE POLICY "hr_vacation_rules_select" ON erp_hr_vacation_rules
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(company_id));

CREATE POLICY "hr_vacation_rules_insert" ON erp_hr_vacation_rules
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(company_id));

CREATE POLICY "hr_vacation_rules_update" ON erp_hr_vacation_rules
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(company_id));

CREATE POLICY "hr_vacation_rules_delete" ON erp_hr_vacation_rules
  FOR DELETE TO authenticated
  USING (user_has_erp_company_access(company_id));

-- Leave types are public read (reference data)
CREATE POLICY "hr_leave_types_select" ON erp_hr_leave_types
  FOR SELECT TO authenticated
  USING (true);

-- RLS policies for leave_requests
CREATE POLICY "hr_leave_requests_select" ON erp_hr_leave_requests
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(company_id));

CREATE POLICY "hr_leave_requests_insert" ON erp_hr_leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(company_id));

CREATE POLICY "hr_leave_requests_update" ON erp_hr_leave_requests
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(company_id));

CREATE POLICY "hr_leave_requests_delete" ON erp_hr_leave_requests
  FOR DELETE TO authenticated
  USING (user_has_erp_company_access(company_id));

-- RLS policies for leave_balances
CREATE POLICY "hr_leave_balances_select" ON erp_hr_leave_balances
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(company_id));

CREATE POLICY "hr_leave_balances_insert" ON erp_hr_leave_balances
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(company_id));

CREATE POLICY "hr_leave_balances_update" ON erp_hr_leave_balances
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(company_id));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hr_vacation_rules_company ON erp_hr_vacation_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_vacation_rules_dept ON erp_hr_vacation_rules(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_types_code ON erp_hr_leave_types(code, jurisdiction);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_employee ON erp_hr_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_dates ON erp_hr_leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_status ON erp_hr_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_employee_year ON erp_hr_leave_balances(employee_id, year);

-- =====================================================
-- INSERT: Tipos de permiso por jurisdicción
-- =====================================================

-- ESPAÑA (ES)
INSERT INTO erp_hr_leave_types (code, name, jurisdiction, category, days_entitled, is_calendar_days, is_paid, requires_documentation, legal_reference, description, sort_order) VALUES
('vacation', 'Vacaciones anuales', 'ES', 'vacation', 30, true, true, false, 'Art. 38.1 ET', 'Vacaciones anuales retribuidas. Mínimo 30 días naturales.', 1),
('marriage', 'Matrimonio', 'ES', 'leave', 15, true, true, true, 'Art. 37.3.a ET', 'Permiso por matrimonio del trabajador.', 2),
('birth', 'Nacimiento/adopción', 'ES', 'paternity', 112, true, true, true, 'RD-Ley 6/2019', '16 semanas por nacimiento, adopción o acogimiento.', 3),
('death_1st', 'Fallecimiento 1º grado', 'ES', 'leave', 4, true, true, true, 'Art. 37.3.b ET', 'Fallecimiento de cónyuge, hijos o padres. 4 días con desplazamiento.', 4),
('death_2nd', 'Fallecimiento 2º grado', 'ES', 'leave', 2, true, true, true, 'Art. 37.3.b ET', 'Fallecimiento de abuelos, hermanos, suegros.', 5),
('illness_1st', 'Enfermedad grave 1º grado', 'ES', 'leave', 5, true, true, true, 'Art. 37.3.b ET', 'Hospitalización o enfermedad grave de familiar 1º grado.', 6),
('illness_2nd', 'Enfermedad grave 2º grado', 'ES', 'leave', 2, true, true, true, 'Art. 37.3.b ET', 'Hospitalización o enfermedad grave de familiar 2º grado.', 7),
('moving', 'Traslado domicilio', 'ES', 'leave', 1, false, true, false, 'Art. 37.3.c ET', 'Cambio de domicilio habitual.', 8),
('duty', 'Deber inexcusable', 'ES', 'leave', NULL, false, true, true, 'Art. 37.3.d ET', 'Cumplimiento de deber público y personal inexcusable.', 9),
('union_leave', 'Funciones sindicales', 'ES', 'leave', NULL, false, true, false, 'Art. 37.3.e ET y LOLS', 'Funciones sindicales y de representación.', 10),
('prenatal', 'Exámenes prenatales', 'ES', 'leave', NULL, false, true, true, 'Art. 37.3.f ET', 'Exámenes prenatales y preparación al parto.', 11),
('breastfeeding', 'Lactancia', 'ES', 'leave', 0, false, true, false, 'Art. 37.4 ET', '1 hora diaria o acumulación en 9 días.', 12),
('medical', 'Consulta médica', 'ES', 'leave', NULL, false, true, true, 'Convenio colectivo', 'Asistencia a consulta médica. Según convenio.', 13),
('personal', 'Asuntos propios', 'ES', 'leave', NULL, false, false, false, 'Convenio colectivo', 'Días de asuntos propios según convenio.', 14),
('sick', 'Incapacidad temporal', 'ES', 'sick', NULL, true, true, true, 'LGSS', 'Baja médica por enfermedad común o accidente.', 15),
('work_accident', 'Accidente laboral', 'ES', 'sick', NULL, true, true, true, 'LGSS art. 156', 'Baja por accidente de trabajo o enfermedad profesional.', 16)
ON CONFLICT (code, jurisdiction) DO UPDATE SET
  name = EXCLUDED.name,
  days_entitled = EXCLUDED.days_entitled,
  description = EXCLUDED.description,
  legal_reference = EXCLUDED.legal_reference;

-- ANDORRA (AD)
INSERT INTO erp_hr_leave_types (code, name, jurisdiction, category, days_entitled, is_calendar_days, is_paid, requires_documentation, legal_reference, description, sort_order) VALUES
('vacation', 'Vacances anuals', 'AD', 'vacation', 30, false, true, false, 'Llei 31/2018 art. 36', '30 dies laborables de vacances anuals.', 1),
('marriage', 'Matrimoni', 'AD', 'leave', 5, false, true, true, 'Llei 31/2018 art. 37', 'Permís per matrimoni del treballador.', 2),
('birth', 'Naixement/adopció', 'AD', 'paternity', 140, true, true, true, 'Llei 13/2019', '20 setmanes per maternitat/paternitat.', 3),
('death_1st', 'Defunció 1r grau', 'AD', 'leave', 5, false, true, true, 'Llei 31/2018 art. 37', 'Defunció de cònjuge, fills o pares.', 4),
('death_2nd', 'Defunció 2n grau', 'AD', 'leave', 2, false, true, true, 'Llei 31/2018 art. 37', 'Defunció d''avis, germans, sogres.', 5),
('moving', 'Trasllat domicili', 'AD', 'leave', 2, false, true, false, 'Llei 31/2018 art. 37', 'Canvi de domicili habitual.', 6),
('medical', 'Visita mèdica', 'AD', 'leave', NULL, false, true, true, 'Conveni col·lectiu', 'Assistència a consulta mèdica.', 7)
ON CONFLICT (code, jurisdiction) DO UPDATE SET
  name = EXCLUDED.name,
  days_entitled = EXCLUDED.days_entitled,
  description = EXCLUDED.description;

-- FRANCIA (FR)
INSERT INTO erp_hr_leave_types (code, name, jurisdiction, category, days_entitled, is_calendar_days, is_paid, requires_documentation, legal_reference, description, sort_order) VALUES
('vacation', 'Congés payés', 'FR', 'vacation', 25, false, true, false, 'Code travail L3141-3', '2.5 jours ouvrables par mois travaillé.', 1),
('marriage', 'Mariage/PACS', 'FR', 'leave', 4, false, true, true, 'Code travail L3142-1', 'Mariage ou PACS du salarié.', 2),
('marriage_child', 'Mariage enfant', 'FR', 'leave', 1, false, true, true, 'Code travail L3142-1', 'Mariage d''un enfant.', 3),
('birth_father', 'Congé paternité', 'FR', 'paternity', 28, true, true, true, 'L1225-35', '28 jours dont 7 obligatoires.', 4),
('birth_mother', 'Congé maternité', 'FR', 'maternity', 112, true, true, true, 'L1225-17', '16 semaines minimum.', 5),
('death_spouse', 'Décès conjoint', 'FR', 'leave', 3, false, true, true, 'Code travail L3142-4', 'Décès du conjoint ou partenaire PACS.', 6),
('death_parent', 'Décès parent', 'FR', 'leave', 3, false, true, true, 'Code travail L3142-4', 'Décès du père ou de la mère.', 7),
('death_child', 'Décès enfant', 'FR', 'leave', 7, false, true, true, 'Code travail L3142-4', 'Décès d''un enfant.', 8),
('sick_child', 'Enfant malade', 'FR', 'leave', 3, false, false, true, 'Code travail L1225-61', 'Enfant malade de moins de 16 ans.', 9),
('moving', 'Déménagement', 'FR', 'leave', 1, false, true, false, 'Convention collective', 'Changement de domicile.', 10),
('rtt', 'RTT', 'FR', 'leave', NULL, false, true, false, 'Accord entreprise', 'Réduction du temps de travail.', 11)
ON CONFLICT (code, jurisdiction) DO UPDATE SET
  name = EXCLUDED.name,
  days_entitled = EXCLUDED.days_entitled,
  description = EXCLUDED.description;

-- PORTUGAL (PT)
INSERT INTO erp_hr_leave_types (code, name, jurisdiction, category, days_entitled, is_calendar_days, is_paid, requires_documentation, legal_reference, description, sort_order) VALUES
('vacation', 'Férias anuais', 'PT', 'vacation', 22, false, true, false, 'Código Trabalho art. 238', '22 dias úteis de férias anuais.', 1),
('marriage', 'Casamento', 'PT', 'leave', 15, true, true, true, 'Código Trabalho art. 249', 'Falta justificada por casamento.', 2),
('birth_father', 'Licença parental pai', 'PT', 'paternity', 28, true, true, true, 'Código Trabalho art. 43', '28 dias obrigatórios para o pai.', 3),
('birth_mother', 'Licença parental mãe', 'PT', 'maternity', 120, true, true, true, 'Código Trabalho art. 40', '120 a 150 dias.', 4),
('death_1st', 'Falecimento 1º grau', 'PT', 'leave', 5, true, true, true, 'Código Trabalho art. 249', 'Falecimento de cônjuge ou parente 1º grau.', 5),
('death_2nd', 'Falecimento 2º grau', 'PT', 'leave', 2, true, true, true, 'Código Trabalho art. 249', 'Falecimento de parente 2º grau.', 6)
ON CONFLICT (code, jurisdiction) DO UPDATE SET
  name = EXCLUDED.name,
  days_entitled = EXCLUDED.days_entitled,
  description = EXCLUDED.description;

-- Enable realtime for leave requests
ALTER PUBLICATION supabase_realtime ADD TABLE erp_hr_leave_requests;