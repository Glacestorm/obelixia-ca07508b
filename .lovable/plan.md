

# Modelo de Datos Global — HR Enterprise Platform

## Estado Actual del Esquema

Ya existen ~80+ tablas `erp_hr_*` organizadas en fases. Las tablas clave existentes que se reutilizan:

| Tabla existente | Capa | Rol |
|---|---|---|
| `erp_hr_employees` | Core | Ficha maestra (ya tiene `country_code`, `legal_entity_id`, `work_center_id`) |
| `erp_hr_departments` | Core | Departamentos jerárquicos |
| `erp_hr_positions` | Core | Puestos y organigrama |
| `erp_hr_contracts` | Core | Contratos (tiene `cno_code`, `collective_agreement_id`) |
| `erp_hr_payrolls` | Payroll | Nóminas generadas (hardcoded ES: IRPF, SS) |
| `erp_hr_payroll_concepts` | Payroll | Conceptos salariales (hardcoded: devengo/deducción ES) |
| `erp_hr_ss_contributions` | Payroll | Cotizaciones TGSS (100% ES) |
| `erp_hr_legal_entities` | Core | Entidades legales multi-jurisdicción |
| `erp_hr_work_centers` | Core | Centros de trabajo |
| `erp_hr_org_units` | Core | Unidades organizativas |
| `erp_hr_employee_documents` | Core | Documentos por empleado |
| `erp_hr_collective_agreements` | Localización ES | Convenios colectivos |
| `erp_hr_workflow_*` (6 tablas) | Core | Motor de aprobaciones |
| `erp_hr_audit_log` | Core | Auditoría inmutable |
| `hr_country_registry` | Core (G1) | Países habilitados |
| `hr_country_policies` | Core (G1) | Políticas por país/entidad/centro |
| `hr_employee_extensions` | Core (G1) | Campos extendidos por jurisdicción |

---

## Modelo de Datos Propuesto — Tablas Nuevas y Refactorizadas

Organizado por las 6 áreas de separación solicitadas.

---

### 1. DATOS GLOBALES DEL EMPLEADO (Core — country-agnostic)

Tablas existentes se mantienen. Nuevas:

| Tabla | Propósito | Claves |
|---|---|---|
| `hr_employee_profiles` | Datos extendidos del empleado (emergency contacts, education, languages, skills) separados de la ficha operativa | PK: `id`, FK: `employee_id → erp_hr_employees`, `company_id` |
| `hr_job_assignments` | Historial de asignaciones de puesto/departamento/centro/entidad legal. Un empleado puede tener múltiples a lo largo del tiempo | PK: `id`, FK: `employee_id`, `position_id`, `department_id`, `legal_entity_id`, `work_center_id`, `org_unit_id` |
| `hr_leave_incidents` | Incidencias de ausencia (baja médica, maternidad, accidente) con duración, justificación, estado workflow | PK: `id`, FK: `employee_id`, `leave_policy_id → hr_country_policies` |
| `hr_admin_requests` | Solicitudes administrativas genéricas (certificados, cambios datos, permisos especiales) con estado y workflow | PK: `id`, FK: `employee_id`, `assigned_to`, `workflow_instance_id → erp_hr_workflow_instances` |
| `hr_tasks` | Tareas de RRHH asignables (onboarding steps, revisiones documentales, recordatorios) | PK: `id`, FK: `employee_id`, `assigned_to`, `company_id` |

**`erp_hr_employees`** — se mantiene, ya tiene `country_code`, `tax_jurisdiction`, `legal_entity_id`, `work_center_id`. Se añaden:
- `nationality` TEXT
- `secondary_nationality` TEXT
- `tax_residence_country` TEXT (puede diferir de `country_code` para expatriados)

**`hr_employee_extensions`** — ya existe (G1). Almacena campos locales como JSONB por `country_code` (NAF para ES, NSS para FR, NI para UK...).

---

### 2. DATOS LOCALES POR JURISDICCIÓN (Localización — plugin)

| Tabla | Propósito | Claves |
|---|---|---|
| `hr_country_rule_sets` | Conjunto completo de reglas de un país para un año fiscal: tramos fiscales, bases SS, tipos cotización, como JSONB versionado | PK: `id`, FK: `country_code`, `company_id`. UK: `(country_code, fiscal_year, rule_type)` |
| `hr_localization_configs` | Configuración operativa por país: formatos de nómina, plantillas legales activas, reglas de redondeo, calendario base | PK: `id`, FK: `country_code`, `company_id` |
| `hr_document_templates` | Plantillas documentales por país y tipo (nómina, contrato, certificado empresa, carta despido) con versionado | PK: `id`, FK: `country_code`, `company_id` |

**`hr_country_registry`** — ya existe (G1). Países habilitados con moneda, idioma, formato NIF.

