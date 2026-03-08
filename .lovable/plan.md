
# Plan: RRHH Enterprise Suite — Evolución en 8 Fases

## Estado de Implementación

| Fase | Estado | Detalles |
|------|--------|----------|
| 1 - Arquitectura Enterprise | ✅ Completada | 13 tablas DB + Edge Function + Hook + 7 UI Panels + Navegación + Seed Data |
| 2 - Workflow Engine | 📋 Pendiente | — |
| 3 - Compensation Suite | 📋 Pendiente | — |
| 4 - Talent Intelligence | 📋 Pendiente | — |
| 5 - Compliance Enterprise | 📋 Pendiente | — |
| 6 - Wellbeing Enterprise | 📋 Pendiente | — |
| 7 - ESG Social + Self-Service | 📋 Pendiente | — |
| 8 - Copilot + Digital Twin | 📋 Pendiente | — |

## FASE 1 — Completada ✅

### Tablas creadas:
- `erp_hr_legal_entities` — Entidades legales (CIF, jurisdicción, tipo societario, CCC patronal, CNAE)
- `erp_hr_work_centers` — Centros de trabajo (dirección, CCC, capacidad, sede central)
- `erp_hr_org_units` — Unidades organizativas jerárquicas (división→área→departamento→sección→equipo)
- `erp_hr_work_calendars` — Calendarios laborales por jurisdicción/centro
- `erp_hr_calendar_entries` — Festivos y días especiales
- `erp_hr_enterprise_roles` — Roles HR enterprise (7 roles predefinidos)
- `erp_hr_enterprise_permissions` — Catálogo de permisos (13 módulos × 6 acciones = 78 permisos)
- `erp_hr_role_permissions` — Permisos por rol
- `erp_hr_role_assignments` — Asignación usuario-rol con scope (global, entidad, centro, departamento)
- `erp_hr_field_permissions` — Permisos a nivel de campo
- `erp_hr_data_access_rules` — Reglas ABAC dinámicas
- `erp_hr_audit_log` — Log inmutable con 7 índices optimizados
- `erp_hr_critical_events` — Eventos críticos con resolución

### Columnas añadidas:
- `erp_hr_employees`: `legal_entity_id`, `work_center_id`, `org_unit_id`, `work_calendar_id`
- `erp_hr_departments`: `legal_entity_id`, `work_center_id`
- `erp_hr_collective_agreements`: `legal_entity_id`, `work_center_id`

### Functions DB:
- `hr_check_permission(user_id, company_id, module, action, resource)` — SECURITY DEFINER
- `hr_log_audit(company_id, user_id, action, table, record_id, old, new, category, severity)` — SECURITY DEFINER con auto-creación de eventos críticos

### Edge Function: `erp-hr-enterprise-admin`
- 15 acciones: CRUD entidades, centros, org units, calendarios, roles, permisos, audit queries, critical events, stats, seed data

### Hook: `useHREnterprise`
- Gestión completa de estructura organizativa, RBAC/ABAC, audit trail

### UI (7 paneles):
- `HREnterpriseDashboard` — Command Center con 6 KPIs + eventos críticos
- `HRLegalEntitiesPanel` — CRUD completo con 9 jurisdicciones
- `HRWorkCentersPanel` — CRUD con vinculación a entidad legal
- `HROrgStructurePanel` — Organigrama visual jerárquico con 5 tipos de unidad
- `HRCalendarsPanel` — Calendarios con festivos expandibles
- `HRRolesPermissionsPanel` — Matriz RBAC visual por rol/módulo
- `HRAuditTrailPanel` — Visor con filtros + eventos críticos

### Navegación:
- Nueva categoría "Enterprise" en HRNavigationMenu con 7 items

### Seed Data:
- 3 entidades legales (Madrid, Barcelona, Andorra)
- 4 centros de trabajo
- 6 unidades organizativas
- Calendario España 2026 con 13 festivos
- 7 roles enterprise con matriz de permisos completa
- 78 permisos catalogados (13 módulos × 6 acciones)

### RLS:
- 14 policies aplicadas a todas las tablas nuevas
- Basadas en `user_has_erp_company_access()`
