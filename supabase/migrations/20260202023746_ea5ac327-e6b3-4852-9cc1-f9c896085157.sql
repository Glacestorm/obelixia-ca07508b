-- =====================================================
-- MÓDULO JURÍDICO ENTERPRISE - FASE 1: INFRAESTRUCTURA
-- Base de datos para Asesor Legal IA Multi-Agente
-- =====================================================

-- 1. LEGAL JURISDICTIONS - Configuración de jurisdicciones
CREATE TABLE public.legal_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country_codes TEXT[] NOT NULL,
  legal_system TEXT NOT NULL, -- 'civil_law', 'common_law', 'mixed'
  primary_language TEXT NOT NULL,
  currency_code TEXT,
  regulatory_bodies JSONB DEFAULT '[]',
  official_gazettes JSONB DEFAULT '[]', -- BOE, DOGC, BOPA, etc.
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar jurisdicciones base
INSERT INTO public.legal_jurisdictions (code, name, country_codes, legal_system, primary_language, currency_code, regulatory_bodies, official_gazettes) VALUES
('ES', 'España', ARRAY['ES'], 'civil_law', 'es', 'EUR', '["BOE", "AEAT", "CNMV", "AEPD"]', '["BOE", "DOGC", "BOPV", "DOCM"]'),
('AD', 'Andorra', ARRAY['AD'], 'civil_law', 'ca', 'EUR', '["BOPA", "AFA", "APDA"]', '["BOPA"]'),
('EU', 'Unión Europea', ARRAY['EU'], 'civil_law', 'en', 'EUR', '["European Commission", "ECB", "EBA", "ESMA"]', '["OJEU"]'),
('UK', 'Reino Unido', ARRAY['GB'], 'common_law', 'en', 'GBP', '["FCA", "ICO", "CMA"]', '["UK Gazette"]'),
('AE', 'Emiratos Árabes Unidos', ARRAY['AE'], 'mixed', 'ar', 'AED', '["DIFC", "ADGM", "SCA"]', '["Official Gazette UAE"]'),
('US', 'Estados Unidos', ARRAY['US'], 'common_law', 'en', 'USD', '["SEC", "FTC", "DOL", "IRS"]', '["Federal Register"]');

-- 2. LEGAL KNOWLEDGE BASE - Base de conocimiento jurídico
CREATE TABLE public.legal_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN ('law', 'regulation', 'precedent', 'doctrine', 'template', 'circular', 'convention', 'treaty')),
  jurisdiction_id UUID REFERENCES public.legal_jurisdictions(id),
  jurisdiction_code TEXT NOT NULL,
  legal_area TEXT NOT NULL CHECK (legal_area IN ('labor', 'corporate', 'tax', 'data_protection', 'banking', 'contract', 'criminal', 'administrative', 'international', 'intellectual_property')),
  sub_area TEXT,
  reference_code TEXT, -- Ej: "RD 1/1995", "GDPR Art. 6"
  effective_date DATE,
  expiry_date DATE,
  source_url TEXT,
  source_name TEXT,
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  related_articles TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. LEGAL CASE TEMPLATES - Plantillas de casos y contratos
CREATE TABLE public.legal_case_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('contract', 'complaint', 'response', 'motion', 'agreement', 'policy', 'notice', 'letter', 'memo', 'report')),
  legal_area TEXT NOT NULL,
  jurisdiction_code TEXT NOT NULL,
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- Variables a rellenar
  required_fields JSONB DEFAULT '[]',
  optional_fields JSONB DEFAULT '[]',
  example_filled TEXT,
  usage_instructions TEXT,
  version TEXT DEFAULT '1.0',
  is_official BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. LEGAL AGENT QUERIES - Consultas de otros agentes IA
