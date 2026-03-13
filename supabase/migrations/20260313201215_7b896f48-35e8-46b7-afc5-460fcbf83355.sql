
-- V2-ES.4 Paso 1 (parte 4): Checklist documental esperado por proceso HR
CREATE TABLE public.erp_hr_process_doc_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_type text NOT NULL,
  document_type_code text NOT NULL,
  label text NOT NULL,
  is_mandatory boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (process_type, document_type_code)
);

COMMENT ON TABLE public.erp_hr_process_doc_requirements IS 'Checklist documental esperado por proceso HR España (V2-ES.4)';

CREATE INDEX idx_hr_process_doc_reqs_process ON public.erp_hr_process_doc_requirements (process_type) WHERE is_active = true;

ALTER TABLE public.erp_hr_process_doc_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read process doc requirements"
  ON public.erp_hr_process_doc_requirements
  FOR SELECT
  TO authenticated
  USING (true);
