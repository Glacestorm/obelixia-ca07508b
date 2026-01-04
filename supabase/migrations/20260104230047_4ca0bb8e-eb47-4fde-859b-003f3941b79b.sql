
-- =============================================
-- FASE 0 - COMPLETAR ESTRUCTURA FALTANTE
-- =============================================

-- Añadir columnas faltantes a erp_company_groups
ALTER TABLE erp_company_groups ADD COLUMN IF NOT EXISTS parent_group_id UUID REFERENCES erp_company_groups(id);

-- Añadir columnas faltantes a erp_companies
ALTER TABLE erp_companies ADD COLUMN IF NOT EXISTS code TEXT;

-- Añadir columnas faltantes a erp_fiscal_years
ALTER TABLE erp_fiscal_years ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE erp_fiscal_years ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;

-- Añadir columna is_active a erp_permissions si no existe
ALTER TABLE erp_permissions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ENUM para niveles de permiso
DO $$ BEGIN
  CREATE TYPE erp_permission_level AS ENUM ('none', 'read', 'write', 'full');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1) MFA DISPOSITIVOS
CREATE TABLE IF NOT EXISTS erp_mfa_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL DEFAULT 'totp',
  device_name TEXT,
  secret_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) SESIONES ERP
CREATE TABLE IF NOT EXISTS erp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES erp_companies(id),
  ip_address INET,
  user_agent TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT
);

-- 3) EVENTOS DEL SISTEMA
CREATE TABLE IF NOT EXISTS erp_system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  event_type TEXT NOT NULL,
  event_code TEXT,
  severity TEXT DEFAULT 'info',
  payload JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) SERIES DOCUMENTALES
CREATE TABLE IF NOT EXISTS erp_document_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  document_type TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  prefix TEXT,
  suffix TEXT,
  next_number INTEGER DEFAULT 1,
  padding_length INTEGER DEFAULT 6,
  reset_annually BOOLEAN DEFAULT true,
  reset_monthly BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  fiscal_year_id UUID REFERENCES erp_fiscal_years(id),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, module, code)
);

-- 5) NÚMEROS DE DOCUMENTO
CREATE TABLE IF NOT EXISTS erp_document_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES erp_document_series(id),
  company_id UUID NOT NULL REFERENCES erp_companies(id),
  document_number TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  fiscal_year_id UUID REFERENCES erp_fiscal_years(id)
);

-- 6) ROLES DE USUARIO ERP (por empresa)
CREATE TABLE IF NOT EXISTS erp_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES erp_roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id, role_id)
);

-- Añadir columna level a erp_role_permissions si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'erp_role_permissions' AND column_name = 'level'
  ) THEN
    ALTER TABLE erp_role_permissions ADD COLUMN level TEXT DEFAULT 'read';
  END IF;
END $$;

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_erp_company_groups_parent ON erp_company_groups(parent_group_id);
CREATE INDEX IF NOT EXISTS idx_erp_mfa_devices_user ON erp_mfa_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_erp_sessions_user ON erp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_erp_system_events_company ON erp_system_events(company_id);
CREATE INDEX IF NOT EXISTS idx_erp_system_events_type ON erp_system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_erp_document_series_company ON erp_document_series(company_id);
CREATE INDEX IF NOT EXISTS idx_erp_document_series_module ON erp_document_series(company_id, module);
CREATE INDEX IF NOT EXISTS idx_erp_document_numbers_series ON erp_document_numbers(series_id);
CREATE INDEX IF NOT EXISTS idx_erp_user_roles_user ON erp_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_erp_user_roles_company ON erp_user_roles(company_id);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE erp_mfa_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_document_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_document_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their MFA devices" ON erp_mfa_devices;
CREATE POLICY "Users can manage their MFA devices" ON erp_mfa_devices
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their sessions" ON erp_sessions;
CREATE POLICY "Users can view their sessions" ON erp_sessions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view system events of their companies" ON erp_system_events;
CREATE POLICY "Users can view system events of their companies" ON erp_system_events
  FOR SELECT USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_system_events.company_id
        AND uc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view series of their companies" ON erp_document_series;
CREATE POLICY "Users can view series of their companies" ON erp_document_series
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_document_series.company_id
        AND uc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage series" ON erp_document_series;
CREATE POLICY "Admins can manage series" ON erp_document_series
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_document_series.company_id
        AND uc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view document numbers of their companies" ON erp_document_numbers;
CREATE POLICY "Users can view document numbers of their companies" ON erp_document_numbers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_document_numbers.company_id
        AND uc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view their ERP roles" ON erp_user_roles;
CREATE POLICY "Users can view their ERP roles" ON erp_user_roles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Company admins can manage ERP user roles" ON erp_user_roles;
CREATE POLICY "Company admins can manage ERP user roles" ON erp_user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM erp_user_companies uc
      WHERE uc.company_id = erp_user_roles.company_id
        AND uc.user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCIONES
-- =============================================

