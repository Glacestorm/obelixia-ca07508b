-- V2-ES.4 Paso 2.5: Storage readiness fields for employee documents
ALTER TABLE public.erp_hr_employee_documents
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS checksum TEXT,
  ADD COLUMN IF NOT EXISTS external_reference TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.erp_hr_employee_documents.file_name IS 'Original file name with extension';
COMMENT ON COLUMN public.erp_hr_employee_documents.storage_provider IS 'Storage backend: supabase, s3, azure, gcs, etc.';
COMMENT ON COLUMN public.erp_hr_employee_documents.checksum IS 'File checksum (SHA-256 or MD5) for integrity';
COMMENT ON COLUMN public.erp_hr_employee_documents.external_reference IS 'External system reference ID for integrations';
COMMENT ON COLUMN public.erp_hr_employee_documents.uploaded_at IS 'Timestamp when the physical file was uploaded';