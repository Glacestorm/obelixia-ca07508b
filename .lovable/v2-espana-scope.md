# V2 OPERATIVA ESPAÑA — Diseño de Alcance

**Base:** MVP RRHH v1.0 (baseline congelado, 2026-03-12)  
**Objetivo:** Convertir el MVP demo-ready en una versión operativa para administración laboral española real  
**Principio:** Evolución aditiva — NO romper baseline, NO rehacer módulos  

---

## 1. ALCANCE FUNCIONAL

### Bloque A — Nómina España Avanzada
**Items MVP afectados:** `payroll-engine`, `es-localization` (tab Nómina ES), `leave-incidents`

| Feature | Descripción | Aprovecha MVP |
|---|---|---|
| A1. Incidencias → Nómina | Vincular IT/AT/EP/maternidad a líneas de nómina automáticamente (complemento empresa, prestación SS) | `leave-incidents` + `hr_payroll_record_lines` existentes |
| A2. Retribución flexible | Plan retribución flexible (guardería, transporte, formación, seguro) con impacto IRPF | `erp_hr_social_benefits` + `benefits` panel |
| A3. Revisión y diferencias | Comparativa entre nóminas (mes a mes), detección de variaciones anómalas, flag de revisión | `payroll-engine` (records + lines) |
| A4. Casuísticas avanzadas | Horas extra, complementos variables, plus nocturnidad, plus festivos, dietas | `hr_payroll_record_lines` (nuevos conceptos) |
| A5. Simulador mejorado | Simular impacto de cambio salarial, cambio jornada, IT larga duración | `ESPayrollBridge` existente |

### Bloque B — Seguridad Social e IRPF
**Items MVP afectados:** `ss`, `es-localization` (tabs Datos, SS, IRPF)

| Feature | Descripción | Aprovecha MVP |
|---|---|---|
| B1. Panel SS mejorado | Bases de cotización reales por empleado (no solo simulador), histórico mensual | `hr_es_ss_bases` seed + `ESSocialSecurityPanel` |
| B2. Datos laborales completos | NAF, grupo cotización, epígrafe CNAE, tipo contrato RD vinculado, antigüedad real | `hr_es_employee_labor_data` (ampliar campos) |
| B3. Trazabilidad IRPF | Registro mensual de retención aplicada, regularización semestral, modelo 190 | `hr_es_irpf_tables` + nuevo `hr_es_irpf_monthly` |
| B4. Certificado empresa | Generación de datos para certificado de empresa (últimos 180 días cotizados) | `ESSettlementCalculator` existente |

### Bloque C — Portal Administrativo Avanzado
**Items MVP afectados:** `admin-requests`, `hr-tasks`

| Feature | Descripción | Aprovecha MVP |
|---|---|---|
| C1. Circuitos completos | Cada tipo de solicitud con su flujo de estados específico (no genérico) | `hr_admin_requests` (ampliar `status` y `metadata`) |
| C2. Validaciones por tipo | Reglas de validación específicas (ej: IT requiere parte médico, excedencia requiere antigüedad mínima) | `HRAdminPortal` forms |
| C3. Trazabilidad documental | Vincular documentos a solicitudes (adjuntos, partes, resoluciones) | `hr_admin_requests` + `erp_hr_employee_documents` |
| C4. Generación automática de tareas | Cada estado de solicitud genera tareas específicas con asignación y SLA | `hr_tasks` existentes |

### Bloque D — Workflows y Aprobaciones
**Items MVP afectados:** `approval-inbox`, `hr-tasks`

| Feature | Descripción | Aprovecha MVP |
|---|---|---|
| D1. Aprobación multi-etapa real | Encadenar aprobaciones (mánager → RRHH → dirección) con paso real de estado | `erp_hr_workflow_instances` + `workflow_steps` |
| D2. SLA con escalado | SLA por paso, notificación pre-vencimiento, escalado automático al superior | `erp_hr_workflow_sla_tracking` existente |
| D3. Delegaciones temporales | Delegar aprobaciones por vacaciones/ausencia con fecha inicio/fin | `erp_hr_workflow_delegations` existente |
| D4. Tareas vinculadas | Cada paso de workflow genera/cierra tareas automáticamente | `hr_tasks` + workflows |

### Bloque E — Expediente Documental
**Items MVP afectados:** `document-expedient`, `documents`

| Feature | Descripción | Aprovecha MVP |
|---|---|---|
| E1. Clasificación mejorada | Subcategorías por tipo (contrato, anexo, nómina firmada, certificado, parte IT) | `erp_hr_employee_documents` (campo `category`) |
| E2. Vinculación cruzada | Relacionar documento con solicitud, nómina o contrato de origen | Nuevo campo `source_entity_type` + `source_entity_id` |
| E3. Versionado | Control de versiones de documentos (ej: contrato original → anexo 1 → anexo 2) | `DocumentExpedientModule` |
| E4. Firma/acuse | Estado de firma o acuse de recibo por parte del empleado | Nuevo campo `signature_status` |

### Bloque F — Envíos Oficiales
**Items MVP afectados:** `official-submissions`

| Feature | Descripción | Aprovecha MVP |
|---|---|---|
| F1. Preparación de ficheros | Generar estructura de fichero para SILTRA (AFI, FDI, FAN), Contrat@, Delt@ | `hr_integration_adapters` (7 adaptadores seed) |
| F2. Validación pre-envío | Comprobar datos obligatorios antes de marcar como ready-to-submit | `OfficialIntegrationsHub` |
| F3. Panel de estado mejorado | Timeline detallada por envío: preparado → validado → enviado → acusado → error | `hr_official_submissions` + `receipts` |
| F4. Histórico por organismo | Vista filtrada por adaptador (TGSS, AEAT, SEPE) con estadísticas | `AdaptersPanel` existente |

