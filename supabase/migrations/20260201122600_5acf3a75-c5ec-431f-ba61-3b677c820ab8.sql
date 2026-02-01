-- =============================================
-- FASE 3: Modelos Contractuales por Jurisdicción
-- =============================================

-- Tabla de plantillas de documentos
CREATE TABLE public.erp_hr_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  template_code TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'annex', 'severance', 'termination', 'warning', 'certificate', 'letter', 'other')),
  template_name TEXT NOT NULL,
  description TEXT,
  jurisdiction TEXT NOT NULL DEFAULT 'ES' CHECK (jurisdiction IN ('ES', 'AD', 'PT', 'FR', 'UK', 'AE', 'US', 'GLOBAL')),
  language_code TEXT NOT NULL DEFAULT 'es',
  template_content TEXT NOT NULL,
  variables_schema JSONB DEFAULT '[]'::jsonb,
  applicable_contract_types TEXT[] DEFAULT ARRAY['indefinido', 'temporal'],
  legal_references TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  last_updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, template_code, jurisdiction)
);

-- Índices para búsqueda eficiente
CREATE INDEX idx_hr_doc_templates_company ON public.erp_hr_document_templates(company_id);
CREATE INDEX idx_hr_doc_templates_type ON public.erp_hr_document_templates(document_type);
CREATE INDEX idx_hr_doc_templates_jurisdiction ON public.erp_hr_document_templates(jurisdiction);
CREATE INDEX idx_hr_doc_templates_active ON public.erp_hr_document_templates(is_active) WHERE is_active = true;

-- Tabla de documentos generados
CREATE TABLE public.erp_hr_generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.erp_hr_document_templates(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  generated_content TEXT NOT NULL,
  variables_used JSONB DEFAULT '{}'::jsonb,
  document_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'pending_signature', 'signed', 'archived', 'rejected')),
  generated_by UUID,
  generated_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_data JSONB,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hr_gen_docs_company ON public.erp_hr_generated_documents(company_id);
CREATE INDEX idx_hr_gen_docs_employee ON public.erp_hr_generated_documents(employee_id);
CREATE INDEX idx_hr_gen_docs_status ON public.erp_hr_generated_documents(status);
CREATE INDEX idx_hr_gen_docs_type ON public.erp_hr_generated_documents(document_type);

-- Tabla de jurisdicciones con configuración legal
CREATE TABLE public.erp_hr_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code TEXT NOT NULL UNIQUE,
  jurisdiction_name TEXT NOT NULL,
  country_name TEXT NOT NULL,
  currency TEXT DEFAULT 'EUR',
  language_code TEXT DEFAULT 'es',
  labor_law_name TEXT,
  vacation_days_default INTEGER DEFAULT 22,
  vacation_type TEXT DEFAULT 'labor_days' CHECK (vacation_type IN ('natural_days', 'labor_days')),
  probation_max_days INTEGER DEFAULT 180,
  notice_period_days INTEGER DEFAULT 15,
  severance_formula TEXT,
  social_security_rate_employee NUMERIC(5,2),
  social_security_rate_employer NUMERIC(5,2),
  income_tax_brackets JSONB,
  minimum_wage NUMERIC(10,2),
  minimum_wage_year INTEGER,
  legal_references JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar jurisdicciones base
