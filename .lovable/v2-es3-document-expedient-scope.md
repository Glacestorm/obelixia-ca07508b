# V2-ES.3 — Expediente Documental Operativo

**Base:** MVP v1.0 baseline congelado  
**Objetivo:** Expediente documental con valor operativo real para administración laboral  
**Principio:** Evolución aditiva — NO romper baseline  

---

## 1. ESTADO ACTUAL

### Componentes existentes
- `DocumentExpedientModule` — 5 tabs: Empleado, Nómina, Consentimientos*, Retención*, Auditoría* (*solo fullMode)
- `EmployeeDocumentExpedient` — Vista por categoría (accordion 8 cats), stats, filtros, búsqueda, detalle
- `PayrollDocumentExpedient` — Vista simple de docs categoría `payroll`
- `DocumentDetailPanel` — Sheet slide-over con 4 tabs: Info, Versiones, Comentarios, Acceso
- `ConsentsPanel`, `RetentionPoliciesPanel`, `DocumentAuditPanel` — Solo en fullMode

### Hook `useHRDocumentExpedient`
- ✅ CRUD documentos con `uploadDocument`, `updateDocument`, `deleteDocument`
- ✅ Versionado: `fetchVersions`, `createVersion`
- ✅ Comentarios: `fetchComments`, `addComment`
- ✅ Access log: `fetchAccessLog`, `logAccess`
- ✅ Integridad: `verifyIntegrity`
- ✅ Consentimientos: CRUD completo
- ✅ Retención: CRUD completo
- ✅ Stats: `getExpedientStats` (total, byCategory, expiringSoon, unverified, consents)
- ✅ `fetchDocumentsByEmployee`

### Datos seed
- 108 documentos en 5 categorías (personal, laboral, nómina, médico, mobility)

### Gaps
- ❌ No hay vista por solicitud administrativa
- ❌ No hay estados documentales (borrador, pendiente firma, firmado, archivado)
- ❌ No hay vinculación cruzada con solicitudes, contratos o nóminas
- ❌ No hay alertas documentales (documentos obligatorios pendientes, vencidos)
- ❌ No hay subcategorías visibles en UI (campo existe pero no se explota)
- ❌ PayrollDocumentExpedient es muy simple (solo lista filtrada)
- ❌ Filtros limitados (solo categoría + búsqueda texto)
- ❌ No se muestra el empleado al que pertenece cada documento en vista global

---

## 2. MEJORAS FUNCIONALES

### 2.1 Estados documentales

Nuevo ciclo de vida del documento:

```
draft → pending_review → reviewed → pending_signature → signed → archived
                                                      → rejected
```

| Estado | Significado | Quién actúa |
|---|---|---|
| `draft` | Documento subido/generado, pendiente de revisión | Sistema/Empleado |
| `pending_review` | En cola de revisión RRHH | RRHH |
| `reviewed` | Revisado y conforme | RRHH |
| `pending_signature` | Requiere firma del empleado o empresa | Empleado/Legal |
| `signed` | Firmado por todas las partes | — |
| `archived` | Archivado (retención) | Sistema |
| `rejected` | Rechazado en revisión | RRHH |

### 2.2 Vinculación cruzada

| Campo nuevo en documento | Descripción |
|---|---|
| `source_entity_type` | Tipo de entidad origen: `admin_request`, `payroll_record`, `contract`, `workflow`, `manual` |
| `source_entity_id` | ID de la entidad origen |
| `document_status` | Estado documental (draft → archived) |
| `requires_signature` | Boolean — requiere firma |
| `signed_at` | Timestamp de firma |
| `signed_by` | UUID firmante |
| `review_notes` | Notas de revisión RRHH |
| `reviewed_at` | Timestamp revisión |
| `reviewed_by` | UUID revisor |

### 2.3 Subcategorías operativas

| Categoría | Subcategorías nuevas |
|---|---|
| `personal` | dni, nie, pasaporte, foto, domicilio, cuenta_bancaria |
| `contract` | contrato_inicial, anexo, prorroga, novacion |
| `payroll` | nomina_mensual, nomina_extra, tc1, tc2, certificado_retenciones, modelo_190 |
| `compliance` | evaluacion_riesgos, reconocimiento_medico, formacion_prl |
| `medical` | parte_it, parte_alta, parte_at, informe_medico |
| `legal` | finiquito, carta_despido, certificado_empresa, acuerdo |
| `training` | diploma, certificado_formacion, plan_formacion |
| `mobility` | carta_asignacion, permiso_trabajo, visado |

### 2.4 Alertas documentales

