# B13.5A — Agreement Impact Engine (PURE)

**Estado:** READY
**Fecha:** 2026-05-03
**Tipo:** Engine puro (no DB, no edge, no hook, no UI).

## Objetivo

Crear un motor puro que calcule, en memoria, el impacto potencial de un
convenio Registry `ready_for_payroll` sobre empresas/empleados, sin
persistir, sin tocar nómina, sin tocar bridge y sin activar nada.

## Por qué es puro

`src/engines/erp/hr/agreementImpactEngine.ts`:

- 0 imports de Supabase, React, Deno, fetch, hooks.
- 0 imports de `payrollEngine`, `payslipEngine`, `useESPayrollBridge`,
  `salaryNormalizer`, `agreementSalaryResolver`, `agreementSafetyGate`.
- 0 escrituras (`.insert/.update/.delete/.upsert/.rpc`).
- 0 `functions.invoke`.
- 0 referencias a `service_role`.
- 0 referencias a la tabla operativa legacy
  `erp_hr_collective_agreements` (sólo registry).
- Determinista: misma entrada ⇒ misma salida (test de igualdad JSON).

## Inputs esperados

`AgreementImpactInput` con snapshots:

- `RegistryAgreementImpactSnapshot` (estado curado del convenio)
- `RegistryAgreementVersionImpactSnapshot`
- `RuntimeSettingImpactSnapshot[]`
- `MappingImpactSnapshot[]`
- `CompanyImpactSnapshot[]`
- `EmployeeImpactSnapshot[]`
- `ContractImpactSnapshot[]`
- `SalaryTableImpactSnapshot[]`
- `RuleImpactSnapshot[]`
- `AgreementImpactOptions` (`target_year`, `as_of_date`,
  `arrears_from/to`, `employer_cost_multiplier`,
  `require_runtime_setting`, `include_inactive_employees`,
  `risk_thresholds`)

## Gates de elegibilidad (top-level blockers)

- `registry_not_ready_for_payroll`
- `registry_requires_human_review`
- `registry_not_human_validated`
- `registry_source_not_official`
- `registry_salary_tables_not_loaded`
- `version_mismatch`
- `no_salary_tables_for_target_year`
- `no_current_runtime_setting` (si `require_runtime_setting=true`)

Si alguno se dispara, el motor devuelve un resultado **no eligible** sin
lanzar excepción.

## Matching de salary table

Prioridad determinista:

1. `professional_group + level + category`
2. `current_professional_group + current_level + current_category` del contrato (vía override)
3. `professional_group + level`
4. `professional_group` (con warning `salary_table_match_fallback`)

Múltiples matches ⇒ `ambiguous_salary_table_match` (warning + risk flag).
Sin match ⇒ blocker `missing_salary_table`.

## Conceptos / literales preservados

Detectados como `concepts_detected`:
`transporte`, `nocturnidad`, `festivo`, `antigüedad/antiguedad`, `dieta`,
`kilomet`, `responsabilidad`, `convenio`, más `plus_transport>0` y
`plus_antiguedad>0`.

Si la table impacta nómina y falta `concept_literal_from_agreement` o
`payslip_label`, se añade blocker `missing_concept_literal` o
`missing_payslip_literal_preservation`.

## Fórmulas

- `delta_monthly = target_monthly - current_monthly`
- `delta_annual = target_annual - current_annual`
- Si sólo hay anual y existe rule `extra_pay.payment_count`, mensual = anual / count.
  Si no hay rule, se usa 12 con warning `payment_count_unknown`.
- `arrears_estimate = max(delta_monthly,0) * months(from,to)`,
  capado a `arrears_max_months`.
- `employer_cost_delta = max(delta_annual,0) * multiplier`.
  Default `1.32` ⇒ warning `employer_cost_multiplier_defaulted`.

## Risk flags soportados

`missing_salary_table`, `ambiguous_salary_table_match`,
`salary_below_agreement`, `salary_above_agreement`, `large_delta`,
`negative_delta`, `missing_runtime_setting`, `mapping_not_approved`,
`registry_not_ready`, `missing_concept_literal`, `missing_payslip_label`,
`missing_antiquity_rule`, `arrears_period_too_long`, `inactive_employee`,
`inactive_contract`.

## Qué NO hace

- No escribe en DB ni crea migraciones.
- No crea edge / hook / UI.
- No toca `payrollEngine`, `payslipEngine`, `useESPayrollBridge`,
  `salaryNormalizer`, `agreementSalaryResolver`, `agreementSafetyGate`.
- No activa `ready_for_payroll`, no pone
  `salary_tables_loaded=true`, no pone `data_completeness='human_validated'`.
- No toca `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
  `HR_REGISTRY_PILOT_MODE`, `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- No genera asiento, CRA, SILTRA o SEPA.
- No usa `service_role`. No inventa salarios.

## Relación con B13.5B

B13.5A es la base puramente computacional. B13.5B (no ejecutado)
envolverá el engine en un servicio orquestador que cargará snapshots
(read-only) y servirá previews a la UI. Ningún flujo de B13.5B persistirá
resultados ni tocará nómina hasta que un build posterior lo apruebe
formalmente.

## Tests ejecutados

- `src/tests/hr/agreement-impact-engine.test.ts` — **36/36 verde**.
- `src/tests/hr/agreement-impact-engine-static.test.ts` — **16/16 verde**.
- Suite HR completa (`src/__tests__/hr/` + `src/tests/hr/`):
  **1871/1872 verde**. El único fallo
  (`src/tests/hr/registry-ui-auth-guards.test.tsx`) es un fallo de
  entorno jsdom (`window is not defined` durante `performWork` de
  React 19) en un test de UI lazy, **no relacionado con B13.5A** (B13.5A
  no toca UI ni React). Queda como deuda preexistente fuera de alcance.

## Confirmación de no activación

- ❌ no DB writes
- ❌ no migrations
- ❌ no edge
- ❌ no hook
- ❌ no UI
- ❌ no salary_tables reales
- ❌ no `ready_for_payroll`
- ❌ no `salary_tables_loaded=true`
- ❌ no `human_validated`
- ❌ no bridge
- ❌ no nómina
- ❌ no tabla operativa legacy
- ❌ no flags modificados (siguen `false`)
- ❌ allow-list sigue `[]`
- ❌ no mapping/runtime creado
- ❌ B13.5B no ejecutado
