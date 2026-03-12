

# Payroll & Compliance Engine — Arquitectura Funcional

## Estado Actual

El sistema de nóminas actual tiene:
- **`erp_hr_payrolls`**: tabla con campos ES-hardcoded (`ss_worker`, `irpf_amount`, `irpf_percentage`, `ss_company`, columnas TGSS)
- **`erp_hr_payroll_concepts`**: conceptos con `cotiza_ss`, `tributa_irpf` (terminología ES)
- **`erp_hr_ss_contributions`**: tabla 100% española (CC, AT/EP, FOGASA, FP, desempleo)
- **`HRPayrollEntryDialog`**: SS_RATES hardcoded (23.60% CC, 5.50% desempleo, etc.)
- **`HRPayrollPanel`**: muestra IRPF y SS como columnas fijas
- **`erp_hr_payroll_recalculations`**: ya tiene `fiscal_jurisdiction`
- **`HRPayrollPeriodsPanel`**: solo demo data estática

**Problema**: El motor mezcla lógica española en la capa core. Los tipos de cotización, porcentajes SS e IRPF están hardcoded en componentes y tablas.

---

## Diseño: Motor Global Desacoplado

### Principio de separación

```text
┌─────────────────────────────────────────┐
│         PAYROLL ENGINE (Global)         │
│  Períodos · Líneas · Conceptos · Estados│
│  Cierre · Auditoría · Exportación       │
├─────────────────────────────────────────┤
│         CALCULATION RULES API           │
│  Interface: calcEarnings, calcDeductions│
│  calcEmployerCosts, validate            │
├──────────┬──────────┬───────────────────┤
│ Plugin ES│ Plugin PT│ Plugin FR ...     │
│ IRPF,TGSS│ IRS,TSU  │ IR,URSSAF        │
└──────────┴──────────┴───────────────────┘
```

---

## 1. Nuevas Tablas (migración)

### `hr_payroll_periods` — Períodos de nómina (reemplaza demo)
| Campo | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | |
| `company_id` | FK | |
| `legal_entity_id` | FK nullable | Entidad legal (multi-entity) |
| `period_year` | INT | Año |
| `period_month` | INT | Mes (1-12) |
| `period_type` | TEXT | `monthly`, `biweekly`, `weekly`, `extra`, `settlement` |
| `status` | TEXT | `draft`, `open`, `calculating`, `calculated`, `reviewing`, `closing`, `closed`, `locked` |
| `opened_at` | TIMESTAMPTZ | |
| `closed_at` | TIMESTAMPTZ | |
| `closed_by` | UUID | |
| `locked_at` | TIMESTAMPTZ | Bloqueo definitivo |
| `employee_count` | INT | Empleados en período |
| `total_gross` | NUMERIC | Bruto total |
| `total_net` | NUMERIC | Neto total |
| `total_employer_cost` | NUMERIC | Coste empresa |
| `validation_results` | JSONB | Resultados de validación pre-cierre |
| `metadata` | JSONB | |

### `hr_payroll_lines` — Líneas de nómina (reemplaza JSONB complements/deductions)
| Campo | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | |
| `payroll_id` | FK → erp_hr_payrolls | |
| `concept_id` | FK nullable → payroll_concepts | |
| `concept_code` | TEXT | Código del concepto |
| `concept_name` | TEXT | Nombre snapshot |
| `line_type` | TEXT | `earning`, `deduction`, `employer_cost`, `informative` |
| `category` | TEXT | `fixed`, `variable`, `overtime`, `bonus`, `commission`, `allowance`, `flexible_remuneration`, `advance`, `regularization`, `withholding`, `social_contribution`, `other` |
| `units` | NUMERIC | Horas, días, unidades |
| `unit_price` | NUMERIC | Precio unitario |
| `amount` | NUMERIC | Importe calculado |
| `is_percentage` | BOOL | |
| `percentage_base` | TEXT | Sobre qué base aplica |
| `percentage_value` | NUMERIC | % |
| `taxable` | BOOL | Sujeto a impuestos (genérico) |
| `contributable` | BOOL | Sujeto a cotización social (genérico) |
| `source` | TEXT | `manual`, `calculated`, `imported`, `rule_engine`, `incident` |
| `incident_id` | UUID nullable | Si viene de incidencia |
| `sort_order` | INT | |
| `metadata` | JSONB | Datos locales del plugin |

