
-- =====================================================
-- FISCAL AI AGENT - SPECIALIZED MODULE
-- Phase 1: Core Tables for AI Fiscal Agent
-- =====================================================

-- Table: Fiscal AI Agent Sessions
CREATE TABLE IF NOT EXISTS public.erp_fiscal_agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    session_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'compliance_check', 'entry_generation', 'regulation_query'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'error'
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    context JSONB DEFAULT '{}',
    actions_taken JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    compliance_issues JSONB DEFAULT '[]',
    tokens_used INTEGER DEFAULT 0,
    performed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: Fiscal Knowledge Base (Regulations per Jurisdiction)
CREATE TABLE IF NOT EXISTS public.erp_fiscal_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id UUID REFERENCES public.erp_tax_jurisdictions(id) ON DELETE CASCADE,
    knowledge_type TEXT NOT NULL, -- 'regulation', 'law', 'directive', 'circular', 'form_template', 'deadline_rule'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT,
    source_document TEXT,
    effective_date DATE,
    expiry_date DATE,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_verified_at TIMESTAMPTZ,
    verified_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: Fiscal Form Templates per Jurisdiction
CREATE TABLE IF NOT EXISTS public.erp_fiscal_form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id UUID REFERENCES public.erp_tax_jurisdictions(id) ON DELETE CASCADE,
    form_code TEXT NOT NULL, -- e.g., 'MOD303', 'MOD390', 'VAT100'
    form_name TEXT NOT NULL,
    form_description TEXT,
    form_type TEXT NOT NULL, -- 'vat_return', 'income_tax', 'withholding', 'informative', 'annual_summary'
    filing_frequency TEXT, -- 'monthly', 'quarterly', 'annual'
    due_day_rule JSONB, -- e.g., {"day": 20, "month_offset": 1, "business_days": true}
    template_fields JSONB NOT NULL DEFAULT '[]', -- Field definitions
    calculation_rules JSONB DEFAULT '{}', -- How to calculate each field
    source_url TEXT,
    is_mandatory BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: Fiscal Compliance Alerts
CREATE TABLE IF NOT EXISTS public.erp_fiscal_compliance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    jurisdiction_id UUID REFERENCES public.erp_tax_jurisdictions(id),
    alert_type TEXT NOT NULL, -- 'deadline_approaching', 'deadline_missed', 'regulation_change', 'compliance_error', 'entry_error', 'audit_risk'
    severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'error', 'critical'
    title TEXT NOT NULL,
    description TEXT,
    affected_entity_type TEXT, -- 'journal_entry', 'tax_return', 'form', 'registration'
    affected_entity_id UUID,
    recommended_action TEXT,
    auto_generated BOOLEAN DEFAULT true,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: Fiscal Agent Actions (Audit Trail)
