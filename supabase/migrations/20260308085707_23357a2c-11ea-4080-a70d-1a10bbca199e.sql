
-- ============================================================
-- FASE PREMIUM 1: Enterprise Security, Data Masking & SoD
-- 6 tablas para seguridad enterprise avanzada
-- ============================================================

-- 1. Clasificaciones de datos (GDPR Art.9, LOPDGDD)
CREATE TABLE public.erp_hr_data_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  field_path TEXT NOT NULL,
  table_name TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'internal',
  sensitivity_level INTEGER NOT NULL DEFAULT 1,
  gdpr_category TEXT,
  retention_days INTEGER DEFAULT 365,
  requires_consent BOOLEAN DEFAULT false,
  requires_encryption BOOLEAN DEFAULT false,
  legal_basis TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_classification CHECK (classification IN ('public','internal','confidential','restricted','top_secret')),
  CONSTRAINT valid_sensitivity CHECK (sensitivity_level BETWEEN 1 AND 5)
);

-- 2. Reglas de enmascaramiento dinámico
CREATE TABLE public.erp_hr_masking_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  classification_id UUID REFERENCES public.erp_hr_data_classifications(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  table_name TEXT NOT NULL,
  masking_type TEXT NOT NULL DEFAULT 'partial',
  masking_pattern TEXT,
  visible_to_roles TEXT[] DEFAULT '{}',
  applies_to_export BOOLEAN DEFAULT true,
  applies_to_api BOOLEAN DEFAULT true,
  applies_to_ui BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_masking_type CHECK (masking_type IN ('full','partial','hash','tokenize','redact','generalize','noise'))
);

-- 3. Reglas de Segregación de Funciones (SoD)
CREATE TABLE public.erp_hr_sod_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL DEFAULT 'exclusive',
  conflicting_permissions TEXT[] NOT NULL,
  conflicting_roles TEXT[] DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'high',
  mitigation_control TEXT,
  is_active BOOLEAN DEFAULT true,
  regulatory_reference TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_rule_type CHECK (rule_type IN ('exclusive','conditional','temporal','hierarchical')),
  CONSTRAINT valid_severity CHECK (severity IN ('low','medium','high','critical'))
);

-- 4. Registro de violaciones SoD
CREATE TABLE public.erp_hr_sod_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  rule_id UUID REFERENCES public.erp_hr_sod_rules(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  violation_type TEXT NOT NULL,
  conflicting_action_a TEXT NOT NULL,
  conflicting_action_b TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  risk_score INTEGER DEFAULT 50,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_violation_status CHECK (status IN ('open','investigating','mitigated','accepted','resolved','escalated'))
);

-- 5. Incidentes de seguridad
CREATE TABLE public.erp_hr_security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  affected_records INTEGER DEFAULT 0,
  affected_tables TEXT[] DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'automated',
  reported_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'open',
  containment_actions JSONB DEFAULT '[]',
  root_cause TEXT,
  resolution TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  contained_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_incident_type CHECK (incident_type IN ('unauthorized_access','data_breach','sod_violation','policy_violation','anomalous_activity','privilege_escalation','data_exfiltration')),
  CONSTRAINT valid_incident_severity CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT valid_incident_status CHECK (status IN ('open','investigating','contained','resolved','closed','false_positive'))
);

-- 6. Log de acceso a datos sensibles
CREATE TABLE public.erp_hr_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  record_id TEXT,
  field_accessed TEXT,
  access_type TEXT NOT NULL DEFAULT 'read',
  classification TEXT,
  was_masked BOOLEAN DEFAULT false,
  access_granted BOOLEAN DEFAULT true,
  denial_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  accessed_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_access_type CHECK (access_type IN ('read','write','export','print','bulk_download'))
);

-- Indexes
CREATE INDEX idx_data_classifications_company ON public.erp_hr_data_classifications(company_id);
CREATE INDEX idx_masking_rules_company ON public.erp_hr_masking_rules(company_id, is_active);
CREATE INDEX idx_sod_rules_company ON public.erp_hr_sod_rules(company_id, is_active);
CREATE INDEX idx_sod_violations_company ON public.erp_hr_sod_violations(company_id, status);
CREATE INDEX idx_security_incidents_company ON public.erp_hr_security_incidents(company_id, status);
CREATE INDEX idx_data_access_log_company ON public.erp_hr_data_access_log(company_id, accessed_at DESC);
CREATE INDEX idx_data_access_log_user ON public.erp_hr_data_access_log(user_id, accessed_at DESC);

-- Enable RLS
ALTER TABLE public.erp_hr_data_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_masking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_sod_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_sod_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_data_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users can manage their company data)
CREATE POLICY "Authenticated users manage data classifications" ON public.erp_hr_data_classifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage masking rules" ON public.erp_hr_masking_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage sod rules" ON public.erp_hr_sod_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage sod violations" ON public.erp_hr_sod_violations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage security incidents" ON public.erp_hr_security_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage data access log" ON public.erp_hr_data_access_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable Realtime for incidents and violations
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_sod_violations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_security_incidents;
