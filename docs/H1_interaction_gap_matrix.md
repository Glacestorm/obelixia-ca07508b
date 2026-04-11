# H1.0 — Interaction Gap Matrix RRHH

## Matriz de clasificación funcional

### Top 25 Gaps Críticos

| # | Componente | Control | Tipo fallo | Criticidad | Estado |
|---|---|---|---|---|---|
| 1 | MobilityAssignmentForm | employee_id input | FK texto libre | A | ✅ Corregido |
| 2 | MobilityAssignmentForm | host_country_code input | FK texto libre | A | ✅ Corregido |
| 3 | MobilityAssignmentForm | home_country_code input | FK texto libre | A | ✅ Corregido |
| 4 | MobilityAssignmentForm | payroll_country_code input | FK texto libre | A | ✅ Corregido |
| 5 | MobilityAssignmentForm | tax_residence_country input | FK texto libre | A | ✅ Corregido |
| 6 | MobilityAssignmentForm | ss_regime_country input | FK texto libre | A | ✅ Corregido |
| 7 | MobilityAssignmentForm | Validación pre-submit | Ausente | A | ✅ Corregido |
| 8 | GlobalMobilityModule | Flujo edit | No renderizado | A | ✅ Corregido |
| 9 | GlobalMobilityModule | Delete/cancel draft | Inexistente | A | ✅ Corregido |
| 10 | MobilityAssignmentsList | Nombre empleado | UUID truncado | B | ✅ Corregido |
| 11 | MobilityDocumentsPanel | country_code input | FK texto libre | A | ✅ Corregido |
| 12 | MobilityDocumentsPanel | Status update | No actualizable | B | ✅ Corregido |
| 13 | MobilityCostProjectionPanel | Edit proyección | Solo crear | B | ✅ Corregido |
| 14 | MobilityAssignmentForm | pe_risk_flag | No en form | B | ✅ Corregido |
| 15 | MobilityAssignmentForm | days_in_host | No en form | B | ✅ Corregido |
| 16 | MobilityAssignmentDetail | Botón editar | Inexistente | B | ✅ Corregido |
| 17 | MobilityAssignmentDetail | Botón eliminar | Inexistente | B | ✅ Corregido |
| 18 | MobilityAssignmentDetail | Nombre empleado | UUID | B | ✅ Corregido |
| 19 | HRDepartmentsPanel | Todo el panel | Demo data 100% | B | 🔶 Oleada 3 |
| 20 | IRPFMotorPanel | "Generar Modelo 111" | Toast cosmético | B | 🔶 Oleada 2 |
| 21 | IRPFMotorPanel | "PDF certificado" | Toast cosmético | B | 🔶 Oleada 2 |
| 22 | TaskDetail | 7 campos UUID | UUID truncado | B | 🔶 Oleada 2 |
| 23 | HRSocialSecurityPanel | Cotizaciones | Demo data | C | 🔶 Oleada 3 |
| 24 | HRContractsPanel | Finiquitos | Demo data | C | 🔶 Oleada 3 |
| 25 | PredictiveAuditPanel | "Configurar auditor" | Toast próximamente | C | 🔶 Oleada 2 |

## Agrupación por dominio

| Dominio | Total gaps | Corregidos | Pendientes |
|---|---|---|---|
| Mobility | 18 | 18 | 0 |
| People/Empleados | 2 | 0 | 2 |
| IRPF/Fiscal | 2 | 0 | 2 |
| SS/Cotizaciones | 1 | 0 | 1 |
| Contratos | 1 | 0 | 1 |
| Predictive | 1 | 0 | 1 |

## Agrupación por tipo de fallo

| Tipo | Total | Corregidos |
|---|---|---|
| FK texto libre → Select | 7 | 7 |
| UUID mostrado → Nombre | 4 | 3 |
| CRUD incompleto | 5 | 5 |
| Validación ausente | 1 | 1 |
| Campo BD no expuesto | 2 | 2 |
| Toast cosmético | 3 | 0 |
| Demo data hardcoded | 11 | 0 |

## Deferred Quick Wins and Demo-Data Backlog

### Oleada 2 — Quick Wins (estimación: 1 sesión)
- [ ] IRPFMotorPanel: Cambiar labels de botones cosméticos a "Próximamente" o conectar engines existentes
- [ ] TaskDetail: Lookup de nombres para employee_id, contract_id, assigned_to
- [ ] SubmissionsList: Lookup de adapter name

### Oleada 3 — Demo Data → Real Data (estimación: 2-3 sesiones)
- [ ] HRDepartmentsPanel → conectar a `erp_hr_departments` (tabla existe, retorna datos vacíos)
- [ ] HRSocialSecurityPanel → conectar a tablas de cotizaciones reales
- [ ] HRContractsPanel finiquitos → conectar a `erp_hr_settlements` si existe
- [ ] HRTrainingEnrollDialog → cargar empleados desde BD
- [ ] SSCertificateRequestDialog → cargar trabajadores desde BD
- [ ] HRAccountingBridge → conectar a datos reales de nómina
- [ ] HRTreasurySync → conectar a datos reales de nómina
- [ ] HRSocialSecurityBridge → conectar a contribuciones reales

## BEFORE/AFTER

| Métrica | Before | After |
|---|---|---|
| FK texto libre en Mobility | 7 campos | 0 campos |
| Validación pre-submit | Ninguna | 3 campos obligatorios validados |
| UUIDs en lista | 100% | 0% (nombre completo) |
| Flujo edit asignación | No existe | Completo |
| Delete/cancel draft | No existe | Funcional (draft/cancelled) |
| Status documentos | Read-only | Editable con dropdown |
| Editar proyecciones coste | Solo crear | Crear + editar |
| pe_risk_flag en form | Ausente | Switch en pestaña Riesgo |
| days_in_host en form | Ausente | Input en pestaña Jurisdicciones |
| Nombre empleado en detalle | UUID | Nombre completo |
