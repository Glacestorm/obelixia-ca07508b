# V2-ES.2 — Workflows y Aprobaciones Reales

**Base:** MVP v1.0 baseline congelado  
**Objetivo:** Circuitos administrativos reales con trazabilidad completa  
**Principio:** Evolución aditiva — NO romper baseline  

---

## 1. ESTADO ACTUAL

### HRAdminPortal (`useAdminPortal`)
- ✅ 14 tipos de solicitud (alta, IT, AT, vacaciones, finiquito, certificado…)
- ✅ 10 estados (draft → completed/rejected/cancelled)
- ✅ Comentarios internos + timeline de actividad
- ✅ Dashboard con KPIs + lista filtrable
- ✅ Detalle con historial
- ✅ Generación automática de tareas (`generateTasks`)
- ❌ No hay workflow real vinculado (campo `workflow_instance_id` existe pero no se usa)
- ❌ No hay validaciones por tipo de solicitud
- ❌ No hay documentos obligatorios por tipo
- ❌ No hay relación con expediente documental

### HRApprovalInbox (`useHRWorkflowEngine`)
- ✅ Bandeja con filtro por estado (6 estados)
- ✅ Decisiones con comentario obligatorio
- ✅ Stats (total, en curso, aprobados, rechazados, SLA breach)
- ✅ Workflow definitions con steps, SLA, escalado, delegación
- ✅ 9 workflow definitions seeded (vacaciones, contratación, revisión salarial…)
- ❌ No hay conexión real solicitud → workflow instance
- ❌ Decisiones no avanzan automáticamente al siguiente paso
- ❌ No se generan tareas por paso de workflow
- ❌ No se vinculan documentos a pasos

### HRTasksModule (`useHRTasksEngine`)
- ✅ CRUD completo con 9 categorías, 5 estados, SLA, escalación
- ✅ Subtareas (`parent_task_id`)
- ✅ Campos de vinculación: `workflow_instance_id`, `source_type`, `source_id`
- ✅ Dashboard + Mi Bandeja + Todas
- ✅ Acciones masivas
- ❌ No se generan automáticamente desde pasos de workflow
- ❌ No hay timeline unificado solicitud+tareas+aprobaciones

### Tablas workflow existentes
- `erp_hr_workflow_definitions` — 9 workflows seeded
- `erp_hr_workflow_steps` — pasos con SLA, escalado, rol aprobador
- `erp_hr_workflow_instances` — instancias en ejecución
- `erp_hr_workflow_decisions` — decisiones con comentario
- `erp_hr_workflow_delegations` — delegaciones temporales
- `erp_hr_workflow_sla_tracking` — tracking SLA con breach

---

## 2. DISEÑO FUNCIONAL

### 2.1 Flujo integrado: Solicitud → Workflow → Tareas → Documentos

```
[1. Solicitud creada]
    ↓ automático
[2. Workflow instance creada] (si el tipo tiene workflow asociado)
    ↓ automático  
[3. Tarea creada para paso 1] (asignada al rol del paso)
    ↓ aprobación en Inbox
[4. Decisión registrada] → actividad en timeline solicitud
    ↓ automático
[5. Si aprobado → avanzar a paso 2 → nueva tarea]
[5b. Si rechazado → cerrar workflow → devolver solicitud]
    ↓ último paso aprobado
[6. Workflow completado → solicitud a "approved"]
    ↓ automático
[7. Tareas de ejecución generadas] (ej: "Tramitar alta en SILTRA")
    ↓ completar tareas
[8. Solicitud a "completed"] → documentos vinculados
```

### 2.2 Mapeo tipo de solicitud → workflow

| Tipo solicitud | Workflow asociado | Pasos | Documentos requeridos |
|---|---|---|---|
| `employee_registration` | Contratación | Mánager → RRHH → Legal | Contrato, DNI, SS |
| `contract_modification` | Modificación contractual | Mánager → RRHH | Anexo contrato |
| `salary_change` | Revisión salarial | Mánager → RRHH → Dirección | Carta revisión |
| `sick_leave` | IT simple (1 paso) | RRHH | Parte médico |
| `work_accident` | AT/EP (2 pasos) | RRHH → PRL | Parte AT, Delt@ |
| `termination` | Offboarding | Mánager → RRHH → Legal | Finiquito, certificado |
| `settlement` | Validación finiquito | RRHH → Legal → Dirección | Liquidación |
| `vacation` | Vacaciones | Mánager | — |
| `birth_leave` | Nacimiento (1 paso) | RRHH | Libro familia |
| `schedule_change` | Cambio jornada | Mánager → RRHH | Anexo jornada |
| `unpaid_leave` | Permiso no retribuido | Mánager → RRHH | — |
| `company_certificate` | Sin workflow | — (auto) | — |
| `document_submission` | Sin workflow | — (auto) | Documento adjunto |
| `monthly_incidents` | Sin workflow | — (auto) | — |

### 2.3 Estados ampliados de solicitud