CREATE TABLE public.legal_agent_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_agent TEXT NOT NULL,
  requesting_agent_type TEXT NOT NULL, -- 'hr', 'fiscal', 'crm', 'erp', 'supervisor'
  query_type TEXT NOT NULL CHECK (query_type IN ('validation', 'consultation', 'contract_analysis', 'compliance_check', 'precedent_search', 'risk_assessment', 'document_generation')),
  query_content JSONB NOT NULL,
  context JSONB DEFAULT '{}',
  jurisdictions TEXT[] DEFAULT '{}',
  urgency TEXT DEFAULT 'standard' CHECK (urgency IN ('immediate', 'standard', 'scheduled')),
  response JSONB,
  approved BOOLEAN,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  legal_basis TEXT[] DEFAULT '{}',
  conditions TEXT[] DEFAULT '{}',
  warnings TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  was_helpful BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- 5. LEGAL VALIDATION LOGS - Registro de validaciones legales
CREATE TABLE public.legal_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT,
  action_data JSONB NOT NULL,
  validation_result JSONB NOT NULL,
  is_approved BOOLEAN NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  legal_basis TEXT[] DEFAULT '{}',
  applicable_regulations TEXT[] DEFAULT '{}',
  warnings TEXT[] DEFAULT '{}',
  blocking_issues TEXT[] DEFAULT '{}',
  conditions_required TEXT[] DEFAULT '{}',
  jurisdictions_checked TEXT[] DEFAULT '{}',
  processing_time_ms INTEGER,
  auto_approved BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. LEGAL PRECEDENTS - Base de precedentes judiciales
CREATE TABLE public.legal_precedents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL,
  case_name TEXT NOT NULL,
  court_name TEXT NOT NULL,
  court_level TEXT NOT NULL, -- 'supreme', 'appeal', 'high', 'district', 'tribunal'
  jurisdiction_code TEXT NOT NULL,
  legal_area TEXT NOT NULL,
  decision_date DATE NOT NULL,
  decision_type TEXT NOT NULL, -- 'ruling', 'order', 'judgment', 'decree'
  summary TEXT NOT NULL,
  key_holdings TEXT[] DEFAULT '{}',
  legal_principles TEXT[] DEFAULT '{}',
  full_text TEXT,
  source_url TEXT,
  citations TEXT[] DEFAULT '{}', -- Casos citados
  cited_by TEXT[] DEFAULT '{}', -- Casos que lo citan
  keywords TEXT[] DEFAULT '{}',
  relevance_score DECIMAL(3,2) DEFAULT 0,
  is_landmark BOOLEAN DEFAULT false,
  is_overruled BOOLEAN DEFAULT false,
  overruled_by TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. LEGAL REGULATION UPDATES - Actualizaciones normativas
CREATE TABLE public.legal_regulation_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_name TEXT NOT NULL,
  regulation_code TEXT,
  update_type TEXT NOT NULL CHECK (update_type IN ('new', 'amendment', 'repeal', 'clarification', 'interpretation', 'deadline')),
  jurisdiction_code TEXT NOT NULL,
  legal_area TEXT NOT NULL,
  source_gazette TEXT,
  publication_date DATE NOT NULL,
  effective_date DATE,
  summary TEXT NOT NULL,
  full_content TEXT,
  impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  affected_areas TEXT[] DEFAULT '{}',
  affected_agents TEXT[] DEFAULT '{}', -- Agentes IA afectados
  action_required TEXT,
  deadline DATE,
  source_url TEXT,
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  notifications_sent BOOLEAN DEFAULT false,
  notifications_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. LEGAL CONTRACTS - Contratos analizados/generados
CREATE TABLE public.legal_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_name TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  parties JSONB NOT NULL, -- Array de partes del contrato
  jurisdiction_code TEXT NOT NULL,
  legal_area TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'signed', 'active', 'expired', 'terminated')),
  content TEXT,
  analysis_result JSONB,
  risk_score DECIMAL(3,2),
  risk_factors JSONB DEFAULT '[]',
  clauses_analysis JSONB DEFAULT '[]',
  recommendations TEXT[] DEFAULT '{}',
  key_dates JSONB DEFAULT '{}',
  monetary_values JSONB DEFAULT '{}',
  template_id UUID REFERENCES public.legal_case_templates(id),
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. LEGAL COMPLIANCE CHECKS - Verificaciones de cumplimiento
CREATE TABLE public.legal_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'company', 'department', 'process', 'agent'
  entity_id TEXT,
  regulations_checked TEXT[] NOT NULL,
  jurisdictions TEXT[] NOT NULL,
  overall_status TEXT CHECK (overall_status IN ('compliant', 'partial', 'non_compliant', 'pending')),
  overall_score DECIMAL(5,2),
  detailed_results JSONB NOT NULL,
  gaps_identified JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  next_review_date DATE,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. LEGAL RISK ASSESSMENTS - Evaluaciones de riesgo legal
