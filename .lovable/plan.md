

# Plan: RRHH Enterprise Suite — Evolución en 8 Fases

## Estado Actual del Módulo RRHH

El módulo ya cuenta con una base sólida:
- **30+ tablas** existentes (empleados, nóminas, contratos, vacaciones, SS, sindicatos, documentos, posiciones, departamentos, jurisdicciones, convenios colectivos, compensación, salary bands, beneficios, competencias, formación, onboarding, offboarding, fichaje, compliance, etc.)
- **25+ Edge Functions** de HR
- **12 hooks** especializados
- **35+ componentes UI** organizados en 4 categorías de navegación
- Multiempresa via `company_id` + `user_has_erp_company_access()`
- Multi-jurisdicción básica (`fiscal_jurisdiction` en empleados, tabla `erp_hr_jurisdictions` con 7 países)
- Convenios colectivos vinculados a contratos

### Lo que FALTA para enterprise real:
1. No hay entidades legales ni centros de trabajo como entidades separadas
2. No hay RBAC/ABAC granular (solo `user_has_erp_company_access`)
3. No hay workflow engine configurable (solo aprobación 2 niveles en vacaciones)
4. No hay audit trail sistemático en HR
5. No hay Employee/Manager Self-Service
6. No hay HR Command Center
7. No hay compensation suite completa (merit cycles, bonus cycles, cartas salariales)
8. No hay ESG Social reporting integrado

---

## FASE 1 — Fundamentos de Arquitectura Enterprise (Prioridad 1)

### 1A. Estructura Organizativa Multi-Entidad

**Tablas nuevas:**
- `erp_hr_legal_entities` — Entidades legales (CIF, jurisdicción, razón social, tipo societario, registro mercantil)
- `erp_hr_work_centers` — Centros de trabajo (dirección, código CNAE, código cuenta cotización SS, jurisdicción, calendario)
- `erp_hr_org_units` — Unidades organizativas jerárquicas (divisiones, áreas, secciones)
- `erp_hr_work_calendars` — Calendarios laborales por jurisdicción/centro (festivos, jornada, turnos)
- `erp_hr_calendar_entries` — Entradas de calendario (festivos, días especiales)

**Modificaciones:**
- Añadir `legal_entity_id` y `work_center_id` a `erp_hr_employees`
- Añadir `legal_entity_id` a `erp_hr_departments`
- Vincular `erp_hr_collective_agreements` a entidades legales y centros

**Seed data:** 2-3 entidades legales demo, 3-4 centros de trabajo (Madrid, Barcelona, Andorra), calendarios 2026

### 1B. RBAC + ABAC + Permisos por Campo

**Tablas nuevas:**
- `erp_hr_roles` — Roles HR (HR Director, HR Manager, HR Specialist, Payroll Admin, Recruiter, Manager, Employee)
- `erp_hr_role_assignments` — Asignación usuario-rol con scope (global, entidad legal, centro, departamento)
- `erp_hr_permissions` — Catálogo de permisos (módulo, acción, recurso)
- `erp_hr_role_permissions` — Permisos por rol
- `erp_hr_field_permissions` — Permisos a nivel de campo (tabla, campo, rol, read/write/hidden)
- `erp_hr_data_access_rules` — Reglas ABAC (condiciones JSONB: jurisdicción, entidad, departamento, nivel salarial)

**Security definer functions:**
- `hr_check_permission(user_id, module, action, resource_id)` — Verificación RBAC+ABAC
- `hr_get_field_visibility(user_id, table_name)` — Campos visibles/editables por rol

**Seed data:** Roles predefinidos con matriz de permisos completa

### 1C. Audit Trail Total

**Tablas nuevas:**
- `erp_hr_audit_log` — Log inmutable (user_id, action, table_name, record_id, old_data, new_data, ip, user_agent, session_id, category, severity, timestamp)
- `erp_hr_critical_events` — Eventos críticos con notificación obligatoria (tipo, severidad, entidad afectada, requiere_accion)

**Triggers:** Audit automático en todas las tablas HR sensibles (empleados, nóminas, contratos, vacaciones, compensación)

**DB Function:** `hr_log_audit(action, table, record_id, old, new)` — SECURITY DEFINER

### 1D. UI Fase 1

**Componentes nuevos:**
- `HREnterpriseDashboard.tsx` — Command Center base con KPIs por entidad/centro
- `HRLegalEntitiesPanel.tsx` — CRUD de entidades legales
- `HRWorkCentersPanel.tsx` — CRUD de centros de trabajo
- `HROrgStructurePanel.tsx` — Organigrama visual jerárquico
- `HRCalendarsPanel.tsx` — Gestión de calendarios laborales
- `HRRolesPermissionsPanel.tsx` — Administración RBAC/ABAC
- `HRAuditTrailPanel.tsx` — Visor de audit log con filtros

