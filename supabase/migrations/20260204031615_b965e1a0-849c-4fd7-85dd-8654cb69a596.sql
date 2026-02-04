-- ==========================================================================
-- SISTEMA DE VIGILANCIA NORMATIVA Y ACTUALIZACIÓN DE CONVENIOS/CNO
-- Fase: Control de cambios regulatorios por jurisdicción
-- ==========================================================================

-- Tabla: Vigilancia de normativas pendientes de aprobación oficial
CREATE TABLE IF NOT EXISTS public.erp_hr_regulatory_watch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Identificación
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('press', 'draft', 'proposal', 'rumor', 'union_communication', 'ministry_announcement')),
  source_url TEXT,
  source_name TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Categorización
  category TEXT NOT NULL CHECK (category IN ('convenio_colectivo', 'cno', 'salario_minimo', 'seguridad_social', 'irpf', 'jornada', 'vacaciones', 'contratacion', 'despido', 'formacion', 'prl', 'igualdad', 'otro')),
  jurisdiction TEXT NOT NULL DEFAULT 'ES' CHECK (jurisdiction IN ('ES', 'AD', 'EU', 'PT', 'FR', 'UK', 'AE', 'US')),
  affected_cnae_codes TEXT[], -- Códigos CNAE afectados
  
  -- Estado de aprobación
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'in_force', 'expired', 'superseded')),
  official_publication TEXT, -- BOE, BOPA, DOGC, etc.
  official_publication_date DATE,
  official_publication_number TEXT,
  official_publication_url TEXT,
  effective_date DATE, -- Fecha de entrada en vigor
  
  -- Contenido normativo
  key_changes JSONB, -- Resumen de cambios clave
  affected_articles TEXT[],
  replaces_regulation_id UUID REFERENCES erp_hr_regulatory_watch(id),
  
  -- Impacto
  impact_level TEXT NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  requires_contract_update BOOLEAN DEFAULT false,
  requires_payroll_recalc BOOLEAN DEFAULT false,
  requires_immediate_action BOOLEAN DEFAULT false,
  estimated_affected_employees INTEGER,
  
  -- Seguimiento
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Implementación
  implementation_status TEXT DEFAULT 'not_started' CHECK (implementation_status IN ('not_started', 'in_progress', 'completed', 'not_applicable')),
  implemented_at TIMESTAMPTZ,
  implemented_by UUID REFERENCES profiles(id),
  knowledge_base_id UUID, -- Enlace a agent_knowledge_base cuando se implemente
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: Historial de versiones CNO (Código Nacional de Ocupación)
CREATE TABLE IF NOT EXISTS public.erp_hr_cno_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_code TEXT NOT NULL, -- Ej: "CNO-2011", "CNO-2024"
  version_name TEXT NOT NULL,
  publication_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  official_publication TEXT, -- BOE
  official_publication_url TEXT,
  is_current BOOLEAN DEFAULT false,
  total_codes INTEGER,
  changes_from_previous JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: Mapeo de cambios CNO entre versiones
