
-- =====================================================
-- STORAGE SECURITY HARDENING: energy-documents bucket
-- =====================================================

-- 1. Security definer function: extract case_id from storage path
-- Path patterns: invoices/{caseId}/... or contracts/{caseId}/...
CREATE OR REPLACE FUNCTION public.energy_doc_path_to_case_id(file_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts TEXT[];
  case_id_text TEXT;
BEGIN
  -- Split path: e.g. 'invoices/uuid/invoice_id/file.pdf' or 'contracts/uuid/contract_id/file.pdf'
  parts := string_to_array(file_path, '/');
  IF array_length(parts, 1) < 2 THEN
    RETURN NULL;
  END IF;
  case_id_text := parts[2]; -- second segment is always case_id
  BEGIN
    RETURN case_id_text::UUID;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

-- 2. Security definer function: validate current user can access an energy document
CREATE OR REPLACE FUNCTION public.user_can_access_energy_document(file_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id UUID;
BEGIN
  -- Superadmin bypass
  IF public.has_role(auth.uid(), 'superadmin'::app_role) THEN
    RETURN TRUE;
  END IF;

  -- Extract case_id from path
  v_case_id := public.energy_doc_path_to_case_id(file_path);
  IF v_case_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check user has access to this case via company membership
  RETURN EXISTS (
    SELECT 1 FROM public.energy_cases ec
    JOIN public.erp_user_companies euc ON euc.company_id = ec.company_id
    WHERE ec.id = v_case_id
      AND euc.user_id = auth.uid()
      AND euc.is_active = true
  );
END;
$$;

-- 3. Drop overly permissive storage policies
DROP POLICY IF EXISTS "energy_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "energy_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "energy_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "energy_docs_delete" ON storage.objects;

-- 4. Create strict storage policies using path-based case validation
CREATE POLICY "energy_docs_select_strict" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'energy-documents'
    AND public.user_can_access_energy_document(name)
  );

CREATE POLICY "energy_docs_insert_strict" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'energy-documents'
    AND public.user_can_access_energy_document(name)
  );

CREATE POLICY "energy_docs_update_strict" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'energy-documents'
    AND public.user_can_access_energy_document(name)
  )
  WITH CHECK (
    bucket_id = 'energy-documents'
    AND public.user_can_access_energy_document(name)
  );

CREATE POLICY "energy_docs_delete_strict" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'energy-documents'
    AND public.user_can_access_energy_document(name)
  );

-- 5. Document registry for audit trail and orphan detection
CREATE TABLE IF NOT EXISTS public.energy_document_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.energy_cases(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'contract', 'other')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT DEFAULT 'application/pdf',
  uploaded_by UUID NOT NULL,
  linked_entity_id UUID, -- invoice_id or contract_id
  linked_entity_type TEXT CHECK (linked_entity_type IN ('energy_invoices', 'energy_contracts', NULL)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'orphaned', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.energy_document_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "energy_doc_registry_select" ON public.energy_document_registry
  FOR SELECT TO authenticated USING (public.user_has_energy_case_access(case_id));

CREATE POLICY "energy_doc_registry_insert" ON public.energy_document_registry
  FOR INSERT TO authenticated WITH CHECK (public.user_has_energy_case_access(case_id));

CREATE POLICY "energy_doc_registry_update" ON public.energy_document_registry
  FOR UPDATE TO authenticated
  USING (public.user_has_energy_case_access(case_id))
  WITH CHECK (public.user_has_energy_case_access(case_id));

CREATE POLICY "energy_doc_registry_delete" ON public.energy_document_registry
  FOR DELETE TO authenticated USING (public.user_has_energy_case_access(case_id));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_energy_doc_registry_case ON public.energy_document_registry(case_id);
CREATE INDEX IF NOT EXISTS idx_energy_doc_registry_linked ON public.energy_document_registry(linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_energy_doc_registry_path ON public.energy_document_registry(file_path);
