# H1.0 — Interaction Assurance Baseline RRHH

**Fecha:** 2026-04-11
**Estado:** Oleada 1 completada, Oleadas 2-3 documentadas como backlog

## Inventario de controles — Módulo RRHH

### Clase A — Foreign Keys como texto libre (CORREGIDO en Oleada 1)

| Componente | Campo | Estado anterior | Estado actual |
|---|---|---|---|
| MobilityAssignmentForm | employee_id | Input texto UUID | ✅ Select desde erp_hr_employees |
| MobilityAssignmentForm | 5 campos país | Input texto libre | ✅ Select desde KB internationalMobilityEngine (55+ países) |
| MobilityAssignmentForm | home/host_legal_entity_id | Input texto UUID | ⚠️ Texto (no hay tabla de entidades legales aún) |
| MobilityDocumentsPanel | country_code | Input texto "ES" | ✅ Select desde KB países |

### Clase B — UUIDs mostrados en lugar de nombres

| Componente | Estado anterior | Estado actual |
|---|---|---|
| MobilityAssignmentsList | UUID truncado | ✅ Nombre completo del empleado |
| MobilityAssignmentDetail header | UUID | ✅ Nombre del empleado |
| TaskDetail (7 campos) | UUIDs truncados | 🔶 Pendiente Oleada 2 |
| SubmissionsList | adapter_id truncado | 🔶 Pendiente Oleada 2 |
| SandboxControlPanel | IDs truncados | ℹ️ Aceptable (vista técnica) |

### Clase C — Datos demo hardcoded (23 archivos)

| Componente | Tipo | Prioridad Oleada 3 |
|---|---|---|
| HRDepartmentsPanel | 100% demo | Alta |
| HRSocialSecurityPanel | Arrays demo | Media |
| HRContractsPanel (finiquitos) | Arrays demo | Media |
| HRNewsPanel | Array demo | Baja |
| HRDashboardPanel | Fallback demo | ℹ️ Aceptable |
| HRAlertsPanel | Demo en catch | ℹ️ Aceptable |
| HRTrainingEnrollDialog | 3 empleados fijos | Media |
| SSCertificateRequestDialog | DEMO_WORKERS | Media |
| HRAccountingBridge | Demo data | Media |
| HRTreasurySync | Demo data | Media |
| HRSocialSecurityBridge | Demo con fallback | Media |

### Clase D — Botones sin handler real

| Componente | Botón | Acción | Prioridad |
|---|---|---|---|
| IRPFMotorPanel | "Generar Modelo 111" | toast cosmético | 🔶 Oleada 2 |
| IRPFMotorPanel | "PDF certificado" | toast cosmético | 🔶 Oleada 2 |
| PredictiveAuditPanel | "Configurar acceso auditor" | toast "próximamente" | 🔶 Oleada 2 |

### Clase E — Flujos CRUD incompletos (CORREGIDO en Oleada 1)

| Componente | Problema | Estado actual |
|---|---|---|
| GlobalMobilityModule | Sin flujo edit | ✅ view=edit conectado |
| GlobalMobilityModule | Sin delete/cancel | ✅ deleteAssignment para drafts |
| MobilityDocumentsPanel | Status no actualizable | ✅ Select de status por documento |
| MobilityCostProjectionPanel | Sin editar existentes | ✅ Botón editar por proyección |
| MobilityAssignmentForm | Sin validación | ✅ Validación obligatoria pre-submit |
| MobilityAssignmentForm | pe_risk_flag faltante | ✅ Switch en pestaña Riesgo |
| MobilityAssignmentForm | days_in_host faltante | ✅ Input en pestaña Jurisdicciones |

### Clase F — Paneles read-only que aparentan edición

| Componente | Problema | Prioridad |
|---|---|---|
| HRDepartmentsPanel | Botones Edit/Delete sobre array hardcoded | 🔶 Oleada 3 |
| Paneles SS/Fiscal | KPIs estáticos con botones inactivos | 🔶 Oleada 3 |

---

## Restricciones mantenidas

- `isRealSubmissionBlocked === true` ✅
- No se tocó RLS ✅
- No se rehizo ningún módulo completo ✅
- Compatible con P1.x, LM1/LM2/LM3 y preflight ✅
