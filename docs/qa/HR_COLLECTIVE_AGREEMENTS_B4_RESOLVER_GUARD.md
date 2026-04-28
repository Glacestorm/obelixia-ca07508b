# B4.b — Cableado defensivo del agreementSafetyGate en agreementSalaryResolver

**Fase:** B4.b · **Modo:** BUILD acotado (resolver + tests) · **Estado:** ✅ Completado.

## 1. Qué se ha cableado

`agreementSalaryResolver.resolveSalaryFromAgreement` (y por extensión
`resolveEmployeeSalary`) acepta ahora un parámetro **opcional**
`safetyContext: AgreementSafetyContext` con la forma:

```ts
interface AgreementSafetyContext {
  agreementOrigin?: AgreementOrigin;       // default: 'operative'
  hasManualSalary?: boolean;               // default: salarioPactado > 0
  agreementRecord?: unknown;               // pasado al gate
  precomputedDecision?: AgreementSafetyDecision; // bypass (testing/bridge)
}
```

El resolver invoca internamente `evaluateAgreementForPayroll(...)` y, según la
decisión, **bloquea, advierte o permite** el cálculo automático de conceptos
de convenio (salario base, plus convenio, etc.) sin alterar la firma pública
ni los outputs cuando no se pasa `safetyContext`.

Se añaden a `SalaryResolutionResult`:
- `agreementSafety?: AgreementSafetyDecision` (decisión completa)
- en `trace`: `agreement_origin`, `agreement_safety_allowed`,
  `agreement_safety_block`, `agreement_safety_warnings`,
  `agreement_safety_missing`.

## 2. Por qué `origin='operative'` es el default

La tabla operativa actual `erp_hr_collective_agreements` (106 filas)
sigue siendo la fuente legítima del flujo de nómina. Si un caller no pasa
`safetyContext`, el resolver:

- **NO evalúa el gate** (rama `shouldEvaluateGate === false`).
- **NO modifica importes**.
- **NO añade warnings**.
- **NO altera `agreementResolutionStatus`**.

Esto garantiza que el Validation Pack Carlos Ruiz, `payslipEngine`,
`useESPayrollBridge` y todo motor que hoy llama al resolver sin saber del gate
sigue funcionando exactamente igual. Tests verdes lo confirman (21/21
regresión + 9/9 nuevos B4.b).

## 3. Comportamiento por origen

| Origin | Acción | Conceptos automáticos | Status |
|---|---|---|---|
| `operative` | Resolver normal | Sí | `computed` |
| `registry` + validado (`ready_for_payroll=true`, `human_validated`, `official`, `vigente`) | Resolver normal | Sí | `computed` |
| `registry` + metadata_only (PAN-PAST-IB, etc.) | **Bloqueo seguro** | No | `manual_review_required` |
| `legacy_ts_fallback` + manual salary | Salario manual aceptado | No (sólo manual) | `no_agreement` + warning |
| `legacy_ts_fallback` sin manual salary | Bloqueo seguro | No | `manual_review_required` |
| `unknown` + manual salary | Salario manual aceptado | No | `no_agreement` + warning |
| `unknown` sin manual salary | Bloqueo seguro | No | `manual_review_required` |

## 4. Bloqueos vs warnings emitidos

**Bloqueos** (`agreement_safety_block`):
- `AGREEMENT_NOT_READY_FOR_PAYROLL` — registry sin `ready_for_payroll`.
- `AGREEMENT_MISSING_SALARY_TABLES`
- `AGREEMENT_REQUIRES_HUMAN_REVIEW`
- `AGREEMENT_NON_OFFICIAL_SOURCE`
- `AGREEMENT_STATUS_NOT_VIGENTE`

Cuando hay bloqueo, el resolver devuelve `safeMode = true`,
`salarioBaseConvenio = 0`, `plusConvenioTabla = 0`, `mejoraVoluntaria = 0`.

**Warnings** (no bloquean, pero quedan en `agreement_safety_warnings`):
- `LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW` — convenio TS legacy.
- `MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT` — salario manual con convenio
  no validado (registry o unknown).

## 5. Salario manual

Cuando hay `hasManualSalary === true` y el origin no permite cálculo
automático (`legacy_ts_fallback` o `unknown` allowed), el resolver:

- Devuelve `salarioBaseConvenio = salarioPactado`.
- `plusConvenioTabla = 0` (no se infiere de tabla del convenio).
- `agreementResolutionStatus = 'no_agreement'`.
- Mantiene los warnings del gate en la traza.

Esto preserva la intención del usuario sin degradar a safe mode pero también
sin alimentar conceptos automáticos no validados.

## 6. Qué NO se ha hecho

- ❌ No se ha tocado `useESPayrollBridge`.
- ❌ No se ha tocado `payslipEngine`.
- ❌ No se ha tocado `salaryNormalizer`.
- ❌ No se ha tocado la tabla operativa `erp_hr_collective_agreements`.
- ❌ No se ha tocado el Registro Maestro DB ni RLS ni migraciones.
- ❌ No se han tocado edge functions.
- ❌ No se ha activado `ready_for_payroll` para nadie.
- ❌ No se han tocado fixtures Carlos Ruiz, Command Center, HRModule, flags,
  `persisted_priority_apply`, ni C3B3C2.

## 7. Tests

Suite específica:
- `src/__tests__/hr/agreement-salary-resolver-gate.test.ts` — **9 tests verdes**.

Suite agregada B1+B2+B3+B4.a+B4.b:
- 14 + 16 + 18 + 12 + 9 = **69/69 verdes**.

Suite regresión nómina (sin tocar):
- `payroll-positive-path` (6) + `ssContributions` (3) + `itEngine` (6)
  + `garnishmentEngine` (6) = **21/21 verdes**.

## 8. Próxima fase

- **B4.c** — bridge/hook/UI:
  - Cablear `useESPayrollBridge` para pasar el `safetyContext` correcto
    según origen real (operative DB / registry / fallback TS).
  - Extender `PayrollSafeModeBlock` con los nuevos códigos.
  - UI badge "Convenio en revisión" cuando `agreementSafety.allowed === false`.
