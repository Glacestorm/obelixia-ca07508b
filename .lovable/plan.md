

# Global HR Core — Diseño del Submódulo

## Estado Actual

El módulo HR tiene ~65 paneles con lógica española mezclada en el core. Ya existen tablas clave (`erp_hr_employees`, `erp_hr_contracts`, `erp_hr_departments`, `erp_hr_positions`, `hr_employee_profiles`, `hr_job_assignments`, `hr_leave_incidents`, `hr_admin_requests`, `hr_tasks`) y componentes (`HREmployeesPanel`, `HREmployeeExpedient`, `HRContractsPanel`, `HRDepartmentsPanel`, etc.). El expediente transversal ya tiene 9 tabs. Las tablas G1b ya añadieron `nationality`, `tax_residence_country` y `country_code` al empleado.

**Lo que falta**: un diseño explícito de qué es "Global Core" vs "Localización", refactorizar los componentes existentes para eliminar referencias españolas del core, y completar la ficha global del empleado con ciclo de vida completo.

---

## 1. Campos Globales del Empleado (universales)

Estos campos viven en `erp_hr_employees` + `hr_employee_profiles` y son agnósticos de país:

### `erp_hr_employees` (ya existe — campos globales)
| Campo | Tipo | Propósito |
|---|---|---|
| `first_name`, `last_name` | TEXT | Identidad |
| `email`, `phone` | TEXT | Contacto |
| `date_of_birth`, `gender` | DATE/TEXT | Demografía |
| `nationality`, `secondary_nationality` | TEXT | Nacionalidad |
| `country_code` | TEXT | País de empleo |
| `tax_residence_country` | TEXT | Residencia fiscal |
| `hire_date`, `termination_date` | DATE | Ciclo de vida |
| `status` | TEXT | Estado actual |
| `employee_number` | TEXT | Identificador interno |
| `position_title` | TEXT | Cargo actual |
| `department_id` | FK | Departamento |
| `legal_entity_id` | FK | Entidad legal empleadora |
| `work_center_id` | FK | Centro de trabajo |
| `manager_id` | FK (self) | Manager directo |
| `gross_salary` | NUMERIC | Salario bruto anual (genérico) |
| `avatar_url` | TEXT | Foto |

### `hr_employee_profiles` (ya existe — datos extendidos globales)
| Campo | Tipo | Propósito |
|---|---|---|
| `emergency_contact_*` | TEXT | Contacto emergencia |
| `education_level`, `education_details` | TEXT/JSONB | Formación académica |
| `languages` | JSONB | Idiomas |
| `skills` | JSONB | Competencias |
| `personal_email`, `personal_phone` | TEXT | Contacto personal |
| `address_*` | TEXT | Dirección |
| `marital_status` | TEXT | Estado civil |
| `dependents_count` | INT | Personas a cargo |
| `disability_percentage` | NUMERIC | Discapacidad (universal) |
| `bank_account_iban` | TEXT | Cuenta bancaria |

### Qué NO va en Core (pertenece a Localización)
| Dato | Pertenece a | Razón |
|---|---|---|
| NAF / NSS (nº afiliación SS) | Plugin ES | Específico del sistema SS español |
| Grupo de cotización (1-11) | Plugin ES | Categorías TGSS |
| Tipo de contrato (indefinido, temporal...) | Plugin ES/FR/etc | Cada país define sus tipos |
| IRPF / tramos retención | Plugin ES | Legislación fiscal nacional |
| Comunidad autónoma | Plugin ES | Subdivisión administrativa española |
| Convenio colectivo | Plugin ES | Marco laboral español |
| CNO / CNAE | Plugin ES | Clasificaciones españolas |
| Código contrato RED | Plugin ES | Sistema RED/TGSS |

---

## 2. Estados del Empleado y Ciclo de Vida

### Estados (universales)
```text
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌─────────────┐
│ CANDIDATE │───→│ ONBOARDING│───→│   ACTIVE     │───→│ OFFBOARDING │
└──────────┘    └──────────┘    └──────────────┘    └─────────────┘
                                       │                    │
                                       ▼                    ▼
                                ┌──────────────┐    ┌─────────────┐
                                │TEMPORARY_LEAVE│    │ TERMINATED  │
                                └──────────────┘    └─────────────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │  EXCEDENCIA  │
                                └──────────────┘
```

