
-- =============================================
-- AUDIT CENTER: New tables + Agent registrations
-- =============================================

-- 1. audit_center_sessions: Tracks review sessions
CREATE TABLE IF NOT EXISTS public.audit_center_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'internal_review',
  module_reviewed TEXT,
  events_reviewed INTEGER DEFAULT 0,
  actions_taken JSONB DEFAULT '[]'::jsonb,
  findings JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_center_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit sessions"
  ON public.audit_center_sessions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit sessions"
  ON public.audit_center_sessions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own audit sessions"
  ON public.audit_center_sessions FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid());

-- 2. audit_regulatory_submissions: Regulatory submission history
CREATE TABLE IF NOT EXISTS public.audit_regulatory_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  regulator TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  reference_code TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  deadline TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  response_content JSONB DEFAULT '{}'::jsonb,
  evidence_ids UUID[] DEFAULT '{}',
  ai_agent_code TEXT,
  ai_confidence NUMERIC(4,2),
  human_approved_by UUID,
  human_approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_regulatory_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read regulatory submissions"
  ON public.audit_regulatory_submissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert regulatory submissions"
  ON public.audit_regulatory_submissions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update regulatory submissions"
  ON public.audit_regulatory_submissions FOR UPDATE TO authenticated
  USING (true);

-- 3. Register 11 Audit AI Agents in erp_ai_agents_registry
-- 8 Specialists + 2 Supervisors + 1 SuperSupervisor

