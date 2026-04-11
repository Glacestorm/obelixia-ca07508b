# H2.0 — Employee Master Data Audit Report

## Resumen Ejecutivo

El formulario maestro de empleado (`HREmployeeFormDialog`) capturaba ~15 de ~45 campos disponibles en las 3 tablas subyacentes. Campos críticos como DNI/NIE, fecha de nacimiento, género, nacionalidad, dirección, cuenta bancaria, contacto de emergencia y datos internacionales estaban en el esquema de BD pero sin UI de captura/edición.

## BEFORE (Pre-H2.0)

### Formulario: 5 pestañas, ~15 campos editables
| Pestaña | Campos |
|---|---|
| Personal | first_name, last_name, email, phone, employee_number, position |
| Organización | country_code, department_id, legal_entity_id, work_center_id, reports_to |
| Empleo | hire_date, termination_date, status, base_salary, prórroga |
| Accesos | module_code × access_level matrix |
| País (ES) | NAF, contribution_group, contract_type_rd, collective_agreement, autonomous_community, cno_code, irpf_percentage, ocupacion_ss, ccc, empresa_fiscal_nif, empresa_fiscal_nombre, Modelo 145 |

### Campos ausentes del formulario (23 campos)
- **erp_hr_employees**: national_id, birth_date, gender, nationality, secondary_nationality, address (JSONB), bank_account, ss_number, work_schedule, weekly_hours, category, tax_residence_country
- **hr_employee_profiles**: emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, education_level, languages, skills, certifications, personal_notes (tabla entera sin UI)
- **hr_employee_extensions (non-ES)**: local_id_number, local_id_type, immigration_status, work_permit_expiry

## AFTER (Post-H2.0)

### Formulario: 6 pestañas, ~38 campos editables

| Pestaña | Campos añadidos |
|---|---|
| **Personal** | national_id (con MOD23), birth_date, gender, nationality, secondary_nationality, bank_account (con IBAN), address (street, city, postal_code, province) |
| **Empleo** | category, work_schedule, weekly_hours |
| **Perfil** *(NUEVA)* | emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, education_level, languages, skills, certifications, personal_notes |
| **País (non-ES)** | local_id_number, local_id_type, immigration_status, work_permit_expiry, tax_residence_country |

### Validaciones añadidas
- **DNI/NIE**: Algoritmo MOD23 completo vía `dniNieValidator.ts` con feedback visual ✓/✗
- **IBAN**: Validación de formato con regex `^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$`
- **birth_date**: Debe ser anterior a hire_date
- **weekly_hours**: Rango 0-60

### Persistencia multi-tabla
- **erp_hr_employees**: identity, employment, organizational, financial → fuente de verdad principal
- **hr_employee_profiles**: emergency contacts, education, skills, notes → upsert por employee_id
- **hr_employee_extensions**: datos por país (ES=NAF+SS+IRPF / non-ES=local_id+immigration) → upsert por employee_id+country_code

### Resolución NAF vs ss_number
- Para empleados españoles: el **NAF** en la pestaña País (ES) es la fuente de verdad, almacenado como `social_security_number` en `hr_employee_extensions`
- El campo `ss_number` en `erp_hr_employees` es un alias/respaldo — no se edita directamente para empleados ES
- Se añadió nota explicativa visible en la pestaña País

### Manejo de errores parciales
- Si profile o extensión internacional fallan al guardar, el empleado core sí se guarda
- El usuario recibe un `toast.warning` indicando qué parte no se pudo guardar
- No se dejan datos parciales sin informar

## Employee Master Source of Truth Map

| Campo | Tabla fuente de verdad | Pestaña UI |
|---|---|---|
| first_name, last_name, email, phone | erp_hr_employees | Personal |
| national_id, birth_date, gender | erp_hr_employees | Personal |
| nationality, secondary_nationality | erp_hr_employees | Personal |
| bank_account | erp_hr_employees | Personal |
| address (JSONB) | erp_hr_employees | Personal |
| employee_number, position | erp_hr_employees | Personal |
| department_id, legal_entity_id, work_center_id | erp_hr_employees | Organización |
| reports_to, country_code | erp_hr_employees | Organización |
| hire_date, termination_date, status | erp_hr_employees | Empleo |
| base_salary, category, work_schedule, weekly_hours | erp_hr_employees | Empleo |
| emergency_contact_* | hr_employee_profiles | Perfil |
| education_level, languages, skills, certifications | hr_employee_profiles | Perfil |
| personal_notes | hr_employee_profiles | Perfil |
| NAF (social_security_number) — ES | hr_employee_extensions (ES) | País |
| contribution_group, contract_type_rd, IRPF, etc. — ES | hr_employee_extensions (ES) | País |
| local_id_number, local_id_type — non-ES | hr_employee_extensions (CC) | País |
| immigration_status, work_permit_expiry — non-ES | hr_employee_extensions (CC) | País |
| tax_residence_country — non-ES | hr_employee_extensions (CC) | País |