**`hr_country_policies`** — ya existe (G1). Motor de políticas con resolución jerárquica (país > entidad > centro).

**`erp_hr_collective_agreements`** — ya existe. Se mantiene en localización ES pero se vincula a `country_code = 'ES'`.

**Relación clave**: `hr_country_rule_sets.country_code` + `fiscal_year` determina qué reglas fiscales y de SS aplican. El motor de nómina consulta esta tabla en vez de tener tramos hardcoded.

---

### 3. DATOS DE PAYROLL (Motor genérico + resultados)

| Tabla | Propósito | Claves |
|---|---|---|
| `hr_payroll_periods` | Períodos de nómina por entidad legal (mensual, quincenal, semanal) con estado de cierre | PK: `id`, FK: `company_id`, `legal_entity_id`. UK: `(legal_entity_id, period_type, start_date)` |
| `hr_payroll_records` | Resultado de nómina individual calculada. Reemplaza gradualmente `erp_hr_payrolls` con estructura multi-país | PK: `id`, FK: `employee_id`, `payroll_period_id`, `country_rule_set_id` |
| `hr_payroll_record_lines` | Líneas de detalle de cada nómina: concepto, base, importe, tipo (devengo/deducción/empresa) | PK: `id`, FK: `payroll_record_id`, `concept_id` |
| `hr_payroll_variables` | Variables de nómina por empleado y período (horas extra, plus transporte, incentivos, incapacidades) | PK: `id`, FK: `employee_id`, `payroll_period_id` |
| `hr_social_security_events` | Eventos de SS: altas, bajas, variaciones, IT/AT, maternidad. Genérico (el tipo de evento varía por país) | PK: `id`, FK: `employee_id`, `country_code` |
| `hr_tax_events` | Eventos fiscales: cambios retención, regularizaciones, certificados retenciones. Genérico por país | PK: `id`, FK: `employee_id`, `country_code`, `fiscal_year` |

**`erp_hr_payrolls`** — se mantiene como legacy ES. Las nuevas nóminas multi-país usan `hr_payroll_records` + `hr_payroll_record_lines`.

**`erp_hr_payroll_concepts`** — se mantiene. Se añade `country_code` para vincular conceptos a país (hoy todos son implícitamente ES).

---

### 4. DATOS DE MOVILIDAD INTERNACIONAL (Global Mobility)

| Tabla | Propósito | Claves |
|---|---|---|
| `hr_mobility_assignments` | Asignaciones internacionales: home/host country, tipo (short-term, long-term, commuter, permanent transfer), fechas, estado | PK: `id`, FK: `employee_id`, `home_entity_id → erp_hr_legal_entities`, `host_entity_id` |
| `hr_expatriate_packages` | Paquetes de compensación del expatriado: allowances (housing, COLA, hardship, education), moneda, tax gross-up | PK: `id`, FK: `assignment_id` |
| `hr_immigration_documents` | Documentos migratorios: visados, permisos trabajo, residence permits. Con fechas expiración y alertas | PK: `id`, FK: `employee_id`, `assignment_id` |
| `hr_tax_equalization` | Cálculos de ecualización fiscal: hypothetical tax, actual tax home/host, settlement | PK: `id`, FK: `assignment_id`, `payroll_period_id` |
| `hr_split_payroll_config` | Configuración de nómina dividida: porcentaje home/host, conceptos a dividir | PK: `id`, FK: `assignment_id` |

---

### 5. DATOS DE COMPLIANCE (Evidencias + auditoría)

| Tabla | Propósito | Claves |
|---|---|---|
| `hr_compliance_evidence` | Evidencias documentales de cumplimiento: certificados formación PRL, reconocimientos médicos, consentimientos GDPR, con vencimiento | PK: `id`, FK: `employee_id`, `requirement_id`, `document_id → erp_hr_employee_documents` |
| `hr_compliance_requirements` | Requisitos de cumplimiento por país/sector: formación obligatoria, renovaciones, plazos legales | PK: `id`, FK: `country_code`, `company_id` |

**`erp_hr_audit_log`** — ya existe con triggers inmutables. Se mantiene sin cambios.

**`erp_hr_compliance_*`** (varias tablas de fase 5) — ya existen. Se reutilizan añadiendo `country_code` donde falte.

---

### 6. DATOS DE INTEGRACIONES OFICIALES

| Tabla | Propósito | Claves |
|---|---|---|
| `hr_official_submissions` | Envíos a organismos oficiales: SILTRA, AEAT mod.111, Contrat@, Milena PA. Estado, payload, intentos | PK: `id`, FK: `company_id`, `legal_entity_id`, `country_code` |
| `hr_official_submission_receipts` | Acuses de recibo de envíos oficiales: referencia, fecha, documento PDF, estado validación | PK: `id`, FK: `submission_id` |
| `hr_integration_adapters` | Registro de adaptadores de integración disponibles por país: nombre, tipo, endpoint, estado, última ejecución | PK: `id`, FK: `country_code`, `company_id` |

