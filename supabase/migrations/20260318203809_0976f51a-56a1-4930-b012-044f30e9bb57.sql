
-- 1) Entity type enum for companies
DO $$ BEGIN
  CREATE TYPE public.company_entity_type AS ENUM (
    'autonomo',
    'sociedad_limitada',
    'sociedad_limitada_unipersonal',
    'sociedad_anonima',
    'sociedad_limitada_nueva_empresa',
    'sociedad_cooperativa',
    'sociedad_laboral',
    'sociedad_colectiva',
    'sociedad_comanditaria_simple',
    'sociedad_comanditaria_acciones',
    'comunidad_bienes',
    'sociedad_civil',
    'asociacion',
    'fundacion',
    'sociedad_profesional',
    'agrupacion_interes_economico',
    'sociedad_anonima_europea',
    'sociedad_anonima_deportiva',
    'entidad_religiosa',
    'trust',
    'holding',
    'joint_venture',
    'ute',
    'sucursal_extranjera',
    'oficina_representacion'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2) Add entity_type + multi_cnae support to erp_companies
ALTER TABLE public.erp_companies
  ADD COLUMN IF NOT EXISTS entity_type public.company_entity_type DEFAULT 'sociedad_limitada',
  ADD COLUMN IF NOT EXISTS allows_multi_cnae BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cnae_codes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS registration_registry TEXT,
  ADD COLUMN IF NOT EXISTS incorporation_date DATE,
  ADD COLUMN IF NOT EXISTS fiscal_regime TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS share_capital NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES public.erp_companies(id) ON DELETE SET NULL;

-- 3) Entity type rules (legal framework per type)
CREATE TABLE IF NOT EXISTS public.erp_entity_type_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.company_entity_type NOT NULL,
  rule_key TEXT NOT NULL,
  rule_value JSONB NOT NULL DEFAULT '{}',
  governing_law TEXT,
  law_reference TEXT,
  description TEXT,
  allows_multi_cnae BOOLEAN DEFAULT false,
  min_share_capital NUMERIC(15,2),
  max_partners INTEGER,
  min_partners INTEGER DEFAULT 1,
  requires_auditor BOOLEAN DEFAULT false,
  requires_board BOOLEAN DEFAULT false,
  liability_type TEXT DEFAULT 'limited',
  tax_regime TEXT[] DEFAULT '{}',
  applicable_jurisdictions TEXT[] DEFAULT '{ES}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, rule_key)
);

ALTER TABLE public.erp_entity_type_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_type_rules_read_all" ON public.erp_entity_type_rules
  FOR SELECT TO authenticated USING (true);

-- 4) Legal knowledge base
CREATE TABLE IF NOT EXISTS public.erp_legal_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  law_code TEXT,
  law_name TEXT,
  articles TEXT[],
  boe_reference TEXT,
  effective_date DATE,
  expiry_date DATE,
  applicable_entity_types public.company_entity_type[],
  applicable_jurisdictions TEXT[] DEFAULT '{ES}',
  tags TEXT[] DEFAULT '{}',
  importance TEXT DEFAULT 'medium',
  source_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.erp_legal_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_kb_read_all" ON public.erp_legal_knowledge_base
  FOR SELECT TO authenticated USING (true);

-- 5) Company CNAE assignments (for multi-CNAE entities)
CREATE TABLE IF NOT EXISTS public.erp_company_cnae_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  cnae_code TEXT NOT NULL,
  cnae_description TEXT,
  is_primary BOOLEAN DEFAULT false,
  effective_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, cnae_code)
);

ALTER TABLE public.erp_company_cnae_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_cnae_read" ON public.erp_company_cnae_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "company_cnae_manage" ON public.erp_company_cnae_assignments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6) Index for performance
CREATE INDEX IF NOT EXISTS idx_legal_kb_category ON public.erp_legal_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_legal_kb_entity_types ON public.erp_legal_knowledge_base USING GIN(applicable_entity_types);
CREATE INDEX IF NOT EXISTS idx_company_cnae_company ON public.erp_company_cnae_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_erp_companies_entity_type ON public.erp_companies(entity_type);
CREATE INDEX IF NOT EXISTS idx_erp_companies_parent ON public.erp_companies(parent_company_id);
