
# Plan: RRHH Enterprise Suite — Evolución en 8 Fases + Premium + Global

## Estado de Implementación — Global HR Platform

| Fase Global | Estado | Detalles |
|------|--------|----------|
| G1 - Country Registry + Policy Engine | ✅ Completada | 3 tablas + Edge Function + Hook + UI Panel + Seed España |
| G1b - Modelo de Datos Global (23 tablas) | ✅ Completada | 23 tablas nuevas + ALTER existentes |
| G1c - Navegación y Páginas (N1-N5) | ✅ Completada | Mega-menu 7 áreas + Expediente 9 tabs + 8 paneles nuevos + HRStatusBadge + HREntityBreadcrumb + HRCommandPalette |
| **C1-C4 - Global HR Core** | ✅ **Completada** | Migration (contract_template_id, country_code en contratos) + Expediente refactorizado a 10 tabs independientes + tab dinámico por país + HREmployeesPanel con filtros globales (país, entidad legal) + HREmployeeFormDialog con sección de localización dinámica + Ciclo de vida universal (7 estados) + Eliminadas columnas ES del core |
| C5-C7 - Mejoras funcionales | ✅ Completada | ExpedientTrayectoriaTab (timeline hr_job_assignments) + ExpedientCompensacionTab (salario global sin cálculos fiscales locales) + Tabs de tiempo, formación, desempeño, documentos, movilidad, auditoría |
| **AP - Portal Administrativo HR** | ✅ **Completada** | 2 tablas nuevas (comments + activity) + Hook useAdminPortal + HRAdminPortal (7 componentes) + 14 tipos de solicitud + Formularios dinámicos + Timeline actividad + Comentarios internos + Dashboard KPIs + Generación automática de tareas + HRStatusBadge ampliado (13 estados request) + Realtime |
| **G2 - Localización España (Plugin ES)** | ✅ **Completada** | 4 tablas nuevas (hr_es_employee_labor_data, hr_es_irpf_tables, hr_es_ss_bases, hr_es_contract_types) + Seed IRPF 2026/SS bases/contratos RD + Hook useESLocalization + ESLocalizationPlugin (6 tabs) + ESEmployeeLaborDataForm + ESSocialSecurityPanel (simulador cotización + bases) + ESIRPFPanel (calculadora retención + tramos) + ESContractTypesPanel (catálogo RD) + ESPermisosPanel (ET) + ESSettlementCalculator (finiquito) + Integración ExpedientLocalizacionTab + HRModule nav |
| **G3 - Payroll Engine genérico** | ✅ **Completada** | 3 tablas nuevas (concept_templates, simulations, audit_log) + ALTER periodos/líneas + Hook usePayrollEngine + HRPayrollEngine (5 tabs) + PeriodManager + RecordsList + ConceptsCatalog + Simulator + AuditTrail + Pre-close validation + Realtime |
| **G4 - Official Integrations Hub** | ✅ **Completada** | 3 tablas extendidas (ALTER submissions + receipts) + Seed 7 adaptadores ES (TGSS/RED, SILTRA, Contrat@, Certific@2, Delt@, AEAT, SEPE) + Hook useOfficialIntegrationsHub (CRUD completo + realtime + stats) + OfficialIntegrationsHub (4 tabs: Dashboard, Envíos, Conectores, Acuses) + SubmissionForm + SubmissionDetail (timeline + acuses) + AdaptersPanel (por país) + ReceiptsPanel + Integración HRModule |
| **G5 - Global Mobility** | ✅ **Completada** | 4 tablas + Hook useGlobalMobility + GlobalMobilityModule (5 tabs) + 8 componentes + Modelo 5 jurisdicciones + Compliance panel |
| G6 - Plugins adicionales (FR, PT) | 🔜 Pendiente | Localizaciones futuras |
| **F17 - QA Final y Cierre MVP** | ✅ **Completada** | Smoke test 26 items + dashboard ✅ · 0 errores consola · 0 errores RLS/403/5xx · Seed validado (108 emp, 58 contratos, 84 vacaciones, 7 nóminas) · Baseline congelado · Acta en `.lovable/mvp-rrhh-baseline.md` |

## V2 — Evolución Post-MVP

| Subfase V2 | Estado | Detalles |
|------|--------|----------|
| **V2-ES.1 - Motor nómina ES operativo** | ✅ **Completada** | 5 pasos · calculation_trace JSONB · cálculo masivo idempotente · inyección incidencias · comparativa período-a-período · review/approval workflow · cierre con validación de revisión · UNIQUE(payroll_period_id, employee_id) · 3 subcomponentes UI nuevos · 0 rutas/menús nuevos |
| **V2-ES.2 - Workflows y aprobaciones reales** | ✅ **Completada** | 5 pasos · Mapping 14 request_types → workflow process_types · Start workflow idempotente + sync inverso decide_step → admin_request status · Trazabilidad estructurada (source_type, source_id, related_entity_type, related_entity_id, workflow_instance_id) · Sync automático decision → task status (approved→in_progress, rejected→cancelled, returned→on_hold) · Timeline unificado (activity + comments + linked tasks) · 0 migraciones · 0 rutas/menús nuevos |
| V2-ES.3 - Expediente documental operativo | 🔜 Pendiente | |
| V2-ES.4 - Integraciones oficiales España | 🔜 Pendiente | |

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

---

## V2-ES.1 — Acta de cierre

### Paso 1: calculation_trace JSONB
- Campo `calculation_trace` (JSONB) en `hr_payroll_record_lines`
- Estructura `{ rule, inputs, formula, timestamp }` por cada línea
- Campo `incident_ref` + `incident_id` en líneas

### Paso 2: Cálculo masivo + incidencias
- `calculateBatch(periodId)` — cálculo masivo idempotente por `(payroll_period_id, employee_id)`
- `injectIncidentsToPayroll(periodId)` — inyección de IT/horas extra desde portal admin
- Integración automática de `hr_es_flexible_remuneration_plans` (seguro médico, ticket restaurante, guardería)

### Paso 3: Comparativa + revisión
- `computeDiffVsPrevious(recordId, periodId)` — diff línea-a-línea vs período anterior
- `computeBatchDiff(periodId)` — comparativa masiva
- `reviewRecord(recordId, action, notes)` — flujo de aprobación (approved/flagged/reviewed)
- Campos: `review_status`, `review_notes`, `reviewed_by`, `reviewed_at`, `diff_vs_previous`

### Paso 4: Integración UI completa
- `PayrollReviewBadge` — badge visual de review_status
- `PayrollDiffPanel` — panel de comparativa con deltas bruto/neto + detalle por concepto
- `PayrollTraceLine` — línea expandible con calculation_trace + incident_ref
- Columna "Revisión" en tabla de nóminas + botones aprobar/flaggear con diálogo
- Botones "Cálculo masivo ES" y "Comparativa" en PeriodManager con feedback UX

### Paso 5: Cierre con validación de revisión
- `validateESPreClose` ampliado con check "Todas las nóminas aprobadas" (error → bloquea cierre)
- Warning "Comparativa computada" (no bloqueante)
- PeriodManager distingue error (rojo) vs warning (ámbar) en diálogo de validación

### Protección BD
- `UNIQUE(payroll_period_id, employee_id)` en `hr_payroll_records`

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
