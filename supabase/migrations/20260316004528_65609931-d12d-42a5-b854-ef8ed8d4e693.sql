
-- Phase 2: Register ObelixIA-Supervisor in the AI agents catalog
INSERT INTO erp_ai_agents_registry (
  code, name, module_domain, specialization, agent_type, execution_type,
  backend_handler, ui_entrypoint, status, supervisor_code,
  confidence_threshold, requires_human_review, description, metadata
) VALUES (
  'obelixia-supervisor',
  'ObelixIA-Supervisor',
  'cross',
  'Cross-domain coordination between HR and Legal supervisors',
  'supersupervisor',
  'on_demand',
  'obelixia-supervisor',
  'SupervisorAgentsDashboard',
  'active',
  NULL,
  0.70,
  false,
  'Supersupervisor transversal que coordina HR-Supervisor y Legal-Supervisor. Resuelve conflictos cross-domain, compone respuestas unificadas y escala a revisión humana cuando hay discrepancias o riesgo alto.',
  '{"phase": "2", "version": "1.0", "domains_covered": ["hr", "legal", "cross"], "conflict_threshold": 0.3, "auto_human_review_on_critical": true}'::jsonb
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  updated_at = now();
