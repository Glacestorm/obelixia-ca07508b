# ACTA DE CIERRE — MVP RRHH v1.0 (Baseline Congelado)

**Proyecto:** Obelixia Technologies — Módulo RRHH  
**Fecha de cierre:** 2026-03-12  
**Versión:** MVP v1.0 — BASELINE CONGELADO  
**Estado:** ✅ APROBADO — DEMO-READY  

---

## 1. INVENTARIO DE NAVEGACIÓN MVP

### 1.1 Items de menú (26)

| # | ID técnico | Label visible | Categoría |
|---|---|---|---|
| 1 | `employees` | Empleados | Core HR |
| 2 | `contracts` | Contratos | Core HR |
| 3 | `documents` | Documentos | Core HR |
| 4 | `document-expedient` | Expediente Documental | Core HR |
| 5 | `departments` | Departamentos | Core HR |
| 6 | `legal-entities` | Entidades Legales | Core HR |
| 7 | `work-centers` | Centros de Trabajo | Core HR |
| 8 | `work-calendars` | Calendarios | Core HR |
| 9 | `payroll` | Nóminas | Payroll |
| 10 | `payroll-periods` | Períodos | Payroll |
| 11 | `payroll-engine` | Motor Nómina | Payroll |
| 12 | `ss` | Seg. Social | Payroll |
| 13 | `compensation-suite` | Compensación | Payroll |
| 14 | `benefits` | Beneficios | Payroll |
| 15 | `vacations` | Vacaciones | Laboral |
| 16 | `time-clock` | Control Fichaje | Laboral |
| 17 | `leave-incidents` | Incidencias | Laboral |
| 18 | `admin-requests` | Solicitudes | Laboral |
| 19 | `hr-tasks` | Tareas RRHH | Laboral |
| 20 | `approval-inbox` | Aprobaciones | Laboral |
| 21 | `country-registry` | Country Registry | Global |
| 22 | `es-localization` | 🇪🇸 España | Global |
| 23 | `mobility-assignments` | Asignaciones | Global |
| 24 | `mobility-dashboard` | Mobility Dashboard | Global |
| 25 | `official-submissions` | Envíos Oficiales | Global |
| 26 | `compliance-evidence` | Evidencias | Global |

### 1.2 Vistas adicionales (no menú)

| Vista | Acceso | Componente |
|---|---|---|
| Dashboard (estado por defecto) | Sin item — renderiza al entrar | `HRExecutiveDashboard` |
| Expediente empleado | Click en empleado | `HREmployeeExpedient` |

**Total: 26 items de menú + 1 dashboard + 1 vista derivada = 28 vistas**

---

## 2. INVENTARIO TÉCNICO

### 2.1 Componentes MVP

| Componente | Ruta | Item(s) que renderiza |
|---|---|---|
| `HRExecutiveDashboard` | `src/components/erp/hr/HRExecutiveDashboard.tsx` | Dashboard |
| `HREmployeesPanel` | `src/components/erp/hr/HREmployeesPanel.tsx` | employees |
| `HRContractsPanel` | `src/components/erp/hr/HRContractsPanel.tsx` | contracts |
| `HREmployeeDocumentsPanel` | `src/components/erp/hr/HREmployeeDocumentsPanel.tsx` | documents |
| `DocumentExpedientModule` | `src/components/erp/hr/document-expedient/DocumentExpedientModule.tsx` | document-expedient |
| `HRDepartmentsPanel` | `src/components/erp/hr/HRDepartmentsPanel.tsx` | departments |
| `HRLegalEntitiesPanel` | `src/components/erp/hr/enterprise/HRLegalEntitiesPanel.tsx` | legal-entities |
| `HRWorkCentersPanel` | `src/components/erp/hr/enterprise/HRWorkCentersPanel.tsx` | work-centers |
| `HRCalendarsPanel` | `src/components/erp/hr/enterprise/HRCalendarsPanel.tsx` | work-calendars |
| `HRPayrollPanel` | `src/components/erp/hr/HRPayrollPanel.tsx` | payroll |
| `HRPayrollPeriodsPanel` | `src/components/erp/hr/global/HRPayrollPeriodsPanel.tsx` | payroll-periods |
| `HRPayrollEngine` | `src/components/erp/hr/payroll-engine/HRPayrollEngine.tsx` | payroll-engine |
| `HRSocialSecurityPanel` | `src/components/erp/hr/HRSocialSecurityPanel.tsx` | ss |
| `HRCompensationSuitePanel` | `src/components/erp/hr/HRCompensationSuitePanel.tsx` | compensation-suite |
| `HRSocialBenefitsPanel` | `src/components/erp/hr/HRSocialBenefitsPanel.tsx` | benefits |
| `HRVacationsPanel` | `src/components/erp/hr/HRVacationsPanel.tsx` | vacations |
| `HRTimeClockPanel` | `src/components/erp/hr/HRTimeClockPanel.tsx` | time-clock |
| `HRLeaveIncidentsPanel` | `src/components/erp/hr/global/HRLeaveIncidentsPanel.tsx` | leave-incidents |
| `HRAdminPortal` | `src/components/erp/hr/admin-portal/HRAdminPortal.tsx` | admin-requests |
| `HRTasksModule` | `src/components/erp/hr/tasks/HRTasksModule.tsx` | hr-tasks |
| `HRApprovalInbox` | `src/components/erp/hr/enterprise/HRApprovalInbox.tsx` | approval-inbox |
| `HRCountryRegistryPanel` | `src/components/erp/hr/global/HRCountryRegistryPanel.tsx` | country-registry |
| `ESLocalizationPlugin` | `src/components/erp/hr/localization/es/ESLocalizationPlugin.tsx` | es-localization |
| `GlobalMobilityModule` | `src/components/erp/hr/global-mobility/GlobalMobilityModule.tsx` | mobility-assignments, mobility-dashboard |
| `OfficialIntegrationsHub` | `src/components/erp/hr/official-integrations/OfficialIntegrationsHub.tsx` | official-submissions |
| `HRComplianceEvidencePanel` | `src/components/erp/hr/global/HRComplianceEvidencePanel.tsx` | compliance-evidence |
| `HREmployeeExpedient` | `src/components/erp/hr/employee-expedient/HREmployeeExpedient.tsx` | (derivada) |
| `HRNavigationMenu` | `src/components/erp/hr/HRNavigationMenu.tsx` | Menú principal |
| `HRModule` | `src/components/erp/hr/HRModule.tsx` | Orquestador/Router |

