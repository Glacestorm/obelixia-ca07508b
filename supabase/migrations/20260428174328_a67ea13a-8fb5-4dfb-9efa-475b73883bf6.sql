
-- =====================================================================
-- B1 — Registro Maestro de Convenios Colectivos (sufijo _registry)
-- Coexiste con la tabla operativa per-empresa preexistente.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------- Tabla 1: registro maestro ---------------------------------
CREATE TABLE public.erp_hr_collective_agreements_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_code text,
  internal_code text NOT NULL,
  official_name text NOT NULL,
  short_name text,
  scope_type text NOT NULL,
  jurisdiction_code text NOT NULL,
  autonomous_region text,
  province_code text,
  sector text,
  cnae_codes text[] NOT NULL DEFAULT '{}',
  functional_scope_text text,
  territorial_scope_text text,
  publication_source text,
  publication_url text,
  publication_date date,
  effective_start_date date,
  effective_end_date date,
  ultraactivity_status text,
  status text NOT NULL DEFAULT 'pendiente_validacion',
  source_quality text NOT NULL DEFAULT 'pending_official_validation',
  data_completeness text NOT NULL DEFAULT 'metadata_only',
  salary_tables_loaded boolean NOT NULL DEFAULT false,
  ready_for_payroll boolean NOT NULL DEFAULT false,
  requires_human_review boolean NOT NULL DEFAULT true,
  official_submission_blocked boolean NOT NULL DEFAULT true,
  checksum text,
  source_document_hash text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz,
  CONSTRAINT erp_hr_car_scope_type_chk
    CHECK (scope_type IN ('state','autonomous','provincial','company','group','sector')),
  CONSTRAINT erp_hr_car_status_chk
    CHECK (status IN ('vigente','vencido','ultraactividad','sustituido','pendiente_validacion')),
  CONSTRAINT erp_hr_car_source_quality_chk
    CHECK (source_quality IN ('official','public_secondary','pending_official_validation','legacy_static')),
  CONSTRAINT erp_hr_car_data_completeness_chk
    CHECK (data_completeness IN ('metadata_only','salary_tables_loaded','parsed_partial','parsed_full','human_validated')),
  CONSTRAINT erp_hr_car_internal_code_unique UNIQUE (internal_code)
);

CREATE INDEX idx_erp_hr_car_agreement_code ON public.erp_hr_collective_agreements_registry(agreement_code);
CREATE INDEX idx_erp_hr_car_jurisdiction ON public.erp_hr_collective_agreements_registry(jurisdiction_code);
CREATE INDEX idx_erp_hr_car_province ON public.erp_hr_collective_agreements_registry(province_code);
CREATE INDEX idx_erp_hr_car_region ON public.erp_hr_collective_agreements_registry(autonomous_region);
CREATE INDEX idx_erp_hr_car_status ON public.erp_hr_collective_agreements_registry(status);
CREATE INDEX idx_erp_hr_car_effective_end ON public.erp_hr_collective_agreements_registry(effective_end_date);
CREATE INDEX idx_erp_hr_car_cnae_gin ON public.erp_hr_collective_agreements_registry USING GIN (cnae_codes);
CREATE INDEX idx_erp_hr_car_official_name_trgm ON public.erp_hr_collective_agreements_registry USING GIN (official_name gin_trgm_ops);

-- ---------- Tabla 2: versiones ----------------------------------------
CREATE TABLE public.erp_hr_collective_agreements_registry_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  publication_date date,
  source_url text,
  effective_start_date date,
  effective_end_date date,
  change_type text NOT NULL,
  source_hash text,
  raw_text text,
  parsed_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_current boolean NOT NULL DEFAULT false,
  superseded_by uuid REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT erp_hr_carv_change_type_chk
    CHECK (change_type IN ('initial_text','salary_revision','correction','extension','denunciation','new_agreement'))
);

CREATE INDEX idx_erp_hr_carv_agreement ON public.erp_hr_collective_agreements_registry_versions(agreement_id);
CREATE UNIQUE INDEX uq_erp_hr_carv_one_current
  ON public.erp_hr_collective_agreements_registry_versions(agreement_id)
  WHERE is_current = true;

-- ---------- Tabla 3: tablas salariales --------------------------------
CREATE TABLE public.erp_hr_collective_agreements_registry_salary_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE CASCADE,
  year integer NOT NULL,
  professional_group text,
  category text,
  level text,
  salary_base_monthly numeric(12,2),
  salary_base_annual numeric(12,2),
  extra_pay_amount numeric(12,2),
  plus_convenio numeric(12,2),
  plus_transport numeric(12,2),
  plus_antiguedad numeric(12,2),
  plus_nocturnidad numeric(12,2),
  plus_festivo numeric(12,2),
  plus_responsabilidad numeric(12,2),
  other_pluses_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency text NOT NULL DEFAULT 'EUR',
  source_page text,
  requires_human_review boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_erp_hr_carst_agreement ON public.erp_hr_collective_agreements_registry_salary_tables(agreement_id);