---

## Diagrama de Relaciones Principal

```text
hr_country_registry (países)
  │
  ├──> hr_country_policies (reglas por país/entidad/centro)
  ├──> hr_country_rule_sets (reglas fiscales/SS por año)
  ├──> hr_localization_configs (config operativa)
  └──> hr_document_templates (plantillas por país)

erp_hr_legal_entities ←── erp_hr_employees ──→ hr_employee_extensions
  │                           │                    (campos locales)
  │                           │
  │                    ┌──────┼──────────────┐
  │                    │      │              │
  │              hr_job_    hr_leave_    hr_employee_
  │              assignments incidents    profiles
  │
  ├──> erp_hr_work_centers
  └──> erp_hr_org_units

erp_hr_employees
  │
  ├──> hr_payroll_records ──→ hr_payroll_record_lines
  │       │                       └──→ erp_hr_payroll_concepts
  │       └──→ hr_payroll_periods
  │
  ├──> hr_social_security_events
  ├──> hr_tax_events
  ├──> hr_payroll_variables
  │
  ├──> hr_mobility_assignments
  │       ├──→ hr_expatriate_packages
  │       ├──→ hr_immigration_documents
  │       ├──→ hr_tax_equalization
  │       └──→ hr_split_payroll_config
  │
  ├──> hr_compliance_evidence ──→ hr_compliance_requirements
  │
  ├──> hr_admin_requests ──→ erp_hr_workflow_instances
  └──> hr_tasks

hr_official_submissions ──→ hr_official_submission_receipts
  └──→ hr_integration_adapters
```

---

## Clasificación de Tablas

### Maestras (configuración, raramente cambian)
- `hr_country_registry`, `hr_country_policies`, `hr_country_rule_sets`
- `hr_localization_configs`, `hr_document_templates`
- `hr_compliance_requirements`, `hr_integration_adapters`
- `erp_hr_legal_entities`, `erp_hr_work_centers`, `erp_hr_positions`
- `erp_hr_payroll_concepts`, `erp_hr_collective_agreements`

### Transaccionales (operaciones diarias)
- `hr_payroll_records`, `hr_payroll_record_lines`, `hr_payroll_variables`
- `hr_social_security_events`, `hr_tax_events`
- `hr_leave_incidents`, `hr_admin_requests`, `hr_tasks`
- `hr_official_submissions`, `hr_official_submission_receipts`
- `hr_compliance_evidence`

### Lifecycle/históricas
- `hr_job_assignments`, `hr_mobility_assignments`
- `hr_expatriate_packages`, `hr_immigration_documents`
- `hr_tax_equalization`
- `erp_hr_audit_log`

---

## Resumen Cuantitativo

| Área | Tablas existentes reutilizadas | Tablas nuevas | Total |
|---|---|---|---|
| Core Global | ~15 (employees, departments, positions, workflows, audit...) | 4 (profiles, job_assignments, admin_requests, tasks) | 19 |
| Localización | 4 (country_registry, country_policies, extensions, collective_agreements) | 3 (rule_sets, localization_configs, document_templates) | 7 |
| Payroll | 3 (payrolls, payroll_concepts, ss_contributions) | 6 (periods, records, record_lines, variables, ss_events, tax_events) | 9 |
| Mobility | 0 | 5 (assignments, packages, immigration, tax_eq, split_payroll) | 5 |
| Compliance | ~6 (compliance framework existente) | 2 (evidence, requirements) | 8 |
| Integraciones | 1 (integration_credentials) | 3 (submissions, receipts, adapters) | 4 |
| **Total** | **~29** | **23** | **52** |

---

## Principios Aplicados

1. **No se duplica**: las tablas existentes se amplían con `country_code` donde falta, no se recrean
2. **FK a `erp_hr_employees`**: todas las tablas transaccionales referencian al empleado
3. **`company_id` + `legal_entity_id`**: scope multi-tenant y multi-entidad legal en toda tabla
4. **`country_code`**: presente en toda tabla de localización y payroll para resolución de reglas
5. **JSONB para extensibilidad**: `hr_employee_extensions.local_fields`, `hr_country_rule_sets.rules_data` — permite que cada país defina sus campos sin alterar esquema
6. **Versionado**: `hr_country_rule_sets` tiene `fiscal_year` + `version` para mantener histórico de reglas
7. **Workflow-ready**: `hr_admin_requests` y `hr_leave_incidents` vinculan a `erp_hr_workflow_instances`
8. **Audit-ready**: todas con `created_at`, `updated_at`, y las sensibles conectadas a `erp_hr_audit_log` via triggers

---

## Siguiente Paso

Aprobar este modelo para generar las migraciones SQL de las 23 tablas nuevas + las ALTER de las existentes, organizadas por capa.

