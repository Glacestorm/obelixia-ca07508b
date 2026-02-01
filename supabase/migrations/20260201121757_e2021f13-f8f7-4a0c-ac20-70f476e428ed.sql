-- =====================================================
-- FASE 2: Documentación por Empleado con IA
-- Añadir campos de indexación IA y búsqueda semántica
-- =====================================================

-- Añadir columnas de IA a la tabla existente de documentos
ALTER TABLE erp_hr_employee_documents 
ADD COLUMN IF NOT EXISTS ai_indexed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_indexed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS searchable_content TEXT,
ADD COLUMN IF NOT EXISTS ai_document_type TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS ai_entities JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Índice full-text para búsqueda en contenido
CREATE INDEX IF NOT EXISTS idx_hr_documents_searchable 
ON erp_hr_employee_documents 
USING GIN (to_tsvector('spanish', COALESCE(searchable_content, '')));

-- Índice para documentos indexados
CREATE INDEX IF NOT EXISTS idx_hr_documents_ai_indexed 
ON erp_hr_employee_documents (ai_indexed) 
WHERE ai_indexed = true;

-- Índice para tipo de documento detectado por IA
CREATE INDEX IF NOT EXISTS idx_hr_documents_ai_type 
ON erp_hr_employee_documents (ai_document_type);

-- Función para búsqueda full-text en documentos de empleados
CREATE OR REPLACE FUNCTION search_employee_documents(
  p_company_id UUID,
  p_search_query TEXT,
  p_employee_id UUID DEFAULT NULL,
  p_document_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  employee_id UUID,
  document_name TEXT,
  document_type TEXT,
  ai_summary TEXT,
  ai_document_type TEXT,
  ai_confidence NUMERIC,
  relevance_score REAL,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.employee_id,
    d.document_name,
    d.document_type,
    d.ai_summary,
    d.ai_document_type,
    d.ai_confidence,
    ts_rank(to_tsvector('spanish', COALESCE(d.searchable_content, '')), plainto_tsquery('spanish', p_search_query)) AS relevance_score,
    d.created_at
  FROM erp_hr_employee_documents d
  WHERE d.company_id = p_company_id
    AND d.ai_indexed = true
    AND (p_employee_id IS NULL OR d.employee_id = p_employee_id)
    AND (p_document_type IS NULL OR d.document_type = p_document_type)
    AND (
      to_tsvector('spanish', COALESCE(d.searchable_content, '')) @@ plainto_tsquery('spanish', p_search_query)
      OR d.document_name ILIKE '%' || p_search_query || '%'
      OR d.ai_summary ILIKE '%' || p_search_query || '%'
    )
  ORDER BY relevance_score DESC
  LIMIT p_limit;
END;
$$;

-- Comentario para documentación
COMMENT ON FUNCTION search_employee_documents IS 'Búsqueda full-text en documentos de empleados indexados por IA';

-- Tabla para tracking de procesamiento de documentos por IA
CREATE TABLE IF NOT EXISTS erp_hr_document_ai_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES erp_hr_employee_documents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processing_type TEXT NOT NULL CHECK (processing_type IN ('ocr', 'classification', 'extraction', 'summarization')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  processing_metadata JSONB DEFAULT '{}',
  tokens_used INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para tracking de procesamiento
CREATE INDEX IF NOT EXISTS idx_document_ai_processing_status 
ON erp_hr_document_ai_processing (status);

CREATE INDEX IF NOT EXISTS idx_document_ai_processing_document 
ON erp_hr_document_ai_processing (document_id);

-- RLS para tabla de procesamiento
ALTER TABLE erp_hr_document_ai_processing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view their document processing"
ON erp_hr_document_ai_processing FOR SELECT
USING (user_has_erp_company_access(company_id));

CREATE POLICY "Company users can insert document processing"
ON erp_hr_document_ai_processing FOR INSERT
WITH CHECK (user_has_erp_company_access(company_id));

CREATE POLICY "Company users can update document processing"
ON erp_hr_document_ai_processing FOR UPDATE
USING (user_has_erp_company_access(company_id));

-- Trigger para updated_at
CREATE TRIGGER set_erp_hr_document_ai_processing_updated_at
  BEFORE UPDATE ON erp_hr_document_ai_processing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();