CREATE TABLE IF NOT EXISTS public.erp_fiscal_agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.erp_fiscal_agent_sessions(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    action_type TEXT NOT NULL, -- 'journal_entry_created', 'alert_generated', 'regulation_applied', 'compliance_checked', 'recommendation_made'
    action_description TEXT NOT NULL,
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    confidence_score NUMERIC(5,2), -- 0-100
    was_approved BOOLEAN,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: Fiscal Regulation Updates Monitor
CREATE TABLE IF NOT EXISTS public.erp_fiscal_regulation_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id UUID REFERENCES public.erp_tax_jurisdictions(id) ON DELETE CASCADE,
    update_type TEXT NOT NULL, -- 'new_regulation', 'amendment', 'repeal', 'rate_change', 'deadline_change'
    title TEXT NOT NULL,
    summary TEXT,
    source_url TEXT,
    source_name TEXT,
    published_date DATE,
    effective_date DATE,
    impact_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    affected_forms TEXT[] DEFAULT '{}',
    affected_taxes TEXT[] DEFAULT '{}',
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    knowledge_base_id UUID REFERENCES public.erp_fiscal_knowledge_base(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: Company Fiscal Agent Configuration
CREATE TABLE IF NOT EXISTS public.erp_company_fiscal_agent_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE,
    agent_enabled BOOLEAN DEFAULT true,
    auto_generate_entries BOOLEAN DEFAULT false, -- If true, agent can auto-create journal entries
    auto_generate_alerts BOOLEAN DEFAULT true,
    require_approval_threshold NUMERIC(15,2) DEFAULT 10000, -- Entries above this need manual approval
    notification_days_before_deadline INTEGER DEFAULT 7,
    monitored_jurisdictions UUID[] DEFAULT '{}',
    custom_rules JSONB DEFAULT '{}',
    last_compliance_check TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fiscal_agent_sessions_company ON public.erp_fiscal_agent_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_agent_sessions_status ON public.erp_fiscal_agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_knowledge_base_jurisdiction ON public.erp_fiscal_knowledge_base(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_knowledge_base_type ON public.erp_fiscal_knowledge_base(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_fiscal_form_templates_jurisdiction ON public.erp_fiscal_form_templates(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_compliance_alerts_company ON public.erp_fiscal_compliance_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_compliance_alerts_severity ON public.erp_fiscal_compliance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_fiscal_compliance_alerts_unresolved ON public.erp_fiscal_compliance_alerts(company_id) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_fiscal_agent_actions_session ON public.erp_fiscal_agent_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_regulation_updates_jurisdiction ON public.erp_fiscal_regulation_updates(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_regulation_updates_unprocessed ON public.erp_fiscal_regulation_updates(jurisdiction_id) WHERE is_processed = false;

-- Enable RLS
ALTER TABLE public.erp_fiscal_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_fiscal_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_fiscal_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_fiscal_compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_fiscal_agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_fiscal_regulation_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_company_fiscal_agent_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge base and forms (readable by all authenticated)
CREATE POLICY "fiscal_knowledge_base_read" ON public.erp_fiscal_knowledge_base
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "fiscal_form_templates_read" ON public.erp_fiscal_form_templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "fiscal_regulation_updates_read" ON public.erp_fiscal_regulation_updates
    FOR SELECT TO authenticated USING (true);

-- RLS Policies for company-specific data
CREATE POLICY "fiscal_agent_sessions_access" ON public.erp_fiscal_agent_sessions
    FOR ALL TO authenticated
    USING (public.erp_user_has_company_access(company_id))
    WITH CHECK (public.erp_user_has_company_access(company_id));

CREATE POLICY "fiscal_compliance_alerts_access" ON public.erp_fiscal_compliance_alerts
    FOR ALL TO authenticated
    USING (public.erp_user_has_company_access(company_id))
    WITH CHECK (public.erp_user_has_company_access(company_id));

CREATE POLICY "fiscal_agent_actions_access" ON public.erp_fiscal_agent_actions
    FOR ALL TO authenticated
    USING (public.erp_user_has_company_access(company_id))
    WITH CHECK (public.erp_user_has_company_access(company_id));

CREATE POLICY "fiscal_agent_config_access" ON public.erp_company_fiscal_agent_config
    FOR ALL TO authenticated
    USING (public.erp_user_has_company_access(company_id))
    WITH CHECK (public.erp_user_has_company_access(company_id));

-- Triggers for updated_at
CREATE TRIGGER trg_fiscal_agent_sessions_updated
    BEFORE UPDATE ON public.erp_fiscal_agent_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_fiscal_knowledge_base_updated
    BEFORE UPDATE ON public.erp_fiscal_knowledge_base
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_fiscal_form_templates_updated
    BEFORE UPDATE ON public.erp_fiscal_form_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_fiscal_compliance_alerts_updated
    BEFORE UPDATE ON public.erp_fiscal_compliance_alerts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_fiscal_agent_config_updated
    BEFORE UPDATE ON public.erp_company_fiscal_agent_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_fiscal_compliance_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_fiscal_agent_sessions;

-- =====================================================
-- SEED DATA: Spanish Fiscal Knowledge Base (SII/IVA)
-- =====================================================

INSERT INTO public.erp_fiscal_knowledge_base (jurisdiction_id, knowledge_type, title, content, source_url, effective_date, tags) VALUES
-- Spain SII
((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'ES_SII'), 'regulation', 'Real Decreto 596/2016 - SII', 
'El Suministro Inmediato de Información (SII) es un sistema de gestión del IVA basado en el suministro electrónico de los registros de facturación. Obligatorio para: Grandes empresas (facturación >6M€), grupos IVA, inscritos en REDEME. Plazos: 4 días naturales para facturas emitidas, 4 días para facturas recibidas desde registro contable. Libro registro de bienes de inversión: antes del 30 de enero del año siguiente.',
'https://www.boe.es/buscar/act.php?id=BOE-A-2016-11575', '2017-07-01', ARRAY['sii', 'iva', 'facturacion']),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'ES_SII'), 'regulation', 'Ley 37/1992 del IVA - Tipos impositivos',
'Tipos de IVA vigentes en España: General 21%, Reducido 10% (alimentos, transporte, hostelería), Superreducido 4% (pan, leche, libros, medicamentos). Operaciones exentas: sanidad, educación, seguros, operaciones financieras. Régimen especial de bienes usados, agencias de viajes, recargo de equivalencia.',
'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740', '1993-01-01', ARRAY['iva', 'tipos', 'exenciones']),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'ES_SII'), 'deadline_rule', 'Plazos SII - Facturas emitidas',
'Las facturas emitidas deben comunicarse en un plazo de 4 días naturales desde la expedición de la factura (excluyendo sábados, domingos y festivos nacionales). En caso de facturas simplificadas, el plazo es de 4 días desde la fecha de la operación. Para facturas rectificativas, el plazo es de 4 días desde la fecha de expedición.',
NULL, '2017-07-01', ARRAY['sii', 'plazos', 'facturas']),

-- Spain IVA Forms
((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'ES_VAT'), 'regulation', 'Modelo 303 - Autoliquidación IVA',
'Declaración trimestral del IVA para empresarios y profesionales. Contenido: IVA devengado (ventas), IVA soportado deducible (compras), resultado a ingresar o compensar. Plazos: 1-20 abril (1T), 1-20 julio (2T), 1-20 octubre (3T), 1-30 enero (4T). Grandes empresas: declaración mensual.',
'https://sede.agenciatributaria.gob.es', '2023-01-01', ARRAY['iva', 'modelo303', 'trimestral']),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'ES_VAT'), 'regulation', 'Modelo 390 - Resumen anual IVA',
'Declaración-resumen anual del IVA. Incluye: total operaciones del ejercicio, IVA devengado y soportado anual, regularizaciones, resultado final. Plazo: 1-30 enero del año siguiente. Exentos: sujetos al SII (ya proporcionan información en tiempo real).',
'https://sede.agenciatributaria.gob.es', '2023-01-01', ARRAY['iva', 'modelo390', 'anual']);