### `hr_payroll_concept_templates` — Catálogo global de conceptos
| Campo | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | |
| `company_id` | FK | |
| `code` | TEXT UNIQUE per company | |
| `name` | TEXT | |
| `line_type` | TEXT | earning/deduction/employer_cost/informative |
| `category` | TEXT | fixed/variable/overtime/etc |
| `default_amount` | NUMERIC nullable | |
| `is_percentage` | BOOL | |
| `default_percentage` | NUMERIC nullable | |
| `percentage_base` | TEXT nullable | |
| `taxable` | BOOL | Genérico: sujeto a impuestos |
| `contributable` | BOOL | Genérico: sujeto a cotización |
| `country_code` | TEXT nullable | NULL = global, 'ES' = solo España |
| `is_active` | BOOL | |
| `sort_order` | INT | |
| `legal_reference` | TEXT nullable | |
| `metadata` | JSONB | Config específica del plugin |

### `hr_payroll_simulations` — Simulaciones sin impacto
| Campo | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | |
| `company_id` | FK | |
| `employee_id` | FK | |
| `period_year`, `period_month` | INT | |
| `simulation_type` | TEXT | `what_if`, `salary_change`, `new_hire`, `promotion` |
| `input_params` | JSONB | Parámetros de entrada |
| `result_lines` | JSONB | Líneas calculadas |
| `result_summary` | JSONB | Bruto, neto, coste empresa |
| `created_by` | UUID | |
| `created_at` | TIMESTAMPTZ | |

### `hr_payroll_audit_log` — Auditoría específica de nómina
| Campo | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | |
| `company_id` | FK | |
| `payroll_id` | FK nullable | |
| `period_id` | FK nullable | |
| `action` | TEXT | `created`, `calculated`, `line_added`, `line_modified`, `approved`, `rejected`, `closed`, `locked`, `reopened`, `recalculated`, `exported`, `simulated` |
| `actor_id` | UUID | |
| `actor_name` | TEXT | |
| `entity_type` | TEXT | `payroll`, `period`, `line`, `concept` |
| `entity_id` | UUID | |
| `old_value` | JSONB | |
| `new_value` | JSONB | |
| `metadata` | JSONB | |
| `created_at` | TIMESTAMPTZ | |

---

## 2. Estados de Nómina (ciclo de vida)

### Nómina individual (`erp_hr_payrolls.status`)
```text
draft → calculated → reviewing → approved → paid → cancelled
                        ↓
                     rejected (→ draft)
```

Se añaden: `reviewing`, `rejected` al CHECK constraint existente.

### Período de nómina (`hr_payroll_periods.status`)
```text
draft → open → calculating → calculated → reviewing → closing → closed → locked
                                              ↓
                                          reopened (→ open)
```

### Validaciones pre-cierre de período
Antes de pasar a `closing`:
1. Todas las nóminas del período en estado `approved` o `paid`
2. No hay incidencias pendientes vinculadas al período
3. Totales cuadran (sum lines = payroll totals)
4. Sin conceptos con importe 0 en líneas obligatorias
5. Sin empleados activos sin nómina generada
6. Firma del responsable de nómina

---

## 3. Estructura de Conceptos y Categorías

### Categorías globales (agnósticas de país)

