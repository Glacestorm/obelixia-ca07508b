
-- ============================================================
-- V2-ES.4 Paso 5.1: Reglas de generación documental por proceso
-- Tabla separada de erp_hr_document_templates (content templates)
-- ============================================================

CREATE TABLE public.erp_hr_doc_generation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_type text NOT NULL,
  document_type_code text NOT NULL,
  label text NOT NULL,
  default_document_name text NOT NULL,
  default_category text DEFAULT 'laboral',
  default_subcategory text DEFAULT NULL,
  is_confidential_default boolean DEFAULT false,
  notes_template text DEFAULT NULL,
  metadata_defaults jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (process_type, document_type_code)
);

CREATE INDEX idx_hr_doc_gen_rules_process ON public.erp_hr_doc_generation_rules (process_type) WHERE is_active = true;

ALTER TABLE public.erp_hr_doc_generation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active generation rules"
  ON public.erp_hr_doc_generation_rules
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Seed estático — reglas por proceso HR España
INSERT INTO public.erp_hr_doc_generation_rules (process_type, document_type_code, label, default_document_name, default_category, default_subcategory, is_confidential_default, notes_template, sort_order)
VALUES
  ('employee_registration', 'contrato', 'Contrato de trabajo', 'Contrato de trabajo - {employee}', 'laboral', 'contratacion', true, 'Pendiente de firma y archivo.', 1),
  ('employee_registration', 'dni', 'DNI/NIE', 'DNI/NIE - {employee}', 'identificacion', NULL, true, 'Copia del documento de identidad.', 2),
  ('employee_registration', 'ss', 'Documento Seguridad Social', 'Alta SS - {employee}', 'laboral', 'afiliacion', false, 'Documento de afiliación a la Seguridad Social.', 3),
  ('contract_modification', 'contrato', 'Nuevo contrato / Anexo', 'Anexo contractual - {employee}', 'laboral', 'contratacion', true, 'Anexo o novación del contrato vigente.', 1),
  ('salary_change', 'contrato', 'Anexo salarial', 'Anexo salarial - {employee}', 'laboral', 'nomina', true, 'Documento de modificación salarial.', 1),
  ('sick_leave', 'justificante', 'Parte de baja (IT)', 'Parte baja IT - {employee}', 'medico', 'it', true, 'Parte oficial de incapacidad temporal.', 1),
  ('work_accident', 'justificante', 'Parte de accidente', 'Parte accidente - {employee}', 'laboral', 'accidente', false, 'Parte oficial de accidente de trabajo.', 1),
  ('work_accident', 'medico', 'Informe médico', 'Informe médico - {employee}', 'medico', 'accidente', true, 'Informe médico del accidente laboral.', 2),
  ('termination', 'contrato', 'Carta de despido / baja voluntaria', 'Carta baja - {employee}', 'laboral', 'baja', true, 'Documento de comunicación de baja.', 1),
  ('termination', 'certificado', 'Certificado de empresa', 'Certificado empresa - {employee}', 'laboral', 'baja', false, 'Certificado de empresa para el SEPE.', 2),
  ('settlement', 'contrato', 'Documento de finiquito', 'Finiquito - {employee}', 'laboral', 'baja', true, 'Documento de liquidación y finiquito.', 1),
  ('birth_leave', 'justificante', 'Certificado de nacimiento', 'Cert. nacimiento - {employee}', 'personal', 'nacimiento', false, 'Certificado oficial de nacimiento.', 1),
  ('document_submission', 'evidencia', 'Documento adjunto', 'Documento adjunto - {employee}', 'general', NULL, false, 'Documento adjunto a la solicitud.', 1);
