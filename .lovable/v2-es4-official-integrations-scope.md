# V2-ES.4 — Integraciones Oficiales España

## Alcance Funcional

Evolucionar el `OfficialIntegrationsHub` existente en una capa seria de interoperabilidad con organismos oficiales españoles, sin romper el MVP baseline ni crear módulos nuevos separados.

---

## 1. Modelo de Estados de Submissions

### Estado actual (MVP)
`pending → submitted → completed/failed`

### Estado V2.4 (ciclo de vida completo)

```
draft → pending_validation → validated → queued → submitting → submitted
  → acknowledged → accepted → closed
  → rejected → correcting → queued (reenvío)
  → error → retry_scheduled → queued (reintento)
  → expired
  → cancelled
```

#### Transiciones permitidas

| Desde | Hacia | Trigger |
|-------|-------|---------|
| draft | pending_validation | Usuario confirma envío |
| pending_validation | validated | Validación automática OK |
| pending_validation | draft | Validación falla (corregir datos) |
| validated | queued | Encolado para envío |
| queued | submitting | Worker toma el envío |
| submitting | submitted | Envío ejecutado al organismo |
| submitted | acknowledged | Acuse de recibo del organismo |
| acknowledged | accepted | Organismo acepta |
| acknowledged | rejected | Organismo rechaza |
| rejected | correcting | Usuario inicia corrección |
| correcting | queued | Reenvío tras corrección |
| submitting | error | Error técnico |
| error | retry_scheduled | Auto-reintento programado |
| retry_scheduled | queued | Timer cumplido |
| accepted | closed | Cierre administrativo |
| * | cancelled | Cancelación manual (solo pre-submitted) |
| submitted | expired | Timeout sin respuesta del organismo |

### Campos adicionales en `hr_es_official_submissions`

```sql
ALTER TABLE hr_es_official_submissions
  ADD COLUMN IF NOT EXISTS status_v2 TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS validation_result JSONB,
  ADD COLUMN IF NOT EXISTS validation_errors TEXT[],
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_code TEXT,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_code TEXT,
  ADD COLUMN IF NOT EXISTS last_error_detail JSONB,
  ADD COLUMN IF NOT EXISTS parent_submission_id UUID REFERENCES hr_es_official_submissions(id),
  ADD COLUMN IF NOT EXISTS correction_of UUID REFERENCES hr_es_official_submissions(id),
  ADD COLUMN IF NOT EXISTS source_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_id UUID,
  ADD COLUMN IF NOT EXISTS legal_entity_id UUID;
```

### `status_history` JSONB format

```json
[
  {
    "from": "draft",
    "to": "pending_validation",
    "at": "2026-03-12T10:00:00Z",
    "by": "user-uuid",
    "reason": "Envío iniciado por usuario",
    "metadata": {}
  }
]
```

---

## 2. Evidencias y Acuses

### Nueva tabla: `hr_es_submission_evidence`

```sql
CREATE TABLE hr_es_submission_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES hr_es_official_submissions(id),
  evidence_type TEXT NOT NULL, -- 'acknowledgment' | 'receipt' | 'response' | 'error_detail' | 'certificate' | 'correction_request'
  organism TEXT NOT NULL,
  file_name TEXT,
  file_url TEXT,
  file_hash TEXT, -- SHA-256 para integridad
  mime_type TEXT DEFAULT 'application/pdf',
  content_data JSONB, -- datos estructurados del acuse/respuesta
  exchange_metadata JSONB, -- headers, timestamps, IDs del organismo
  received_at TIMESTAMPTZ DEFAULT now(),
  linked_employee_id UUID,
  linked_document_id UUID, -- enlace a erp_hr_employee_documents
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_submission_evidence_submission ON hr_es_submission_evidence(submission_id);
CREATE INDEX idx_submission_evidence_type ON hr_es_submission_evidence(evidence_type);
CREATE INDEX idx_submission_evidence_employee ON hr_es_submission_evidence(linked_employee_id);
```

### Enlace con expediente documental

Cuando se recibe un acuse o justificante:
1. Se crea registro en `hr_es_submission_evidence`
2. Se crea/enlaza entrada en `erp_hr_employee_documents` con:
   - `category = 'official_evidence'`
   - `source_entity_type = 'submission'`
   - `source_entity_id = submission.id`
   - `subcategory = evidence_type`

