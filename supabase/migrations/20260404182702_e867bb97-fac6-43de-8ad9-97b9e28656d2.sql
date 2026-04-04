
-- =============================================
-- FASE A: Infraestructura Auditoría/Compliance + Agentes IA Nómina
-- =============================================

-- 1. erp_audit_findings
CREATE TABLE public.erp_audit_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  finding_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  iso_standard TEXT NOT NULL DEFAULT 'ISO 9001',
  iso_clause TEXT,
  severity TEXT NOT NULL DEFAULT 'minor',
  status TEXT NOT NULL DEFAULT 'open',
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  responsible_user_id UUID,
  due_date TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  evidence_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_audit_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_audit_findings_select" ON public.erp_audit_findings FOR SELECT TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_audit_findings_insert" ON public.erp_audit_findings FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_audit_findings_update" ON public.erp_audit_findings FOR UPDATE TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE INDEX idx_audit_findings_company ON public.erp_audit_findings(company_id);
CREATE INDEX idx_audit_findings_status ON public.erp_audit_findings(status);

-- 2. erp_audit_reports
CREATE TABLE public.erp_audit_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  report_code TEXT NOT NULL,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'internal',
  iso_standards TEXT[] DEFAULT '{}',
  scope TEXT,
  period_start DATE,
  period_end DATE,
  auditor_name TEXT,
  auditor_organization TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  findings_count INTEGER DEFAULT 0,
  summary TEXT,
  conclusions TEXT,
  file_url TEXT,
  file_hash TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_audit_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_audit_reports_select" ON public.erp_audit_reports FOR SELECT TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_audit_reports_insert" ON public.erp_audit_reports FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_audit_reports_update" ON public.erp_audit_reports FOR UPDATE TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE INDEX idx_audit_reports_company ON public.erp_audit_reports(company_id);

-- 3. erp_audit_iso_evidence
CREATE TABLE public.erp_audit_iso_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  iso_standard TEXT NOT NULL,
  clause_number TEXT NOT NULL,
  clause_title TEXT,
  compliance_status TEXT NOT NULL DEFAULT 'pending',
  evidence_description TEXT,
  document_url TEXT,
  document_hash TEXT,
  finding_id UUID REFERENCES public.erp_audit_findings(id) ON DELETE SET NULL,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_audit_iso_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_audit_iso_evidence_select" ON public.erp_audit_iso_evidence FOR SELECT TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_audit_iso_evidence_insert" ON public.erp_audit_iso_evidence FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_audit_iso_evidence_update" ON public.erp_audit_iso_evidence FOR UPDATE TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE INDEX idx_audit_iso_evidence_company ON public.erp_audit_iso_evidence(company_id);
CREATE INDEX idx_audit_iso_evidence_standard ON public.erp_audit_iso_evidence(iso_standard, clause_number);

-- 4. erp_audit_retention_policy
CREATE TABLE public.erp_audit_retention_policy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  retention_months INTEGER NOT NULL DEFAULT 60,
  legal_basis TEXT,
  action_on_expiry TEXT NOT NULL DEFAULT 'archive',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_audit_retention_policy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_audit_retention_policy_select" ON public.erp_audit_retention_policy FOR SELECT TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_audit_retention_policy_insert" ON public.erp_audit_retention_policy FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_audit_retention_policy_update" ON public.erp_audit_retention_policy FOR UPDATE TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE INDEX idx_audit_retention_company ON public.erp_audit_retention_policy(company_id);

-- 5. erp_audit_access_log (append-only)
CREATE TABLE public.erp_audit_access_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  accessed_table TEXT NOT NULL,
  accessed_record_id TEXT,
  access_type TEXT NOT NULL DEFAULT 'view',
  justification TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_audit_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_audit_access_log_select" ON public.erp_audit_access_log FOR SELECT TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_audit_access_log_insert" ON public.erp_audit_access_log FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE INDEX idx_audit_access_log_company ON public.erp_audit_access_log(company_id);
