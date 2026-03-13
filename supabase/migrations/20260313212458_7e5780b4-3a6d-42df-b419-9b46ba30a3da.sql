
-- ================================================
-- V2-ES.4 Paso 3.1: Bucket hr-documents + RLS
-- ================================================
-- Path convention: {company_id}/{employee_id}/{document_id}/{filename}
-- RLS: reutiliza user_has_erp_company_access via company_id en path

-- 1. Crear bucket privado
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hr-documents',
  'hr-documents',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Helper: extraer company_id del path de storage
-- Path format: hr-documents/{company_id}/{employee_id}/{document_id}/{filename}
-- storage.foldername(name) returns array of folder segments
CREATE OR REPLACE FUNCTION public.storage_hr_doc_company_id(object_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (string_to_array(object_name, '/'))[1]::UUID;
$$;

-- 3. RLS policies en storage.objects para bucket hr-documents
-- SELECT: usuario autenticado con acceso a la empresa
CREATE POLICY "hr_docs_storage_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'hr-documents'
  AND public.user_has_erp_company_access(
    public.storage_hr_doc_company_id(name)
  )
);

-- INSERT: usuario autenticado con acceso a la empresa
CREATE POLICY "hr_docs_storage_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hr-documents'
  AND public.user_has_erp_company_access(
    public.storage_hr_doc_company_id(name)
  )
);

-- UPDATE: usuario autenticado con acceso a la empresa (reemplazo de archivo)
CREATE POLICY "hr_docs_storage_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hr-documents'
  AND public.user_has_erp_company_access(
    public.storage_hr_doc_company_id(name)
  )
);

-- DELETE: usuario autenticado con acceso a la empresa
CREATE POLICY "hr_docs_storage_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hr-documents'
  AND public.user_has_erp_company_access(
    public.storage_hr_doc_company_id(name)
  )
);