---

## 3. Adaptadores Oficiales España

### Arquitectura de adaptadores

```
┌──────────────────────────────────────────┐
│        Official Integrations Hub         │  ← Capa global (agnóstica)
│  - Submission lifecycle                  │
│  - Evidence storage                      │
│  - Status machine                        │
│  - Retry engine                          │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│     ES Adapter Registry (España)         │  ← Capa localización
│  - Registro de adaptadores por organismo │
│  - Validaciones específicas por tipo     │
│  - Mapeo de campos España               │
└──────────────┬───────────────────────────┘
               │
    ┌──────────┼──────────┬──────────┐
    ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│SILTRA  │ │ AEAT   │ │Certif. │ │Contrat@│  ← Adaptadores individuales
│Adapter │ │Adapter │ │Adapter │ │Adapter │
└────────┘ └────────┘ └────────┘ └────────┘
```

### Adaptadores contemplados

| Adaptador | Organismo | Tipos de envío | Prioridad |
|-----------|-----------|----------------|-----------|
| SILTRA / RED | TGSS | Altas, bajas, variaciones, AFI, FAN, ITA, IDC | P1 |
| AEAT 111 | AEAT | Retenciones e ingresos a cuenta IRPF | P1 |
| Contrat@ | SEPE | Comunicación de contratos | P1 |
| Certific@2 | SEPE | Certificados de empresa | P2 |
| Delt@ | MITES | Accidentes de trabajo | P2 |
| AEAT 190 | AEAT | Resumen anual retenciones | P2 |
| AEAT 345 | AEAT | Planes de pensiones (futuro) | P3 |
| Seguridad Social Electrónica | TGSS | Consultas y certificados (futuro) | P3 |

### Tabla de registro de adaptadores: `hr_es_adapter_registry`

```sql
CREATE TABLE hr_es_adapter_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adapter_code TEXT UNIQUE NOT NULL, -- 'siltra', 'aeat_111', 'contrata', etc.
  organism TEXT NOT NULL, -- 'TGSS', 'AEAT', 'SEPE', 'MITES'
  display_name TEXT NOT NULL,
  description TEXT,
  submission_types TEXT[] NOT NULL, -- tipos de envío soportados
  required_fields JSONB, -- campos obligatorios por tipo
  validation_rules JSONB, -- reglas de validación
  file_formats TEXT[], -- 'xml', 'txt', 'fan', 'afi'
  is_active BOOLEAN DEFAULT true,
  version TEXT DEFAULT '1.0',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Qué hace cada adaptador (interoperabilidad, NO embebe software)

Cada adaptador:
1. **Valida** datos del ERP contra reglas del organismo
2. **Genera** fichero/payload en formato oficial (XML, TXT, FAN, AFI)
3. **Registra** la submission con metadatos de intercambio
4. **Recibe** acuses/respuestas y los almacena como evidencia
5. **NO ejecuta** el envío real al organismo (eso lo hace el usuario con el software oficial)

El ERP **prepara, valida, genera, traza y evidencia**. El envío real se hace fuera.

---

## 4. Relaciones con Módulos RRHH

### Mapa de relaciones

```
hr_es_official_submissions
  ├── source_entity_type + source_entity_id
  │   ├── 'employee' → erp_hr_employees.id
  │   ├── 'contract' → erp_hr_contracts.id
  │   ├── 'payroll_record' → hr_payroll_records.id
  │   ├── 'payroll_period' → hr_payroll_periods.id
  │   ├── 'admin_request' → hr_admin_requests.id
  │   ├── 'settlement' → hr_es_settlements.id (futuro)
  │   └── 'incident' → hr_leave_incidents.id
  │
  ├── legal_entity_id → (entidad jurídica empleadora)
  │
  ├── hr_es_submission_evidence[]
  │   └── linked_employee_id → erp_hr_employees.id
  │   └── linked_document_id → erp_hr_employee_documents.id
  │
  └── erp_hr_workflow_instances (trigger automático)
      └── hr_tasks (tareas derivadas)
