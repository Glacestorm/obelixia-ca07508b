-- ============================================================
-- FASE 1: Infraestructura de Integración RRHH ↔ Tesorería ↔ Contabilidad
-- Cumplimiento: PGC 2007, LGT, LGSS, ET Art. 29
-- ============================================================

-- 1.1 Mapeo de conceptos de nómina a cuentas PGC
CREATE TABLE IF NOT EXISTS erp_hr_accounting_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id) ON DELETE CASCADE,
  concept_code TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit_credit TEXT NOT NULL CHECK (debit_credit IN ('D', 'C')),
  category TEXT NOT NULL DEFAULT 'payroll', -- payroll, settlement, ss, irpf, payment
  jurisdiction TEXT NOT NULL DEFAULT 'ES',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, concept_code, jurisdiction)
);

-- 1.2 Integración RRHH → Tesorería (vencimientos de pago)
CREATE TABLE IF NOT EXISTS erp_hr_treasury_integration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('payroll', 'settlement', 'ss_contribution', 'irpf_retention')),
  source_id UUID NOT NULL,
  source_reference TEXT, -- Número de nómina, finiquito, etc.
  payable_id UUID, -- Referencia a erp_payables cuando se cree
  beneficiary_type TEXT NOT NULL DEFAULT 'employee', -- employee, tgss, aeat
  beneficiary_id UUID,
  beneficiary_name TEXT,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'paid', 'cancelled', 'failed')),
  payment_method TEXT DEFAULT 'transfer', -- transfer, sepa, check
  payment_reference TEXT,
  bank_account_iban TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 Asientos contables generados desde RRHH
CREATE TABLE IF NOT EXISTS erp_hr_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('payroll', 'settlement', 'ss_contribution', 'irpf_payment', 'ss_payment', 'salary_payment')),
  source_id UUID NOT NULL,
  source_reference TEXT,
  journal_entry_id UUID, -- Referencia a erp_journal_entries cuando se cree
  fiscal_year_id UUID,
  period_id UUID,
  entry_date DATE NOT NULL,
  description TEXT,
  total_debit NUMERIC(15,2) DEFAULT 0,
  total_credit NUMERIC(15,2) DEFAULT 0,
  auto_generated BOOLEAN DEFAULT true,
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generated', 'posted', 'reversed', 'failed')),
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected')),
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  error_message TEXT,
  entry_lines JSONB DEFAULT '[]', -- Líneas del asiento antes de crear
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.4 Historial de sincronización para auditoría
CREATE TABLE IF NOT EXISTS erp_hr_integration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- accounting, treasury, both
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  action TEXT NOT NULL, -- create, update, reverse, sync
  status TEXT NOT NULL DEFAULT 'success',
  details JSONB DEFAULT '{}',
  error_message TEXT,
  performed_by UUID,
  performed_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_hr_accounting_mapping_company ON erp_hr_accounting_mapping(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_accounting_mapping_concept ON erp_hr_accounting_mapping(concept_code);
CREATE INDEX IF NOT EXISTS idx_hr_treasury_integration_company ON erp_hr_treasury_integration(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_treasury_integration_source ON erp_hr_treasury_integration(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_hr_treasury_integration_status ON erp_hr_treasury_integration(status);
CREATE INDEX IF NOT EXISTS idx_hr_treasury_integration_due_date ON erp_hr_treasury_integration(due_date);
CREATE INDEX IF NOT EXISTS idx_hr_journal_entries_company ON erp_hr_journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_journal_entries_source ON erp_hr_journal_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_hr_journal_entries_status ON erp_hr_journal_entries(generation_status);
CREATE INDEX IF NOT EXISTS idx_hr_integration_log_company ON erp_hr_integration_log(company_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_hr_integration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hr_accounting_mapping_updated ON erp_hr_accounting_mapping;
CREATE TRIGGER trg_hr_accounting_mapping_updated
  BEFORE UPDATE ON erp_hr_accounting_mapping
  FOR EACH ROW EXECUTE FUNCTION update_hr_integration_timestamp();

DROP TRIGGER IF EXISTS trg_hr_treasury_integration_updated ON erp_hr_treasury_integration;
CREATE TRIGGER trg_hr_treasury_integration_updated
  BEFORE UPDATE ON erp_hr_treasury_integration
  FOR EACH ROW EXECUTE FUNCTION update_hr_integration_timestamp();

DROP TRIGGER IF EXISTS trg_hr_journal_entries_updated ON erp_hr_journal_entries;
CREATE TRIGGER trg_hr_journal_entries_updated
  BEFORE UPDATE ON erp_hr_journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_hr_integration_timestamp();

-- RLS Policies
ALTER TABLE erp_hr_accounting_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_treasury_integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_integration_log ENABLE ROW LEVEL SECURITY;

-- Políticas para erp_hr_accounting_mapping
CREATE POLICY "Users can view accounting mappings for their companies"
  ON erp_hr_accounting_mapping FOR SELECT
  USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_hr_accounting_mapping.company_id
      AND uc.user_id = auth.uid()
      AND uc.is_active = true
    )
  );

CREATE POLICY "Users can manage accounting mappings for their companies"
  ON erp_hr_accounting_mapping FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_hr_accounting_mapping.company_id
      AND uc.user_id = auth.uid()
      AND uc.is_active = true
    )
  );