---

## 2. SUBFASES RECOMENDADAS

### Subfase V2-ES.1 — Nómina + SS operativa (Bloques A + B)
**Prioridad: CRÍTICA** — Sin esto no hay operativa real  
**Dependencias: Ninguna** — Se construye sobre MVP existente  
**Estimación: Alta complejidad**

Entregables:
- A1 (incidencias → nómina) + A4 (conceptos avanzados)
- B1 (panel SS real) + B2 (datos laborales completos)
- B3 (trazabilidad IRPF mensual)
- A5 (simulador mejorado)

### Subfase V2-ES.2 — Portal + Workflows (Bloques C + D)
**Prioridad: ALTA** — Habilita gestión administrativa real  
**Dependencias: Ninguna** — Independiente de V2-ES.1  
**Estimación: Media complejidad**

Entregables:
- C1 (circuitos completos) + C2 (validaciones)
- D1 (aprobación multi-etapa real) + D2 (SLA + escalado)
- C4 + D4 (generación automática de tareas)
- C3 (trazabilidad documental solicitudes)

### Subfase V2-ES.3 — Expediente + Envíos (Bloques E + F)
**Prioridad: MEDIA** — Mejora calidad pero no bloquea operativa  
**Dependencias: V2-ES.2** (vincular documentos a solicitudes)  
**Estimación: Media complejidad**

Entregables:
- E1 (clasificación mejorada) + E2 (vinculación cruzada)
- F1 (preparación ficheros) + F2 (validación pre-envío)
- F3 (timeline envíos) + F4 (histórico por organismo)
- E3 (versionado) + E4 (firma/acuse)

### Subfase V2-ES.4 — Retribución flexible + Diferencias (Bloque A restante)
**Prioridad: MEDIA** — Valor añadido, no bloquea  
**Dependencias: V2-ES.1** (requiere nómina avanzada)  
**Estimación: Media complejidad**

Entregables:
- A2 (retribución flexible)
- A3 (revisión y diferencias)
- B4 (certificado empresa)

---

## 3. MAPA DE DEPENDENCIAS

```
V2-ES.1 (Nómina + SS)  ──────────────→  V2-ES.4 (Retrib. flexible)
         ↓ (datos empleado completos)
V2-ES.2 (Portal + Workflows)  ───────→  V2-ES.3 (Expediente + Envíos)
```

V2-ES.1 y V2-ES.2 son **independientes entre sí** → se pueden ejecutar en paralelo.

---

## 4. QUÉ SE APROVECHA DEL MVP

| Componente MVP | Uso en V2 |
|---|---|
| `hr_payroll_record_lines` | Se amplían con nuevos conceptos (A1, A4) |
| `hr_es_ss_bases` + seed | Base para cotización real por empleado (B1) |
| `hr_es_irpf_tables` + seed | Base para trazabilidad mensual (B3) |
| `hr_es_employee_labor_data` | Se amplía con campos (B2) |
| `ESPayrollBridge` | Se extiende con más conceptos (A1, A4, A5) |
| `ESSocialSecurityPanel` | Se mejora con datos reales (B1) |
| `hr_admin_requests` + `hr_tasks` | Se enriquecen con circuitos y validaciones (C1-C4) |
| `erp_hr_workflow_*` (6 tablas) | Se activan features existentes (D1-D4) |
| `erp_hr_employee_documents` (108 docs) | Se amplían con clasificación y vinculación (E1-E2) |
| `hr_official_submissions` + `hr_integration_adapters` | Se mejoran con validación y timeline (F1-F4) |
| `HRAdminPortal` (7 componentes) | Se extienden los forms con validaciones (C2) |
| `OfficialIntegrationsHub` (4 tabs) | Se mejoran las 4 tabs existentes (F1-F4) |

---

## 5. GAPS QUE CUBRE V2

| Gap del MVP | Bloque V2 que lo cubre |
|---|---|
| Nómina solo muestra líneas estáticas sin cálculo real ES | A1 + A4 |
| SS es un simulador, no datos reales por empleado | B1 |
| IRPF no tiene registro mensual de retenciones | B3 |
| Solicitudes tienen estados genéricos | C1 |
| No hay validación por tipo de solicitud | C2 |
| Documentos no están vinculados a solicitudes/nóminas | E2 |
| Aprobaciones no encadenan pasos reales | D1 |
| Envíos oficiales no generan ficheros reales | F1 |
| No hay control de diferencias entre nóminas | A3 |
| No hay retribución flexible | A2 |

---

## 6. REGLAS DE EVOLUCIÓN

1. **NO modificar** `mvpItems` — V2 no añade items al menú
2. **NO crear** nuevas rutas — V2 mejora paneles existentes
3. **Migraciones aditivas** — ALTER TABLE ADD COLUMN, nunca DROP
4. **Nuevas tablas** solo si es imprescindible (ej: `hr_es_irpf_monthly`)
5. **Hooks existentes** se extienden, no se reescriben
6. **Edge functions** se amplían con nuevas `action`, no se crean nuevas
7. **Componentes** se pueden añadir sub-componentes, no reemplazar

---

*Documento generado: 2026-03-12*  
*Base: MVP v1.0 baseline congelado*
