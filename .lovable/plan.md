

# Implementación Técnica del MVP — Auditoría y Propuesta

## 1. Esquema de Base de Datos (YA EXISTE)

Las ~25 tablas MVP están todas creadas y operativas. No se necesitan migraciones nuevas.

| Tabla | Columnas clave | company_id | Timestamps |
|-------|---------------|------------|------------|
| `erp_hr_employees` | first_name, last_name, status, hire_date, legal_entity_id, work_center_id, country_code | ✅ NOT NULL | ✅ created_at, updated_at |
| `erp_hr_contracts` | employee_id, contract_type, start_date, end_date, base_salary, is_active, country_code | ✅ (nullable!) | ✅ |
| `erp_hr_departments` | company_id, name | ✅ | ✅ |
| `erp_hr_legal_entities` | company_id, name, country_code | ✅ | ✅ |
| `erp_hr_work_centers` | company_id, legal_entity_id | ✅ | ✅ |
| `erp_hr_leave_requests` | employee_id, company_id, start_date, end_date, status, workflow_status | ✅ | ✅ |
| `hr_payroll_periods` | company_id, legal_entity_id, country_code, status, start_date, end_date | ✅ | ✅ |
| `hr_payroll_records` | employee_id, company_id, payroll_period_id, gross_salary, net_salary, status | ✅ | ✅ |
| `hr_payroll_record_lines` | record_id, concept, amount, line_type | ✅ (via record) | ✅ |
| `hr_admin_requests` | employee_id, company_id, request_type, status, priority, assigned_to | ✅ | ✅ |
| `hr_admin_request_comments` | request_id, comment | ✅ (via request) | ✅ |
| `hr_admin_request_activity` | request_id, action | ✅ (via request) | ✅ |
| `hr_tasks` | company_id, employee_id, assigned_to, status, priority, sla_hours, sla_breached | ✅ | ✅ |
| `erp_hr_employee_documents` | company_id, employee_id, document_type, category, file_hash, version | ✅ | ✅ |
| `erp_hr_workflow_definitions` | company_id | ✅ | ✅ |
| `erp_hr_workflow_instances` | company_id | ✅ | ✅ |
| `erp_hr_workflow_decisions` | instance_id (join) | ✅ (via join) | ✅ |
| `hr_es_employee_labor_data` | employee_id, company_id, naf, grupo_cotizacion, irpf fields | ✅ | ✅ |
| `hr_es_irpf_tables` | tramos IRPF | N/A (reference) | ✅ |
| `hr_es_ss_bases` | bases cotización SS | N/A (reference) | ✅ |
| `hr_country_registry` | country_code, policies | N/A (reference) | ✅ |

---

## 2. Reglas de Acceso — PROBLEMA CRÍTICO DETECTADO

**Tablas con RLS correcto** (usan `user_has_erp_company_access(company_id)`):
- `erp_hr_employees` ✅
- `erp_hr_contracts` ✅
- `erp_hr_employee_documents` ✅
- `erp_hr_legal_entities` ✅
- `erp_hr_work_centers` ✅
- `erp_hr_leave_requests` ✅
- `erp_hr_workflow_definitions/instances/decisions` ✅

**Tablas con RLS INSEGURO** (`USING(true)` — cualquier usuario autenticado puede leer/escribir todo):
- `hr_admin_requests` ⚠️
- `hr_tasks` ⚠️
- `hr_payroll_records` ⚠️
- `hr_payroll_periods` ⚠️
- `hr_payroll_record_lines` ⚠️
- `hr_es_employee_labor_data` ⚠️
- `hr_admin_request_comments` ⚠️

### Migración necesaria: Corregir 7 políticas RLS

Reemplazar las políticas `USING(true)` por `user_has_erp_company_access(company_id)` en las 7 tablas afectadas. Para tablas sin `company_id` directo (como `hr_payroll_record_lines`), hacer JOIN al padre.

---