-- Políticas para erp_hr_treasury_integration
CREATE POLICY "Users can view treasury integration for their companies"
  ON erp_hr_treasury_integration FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_hr_treasury_integration.company_id
      AND uc.user_id = auth.uid()
      AND uc.is_active = true
    )
  );

CREATE POLICY "Users can manage treasury integration for their companies"
  ON erp_hr_treasury_integration FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_hr_treasury_integration.company_id
      AND uc.user_id = auth.uid()
      AND uc.is_active = true
    )
  );

-- Políticas para erp_hr_journal_entries
CREATE POLICY "Users can view journal entries for their companies"
  ON erp_hr_journal_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_hr_journal_entries.company_id
      AND uc.user_id = auth.uid()
      AND uc.is_active = true
    )
  );

CREATE POLICY "Users can manage journal entries for their companies"
  ON erp_hr_journal_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_hr_journal_entries.company_id
      AND uc.user_id = auth.uid()
      AND uc.is_active = true
    )
  );

-- Políticas para erp_hr_integration_log
CREATE POLICY "Users can view integration logs for their companies"
  ON erp_hr_integration_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_hr_integration_log.company_id
      AND uc.user_id = auth.uid()
      AND uc.is_active = true
    )
  );

CREATE POLICY "Users can insert integration logs for their companies"
  ON erp_hr_integration_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_hr_integration_log.company_id
      AND uc.user_id = auth.uid()
      AND uc.is_active = true
    )
  );

-- ============================================================
-- DATOS MAESTROS: Mapeo PGC 2007 para gastos de personal
-- ============================================================

-- Insertar mapeos estándar (sin company_id = plantilla global)
INSERT INTO erp_hr_accounting_mapping (company_id, concept_code, concept_name, account_code, account_name, debit_credit, category, jurisdiction) VALUES
-- NÓMINAS - Gastos (Debe)
(NULL, 'SALARY_GROSS', 'Sueldos y salarios brutos', '640', 'Sueldos y salarios', 'D', 'payroll', 'ES'),
(NULL, 'SALARY_EXTRA', 'Pagas extraordinarias', '640', 'Sueldos y salarios', 'D', 'payroll', 'ES'),
(NULL, 'SALARY_BONUS', 'Bonus y comisiones', '640', 'Sueldos y salarios', 'D', 'payroll', 'ES'),
(NULL, 'SALARY_OVERTIME', 'Horas extraordinarias', '640', 'Sueldos y salarios', 'D', 'payroll', 'ES'),
(NULL, 'SS_COMPANY', 'Seguridad Social empresa', '642', 'Seguridad Social a cargo empresa', 'D', 'payroll', 'ES'),
(NULL, 'SS_COMPANY_CONTINGENCIAS', 'SS Contingencias comunes empresa', '6420', 'SS Contingencias comunes', 'D', 'payroll', 'ES'),
(NULL, 'SS_COMPANY_DESEMPLEO', 'SS Desempleo empresa', '6421', 'SS Desempleo', 'D', 'payroll', 'ES'),
(NULL, 'SS_COMPANY_FORMACION', 'SS Formación profesional', '6422', 'SS Formación profesional', 'D', 'payroll', 'ES'),
(NULL, 'SS_COMPANY_FOGASA', 'SS FOGASA', '6423', 'SS FOGASA', 'D', 'payroll', 'ES'),
(NULL, 'SS_COMPANY_AT_EP', 'SS Accidentes trabajo', '6424', 'SS AT y EP', 'D', 'payroll', 'ES'),

