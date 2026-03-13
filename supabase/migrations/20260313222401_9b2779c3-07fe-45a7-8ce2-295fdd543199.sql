
-- =============================================
-- V2-ES.4 Paso 4.1: Tabla de versiones de archivo documental
-- =============================================

-- Tabla principal de versiones
CREATE TABLE public.erp_hr_document_file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.erp_hr_employee_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,

  -- Metadata del archivo
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  checksum TEXT,

  -- Storage
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'hr-documents',
  storage_provider TEXT NOT NULL DEFAULT 'supabase',

  -- Trazabilidad
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replace_reason TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT uq_doc_version UNIQUE (document_id, version_number)
);

-- Índices
CREATE INDEX idx_hr_file_versions_document ON public.erp_hr_document_file_versions(document_id);
CREATE INDEX idx_hr_file_versions_current ON public.erp_hr_document_file_versions(document_id) WHERE is_current = true;
CREATE INDEX idx_hr_file_versions_company ON public.erp_hr_document_file_versions(company_id);

-- Comentario
COMMENT ON TABLE public.erp_hr_document_file_versions IS 'Historial de versiones de archivos físicos del expediente documental HR';

-- RLS
ALTER TABLE public.erp_hr_document_file_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "file_versions_select"
  ON public.erp_hr_document_file_versions
  FOR SELECT
  TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "file_versions_insert"
  ON public.erp_hr_document_file_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "file_versions_update"
  ON public.erp_hr_document_file_versions
  FOR UPDATE
  TO authenticated
  USING (public.user_has_erp_company_access(company_id));