| Categoría | Ejemplos |
|---|---|
| `fixed` | Salario base, complementos fijos |
| `variable` | Horas extra, comisiones, bonus, incentivos |
| `overtime` | Horas extraordinarias (normal, festiva, nocturna) |
| `bonus` | Bonus mensual, trimestral, anual, por objetivos |
| `commission` | Comisiones de ventas, por proyecto |
| `allowance` | Dietas, transporte, vivienda, vestuario |
| `flexible_remuneration` | Seguro médico, guardería, ticket restaurante, formación |
| `advance` | Anticipos a descontar |
| `regularization` | Atrasos, recálculos, ajustes retroactivos |
| `withholding` | Retenciones fiscales (plugin calcula %) |
| `social_contribution` | Cotizaciones sociales (plugin calcula %) |
| `informative` | Bases, totales informativos, coste empresa |
| `other` | Cuota sindical, embargo, pensión alimenticia |

### Flags genéricos por concepto
- `taxable`: ¿Sujeto a impuestos del país? (el plugin decide qué impuesto)
- `contributable`: ¿Sujeto a cotización social? (el plugin decide qué régimen)

---

## 4. Componentes UI

### 4.1 `HRPayrollEngine` — Panel principal (reemplaza `HRPayrollPanel`)
Tabs:
- **Períodos**: CRUD de períodos, estados, apertura/cierre
- **Nóminas**: Listado por período con filtros
- **Conceptos**: Catálogo de conceptos (global + local)
- **Simulación**: Calculadora what-if
- **Auditoría**: Log de cambios

### 4.2 `HRPayrollPeriodManager`
- Lista de períodos por año/entidad legal
- Acciones: Abrir, calcular masivo, revisar, cerrar, bloquear
- Indicadores: empleados procesados, pendientes, con incidencias
- Validación pre-cierre visual (checklist)

### 4.3 `HRPayrollDetail` (refactoriza `HRPayrollEntryDialog`)
Vista completa de una nómina individual:
- Header: empleado, período, estado, jurisdicción
- Tabla de líneas (earning + deduction + employer_cost) con `hr_payroll_lines`
- Totales: bruto, deducciones, neto, coste empresa
- Panel lateral: incidencias vinculadas, documentos, histórico
- Acciones: calcular, aprobar, rechazar, recalcular, exportar justificante

### 4.4 `HRPayrollConceptsCatalog`
- CRUD de `hr_payroll_concept_templates`
- Filtro por país (global vs local)
- Columnas: código, nombre, tipo, categoría, taxable, contributable, activo
- Import/export masivo

### 4.5 `HRPayrollSimulator`
- Selector de empleado + escenario
- Parámetros editables (salario, jornada, conceptos)
- Resultado: líneas simuladas + comparativa con nómina actual
- No persiste en `erp_hr_payrolls`, solo en `hr_payroll_simulations`

### 4.6 `HRPayrollClosingWizard`
- Wizard paso a paso para cerrar un período:
  1. Validar: checklist de pre-cierre
  2. Revisar: resumen de totales y anomalías
  3. Aprobar: firma digital / confirmación
  4. Cerrar: cambia estado a `closed`
  5. Exportar: genera ficheros (SEPA, contabilidad)
- Cada paso registra en `hr_payroll_audit_log`

### 4.7 `HRPayrollAuditTrail`
- Timeline filtrable por período/empleado/acción
- Detalle de cada cambio con diff visual

### 4.8 `HRPayrollIncidentsBridge`
- Lista de incidencias pendientes que impactan nómina
- Vinculación: `hr_admin_requests` → `hr_payroll_lines` via `incident_id`
- Tipos: horas extra, bonus, dietas, anticipos, IT, accidente

---

## 5. Hook: `usePayrollEngine`

