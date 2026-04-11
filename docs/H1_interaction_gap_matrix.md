# H1.0 — Interaction Gap Matrix RRHH

**Fecha**: 2026-04-11

## Matriz de clasificación funcional

| # | Componente | Ruta/Panel | Control | Tipo | Comportamiento esperado | Comportamiento real | Estado funcional | Criticidad | Oleada |
|---|---|---|---|---|---|---|---|---|---|
| 1 | MobilityAssignmentForm | HR > Mobility > Create | employee_id select | select | Seleccionar empleado de BD | ✅ Select desde erp_hr_employees | **functional** | A | 1 ✅ |
| 2 | MobilityAssignmentForm | HR > Mobility > Create | host_country_code select | select | Seleccionar país de KB | ✅ Select con 55+ países | **functional** | A | 1 ✅ |
| 3 | MobilityAssignmentForm | HR > Mobility > Create | home_country_code select | select | Seleccionar país | ✅ Select con KB | **functional** | A | 1 ✅ |
| 4 | MobilityAssignmentForm | HR > Mobility > Create | payroll_country_code select | select | Seleccionar país | ✅ Select con KB | **functional** | A | 1 ✅ |
| 5 | MobilityAssignmentForm | HR > Mobility > Create | tax_residence_country select | select | Seleccionar país | ✅ Select con KB | **functional** | A | 1 ✅ |
| 6 | MobilityAssignmentForm | HR > Mobility > Create | ss_regime_country select | select | Seleccionar país | ✅ Select con KB | **functional** | A | 1 ✅ |
| 7 | MobilityAssignmentForm | HR > Mobility > Create | Validación submit | button | Validar campos obligatorios | ✅ Valida employee, start_date, host_country | **functional** | A | 1 ✅ |
| 8 | MobilityAssignmentForm | HR > Mobility > Create | pe_risk_flag switch | toggle | Activar flag PE risk | ✅ Switch funcional | **functional** | B | 1 ✅ |
| 9 | MobilityAssignmentForm | HR > Mobility > Create | days_in_host input | input | Registrar días en destino | ✅ Input + alerta ≥183 | **functional** | B | 1 ✅ |
| 10 | GlobalMobilityModule | HR > Mobility | Flujo edit | navigation | Editar asignación existente | ✅ Form pre-rellenado | **functional** | A | 1 ✅ |
| 11 | GlobalMobilityModule | HR > Mobility | Delete draft | button | Eliminar borrador | ✅ Con confirmación | **functional** | A | 1 ✅ |
| 12 | MobilityAssignmentsList | HR > Mobility > List | Nombre empleado | display | Mostrar nombre | ✅ Lookup desde BD | **functional** | B | 1 ✅ |
| 13 | MobilityDocumentsPanel | HR > Mobility > Detail | Country select | select | Seleccionar país emisor | ✅ Select con países | **functional** | B | 1 ✅ |
| 14 | MobilityDocumentsPanel | HR > Mobility > Detail | Status change | select | Cambiar estado documento | ✅ Dropdown inline | **functional** | A | 1 ✅ |
| 15 | MobilityCostProjectionPanel | HR > Mobility > Detail | Edit proyección | button | Editar año existente | ✅ Botón editar | **functional** | B | 1 ✅ |
| 16 | MobilityAssignmentForm | HR > Mobility > Create | home_legal_entity_id | input | Seleccionar entidad legal | Texto libre UUID | **partial** | C | 3 |
| 17 | MobilityAssignmentForm | HR > Mobility > Create | host_legal_entity_id | input | Seleccionar entidad legal | Texto libre UUID | **partial** | C | 3 |
| 18 | IRPFMotorPanel | HR > IRPF | "Generar Modelo 111" | button | Generar modelo fiscal | Solo toast cosmético | **cosmetic_only** | B | 2 |
| 19 | IRPFMotorPanel | HR > IRPF | "PDF certificado" | button | Generar PDF | Solo toast cosmético | **cosmetic_only** | B | 2 |
| 20 | PredictiveAuditPanel | HR > Governance | "Configurar acceso" | button | Configurar auditor | Solo toast cosmético | **cosmetic_only** | C | 2 |
| 21 | HRDepartmentsPanel | HR > People > Depts | Todo el panel | panel | CRUD departamentos desde BD | Array estático demo | **cosmetic_only** | B | 3 |
| 22 | HRSocialSecurityPanel | HR > SS | Cotizaciones/RED | table | Datos reales SS | Arrays demo fijos | **cosmetic_only** | B | 3 |
| 23 | HRContractsPanel | HR > Contracts | Finiquitos | table | Datos reales finiquitos | Arrays demo fijos | **cosmetic_only** | B | 3 |
| 24 | HRNewsPanel | HR > News | Artículos | list | Noticias reales | Array demo completo | **cosmetic_only** | C | 3 |
| 25 | TaskDetail | HR > Tasks | 7 campos UUID | display | Mostrar nombres | UUIDs truncados | **partial** | B | 2 |

## Resumen por estado funcional

| Estado | Cantidad | % |
|---|---|---|
| functional | 15 | 60% |
| partial | 3 | 12% |
| cosmetic_only | 7 | 28% |
| broken | 0 | 0% |

## Resumen por criticidad

| Criticidad | Cantidad | Descripción |
|---|---|---|
| A (bloqueante) | 7 | Impiden flujo de trabajo principal — todos resueltos |
| B (operacional) | 12 | Afectan eficiencia pero no bloquean |
| C (polish) | 6 | Mejoras cosméticas o de calidad |

## Top 25 gaps (ordenados por criticidad)

Los 15 primeros ya están resueltos (Oleada 1). Los items 16-25 quedan documentados como backlog priorizado en las oleadas 2 y 3.