**Navegación:** Nueva categoría "Enterprise" en HRNavigationMenu con: Entidades, Centros, Organigrama, Calendarios, Roles, Auditoría

**Hook:** `useHREnterprise.ts` — gestión de entidades, centros, permisos, auditoría

**Edge Function:** `erp-hr-enterprise-admin` — CRUD de estructura organizativa + verificación de permisos

---

## FASE 2 — HR Workflow Engine (Prioridad 1)

### Tablas nuevas:
- `erp_hr_workflow_definitions` — Definiciones de flujos (nombre, tipo_proceso, versión, condiciones activación, is_active)
- `erp_hr_workflow_steps` — Pasos del flujo (orden, tipo: aprobación/revisión/notificación/condición, aprobador_role, SLA_hours, escalation_hours, delegation_enabled, comments_required)
- `erp_hr_workflow_instances` — Instancias en ejecución (definition_id, entity_type, entity_id, current_step, status, started_by, started_at)
- `erp_hr_workflow_decisions` — Decisiones tomadas (instance_id, step_id, decision, decided_by, comment, decided_at)
- `erp_hr_workflow_delegations` — Delegaciones de aprobadores (delegator, delegate, valid_from, valid_to, scope)
- `erp_hr_workflow_sla_tracking` — Tracking de SLAs por paso (instance_id, step_id, due_at, completed_at, breached)

### Procesos cubiertos:
Vacaciones, contratación, onboarding, offboarding, promociones, revisiones salariales, bonus, expedientes disciplinarios, validación legal de finiquitos

### Edge Function: `erp-hr-workflow-engine`
Acciones: `start_workflow`, `approve_step`, `reject_step`, `delegate`, `escalate`, `get_inbox`, `get_sla_status`

### UI:
- `HRWorkflowDesigner.tsx` — Diseñador de flujos sin código
- `HRApprovalInbox.tsx` — Bandeja de aprobaciones con SLA
- `HRCaseManagement.tsx` — Bandeja de casos HR
- `HRSLADashboard.tsx` — Panel de SLAs y cuellos de botella

---

## FASE 3 — Compensation Suite Enterprise (Prioridad 2)

### Tablas nuevas (extender las existentes):
- `erp_hr_merit_cycles` — Ciclos de revisión salarial (año, budget_percent, status, approval_workflow_id)
- `erp_hr_merit_proposals` — Propuestas individuales (employee_id, current_salary, proposed_salary, compa_ratio, merit_percent, manager_justification)
- `erp_hr_bonus_cycles` — Ciclos de bonus (target_pool, actual_pool, distribution_method)
- `erp_hr_salary_letters` — Cartas salariales generadas (employee_id, effective_date, document_url)
- `erp_hr_total_rewards_config` — Configuración de componentes del Total Rewards Statement

### Edge Function: `erp-hr-compensation-suite`
- Simulador de promociones (impacto coste, compa-ratio, equidad)
- Revisiones salariales masivas con merit matrix
- Generación de cartas salariales
- Pay equity analysis

### UI:
- `HRCompensationSuitePanel.tsx` — Dashboard con tabs: Merit Cycles, Bonus, Pay Equity, Salary Bands, Total Rewards
- `HRMeritCycleManager.tsx` — Gestión de ciclos con workflow
- `HRPayEquityDashboard.tsx` — Análisis de equidad retributiva
- `HRTotalRewardsViewer.tsx` — Statement por empleado

---

## FASE 4 — Talent Intelligence (Prioridad 2)

### Tablas nuevas:
- `erp_hr_skill_graph` — Grafo de skills multinivel (skill_id, parent_id, category, level, is_core)
- `erp_hr_role_skill_mapping` — Mapping rol→skills requeridos con nivel target
- `erp_hr_career_paths` — Paths de carrera configurables (from_role, to_role, requirements, avg_time)
- `erp_hr_talent_pools` — Pools de talento (High Potential, Ready Now, etc.)
- `erp_hr_mentoring_matches` — Matching mentor-mentee
- `erp_hr_gig_assignments` — Asignaciones de proyectos internos (gig marketplace)

### Edge Function: `erp-hr-talent-intelligence`
- Gap analysis por persona/equipo/rol
- Readiness score + flight risk
- Internal mobility score
- Successor readiness
- Learning recommendations via IA
- Mentoring matching via IA

### UI:
- `HRTalentIntelligencePanel.tsx` — Dashboard unificado con: Skill Graph, Gap Analysis, Readiness Map, Career Paths, Talent Pools, Bench Strength

---

## FASE 5 — Compliance Laboral Enterprise (Prioridad 2)

### Tablas nuevas:
- `erp_hr_compliance_obligations` — Obligaciones por jurisdicción con deadline y recurrencia
- `erp_hr_compliance_evidence` — Evidencias exportables para auditoría
- `erp_hr_case_management` — Gestión de casos legales-laborales (tipo, severidad, status, asignado_a)
- `erp_hr_case_timeline` — Timeline de acciones por caso
- `erp_hr_labor_risk_map` — Mapa de riesgo laboral por entidad/centro

