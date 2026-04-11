# H2.0 — Employee Master Gap Matrix

## Field × Table × Form × Status

| Campo | Tabla | Dominio | En lectura | Editable pre-H2 | Editable post-H2 | Criticidad |
|---|---|---|---|---|---|---|
| first_name | erp_hr_employees | Personal | ✅ | ✅ | ✅ | Critical |
| last_name | erp_hr_employees | Personal | ✅ | ✅ | ✅ | Critical |
| email | erp_hr_employees | Personal | ✅ | ✅ | ✅ | Critical |
| phone | erp_hr_employees | Personal | ✅ | ✅ | ✅ | Medium |
| employee_number | erp_hr_employees | Personal | ✅ | ✅ | ✅ | Medium |
| position / job_title | erp_hr_employees | Personal | ✅ | ✅ | ✅ | Medium |
| **national_id** | erp_hr_employees | Personal | ✅ Portal | ❌ | ✅ **+MOD23** | **Critical** |
| **birth_date** | erp_hr_employees | Personal | ✅ Expediente | ❌ | ✅ | **High** |
| **gender** | erp_hr_employees | Personal | ❌ | ❌ | ✅ | **High** |
| **nationality** | erp_hr_employees | Personal | ❌ | ❌ | ✅ | **Medium** |
| **secondary_nationality** | erp_hr_employees | Personal | ❌ | ❌ | ✅ | Low |
| **address** (JSONB) | erp_hr_employees | Personal | ✅ Portal | ❌ | ✅ | **High** |
| **bank_account** | erp_hr_employees | Financial | ❌ | ❌ | ✅ **+IBAN** | **Critical** |
| ss_number | erp_hr_employees | SS | ❌ | ❌ | Alias→NAF | Medium |
| **category** | erp_hr_employees | Empleo | ❌ | ❌ | ✅ | Medium |
| **work_schedule** | erp_hr_employees | Empleo | ❌ | ❌ | ✅ | Medium |
| **weekly_hours** | erp_hr_employees | Empleo | ❌ | ❌ | ✅ | Medium |
| department_id | erp_hr_employees | Org | ✅ | ✅ | ✅ | Medium |
| country_code | erp_hr_employees | Org | ✅ | ✅ | ✅ | High |
| legal_entity_id | erp_hr_employees | Org | ✅ | ✅ | ✅ | Medium |
| work_center_id | erp_hr_employees | Org | ✅ | ✅ | ✅ | Medium |
| reports_to | erp_hr_employees | Org | ✅ | ✅ | ✅ | Low |
| hire_date | erp_hr_employees | Empleo | ✅ | ✅ | ✅ | Critical |
| termination_date | erp_hr_employees | Empleo | ✅ | ✅ | ✅ | High |
| status | erp_hr_employees | Empleo | ✅ | ✅ | ✅ | Critical |
| base_salary | erp_hr_employees | Empleo | ✅ | ✅ | ✅ | High |
| **emergency_contact_name** | hr_employee_profiles | Personal | ❌ | ❌ | ✅ | **High** |
| **emergency_contact_phone** | hr_employee_profiles | Personal | ❌ | ❌ | ✅ | **High** |
| **emergency_contact_relationship** | hr_employee_profiles | Personal | ❌ | ❌ | ✅ | Medium |
| **education_level** | hr_employee_profiles | Profile | ❌ | ❌ | ✅ | Low |
| **languages** | hr_employee_profiles | Profile | ❌ | ❌ | ✅ | Low |
| **skills** | hr_employee_profiles | Profile | ❌ | ❌ | ✅ | Low |
| **certifications** | hr_employee_profiles | Profile | ❌ | ❌ | ✅ | Low |
| **personal_notes** | hr_employee_profiles | Profile | ❌ | ❌ | ✅ | Low |
| NAF (social_security_number) | hr_employee_extensions (ES) | SS | ✅ | ✅ | ✅ | Critical |
| contribution_group | hr_employee_extensions (ES) | SS | ✅ | ✅ | ✅ | High |
| contract_type_rd | hr_employee_extensions (ES) | Laboral | ✅ | ✅ | ✅ | Critical |
| irpf_percentage | hr_employee_extensions (ES) | Fiscal | ✅ | ✅ | ✅ | High |
| **local_id_number** | hr_employee_extensions (non-ES) | International | ❌ | ❌ | ✅ | Medium |
| **local_id_type** | hr_employee_extensions (non-ES) | International | ❌ | ❌ | ✅ | Medium |
| **immigration_status** | hr_employee_extensions (non-ES) | International | ❌ | ❌ | ✅ | Medium |
| **work_permit_expiry** | hr_employee_extensions (non-ES) | International | ❌ | ❌ | ✅ | Medium |
| **tax_residence_country** | hr_employee_extensions (non-ES) | Fiscal | ❌ | ❌ | ✅ | Medium |

## Resumen cuantitativo

| Métrica | Pre-H2 | Post-H2 |
|---|---|---|
| Campos editables en formulario | ~15 | ~38 |
| Campos en BD sin UI de edición | ~23 | 0 |
| Tablas con UI de escritura | 2 (core + ext ES) | 3 (core + profiles + ext) |
| Validaciones especializadas | 0 | 4 (DNI MOD23, IBAN, birth<hire, hours range) |
| Pestañas | 5 | 6 |