-- Insert Spanish form templates
INSERT INTO public.erp_fiscal_form_templates (jurisdiction_id, form_code, form_name, form_description, form_type, filing_frequency, due_day_rule, template_fields, is_mandatory) VALUES
((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'ES_VAT'), 'MOD303', 'Modelo 303 - Autoliquidación IVA', 
'Declaración trimestral/mensual del Impuesto sobre el Valor Añadido', 'vat_return', 'quarterly',
'{"day": 20, "month_offset": 1, "q4_special": {"day": 30, "month": 1}}',
'[
  {"code": "01", "name": "Base imponible tipo general", "type": "amount", "calculation": "sum_sales_21"},
  {"code": "02", "name": "Cuota tipo general 21%", "type": "amount", "calculation": "base_01 * 0.21"},
  {"code": "03", "name": "Base imponible tipo reducido", "type": "amount", "calculation": "sum_sales_10"},
  {"code": "04", "name": "Cuota tipo reducido 10%", "type": "amount", "calculation": "base_03 * 0.10"},
  {"code": "05", "name": "Base imponible tipo superreducido", "type": "amount", "calculation": "sum_sales_4"},
  {"code": "06", "name": "Cuota tipo superreducido 4%", "type": "amount", "calculation": "base_05 * 0.04"},
  {"code": "27", "name": "Total IVA devengado", "type": "amount", "calculation": "sum(02,04,06)"},
  {"code": "28", "name": "IVA deducible operaciones interiores", "type": "amount", "calculation": "sum_deductible_domestic"},
  {"code": "29", "name": "IVA deducible importaciones", "type": "amount", "calculation": "sum_deductible_imports"},
  {"code": "30", "name": "IVA deducible adquisiciones intracomunitarias", "type": "amount", "calculation": "sum_deductible_eu"},
  {"code": "45", "name": "Total a deducir", "type": "amount", "calculation": "sum(28,29,30)"},
  {"code": "46", "name": "Diferencia", "type": "amount", "calculation": "27 - 45"},
  {"code": "71", "name": "Resultado liquidación", "type": "amount", "calculation": "final_result"}
]'::jsonb, true),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'ES_VAT'), 'MOD390', 'Modelo 390 - Resumen anual IVA',
'Declaración-resumen anual del IVA', 'annual_summary', 'annual',
'{"day": 30, "month": 1}',
'[
  {"code": "01", "name": "Total base imponible general", "type": "amount"},
  {"code": "02", "name": "Total cuota general", "type": "amount"},
  {"code": "03", "name": "Total base imponible reducido", "type": "amount"},
  {"code": "04", "name": "Total cuota reducido", "type": "amount"},
  {"code": "64", "name": "Total IVA devengado ejercicio", "type": "amount"},
  {"code": "65", "name": "Total IVA deducible ejercicio", "type": "amount"},
  {"code": "86", "name": "Resultado ejercicio", "type": "amount"}
]'::jsonb, true),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'ES_VAT'), 'MOD349', 'Modelo 349 - Operaciones Intracomunitarias',
'Declaración recapitulativa de operaciones intracomunitarias', 'informative', 'quarterly',
'{"day": 20, "month_offset": 1}',
'[
  {"code": "A", "name": "Entregas intracomunitarias de bienes", "type": "detail_list"},
  {"code": "E", "name": "Adquisiciones intracomunitarias de bienes", "type": "detail_list"},
  {"code": "S", "name": "Prestaciones de servicios", "type": "detail_list"},
  {"code": "I", "name": "Adquisiciones de servicios", "type": "detail_list"}
]'::jsonb, true);

