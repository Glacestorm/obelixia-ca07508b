-- =====================================================
-- FASE 1: Sistema de Cumplimiento Legal y Alertas RRHH
-- =====================================================

-- 1. Comunicaciones legales a empleados
CREATE TABLE public.erp_hr_legal_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  communication_type TEXT NOT NULL,
  jurisdiction TEXT DEFAULT 'ES',
  title TEXT NOT NULL,
  content TEXT,
  legal_references TEXT[],
  required_notice_days INTEGER,
  notice_date DATE,
  effective_date DATE,
  deadline_date DATE,
  delivery_method TEXT,
  delivery_status TEXT DEFAULT 'draft',
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledgment_document_url TEXT,
  union_notification_required BOOLEAN DEFAULT false,
  union_notified_at TIMESTAMPTZ,
  checklist_status JSONB DEFAULT '{}',
  ai_validated BOOLEAN DEFAULT false,
  ai_validation_notes TEXT,
  legal_reviewed BOOLEAN DEFAULT false,
  legal_review_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Obligaciones con administraciones públicas (catálogo maestro)
CREATE TABLE public.erp_hr_admin_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  organism TEXT NOT NULL,
  model_code TEXT,
  obligation_name TEXT NOT NULL,
  obligation_type TEXT NOT NULL,
  periodicity TEXT NOT NULL,
  deadline_day INTEGER,
  deadline_month INTEGER,
  deadline_description TEXT,
  legal_reference TEXT,
  sanction_type TEXT,
  sanction_min DECIMAL(12,2),
  sanction_max DECIMAL(12,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Vencimientos por empresa
CREATE TABLE public.erp_hr_obligation_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  obligation_id UUID REFERENCES public.erp_hr_admin_obligations(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  deadline_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  responsible_id UUID,
  completed_at TIMESTAMPTZ,
  document_url TEXT,
  notes TEXT,
  ai_reminded BOOLEAN DEFAULT false,
  legal_reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Catálogo de riesgos de sanción (LISOS y otras normativas)
CREATE TABLE public.erp_hr_sanction_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  legal_reference TEXT NOT NULL,
  infraction_type TEXT NOT NULL,
  classification TEXT NOT NULL,
  description TEXT NOT NULL,
  sanction_min_minor DECIMAL(12,2),
  sanction_max_minor DECIMAL(12,2),
  sanction_min_medium DECIMAL(12,2),
  sanction_max_medium DECIMAL(12,2),
  sanction_min_major DECIMAL(12,2),
  sanction_max_major DECIMAL(12,2),
  preventive_measures TEXT[],
  detection_triggers TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Alertas de riesgo de sanción
CREATE TABLE public.erp_hr_sanction_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  risk_id UUID REFERENCES public.erp_hr_sanction_risks(id) ON DELETE SET NULL,
  obligation_deadline_id UUID REFERENCES public.erp_hr_obligation_deadlines(id) ON DELETE SET NULL,
  communication_id UUID REFERENCES public.erp_hr_legal_communications(id) ON DELETE SET NULL,
  alert_level TEXT DEFAULT 'prealert',
  days_remaining INTEGER,
  potential_sanction_min DECIMAL(12,2),
  potential_sanction_max DECIMAL(12,2),
  title TEXT NOT NULL,
  description TEXT,
  recommended_actions TEXT[],
  hr_agent_notified BOOLEAN DEFAULT false,
  hr_agent_notified_at TIMESTAMPTZ,
  legal_agent_notified BOOLEAN DEFAULT false,
  legal_agent_notified_at TIMESTAMPTZ,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Plantillas de comunicaciones oficiales
CREATE TABLE public.erp_hr_communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  communication_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  dynamic_fields JSONB DEFAULT '[]',
  legal_references TEXT[],
  checklist_items JSONB DEFAULT '[]',
  is_official BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Checklist de cumplimiento por comunicación
CREATE TABLE public.erp_hr_compliance_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID REFERENCES public.erp_hr_legal_communications(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.erp_hr_communication_templates(id) ON DELETE SET NULL,
  item_order INTEGER,
  item_text TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX idx_legal_comm_company ON public.erp_hr_legal_communications(company_id);
CREATE INDEX idx_legal_comm_employee ON public.erp_hr_legal_communications(employee_id);
CREATE INDEX idx_legal_comm_status ON public.erp_hr_legal_communications(delivery_status);
CREATE INDEX idx_legal_comm_deadline ON public.erp_hr_legal_communications(deadline_date);

CREATE INDEX idx_obligation_deadlines_company ON public.erp_hr_obligation_deadlines(company_id);
CREATE INDEX idx_obligation_deadlines_date ON public.erp_hr_obligation_deadlines(deadline_date);
CREATE INDEX idx_obligation_deadlines_status ON public.erp_hr_obligation_deadlines(status);

CREATE INDEX idx_sanction_alerts_company ON public.erp_hr_sanction_alerts(company_id);
CREATE INDEX idx_sanction_alerts_level ON public.erp_hr_sanction_alerts(alert_level);
CREATE INDEX idx_sanction_alerts_resolved ON public.erp_hr_sanction_alerts(is_resolved);

CREATE INDEX idx_comm_templates_jurisdiction ON public.erp_hr_communication_templates(jurisdiction);
CREATE INDEX idx_comm_templates_type ON public.erp_hr_communication_templates(communication_type);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.erp_hr_legal_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_admin_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_obligation_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_sanction_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_sanction_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_compliance_checklist ENABLE ROW LEVEL SECURITY;

-- Policies para legal_communications (acceso por empresa)
CREATE POLICY "Users can view legal communications for their companies"
  ON public.erp_hr_legal_communications FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can insert legal communications for their companies"
  ON public.erp_hr_legal_communications FOR INSERT TO authenticated
  WITH CHECK (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can update legal communications for their companies"
  ON public.erp_hr_legal_communications FOR UPDATE TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Policies para admin_obligations (catálogo público de lectura)
CREATE POLICY "All authenticated users can view admin obligations"
  ON public.erp_hr_admin_obligations FOR SELECT TO authenticated
  USING (true);

-- Policies para obligation_deadlines
CREATE POLICY "Users can view obligation deadlines for their companies"
  ON public.erp_hr_obligation_deadlines FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage obligation deadlines for their companies"
  ON public.erp_hr_obligation_deadlines FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Policies para sanction_risks (catálogo público)
CREATE POLICY "All authenticated users can view sanction risks"
  ON public.erp_hr_sanction_risks FOR SELECT TO authenticated
  USING (true);

-- Policies para sanction_alerts
CREATE POLICY "Users can view sanction alerts for their companies"
  ON public.erp_hr_sanction_alerts FOR SELECT TO authenticated
  USING (public.user_has_erp_company_access(company_id));

CREATE POLICY "Users can manage sanction alerts for their companies"
  ON public.erp_hr_sanction_alerts FOR ALL TO authenticated
  USING (public.user_has_erp_company_access(company_id));

-- Policies para templates (público lectura)
CREATE POLICY "All authenticated users can view communication templates"
  ON public.erp_hr_communication_templates FOR SELECT TO authenticated
  USING (true);

-- Policies para checklist
CREATE POLICY "Users can view compliance checklist for their communications"
  ON public.erp_hr_compliance_checklist FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_legal_communications c
      WHERE c.id = communication_id
      AND public.user_has_erp_company_access(c.company_id)
    )
  );

CREATE POLICY "Users can manage compliance checklist for their communications"
  ON public.erp_hr_compliance_checklist FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.erp_hr_legal_communications c
      WHERE c.id = communication_id
      AND public.user_has_erp_company_access(c.company_id)
    )
  );