CREATE INDEX idx_erp_hr_carst_version ON public.erp_hr_collective_agreements_registry_salary_tables(version_id);
CREATE INDEX idx_erp_hr_carst_year ON public.erp_hr_collective_agreements_registry_salary_tables(year);

-- ---------- Tabla 4: reglas -------------------------------------------
CREATE TABLE public.erp_hr_collective_agreements_registry_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.erp_hr_collective_agreements_registry_versions(id) ON DELETE SET NULL,
  rule_type text NOT NULL,
  rule_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_excerpt text,
  requires_human_review boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT erp_hr_carr_rule_type_chk
    CHECK (rule_type IN ('working_time','vacation','extra_pay','seniority','overtime','night_work',
                         'holidays','it_complement','leave','disciplinary','probation','notice','other'))
);

CREATE INDEX idx_erp_hr_carr_agreement ON public.erp_hr_collective_agreements_registry_rules(agreement_id);
CREATE INDEX idx_erp_hr_carr_rule_type ON public.erp_hr_collective_agreements_registry_rules(rule_type);

-- ---------- Tabla 5: fuentes ------------------------------------------
CREATE TABLE public.erp_hr_collective_agreements_registry_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.erp_hr_collective_agreements_registry(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_url text,
  document_url text,
  downloaded_at timestamptz,
  document_hash text,
  status text NOT NULL DEFAULT 'pending',
  source_quality text NOT NULL DEFAULT 'pending_official_validation',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT erp_hr_cars_source_type_chk
    CHECK (source_type IN ('REGCON','BOE','BOIB','DOGC','DOGV','BOJA','BOCM','BOP','OTHER')),
  CONSTRAINT erp_hr_cars_source_quality_chk
    CHECK (source_quality IN ('official','public_secondary','pending_official_validation','legacy_static'))
);

CREATE INDEX idx_erp_hr_cars_agreement ON public.erp_hr_collective_agreements_registry_sources(agreement_id);
CREATE INDEX idx_erp_hr_cars_source_type ON public.erp_hr_collective_agreements_registry_sources(source_type);

-- ---------- Tabla 6: import runs --------------------------------------
CREATE TABLE public.erp_hr_collective_agreements_registry_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  total_found integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  report_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'running',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT erp_hr_carir_status_chk
    CHECK (status IN ('running','completed','completed_with_warnings','failed'))
);

CREATE INDEX idx_erp_hr_carir_source ON public.erp_hr_collective_agreements_registry_import_runs(source);
CREATE INDEX idx_erp_hr_carir_status ON public.erp_hr_collective_agreements_registry_import_runs(status);

-- =====================================================================
-- Trigger defensivo: invariantes legales para ready_for_payroll
-- =====================================================================
CREATE OR REPLACE FUNCTION public.enforce_ca_registry_ready_for_payroll()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ready_for_payroll = true THEN
    IF NEW.salary_tables_loaded = false
       OR NEW.requires_human_review = true
       OR NEW.source_quality <> 'official'
       OR NEW.data_completeness <> 'human_validated'
       OR NEW.status NOT IN ('vigente','ultraactividad') THEN
      RAISE EXCEPTION
        'ready_for_payroll=true requires salary_tables_loaded=true, requires_human_review=false, source_quality=official, data_completeness=human_validated, status in (vigente,ultraactividad). Got st=% rh=% sq=% dc=% s=%',
        NEW.salary_tables_loaded, NEW.requires_human_review, NEW.source_quality, NEW.data_completeness, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    NEW.official_submission_blocked := true;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_erp_hr_car_enforce_ready_for_payroll
BEFORE INSERT OR UPDATE ON public.erp_hr_collective_agreements_registry
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ca_registry_ready_for_payroll();

-- =====================================================================
-- RLS — lectura autenticada en catálogos públicos; escritura solo server
-- =====================================================================
ALTER TABLE public.erp_hr_collective_agreements_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreements_registry_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreements_registry_salary_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreements_registry_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreements_registry_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_collective_agreements_registry_import_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_car"   ON public.erp_hr_collective_agreements_registry
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_carv"  ON public.erp_hr_collective_agreements_registry_versions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_carst" ON public.erp_hr_collective_agreements_registry_salary_tables
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_carr"  ON public.erp_hr_collective_agreements_registry_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_cars"  ON public.erp_hr_collective_agreements_registry_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_read_carir" ON public.erp_hr_collective_agreements_registry_import_runs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