### Edge Function: `erp-hr-compliance-enterprise`
- Checklist legal por jurisdicción
- Alertas inteligentes de vencimientos
- Exportación de evidencias
- Risk scoring por entidad

### UI:
- `HRComplianceEnterpriseDashboard.tsx` — Mapa de riesgo, calendario normativo, panel de obligaciones, case management

---

## FASE 6 — Employee Experience & Wellbeing Avanzado (Prioridad 2)

### Tablas nuevas:
- `erp_hr_pulse_surveys` — Encuestas pulso configurables
- `erp_hr_pulse_responses` — Respuestas anónimas
- `erp_hr_wellbeing_scores` — Scores por empleado/equipo (burnout risk, carga psicosocial)
- `erp_hr_wellness_programs` — Programas wellness con seguimiento
- `erp_hr_absenteeism_analytics` — Análisis inteligente de absentismo

### Edge Function: `erp-hr-wellbeing-enterprise`
- Burnout risk scoring via IA
- Detección equipos saturados / managers de riesgo
- Patrones de desconexión insuficiente
- Recomendaciones preventivas

### UI:
- `HRWellbeingEnterpriseDashboard.tsx` — Dashboard con: Wellbeing Score, Burnout Map, Manager Health, Pulse Results, Absenteeism Patterns

---

## FASE 7 — ESG Social Reporting + Self-Service (Prioridad 2)

### Tablas nuevas:
- `erp_hr_esg_social_metrics` — Métricas CSRD/ESRS-S (diversidad, formación, rotación, absentismo, empleo estable, promoción interna)
- `erp_hr_esg_social_reports` — Informes generados con narrativa automática
- `erp_hr_self_service_config` — Configuración ESS/MSS por rol

### Edge Function: `erp-hr-esg-social`
- Cálculo automático de métricas ESRS-S por entidad y consolidado
- Narrativa automática del estado ESG social via IA
- Alertas por desviación

### UI:
- `HRESGSocialPanel.tsx` — Dashboard ejecutivo con vista entidad/consolidada + export
- `HRSelfServicePortal.tsx` — Portal ESS/MSS premium

---

## FASE 8 — IA Copilot Enterprise + Organizational Digital Twin (Prioridad 3)

### Copilot Multinivel:
- Nivel 1: Asistente contextual (autocompletado, explicación normativa)
- Nivel 2: Análisis predictivo (riesgos, recomendaciones, resúmenes)
- Nivel 3: Orquestación (preparación expedientes, generación documental, coordinación cross-module)

### Digital Twin Organizativo:
- `erp_hr_org_digital_twin` — Snapshot del estado organizativo
- `erp_hr_org_simulations` — Simulaciones (contratar, despedir, reestructurar, fusionar equipos)
- Impacto en coste, riesgo legal, retención, equidad, capacidad operativa

### Edge Functions:
- `erp-hr-copilot-enterprise` — Copilot con confidence score, fuentes, human-in-the-loop
- `erp-hr-org-digital-twin` — Simulador organizativo

### UI:
- `HRCopilotEnterprise.tsx` — Panel de copilot multinivel con audit log
- `HROrgDigitalTwin.tsx` — Simulador visual de escenarios organizativos

---

## Resumen Técnico

| Fase | Tablas Nuevas | Edge Functions | Componentes UI | Prioridad |
|------|--------------|----------------|----------------|-----------|
| 1 - Arquitectura | ~12 | 1 | 7 | P1 - Imprescindible |
| 2 - Workflow Engine | 6 | 1 | 4 | P1 - Imprescindible |
| 3 - Compensation | 5 | 1 | 4 | P2 - Diferencial |
| 4 - Talent Intelligence | 6 | 1 | 1 (con tabs) | P2 - Diferencial |
| 5 - Compliance Enterprise | 5 | 1 | 1 (dashboard) | P2 - Diferencial |
| 6 - Wellbeing Enterprise | 5 | 1 | 1 (dashboard) | P2 - Diferencial |
| 7 - ESG Social + Self-Service | 3 | 1 | 2 | P2 - Diferencial |
| 8 - Copilot + Digital Twin | 3 | 2 | 2 | P3 - Ventaja brutal |
| **Total** | **~45** | **9** | **~22** | — |

## Implementación Propuesta

Empezar por **Fase 1** (fundamentos de arquitectura) que incluye:
- Entidades legales, centros de trabajo, org units
- Calendarios laborales + convenios por entidad/centro
- RBAC + ABAC + permisos por campo
- Audit trail total con triggers
- UI de administración enterprise
- Seed data realista
- Navegación enterprise en HRNavigationMenu

