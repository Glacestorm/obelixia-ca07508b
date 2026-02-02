-- =====================================================
-- ERP MIGRATION MODULE - ADDITIONAL TABLES
-- Extends existing infrastructure with specialized tables
-- =====================================================

-- Additional enum types (if not exist)
DO $$ BEGIN
  CREATE TYPE erp_chart_type AS ENUM (
    'pgc_2007', 'pgc_pyme', 'niif', 'niic', 
    'us_gaap', 'uk_gaap', 'ifrs', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE erp_validation_severity AS ENUM (
    'info', 'warning', 'error', 'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 1. ERP CHART MAPPINGS (Account Plan Mappings)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.erp_chart_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.erp_migration_sessions(id) ON DELETE CASCADE,
  source_account_code TEXT NOT NULL,
  source_account_name TEXT,
  source_account_type TEXT,
  target_account_code TEXT,
  target_account_name TEXT,
  target_account_type TEXT,
  transform_type TEXT DEFAULT 'direct', -- 'direct', 'aggregate', 'split', 'create_new'
  transform_rules JSONB DEFAULT '{}',
  ai_confidence DECIMAL(5,2),
  ai_reasoning TEXT,
  manual_override BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, source_account_code)
);

-- =====================================================
-- 2. ERP FIELD MAPPINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.erp_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.erp_migration_sessions(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'account', 'entry', 'partner', 'asset'
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL,
  transform_type TEXT DEFAULT 'direct', -- 'direct', 'formula', 'lookup', 'constant'
  transform_formula TEXT,
  default_value TEXT,
  is_required BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(5,2),
  manual_override BOOLEAN DEFAULT false,
  sample_values JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. ERP VALIDATION RULES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.erp_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL UNIQUE,
  rule_name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL, -- 'entry', 'account', 'partner', 'all'
  severity erp_validation_severity DEFAULT 'warning',
  rule_type TEXT NOT NULL, -- 'balance', 'format', 'reference', 'fiscal', 'custom'
  validation_logic JSONB NOT NULL,
  error_message_template TEXT,
  is_active BOOLEAN DEFAULT true,
  is_blocking BOOLEAN DEFAULT false,
  applies_to_chart_types TEXT[] DEFAULT ARRAY['pgc_2007'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. ERP FISCAL RECONCILIATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.erp_fiscal_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.erp_migration_sessions(id) ON DELETE CASCADE,
  reconciliation_type TEXT NOT NULL, -- 'vat_sales', 'vat_purchases', 'withholdings', 'bank', 'trial_balance'
  period_start DATE,
  period_end DATE,
  source_total DECIMAL(15,2),
  target_total DECIMAL(15,2),
  difference DECIMAL(15,2),
  difference_percentage DECIMAL(5,2),
  is_reconciled BOOLEAN DEFAULT false,
  reconciliation_notes TEXT,
  adjustments JSONB DEFAULT '[]',
  details JSONB DEFAULT '{}',
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. ERP MAPPING TEMPLATES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.erp_mapping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_chart_type TEXT,
  target_chart_type TEXT NOT NULL DEFAULT 'pgc_2007',
  description TEXT,
  field_mappings JSONB NOT NULL DEFAULT '[]',
  chart_mappings JSONB NOT NULL DEFAULT '[]',
  transform_rules JSONB DEFAULT '{}',
  is_official BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. ERP MIGRATION LOGS (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.erp_migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.erp_migration_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'info', 'warning', 'error', 'success', 'checkpoint'
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  entity_type TEXT,
  entity_id TEXT,
  user_id UUID,
  execution_time_ms INTEGER,
  hash_integrity TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_erp_chart_mappings_session ON public.erp_chart_mappings(session_id);
CREATE INDEX IF NOT EXISTS idx_erp_chart_mappings_source ON public.erp_chart_mappings(source_account_code);
CREATE INDEX IF NOT EXISTS idx_erp_field_mappings_session ON public.erp_field_mappings(session_id);
CREATE INDEX IF NOT EXISTS idx_erp_field_mappings_entity ON public.erp_field_mappings(entity_type);
CREATE INDEX IF NOT EXISTS idx_erp_reconciliations_session ON public.erp_fiscal_reconciliations(session_id);
CREATE INDEX IF NOT EXISTS idx_erp_migration_logs_session ON public.erp_migration_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_erp_migration_logs_created ON public.erp_migration_logs(created_at);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.erp_chart_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_fiscal_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_mapping_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_migration_logs ENABLE ROW LEVEL SECURITY;

-- Chart mappings: Access via session -> company
CREATE POLICY "Users can view chart mappings via session"
  ON public.erp_chart_mappings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.erp_migration_sessions s 
    WHERE s.id = session_id AND public.user_has_erp_company_access(s.company_id)
  ));

CREATE POLICY "Users can manage chart mappings via session"
  ON public.erp_chart_mappings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.erp_migration_sessions s 
    WHERE s.id = session_id AND public.user_has_erp_company_access(s.company_id)
  ));

-- Field mappings: Access via session -> company
CREATE POLICY "Users can view field mappings via session"
  ON public.erp_field_mappings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.erp_migration_sessions s 
    WHERE s.id = session_id AND public.user_has_erp_company_access(s.company_id)
  ));

CREATE POLICY "Users can manage field mappings via session"
  ON public.erp_field_mappings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.erp_migration_sessions s 
    WHERE s.id = session_id AND public.user_has_erp_company_access(s.company_id)
  ));

