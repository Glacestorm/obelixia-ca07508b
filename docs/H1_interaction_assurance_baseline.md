# H1.0 — Interaction Assurance Baseline RRHH

**Fecha**: 2026-04-11
**Alcance**: Todos los módulos del ERP RRHH
**Modo**: Inventario transversal + fix de bloqueantes críticos (Oleada 1)

---

## 1. Resumen ejecutivo

Se realizó una auditoría completa del interfaz humano-máquina del módulo RRHH, identificando **6 clases de problemas** que afectan a controles visibles en la UI.

### Oleada 1 (ejecutada): Critical Business Blockers — Mobility
- ✅ `employee_id` reemplazado por Select cargando de `erp_hr_employees`
- ✅ 5 campos de país reemplazados por Select con knowledge base (55+ países)
- ✅ País emisor en documentos reemplazado por Select
- ✅ Validación obligatoria antes de submit (employee_id, start_date, host_country_code)
- ✅ `pe_risk_flag` añadido al formulario (pestaña Riesgo)
- ✅ `days_in_host` añadido al formulario (pestaña Jurisdicciones) con alerta ≥183 días
- ✅ Flujo edit conectado en `GlobalMobilityModule` (case `edit` en switch)
- ✅ Delete/cancel para asignaciones draft con confirmación
- ✅ Status de documentos actualizable por dropdown inline
- ✅ Proyecciones de coste editables (botón editar por año)
- ✅ Nombre de empleado mostrado en lista en vez de UUID truncado
- ✅ Nombre de empleado mostrado en detalle de asignación

---

## 2. Inventario por clase de problema

### Clase A — Foreign Keys expuestas como texto libre

| Componente | Campo | Estado H1.0 |
|---|---|---|
| `MobilityAssignmentForm` | `employee_id` | ✅ FIXED — Select desde `erp_hr_employees` |
| `MobilityAssignmentForm` | 5 campos de país | ✅ FIXED — Select con KB de 55+ países |
| `MobilityAssignmentForm` | `home/host_legal_entity_id` | ⚠️ PENDIENTE — Texto libre (no hay tabla de entidades legales aún) |
| `MobilityDocumentsPanel` | `country_code` | ✅ FIXED — Select con países principales |

### Clase B — UUIDs mostrados en lugar de nombres humanos

| Componente | Ubicación | Estado H1.0 |
|---|---|---|
| `MobilityAssignmentsList` | Lista de asignaciones | ✅ FIXED — Muestra nombre completo |
| `MobilityAssignmentDetail` | Header | ✅ FIXED — Muestra nombre completo |
| `TaskDetail` | 7 campos | 🔵 BACKLOG Oleada 2 |
| `SubmissionsList` | adapter_id | 🔵 BACKLOG Oleada 2 |
| `SandboxControlPanel` | dry-run IDs | ℹ️ ACEPTABLE (contexto técnico) |

### Clase C — Datos demo hardcoded

| Componente | Estado H1.0 |
|---|---|
| `HRDepartmentsPanel` | 🔵 BACKLOG Oleada 3 — Conectar a `erp_hr_departments` |
| `HRSocialSecurityPanel` | 🔵 BACKLOG Oleada 3 |
| `HRContractsPanel` (finiquitos) | 🔵 BACKLOG Oleada 3 |
| `HRNewsPanel` | 🔵 BACKLOG Oleada 3 |
| `HRDashboardPanel` | ℹ️ Demo como fallback (aceptable) |
| `HRAlertsPanel` | ℹ️ Demo en catch error (aceptable) |
| `HRTrainingEnrollDialog` | 🔵 BACKLOG Oleada 3 |
| `SSCertificateRequestDialog` | 🔵 BACKLOG Oleada 3 |
| `HRAccountingBridge` | 🔵 BACKLOG Oleada 3 |
| `HRTreasurySync` | 🔵 BACKLOG Oleada 3 |
| `HRSocialSecurityBridge` | 🔵 BACKLOG Oleada 3 |

### Clase D — Botones sin handler real (toast cosmético)

| Componente | Botón | Estado H1.0 |
|---|---|---|
| `IRPFMotorPanel` | "Generar Modelo 111" | 🔵 BACKLOG Oleada 2 |
| `IRPFMotorPanel` | "PDF certificado" | 🔵 BACKLOG Oleada 2 |
| `PredictiveAuditPanel` | "Configurar acceso auditor" | 🔵 BACKLOG Oleada 2 |

### Clase E — Flujos CRUD incompletos

| Componente | Falta | Estado H1.0 |
|---|---|---|
| `GlobalMobilityModule` | Flujo edit | ✅ FIXED |
| `GlobalMobilityModule` | Delete/cancel | ✅ FIXED |
| `MobilityDocumentsPanel` | Status update | ✅ FIXED |
| `MobilityCostProjectionPanel` | Edit proyección | ✅ FIXED |
| `MobilityAssignmentForm` | Validación | ✅ FIXED |
| `MobilityAssignmentForm` | pe_risk_flag | ✅ FIXED |

### Clase F — Paneles read-only que aparentan edición

| Componente | Estado H1.0 |
|---|---|
| `HRDepartmentsPanel` | 🔵 BACKLOG Oleada 3 |
| Paneles SS/Fiscal | 🔵 BACKLOG Oleada 3 |

---

## 3. Restricciones respetadas

- ✅ NO se tocó RLS
- ✅ NO se rehizo ningún módulo completo
- ✅ `isRealSubmissionBlocked === true` mantenido
- ✅ No se mezclaron stock options
- ✅ Compatible con P1.x, LM1/LM2/LM3 y preflight

---

## 4. BEFORE / AFTER

| Métrica | ANTES | DESPUÉS |
|---|---|---|
| employee_id en form | Texto libre (UUID) | Select desde BD real |
| Campos de país (5+1) | Texto libre | Select con 55+ países de KB |
| Validación pre-submit | Ninguna | 3 campos obligatorios |
| pe_risk_flag en form | No expuesto | Switch en pestaña Riesgo |
| days_in_host en form | No expuesto | Input con alerta ≥183 días |
| Flujo edit asignación | No conectado | Formulario pre-rellenado |
| Delete/cancel draft | No existía | Con confirmación |
| Status documentos | Solo lectura | Dropdown inline actualizable |
| Editar proyección coste | Solo crear nueva | Botón editar por año |
| Nombre empleado en lista | UUID truncado | Nombre completo |
| Nombre empleado en detalle | No mostrado | Nombre completo |

---

## 5. Deferred Quick Wins and Demo-Data Backlog

### Oleada 2 — Quick Wins (próxima iteración)
1. `IRPFMotorPanel`: Cambiar botones con toast cosmético a label "Próximamente" o conectar si el engine existe
2. `PredictiveAuditPanel`: Idem
3. `TaskDetail`: Resolver UUIDs truncados con lookup de nombre
4. `SubmissionsList`: Idem

### Oleada 3 — Demo Data → Real Data (por dominio)
1. `HRDepartmentsPanel`: Conectar a tabla `erp_hr_departments`
2. `HRSocialSecurityPanel`: Conectar cotizaciones/presentaciones RED a tablas reales
3. `HRContractsPanel`: Conectar finiquitos si tabla `erp_hr_settlements` existe
4. `HRTrainingEnrollDialog`: Cargar empleados de BD en vez de lista fija
5. `SSCertificateRequestDialog`: Cargar trabajadores de BD
6. `HRAccountingBridge/TreasurySync/SSBridge`: Conectar a tablas reales de nómina
7. `HRNewsPanel`: Conectar a fuente real o documentar como demo
