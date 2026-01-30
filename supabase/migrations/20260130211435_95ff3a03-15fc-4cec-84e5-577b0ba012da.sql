-- ============================================
-- MÓDULO FISCAL AVANZADO - MIGRACIÓN COMPLETA
-- Función de acceso + Tablas + RLS + Datos
-- ============================================

-- ========== SECURITY DEFINER FUNCTION ==========

CREATE OR REPLACE FUNCTION public.erp_user_has_company_access(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM erp_user_companies
    WHERE user_id = auth.uid()
      AND company_id = p_company_id
      AND is_active = true
  )
$$;

-- ========== SII TASKS TABLE ==========

CREATE TABLE IF NOT EXISTS public.erp_sii_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  record_id UUID,
  shipment_id UUID,
  task_type TEXT NOT NULL DEFAULT 'correction',
  priority INTEGER DEFAULT 2,
  assigned_to_user_id UUID,
  status TEXT DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT,
  error_code TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========== GLOBAL TAX JURISDICTIONS ==========

CREATE TABLE IF NOT EXISTS public.erp_tax_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  jurisdiction_type TEXT NOT NULL DEFAULT 'other',
  standard_tax_rate NUMERIC(5,2),
  reduced_tax_rates JSONB,
  tax_id_format TEXT,
  tax_id_label TEXT DEFAULT 'Tax ID',
  filing_frequency TEXT DEFAULT 'quarterly',
  reporting_requirements JSONB,
  special_rules JSONB,
  calendar_rules JSONB,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========== COMPANY JURISDICTIONS ==========

CREATE TABLE IF NOT EXISTS public.erp_company_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  jurisdiction_id UUID NOT NULL REFERENCES public.erp_tax_jurisdictions(id) ON DELETE CASCADE,
  tax_registration_number TEXT,
  registration_date DATE,
  status TEXT DEFAULT 'active',
  filing_calendar JSONB,
  next_filing_date DATE,
  last_filing_date DATE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, jurisdiction_id)
);

-- ========== TAX CALENDAR EVENTS ==========

CREATE TABLE IF NOT EXISTS public.erp_tax_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  jurisdiction_id UUID REFERENCES public.erp_tax_jurisdictions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  reminder_date DATE,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  amount NUMERIC(15,2),
  reference TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========== INDEXES ==========