-- NÓMINAS - Retenciones y acreedores (Haber)
(NULL, 'IRPF_RETENTION', 'Retención IRPF trabajador', '4751', 'HP Acreedora por retenciones', 'C', 'payroll', 'ES'),
(NULL, 'SS_EMPLOYEE', 'Seguridad Social trabajador', '476', 'Organismos SS acreedores', 'C', 'payroll', 'ES'),
(NULL, 'SS_EMPLOYEE_CONTINGENCIAS', 'SS Contingencias trabajador', '4760', 'SS Contingencias trabajador', 'C', 'payroll', 'ES'),
(NULL, 'SS_EMPLOYEE_DESEMPLEO', 'SS Desempleo trabajador', '4761', 'SS Desempleo trabajador', 'C', 'payroll', 'ES'),
(NULL, 'SS_EMPLOYEE_FORMACION', 'SS Formación trabajador', '4762', 'SS Formación trabajador', 'C', 'payroll', 'ES'),
(NULL, 'NET_SALARY', 'Neto a pagar empleado', '465', 'Remuneraciones pendientes de pago', 'C', 'payroll', 'ES'),
(NULL, 'OTHER_DEDUCTIONS', 'Otras deducciones', '465', 'Remuneraciones pendientes de pago', 'C', 'payroll', 'ES'),

-- PAGOS
(NULL, 'SALARY_PAYMENT', 'Pago de nóminas', '465', 'Remuneraciones pendientes de pago', 'D', 'payment', 'ES'),
(NULL, 'SALARY_PAYMENT_BANK', 'Contrapartida pago nóminas', '572', 'Bancos c/c', 'C', 'payment', 'ES'),
(NULL, 'SS_PAYMENT', 'Pago Seguridad Social', '476', 'Organismos SS acreedores', 'D', 'payment', 'ES'),
(NULL, 'SS_PAYMENT_BANK', 'Contrapartida pago SS', '572', 'Bancos c/c', 'C', 'payment', 'ES'),
(NULL, 'IRPF_PAYMENT', 'Pago retenciones IRPF', '4751', 'HP Acreedora por retenciones', 'D', 'payment', 'ES'),
(NULL, 'IRPF_PAYMENT_BANK', 'Contrapartida pago IRPF', '572', 'Bancos c/c', 'C', 'payment', 'ES'),

-- FINIQUITOS E INDEMNIZACIONES
(NULL, 'SETTLEMENT_SALARY', 'Salario pendiente finiquito', '640', 'Sueldos y salarios', 'D', 'settlement', 'ES'),
(NULL, 'SETTLEMENT_VACATION', 'Vacaciones no disfrutadas', '640', 'Sueldos y salarios', 'D', 'settlement', 'ES'),
(NULL, 'SETTLEMENT_EXTRA', 'Prorrata pagas extras', '640', 'Sueldos y salarios', 'D', 'settlement', 'ES'),
(NULL, 'INDEMNITY_OBJECTIVE', 'Indemnización despido objetivo', '641', 'Indemnizaciones', 'D', 'settlement', 'ES'),
(NULL, 'INDEMNITY_UNFAIR', 'Indemnización despido improcedente', '641', 'Indemnizaciones', 'D', 'settlement', 'ES'),
(NULL, 'INDEMNITY_ERE', 'Indemnización ERE', '641', 'Indemnizaciones', 'D', 'settlement', 'ES'),
(NULL, 'INDEMNITY_VOLUNTARY', 'Indemnización baja voluntaria', '641', 'Indemnizaciones', 'D', 'settlement', 'ES'),
(NULL, 'SETTLEMENT_NET', 'Neto finiquito a pagar', '465', 'Remuneraciones pendientes de pago', 'C', 'settlement', 'ES'),