```
draft → submitted → [workflow_started] → pending_approval → 
  → approved → in_progress → completed
  → returned (devuelta para corrección) → submitted (re-envío)
  → rejected → (fin)
  → cancelled → (fin)
  → escalated → pending_approval (re-asignada)
```

Nuevo estado `workflow_started` indica que hay un workflow activo.  
Nuevo estado `escalated` indica escalado SLA.

### 2.4 Tipos de aprobación

| Tipo | Descripción | Uso |
|---|---|---|
| `single_approval` | 1 aprobador, 1 paso | Vacaciones, certificados |
| `sequential` | N pasos secuenciales, cada uno con su rol | Contratación, offboarding |
| `parallel` | Varios aprobadores al mismo nivel (todos deben aprobar) | Revisión salarial (RRHH + Dirección) |
| `conditional` | Ruta según condiciones (ej: importe > X → requiere Dirección) | Bonus, modificación contractual |
| `auto_approve` | Aprobación automática si cumple condiciones | Vacaciones < 3 días, certificados |

---

## 3. MEJORAS POR COMPONENTE

### 3.1 useAdminPortal — Mejoras

| ID | Mejora | Tipo |
|---|---|---|
| AP1 | `createRequest` → auto-crear workflow instance si el tipo tiene workflow asociado | Ampliar función |
| AP2 | `updateStatus` → sincronizar estado con workflow instance | Ampliar función |
| AP3 | Nuevo `getRequestTimeline(requestId)` — unificar activity + workflow decisions + tareas + documentos | Nueva función |
| AP4 | Nuevo `getRequiredDocuments(requestType)` — documentos obligatorios por tipo | Nueva función |
| AP5 | Nuevo `validateRequest(requestId)` — validaciones específicas por tipo antes de submit | Nueva función |
| AP6 | Campo `workflow_instance_id` activamente vinculado al crear solicitud | Fix |

### 3.2 useHRWorkflowEngine — Mejoras

| ID | Mejora | Tipo |
|---|---|---|
| WF1 | `decideStep` → auto-avanzar: crear SLA tracking + tarea para siguiente paso | Ampliar función |
| WF2 | `decideStep` → si último paso aprobado, marcar workflow `completed` + actualizar solicitud | Ampliar función |
| WF3 | `decideStep` → si rechazado, cerrar workflow + devolver solicitud a `returned` o `rejected` | Ampliar función |
| WF4 | Nuevo `createInstanceForRequest(requestId, workflowDefId)` — vincular solicitud a workflow | Nueva función |
| WF5 | Nuevo `escalateStep(instanceId)` — escalar paso actual al rol superior | Nueva función |
| WF6 | Nuevo `checkAndEscalate()` — cron lógico que detecta SLA vencidos y escala | Nueva función |
| WF7 | Nuevo `getInstanceTimeline(instanceId)` — decisions + SLA + tareas vinculadas | Nueva función |

### 3.3 useHRTasksEngine — Mejoras

| ID | Mejora | Tipo |
|---|---|---|
| TK1 | Nuevo `createTaskForWorkflowStep(instanceId, stepId)` — generar tarea vinculada al paso | Nueva función |
| TK2 | `completeTask` → si la tarea está vinculada a un workflow step, marcar el step como decidido | Ampliar función |
| TK3 | Nuevo `getTasksByRequest(requestId)` — todas las tareas de una solicitud (directas + workflow) | Nueva función |
| TK4 | Nuevo `generateExecutionTasks(requestId, requestType)` — tareas post-aprobación | Nueva función |

### 3.4 UI — Mejoras

| ID | Componente | Mejora |
|---|---|---|
| UI1 | `HRAdminRequestDetail` | Añadir timeline unificado (solicitud + workflow + tareas + documentos) |
| UI2 | `HRAdminRequestDetail` | Mostrar documentos requeridos vs adjuntados (checklist) |
| UI3 | `HRAdminRequestDetail` | Badge de paso actual del workflow con progreso visual |
| UI4 | `HRAdminRequestForm` | Validaciones por tipo antes de submit |
| UI5 | `HRAdminRequestForm` | Zona de adjuntos obligatorios por tipo |
| UI6 | `HRApprovalInbox` | Mostrar de qué solicitud viene cada aprobación |
| UI7 | `HRApprovalInbox` | Indicador visual de SLA restante (horas/minutos) |
| UI8 | `HRApprovalInbox` | Botón "Escalar" para items vencidos |
| UI9 | `TasksList` | Columna "Origen" con link a solicitud/workflow |
| UI10 | `TasksDashboard` | KPI de tareas generadas por workflows vs manuales |

---

## 4. MIGRACIONES

