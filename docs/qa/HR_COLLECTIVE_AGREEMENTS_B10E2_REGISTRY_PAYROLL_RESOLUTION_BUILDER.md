# B10E.2 — Registry Payroll Resolution Builder

## Objetivo
Builder puro y determinista que transforma snapshots de runtime setting + mapping + registry agreement/version/source/salary tables/rules en un `salaryResolution` compatible con la forma esperada por el bridge actual, **sin** tocar bridge/nómina/flag/DB.

## Input snapshots
- `RegistryPayrollRuntimeSettingSnapshot` (B10E.1).
- `RegistryPayrollMappingSnapshot` (B10D).
- `RegistryPayrollAgreementSnapshot` (Registry post-B9).
- `RegistryPayrollVersionSnapshot`.
- `RegistryPayrollSourceSnapshot`.
- `RegistryPayrollSalaryTableRowSnapshot[]`.
- `RegistryPayrollRuleSnapshot[]`.
- `targetYear`, `professionalGroup?`, `category?`.

## Output (compatible con bridge)
`RegistryPayrollResolutionBuildResult` con `salaryResolution`:
- `source: 'registry'`
- `salarioBaseConvenio`, `salarioBaseAnualConvenio`
- `plusConvenioTabla`, `plusTransporte`, `antiguedad`
- `pagasExtra { count, amount, prorrateadas }`
- `jornadaAnual`
- `__registry_source` con `setting_id`, `mapping_id`, `registry_agreement_id`, `registry_version_id`, `salary_table_row_id`, `source_quality`, `warnings`, `blockers`.

## Blockers (canonical reasons)
`runtime_setting_inactive`, `mapping_not_approved`, `mapping_not_current`, `registry_not_ready`, `requires_human_review`, `data_completeness_not_validated`, `source_quality_not_official`, `version_not_current`, `missing_salary_table`, `b10a_blocked`.

## Mapping de conceptos
| Registry field         | Bridge concept              |
|------------------------|-----------------------------|
| salary_base_monthly    | salarioBaseConvenio         |
| salary_base_annual     | salarioBaseAnualConvenio    |
| plus_convenio          | plusConvenioTabla           |
| plus_transport         | plusTransporte              |
| plus_antiguedad        | antiguedad                  |
| extra_pay_amount       | pagasExtra.amount (fallback)|

## Reglas salary table
1. Filtrar por `targetYear`.
2. Descartar filas con `row_confidence < 0.6` (warning `salary_table_low_confidence_discarded`).
3. Match exacto por `professional_group + category`; si no, sólo `professional_group` (warning `category_not_exact_match` + `fallback_salary_row_match`); si no, primera fila del año por id ascendente (warning `fallback_salary_row_match`).

## Reglas extra_payments / annual_hours
- `annual_hours` o `working_hours` → `jornadaAnual` (`hours` o `jornadaAnualHours`).
- `extra_payments` → `pagasExtra { count, amount, prorrateadas }`.
- Reglas ausentes → warnings, no bloquea.

## Relación con B10A
El builder delega un cross-check a `resolveRegistryAgreementPreview`. Si B10A devuelve `canUseForPayroll=false`, el builder devuelve `reason: b10a_blocked` con los blockers de B10A.

## Qué NO hace
- No toca `useESPayrollBridge`.
- No toca payroll/payslip engine.
- No activa `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- No accede a DB ni crea data loader.
- No toca tabla operativa `erp_hr_collective_agreements`.
- No escribe `ready_for_payroll`.

## Próxima fase
B10E.3 — data loader read-only para alimentar este builder desde DB.