-- PROVISIONES
(NULL, 'PROVISION_ERE', 'Dotación provisión reestructuración', '6412', 'Dotación provisión reestructuración', 'D', 'settlement', 'ES'),
(NULL, 'PROVISION_ERE_LIABILITY', 'Provisión reestructuración', '1410', 'Provisión para reestructuraciones', 'C', 'settlement', 'ES'),
(NULL, 'PROVISION_ERE_REVERSAL', 'Aplicación provisión ERE', '1410', 'Provisión para reestructuraciones', 'D', 'settlement', 'ES'),

-- OTROS GASTOS DE PERSONAL
(NULL, 'TRAINING_EXPENSE', 'Formación del personal', '649', 'Otros gastos sociales', 'D', 'payroll', 'ES'),
(NULL, 'INSURANCE_EMPLOYEE', 'Seguros personal', '649', 'Otros gastos sociales', 'D', 'payroll', 'ES'),
(NULL, 'BENEFITS_IN_KIND', 'Retribución en especie', '649', 'Otros gastos sociales', 'D', 'payroll', 'ES'),

-- ANTICIPOS
(NULL, 'ADVANCE_PAYMENT', 'Anticipo a empleados', '460', 'Anticipos de remuneraciones', 'D', 'payroll', 'ES'),
(NULL, 'ADVANCE_RECOVERY', 'Recuperación anticipo', '460', 'Anticipos de remuneraciones', 'C', 'payroll', 'ES')

ON CONFLICT (company_id, concept_code, jurisdiction) DO NOTHING;

-- ============================================================
-- FUNCIONES SQL PARA MAPEO Y GENERACIÓN
-- ============================================================