CREATE OR REPLACE FUNCTION erp_get_next_document_number(
  p_company_id UUID,
  p_series_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series RECORD;
  v_next_num INTEGER;
  v_doc_number TEXT;
  v_fiscal_year_id UUID;
  v_prefix TEXT;
BEGIN
  SELECT * INTO v_series
  FROM erp_document_series
  WHERE id = p_series_id AND company_id = p_company_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serie no encontrada';
  END IF;
  
  IF v_series.reset_annually THEN
    SELECT id INTO v_fiscal_year_id
    FROM erp_fiscal_years
    WHERE company_id = p_company_id AND is_current = true
    LIMIT 1;
    
    IF v_fiscal_year_id IS DISTINCT FROM v_series.fiscal_year_id THEN
      UPDATE erp_document_series
      SET next_number = 1, fiscal_year_id = v_fiscal_year_id, updated_at = now()
      WHERE id = p_series_id;
      v_series.next_number := 1;
      v_series.fiscal_year_id := v_fiscal_year_id;
    END IF;
  END IF;
  
  v_next_num := v_series.next_number;
  v_prefix := COALESCE(v_series.prefix, '');
  v_doc_number := v_prefix || LPAD(v_next_num::TEXT, v_series.padding_length, '0');
  IF v_series.suffix IS NOT NULL THEN
    v_doc_number := v_doc_number || v_series.suffix;
  END IF;
  
  UPDATE erp_document_series
  SET next_number = next_number + 1, last_used_at = now(), updated_at = now()
  WHERE id = p_series_id;
  
  INSERT INTO erp_document_numbers (
    series_id, company_id, document_number, sequence_number,
    entity_type, entity_id, fiscal_year_id
  ) VALUES (
    p_series_id, p_company_id, v_doc_number, v_next_num,
    p_entity_type, p_entity_id, v_series.fiscal_year_id
  );
  
  RETURN v_doc_number;
END;
$$;

CREATE OR REPLACE FUNCTION erp_has_permission(
  p_user_id UUID,
  p_company_id UUID,
  p_permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM erp_user_roles ur
    JOIN erp_role_permissions rp ON rp.role_id = ur.role_id
    JOIN erp_permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id
      AND ur.company_id = p_company_id
      AND p.key = p_permission_key
  );
END;
$$;

CREATE OR REPLACE FUNCTION erp_log_audit(
  p_company_id UUID,
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO erp_audit_events (
    company_id, actor_user_id, entity_type, entity_id,
    action, before_json, after_json, metadata
  ) VALUES (
    p_company_id, p_user_id, p_entity_type, p_entity_id,
    p_action, p_before, p_after, p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- =============================================
-- DATOS INICIALES
-- =============================================

INSERT INTO erp_permissions (key, module, action, description) VALUES
  ('admin.all', 'admin', 'all', 'Acceso total de administrador'),
  ('admin.users', 'admin', 'users', 'Gestión de usuarios'),
  ('admin.roles', 'admin', 'roles', 'Gestión de roles y permisos'),
  ('admin.companies', 'admin', 'companies', 'Gestión de empresas'),
  ('admin.settings', 'admin', 'settings', 'Configuración del sistema'),
  ('masters.read', 'masters', 'read', 'Ver maestros'),
  ('masters.write', 'masters', 'write', 'Editar maestros'),
  ('sales.read', 'sales', 'read', 'Ver ventas'),
  ('sales.write', 'sales', 'write', 'Crear/editar ventas'),
  ('sales.post', 'sales', 'post', 'Contabilizar ventas'),
  ('sales.void', 'sales', 'void', 'Anular documentos de venta'),
  ('purchases.read', 'purchases', 'read', 'Ver compras'),
  ('purchases.write', 'purchases', 'write', 'Crear/editar compras'),
  ('purchases.post', 'purchases', 'post', 'Contabilizar compras'),
  ('purchases.void', 'purchases', 'void', 'Anular documentos de compra'),
  ('inventory.read', 'inventory', 'read', 'Ver inventario'),
  ('inventory.write', 'inventory', 'write', 'Movimientos de inventario'),
  ('inventory.recalc', 'inventory', 'recalc', 'Recalcular stock'),
  ('inventory.adjust', 'inventory', 'adjust', 'Ajustes de inventario'),
  ('accounting.read', 'accounting', 'read', 'Ver contabilidad'),
  ('accounting.write', 'accounting', 'write', 'Crear asientos'),
  ('accounting.close', 'accounting', 'close', 'Cerrar periodos'),
  ('accounting.reopen', 'accounting', 'reopen', 'Reabrir periodos'),
  ('treasury.read', 'treasury', 'read', 'Ver tesorería'),
  ('treasury.write', 'treasury', 'write', 'Gestionar pagos/cobros'),
  ('treasury.sepa', 'treasury', 'sepa', 'Generar ficheros SEPA'),
  ('treasury.reconcile', 'treasury', 'reconcile', 'Conciliación bancaria'),
  ('tax.read', 'tax', 'read', 'Ver declaraciones fiscales'),
  ('tax.write', 'tax', 'write', 'Preparar declaraciones'),
  ('tax.sii', 'tax', 'sii', 'Envío SII'),
  ('tax.submit', 'tax', 'submit', 'Presentar declaraciones'),
  ('audit.read', 'audit', 'read', 'Ver registros de auditoría'),
  ('audit.export', 'audit', 'export', 'Exportar auditoría')
ON CONFLICT (key) DO NOTHING;

-- Actualizar empresa existente con código usando subquery
UPDATE erp_companies SET code = 'DEMO' 
WHERE id = (SELECT id FROM erp_companies WHERE code IS NULL ORDER BY created_at LIMIT 1);

-- Crear ejercicio fiscal 2026 si no existe para primera empresa
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id FROM erp_companies ORDER BY created_at LIMIT 1;
  
  IF v_company_id IS NOT NULL THEN
    INSERT INTO erp_fiscal_years (company_id, name, code, start_date, end_date, is_current)
    VALUES (v_company_id, 'Ejercicio 2026', '2026', '2026-01-01', '2026-12-31', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
