
# Plan: RRHH Enterprise Suite — Evolución en 8 Fases + Premium + Global

## Estado de Implementación — Global HR Platform

| Fase Global | Estado | Detalles |
|------|--------|----------|
| G1 - Country Registry + Policy Engine | ✅ Completada | 3 tablas (hr_country_registry, hr_country_policies, hr_employee_extensions) + Edge Function (hr-country-registry) + Hook (useCountryRegistry) + UI Panel (3 tabs: Países, Políticas, Compliance IA) + Navegación Global + Realtime + Seed España |
| G1b - Modelo de Datos Global (23 tablas) | ✅ Completada | 23 tablas nuevas + ALTER existentes: Core (profiles, job_assignments, leave_incidents, admin_requests, tasks), Localización (rule_sets, localization_configs, document_templates), Payroll (periods, records, record_lines, variables, ss_events, tax_events), Mobility (assignments, packages, immigration, tax_eq, split_payroll), Compliance (requirements, evidence), Integraciones (adapters, submissions, receipts) + RLS + Indexes + Realtime |
| G1c - Navegación y Páginas (N1-N5) | ✅ Completada | Mega-menu reorganizado 7 áreas (Core HR, Payroll, Laboral, Global, Talento, Enterprise, Utilidades) + Expediente transversal empleado (9 tabs) + 8 paneles nuevos (Leave Incidents, Admin Requests, Tasks, Official Submissions, Mobility Dashboard, Payroll Periods, Compliance Evidence, ES Localization) + HRStatusBadge + HREntityBreadcrumb + HRCommandPalette (Cmd+K) |
| G2 - Extraer lógica ES a plugin | 🔜 Pendiente | IRPF, TGSS, contratos, permisos → localization/es/ |
| G3 - Payroll Engine genérico | 🔜 Pendiente | Refactor motor de nómina multi-país |
| G4 - Integraciones oficiales ES | 🔜 Pendiente | Milena PA, SILTRA, Contrat@, AEAT |
| G5 - Global Mobility | 🔜 Pendiente | Asignaciones, immigration, tax equalization |
| G6 - Plugins adicionales (FR, PT) | 🔜 Pendiente | Localizaciones futuras |

## Estado de Implementación — Fases Base

| Fase | Estado | Detalles |
|------|--------|----------|
| 1 - Arquitectura Enterprise | ✅ Completada | 13 tablas + Edge Function + Hook + 7 UI Panels + Seed Data |
| 2 - Workflow Engine | ✅ Completada | 6 tablas + Edge Function + Hook + 3 UI Panels + 9 Workflows Demo |
| 3 - Compensation Suite | ✅ Completada | 7 tablas + Edge Function + Hook + UI Panel + Seed Data |
| 4 - Talent Intelligence | ✅ Completada | 6 tablas + Edge Function + Hook + UI Panel + Seed Data |
| 5 - Compliance Enterprise | ✅ Completada | 6 tablas + Edge Function + Hook + UI Panel + Seed Data + AI Risk/Gap Analysis |
| 6 - Wellbeing Enterprise | ✅ Completada | 7 tablas + Edge Function + Hook + UI Panel + Seed Data + AI Analysis |
| 7 - ESG Social + Self-Service | ✅ Completada | 6 tablas + Edge Function + Hook + UI Panel + Seed Data + AI Analysis |
| 8 - Copilot + Digital Twin | ✅ Completada | 5 tablas + Edge Function + Hook + UI Panel + Seed Data + AI Chat/Analysis/Simulation |

## Premium Phases — Enterprise Differentiators

| Fase Premium | Estado | Detalles |
|------|--------|----------|
| P1 - Enterprise Security, Data Masking & SoD | ✅ Completada | 6 tablas + Edge Function + Hook + UI Panel (6 tabs) + AI Security Analysis + Realtime |
| P2 - AI Governance Layer | ✅ Completada | 5 tablas + Edge Function consolidada + Hook + UI Panel (6 tabs) + AI Governance Analysis + Bias Audit + Realtime |
| P3 - Workforce Planning & Scenario Studio | ✅ Completada | 5 tablas + Edge Function consolidada + Hook + UI Panel (5 tabs) + AI Simulation/Analysis + Realtime + Seed Data |
| P4 - Fairness / Justice Engine | ✅ Completada | 5 tablas + Edge Function consolidada + Hook + UI Panel (5 tabs) + AI Equity Analysis + Pay Equity AI + Realtime + Seed Data |
| P5 - Organizational Digital Twin completo | ✅ Completada | 5 tablas + Edge Function extendida + Hook + UI Panel (5 tabs) + AI Analysis/Sync/Experiments + Realtime + Seed Data |
| P6 - Documentary Legal Engine premium | ✅ Completada | 5 tablas + Edge Function (erp-hr-premium-intelligence) + Hook + UI Panel (5 tabs) + AI Contract Gen/Compliance/Clause Review + Realtime + Seed Data |
| P7 - CNAE-Specific HR Intelligence | ✅ Completada | 5 tablas + Edge Function extendida (erp-hr-premium-intelligence) + Hook + UI Panel (5 tabs) + AI Sector Analysis/Benchmarks + Realtime + Seed Data |
| P8 - Role-Based Experience Ecosystem | ✅ Completada | 5 tablas + Edge Function extendida (erp-hr-premium-intelligence) + Hook + UI Panel (5 tabs) + AI UX Analysis + Realtime + Seed Data |

### Edge Functions consolidadas (plan):
- `erp-hr-security-governance` → Security + AI Governance + Fairness (P1 ✅)
- `erp-hr-strategic-planning` → Workforce Planning + Digital Twin + Scenario Studio
- `erp-hr-premium-intelligence` → Legal Engine + CNAE Intelligence + Role Experience

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