-- =====================================================
-- FUNCIONES RPC
-- =====================================================

-- Función para obtener vencimientos próximos
CREATE OR REPLACE FUNCTION public.get_upcoming_deadlines(
  p_company_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  deadline_id UUID,
  obligation_name TEXT,
  organism TEXT,
  deadline_date DATE,
  days_remaining INTEGER,
  status TEXT,
  sanction_type TEXT,
  sanction_max DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as deadline_id,
    o.obligation_name,
    o.organism,
    d.deadline_date,
    (d.deadline_date - CURRENT_DATE)::INTEGER as days_remaining,
    d.status,
    o.sanction_type,
    o.sanction_max
  FROM erp_hr_obligation_deadlines d
  JOIN erp_hr_admin_obligations o ON d.obligation_id = o.id
  WHERE d.company_id = p_company_id
    AND d.status IN ('pending', 'in_progress')
    AND d.deadline_date <= CURRENT_DATE + p_days_ahead
  ORDER BY d.deadline_date ASC;
END;
$$;

-- Función para evaluación de riesgo de sanciones
CREATE OR REPLACE FUNCTION public.get_sanction_risk_assessment(
  p_company_id UUID
)
RETURNS TABLE (
  total_alerts INTEGER,
  critical_alerts INTEGER,
  urgent_alerts INTEGER,
  potential_sanctions_min DECIMAL,
  potential_sanctions_max DECIMAL,
  overdue_obligations INTEGER,
  pending_communications INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM erp_hr_sanction_alerts WHERE company_id = p_company_id AND NOT is_resolved),
    (SELECT COUNT(*)::INTEGER FROM erp_hr_sanction_alerts WHERE company_id = p_company_id AND alert_level = 'critical' AND NOT is_resolved),
    (SELECT COUNT(*)::INTEGER FROM erp_hr_sanction_alerts WHERE company_id = p_company_id AND alert_level = 'urgent' AND NOT is_resolved),
    COALESCE((SELECT SUM(potential_sanction_min) FROM erp_hr_sanction_alerts WHERE company_id = p_company_id AND NOT is_resolved), 0),
    COALESCE((SELECT SUM(potential_sanction_max) FROM erp_hr_sanction_alerts WHERE company_id = p_company_id AND NOT is_resolved), 0),
    (SELECT COUNT(*)::INTEGER FROM erp_hr_obligation_deadlines WHERE company_id = p_company_id AND status = 'overdue'),
    (SELECT COUNT(*)::INTEGER FROM erp_hr_legal_communications WHERE company_id = p_company_id AND delivery_status IN ('draft', 'pending'));
END;
$$;

-- Función para estado de cumplimiento de comunicaciones
CREATE OR REPLACE FUNCTION public.get_communication_compliance_status(
  p_company_id UUID
)
RETURNS TABLE (
  communication_type TEXT,
  total_count INTEGER,
  draft_count INTEGER,
  sent_count INTEGER,
  acknowledged_count INTEGER,
  overdue_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.communication_type,
    COUNT(*)::INTEGER as total_count,
    COUNT(*) FILTER (WHERE c.delivery_status = 'draft')::INTEGER as draft_count,
    COUNT(*) FILTER (WHERE c.delivery_status = 'sent')::INTEGER as sent_count,
    COUNT(*) FILTER (WHERE c.delivery_status = 'acknowledged')::INTEGER as acknowledged_count,
    COUNT(*) FILTER (WHERE c.deadline_date < CURRENT_DATE AND c.delivery_status NOT IN ('acknowledged', 'archived'))::INTEGER as overdue_count
  FROM erp_hr_legal_communications c
  WHERE c.company_id = p_company_id
  GROUP BY c.communication_type;
END;
$$;

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_legal_communications_updated_at
  BEFORE UPDATE ON public.erp_hr_legal_communications
  FOR EACH ROW EXECUTE FUNCTION public.update_compliance_updated_at();

CREATE TRIGGER update_obligation_deadlines_updated_at
  BEFORE UPDATE ON public.erp_hr_obligation_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.update_compliance_updated_at();

CREATE TRIGGER update_sanction_alerts_updated_at
  BEFORE UPDATE ON public.erp_hr_sanction_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_compliance_updated_at();

CREATE TRIGGER update_communication_templates_updated_at
  BEFORE UPDATE ON public.erp_hr_communication_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_compliance_updated_at();