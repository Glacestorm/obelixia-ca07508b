
-- OH1: Extend official integrations tables + seed ES adapters

-- ALTER hr_official_submissions: add relational fields and retry logic
ALTER TABLE public.hr_official_submissions
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.erp_hr_employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_id UUID,
  ADD COLUMN IF NOT EXISTS payroll_record_id UUID,
  ADD COLUMN IF NOT EXISTS admin_request_id UUID,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS max_retries INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes INT,
  ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ;

-- ALTER hr_official_submission_receipts: add receipt classification
ALTER TABLE public.hr_official_submission_receipts
  ADD COLUMN IF NOT EXISTS receipt_type TEXT NOT NULL DEFAULT 'acknowledgement',
  ADD COLUMN IF NOT EXISTS receipt_file_name TEXT,
  ADD COLUMN IF NOT EXISTS receipt_file_size INT;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_hr_submissions_employee ON public.hr_official_submissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_submissions_priority ON public.hr_official_submissions(priority);
CREATE INDEX IF NOT EXISTS idx_hr_submissions_next_retry ON public.hr_official_submissions(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hr_receipts_type ON public.hr_official_submission_receipts(receipt_type);

-- Seed 7 Spanish official integration adapters
INSERT INTO public.hr_integration_adapters (country_code, adapter_name, adapter_type, system_name, auth_type, status, is_active, config) VALUES
  ('ES', 'TGSS / Sistema RED', 'social_security', 'Sistema RED (Remisión Electrónica de Documentos)', 'certificate', 'configured', true,
   '{"description":"Altas, bajas, variaciones de afiliación, partes IT/AT","file_formats":["AFI","FDI","FAN"],"operations":["alta","baja","variacion","parte_it","parte_at"]}'::jsonb),
  ('ES', 'SILTRA', 'social_security', 'Sistema de Liquidación Directa', 'certificate', 'configured', true,
   '{"description":"Cotizaciones a la Seguridad Social, ficheros de liquidación","file_formats":["FAN","FDI","AFI","IDC"],"operations":["liquidacion","confirmacion","consulta_deuda"]}'::jsonb),
  ('ES', 'Contrat@', 'labor', 'Comunicación de Contratos SEPE', 'certificate', 'configured', true,
   '{"description":"Comunicación de contratos de trabajo al SEPE","file_formats":["XML"],"operations":["alta_contrato","prorroga","conversion","finalizacion"]}'::jsonb),
  ('ES', 'Certific@2', 'labor', 'Certificados de Empresa SEPE', 'certificate', 'configured', true,
   '{"description":"Certificados de empresa para prestaciones por desempleo","file_formats":["XML"],"operations":["certificado_empresa","certificado_maternidad","certificado_parcial"]}'::jsonb),
  ('ES', 'Delt@', 'prevention', 'Declaración Electrónica de Trabajadores Accidentados', 'certificate', 'configured', true,
   '{"description":"Comunicación de accidentes de trabajo y enfermedades profesionales","file_formats":["XML"],"operations":["parte_accidente","relacion_accidentes","parte_enfermedad"]}'::jsonb),
  ('ES', 'AEAT', 'tax', 'Agencia Estatal de Administración Tributaria', 'certificate', 'configured', true,
   '{"description":"Modelos fiscales: 111 (retenciones trimestrales), 190 (resumen anual), certificados de retenciones","file_formats":["XML","BOE"],"operations":["modelo_111","modelo_190","modelo_216","certificado_retenciones"]}'::jsonb),
  ('ES', 'SEPE', 'labor', 'Servicio Público de Empleo Estatal', 'certificate', 'configured', true,
   '{"description":"Prestaciones, ERE/ERTE, comunicaciones de empleo","file_formats":["XML"],"operations":["solicitud_prestacion","comunicacion_ere","comunicacion_erte"]}'::jsonb)
ON CONFLICT DO NOTHING;
