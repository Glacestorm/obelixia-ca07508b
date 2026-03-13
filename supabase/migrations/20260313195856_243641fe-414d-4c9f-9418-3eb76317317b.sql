
-- V2-ES.4 Paso 1: Catálogo de tipos documentales operativos HR España
CREATE TABLE public.erp_hr_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  organism text,
  description text,
  is_mandatory_default boolean NOT NULL DEFAULT false,
  supports_versions boolean NOT NULL DEFAULT false,
  supports_external_response boolean NOT NULL DEFAULT false,
  retention_years integer NOT NULL DEFAULT 4,
  renewable boolean NOT NULL DEFAULT false,
  default_expiry_months integer,
  alert_before_days integer NOT NULL DEFAULT 30,
  legal_basis text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast category lookups
CREATE INDEX idx_erp_hr_doc_types_category ON public.erp_hr_document_types (category) WHERE is_active = true;

-- Index for code lookups (already unique, but partial for active only)
CREATE INDEX idx_erp_hr_doc_types_active ON public.erp_hr_document_types (code) WHERE is_active = true;

-- RLS: readable by authenticated users, writable by nobody (admin-managed via migrations/seeds)
ALTER TABLE public.erp_hr_document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read document types"
  ON public.erp_hr_document_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Comment
COMMENT ON TABLE public.erp_hr_document_types IS 'Catálogo de tipos documentales operativos para RRHH España (V2-ES.4)';