### 2.2 Hooks MVP

| Hook | Ruta | Función |
|---|---|---|
| `usePayrollEngine` | `src/hooks/erp/hr/usePayrollEngine.ts` | Motor de nómina genérico |
| `useESLocalization` | `src/hooks/erp/hr/useESLocalization.ts` | Localización España |
| `useESPayrollBridge` | `src/hooks/erp/hr/useESPayrollBridge.ts` | Puente nómina España |
| `useGlobalMobility` | `src/hooks/erp/hr/useGlobalMobility.ts` | Movilidad global |
| `useOfficialIntegrationsHub` | `src/hooks/erp/hr/useOfficialIntegrationsHub.ts` | Integraciones oficiales |
| `useHRDocumentExpedient` | `src/hooks/erp/hr/useHRDocumentExpedient.ts` | Expediente documental |
| `useHRTasksEngine` | `src/hooks/erp/hr/useHRTasksEngine.ts` | Motor de tareas |
| `useCountryRegistry` | `src/hooks/erp/hr/useCountryRegistry.ts` | Registro de países |
| `usePeopleAnalytics` | `src/hooks/erp/hr/usePeopleAnalytics.ts` | Analytics (dashboard) |

### 2.3 Tablas de base de datos MVP

| Tabla | Dominio | Registros seed |
|---|---|---|
| `erp_hr_companies` | Core | 1 (Obelixia Technologies) |
| `erp_hr_legal_entities` | Core | 2 |
| `erp_hr_work_centers` | Core | 2 |
| `erp_hr_work_calendars` | Core | 2 |
| `erp_hr_departments` | Core | 8 |
| `erp_hr_employees` | Core | 108 |
| `erp_hr_contracts` | Core | 58 |
| `erp_hr_employee_documents` | Core | 108 |
| `erp_hr_social_benefits` | Payroll | 13 |
| `erp_hr_employee_benefits` | Payroll | 83 |
| `erp_hr_payrolls` | Payroll | 7 |
| `hr_payroll_periods` | Payroll | 3 |
| `hr_payroll_records` | Payroll | 7 |
| `hr_payroll_record_lines` | Payroll | 10 |
| `erp_hr_leave_requests` | Laboral | 84 |
| `erp_hr_time_clock` | Laboral | 9 |
| `hr_leave_incidents` | Laboral | 1 |
| `hr_admin_requests` | Laboral | 3 |
| `hr_admin_request_comments` | Laboral | 0 |
| `hr_admin_request_activity` | Laboral | 0 |
| `hr_tasks` | Laboral | 4 |
| `erp_hr_workflow_definitions` | Laboral | 9 |
| `erp_hr_workflow_instances` | Laboral | 2 |
| `erp_hr_workflow_steps` | Laboral | — |
| `erp_hr_workflow_decisions` | Laboral | — |
| `hr_country_registry` | Global | 1 (ES) |
| `hr_country_policies` | Global | — |
| `hr_official_submissions` | Global | 2 |
| `hr_official_submission_receipts` | Global | 0 |
| `hr_integration_adapters` | Global | 7 |
| `hr_mobility_assignments` | Global | 0 (vacío legítimo) |
| `hr_compliance_requirements` | Global | 0 (vacío legítimo) |
| `hr_compliance_evidence` | Global | 0 (vacío legítimo) |
| `hr_es_employee_labor_data` | ES | — |
| `hr_es_irpf_tables` | ES | seed IRPF 2026 |
| `hr_es_ss_bases` | ES | seed bases SS |
| `hr_es_contract_types` | ES | seed contratos RD |

### 2.4 Edge Functions MVP