INSERT INTO public.erp_hr_jurisdictions (
  jurisdiction_code, jurisdiction_name, country_name, currency, language_code,
  labor_law_name, vacation_days_default, vacation_type, probation_max_days,
  notice_period_days, severance_formula, social_security_rate_employee,
  social_security_rate_employer, minimum_wage, minimum_wage_year
) VALUES
  ('ES', 'España', 'Spain', 'EUR', 'es', 'Estatuto de los Trabajadores', 30, 'natural_days', 180, 15, '20d/año (objetivo) o 33d/año (improcedente)', 6.35, 29.90, 1134.00, 2024),
  ('AD', 'Andorra', 'Andorra', 'EUR', 'ca', 'Llei de Relacions Laborals', 30, 'labor_days', 90, 15, '25d/año', 6.50, 15.50, 1376.27, 2024),
  ('PT', 'Portugal', 'Portugal', 'EUR', 'pt', 'Código do Trabalho', 22, 'labor_days', 180, 30, '12d/año', 11.00, 23.75, 820.00, 2024),
  ('FR', 'Francia', 'France', 'EUR', 'fr', 'Code du Travail', 25, 'labor_days', 120, 30, '1/4 salario/año', 22.00, 45.00, 1766.92, 2024),
  ('UK', 'Reino Unido', 'United Kingdom', 'GBP', 'en', 'Employment Rights Act', 28, 'labor_days', 0, 30, 'Statutory redundancy', 12.00, 13.80, 1987.00, 2024),
  ('AE', 'Emiratos Árabes', 'UAE', 'AED', 'ar', 'UAE Labour Law', 30, 'natural_days', 180, 30, '21d/año (1-5) + 30d/año (5+)', 0.00, 0.00, 0.00, 2024),
  ('US', 'Estados Unidos', 'USA', 'USD', 'en', 'FLSA + State Laws', 0, 'labor_days', 0, 14, 'At-will employment', 7.65, 7.65, 1256.67, 2024);

-- RLS para templates
ALTER TABLE public.erp_hr_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates: ver propios o sistema"
  ON public.erp_hr_document_templates FOR SELECT
  USING (
    is_system = true 
    OR company_id IS NULL 
    OR user_has_erp_company_access(company_id)
  );

