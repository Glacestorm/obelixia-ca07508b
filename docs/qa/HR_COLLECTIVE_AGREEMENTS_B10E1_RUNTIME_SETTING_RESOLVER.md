# B10E.1 — Runtime Setting Resolver (PURE)

## Objetivo

Resolver puro y determinista que selecciona el `runtime_setting` más específico
aplicable a un scope (empresa, empleado?, contrato?) y reporta si es elegible
para que las fases posteriores de B10E lo consideren.

B10E.1 es **solo lógica pura**: no toca DB, no toca nómina, no toca el bridge,
no consume runtime settings desde payroll. Su única responsabilidad es elegir
qué setting "manda" según las reglas de prioridad y validar su estado.

## Qué resuelve

Función principal:

```ts
resolveRegistryRuntimeSetting({
  companyId, employeeId?, contractId?, settings
}): {
  setting, scopeMatched, reason, blockers
}
```

Donde `settings` es una lista ya cargada externamente (B10E.3 será el data
loader; B10E.1 NO carga datos).

## Prioridad de scopes (más específico gana)

1. `company_id + employee_id + contract_id` → `company_employee_contract`
2. `company_id + contract_id` (employee_id nil en el setting) → `company_contract`
3. `company_id + employee_id` (contract_id nil en el setting) → `company_employee`
4. `company_id` (employee_id y contract_id nil en el setting) → `company`

Si `employeeId` o `contractId` vienen `undefined`/`null`, no pueden hacer match
con scopes que requieran ese valor.

En caso de duplicados con el mismo scope (defecto de datos), el resolver elige
determinísticamente el primero ordenado por `id` ascendente. Verificado por
test (`r1.id === r2.id` con array invertido).

## Blockers

| Reason | Blocker(s) | Cuándo |
|---|---|---|
| `matched` | `[]` | Setting current, sin rollback, `use_registry_for_payroll=true` |
| `no_runtime_setting` | `['no_runtime_setting']` | No hay setting para el scope |
| `setting_not_current` | `['setting_not_current']` | `is_current=false` |
| `use_registry_for_payroll_false` | `['use_registry_for_payroll_false']` | flag por-setting OFF |
| `setting_inactive` | `['setting_inactive']` | `rollback_run_id` presente |

`setting_inactive` (rollback) tiene precedencia sobre `setting_not_current`,
ya que un rollback explícito describe mejor la situación operativa.

## Qué NO hace

- ❌ No toca `useESPayrollBridge` (verificado por test estático).
- ❌ No toca `registryShadowFlag` ni activa `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- ❌ No toca `agreementSalaryResolver`, `salaryNormalizer`, `payrollEngine`,
  `payslipEngine`, `agreementSafetyGate`.
- ❌ No toca la tabla operativa `erp_hr_collective_agreements`.
- ❌ No realiza queries Supabase (`.from`, `.insert`, `.update`, `.delete`,
  `.upsert`), no llama `fetch(`, no usa Deno, no usa `service_role`.
- ❌ No es un data loader (eso es B10E.3).
- ❌ No integra en el bridge (eso es B10E.4).
- ❌ No ejecuta nómina con registry.
- ❌ No modifica `ready_for_payroll`, `persisted_priority_apply`, ni desbloquea
  C3B3C2.
- ❌ No muta el array `settings` recibido (verificado por test).

## Próxima fase

**B10E.2** — Registry payroll resolution builder puro, que tomará el setting
resuelto por B10E.1 + mapping + registry agreement/version/source/salary
tables/rules y producirá una `salaryResolution` registry-driven compatible con
la forma actual del bridge. Sigue siendo puro, sin DB.

## Estado de la cadena B10E

- [x] B10E.1 Runtime setting resolver puro
- [ ] B10E.2 Registry payroll resolution builder puro
- [ ] B10E.3 Data loader read-only aislado
- [ ] B10E.4 Bridge integration con flag OFF + parity tests
- [ ] B10F Activación piloto (fuera de alcance)