-- Insert EU VAT knowledge
INSERT INTO public.erp_fiscal_knowledge_base (jurisdiction_id, knowledge_type, title, content, source_url, effective_date, tags) VALUES
((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'EU_VAT_DE'), 'regulation', 'Umsatzsteuergesetz (UStG) - Alemania',
'IVA alemán (Mehrwertsteuer/Umsatzsteuer): Tipo general 19%, reducido 7% (alimentos básicos, libros, transporte). Declaraciones: mensual o trimestral según volumen. Zusammenfassende Meldung (ZM) para operaciones intracomunitarias. Plazos: día 10 del mes siguiente.',
'https://www.gesetze-im-internet.de/ustg_1980/', '2021-01-01', ARRAY['vat', 'germany', 'umsatzsteuer']),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'EU_VAT_FR'), 'regulation', 'TVA France - Code général des impôts',
'TVA francesa: Normal 20%, intermédiaire 10%, réduit 5.5%, super-réduit 2.1%. Déclaration CA3 mensual o trimestral. DES para operaciones intracomunitarias. Autoliquidación para servicios B2B extranjeros.',
'https://www.legifrance.gouv.fr', '2023-01-01', ARRAY['tva', 'france', 'vat']),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'UK_VAT'), 'regulation', 'UK VAT - Making Tax Digital',
'VAT Rate: Standard 20%, Reduced 5%, Zero 0%. MTD requirements: digital records, quarterly submissions via API. VAT100 return quarterly. EC Sales List discontinued post-Brexit, replaced with Intrastat for NI only.',
'https://www.gov.uk/government/publications/vat-notice-700', '2022-04-01', ARRAY['vat', 'uk', 'mtd']),

-- US LLC Knowledge
((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'US_LLC_DE'), 'regulation', 'Delaware LLC - Franchise Tax',
'Delaware LLC annual franchise tax: $300 flat fee, due June 1. No income tax for LLCs with no Delaware-source income. Annual Report required. Registered agent mandatory. Series LLC available.',
'https://corp.delaware.gov', '2024-01-01', ARRAY['llc', 'delaware', 'franchise_tax']),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'US_LLC_WY'), 'regulation', 'Wyoming LLC - Annual Report',
'Wyoming LLC: No state income tax. Annual report fee: $60 or $60 per $250,000 of assets (whichever greater). Due: first day of anniversary month. No franchise tax.',
'https://sos.wyo.gov', '2024-01-01', ARRAY['llc', 'wyoming', 'annual_report']),