CREATE TABLE public.legal_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_name TEXT NOT NULL,
  scenario_description TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  jurisdictions TEXT[] NOT NULL,
  legal_areas TEXT[] NOT NULL,
  overall_risk_level TEXT CHECK (overall_risk_level IN ('low', 'medium', 'high', 'critical')),
  overall_risk_score DECIMAL(5,2),
  risk_factors JSONB NOT NULL,
  potential_consequences JSONB DEFAULT '[]',
  mitigation_strategies JSONB DEFAULT '[]',
  legal_basis TEXT[] DEFAULT '{}',
  precedents_considered TEXT[] DEFAULT '{}',
  confidence_score DECIMAL(3,2),
  recommendations TEXT[] DEFAULT '{}',
  performed_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_legal_knowledge_jurisdiction ON public.legal_knowledge_base(jurisdiction_code);
CREATE INDEX idx_legal_knowledge_area ON public.legal_knowledge_base(legal_area);
CREATE INDEX idx_legal_knowledge_type ON public.legal_knowledge_base(knowledge_type);
CREATE INDEX idx_legal_knowledge_active ON public.legal_knowledge_base(is_active);
CREATE INDEX idx_legal_knowledge_tags ON public.legal_knowledge_base USING GIN(tags);
CREATE INDEX idx_legal_knowledge_keywords ON public.legal_knowledge_base USING GIN(keywords);

CREATE INDEX idx_legal_queries_agent ON public.legal_agent_queries(requesting_agent);
CREATE INDEX idx_legal_queries_type ON public.legal_agent_queries(query_type);
CREATE INDEX idx_legal_queries_created ON public.legal_agent_queries(created_at DESC);

CREATE INDEX idx_legal_validations_agent ON public.legal_validation_logs(agent_id);
CREATE INDEX idx_legal_validations_approved ON public.legal_validation_logs(is_approved);
CREATE INDEX idx_legal_validations_created ON public.legal_validation_logs(created_at DESC);

CREATE INDEX idx_legal_precedents_jurisdiction ON public.legal_precedents(jurisdiction_code);
CREATE INDEX idx_legal_precedents_area ON public.legal_precedents(legal_area);
CREATE INDEX idx_legal_precedents_court ON public.legal_precedents(court_name);
CREATE INDEX idx_legal_precedents_date ON public.legal_precedents(decision_date DESC);
CREATE INDEX idx_legal_precedents_keywords ON public.legal_precedents USING GIN(keywords);

CREATE INDEX idx_legal_reg_updates_jurisdiction ON public.legal_regulation_updates(jurisdiction_code);
CREATE INDEX idx_legal_reg_updates_area ON public.legal_regulation_updates(legal_area);
CREATE INDEX idx_legal_reg_updates_effective ON public.legal_regulation_updates(effective_date);
CREATE INDEX idx_legal_reg_updates_processed ON public.legal_regulation_updates(is_processed);

CREATE INDEX idx_legal_contracts_type ON public.legal_contracts(contract_type);
CREATE INDEX idx_legal_contracts_status ON public.legal_contracts(status);
CREATE INDEX idx_legal_contracts_jurisdiction ON public.legal_contracts(jurisdiction_code);

CREATE INDEX idx_legal_templates_type ON public.legal_case_templates(template_type);
CREATE INDEX idx_legal_templates_area ON public.legal_case_templates(legal_area);
CREATE INDEX idx_legal_templates_jurisdiction ON public.legal_case_templates(jurisdiction_code);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.legal_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_agent_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_precedents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_regulation_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_risk_assessments ENABLE ROW LEVEL SECURITY;