| Alerta | Condición | Severidad |
|---|---|---|
| Documento vencido | `expiry_date < now()` | 🔴 Crítica |
| Vence en 30 días | `expiry_date < now() + 30d` | 🟡 Warning |
| Pendiente revisión > 48h | `status = pending_review` AND `created_at < now() - 48h` | 🟡 Warning |
| Pendiente firma > 7 días | `status = pending_signature` AND `updated_at < now() - 7d` | 🟡 Warning |
| Documento obligatorio faltante | Empleado activo sin DNI/contrato/nómina | 🔴 Crítica |
| Integridad no verificada | `integrity_verified = false` AND `created_at < now() - 24h` | ℹ️ Info |

---

## 3. MEJORAS UX/UI

### 3.1 DocumentExpedientModule — Mejoras

| ID | Mejora | Detalle |
|---|---|---|
| UI1 | **Nuevo tab "Por Solicitud"** | Documentos agrupados por solicitud administrativa de origen |
| UI2 | **Nuevo tab "Alertas"** | Dashboard de documentos vencidos, pendientes, obligatorios faltantes |
| UI3 | Activar tabs Consentimientos + Retención + Auditoría en MVP | `mvpMode` → mostrar todos los tabs |

### 3.2 EmployeeDocumentExpedient — Mejoras

| ID | Mejora | Detalle |
|---|---|---|
| UI4 | **Columna "Estado"** en cada documento | Badge con color: draft/pendiente/firmado/archivado |
| UI5 | **Filtro por estado** | Dropdown adicional: "Todos / Borrador / Pendiente firma / Firmados / Archivados" |
| UI6 | **Filtro por subcategoría** | Segundo dropdown que se adapta a la categoría seleccionada |
| UI7 | **Nombre empleado** visible en vista global (sin filtro employeeId) | Mostrar "Ana García — DNI" en vez de solo "DNI" |
| UI8 | **Indicador de origen** | Badge pequeño: "Solicitud ADM-20260115-00001" / "Nómina Ene-2026" / "Manual" |
| UI9 | **Botón "Documentos obligatorios"** | Modal que muestra checklist de docs requeridos por empleado activo |

### 3.3 PayrollDocumentExpedient — Mejoras

| ID | Mejora | Detalle |
|---|---|---|
| UI10 | **Agrupar por período** | Accordion: "Enero 2026" → [Nóminas, TC1, TC2] |
| UI11 | **Filtro por período** | Selector de período (de `hr_payroll_periods`) |
| UI12 | **Badge de estado documental** | draft / signed / archived |
| UI13 | **Link a payroll record** | Click en nómina → ir al record en motor de nómina |

### 3.4 DocumentDetailPanel — Mejoras

| ID | Mejora | Detalle |
|---|---|---|
| UI14 | **Sección "Origen"** en tab Info | Mostrar entidad de origen con link (solicitud, nómina, contrato) |
| UI15 | **Sección "Estado"** con acciones | Botones: "Marcar revisado" / "Solicitar firma" / "Archivar" |
| UI16 | **Timeline integrado** | Combinar versiones + comentarios + accesos + cambios de estado en una sola timeline cronológica |
| UI17 | **Notas de revisión** | Campo de texto para notas de revisión RRHH |

### 3.5 Nuevo componente: RequestDocumentsPanel

| ID | Mejora | Detalle |
|---|---|---|
| UI18 | **Vista por solicitud** | Lista de solicitudes admin → drill-down → documentos vinculados |
| UI19 | **Checklist obligatorios** | Para cada solicitud: docs requeridos vs adjuntados (✅/❌) |
| UI20 | **Adjuntar desde solicitud** | Botón que crea documento vinculado con `source_entity_type=admin_request` |

---

## 4. DEPENDENCIAS TÉCNICAS

### 4.1 Migraciones

| ID | Tabla | Cambio |
|---|---|---|
| D1 | `erp_hr_employee_documents` | ADD COLUMN `document_status text DEFAULT 'draft'` |
| D2 | `erp_hr_employee_documents` | ADD COLUMN `source_entity_type text NULL` |
| D3 | `erp_hr_employee_documents` | ADD COLUMN `source_entity_id uuid NULL` |
| D4 | `erp_hr_employee_documents` | ADD COLUMN `requires_signature boolean DEFAULT false` |
| D5 | `erp_hr_employee_documents` | ADD COLUMN `signed_at timestamptz NULL` |
| D6 | `erp_hr_employee_documents` | ADD COLUMN `signed_by uuid NULL` |
| D7 | `erp_hr_employee_documents` | ADD COLUMN `review_notes text NULL` |
| D8 | `erp_hr_employee_documents` | ADD COLUMN `reviewed_at timestamptz NULL` |
| D9 | `erp_hr_employee_documents` | ADD COLUMN `reviewed_by uuid NULL` |
| D10 | Nueva tabla `hr_required_document_templates` | Plantilla de docs obligatorios |

