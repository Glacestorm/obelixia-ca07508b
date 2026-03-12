

# Portal Administrativo HR (tipo Milena PA)

## Resumen

Transformar el `HRAdminRequestsPanel` actual (4 líneas de demo data) en un portal administrativo completo con formularios tipados por gestión, workflow de aprobación, comentarios, adjuntos, tareas automáticas y registro de actividad. Se reutiliza la tabla `hr_admin_requests` existente y se añaden 2 tablas auxiliares.

---

## 1. Migración SQL — 2 tablas nuevas

### `hr_admin_request_comments`
Comentarios y notas internas por solicitud. Campos: `id`, `request_id` (FK → hr_admin_requests), `author_id`, `author_name`, `content`, `is_internal` (bool), `attachments` (JSONB), `created_at`.

### `hr_admin_request_activity`
Log de actividad inmutable. Campos: `id`, `request_id` (FK → hr_admin_requests), `action` (created, status_changed, assigned, commented, attachment_added, workflow_started, task_generated), `actor_id`, `actor_name`, `old_value`, `new_value`, `metadata` (JSONB), `created_at`.

RLS: authenticated users con `company_id` match. Indexes en `request_id`. Realtime habilitado para ambas.

---

## 2. Tipos de Solicitud (14 iniciales)

Cada tipo define: campos del formulario, prioridad por defecto, workflow trigger, y tareas automáticas.

| `request_type` | `request_subtype` | Campos formulario (en `metadata` JSONB) | Workflow trigger | Tareas auto |
|---|---|---|---|---|
| `employee_registration` | — | nombre, puesto, departamento, fecha_inicio, jornada, salario_bruto, entidad_legal, centro_trabajo | Aprobación manager + RRHH | Crear ficha, generar contrato, onboarding checklist |
| `contract_modification` | — | employee_id, tipo_cambio, fecha_efecto, nuevas_condiciones | Aprobación RRHH + legal | Actualizar contrato, notificar nóminas |
| `schedule_change` | — | employee_id, jornada_actual, jornada_nueva, fecha_efecto, motivo | Aprobación manager | Actualizar contrato, recalcular nómina |
| `salary_change` | — | employee_id, salario_actual, salario_nuevo, fecha_efecto, motivo | Aprobación dirección + RRHH | Actualizar ficha, recalcular nómina |
| `monthly_incidents` | — | employee_id, periodo, conceptos[] (horas_extra, plus, descuento) | Revisión payroll | Incorporar a nómina del período |
| `sick_leave` | `it_common` / `it_professional` | employee_id, fecha_inicio, fecha_fin_estimada, diagnostico_generico, parte_baja | Notificación RRHH | Registrar leave_incident, calcular complemento |
| `work_accident` | — | employee_id, fecha, descripcion, testigos, centro_trabajo, parte_accidente | Aprobación PRL + RRHH | Leave incident, parte accidente, investigación |
| `unpaid_leave` | — | employee_id, fecha_inicio, fecha_fin, motivo | Aprobación manager + RRHH | Registrar leave_incident, ajustar nómina |
| `birth_leave` | `paternity` / `maternity` | employee_id, fecha_nacimiento, tipo, semanas | Notificación RRHH | Leave incident, solicitud prestación SS |
| `vacation` | — | employee_id, fecha_inicio, fecha_fin, dias | Aprobación manager | Crear leave_request |
| `termination` | `voluntary` / `dismissal` / `end_contract` | employee_id, fecha_efecto, tipo_baja, motivo | Aprobación dirección + RRHH + legal | Offboarding, finiquito, baja SS |
| `settlement` | — | employee_id, conceptos_finiquito, fecha_calculo | Aprobación payroll + dirección | Calcular finiquito, generar documento |
| `company_certificate` | — | employee_id, tipo_certificado, motivo, destinatario | Auto-aprobación o RRHH | Generar documento desde template |
| `document_submission` | — | employee_id, tipo_documento, descripcion, adjuntos | Auto-registro | Vincular a expediente empleado |

---

## 3. Estados de la Solicitud

```text
draft → submitted → reviewing → pending_approval → approved → in_progress → completed
                       ↓              ↓                              ↓
                    returned      rejected                        cancelled
```

Se añaden al `HRStatusBadge` los estados: `draft`, `submitted`, `in_progress`, `completed`, `returned`.

---

## 4. Componentes a Crear

### 4.1 `HRAdminPortal` (reemplaza `HRAdminRequestsPanel`)
Panel principal con 3 vistas: Listado, Detalle, Nuevo.

### 4.2 `HRAdminRequestsList`
Tabla con filtros: tipo, estado, prioridad, empleado, fecha. Columnas: ref, tipo, empleado, estado, prioridad, asignado, fecha. Acciones: ver detalle, cambiar estado rápido.

### 4.3 `HRAdminRequestDetail`
Vista de detalle con:
- Header: ref, estado, prioridad, asignado, empleado vinculado
- Formulario leído (datos del metadata)
- Panel de adjuntos
- Timeline de actividad (`hr_admin_request_activity`)
- Comentarios (`hr_admin_request_comments`)
- Acciones: aprobar, rechazar, devolver, asignar, cambiar estado
- Sidebar: entidades relacionadas (empleado, contrato, nómina)

### 4.4 `HRAdminRequestForm`
Dialog/sheet con formulario dinámico según `request_type`. Selector de tipo → campos dinámicos → validación → submit. Sección de adjuntos. Genera referencia automática (ADM-YYYYMMDD-XXXXX).

### 4.5 `HRAdminRequestComments`
Lista de comentarios con input. Toggle "comentario interno" para notas visibles solo por RRHH.

### 4.6 `HRAdminRequestTimeline`
Timeline visual de actividad con iconos por tipo de acción.

### 4.7 `HRAdminPortalDashboard`
Mini-dashboard: solicitudes por estado (badges), por tipo (barras), SLA pendientes, mis asignadas.

---

## 5. Hook: `useAdminPortal`

CRUD contra `hr_admin_requests` + `hr_admin_request_comments` + `hr_admin_request_activity`. Funciones:
- `fetchRequests(filters)` — listado con joins a employees
- `createRequest(data)` — insert + activity log "created" + auto-generate ref
- `updateStatus(id, newStatus, comment?)` — update + activity log + comment opcional
- `assignRequest(id, assignedTo)` — update + activity
- `addComment(requestId, content, isInternal, attachments?)` — insert comment + activity
- `fetchDetail(id)` — request + comments + activity + employee data
- `generateTasks(requestId)` — crear `hr_tasks` según tipo de solicitud

---

## 6. Wiring en HRModule

- Reemplazar `HRAdminRequestsPanel` por `HRAdminPortal` en el slot `admin-requests`
- Añadir nav item `admin-portal` en el mega-menu Laboral (o renombrar el existente `admin-requests`)

---

## 7. Plan de implementación

| Tarea | Detalle |
|---|---|
| **P1** | Migración SQL: 2 tablas nuevas + RLS + indexes + realtime |
| **P2** | Hook `useAdminPortal` con CRUD completo |
| **P3** | `HRAdminPortal` con lista, detalle y formulario dinámico |
| **P4** | Comentarios + Timeline de actividad |
| **P5** | Generación automática de tareas y estados HRStatusBadge |
| **P6** | Wiring en HRModule + actualizar navegación |