Funciones principales:
- `fetchPeriods(year, legalEntityId?)` — períodos con resumen
- `openPeriod(year, month, legalEntityId?)` — crear/abrir período
- `closePeriod(periodId)` — validar + cerrar
- `lockPeriod(periodId)` — bloqueo definitivo
- `fetchPayrolls(periodId, filters?)` — nóminas del período
- `calculatePayroll(employeeId, periodId)` — cálculo (llama al plugin de país)
- `calculateBatch(periodId)` — cálculo masivo
- `fetchPayrollLines(payrollId)` — líneas detalladas
- `addLine(payrollId, line)` / `updateLine` / `deleteLine`
- `approvePayroll(payrollId)` / `rejectPayroll`
- `simulate(params)` — simulación sin persistir en nóminas
- `validatePreClose(periodId)` — checklist de validación
- `exportPayroll(payrollId, format)` — PDF/SEPA/contabilidad
- `fetchAuditLog(filters)` — auditoría

---

## 6. Permisos por Rol

| Permiso | Quién |
|---|---|
| `payroll.periods.read` | Payroll Manager, Admin |
| `payroll.periods.manage` | Payroll Manager |
| `payroll.periods.close` | Payroll Manager + approval |
| `payroll.periods.lock` | Admin Global |
| `payroll.payslips.read` | Payroll Manager, Manager (su equipo), Empleado (la suya) |
| `payroll.payslips.calculate` | Payroll Manager |
| `payroll.payslips.approve` | Payroll Manager + Director |
| `payroll.payslips.export` | Payroll Manager |
| `payroll.concepts.read` | Payroll Manager, Admin |
| `payroll.concepts.manage` | Admin |
| `payroll.simulate` | Payroll Manager, HR Manager |
| `payroll.audit.read` | Admin, Auditor |

---

## 7. Eventos e Incidencias que Impactan Nómina

| Evento origen | Impacto en nómina | Automatización |
|---|---|---|
| Alta empleado (admin-portal) | Generar primera nómina prorrateada | Auto |
| Cambio salarial (admin-portal) | Recalcular desde fecha efecto | Semi-auto |
| Cambio jornada | Recalcular proporcional | Semi-auto |
| IT / Accidente (leave_incident) | Ajustar complemento, bases | Auto |
| Horas extra (time_clock) | Añadir línea variable | Import |
| Vacaciones (leave_request) | Ajustar días trabajados | Auto |
| Anticipo aprobado | Añadir línea deducción | Auto |
| Baja voluntaria/despido | Trigger settlement/finiquito | Manual |
| Regularización retroactiva | Líneas de atraso | Recálculo |
| Retribución flexible | Líneas en especie | Config |

---

## 8. Qué NO va en el motor global

| Concepto | Dónde va | Razón |
|---|---|---|
| Tramos IRPF | Plugin ES | Legislación fiscal española |
| Tipos cotización TGSS | Plugin ES | Sistema SS español |
| Bases mínimas/máximas SS | Plugin ES | Varían por país |
| Modelo 111/190 | Plugin ES | Modelos fiscales AEAT |
| TC1/TC2 | Plugin ES | Liquidación TGSS |
| Complemento IT por convenio | Plugin ES | Convenios españoles |
| Cálculo finiquito legal | Plugin ES | Legislación laboral |

---

## 9. Plan de implementación

| Fase | Contenido |
|---|---|
| **PY1** | Migración: 5 tablas nuevas + modificar `erp_hr_payrolls` (añadir `period_id`, `reviewing`, `rejected`) |
| **PY2** | Hook `usePayrollEngine` con CRUD períodos + líneas |
| **PY3** | `HRPayrollEngine` con tabs: Períodos, Nóminas, Conceptos |
| **PY4** | `HRPayrollDetail` con líneas detalladas (reemplaza dialog) |
| **PY5** | `HRPayrollClosingWizard` + validaciones pre-cierre |
| **PY6** | `HRPayrollSimulator` + `HRPayrollAuditTrail` |
| **PY7** | `HRPayrollIncidentsBridge` — vincular admin-portal → líneas nómina |
| **PY8** | Wiring en HRModule + actualizar navegación Payroll |

Prioridad: PY1 → PY2 → PY3 → PY4 (base funcional), luego PY5-PY8 (cierre + simulación + auditoría).

