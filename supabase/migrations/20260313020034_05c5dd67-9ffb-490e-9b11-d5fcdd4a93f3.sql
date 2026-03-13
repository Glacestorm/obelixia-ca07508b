
-- V2-ES.3 Paso 1: Add related_entity columns to erp_hr_employee_documents
-- Allows linking documents to admin_requests and hr_tasks

ALTER TABLE public.erp_hr_employee_documents
  ADD COLUMN IF NOT EXISTS related_entity_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS related_entity_id uuid DEFAULT NULL;

-- Composite index for efficient fetchDocumentsByEntity queries
CREATE INDEX IF NOT EXISTS idx_hr_docs_related_entity
  ON public.erp_hr_employee_documents (related_entity_type, related_entity_id)
  WHERE related_entity_type IS NOT NULL;

COMMENT ON COLUMN public.erp_hr_employee_documents.related_entity_type IS 'Entity type this document is linked to: admin_request, hr_task';
COMMENT ON COLUMN public.erp_hr_employee_documents.related_entity_id IS 'UUID of the related entity';