| Estado | Significado global |
|---|---|
| `candidate` | Pre-alta, en proceso de selección |
| `onboarding` | Alta en curso, documentación pendiente |
| `active` | En plantilla activa |
| `temporary_leave` | Baja temporal (razón varía por país) |
| `excedencia` | Excedencia / leave of absence |
| `offboarding` | Proceso de salida iniciado |
| `terminated` | Baja definitiva |

### Transiciones (requieren workflow)
- `candidate → onboarding`: Aprobación de contratación
- `onboarding → active`: Completar checklist de alta
- `active → temporary_leave`: Registrar incidencia de baja
- `active → offboarding`: Iniciar proceso de salida
- `offboarding → terminated`: Completar finiquito
- `temporary_leave → active`: Reincorporación

---

## 3. Páginas y Componentes — Refactorización

### 3.1 Ficha Global del Empleado (refactorizar `HREmployeeExpedient`)

Se amplía el expediente existente de 9 tabs. Los tabs se reorganizan para separar core de localización:

| Tab | Contenido Core Global | Componente |
|---|---|---|
| **Ficha** | Datos personales, contacto, foto, estado, manager, org | `ExpedientFichaTab` |
| **Trayectoria** | Job assignments históricos, promociones, cambios de puesto | `ExpedientTrayectoriaTab` |
| **Contratos** | Contratos genéricos (fechas, tipo template, jornada) | `ExpedientContratosTab` |
| **Compensación** | Salario bruto, histórico salarial, beneficios globales | `ExpedientCompensacionTab` |
| **Tiempo** | Fichajes, calendario, ausencias genéricas | `ExpedientTiempoTab` |
| **Formación** | Cursos, certificaciones, skills | `ExpedientFormacionTab` |
| **Desempeño** | Evaluaciones, OKRs, feedback | `ExpedientDesempenoTab` |
| **Documentos** | Archivo digital, evidencias | `ExpedientDocumentosTab` |
| **Movilidad** | Asignaciones internacionales | `ExpedientMovilidadTab` |
| **Auditoría** | Timeline de cambios | `ExpedientAuditoriaTab` |

**Tab de Localización** (se añade dinámicamente según `country_code`):
- Si ES: tab "España" con NAF, grupo cotización, convenio, IRPF
- Si FR: tab "France" con NSS, URSSAF, etc.

### 3.2 Listado de Empleados (refactorizar `HREmployeesPanel`)

Cambios al panel existente:
- Añadir filtro por **país** (`country_code`)
- Añadir filtro por **entidad legal** (`legal_entity_id`)
- Añadir columna **país** con bandera
- Eliminar columnas específicas de ES (NSS, grupo cotización) del listado core — moverlas a vista de localización
- Añadir columna **manager** con link al expediente
- Añadir acción "Ver expediente" que navega al `HREmployeeExpedient`

### 3.3 Formulario de Alta (refactorizar `HREmployeeFormDialog`)

**Secciones del formulario global:**
1. Datos personales (nombre, email, teléfono, fecha nacimiento, género, nacionalidad)
2. Datos organizativos (entidad legal, centro trabajo, departamento, puesto, manager)
3. Datos de empleo (fecha alta, tipo jornada, salario bruto)
4. Datos bancarios (IBAN)
5. Contacto emergencia

**Sección dinámica por país** (se carga según `country_code` seleccionado):
- ES: NAF, grupo cotización, tipo contrato RD, convenio, CCAA
- FR: NSS, catégorie socioprofessionnelle
- etc.

### 3.4 Organigrama (ya existe `HROrgStructurePanel`)

Se mantiene sin cambios. Es 100% global (entidades legales → centros → departamentos → personas).

### 3.5 Departamentos y Puestos (ya existen)

`HRDepartmentsPanel` — se mantiene, es global.
`HRJobPositionsPanel` — se mantiene, es global.

Se añade: **`hr_job_assignments`** como historial de movimientos internos visibles desde el expediente.

### 3.6 Onboarding/Offboarding (ya existen)

`HROnboardingPanel` y `HROffboardingPanel` — se mantienen como core global.
El checklist de onboarding puede tener items locales (ej: "Dar de alta en TGSS") que vendrían del plugin de país, pero la mecánica de checklists es global.

### 3.7 Desempeño y Formación (ya existen)

`HRPerformancePanel` y `HRTrainingPanel` — 100% globales, sin cambios necesarios.

### 3.8 Compensación Global

