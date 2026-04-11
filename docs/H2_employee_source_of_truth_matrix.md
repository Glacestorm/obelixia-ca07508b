# H2.1 — Employee Source of Truth Matrix

## Field × Table × Panel × Ownership × Prefill Status

| Campo | Tabla fuente de verdad | Panel operativo consumidor | Ownership | Prefill H2.1 | Condición |
|---|---|---|---|---|---|
| national_id (DNI/NIE) | `erp_hr_employees` | Registration, Contract | Master | ✅ Aditivo | Siempre |
| ss_number | `erp_hr_employees` | — (fallback NAF) | Master (backup) | Fallback | Solo si ext.NAF vacío |
| position | `erp_hr_employees` | Contract (→ job_title) | Master | ✅ Aditivo | Siempre |
| hire_date | `erp_hr_employees` | — | Master | No | Proceso-specific |
| base_salary | `erp_hr_employees` | — | Master | No | Proceso-specific |
| weekly_hours | `erp_hr_employees` | Contract | Master | ✅ Aditivo | Siempre |
| country_code | `erp_hr_employees` | — (routing) | Master | No | Determina ES-prefill |
| social_security_number (NAF) | `hr_employee_extensions` (ES) | Registration, Contract | Extensions ES | ✅ Aditivo | country_code = ES |
| contribution_group | `hr_employee_extensions` (ES) | Registration | Extensions ES | ✅ Aditivo | country_code = ES |
| contract_type_rd | `hr_employee_extensions` (ES) | Registration (→ contract_type_code) | Extensions ES | ✅ Aditivo | country_code = ES |
| collective_agreement | `hr_employee_extensions` (ES) | Registration, Contract | Extensions ES | ✅ Aditivo | country_code = ES |
| cno_code / ocupacion_ss | `hr_employee_extensions` (ES) | Registration (→ occupation_code), Contract | Extensions ES | ✅ Aditivo | country_code = ES |
| ccc | `hr_employee_extensions` (ES) | Registration, Contract | Extensions ES | ✅ Aditivo | country_code = ES |
| registration_date | `hr_employee_registrations` | Registration | Proceso | No | Propio del alta |
| regime | `hr_employee_registrations` | Registration | Proceso | No | Propio del alta |
| working_coefficient | `hr_employee_registrations` | Registration | Proceso | No | Propio del alta |
| trial_period_days | `hr_employee_registrations` | Registration, Contract | Proceso | No | Propio del proceso |
| contract_start_date | `hr_contract_processes` | Contract | Proceso | No | Propio del contrato |
| contract_end_date | `hr_contract_processes` | Contract | Proceso | No | Propio del contrato |
| contract_duration_type | `hr_contract_processes` | Contract | Proceso | No | Propio del contrato |
| working_hours_type | `hr_contract_processes` | Contract | Proceso | No | Propio del contrato |
| salary_gross_annual | `hr_contract_processes` | Contract | Proceso | No | Propio del contrato |
| is_conversion | `hr_contract_processes` | Contract | Proceso | No | Propio del contrato |

## Reglas de Ownership

### Nivel 1: Master (erp_hr_employees)
- Fuente de verdad para identidad, empleo base y datos organizativos
- Campos: national_id, ss_number, position, hire_date, base_salary, weekly_hours, country_code
- Editado en: `HREmployeeFormDialog` (pestaña Personal / Empleo)

### Nivel 2: Extensions (hr_employee_extensions)
- Fuente de verdad para datos legales/fiscales por país
- Campos ES: NAF, contribution_group, contract_type_rd, collective_agreement, cno_code, ccc, IRPF, etc.
- Editado en: `HREmployeeFormDialog` (pestaña País)

### Nivel 3: Proceso (tablas operativas)
- Datos específicos del trámite: fechas, salarios contractuales, tipo duración, régimen
- Editado en: `RegistrationDataPanel`, `ContractDataPanel`
- No se propagan al maestro — son instancias del proceso

## Resolución de Conflictos

| Escenario | Resolución |
|---|---|
| Maestro tiene DNI, panel operativo vacío | Prefill aditivo → panel toma DNI del maestro |
| Maestro tiene DNI, panel ya tiene otro DNI | No se sobrescribe → operador responsable del override |
| Extensions tiene NAF, core tiene ss_number diferente | Se usa NAF de extensions (prioridad) |
| Extensions no tiene NAF, core tiene ss_number | Se usa ss_number como fallback |
| Empleado no-ES, campos ES en panel | No se precargan campos ES → quedan vacíos |

## Indicadores Visuales

| Estado | Indicador | Color |
|---|---|---|
| Campo pre-cargado desde maestro | Badge "Pre-cargado" | `bg-blue-50 text-blue-700` |
| Campo modificado por operador (override) | Sin badge (valor manual) | Normal |
| Campo vacío (sin dato maestro ni manual) | Sin badge | Normal |