| ID | Tabla | Cambio |
|---|---|---|
| M1 | `hr_admin_requests` | ADD COLUMN `required_documents jsonb DEFAULT '[]'` |
| M2 | `hr_admin_requests` | ADD COLUMN `validation_errors jsonb DEFAULT '[]'` |
| M3 | `hr_admin_requests` | ADD COLUMN `current_workflow_step text NULL` |
| M4 | `hr_admin_requests` | ADD COLUMN `escalated_at timestamptz NULL` |
| M5 | `hr_admin_requests` | ADD COLUMN `escalated_reason text NULL` |
| M6 | Nueva tabla `hr_request_workflow_mapping` | Mapeo tipo solicitud → workflow definition |
| M7 | Nueva tabla `hr_request_required_documents` | Documentos obligatorios por tipo solicitud |

### Tabla `hr_request_workflow_mapping`
```sql
CREATE TABLE hr_request_workflow_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  request_type text NOT NULL,
  workflow_definition_id uuid REFERENCES erp_hr_workflow_definitions(id),
  auto_start boolean DEFAULT true,
  conditions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### Tabla `hr_request_required_documents`
```sql
CREATE TABLE hr_request_required_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  request_type text NOT NULL,
  document_name text NOT NULL,
  document_category text DEFAULT 'laboral',
  is_mandatory boolean DEFAULT true,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

---

## 5. INTEGRACIÓN CON EXPEDIENTE DOCUMENTAL

| Punto de integración | Detalle |
|---|---|
| Adjuntos en solicitud → `erp_hr_employee_documents` | Al adjuntar documento en solicitud, crear entrada en expediente con `source_entity_type='admin_request'`, `source_entity_id=request.id` |
| Documentos requeridos | Checklist visual en detalle solicitud: "✅ Contrato firmado" / "❌ Pendiente: Parte médico" |
| Documentos generados | Al completar solicitud tipo `settlement`/`company_certificate`, generar documento y vincularlo |
| Timeline unificado | Mostrar en expediente empleado las solicitudes y sus documentos asociados |

---

## 6. INTEGRACIÓN CON OFFICIAL SUBMISSIONS

| Punto de integración | Detalle |
|---|---|
| Solicitud `employee_registration` aprobada | Generar tarea "Tramitar alta en Contrat@" + pre-crear submission draft |
| Solicitud `termination` completada | Generar tarea "Enviar baja SILTRA" + "Certificado empresa SEPE" |
| Solicitud `work_accident` aprobada | Generar tarea "Parte Delt@" |
| Estado submission | Mostrar en timeline de solicitud el estado del envío oficial |

---

## 7. PLAN DE IMPLEMENTACIÓN

### Paso 1 — Migraciones (M1-M7)
- ALTER `hr_admin_requests` (M1-M5)
- CREATE `hr_request_workflow_mapping` (M6)
- CREATE `hr_request_required_documents` (M7)
- Seed: mapeo de 11 tipos con workflow + documentos requeridos

### Paso 2 — Orquestación solicitud → workflow (AP1, AP2, AP6, WF4)
- Al crear solicitud: buscar mapping → crear workflow instance → vincular
- Al cambiar estado solicitud: sincronizar con workflow

### Paso 3 — Auto-avance de workflows (WF1-WF3, TK1, TK2)
- `decideStep` avanza al siguiente paso automáticamente
- Genera tarea para el nuevo paso
- Si último paso → completed → actualiza solicitud
- Si rechazado → cierra todo

### Paso 4 — Escalado y SLA (WF5, WF6, UI7, UI8)
- `checkAndEscalate` para SLA vencidos
- UI: indicador de tiempo restante, botón escalar

### Paso 5 — Validaciones y documentos (AP4, AP5, UI4, UI5)
- Validaciones por tipo de solicitud
- Checklist de documentos requeridos
- Zona de adjuntos obligatorios en formulario

### Paso 6 — Timeline unificado (AP3, WF7, TK3, UI1-UI3)
- Timeline que combina: actividad solicitud + decisiones workflow + tareas + documentos
- Progreso visual del workflow (paso 2 de 3)
- Links cruzados solicitud ↔ workflow ↔ tareas

### Paso 7 — Mejoras de UI restantes (UI6, UI9, UI10, TK4)
- ApprovalInbox: mostrar solicitud de origen
- TasksList: columna origen con link
- TasksDashboard: KPI workflows vs manual
- Tareas de ejecución post-aprobación

---

## 8. RESUMEN

| Dimensión | Valor |
|---|---|
| Hooks modificados | 3 (useAdminPortal, useHRWorkflowEngine, useHRTasksEngine) |
| Funciones nuevas en hooks | 14 (AP1-AP6 + WF1-WF7 + TK1-TK4) |
| Migraciones | 7 (5 ALTER + 2 CREATE) |
| Componentes UI modificados | 5 |
| Sub-componentes nuevos | 2 (UnifiedTimeline, WorkflowProgress) |
| Items de menú nuevos | 0 |
| Edge functions nuevas | 0 |
| Seed nuevo | Mapeo 11 tipos + documentos requeridos |
| Riesgo sobre baseline | BAJO — todo aditivo |

---

*Documento generado: 2026-03-12*  
*Dependencia: independiente de V2-ES.1 — ejecutable en paralelo*