### Tabla `hr_required_document_templates`
```sql
CREATE TABLE hr_required_document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  context_type text NOT NULL DEFAULT 'employee',  -- 'employee' | 'request_type'
  context_value text NULL,                        -- request_type value or NULL for all employees
  document_name text NOT NULL,
  category text NOT NULL DEFAULT 'personal',
  subcategory text NULL,
  is_mandatory boolean DEFAULT true,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### 4.2 Seed requerido

| Datos | Cantidad |
|---|---|
| Plantillas docs obligatorios por empleado | ~8 (DNI, contrato, alta SS, nómina mes 1, reconocimiento médico, PRL, LOPD, foto) |
| Plantillas docs obligatorios por tipo solicitud | ~15 (parte IT para sick_leave, contrato para employee_registration, etc.) |
| UPDATE docs existentes con `document_status='signed'` | 108 docs seed |
| UPDATE docs existentes con subcategorías | 108 docs seed |

### 4.3 Dependencias con otras subfases

| Dependencia | Detalle |
|---|---|
| V2-ES.2 (Workflows) | Para vincular `source_entity_type=admin_request` — **recomendado pero no bloqueante** |
| V2-ES.1 (Nómina) | Para vincular `source_entity_type=payroll_record` — **recomendado pero no bloqueante** |

V2-ES.3 es **ejecutable de forma independiente** — los campos de vinculación funcionan pero se llenan cuando las otras subfases se completen.

---

## 5. HOOK — MEJORAS

| ID | Función | Tipo |
|---|---|---|
| HK1 | `updateDocumentStatus(docId, status, notes?)` | Nueva |
| HK2 | `getDocumentsByRequest(requestId)` | Nueva |
| HK3 | `getDocumentsByPayrollPeriod(periodId)` | Nueva |
| HK4 | `getDocumentsByContract(contractId)` | Nueva |
| HK5 | `getRequiredDocuments(contextType, contextValue?)` | Nueva |
| HK6 | `checkMandatoryDocuments(employeeId)` | Nueva — retorna checklist ✅/❌ |
| HK7 | `getDocumentAlerts()` | Nueva — retorna alertas activas |
| HK8 | `linkDocumentToEntity(docId, entityType, entityId)` | Nueva |
| HK9 | Ampliar `DocumentFilters` con `status`, `subcategory`, `source_entity_type` | Ampliar type |
| HK10 | Ampliar `ExpedientStats` con `pendingReview`, `pendingSignature`, `alerts` | Ampliar type |

---

## 6. PLAN DE IMPLEMENTACIÓN

### Paso 1 — Migraciones (D1-D10)
- ALTER `erp_hr_employee_documents` (D1-D9)
- CREATE `hr_required_document_templates` (D10)
- **No rompe nada** — solo ADD COLUMN con defaults

### Paso 2 — Seed de estados y subcategorías
- UPDATE 108 docs existentes: asignar `document_status`, `subcategory`
- INSERT plantillas obligatorias (empleado + por tipo solicitud)

### Paso 3 — Hook: estados + vinculación (HK1, HK8, HK9)
- `updateDocumentStatus` con registro en access log
- `linkDocumentToEntity` para vincular a solicitudes/nóminas/contratos
- Ampliar filtros con status, subcategory, source_entity_type

### Paso 4 — Hook: consultas cruzadas + alertas (HK2-HK7, HK10)
- Consultas por solicitud, período, contrato
- Checklist de documentos obligatorios
- Sistema de alertas documentales

### Paso 5 — UI: estados y filtros (UI4-UI9)
- Badge de estado en cada documento
- Filtros por estado y subcategoría
- Nombre empleado en vista global
- Indicador de origen
- Modal de documentos obligatorios

### Paso 6 — UI: PayrollDocumentExpedient mejorado (UI10-UI13)
- Accordion por período
- Filtro por período
- Badge estado + link a payroll record

### Paso 7 — UI: Detalle mejorado + nuevo tab solicitudes (UI14-UI20)
- Sección origen con link
- Acciones de estado (revisar, firma, archivar)
- Timeline integrado
- Nuevo tab "Por Solicitud" con checklist obligatorios
- Tab "Alertas" con dashboard

---

## 7. RESUMEN

| Dimensión | Valor |
|---|---|
| Hook modificado | 1 (`useHRDocumentExpedient`) |
| Funciones nuevas | 10 (HK1-HK10) |
| Migraciones | 10 (9 ALTER + 1 CREATE) |
| Componentes UI modificados | 4 (Module, EmployeeExp, PayrollExp, DetailPanel) |
| Componentes UI nuevos | 2 (RequestDocumentsPanel, DocumentAlertsPanel) |
| Items de menú nuevos | 0 |
| Edge functions nuevas | 0 |
| Seed/update | ~108 updates + ~23 inserts plantillas |
| Riesgo sobre baseline | BAJO — todo aditivo |

---

*Documento generado: 2026-03-12*  
*Ejecutable independientemente de V2-ES.1 y V2-ES.2*