CREATE POLICY "Templates: gestionar propios"
  ON public.erp_hr_document_templates FOR ALL
  USING (
    company_id IS NOT NULL 
    AND user_has_erp_company_access(company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL 
    AND user_has_erp_company_access(company_id)
  );

-- RLS para documentos generados
ALTER TABLE public.erp_hr_generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GenDocs: acceso por empresa"
  ON public.erp_hr_generated_documents FOR ALL
  USING (user_has_erp_company_access(company_id))
  WITH CHECK (user_has_erp_company_access(company_id));

-- RLS para jurisdicciones (lectura pública)
ALTER TABLE public.erp_hr_jurisdictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jurisdictions: lectura pública"
  ON public.erp_hr_jurisdictions FOR SELECT
  USING (true);

-- Triggers de actualización
CREATE TRIGGER update_erp_hr_document_templates_updated_at
  BEFORE UPDATE ON public.erp_hr_document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_hr_generated_documents_updated_at
  BEFORE UPDATE ON public.erp_hr_generated_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_hr_jurisdictions_updated_at
  BEFORE UPDATE ON public.erp_hr_jurisdictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar plantillas de sistema base para España
INSERT INTO public.erp_hr_document_templates (
  company_id, template_code, document_type, template_name, description,
  jurisdiction, language_code, template_content, variables_schema,
  applicable_contract_types, legal_references, is_system
) VALUES
(
  NULL, 'ES_CONTRACT_INDEFINIDO', 'contract', 
  'Contrato Indefinido - España',
  'Modelo oficial de contrato de trabajo indefinido según Estatuto de los Trabajadores',
  'ES', 'es',
  E'CONTRATO DE TRABAJO INDEFINIDO\n\nEn {{company_city}}, a {{contract_date}}\n\nREUNIDOS\n\nDe una parte, {{company_name}}, con CIF {{company_tax_id}}, y domicilio en {{company_address}}, representada por {{company_representative}}, en calidad de {{representative_role}} (en adelante, LA EMPRESA).\n\nDe otra parte, D./Dña. {{employee_name}}, con DNI/NIE {{employee_dni}}, domiciliado/a en {{employee_address}}, nacido/a el {{employee_birth_date}} (en adelante, EL/LA TRABAJADOR/A).\n\nCLÁUSULAS\n\nPRIMERA.- El/La trabajador/a prestará sus servicios como {{job_position}}, con categoría profesional de {{professional_category}}, en el centro de trabajo sito en {{work_center}}.\n\nSEGUNDA.- La duración del presente contrato será INDEFINIDA, iniciándose la relación laboral el día {{start_date}}.\n\nTERCERA.- Se establece un período de prueba de {{probation_days}} días, durante el cual cualquiera de las partes podrá resolver el contrato sin necesidad de preaviso.\n\nCUARTA.- La jornada de trabajo será {{workday_type}}, de {{weekly_hours}} horas semanales, distribuidas de {{schedule_description}}.\n\nQUINTA.- El/La trabajador/a percibirá una retribución bruta anual de {{annual_salary}} euros, distribuidos en {{salary_payments}} pagas ({{monthly_salary}} euros/mes).\n\nSEXTA.- El/La trabajador/a disfrutará de {{vacation_days}} días naturales de vacaciones anuales retribuidas.\n\nSÉPTIMA.- Este contrato se regirá por lo dispuesto en el Estatuto de los Trabajadores, el Convenio Colectivo de {{collective_agreement}} y demás normativa laboral aplicable.\n\nY para que conste, firman el presente contrato por duplicado en el lugar y fecha indicados.\n\n\nLA EMPRESA                                    EL/LA TRABAJADOR/A\n\n\n_______________________                       _______________________',
  '[{"name": "company_name", "type": "text", "required": true}, {"name": "company_tax_id", "type": "text", "required": true}, {"name": "company_address", "type": "text", "required": true}, {"name": "company_city", "type": "text", "required": true}, {"name": "company_representative", "type": "text", "required": true}, {"name": "representative_role", "type": "text", "required": true}, {"name": "employee_name", "type": "text", "required": true}, {"name": "employee_dni", "type": "text", "required": true}, {"name": "employee_address", "type": "text", "required": false}, {"name": "employee_birth_date", "type": "date", "required": false}, {"name": "job_position", "type": "text", "required": true}, {"name": "professional_category", "type": "text", "required": true}, {"name": "work_center", "type": "text", "required": true}, {"name": "start_date", "type": "date", "required": true}, {"name": "contract_date", "type": "date", "required": true}, {"name": "probation_days", "type": "number", "required": true, "default": 60}, {"name": "workday_type", "type": "select", "options": ["completa", "parcial"], "required": true}, {"name": "weekly_hours", "type": "number", "required": true, "default": 40}, {"name": "schedule_description", "type": "text", "required": false}, {"name": "annual_salary", "type": "number", "required": true}, {"name": "monthly_salary", "type": "number", "required": true}, {"name": "salary_payments", "type": "number", "required": true, "default": 14}, {"name": "vacation_days", "type": "number", "required": true, "default": 30}, {"name": "collective_agreement", "type": "text", "required": false}]'::jsonb,
  ARRAY['indefinido'],
  'Real Decreto Legislativo 2/2015 - Estatuto de los Trabajadores, Arts. 8, 15, 16',
  true
),
(
  NULL, 'ES_CONTRACT_TEMPORAL', 'contract',
  'Contrato Temporal - España',
  'Modelo de contrato temporal por circunstancias de la producción',
  'ES', 'es',
  E'CONTRATO DE TRABAJO TEMPORAL\nPOR CIRCUNSTANCIAS DE LA PRODUCCIÓN\n\nEn {{company_city}}, a {{contract_date}}\n\nREUNIDOS\n\nDe una parte, {{company_name}}, con CIF {{company_tax_id}}, representada por {{company_representative}} (LA EMPRESA).\n\nDe otra parte, D./Dña. {{employee_name}}, con DNI/NIE {{employee_dni}} (EL/LA TRABAJADOR/A).\n\nCLÁUSULAS\n\nPRIMERA.- El/La trabajador/a es contratado/a como {{job_position}} para atender {{temporal_reason}}.\n\nSEGUNDA.- El contrato tendrá una duración de {{contract_duration_months}} meses, desde {{start_date}} hasta {{end_date}}, pudiendo prorrogarse según normativa vigente.\n\nTERCERA.- Período de prueba: {{probation_days}} días.\n\nCUARTA.- Jornada: {{workday_type}}, {{weekly_hours}} horas semanales.\n\nQUINTA.- Retribución: {{monthly_salary}} euros brutos/mes.\n\nSEXTA.- Al término del contrato, el/la trabajador/a tendrá derecho a una indemnización de 12 días de salario por año trabajado.\n\nFirmas:\n\nLA EMPRESA                    EL/LA TRABAJADOR/A',
  '[{"name": "company_name", "type": "text", "required": true}, {"name": "company_tax_id", "type": "text", "required": true}, {"name": "company_city", "type": "text", "required": true}, {"name": "company_representative", "type": "text", "required": true}, {"name": "employee_name", "type": "text", "required": true}, {"name": "employee_dni", "type": "text", "required": true}, {"name": "job_position", "type": "text", "required": true}, {"name": "temporal_reason", "type": "text", "required": true}, {"name": "contract_date", "type": "date", "required": true}, {"name": "start_date", "type": "date", "required": true}, {"name": "end_date", "type": "date", "required": true}, {"name": "contract_duration_months", "type": "number", "required": true}, {"name": "probation_days", "type": "number", "required": true, "default": 30}, {"name": "workday_type", "type": "select", "options": ["completa", "parcial"], "required": true}, {"name": "weekly_hours", "type": "number", "required": true, "default": 40}, {"name": "monthly_salary", "type": "number", "required": true}]'::jsonb,
  ARRAY['temporal', 'obra_servicio'],
  'ET Art. 15.1, RD-ley 32/2021 reforma laboral',
  true
),
(
  NULL, 'ES_SEVERANCE', 'severance',
  'Finiquito y Saldo - España',
  'Documento de liquidación de haberes y finiquito',
  'ES', 'es',
  E'DOCUMENTO DE LIQUIDACIÓN Y FINIQUITO\n\nEn {{company_city}}, a {{document_date}}\n\n{{company_name}}, con CIF {{company_tax_id}}\n\nD./Dña. {{employee_name}}, DNI {{employee_dni}}\n\nCESE: {{termination_type}} con efectos {{termination_date}}\n\nLIQUIDACIÓN DE HABERES:\n\n1. Salario días trabajados ({{worked_days}} días): {{salary_worked_days}} €\n2. Parte proporcional pagas extras: {{prorated_extras}} €\n3. Vacaciones no disfrutadas ({{vacation_pending_days}} días): {{vacation_compensation}} €\n4. Indemnización ({{indemnization_days}} días): {{indemnization_amount}} €\n5. Otros conceptos: {{other_concepts}} €\n\nTOTAL BRUTO: {{total_gross}} €\nRetenciones IRPF: {{irpf_retention}} €\nRetenciones SS: {{ss_retention}} €\n\nTOTAL NETO A PERCIBIR: {{total_net}} €\n\nEl/La trabajador/a declara haber recibido las cantidades indicadas, quedando saldadas y finiquitadas todas las obligaciones derivadas de la relación laboral.\n\nLA EMPRESA                    EL/LA TRABAJADOR/A\n\n(Puede firmar con la mención "No conforme" o "Pendiente de revisión" si tiene reservas)',
  '[{"name": "company_name", "type": "text", "required": true}, {"name": "company_tax_id", "type": "text", "required": true}, {"name": "company_city", "type": "text", "required": true}, {"name": "employee_name", "type": "text", "required": true}, {"name": "employee_dni", "type": "text", "required": true}, {"name": "document_date", "type": "date", "required": true}, {"name": "termination_type", "type": "text", "required": true}, {"name": "termination_date", "type": "date", "required": true}, {"name": "worked_days", "type": "number", "required": true}, {"name": "salary_worked_days", "type": "number", "required": true}, {"name": "prorated_extras", "type": "number", "required": true}, {"name": "vacation_pending_days", "type": "number", "required": true}, {"name": "vacation_compensation", "type": "number", "required": true}, {"name": "indemnization_days", "type": "number", "required": false, "default": 0}, {"name": "indemnization_amount", "type": "number", "required": false, "default": 0}, {"name": "other_concepts", "type": "number", "required": false, "default": 0}, {"name": "total_gross", "type": "number", "required": true}, {"name": "irpf_retention", "type": "number", "required": true}, {"name": "ss_retention", "type": "number", "required": true}, {"name": "total_net", "type": "number", "required": true}]'::jsonb,
  ARRAY['indefinido', 'temporal', 'practicas', 'formacion'],
  'ET Art. 49, 53, 56',
  true
);