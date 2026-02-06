-- ============================================================
-- Fase 9: Industry Cloud Templates - Verticalización por Sector
-- Sistema de plantillas específicas por industria y CNAE
-- ============================================================

-- Tabla de perfiles de industria por empresa
CREATE TABLE public.erp_hr_industry_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  primary_industry TEXT NOT NULL DEFAULT 'other',
  secondary_industries TEXT[] DEFAULT '{}',
  cnae_codes TEXT[] DEFAULT '{}',
  employee_count_range TEXT DEFAULT '1-10',
  jurisdictions TEXT[] DEFAULT ARRAY['España'],
  collective_agreements JSONB DEFAULT '[]',
  compliance_level TEXT DEFAULT 'standard' CHECK (compliance_level IN ('basic', 'standard', 'enhanced', 'enterprise')),
  auto_apply_templates BOOLEAN DEFAULT false,
  custom_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Tabla de plantillas por industria
CREATE TABLE public.erp_hr_industry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  industry_category TEXT NOT NULL DEFAULT 'other',
  cnae_codes TEXT[] DEFAULT '{}',
  template_type TEXT NOT NULL CHECK (template_type IN (
    'contract', 'onboarding', 'offboarding', 'policy', 
    'compliance', 'payroll_config', 'benefits', 'safety', 'training'
  )),
  template_name TEXT NOT NULL,
  template_description TEXT,
  template_content JSONB NOT NULL DEFAULT '{}',
  variables JSONB DEFAULT '[]',
  compliance_requirements JSONB DEFAULT '[]',
  applicable_jurisdictions TEXT[] DEFAULT ARRAY['España'],
  collective_agreements TEXT[] DEFAULT '{}',
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'deprecated', 'archived')),
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de aplicaciones de plantillas
CREATE TABLE public.erp_hr_template_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES erp_hr_industry_templates(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('employee', 'contract', 'onboarding', 'department')),
  entity_id TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by UUID,
  variable_values JSONB DEFAULT '{}',
  generated_content JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'failed', 'rolled_back')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX idx_erp_hr_industry_profiles_company ON erp_hr_industry_profiles(company_id);
CREATE INDEX idx_erp_hr_industry_templates_company ON erp_hr_industry_templates(company_id);
CREATE INDEX idx_erp_hr_industry_templates_type ON erp_hr_industry_templates(template_type);
CREATE INDEX idx_erp_hr_industry_templates_industry ON erp_hr_industry_templates(industry_category);
CREATE INDEX idx_erp_hr_industry_templates_status ON erp_hr_industry_templates(status);
CREATE INDEX idx_erp_hr_template_applications_template ON erp_hr_template_applications(template_id);
CREATE INDEX idx_erp_hr_template_applications_entity ON erp_hr_template_applications(entity_type, entity_id);

-- Triggers para updated_at
CREATE TRIGGER set_erp_hr_industry_profiles_updated_at
  BEFORE UPDATE ON erp_hr_industry_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_erp_hr_industry_templates_updated_at
  BEFORE UPDATE ON erp_hr_industry_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Habilitar RLS
ALTER TABLE erp_hr_industry_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_industry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_template_applications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS usando función de seguridad existente
CREATE POLICY "Users can view industry profiles for their companies"
  ON erp_hr_industry_profiles FOR SELECT
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage industry profiles for their companies"
  ON erp_hr_industry_profiles FOR ALL
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can view templates for their companies"
  ON erp_hr_industry_templates FOR SELECT
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage templates for their companies"
  ON erp_hr_industry_templates FOR ALL
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can view template applications for their companies"
  ON erp_hr_template_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM erp_hr_industry_templates t
      WHERE t.id = template_id
      AND public.user_has_erp_company_access(t.company_id)
    )
  );

CREATE POLICY "Users can manage template applications for their companies"
  ON erp_hr_template_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM erp_hr_industry_templates t
      WHERE t.id = template_id
      AND public.user_has_erp_company_access(t.company_id)
    )
  );

-- Comentarios
COMMENT ON TABLE erp_hr_industry_profiles IS 'Perfiles de industria por empresa para Industry Cloud Templates';
COMMENT ON TABLE erp_hr_industry_templates IS 'Plantillas verticalizadas por sector CNAE';
COMMENT ON TABLE erp_hr_template_applications IS 'Registro de aplicaciones de plantillas a entidades';