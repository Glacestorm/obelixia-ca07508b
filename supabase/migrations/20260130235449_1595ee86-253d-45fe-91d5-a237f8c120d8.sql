-- Security definer function para acceso a empresas ERP
CREATE OR REPLACE FUNCTION public.user_has_erp_company_access(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.erp_user_roles
    WHERE user_id = auth.uid() AND company_id = p_company_id
  )
$$;

-- Tabla para documentos fiscales generados
CREATE TABLE IF NOT EXISTS public.erp_fiscal_generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  jurisdiction_id UUID REFERENCES public.erp_tax_jurisdictions(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  period TEXT NOT NULL,
  fiscal_year INTEGER,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID,
  file_url TEXT,
  file_format TEXT DEFAULT 'pdf',
  file_size_bytes INTEGER,
  status TEXT DEFAULT 'draft',
  filed_at TIMESTAMPTZ,
  filed_by UUID,
  filing_reference TEXT,
  filing_response JSONB,
  calculated_data JSONB,
  form_fields JSONB,
  metadata JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_erp_fiscal_docs_company ON public.erp_fiscal_generated_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_erp_fiscal_docs_type ON public.erp_fiscal_generated_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_erp_fiscal_docs_period ON public.erp_fiscal_generated_documents(period);
CREATE INDEX IF NOT EXISTS idx_erp_fiscal_docs_status ON public.erp_fiscal_generated_documents(status);

-- Enable RLS
ALTER TABLE public.erp_fiscal_generated_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "fiscal_docs_select_policy"
  ON public.erp_fiscal_generated_documents FOR SELECT
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "fiscal_docs_insert_policy"
  ON public.erp_fiscal_generated_documents FOR INSERT
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "fiscal_docs_update_policy"
  ON public.erp_fiscal_generated_documents FOR UPDATE
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "fiscal_docs_delete_policy"
  ON public.erp_fiscal_generated_documents FOR DELETE
  USING (public.user_has_erp_company_access(company_id));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_erp_fiscal_docs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_erp_fiscal_docs_updated_at
  BEFORE UPDATE ON public.erp_fiscal_generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_erp_fiscal_docs_updated_at();

-- Storage bucket para documentos fiscales
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fiscal-documents', 'fiscal-documents', false)
ON CONFLICT (id) DO NOTHING;