```

### Integraciones activas

| Módulo | Relación con submissions |
|--------|--------------------------|
| Empleados | Alta/baja genera submission SILTRA |
| Contratos | Nuevo contrato genera submission Contrat@ |
| Nómina | Cierre periodo genera submission AEAT 111 |
| Localización ES | Reglas de validación por adaptador |
| Solicitudes admin | Baja voluntaria dispara Certific@2 |
| Tareas RRHH | Submission pendiente genera tarea |
| Workflows | Submission sigue workflow aprobación si procede |
| Expediente doc | Acuses y ficheros se enlazan al expediente |

---

## 5. Hook: Evolución de useESOfficialSubmissions

### Funciones nuevas a añadir

```typescript
// Ciclo de vida V2
transitionStatus(submissionId, newStatus, reason?)
getStatusHistory(submissionId)
validateBeforeSubmit(submissionId) // ejecuta validación del adaptador

// Evidencias
attachEvidence(submissionId, evidence: EvidenceInput)
getEvidences(submissionId)
linkEvidenceToExpedient(evidenceId, employeeId)

// Adaptadores
getAdapterRegistry() // lista adaptadores activos
getAdapterConfig(adapterCode)
generateSubmissionFile(submissionId) // genera fichero según adaptador
validateWithAdapter(submissionId) // validación específica del organismo

// Reintentos
scheduleRetry(submissionId, delayMs?)
cancelRetry(submissionId)