| Function | Uso MVP |
|---|---|
| `erp-hr-ai-agent` | Dashboard stats, SS calculations, chat |
| `erp-hr-workflow-engine` | Workflows, aprobaciones |
| `erp-hr-seed-demo-data` | Seed inicial |
| `erp-hr-compensation-suite` | Panel compensación |
| `erp-hr-enterprise-admin` | Entidades, centros, roles |
| `hr-country-registry` | Registro de países |
| `send-hr-alert` | Alertas HR |

---

## 3. PERÍMETRO — MVP vs FUERA DE MVP

### 3.1 DENTRO del MVP (congelado)

Todo lo listado en las secciones 1 y 2 anteriores.

### 3.2 FUERA del MVP (existe en codebase pero NO visible)

Estos componentes, hooks y edge functions existen pero están **excluidos del menú MVP** por `mvpMode=true`:

| Módulo | Hooks/Components | Estado |
|---|---|---|
| Talent Intelligence | `useHRTalentIntelligence` | Implementado, no visible |
| Wellbeing Enterprise | `useHRWellbeingEnterprise` | Implementado, no visible |
| ESG Social + Self-Service | `useHREsgSelfservice` | Implementado, no visible |
| Copilot + Digital Twin | `useHRCopilotTwin` | Implementado, no visible |
| Security + SoD (P1) | `useHRSecurityGovernance` | Implementado, no visible |
| AI Governance (P2) | Panel P2 | Implementado, no visible |
| Workforce Planning (P3) | `useHRStrategicPlanning` | Implementado, no visible |
| Fairness Engine (P4) | Panel P4 | Implementado, no visible |
| Digital Twin (P5) | Panel P5 | Implementado, no visible |
| Legal Engine (P6) | Panel P6 | Implementado, no visible |
| CNAE Intelligence (P7) | Panel P7 | Implementado, no visible |
| Role Experience (P8) | Panel P8 | Implementado, no visible |
| People Analytics (PA) | `usePeopleAnalytics` | Hook usado en dashboard, panel no visible |
| AI Copilot | Panel copilot | Implementado, no visible |
| Total Rewards | `useHRTotalRewards` | Implementado, no visible |
| Contingent Workforce | `useHRContingentWorkforce` | Implementado, no visible |
| Industry Templates | `useHRIndustryTemplates` | Implementado, no visible |
| Gig Workforce | `useGigWorkforce` | Implementado, no visible |

---

## 4. BACKLOG V2+ (por fases futuras)

### Fase V2-A: Activación de módulos premium existentes
> **Riesgo: BAJO** — código ya implementado, solo requiere añadir a `mvpItems`

1. People Analytics (panel completo)
2. AI Copilot HR
3. Talent Intelligence
4. Workforce Planning + Scenario Studio

### Fase V2-B: Enriquecimiento de datos
> **Riesgo: BAJO** — seed adicional, sin cambios de arquitectura

1. Seed de movilidad internacional (2-3 asignaciones)
2. Seed de compliance requirements + evidence
3. Seed de employee_number para los 108 empleados
4. Seed de job_titles realistas por departamento
5. Payroll records para Febrero y Marzo 2026

### Fase V2-C: Módulos premium
> **Riesgo: MEDIO** — requiere activación y testing

1. Security + SoD (P1)
2. AI Governance Layer (P2)
3. Fairness / Justice Engine (P4)
4. Documentary Legal Engine (P6)

### Fase V2-D: Localizaciones adicionales
> **Riesgo: MEDIO-ALTO** — requiere desarrollo nuevo

1. Localización Francia (FR)
2. Localización Portugal (PT)
3. Localización LATAM (MX, CO, AR)

### Fase V2-E: Integraciones avanzadas
> **Riesgo: ALTO** — requiere APIs externas reales

1. Conexión real SILTRA/RED
2. Conexión real AEAT
3. Open Banking para nómina
4. SSO/SAML enterprise

---

## 5. REGLAS DEL BASELINE

1. **NO modificar** `mvpItems` en `HRNavigationMenu.tsx` sin aprobación formal
2. **NO añadir** nuevos items al menú MVP
3. **NO modificar** tablas con seed existente sin migración controlada
4. **NO cambiar** la estructura de `HRModule.tsx` (router/orquestador)
5. **Cualquier extensión** debe ser aditiva (nuevo item/componente), nunca destructiva
6. **Testing obligatorio** antes de activar módulos fuera del MVP

---

## 6. CRITERIO DE ACEPTACIÓN CUMPLIDO

| Criterio | Resultado |
|---|---|
| 26/26 items de menú renderizan | ✅ |
| Dashboard funcional | ✅ |
| 0 errores de consola | ✅ |
| 0 errores RLS/403/5xx | ✅ |
| Seed coherente (Obelixia Technologies) | ✅ |
| Paneles vacíos no crashean | ✅ |
| Navegación derivada funcional | ✅ |
| Incidencias bloqueantes | 0 |

---

**VEREDICTO FINAL: MVP v1.0 CERRADO — BASELINE CONGELADO**

*Documento generado: 2026-03-12*
