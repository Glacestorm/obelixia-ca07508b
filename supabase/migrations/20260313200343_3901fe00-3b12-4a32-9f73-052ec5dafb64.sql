
-- V2-ES.4 Paso 1 (parte 2): Estado documental operativo
-- Se añade como columna en la tabla principal (no tabla auxiliar) porque:
-- 1. Es un estado funcional del documento, no un workflow externo
-- 2. Evita JOINs innecesarios en las consultas principales
-- 3. Compatible con legacy via DEFAULT 'draft'

ALTER TABLE public.erp_hr_employee_documents
  ADD COLUMN IF NOT EXISTS document_status text NOT NULL DEFAULT 'draft';

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_hr_docs_status
  ON public.erp_hr_employee_documents (document_status)
  WHERE document_status NOT IN ('closed', 'archived');

COMMENT ON COLUMN public.erp_hr_employee_documents.document_status IS 'Estado operativo: draft|generated|pending_submission|submitted|accepted|rejected|corrected|closed|archived';