`HRCompensationSuitePanel` — se mantiene. Es la vista global de salario bruto + beneficios.
Los detalles de coste empresa por SS (TGSS, URSSAF, etc.) van en el plugin de país.

### 3.9 Vacaciones y Ausencias Genéricas

`HRVacationsPanel` — se refactoriza para usar políticas genéricas (`hr_country_policies`) en lugar de los 22 días laborables hardcoded de España.

### 3.10 Documentos

`HREmployeeDocumentsPanel` — 100% global. Las plantillas por país vienen de `hr_document_templates`.

### 3.11 Workflows Básicos

`HRWorkflowDesigner` + `HRApprovalInbox` — 100% globales. Los tipos de proceso que disparan workflows pueden variar por país pero el motor es agnóstico.

### 3.12 Auditoría Básica

`HRAuditTrailPanel` — 100% global. Ya funciona con triggers inmutables.

---

## 4. Roles y Permisos (Global Core)

| Permiso | Descripción |
|---|---|
| `hr.employees.read` | Ver listado y ficha |
| `hr.employees.write` | Crear/editar empleados |
| `hr.employees.delete` | Dar de baja |
| `hr.contracts.read/write` | Contratos |
| `hr.payroll.read/write/approve` | Nóminas |
| `hr.leave.read/write/approve` | Ausencias |
| `hr.documents.read/write` | Documentos |
| `hr.org.read/write` | Estructura organizativa |
| `hr.performance.read/write` | Evaluaciones |
| `hr.training.read/write` | Formación |
| `hr.compensation.read/write` | Compensación |
| `hr.workflows.manage` | Gestionar workflows |
| `hr.audit.read` | Ver auditoría |
| `hr.mobility.read/write` | Movilidad internacional |

Los permisos se resuelven con scope: `company_id` + `legal_entity_id` + `department_id`.

---

## 5. Tablas del Core Global (resumen)

### Ya existentes (se mantienen)
- `erp_hr_employees` — ficha maestra
- `erp_hr_departments` — departamentos
- `erp_hr_positions` — puestos
- `erp_hr_contracts` — contratos (se añade `contract_template_id`)
- `erp_hr_leave_requests` — solicitudes de ausencia
- `erp_hr_employee_documents` — documentos
- `erp_hr_workflow_*` — motor de workflows
- `erp_hr_audit_log` — auditoría
- `erp_hr_legal_entities` — entidades legales
- `erp_hr_work_centers` — centros de trabajo
- `erp_hr_org_units` — unidades organizativas
- `erp_hr_performance_*` — evaluaciones
- `erp_hr_training_*` — formación

### Ya creadas en G1b (se mantienen)
- `hr_employee_profiles` — datos extendidos
- `hr_job_assignments` — historial de asignaciones
- `hr_leave_incidents` — incidencias de ausencia
- `hr_admin_requests` — solicitudes admin
- `hr_tasks` — tareas RRHH

### Modificaciones necesarias
- `erp_hr_employees`: añadir `manager_id UUID REFERENCES erp_hr_employees(id)` si no existe
- `erp_hr_contracts`: añadir `contract_template_id UUID` para vincular a plantillas por país
- `erp_hr_leave_requests`: añadir `leave_policy_id UUID` para vincular a política genérica

---

## 6. Plan de Implementación

| Tarea | Detalle |
|---|---|
| **C1** | Añadir `manager_id` a `erp_hr_employees` + `contract_template_id` a contratos + `leave_policy_id` a leave requests (migración) |
| **C2** | Refactorizar `HREmployeeExpedient` — dividir en 10 tab-components independientes, añadir tab dinámico por país |
| **C3** | Refactorizar `HREmployeesPanel` — añadir filtros por país/entidad legal, columna manager, eliminar campos ES del core |
| **C4** | Refactorizar `HREmployeeFormDialog` — sección dinámica por país, separar campos globales de locales |
| **C5** | Refactorizar `HRVacationsPanel` — usar `hr_country_policies` para resolver días base en vez de 22 hardcoded |
| **C6** | Crear `ExpedientTrayectoriaTab` — vista de `hr_job_assignments` con timeline visual |
| **C7** | Crear `ExpedientCompensacionTab` — historial salarial global sin cálculos fiscales locales |

**Prioridad**: C1 → C2 → C3 → C4 (base estructural), luego C5-C7 (mejoras funcionales).

