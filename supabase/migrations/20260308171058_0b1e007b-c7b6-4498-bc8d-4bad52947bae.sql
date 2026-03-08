
-- Board Pack Templates (per audience type)
CREATE TABLE public.erp_hr_board_pack_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  audience TEXT NOT NULL, -- 'board_directors','executive_committee','audit_committee','risk_committee','compliance_committee','hr_strategic'
  description TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb, -- ordered array of section configs
  default_period TEXT DEFAULT 'quarterly', -- monthly, quarterly, annual
  cover_config JSONB DEFAULT '{}'::jsonb, -- logo, subtitle, branding
  ai_narrative_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generated Board Packs
CREATE TABLE public.erp_hr_board_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  template_id UUID REFERENCES public.erp_hr_board_pack_templates(id),
  title TEXT NOT NULL,
  audience TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, reviewed, approved, distributed, archived
  executive_summary TEXT,
  ai_narrative JSONB DEFAULT '{}'::jsonb,
  key_metrics JSONB DEFAULT '[]'::jsonb,
  data_sources JSONB DEFAULT '[]'::jsonb, -- tracks origin of each data point
  disclaimers TEXT[] DEFAULT '{}',
  template_version TEXT,
  filters_applied JSONB DEFAULT '{}'::jsonb,
  modules_included TEXT[] DEFAULT '{}',
  generated_by UUID,
  generated_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Board Pack Sections (ordered content blocks)
CREATE TABLE public.erp_hr_board_pack_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_pack_id UUID NOT NULL REFERENCES public.erp_hr_board_packs(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL, -- 'headcount','fairness','compliance', etc
  title TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  content JSONB DEFAULT '{}'::jsonb, -- rendered content, charts, tables
  narrative TEXT, -- AI-generated narrative for this section
  data_source TEXT, -- 'real','synced','demo','derived'
  metrics JSONB DEFAULT '[]'::jsonb,
  alerts JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Distribution Log
CREATE TABLE public.erp_hr_board_pack_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_pack_id UUID NOT NULL REFERENCES public.erp_hr_board_packs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'download','email','dms','esign'
  recipient TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  metadata JSONB DEFAULT '{}'::jsonb,
  distributed_by UUID,
  distributed_at TIMESTAMPTZ DEFAULT now()
);

-- Review Log
CREATE TABLE public.erp_hr_board_pack_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_pack_id UUID NOT NULL REFERENCES public.erp_hr_board_packs(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'review','approve','reject','comment'
  reviewer_id UUID,
  reviewer_name TEXT,
  comments TEXT,
  previous_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.erp_hr_board_pack_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_board_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_board_pack_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_board_pack_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_board_pack_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage board pack templates" ON public.erp_hr_board_pack_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage board packs" ON public.erp_hr_board_packs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage board pack sections" ON public.erp_hr_board_pack_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage board pack distribution" ON public.erp_hr_board_pack_distribution FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage board pack reviews" ON public.erp_hr_board_pack_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default templates
INSERT INTO public.erp_hr_board_pack_templates (company_id, name, audience, description, sections, default_period) VALUES
('00000000-0000-0000-0000-000000000000', 'Consejo de Administración', 'board_directors', 'Board pack completo para Consejo de Administración', '["headcount","workforce_planning","fairness","compliance","legal","security","ai_governance","alerts","regulatory","integrations"]', 'quarterly'),
('00000000-0000-0000-0000-000000000000', 'Comité de Dirección', 'executive_committee', 'Informe ejecutivo para Comité de Dirección', '["headcount","workforce_planning","fairness","compliance","digital_twin","alerts","regulatory"]', 'monthly'),
('00000000-0000-0000-0000-000000000000', 'Comité de Auditoría', 'audit_committee', 'Board pack para Comité de Auditoría', '["compliance","security","ai_governance","fairness","legal","regulatory","alerts"]', 'quarterly'),
('00000000-0000-0000-0000-000000000000', 'Comité de Riesgos', 'risk_committee', 'Board pack para Comité de Riesgos', '["security","compliance","cnae","digital_twin","alerts","workforce_planning"]', 'quarterly'),
('00000000-0000-0000-0000-000000000000', 'Comité de Compliance', 'compliance_committee', 'Informe de cumplimiento normativo', '["compliance","legal","fairness","ai_governance","regulatory","alerts"]', 'monthly'),
('00000000-0000-0000-0000-000000000000', 'Comité Estratégico RRHH', 'hr_strategic', 'Board pack estratégico de RRHH', '["headcount","workforce_planning","fairness","digital_twin","cnae","compliance","alerts"]', 'monthly');