CREATE INDEX idx_audit_access_log_created ON public.erp_audit_access_log(created_at DESC);

-- 6. erp_audit_document_exports
CREATE TABLE public.erp_audit_document_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  export_code TEXT NOT NULL,
  package_type TEXT NOT NULL DEFAULT 'full',
  iso_standards TEXT[] DEFAULT '{}',
  period_start DATE,
  period_end DATE,
  file_url TEXT,
  file_hash TEXT,
  file_size_bytes BIGINT,
  contents_summary JSONB DEFAULT '{}',
  requested_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_audit_document_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_audit_document_exports_select" ON public.erp_audit_document_exports FOR SELECT TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_audit_document_exports_insert" ON public.erp_audit_document_exports FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_audit_document_exports_update" ON public.erp_audit_document_exports FOR UPDATE TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE INDEX idx_audit_document_exports_company ON public.erp_audit_document_exports(company_id);

-- 7. erp_hr_generated_files
CREATE TABLE public.erp_hr_generated_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_hash TEXT,
  file_size_bytes BIGINT,
  period_month INTEGER,
  period_year INTEGER,
  status TEXT NOT NULL DEFAULT 'generated',
  rejection_reason TEXT,
  sent_at TIMESTAMPTZ,
  response_at TIMESTAMPTZ,
  generated_by_agent TEXT,
  payroll_run_id UUID,
  records_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_hr_generated_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_hr_generated_files_select" ON public.erp_hr_generated_files FOR SELECT TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_hr_generated_files_insert" ON public.erp_hr_generated_files FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE POLICY "erp_hr_generated_files_update" ON public.erp_hr_generated_files FOR UPDATE TO authenticated USING (company_id IN (SELECT erp_get_user_companies(auth.uid())));
CREATE INDEX idx_hr_generated_files_company ON public.erp_hr_generated_files(company_id);
CREATE INDEX idx_hr_generated_files_type ON public.erp_hr_generated_files(file_type);
CREATE INDEX idx_hr_generated_files_status ON public.erp_hr_generated_files(status);

