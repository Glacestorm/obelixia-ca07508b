

# MVP Realista — Módulo RRHH Global

## Filosofía

Todo lo listado abajo **ya está construido**. El MVP no es "qué construir" sino **qué activar, pulir y conectar** para tener un sistema operativo real. El resto se desactiva de la navegación o se deja como acceso avanzado.

---

## Alcance MVP — Lo que ENTRA

### 1. Core HR Básico
| Elemento | Estado actual | Trabajo MVP |
|----------|--------------|-------------|
| Directorio empleados (`HREmployeesPanel`) | ✅ Funcional con filtros | Pulir: añadir filtro por entidad legal y centro de trabajo |
| Expediente empleado (`HREmployeeExpedient`) | ✅ 10 tabs | Mantener tabs: Datos, Contratos, Compensación, Documentos, Localización. Ocultar tabs avanzados (Movilidad, Auditoría) |
| Contratos (`HRContractsPanel`) | ✅ CRUD funcional | Sin cambios |
| Departamentos (`HRDepartmentsPanel`) | ✅ Funcional | Sin cambios |
| Entidades Legales (`HRLegalEntitiesPanel`) | ✅ CRUD | Sin cambios |
| Centros de Trabajo (`HRWorkCentersPanel`) | ✅ CRUD | Sin cambios |
| Calendarios laborales (`HRCalendarsPanel`) | ✅ Funcional | Sin cambios |

### 2. Portal Administrativo Básico
| Elemento | Estado actual | Trabajo MVP |
|----------|--------------|-------------|
| Portal solicitudes (`HRAdminPortal`) | ✅ 14 tipos, formularios dinámicos | Limitar MVP a 6 tipos: Alta, Baja, Modificación contractual, Modificación salarial, IT/Baja médica, Excedencia |
| Timeline actividad | ✅ Funcional | Sin cambios |
| Comentarios internos | ✅ Funcional | Sin cambios |
| Dashboard KPIs portal | ✅ Funcional | Sin cambios |

### 3. Payroll Básico
| Elemento | Estado actual | Trabajo MVP |
|----------|--------------|-------------|
| Períodos de nómina (`HRPayrollEngine`) | ✅ Motor genérico 5 tabs | MVP: solo tabs Períodos + Registros. Ocultar Simulador y Auditoría |
| Nóminas existentes (`HRPayrollPanel`) | ✅ CRUD básico | Mantener como vista rápida |
| Ausencias/Vacaciones (`HRVacationsPanel`) | ✅ Solicitudes + aprobación | Sin cambios |
| Control horario (`HRTimeClockPanel`) | ✅ Funcional | Sin cambios |
| Incidencias (`HRLeaveIncidentsPanel`) | ✅ Funcional | Sin cambios |

### 4. Localización España Básica
| Elemento | Estado actual | Trabajo MVP |
|----------|--------------|-------------|
| Plugin ES (`ESLocalizationPlugin`) | ✅ 6 tabs | MVP: solo tabs Datos Laborales + Seguridad Social + IRPF. Ocultar Permisos ET, Finiquitos, Contratos RD |
| Datos laborales empleado ES | ✅ Formulario completo | Sin cambios |
| Payroll Bridge ES | ✅ Inyección conceptos ES | Sin cambios |
| Registro de países (`HRCountryRegistryPanel`) | ✅ CRUD + seed ES | Sin cambios |

### 5. Documentación y Trazabilidad Básica
| Elemento | Estado actual | Trabajo MVP |
|----------|--------------|-------------|
| Expediente documental (`DocumentExpedientModule`) | ✅ 5 tabs | MVP: solo tabs Empleado + Nómina. Ocultar Consentimientos, Retención, Auditoría (fase 2) |
| Documentos empleado | ✅ Upload + categorías + hash | Sin cambios |
| Versiones documentos | ✅ Historial | Sin cambios |
| Log de acceso | ✅ Trazabilidad | Sin cambios |

### 6. Workflows Básicos
| Elemento | Estado actual | Trabajo MVP |
|----------|--------------|-------------|
| Motor tareas (`HRTasksModule`) | ✅ 5 tabs | MVP: solo tabs Dashboard + Mi Bandeja + Todas. Ocultar Por Expediente y Config |
| Bandeja aprobaciones (`HRApprovalInbox`) | ✅ Funcional | Sin cambios |
| Workflows 9 tipos (`HRWorkflowDesigner`) | ✅ Visualización | MVP: solo lectura, sin edición de workflows |

---

## Alcance MVP — Lo que NO ENTRA (Post-MVP)

| Área | Componentes excluidos | Fase futura |
|------|----------------------|-------------|
| **Movilidad Internacional** | `GlobalMobilityModule`, tabs movilidad expediente | v2 |
| **Integraciones Oficiales** | `OfficialIntegrationsHub`, SILTRA, AEAT, Delt@, RED | v2 |
| **Analytics Avanzados** | `PeopleAnalyticsModule`, `HRAdvancedAnalyticsPanel`, `HRAnalyticsIntelligencePanel` | v2 |
| **IA Avanzada** | Copiloto IA, explicaciones automáticas, insights predictivos | v2 |
| **Localizaciones otros países** | FR, PT, DE plugins | v3 |
| **Premium (P1-P8)** | Security, AI Governance, Fairness, Digital Twin, Legal Engine, CNAE, Role Experience | v3 |
| **Talento avanzado** | Skills Matrix, Succession Planning, Internal Marketplace | v2 |
| **Compliance Enterprise** | `HRComplianceEnterprisePanel`, evidencias compliance | v2 |
| **Bienestar/ESG** | `HRWellbeingEnterprisePanel`, `HRESGSelfServicePanel` | v3 |
| **Compensación Suite** | `HRCompensationSuitePanel` avanzada | v2 |
| **Utilidades Premium** | Todo el bloque `util-*` | v3 |