CREATE TABLE IF NOT EXISTS public.erp_hr_cno_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_version_id UUID REFERENCES erp_hr_cno_versions(id),
  to_version_id UUID REFERENCES erp_hr_cno_versions(id),
  old_cno_code TEXT NOT NULL,
  old_cno_name TEXT,
  new_cno_code TEXT NOT NULL,
  new_cno_name TEXT,
  migration_type TEXT NOT NULL CHECK (migration_type IN ('direct', 'split', 'merge', 'new', 'deleted', 'renamed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: Configuración de vigilancia por empresa
CREATE TABLE IF NOT EXISTS public.erp_hr_regulatory_watch_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  
  -- Modo de chequeo
  auto_check_enabled BOOLEAN DEFAULT true,
  check_frequency TEXT DEFAULT 'daily' CHECK (check_frequency IN ('hourly', 'daily', 'weekly', 'manual')),
  check_time TIME DEFAULT '08:00',
  
  -- Jurisdicciones a vigilar
  jurisdictions TEXT[] DEFAULT ARRAY['ES'],
  
  -- Fuentes a vigilar
  watch_boe BOOLEAN DEFAULT true,
  watch_bopa BOOLEAN DEFAULT false, -- Andorra
  watch_dogc BOOLEAN DEFAULT false, -- Cataluña
  watch_bocm BOOLEAN DEFAULT false, -- Madrid
  watch_bopv BOOLEAN DEFAULT false, -- País Vasco
  watch_eu_official_journal BOOLEAN DEFAULT false,
  watch_press BOOLEAN DEFAULT true,
  watch_ministry_announcements BOOLEAN DEFAULT true,
  watch_union_communications BOOLEAN DEFAULT true,
  
  -- Categorías de interés
  watch_categories TEXT[] DEFAULT ARRAY['convenio_colectivo', 'cno', 'salario_minimo', 'seguridad_social'],
  
  -- Notificaciones
  notify_on_detection BOOLEAN DEFAULT true,
  notify_on_approval BOOLEAN DEFAULT true,
  notify_responsible_ids UUID[],
  
  -- Última ejecución
  last_check_at TIMESTAMPTZ,
  last_check_status TEXT,
  last_check_results JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: Alertas de cambios normativos
CREATE TABLE IF NOT EXISTS public.erp_hr_regulatory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  watch_item_id UUID REFERENCES erp_hr_regulatory_watch(id) ON DELETE CASCADE,
  
  alert_type TEXT NOT NULL CHECK (alert_type IN ('new_detection', 'approval_pending', 'approved', 'effective_soon', 'requires_action', 'implementation_reminder')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_required TEXT,
  action_deadline DATE,
  
  is_read BOOLEAN DEFAULT false,
  read_by UUID REFERENCES profiles(id),
  read_at TIMESTAMPTZ,
  
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_by UUID REFERENCES profiles(id),
  dismissed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_regulatory_watch_company ON erp_hr_regulatory_watch(company_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_watch_status ON erp_hr_regulatory_watch(approval_status);
CREATE INDEX IF NOT EXISTS idx_regulatory_watch_jurisdiction ON erp_hr_regulatory_watch(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_regulatory_watch_category ON erp_hr_regulatory_watch(category);
CREATE INDEX IF NOT EXISTS idx_regulatory_watch_effective ON erp_hr_regulatory_watch(effective_date);
CREATE INDEX IF NOT EXISTS idx_regulatory_alerts_company ON erp_hr_regulatory_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_alerts_unread ON erp_hr_regulatory_alerts(company_id, is_read) WHERE NOT is_read;

-- Triggers updated_at
CREATE OR REPLACE TRIGGER update_erp_hr_regulatory_watch_updated_at
  BEFORE UPDATE ON erp_hr_regulatory_watch
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_erp_hr_regulatory_watch_config_updated_at
  BEFORE UPDATE ON erp_hr_regulatory_watch_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE erp_hr_regulatory_watch ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_cno_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_cno_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_regulatory_watch_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_hr_regulatory_alerts ENABLE ROW LEVEL SECURITY;

-- Policies: regulatory_watch
CREATE POLICY "Users can view regulatory watch for their company" ON erp_hr_regulatory_watch
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR company_id IS NULL -- Normativas globales
  );

CREATE POLICY "Users can manage regulatory watch for their company" ON erp_hr_regulatory_watch
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Policies: cno_versions (lectura pública)
CREATE POLICY "Anyone can view CNO versions" ON erp_hr_cno_versions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view CNO migrations" ON erp_hr_cno_migrations
  FOR SELECT USING (true);

-- Policies: config
CREATE POLICY "Users can manage watch config for their company" ON erp_hr_regulatory_watch_config
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Policies: alerts
CREATE POLICY "Users can view alerts for their company" ON erp_hr_regulatory_alerts
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update alerts for their company" ON erp_hr_regulatory_alerts
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Función: Obtener normativas pendientes de implementar
CREATE OR REPLACE FUNCTION get_pending_regulatory_implementations(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  jurisdiction TEXT,
  approval_status TEXT,
  effective_date DATE,
  impact_level TEXT,
  requires_contract_update BOOLEAN,
  requires_payroll_recalc BOOLEAN,
  days_until_effective INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rw.id,
    rw.title,
    rw.category,
    rw.jurisdiction,
    rw.approval_status,
    rw.effective_date,
    rw.impact_level,
    rw.requires_contract_update,
    rw.requires_payroll_recalc,
    CASE 
      WHEN rw.effective_date IS NOT NULL 
      THEN (rw.effective_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_until_effective
  FROM erp_hr_regulatory_watch rw
  WHERE (rw.company_id = p_company_id OR rw.company_id IS NULL)
    AND rw.approval_status = 'approved'
    AND rw.implementation_status IN ('not_started', 'in_progress')
    AND (rw.effective_date IS NULL OR rw.effective_date >= CURRENT_DATE - INTERVAL '30 days')
  ORDER BY 
    rw.requires_immediate_action DESC,
    rw.effective_date ASC NULLS LAST,
    rw.impact_level DESC;
END;
$$;