-- 8. Triggers updated_at
CREATE TRIGGER update_erp_audit_findings_updated_at BEFORE UPDATE ON public.erp_audit_findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_erp_audit_reports_updated_at BEFORE UPDATE ON public.erp_audit_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_erp_audit_iso_evidence_updated_at BEFORE UPDATE ON public.erp_audit_iso_evidence FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_erp_audit_retention_policy_updated_at BEFORE UPDATE ON public.erp_audit_retention_policy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_erp_hr_generated_files_updated_at BEFORE UPDATE ON public.erp_hr_generated_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Register 9 new AI agents
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata) VALUES
('PAYROLL-SUP-001', 'Supervisor de Nómina', 'payroll', 'Orquestación del ciclo completo de nómina', 'supervisor', 'orchestration', 'active', NULL, 0.85, true, 'Supervisor que coordina los 6 agentes especialistas del dominio payroll. Gestiona el ciclo de vida completo desde borrador hasta pago.', '{"domain":"payroll","cycle_states":["DRAFT","CALCULATED","LEGAL_VALIDATED","APPROVED","FILED","ACCOUNTED","PAID"],"escalation_target":"obelixia-supervisor","cross_module_bridges":["accounting","treasury","fiscal","legal"]}'::jsonb),
('PAY-AGT-001', 'Motor de Cálculo Nómina', 'payroll', 'Cálculo de devengos, deducciones, bases y netos', 'specialist', 'calculation', 'active', 'PAYROLL-SUP-001', 0.90, false, 'Ejecuta cálculo completo de nómina con conceptos personalizados, datos simbólicos, pluriempleo y cotización de solidaridad 2026.', '{"domain":"payroll","capabilities":["payroll_calculation","symbolic_data","custom_concepts","multi_employment"]}'::jsonb),
('PAY-AGT-002', 'Generador Ficheros TGSS', 'payroll', 'Generación FAN, FDI, AFI, RLC/RNT, SILTRA, DELT@', 'specialist', 'file_generation', 'active', 'PAYROLL-SUP-001', 0.95, true, 'Genera ficheros normalizados para TGSS con hash SHA-256 y gestión de estados de tramitación.', '{"domain":"payroll","file_types":["FAN","FDI","AFI","RLC","RNT","SILTRA","DELTA"],"output_table":"erp_hr_generated_files"}'::jsonb),
('PAY-AGT-003', 'Motor IRPF y Fiscal', 'payroll', 'Regularización IRPF, modelos 111/190, certificados', 'specialist', 'fiscal_calculation', 'active', 'PAYROLL-SUP-001', 0.90, true, 'Motor fiscal: regularización IRPF (RIRPF art. 88), modelos tributarios y certificados de retenciones.', '{"domain":"payroll","capabilities":["irpf_regularization","modelo_111","modelo_190","retention_certificates"]}'::jsonb),
('PAY-AGT-004', 'Motor IT y Bajas', 'payroll', 'Gestión IT: bases reguladoras, partes, fechas hito', 'specialist', 'process_management', 'active', 'PAYROLL-SUP-001', 0.85, true, 'Gestiona ciclo completo IT (LGSS art. 175): partes baja/alta/confirmación, bases reguladoras, alertas 365/545 días.', '{"domain":"payroll","capabilities":["it_lifecycle","base_calculation","milestone_alerts","part_generation"]}'::jsonb),
('PAY-AGT-005', 'Motor Embargos LEC', 'payroll', 'Cálculo embargos Art. 607-608 LEC', 'specialist', 'legal_calculation', 'active', 'PAYROLL-SUP-001', 0.95, true, 'Motor determinista de embargos: tramos Art. 607 LEC (SMI 2026), Art. 608 pensión alimenticia, múltiples embargos concurrentes.', '{"domain":"payroll","capabilities":["garnishment_calculation","art607_tranches","art608_alimony","multi_garnishment"],"smi_2026":1134}'::jsonb),
('PAY-AGT-006', 'Bridge Cross-Module Nómina', 'payroll', 'Coordinación con Contabilidad, Tesorería, Fiscal, Legal', 'specialist', 'integration', 'active', 'PAYROLL-SUP-001', 0.85, true, 'Genera asientos PGC 2007, órdenes pago SEPA, pre-genera datos fiscales y consulta Legal-Supervisor para validaciones.', '{"domain":"payroll","capabilities":["accounting_entries","treasury_payments","fiscal_models","legal_validation"],"target_modules":["accounting","treasury","fiscal","legal"]}'::jsonb),
('AGT-GDPR-001', 'Agente Cumplimiento GDPR', 'compliance', 'Verificación RGPD/LOPDGDD en datos empleados', 'specialist', 'compliance_check', 'active', NULL, 0.90, true, 'Audita cumplimiento RGPD (UE 2016/679) y LOPDGDD (LO 3/2018): consentimientos, retención, derechos ARCO, minimización.', '{"domain":"compliance","regulations":["GDPR_EU_2016_679","LOPDGDD_LO_3_2018"],"capabilities":["consent_audit","retention_check","data_minimization","arco_rights"]}'::jsonb),
('AGT-AUDIT-001', 'Agente Auditoría ISO', 'compliance', 'Auditoría ISO 9001/27001/45001', 'specialist', 'audit_automation', 'active', NULL, 0.85, true, 'Auditorías automatizadas ISO: verificación por cláusula, hallazgos, acciones correctivas, informes con hash de integridad.', '{"domain":"compliance","iso_standards":["ISO_9001","ISO_27001","ISO_45001"],"capabilities":["clause_verification","finding_management","evidence_validation","report_generation"]}'::jsonb);