-- Función para obtener el mapeo de cuenta para un concepto
CREATE OR REPLACE FUNCTION fn_get_hr_account_mapping(
  p_company_id UUID,
  p_concept_code TEXT,
  p_jurisdiction TEXT DEFAULT 'ES'
)
RETURNS TABLE(
  account_code TEXT,
  account_name TEXT,
  debit_credit TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.account_code,
    m.account_name,
    m.debit_credit
  FROM erp_hr_accounting_mapping m
  WHERE (m.company_id = p_company_id OR m.company_id IS NULL)
    AND m.concept_code = p_concept_code
    AND m.jurisdiction = p_jurisdiction
    AND m.is_active = true
  ORDER BY m.company_id NULLS LAST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar líneas de asiento desde nómina
CREATE OR REPLACE FUNCTION fn_generate_payroll_entry_lines(
  p_company_id UUID,
  p_gross_salary NUMERIC,
  p_ss_employee NUMERIC,
  p_irpf_retention NUMERIC,
  p_ss_company NUMERIC,
  p_other_deductions NUMERIC DEFAULT 0,
  p_jurisdiction TEXT DEFAULT 'ES'
)
RETURNS JSONB AS $$
DECLARE
  v_lines JSONB := '[]'::JSONB;
  v_net_salary NUMERIC;
BEGIN
  v_net_salary := p_gross_salary - p_ss_employee - p_irpf_retention - p_other_deductions;
  
  -- Línea 1: Sueldos brutos (Debe)
  IF p_gross_salary > 0 THEN
    v_lines := v_lines || jsonb_build_object(
      'account_code', '640',
      'account_name', 'Sueldos y salarios',
      'debit', p_gross_salary,
      'credit', 0,
      'concept', 'SALARY_GROSS'
    );
  END IF;
  
  -- Línea 2: SS Empresa (Debe)
  IF p_ss_company > 0 THEN
    v_lines := v_lines || jsonb_build_object(
      'account_code', '642',
      'account_name', 'Seguridad Social a cargo empresa',
      'debit', p_ss_company,
      'credit', 0,
      'concept', 'SS_COMPANY'
    );
  END IF;
  
  -- Línea 3: HP Acreedora IRPF (Haber)
  IF p_irpf_retention > 0 THEN
    v_lines := v_lines || jsonb_build_object(
      'account_code', '4751',
      'account_name', 'HP Acreedora por retenciones',
      'debit', 0,
      'credit', p_irpf_retention,
      'concept', 'IRPF_RETENTION'
    );
  END IF;
  
  -- Línea 4: Organismos SS (Haber) - Trabajador + Empresa
  IF (p_ss_employee + p_ss_company) > 0 THEN
    v_lines := v_lines || jsonb_build_object(
      'account_code', '476',
      'account_name', 'Organismos SS acreedores',
      'debit', 0,
      'credit', p_ss_employee + p_ss_company,
      'concept', 'SS_TOTAL'
    );
  END IF;
  
  -- Línea 5: Remuneraciones pendientes (Haber)
  IF v_net_salary > 0 THEN
    v_lines := v_lines || jsonb_build_object(
      'account_code', '465',
      'account_name', 'Remuneraciones pendientes de pago',
      'debit', 0,
      'credit', v_net_salary,
      'concept', 'NET_SALARY'
    );
  END IF;
  
  RETURN v_lines;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para validar partida doble
CREATE OR REPLACE FUNCTION fn_validate_double_entry(p_lines JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_line JSONB;
BEGIN
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::NUMERIC, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::NUMERIC, 0);
  END LOOP;
  
  RETURN ABS(v_total_debit - v_total_credit) < 0.01;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para crear vencimiento de tesorería desde RRHH
CREATE OR REPLACE FUNCTION fn_create_hr_treasury_payable(
  p_company_id UUID,
  p_source_type TEXT,
  p_source_id UUID,
  p_source_reference TEXT,
  p_beneficiary_type TEXT,
  p_beneficiary_name TEXT,
  p_amount NUMERIC,
  p_due_date DATE,
  p_bank_account_iban TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_integration_id UUID;
BEGIN
  INSERT INTO erp_hr_treasury_integration (
    company_id,
    source_type,
    source_id,
    source_reference,
    beneficiary_type,
    beneficiary_name,
    amount,
    due_date,
    bank_account_iban,
    status
  ) VALUES (
    p_company_id,
    p_source_type,
    p_source_id,
    p_source_reference,
    p_beneficiary_type,
    p_beneficiary_name,
    p_amount,
    p_due_date,
    p_bank_account_iban,
    'pending'
  )
  RETURNING id INTO v_integration_id;
  
  -- Log de auditoría
  INSERT INTO erp_hr_integration_log (
    company_id,
    integration_type,
    source_type,
    source_id,
    action,
    status,
    details,
    performed_by
  ) VALUES (
    p_company_id,
    'treasury',
    p_source_type,
    p_source_id,
    'create',
    'success',
    jsonb_build_object(
      'integration_id', v_integration_id,
      'amount', p_amount,
      'due_date', p_due_date
    ),
    auth.uid()
  );
  
  RETURN v_integration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para crear asiento contable desde RRHH
CREATE OR REPLACE FUNCTION fn_create_hr_journal_entry(
  p_company_id UUID,
  p_source_type TEXT,
  p_source_id UUID,
  p_source_reference TEXT,
  p_entry_date DATE,
  p_description TEXT,
  p_entry_lines JSONB
)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_line JSONB;
BEGIN
  -- Calcular totales
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_entry_lines)
  LOOP
    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::NUMERIC, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::NUMERIC, 0);
  END LOOP;
  
  -- Validar partida doble
  IF NOT fn_validate_double_entry(p_entry_lines) THEN
    RAISE EXCEPTION 'El asiento no cuadra: Debe=%, Haber=%', v_total_debit, v_total_credit;
  END IF;
  
  INSERT INTO erp_hr_journal_entries (
    company_id,
    source_type,
    source_id,
    source_reference,
    entry_date,
    description,
    total_debit,
    total_credit,
    entry_lines,
    generation_status
  ) VALUES (
    p_company_id,
    p_source_type,
    p_source_id,
    p_source_reference,
    p_entry_date,
    p_description,
    v_total_debit,
    v_total_credit,
    p_entry_lines,
    'pending'
  )
  RETURNING id INTO v_entry_id;
  
  -- Log de auditoría
  INSERT INTO erp_hr_integration_log (
    company_id,
    integration_type,
    source_type,
    source_id,
    action,
    status,
    details,
    performed_by
  ) VALUES (
    p_company_id,
    'accounting',
    p_source_type,
    p_source_id,
    'create',
    'success',
    jsonb_build_object(
      'entry_id', v_entry_id,
      'total_debit', v_total_debit,
      'total_credit', v_total_credit
    ),
    auth.uid()
  );
  
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;