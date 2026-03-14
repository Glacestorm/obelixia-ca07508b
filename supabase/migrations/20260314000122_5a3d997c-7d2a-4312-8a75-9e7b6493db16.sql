
-- V2-ES.5 Paso 1: Datos de alta/afiliación para tramitación TGSS
CREATE TABLE public.erp_hr_registration_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  -- Registration process status
  registration_status TEXT NOT NULL DEFAULT 'pending_data',
  
  -- TGSS / Sistema RED fields
  naf TEXT,                           -- Número de Afiliación a la Seguridad Social
  registration_date DATE,             -- Fecha de alta
  ccc TEXT,                           -- Código Cuenta Cotización
  contract_type_code TEXT,            -- Código tipo contrato (ej: 100, 189, 401...)
  contribution_group TEXT,            -- Grupo de cotización (1-11)
  regime TEXT DEFAULT 'general',      -- Régimen (general, autonomos, agrario, mar, mineria)
  work_center TEXT,                   -- Centro de trabajo
  legal_entity TEXT,                  -- Entidad legal / razón social
  working_coefficient NUMERIC(5,4),   -- Coeficiente de jornada (0.0000-1.0000)
  
  -- Identity
  dni_nie TEXT,                       -- DNI/NIE del trabajador
  
  -- Additional TGSS context
  occupation_code TEXT,               -- Código CNO (Clasificación Nacional de Ocupaciones)
  collective_agreement TEXT,          -- Convenio colectivo aplicable
  trial_period_days INTEGER,          -- Periodo de prueba en días
  contract_end_date DATE,             -- Fecha fin contrato (si temporal)
  
  -- Readiness tracking
  data_validated_at TIMESTAMPTZ,
  data_validated_by UUID,
  docs_validated_at TIMESTAMPTZ,
  docs_validated_by UUID,
  ready_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_reference TEXT,           -- Referencia de confirmación externa (futuro)
  
  -- Validation notes
  validation_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT erp_hr_reg_data_unique_request UNIQUE (request_id)
);

-- Index for lookups by employee
CREATE INDEX idx_hr_reg_data_employee ON public.erp_hr_registration_data(employee_id);
CREATE INDEX idx_hr_reg_data_company ON public.erp_hr_registration_data(company_id);
CREATE INDEX idx_hr_reg_data_status ON public.erp_hr_registration_data(registration_status);

-- RLS
ALTER TABLE public.erp_hr_registration_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read registration data"
  ON public.erp_hr_registration_data FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert registration data"
  ON public.erp_hr_registration_data FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update registration data"
  ON public.erp_hr_registration_data FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