-- UAE Knowledge
((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'AE_VAT'), 'regulation', 'UAE VAT Federal Decree-Law No. 8/2017',
'UAE VAT: Standard rate 5%. Registration threshold: AED 375,000 mandatory, AED 187,500 voluntary. Zero-rated: exports, international transport, first supply of residential property, healthcare, education. VAT Return quarterly or monthly.',
'https://tax.gov.ae', '2018-01-01', ARRAY['vat', 'uae', 'gcc']),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'AE_DIFC'), 'regulation', 'DIFC - Dubai International Financial Centre',
'DIFC: 0% income tax guaranteed until 2054. No withholding tax. No foreign exchange controls. Common law jurisdiction. Annual license renewal. DFSA regulated for financial services.',
'https://www.difc.ae', '2024-01-01', ARRAY['difc', 'dubai', 'free_zone']),

-- Andorra Knowledge
((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'AD_IGI'), 'regulation', 'Impost General Indirecte (IGI) - Andorra',
'IGI andorrano: Tipo general 4.5%, reducido 1% (alimentos básicos), superreducido 0% (sanidad, educación), incrementado 9.5% (servicios bancarios). Declaración trimestral. Umbral exención: 40.000€ anuales.',
'https://www.govern.ad', '2023-01-01', ARRAY['igi', 'andorra', 'iva']);

-- Insert form templates for other jurisdictions
INSERT INTO public.erp_fiscal_form_templates (jurisdiction_id, form_code, form_name, form_description, form_type, filing_frequency, due_day_rule, template_fields, is_mandatory) VALUES
((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'UK_VAT'), 'VAT100', 'VAT Return',
'Quarterly VAT return submitted via MTD', 'vat_return', 'quarterly',
'{"day": 7, "month_offset": 2}',
'[
  {"code": "Box1", "name": "VAT due on sales", "type": "amount"},
  {"code": "Box2", "name": "VAT due on acquisitions from EU", "type": "amount"},
  {"code": "Box3", "name": "Total VAT due", "type": "amount"},
  {"code": "Box4", "name": "VAT reclaimed on purchases", "type": "amount"},
  {"code": "Box5", "name": "Net VAT to pay/reclaim", "type": "amount"},
  {"code": "Box6", "name": "Total value of sales", "type": "amount"},
  {"code": "Box7", "name": "Total value of purchases", "type": "amount"}
]'::jsonb, true),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'US_LLC_DE'), 'DE-FRAN', 'Delaware Franchise Tax',
'Annual franchise tax for Delaware LLCs', 'income_tax', 'annual',
'{"day": 1, "month": 6}',
'[
  {"code": "flat_fee", "name": "Franchise Tax (flat)", "type": "amount", "default": 300}
]'::jsonb, true),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'AE_VAT'), 'VAT201', 'UAE VAT Return',
'Quarterly/Monthly VAT return for UAE', 'vat_return', 'quarterly',
'{"day": 28, "month_offset": 1}',
'[
  {"code": "1a", "name": "Standard rated supplies", "type": "amount"},
  {"code": "1b", "name": "VAT on standard rated supplies", "type": "amount"},
  {"code": "2", "name": "Zero rated supplies", "type": "amount"},
  {"code": "3", "name": "Exempt supplies", "type": "amount"},
  {"code": "9", "name": "Recoverable VAT", "type": "amount"},
  {"code": "14", "name": "Net VAT due", "type": "amount"}
]'::jsonb, true),

((SELECT id FROM public.erp_tax_jurisdictions WHERE code = 'AD_IGI'), 'DEC-IGI', 'Declaració IGI',
'Declaración trimestral del IGI andorrano', 'vat_return', 'quarterly',
'{"day": 20, "month_offset": 1}',
'[
  {"code": "A", "name": "Base imposable 4.5%", "type": "amount"},
  {"code": "B", "name": "Quota 4.5%", "type": "amount"},
  {"code": "C", "name": "Base imposable 1%", "type": "amount"},
  {"code": "D", "name": "Quota 1%", "type": "amount"},
  {"code": "E", "name": "Base imposable 9.5%", "type": "amount"},
  {"code": "F", "name": "Quota 9.5%", "type": "amount"},
  {"code": "G", "name": "Total IGI repercutit", "type": "amount"},
  {"code": "H", "name": "IGI suportat deduïble", "type": "amount"},
  {"code": "I", "name": "Resultat", "type": "amount"}
]'::jsonb, true);
