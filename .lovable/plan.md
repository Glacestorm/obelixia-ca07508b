
# Plan: RRHH Enterprise Suite — Evolución en 8 Fases

## Estado de Implementación

| Fase | Estado | Detalles |
|------|--------|----------|
| 1 - Arquitectura Enterprise | ✅ Completada | 13 tablas + Edge Function + Hook + 7 UI Panels + Seed Data |
| 2 - Workflow Engine | ✅ Completada | 6 tablas + Edge Function + Hook + 3 UI Panels + 9 Workflows Demo |
| 3 - Compensation Suite | ✅ Completada | 7 tablas + Edge Function + Hook + UI Panel + Seed Data |
| 4 - Talent Intelligence | ✅ Completada | 6 tablas + Edge Function + Hook + UI Panel + Seed Data |
| 5 - Compliance Enterprise | 📋 Pendiente | — |
| 6 - Wellbeing Enterprise | 📋 Pendiente | — |
| 7 - ESG Social + Self-Service | 📋 Pendiente | — |
| 8 - Copilot + Digital Twin | 📋 Pendiente | — |

## FASE 2 — Completada ✅

### Tablas creadas:
- `erp_hr_workflow_definitions` — Definiciones de flujos con condiciones de activación
- `erp_hr_workflow_steps` — Pasos con tipo, rol aprobador, SLA, escalado, delegación
- `erp_hr_workflow_instances` — Instancias en ejecución con realtime
- `erp_hr_workflow_decisions` — Decisiones con comentarios y tiempo de respuesta
- `erp_hr_workflow_delegations` — Delegaciones temporales con scope
- `erp_hr_workflow_sla_tracking` — Tracking de SLAs con breach detection

### Edge Function: `erp-hr-workflow-engine`
- 9 acciones: list_definitions, upsert_definition, start_workflow, decide_step, delegate, get_inbox, get_sla_status, get_workflow_stats, seed_workflows
- Audit trail automático en cada decisión

### Hook: `useHRWorkflowEngine`
- Gestión completa + realtime via supabase channel

### UI (3 paneles):
- `HRWorkflowDesigner` — Visualización de 9 workflows con pasos, roles, SLA y condiciones
- `HRApprovalInbox` — Bandeja de aprobaciones con filtros, stats, decisiones y comentarios
- `HRSLADashboard` — KPIs de cumplimiento, items vencidos/próximos, cuellos de botella

### Seed Data (9 workflows):
- Vacaciones (2 pasos), Contratación (3), Revisión Salarial (3), Offboarding (3), Onboarding (2), Promoción (3), Expediente Disciplinario (3), Validación Finiquito (3), Bonus (3)

### Navegación:
- 3 nuevos items en categoría Enterprise: Workflows, Aprobaciones, SLA Dashboard