-- Validation rules: Public read
CREATE POLICY "Validation rules are viewable by all"
  ON public.erp_validation_rules FOR SELECT
  TO authenticated
  USING (true);

-- Fiscal reconciliations: Access via session -> company
CREATE POLICY "Users can view reconciliations via session"
  ON public.erp_fiscal_reconciliations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.erp_migration_sessions s 
    WHERE s.id = session_id AND public.user_has_erp_company_access(s.company_id)
  ));

CREATE POLICY "Users can manage reconciliations via session"
  ON public.erp_fiscal_reconciliations FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.erp_migration_sessions s 
    WHERE s.id = session_id AND public.user_has_erp_company_access(s.company_id)
  ));

-- Mapping templates: Public read, own write
CREATE POLICY "Users can view public templates"
  ON public.erp_mapping_templates FOR SELECT
  TO authenticated
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create templates"
  ON public.erp_mapping_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own templates"
  ON public.erp_mapping_templates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Migration logs: Access via session -> company
CREATE POLICY "Users can view logs via session"
  ON public.erp_migration_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.erp_migration_sessions s 
    WHERE s.id = session_id AND public.user_has_erp_company_access(s.company_id)
  ));

CREATE POLICY "Users can create logs via session"
  ON public.erp_migration_logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.erp_migration_sessions s 
    WHERE s.id = session_id AND public.user_has_erp_company_access(s.company_id)
  ));

-- =====================================================
-- SEED: VALIDATION RULES
-- =====================================================
INSERT INTO public.erp_validation_rules (rule_key, rule_name, description, entity_type, severity, rule_type, validation_logic, error_message_template, is_blocking) VALUES
('balance_check', 'Cuadre de asiento', 'Verifica que Debe = Haber en cada asiento', 'entry', 'critical', 'balance', '{"check": "sum_debit == sum_credit"}', 'Asiento descuadrado: Debe ({debit}) ≠ Haber ({credit}). Diferencia: {difference}', true),
('account_exists', 'Cuenta existe en destino', 'Verifica que la cuenta de destino existe en el plan', 'entry', 'error', 'reference', '{"check": "target_account_exists"}', 'La cuenta {account_code} no existe en el plan de cuentas destino', true),
('date_valid', 'Fecha válida', 'Verifica que la fecha está en el ejercicio fiscal', 'entry', 'warning', 'fiscal', '{"check": "date_in_fiscal_year"}', 'La fecha {date} está fuera del ejercicio fiscal {fiscal_year}', false),
('partner_nif', 'NIF/CIF válido', 'Verifica formato de NIF/CIF para terceros', 'partner', 'warning', 'format', '{"check": "valid_nif_cif", "pattern": "^[A-Z]?[0-9]{7,8}[A-Z0-9]$"}', 'El NIF/CIF {nif} no tiene un formato válido', false),
('vat_rates', 'Tipos de IVA válidos', 'Verifica que los tipos de IVA son correctos', 'entry', 'warning', 'fiscal', '{"check": "valid_vat_rate", "valid_rates": [0, 4, 10, 21]}', 'El tipo de IVA {rate}% no es válido para España', false),
('account_length', 'Longitud de cuenta', 'Verifica la longitud del código de cuenta según PGC', 'account', 'info', 'format', '{"check": "account_length", "min": 3, "max": 12}', 'La cuenta {account_code} tiene longitud inusual ({length} dígitos)', false),
('duplicate_entry', 'Asiento duplicado', 'Detecta posibles asientos duplicados por fecha e importe', 'entry', 'warning', 'custom', '{"check": "no_duplicate", "fields": ["date", "amount", "description"]}', 'Posible asiento duplicado: {date} - {amount} - {description}', false),
('opening_balance', 'Saldo de apertura', 'Verifica cuadre de asiento de apertura', 'entry', 'critical', 'balance', '{"check": "opening_balance_matches"}', 'El asiento de apertura no cuadra con los saldos iniciales', true)
ON CONFLICT (rule_key) DO NOTHING;

-- =====================================================
-- SEED: MAPPING TEMPLATES
-- =====================================================
INSERT INTO public.erp_mapping_templates (template_name, source_system, source_chart_type, target_chart_type, description, is_official, is_public) VALUES
('ContaPlus a PGC 2007', 'contaplus', 'pgc_2007', 'pgc_2007', 'Migración estándar desde ContaPlus manteniendo estructura PGC', true, true),
('Sage 50 a PGC PYME', 'sage_50', 'pgc_pyme', 'pgc_pyme', 'Migración desde Sage 50 para PYMES', true, true),
('Odoo a PGC 2007', 'odoo', 'custom', 'pgc_2007', 'Conversión de plan Odoo genérico a PGC español', true, true),
('A3 Asesor a PGC 2007', 'a3_asesor', 'pgc_2007', 'pgc_2007', 'Migración desde A3 Asesor de Wolters Kluwer', true, true),
('SAP Business One a PGC', 'sap_business_one', 'custom', 'pgc_2007', 'Conversión de plan SAP a PGC español', true, true),
('Holded a PGC 2007', 'holded', 'custom', 'pgc_2007', 'Migración desde Holded a PGC estándar', true, true),
('QuickBooks a NIIF', 'quickbooks', 'us_gaap', 'niif', 'Conversión de QuickBooks US GAAP a NIIF', true, true),
('Xero a PGC 2007', 'xero', 'uk_gaap', 'pgc_2007', 'Migración desde Xero UK a PGC español', true, true)
ON CONFLICT DO NOTHING;