// Consultas avanzadas
fetchByOrganism(organism)
fetchByStatus(status)
fetchByEmployee(employeeId)
fetchByPeriod(periodStart, periodEnd)
fetchPendingActions() // submissions que requieren acción
fetchErrors() // submissions con error
```

---

## 6. UX/UI — Evolución del Hub Dashboard

### Mejoras en OfficialIntegrationsHub

#### 6.1 Dashboard resumen
- KPIs: total submissions, pendientes, errores, aceptadas (periodo)
- Gráfico de volumen por organismo
- Alertas: submissions con error, reintentos agotados, pendientes >48h

#### 6.2 Listado de submissions (mejorado)
- Filtros: organismo, estado, periodo, empleado, entidad legal, tipo envío
- Columnas: tipo, organismo, estado (badge color), empleado, fecha, acciones
- Acciones rápidas: ver detalle, reintentar, cancelar, descargar fichero

#### 6.3 Detalle de submission
- Timeline visual de estados (status_history)
- Datos del envío (payload resumido)
- Evidencias adjuntas (acuses, justificantes, errores)
- Entidad origen (enlace a empleado/contrato/nómina)
- Fichero generado (descargable)
- Acciones: transicionar estado, adjuntar evidencia, vincular al expediente

#### 6.4 Vista de errores
- Filtro automático: submissions con status `error` o `rejected`
- Detalle de error (código, mensaje, traza)
- Acción: corregir y reenviar

#### 6.5 Vista de pendientes
- Filtro automático: submissions con status `draft`, `pending_validation`, `queued`
- Ordenadas por antigüedad
- Indicador SLA (>24h amarillo, >48h rojo)

#### 6.6 Vista de acuses
- Listado de evidencias recibidas
- Filtro por tipo de evidencia, organismo, fecha
- Enlace al expediente documental

### Subcomponentes nuevos (NO alteran menú MVP)

| Componente | Ubicación | Función |
|------------|-----------|---------|
| `SubmissionStatusTimeline` | Detalle submission | Timeline visual de estados |
| `SubmissionEvidencePanel` | Detalle submission | Lista y adjuntar evidencias |
| `SubmissionFilePreview` | Detalle submission | Preview del fichero generado |
| `AdapterValidationResult` | Detalle submission | Resultado validación adaptador |
| `SubmissionFilters` | Listado submissions | Filtros avanzados |
| `SubmissionKPICards` | Dashboard hub | KPIs resumen |
| `PendingSubmissionsAlert` | Dashboard hub | Alertas de pendientes |

---

## 7. Separación Modular

### Qué pertenece al Hub Global (agnóstico)

- Máquina de estados de submissions (genérica)
- Storage de evidencias (genérico)
- Retry engine (genérico)
- Timeline de estados (UI genérica)
- Filtros base (estado, fecha, tipo)

### Qué pertenece a Localización España

- Registro de adaptadores españoles (`hr_es_adapter_registry`)
- Validaciones por organismo
- Generación de ficheros en formato oficial español
- Tabla de evidencias con campos específicos ES
- Reglas de negocio: qué evento RRHH dispara qué submission

### Qué es reutilizable para futuras jurisdicciones

- Interfaz `OfficialAdapter` (validate, generateFile, parseResponse)
- Modelo de estados (mismo FSM para cualquier país)
- Evidence storage pattern
- Submission → source_entity linking
- UI components (Timeline, Evidence panel, Filters)
- Retry/escalation logic

---

## 8. Subfases de Implementación

### Subfase 4.1 — Migraciones y modelo de estados (Prioridad: ALTA)
- ALTER submissions con campos V2
- CREATE `hr_es_submission_evidence`
- CREATE `hr_es_adapter_registry`
- Seed adaptadores base (SILTRA, AEAT 111, Contrat@)
- RLS policies

### Subfase 4.2 — Hook lifecycle y adaptadores (Prioridad: ALTA)
- `transitionStatus` con validación de transiciones
- `status_history` auto-append
- `validateBeforeSubmit` con dispatch a adaptador
- `getAdapterRegistry` y `getAdapterConfig`
- `generateSubmissionFile` (stub para cada adaptador)

### Subfase 4.3 — Evidencias y enlace expediente (Prioridad: ALTA)
- `attachEvidence` y `getEvidences`
- `linkEvidenceToExpedient` (crea entrada en `erp_hr_employee_documents`)
- Upload de ficheros de acuse al storage

### Subfase 4.4 — Retry engine y error handling (Prioridad: MEDIA)
- `scheduleRetry` con backoff
- `cancelRetry`
- Auto-transition `error → retry_scheduled → queued`
- Max retries guard

### Subfase 4.5 — Consultas avanzadas y filtros (Prioridad: MEDIA)
- `fetchByOrganism`, `fetchByStatus`, `fetchByEmployee`, `fetchByPeriod`
- `fetchPendingActions`, `fetchErrors`
- Componente `SubmissionFilters`

### Subfase 4.6 — UI dashboard y vistas (Prioridad: MEDIA)
- `SubmissionKPICards`
- `SubmissionStatusTimeline`
- `SubmissionEvidencePanel`
- `PendingSubmissionsAlert`
- Mejora del listado con filtros y acciones

### Subfase 4.7 — Integraciones cruzadas RRHH (Prioridad: BAJA)
- Triggers: alta empleado → draft SILTRA
- Triggers: nuevo contrato → draft Contrat@
- Triggers: cierre nómina → draft AEAT 111
- Tareas auto-generadas por submissions pendientes

---

## 9. Riesgos y Dependencias

### Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Complejidad de FSM de estados | Bugs en transiciones | Tests unitarios por transición |
| Volumen de evidencias en storage | Costes y rendimiento | Limpieza periódica, compresión |
| Dependencia de formatos oficiales | Cambios en normativa rompen generadores | Versionado de adaptadores |
| Over-engineering de adaptadores | Scope creep | Cada adaptador solo: validate + generateFile |

### Dependencias

| Dependencia | Módulo | Estado |
|-------------|--------|--------|
| `hr_es_official_submissions` | Localización ES | ✅ Existe |
| `erp_hr_employee_documents` | Expediente doc | ✅ Existe |
| `erp_hr_workflow_instances` | Workflows | ✅ Existe |
| `hr_tasks` | Tareas RRHH | ✅ Existe |
| V2-ES.3 (expediente operativo) | Doc enrichment | ⚠️ Recomendado antes |
| V2-ES.2 (workflows) | Auto-triggers | ⚠️ Recomendado antes |

---

## 10. Prioridades Resumen

1. **P1** — Modelo de estados V2 + migraciones
2. **P1** — Evidencias y acuses
3. **P1** — Adaptadores SILTRA, AEAT 111, Contrat@
4. **P2** — Retry engine
5. **P2** — Dashboard y filtros avanzados
6. **P2** — Adaptadores Certific@2, Delt@
7. **P3** — Triggers cruzados RRHH
8. **P3** — Adaptadores futuros (AEAT 190, 345)