CREATE INDEX IF NOT EXISTS idx_sii_tasks_company ON public.erp_sii_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_sii_tasks_status ON public.erp_sii_tasks(status);
CREATE INDEX IF NOT EXISTS idx_company_jurisdictions_company ON public.erp_company_jurisdictions(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_calendar_company ON public.erp_tax_calendar_events(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_calendar_due_date ON public.erp_tax_calendar_events(due_date);

-- ========== RLS POLICIES ==========

ALTER TABLE public.erp_sii_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_tax_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_company_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_tax_calendar_events ENABLE ROW LEVEL SECURITY;

-- Jurisdictions readable by all authenticated users
DROP POLICY IF EXISTS "Jurisdictions readable by all" ON public.erp_tax_jurisdictions;
CREATE POLICY "Jurisdictions readable by all" ON public.erp_tax_jurisdictions
  FOR SELECT TO authenticated USING (true);

-- Company-scoped policies using security definer
DROP POLICY IF EXISTS "SII tasks by company" ON public.erp_sii_tasks;
CREATE POLICY "SII tasks by company" ON public.erp_sii_tasks
  FOR ALL TO authenticated USING (public.erp_user_has_company_access(company_id));

DROP POLICY IF EXISTS "Company jurisdictions by company" ON public.erp_company_jurisdictions;
CREATE POLICY "Company jurisdictions by company" ON public.erp_company_jurisdictions
  FOR ALL TO authenticated USING (public.erp_user_has_company_access(company_id));

DROP POLICY IF EXISTS "Tax calendar by company" ON public.erp_tax_calendar_events;
CREATE POLICY "Tax calendar by company" ON public.erp_tax_calendar_events
  FOR ALL TO authenticated USING (public.erp_user_has_company_access(company_id));

-- ========== REALTIME ==========

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_sii_tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_tax_calendar_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== TRIGGERS ==========

DROP TRIGGER IF EXISTS update_erp_sii_tasks_updated_at ON public.erp_sii_tasks;
CREATE TRIGGER update_erp_sii_tasks_updated_at
  BEFORE UPDATE ON public.erp_sii_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_erp_company_jurisdictions_updated_at ON public.erp_company_jurisdictions;
CREATE TRIGGER update_erp_company_jurisdictions_updated_at
  BEFORE UPDATE ON public.erp_company_jurisdictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_erp_tax_calendar_events_updated_at ON public.erp_tax_calendar_events;
CREATE TRIGGER update_erp_tax_calendar_events_updated_at
  BEFORE UPDATE ON public.erp_tax_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== INSERT GLOBAL JURISDICTIONS ==========

INSERT INTO public.erp_tax_jurisdictions (code, name, country_code, jurisdiction_type, standard_tax_rate, tax_id_format, tax_id_label, filing_frequency, reporting_requirements, special_rules, display_order)
SELECT code, name, country_code, jurisdiction_type, standard_tax_rate, tax_id_format, tax_id_label, filing_frequency, reporting_requirements, special_rules, display_order
FROM (VALUES
  ('ES_SII', 'España - SII/IVA', 'ES', 'eu_vat', 21.00::numeric, '^[A-Z][0-9]{8}$|^[0-9]{8}[A-Z]$', 'NIF/CIF', 'monthly', '["SII", "Modelo 303", "Modelo 390", "Modelo 349"]'::jsonb, '{"sii_required": true, "intrastat_threshold": 400000}'::jsonb, 1),
  ('EU_OSS', 'UE - One Stop Shop', 'EU', 'eu_vat', NULL, NULL, 'VAT Number', 'quarterly', '["OSS Declaration", "Intrastat"]'::jsonb, '{"cross_border": true}'::jsonb, 2),
  ('DE_VAT', 'Alemania - USt', 'DE', 'eu_vat', 19.00, '^DE[0-9]{9}$', 'USt-IdNr', 'monthly', '["UStVA", "USt Jahreserklärung", "Intrastat"]'::jsonb, NULL, 3),
  ('FR_TVA', 'Francia - TVA', 'FR', 'eu_vat', 20.00, '^FR[0-9A-Z]{2}[0-9]{9}$', 'N° TVA', 'monthly', '["CA3", "DEB", "Intrastat"]'::jsonb, NULL, 4),
  ('IT_IVA', 'Italia - IVA', 'IT', 'eu_vat', 22.00, '^IT[0-9]{11}$', 'P.IVA', 'monthly', '["LIPE", "Esterometro", "Intrastat"]'::jsonb, '{"sdi_required": true}'::jsonb, 5),
  ('PT_IVA', 'Portugal - IVA', 'PT', 'eu_vat', 23.00, '^PT[0-9]{9}$', 'NIF', 'monthly', '["Modelo 3", "SAF-T"]'::jsonb, NULL, 6),
  ('GB_VAT', 'Reino Unido - VAT (MTD)', 'GB', 'uk_vat', 20.00, '^GB[0-9]{9}$|^GB[0-9]{12}$', 'VAT Number', 'quarterly', '["MTD VAT Return", "EC Sales List"]'::jsonb, '{"mtd_required": true, "brexit_rules": true}'::jsonb, 10),
  ('CH_MWST', 'Suiza - MWST', 'CH', 'swiss_vat', 7.70, '^CHE-[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}$', 'MWST-Nr', 'quarterly', '["MWST-Abrechnung"]'::jsonb, '{"reduced_rates": [2.5, 3.7]}'::jsonb, 11),
  ('AD_IGI', 'Andorra - IGI', 'AD', 'andorra_igi', 4.50, '^[A-Z]-[0-9]{6}-[A-Z]$', 'NRT', 'quarterly', '["Declaració IGI", "Model 410"]'::jsonb, '{"reduced_rate": 1.0, "super_reduced": 0}'::jsonb, 15),
  ('US_FED', 'USA - Federal', 'US', 'us_llc', NULL, '^[0-9]{2}-[0-9]{7}$', 'EIN', 'annual', '["Form 1065", "Schedule K-1", "Form 1120"]'::jsonb, '{"pass_through": true}'::jsonb, 20),
  ('US_DE', 'Delaware - LLC', 'US', 'us_state', 0, '^[0-9]+$', 'File Number', 'annual', '["Annual Report", "Franchise Tax"]'::jsonb, '{"no_state_income_tax": true, "franchise_tax": 300}'::jsonb, 21),
  ('US_WY', 'Wyoming - LLC', 'US', 'us_state', 0, '^[0-9]+$', 'File Number', 'annual', '["Annual Report"]'::jsonb, '{"no_state_income_tax": true, "no_franchise_tax": true}'::jsonb, 22),
  ('US_NV', 'Nevada - LLC', 'US', 'us_state', 0, '^NV[0-9]+$', 'Entity Number', 'annual', '["Annual List", "Business License"]'::jsonb, '{"no_state_income_tax": true}'::jsonb, 23),
  ('US_FL', 'Florida - LLC', 'US', 'us_state', 0, '^[A-Z][0-9]+$', 'Document Number', 'annual', '["Annual Report"]'::jsonb, '{"no_state_income_tax": true}'::jsonb, 24),
  ('US_TX', 'Texas - LLC', 'US', 'us_state', 0, '^[0-9]+$', 'File Number', 'annual', '["Franchise Tax Report", "Public Information Report"]'::jsonb, '{"franchise_tax_threshold": 1230000}'::jsonb, 25),
  ('AE_VAT', 'UAE - VAT', 'AE', 'uae_vat', 5.00, '^[0-9]{15}$', 'TRN', 'quarterly', '["VAT Return", "FTA Declaration"]'::jsonb, NULL, 30),
  ('AE_FZ_DIFC', 'Dubai - DIFC Free Zone', 'AE', 'uae_freezone', 0, '^[0-9]+$', 'License No', 'annual', '["Annual Return", "Economic Substance"]'::jsonb, '{"vat_exempt": true, "substance_required": true}'::jsonb, 31),
  ('AE_FZ_JAFZA', 'Dubai - JAFZA Free Zone', 'AE', 'uae_freezone', 0, '^[0-9]+$', 'License No', 'annual', '["Annual Return", "Economic Substance"]'::jsonb, '{"vat_exempt": true, "substance_required": true}'::jsonb, 32),
  ('AE_FZ_DMCC', 'Dubai - DMCC Free Zone', 'AE', 'uae_freezone', 0, '^DMCC-[0-9]+$', 'DMCC No', 'annual', '["Annual Return", "Economic Substance"]'::jsonb, '{"vat_exempt": false, "substance_required": true}'::jsonb, 33),
  ('SG_GST', 'Singapur - GST', 'SG', 'singapore_gst', 8.00, '^[0-9]{9}[A-Z]$', 'GST Reg No', 'quarterly', '["GST F5", "GST F7"]'::jsonb, '{"threshold": 1000000}'::jsonb, 40),
  ('HK_PROFITS', 'Hong Kong - Profits Tax', 'HK', 'other', 16.50, '^[0-9]{8}$', 'BR Number', 'annual', '["Profits Tax Return", "Employer Return"]'::jsonb, '{"territorial_basis": true}'::jsonb, 41),
  ('VG_IBC', 'BVI - IBC', 'VG', 'offshore', 0, '^[0-9]+$', 'Company No', 'annual', '["Annual Return", "Economic Substance"]'::jsonb, '{"no_local_tax": true, "substance_required": true}'::jsonb, 50),
  ('KY_EXEMPT', 'Cayman - Exempt Company', 'KY', 'offshore', 0, '^[0-9]+$', 'Company No', 'annual', '["Annual Return", "Economic Substance"]'::jsonb, '{"no_local_tax": true}'::jsonb, 51),
  ('PA_IBC', 'Panamá - IBC', 'PA', 'offshore', 0, '^[0-9]+$', 'RUC', 'annual', '["Informe Anual"]'::jsonb, '{"territorial_basis": true}'::jsonb, 52)
) AS v(code, name, country_code, jurisdiction_type, standard_tax_rate, tax_id_format, tax_id_label, filing_frequency, reporting_requirements, special_rules, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.erp_tax_jurisdictions WHERE code = v.code);

-- ========== COMMENTS ==========

COMMENT ON FUNCTION public.erp_user_has_company_access IS 'Verifica si el usuario autenticado tiene acceso a una empresa ERP';
COMMENT ON TABLE public.erp_sii_tasks IS 'Tareas de corrección para registros SII rechazados';
COMMENT ON TABLE public.erp_tax_jurisdictions IS 'Catálogo de jurisdicciones fiscales globales';
COMMENT ON TABLE public.erp_company_jurisdictions IS 'Registros fiscales de empresas en cada jurisdicción';
COMMENT ON TABLE public.erp_tax_calendar_events IS 'Calendario de obligaciones fiscales por empresa';