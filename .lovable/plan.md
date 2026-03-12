

# Official Integrations Hub — Diseño Funcional

## Estado Actual

**Ya existe en DB (migración original):**
- `hr_integration_adapters`: conectores por país (adapter_name, system_name, auth_type, status, config)
- `hr_official_submissions`: envíos oficiales (submission_type, payload, file_url, status, attempts, last_error)
- `hr_official_submission_receipts`: acuses (receipt_reference, receipt_document_url, validation_status, validation_errors, official_response)
- RLS habilitado, índices por status y country_code, realtime en submissions

**Ya existe en UI (placeholder):**
- `HROfficialSubmissionsPanel`: solo demo data estática (5 envíos hardcoded)
- Nav: `official-submissions` → apunta al placeholder
- `HRCommandPalette`: comando "Enviar Milena PA"

**No existe:**
- Hook para CRUD real sobre las 3 tablas
- UI funcional: dashboard, formulario de envío, detalle con acuses, logs
- Conectores ES pre-configurados (SILTRA, RED, Contrat@, etc.)
- Relación explícita con empleado/contrato/nómina en submissions

---

## 1. Migración SQL — Extender tablas existentes

Añadir campos que faltan en las tablas existentes:

**ALTER `hr_official_submissions`:**
- `employee_id` UUID FK nullable — enlace con empleado
- `contract_id` UUID nullable — enlace con contrato
- `payroll_record_id` UUID nullable — enlace con nómina
- `admin_request_id` UUID nullable — enlace con solicitud administrativa
- `priority` TEXT DEFAULT 'normal' — `low`, `normal`, `high`, `urgent`
- `max_retries` INT DEFAULT 3
- `next_retry_at` TIMESTAMPTZ nullable
- `file_name` TEXT nullable
- `file_size_bytes` INT nullable
- `response_deadline` TIMESTAMPTZ nullable — plazo máximo de respuesta oficial

**ALTER `hr_official_submission_receipts`:**
- `receipt_type` TEXT DEFAULT 'acknowledgement' — `acknowledgement`, `acceptance`, `rejection`, `partial`, `correction_required`
- `receipt_file_name` TEXT nullable
- `receipt_file_size` INT nullable

**Seed: Adaptadores ES predefinidos:**
Insert 7 `hr_integration_adapters` con `country_code = 'ES'`:
- TGSS/Sistema RED (altas, bajas, variaciones afiliación)
- SILTRA (cotizaciones, ficheros FAN/FDI/AFI)
- Contrat@ (comunicación de contratos)
- Certific@2 (certificados de empresa)
- Delt@ (accidentes de trabajo)
- AEAT (modelos 111, 190, certificados retenciones)
- SEPE (prestaciones, ERE/ERTE)

---

## 2. Hook: `useOfficialIntegrationsHub`

Nuevo hook en `src/hooks/erp/hr/useOfficialIntegrationsHub.ts`:

**Adapters:**
- `fetchAdapters(countryCode?)` — listar conectores por país
- `updateAdapterStatus(id, status)` — activar/desactivar

**Submissions:**
- `fetchSubmissions(filters)` — filtros: country, adapter, status, employee, dateRange
- `getSubmission(id)` — detalle completo con receipts
- `createSubmission(data)` — nuevo envío (draft)
- `updateSubmission(id, data)` — editar borrador
- `markAsSent(id)` — marcar como enviado (incrementa attempts, registra submitted_at)
- `markAsAccepted(id, receiptData)` — registrar acuse positivo
- `markAsRejected(id, errors)` — registrar rechazo con errores
- `retrySubmission(id)` — reintentar (incrementa attempts, recalcula next_retry_at)
- `cancelSubmission(id)`
- `deleteSubmission(id)` — solo drafts

**Receipts:**
- `addReceipt(submissionId, data)` — importar acuse/justificante
- `fetchReceipts(submissionId)`

**Stats:**
- `getHubStats(countryCode?)` — KPIs: total, pending, sent, accepted, rejected, retry_pending
- `getAdapterStats()` — submissions por conector

**Submission statuses:** `draft` → `validating` → `ready` → `sent` → `acknowledged` → `accepted` | `rejected` | `correction_required` → `corrected` → `sent` ... Also `cancelled`, `expired`.

---

## 3. Components

Todo bajo `src/components/erp/hr/official-integrations/`:

### 3.1 `OfficialIntegrationsHub` — Panel principal (reemplaza `HROfficialSubmissionsPanel`)
Tabs: Dashboard | Envíos | Conectores | Acuses | Logs

### 3.2 `IntegrationsHubDashboard` — KPIs
- Stats cards: enviados hoy, pendientes, aceptados, rechazados, reintentos
- Gráfico: envíos por conector (últimos 30 días)
- Alertas: envíos con respuesta pendiente pasado plazo, reintentos agotados
- Timeline de actividad reciente

### 3.3 `SubmissionsList` — Listado con filtros
- Filtros: país, conector, estado, empleado, período
- Columnas: ref, tipo, subtipo, conector, empleado, fecha, intentos, estado
- Acciones: ver detalle, reenviar, cancelar

### 3.4 `SubmissionForm` — Crear/editar envío
- Selector de país → filtra conectores disponibles
- Selector de conector → filtra tipos de envío
- Enlace opcional: empleado, contrato, nómina, solicitud administrativa
- Payload / fichero adjunto
- Prioridad
- Notas

### 3.5 `SubmissionDetail` — Vista completa de un envío
- Header: ref, tipo, conector, estado, empleado
- Timeline: creación → validación → envío → acuse → resultado
- Sección acuses/justificantes importados
- Historial de reintentos con errores
- Documentos asociados (payload original + respuestas)

### 3.6 `AdaptersPanel` — Conectores registrados por país
- Agrupados por país (ES, FR, PT, etc.)
- Estado: activo/inactivo/error
- Config visible (solo lectura)
- Última ejecución y resultado
- Botón activar/desactivar

### 3.7 `ReceiptsPanel` — Acuses y justificantes
- Listado global de receipts con filtros por tipo y estado
- Importar acuse (upload o datos manuales)
- Validación: accepted/rejected/correction_required

---

## 4. Integración

| Punto | Cambio |
|---|---|
| `HRModule.tsx` | `official-submissions` → `OfficialIntegrationsHub` (reemplaza placeholder) |
| `HRNavigationMenu` | Ampliar grupo "Integraciones Oficiales" con items: Hub, Envíos, Conectores, Acuses |
| `HRAdminPortal` | Desde solicitudes tipo contrato/baja → crear submission draft automático |
| `ESPayrollBridge` | Desde reporting → crear submission para modelo 111/190 |
| `ESSocialSecurityPanel` | Desde CRA/RED → crear submission para SILTRA/RED |
| Barrel exports | `src/components/erp/hr/official-integrations/index.ts` |

---

## 5. Implementation Order

| Phase | Content |
|---|---|
| **OH1** | Migration: ALTER tables + seed 7 ES adapters |
| **OH2** | `useOfficialIntegrationsHub` hook |
| **OH3** | `OfficialIntegrationsHub` + `IntegrationsHubDashboard` + `SubmissionsList` |
| **OH4** | `SubmissionForm` + `SubmissionDetail` + `ReceiptsPanel` |
| **OH5** | `AdaptersPanel` + integration with HRModule/nav |