---

## Páginas Mínimas MVP (8 áreas de navegación)

```text
Core HR (mega-menu simplificado)
├── Empleados (directorio + expediente)
├── Contratos
├── Departamentos
├── Entidades Legales
├── Centros de Trabajo
└── Calendarios

Laboral
├── Ausencias / Vacaciones
├── Control Horario
├── Incidencias
└── Portal Administrativo

Nómina
├── Motor de Nómina (períodos + registros)
└── Nóminas (vista rápida)

España
├── Plugin Localización ES (datos + SS + IRPF)
└── Registro de Países

Documentos
└── Expediente Documental (empleado + nómina)

Workflows
├── Mis Tareas (dashboard + bandeja)
├── Aprobaciones
└── Workflows (solo lectura)

Dashboard
└── Dashboard Ejecutivo (existente)
```

## Tablas Mínimas MVP (ya existentes)

| Tabla | Uso |
|-------|-----|
| `erp_hr_employees` | Core |
| `erp_hr_contracts` | Core |
| `erp_hr_departments` | Core |
| `erp_hr_legal_entities` | Multi-entidad |
| `erp_hr_work_centers` | Multi-centro |
| `erp_hr_leave_requests` | Ausencias |
| `erp_hr_payrolls` / `erp_hr_payroll_records` / `erp_hr_payroll_lines` | Nómina |
| `erp_hr_payroll_periods` | Motor nómina |
| `hr_admin_requests` / `hr_admin_request_comments` / `hr_admin_request_activity` | Portal admin |
| `hr_tasks` | Tareas/workflows |
| `erp_hr_workflow_definitions` / `instances` / `decisions` | Aprobaciones |
| `erp_hr_employee_documents` / `erp_hr_document_versions` | Documentos |
| `hr_country_registry` / `hr_country_policies` | Multi-país |
| `hr_es_employee_labor_data` / `hr_es_irpf_tables` / `hr_es_ss_bases` | España |

**Total: ~25 tablas** (de ~80+ existentes). No se necesitan migraciones nuevas.

## Flujos Mínimos MVP

1. **Alta de empleado**: Crear empleado → asignar entidad legal + centro → crear contrato → rellenar datos ES (si España) → subir documentos
2. **Solicitud administrativa**: Crear solicitud en portal → genera tarea automática → aprobación en bandeja → actualiza estado
3. **Ciclo de nómina**: Abrir período → revisar registros → cerrar período
4. **Gestión de ausencias**: Solicitar ausencia → aprobación → reflejo en calendario
5. **Expediente documental**: Subir documento → categorizar → versionado automático → log de acceso

## Implementación: Plan por Sprints

### Sprint 1 — Navegación MVP (1-2 días)
- Crear `HRNavigationMenuMVP` simplificado con solo las 7 áreas MVP
- O bien: añadir flag `mvpMode` al `HRNavigationMenu` existente que oculte items post-MVP
- Ocultar mega-menus Premium, Talento avanzado, Analytics, Utilidades
- Mantener `HRModule.tsx` intacto (todos los routes siguen existiendo, solo se oculta la nav)

### Sprint 2 — Pulido Core HR (2-3 días)
- Filtros de entidad legal y país en `HREmployeesPanel`
- Verificar que expediente empleado funciona end-to-end con datos reales
- Verificar CRUD contratos con entidad legal asignada
- Limitar portal admin a 6 tipos de solicitud (flag o filtro en `HRAdminRequestForm`)

### Sprint 3 — Payroll + España operativo (2-3 días)
- Verificar flujo completo: abrir período → registros → cierre
- Verificar inyección de conceptos ES vía Payroll Bridge
- Verificar cálculo IRPF y SS con datos reales de un empleado
- Conectar incidencias del portal admin con líneas de nómina

### Sprint 4 — Documentos + Workflows (1-2 días)
- Verificar upload de documentos con hash + versionado
- Verificar que solicitudes admin generan tareas automáticas
- Verificar bandeja de aprobaciones funcional
- Test end-to-end del flujo completo: solicitud → tarea → aprobación → documento

### Sprint 5 — Testing + Seed Data (1-2 días)
- Seed data coherente para 1 empresa con 10-15 empleados
- 2-3 entidades legales, 3-4 centros de trabajo
- Datos ES completos para 5 empleados
- 1 período de nómina con registros
- 5-10 solicitudes admin en distintos estados
- Verificación end-to-end de los 5 flujos mínimos

**Total estimado: 7-12 días de desarrollo**

## Dependencias

```text
Sprint 1 (Nav) → no depende de nada
Sprint 2 (Core) → no depende de nada
Sprint 3 (Payroll+ES) → depende de Sprint 2 (empleados con datos ES)
Sprint 4 (Docs+WF) → depende de Sprint 2 (empleados creados)
Sprint 5 (Test) → depende de todos los anteriores
```

## Criterio de "MVP Operativo"

El MVP está completo cuando un usuario puede:
1. Crear una empresa con entidades legales y centros de trabajo
2. Dar de alta empleados asignándolos a entidad/centro
3. Rellenar datos laborales España (NAF, grupo cotización, IRPF)
4. Crear contratos vinculados a empleados
5. Solicitar una baja/alta/modificación desde el portal admin
6. Ver la tarea generada y aprobarla
7. Abrir un período de nómina y ver registros
8. Subir documentos al expediente del empleado
9. Ver el dashboard ejecutivo con datos reales