-- Políticas para legal_jurisdictions (lectura pública)
CREATE POLICY "Jurisdictions viewable by authenticated users"
ON public.legal_jurisdictions FOR SELECT
TO authenticated
USING (true);

-- Políticas para legal_knowledge_base
CREATE POLICY "Knowledge base viewable by authenticated users"
ON public.legal_knowledge_base FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Users can create knowledge entries"
ON public.legal_knowledge_base FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own knowledge entries"
ON public.legal_knowledge_base FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Políticas para legal_case_templates
CREATE POLICY "Templates viewable by authenticated users"
ON public.legal_case_templates FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Users can create templates"
ON public.legal_case_templates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Políticas para legal_agent_queries (sistema a sistema)
CREATE POLICY "Agent queries viewable by authenticated users"
ON public.legal_agent_queries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can create agent queries"
ON public.legal_agent_queries FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update agent queries"
ON public.legal_agent_queries FOR UPDATE
TO authenticated
USING (true);

-- Políticas para legal_validation_logs
CREATE POLICY "Validation logs viewable by authenticated users"
ON public.legal_validation_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can create validation logs"
ON public.legal_validation_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Políticas para legal_precedents
CREATE POLICY "Precedents viewable by authenticated users"
ON public.legal_precedents FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Users can create precedents"
ON public.legal_precedents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Políticas para legal_regulation_updates
CREATE POLICY "Regulation updates viewable by authenticated users"
ON public.legal_regulation_updates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can create regulation updates"
ON public.legal_regulation_updates FOR INSERT
TO authenticated
WITH CHECK (true);

-- Políticas para legal_contracts
CREATE POLICY "Users can view own contracts"
ON public.legal_contracts FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can create contracts"
ON public.legal_contracts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own contracts"
ON public.legal_contracts FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Políticas para legal_compliance_checks
CREATE POLICY "Users can view compliance checks"
ON public.legal_compliance_checks FOR SELECT
TO authenticated
USING (auth.uid() = performed_by);

CREATE POLICY "Users can create compliance checks"
ON public.legal_compliance_checks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = performed_by);

-- Políticas para legal_risk_assessments
CREATE POLICY "Users can view risk assessments"
ON public.legal_risk_assessments FOR SELECT
TO authenticated
USING (auth.uid() = performed_by);

CREATE POLICY "Users can create risk assessments"
ON public.legal_risk_assessments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = performed_by);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_legal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_legal_knowledge_updated_at
BEFORE UPDATE ON public.legal_knowledge_base
FOR EACH ROW EXECUTE FUNCTION public.update_legal_updated_at();

CREATE TRIGGER update_legal_templates_updated_at
BEFORE UPDATE ON public.legal_case_templates
FOR EACH ROW EXECUTE FUNCTION public.update_legal_updated_at();

CREATE TRIGGER update_legal_precedents_updated_at
BEFORE UPDATE ON public.legal_precedents
FOR EACH ROW EXECUTE FUNCTION public.update_legal_updated_at();

CREATE TRIGGER update_legal_contracts_updated_at
BEFORE UPDATE ON public.legal_contracts
FOR EACH ROW EXECUTE FUNCTION public.update_legal_updated_at();

CREATE TRIGGER update_legal_compliance_updated_at
BEFORE UPDATE ON public.legal_compliance_checks
FOR EACH ROW EXECUTE FUNCTION public.update_legal_updated_at();

CREATE TRIGGER update_legal_risk_updated_at
BEFORE UPDATE ON public.legal_risk_assessments
FOR EACH ROW EXECUTE FUNCTION public.update_legal_updated_at();

CREATE TRIGGER update_legal_reg_updates_updated_at
BEFORE UPDATE ON public.legal_regulation_updates
FOR EACH ROW EXECUTE FUNCTION public.update_legal_updated_at();

CREATE TRIGGER update_legal_jurisdictions_updated_at
BEFORE UPDATE ON public.legal_jurisdictions
FOR EACH ROW EXECUTE FUNCTION public.update_legal_updated_at();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_agent_queries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_validation_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_regulation_updates;