-- SuperSupervisor Audit
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, backend_handler, ui_entrypoint, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata)
VALUES
('AUDIT-SS-001', 'SuperSupervisor de Auditoría', 'audit', 'audit_coordination', 'super_supervisor', 'ai_driven', 'audit-agent-supervisor', 'AuditSuperSupervisorPanel', 'active', NULL, 0.85, true, 'Coordinador central de toda la inteligencia de auditoría. Consolida outputs de ambos supervisores, genera visión 360°, arbitra conflictos inter-dominio y calibra agentes continuamente.', '{"level": 3, "hierarchy": "top", "reports_to": "ObelixIA-Supervisor"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Supervisor Interno
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, backend_handler, ui_entrypoint, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata)
VALUES
('AUDIT-SUP-INT-001', 'Supervisor Auditoría Interna', 'audit', 'internal_audit_supervision', 'supervisor', 'ai_driven', 'audit-agent-supervisor', 'AuditSupervisorPanel', 'active', 'AUDIT-SS-001', 0.80, true, 'Coordina 5 agentes de auditoría interna. Consolida alertas por prioridad, resuelve conflictos entre agentes y genera informe consolidado interno.', '{"level": 2, "subordinate_count": 5, "domain": "internal"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Supervisor Externo
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, backend_handler, ui_entrypoint, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata)
VALUES
('AUDIT-SUP-EXT-001', 'Supervisor Auditoría Externa', 'audit', 'external_audit_supervision', 'supervisor', 'ai_driven', 'audit-agent-supervisor', 'AuditSupervisorPanel', 'active', 'AUDIT-SS-001', 0.80, true, 'Coordina 3 agentes de auditoría externa. Gestiona ciclo de vida de auditorías regulatorias, seguimiento de plazos y preparación de packages de respuesta.', '{"level": 2, "subordinate_count": 3, "domain": "external"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 8 Agentes Especializados
-- AGT-001: Detección de Anomalías (Interno)
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, backend_handler, ui_entrypoint, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata)
VALUES
('AUDIT-AGT-001', 'Detección de Anomalías', 'audit', 'anomaly_detection', 'specialist', 'ai_driven', 'audit-agent-specialist', 'AuditAgentsDashboard', 'active', 'AUDIT-SUP-INT-001', 0.75, true, 'Monitoriza erp_audit_events, erp_hr_audit_log y ai_audit_logs en tiempo real. Detecta patrones inusuales: acceso fuera de horario, volumen anormal, comportamiento divergente.', '{"domain": "internal", "autonomous": false, "tables_monitored": ["erp_audit_events", "erp_hr_audit_log", "ai_audit_logs"]}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- AGT-002: Clasificación de Eventos (Interno)
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, backend_handler, ui_entrypoint, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata)
VALUES
('AUDIT-AGT-002', 'Clasificación de Eventos', 'audit', 'event_classification', 'specialist', 'ai_driven', 'audit-agent-specialist', 'AuditAgentsDashboard', 'active', 'AUDIT-SUP-INT-001', 0.85, false, 'Clasifica cada evento de auditoría automáticamente por tipo, severidad (info/warning/critical), normativa aplicable (GDPR/DORA/PSD3), módulo origen y prioridad.', '{"domain": "internal", "autonomous": true, "taxonomy": "banking"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- AGT-003: Compliance Interno (Interno)
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, backend_handler, ui_entrypoint, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata)
VALUES
('AUDIT-AGT-003', 'Compliance Interno', 'audit', 'internal_compliance', 'specialist', 'ai_driven', 'audit-agent-specialist', 'AuditAgentsDashboard', 'active', 'AUDIT-SUP-INT-001', 0.80, false, 'Verifica continuamente que procesos internos cumplen políticas. Detecta violaciones de segregación de funciones, aprobaciones expiradas, configuraciones IA fuera de gobernanza.', '{"domain": "internal", "rules_engine": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- AGT-004: Análisis de Riesgo (Interno)
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, backend_handler, ui_entrypoint, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata)
VALUES
('AUDIT-AGT-004', 'Análisis de Riesgo', 'audit', 'risk_analysis', 'specialist', 'ai_driven', 'audit-agent-specialist', 'AuditAgentsDashboard', 'active', 'AUDIT-SUP-INT-001', 0.70, true, 'Calcula risk score por área basándose en historial de alertas, frecuencia de incidencias, tendencia temporal y exposición regulatoria. Genera mapa de calor de riesgo.', '{"domain": "internal", "scoring": true, "prediction_horizon_days": 30}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- AGT-005: Resumen Ejecutivo (Interno)
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, backend_handler, ui_entrypoint, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata)
VALUES
('AUDIT-AGT-005', 'Resumen Ejecutivo', 'audit', 'executive_summary', 'specialist', 'ai_driven', 'audit-agent-specialist', 'AuditAgentsDashboard', 'active', 'AUDIT-SUP-INT-001', 0.80, true, 'Genera resumen ejecutivo diario de actividad de auditoría: incidencias, alertas resueltas/pendientes, métricas clave, comparativa y recomendaciones accionables.', '{"domain": "internal", "frequency": "daily", "requires_approval": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- AGT-006: Informes Regulatorios (Externo)
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, backend_handler, ui_entrypoint, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata)
VALUES
('AUDIT-AGT-006', 'Informes Regulatorios', 'audit', 'regulatory_reports', 'specialist', 'ai_driven', 'audit-agent-specialist', 'AuditAgentsDashboard', 'active', 'AUDIT-SUP-EXT-001', 0.65, true, 'Especializado en preparación de respuestas a reguladores. Conoce formatos BdE, BCE y AEPD. Genera borradores de respuesta a requerimientos en horas.', '{"domain": "external", "regulators": ["BdE", "BCE", "AEPD"], "always_human_review": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- AGT-007: Gestión de Evidencias (Externo)
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, backend_handler, ui_entrypoint, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata)
VALUES
('AUDIT-AGT-007', 'Gestión de Evidencias', 'audit', 'evidence_management', 'specialist', 'ai_driven', 'audit-agent-specialist', 'AuditAgentsDashboard', 'active', 'AUDIT-SUP-EXT-001', 0.80, false, 'Gestiona ciclo de vida de evidencias: recepción, clasificación, validación de integridad, vinculación con hallazgos y preparación para informes formales.', '{"domain": "external", "evidence_types": ["document", "log", "screenshot", "report"]}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- AGT-008: Verificador Blockchain (Externo)
INSERT INTO public.erp_ai_agents_registry (code, name, module_domain, specialization, agent_type, execution_type, backend_handler, ui_entrypoint, status, supervisor_code, confidence_threshold, requires_human_review, description, metadata)
VALUES
('AUDIT-AGT-008', 'Verificador Blockchain', 'audit', 'blockchain_verification', 'specialist', 'ai_driven', 'audit-agent-specialist', 'AuditAgentsDashboard', 'active', 'AUDIT-SUP-EXT-001', 0.95, false, 'Verifica integridad del blockchain_audit_entries. Ancla automáticamente eventos críticos en la cadena. Detecta intentos de manipulación del audit trail. Alerta inmediata con acción autónoma de bloqueo.', '{"domain": "external", "autonomous_blocking": true, "integrity_checks": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;
