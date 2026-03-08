
-- Phase 5: Compliance Enterprise HR
-- Políticas, auditorías, incidentes, formación compliance, evaluaciones de riesgo

-- Tabla de políticas/normativas enterprise
CREATE TABLE public.erp_hr_compliance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  regulation_reference TEXT,
  version TEXT DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'draft',
  effective_date DATE,
  review_date DATE,
  owner_role TEXT,
  approval_status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  risk_level TEXT DEFAULT 'medium',
  jurisdictions TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  content JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de auditorías de compliance
CREATE TABLE public.erp_hr_compliance_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  audit_type TEXT NOT NULL DEFAULT 'internal',
  title TEXT NOT NULL,
  description TEXT,
  scope TEXT,
  lead_auditor TEXT,
  audit_team TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'planned',
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  findings_count INT DEFAULT 0,
  critical_findings INT DEFAULT 0,
  overall_score NUMERIC(5,2),
  report_url TEXT,
  findings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de incidentes de compliance
CREATE TABLE public.erp_hr_compliance_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  incident_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'violation',
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  reported_by UUID,
  reported_at TIMESTAMPTZ DEFAULT now(),
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  root_cause TEXT,
  corrective_actions JSONB DEFAULT '[]',
  preventive_actions JSONB DEFAULT '[]',
  affected_regulations TEXT[] DEFAULT '{}',
  financial_impact NUMERIC(12,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de formación en compliance
CREATE TABLE public.erp_hr_compliance_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  regulation_area TEXT NOT NULL,
  training_type TEXT DEFAULT 'mandatory',
  format TEXT DEFAULT 'online',
  duration_hours NUMERIC(5,1) DEFAULT 1,
  target_roles TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  deadline DATE,
  completion_rate NUMERIC(5,2) DEFAULT 0,
  total_enrolled INT DEFAULT 0,
  total_completed INT DEFAULT 0,
  content_url TEXT,
  certification_required BOOLEAN DEFAULT false,
  recurrence_months INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de evaluaciones de riesgo compliance
CREATE TABLE public.erp_hr_compliance_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  assessment_name TEXT NOT NULL,
  description TEXT,
  assessment_type TEXT DEFAULT 'periodic',
  status TEXT DEFAULT 'in_progress',
  assessor TEXT,
  scope TEXT,
  risk_areas JSONB DEFAULT '[]',
  overall_risk_score NUMERIC(5,2),
  risk_level TEXT DEFAULT 'medium',
  mitigation_plan JSONB DEFAULT '[]',
  next_review_date DATE,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de KPIs de compliance
CREATE TABLE public.erp_hr_compliance_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  kpi_name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_value NUMERIC(10,2),
  target_value NUMERIC(10,2),
  unit TEXT DEFAULT '%',
  trend TEXT DEFAULT 'stable',
  period TEXT,
  measured_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.erp_hr_compliance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_compliance_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_compliance_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_compliance_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_compliance_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_hr_compliance_kpis ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para authenticated
CREATE POLICY "Authenticated users can manage compliance policies" ON public.erp_hr_compliance_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage compliance audits" ON public.erp_hr_compliance_audits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage compliance incidents" ON public.erp_hr_compliance_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage compliance training" ON public.erp_hr_compliance_training FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage compliance risk assessments" ON public.erp_hr_compliance_risk_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage compliance kpis" ON public.erp_hr_compliance_kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime para incidentes
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_hr_compliance_incidents;