## 3. Estados del Workflow (ya implementados en BD)

| Entidad | Campo | Estados |
|---------|-------|---------|
| Employee | `status` | `candidate`, `onboarding`, `active`, `temporary_leave`, `excedencia`, `offboarding`, `terminated` |
| Contract | `is_active` | `true/false` + `termination_type` |
| Leave Request | `status` | `pending`, `approved`, `rejected`, `cancelled` |
| Leave Request | `workflow_status` | enum: `pending_dept`, `pending_hr`, `approved`, `rejected` |
| Payroll Period | `status` | `draft`, `open`, `calculating`, `review`, `closed`, `locked` |
| Payroll Record | `status` | `draft`, `calculated`, `validated`, `paid`, `cancelled` |
| Admin Request | `status` | `open`, `in_progress`, `pending_approval`, `approved`, `rejected`, `completed`, `cancelled` |
| Task | `status` | `pending`, `in_progress`, `completed`, `cancelled`, `blocked` |

---

## 4. Acciones CRUD y Endpoints (ya implementados en hooks)

Todos los CRUD están en hooks existentes — no se necesitan nuevos endpoints:

| Área | Hook | Acciones |
|------|------|----------|
| Empleados | `useHRModule` | `createEmployee`, `updateEmployee`, `deleteEmployee`, `fetchEmployees` |
| Contratos | `useHRModule` | `createContract`, `updateContract` |
| Ausencias | `useHRModule` | `requestLeave`, `approveLeave`, `rejectLeave` |
| Nómina | `usePayrollEngine` | `createPeriod`, `openPeriod`, `closePeriod`, `fetchRecords` |
| Portal Admin | `useAdminPortal` | `createRequest`, `updateRequest`, `addComment`, `addActivity` |
| Tareas | `useHRTasksEngine` | `createTask`, `updateTask`, `completeTask`, `bulkAction` |
| Documentos | `useHRDocumentExpedient` | `uploadDocument`, `fetchDocuments`, `logAccess` |
| España | `useESLocalization` | `saveEmployeeLaborData`, `calculateIRPF`, `calculateSS` |
| Workflows | `useHRWorkflowEngine` | `startWorkflow`, `decideStep`, `getInbox` |

---

## 5. Validaciones (ya implementadas en frontend)

| Validación | Ubicación |
|------------|-----------|
| Empleado: first_name, last_name, hire_date required | `HREmployeeFormDialog` |
| Contrato: contract_type, start_date required | `HRContractsPanel` |
| Ausencia: start_date < end_date, no solapamiento | `useHRModule` |
| Nómina: período no puede cerrarse con registros draft | `usePayrollEngine` |
| España: NAF formato, grupo cotización 1-11 | `ESEmployeeLaborDataForm` |

---

## 6. Plan de Implementación

### Única migración necesaria: Fix RLS (7 tablas)

```sql
-- Drop insecure policies and replace with company-scoped ones
-- hr_admin_requests, hr_tasks, hr_payroll_records, 
-- hr_payroll_periods, hr_payroll_record_lines,
-- hr_es_employee_labor_data, hr_admin_request_comments
```

Para `hr_payroll_record_lines` (no tiene `company_id` directo):
```sql
-- Policy using JOIN: EXISTS (SELECT 1 FROM hr_payroll_records r 
--   WHERE r.id = record_id AND user_has_erp_company_access(r.company_id))
```

Para `hr_admin_request_comments` y `hr_admin_request_activity`:
```sql
-- Policy using JOIN: EXISTS (SELECT 1 FROM hr_admin_requests req 
--   WHERE req.id = request_id AND user_has_erp_company_access(req.company_id))
```

### No se necesitan cambios en:
- Esquema de tablas (todo existe)
- Hooks (todos funcionales)
- Edge functions (todas desplegadas)
- Componentes UI (ya pulidos con mvpMode en Sprint 1)

### Resumen: 1 migración SQL (fix RLS) — 0 cambios de código

