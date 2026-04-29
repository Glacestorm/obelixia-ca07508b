# HR — Collective Agreements B10B: Pure Operative vs Registry Comparator

## Objetivo

B10B implementa un comparador puro y determinista entre la resolución
operativa actual de convenio (snapshot read-only) y el preview generado por
B10A (`RegistryResolutionPreview`). Su salida es un informe estructurado de
diffs con severidad y un único veredicto consultivo:
`canApplyRegistrySafely`.

B10B es **diff-only**. No aplica nada, no modifica nómina, no toca bridge ni
resolver operativo, y no escribe en base de datos.

## Diferencia B10A / B10B / B10C / B10D

| Fase | Qué hace | Qué NO hace |
|------|----------|-------------|
| B10A | Construye `RegistryResolutionPreview` puro a partir del Registry. | No compara, no aplica, no toca nómina. |
| **B10B** | **Compara operative vs registryPreview y emite report.** | **No aplica, no toca nómina, no toca bridge, no toca DB.** |
| B10C | Bridge en modo shadow con flag `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL=false`. Solo logs. | No cambia output real de nómina. |
| B10D | Apply real per-company gated. | — |

## Inputs / Outputs

### Input

```ts
compareOperativeVsRegistryAgreementResolution({
  operative: OperativeAgreementResolutionSnapshot,
  registryPreview: RegistryResolutionPreview, // de B10A
  toleranceEuros?: number, // default 0.02
})
```

### Output: `AgreementResolutionComparisonReport`

```ts
{
  canApplyRegistrySafely: boolean;
  hasCriticalDiffs: boolean;
  hasWarnings: boolean;
  diffs: AgreementResolutionDiff[]; // ordenados por severidad/field
  summary: { critical: number; warning: number; info: number };
}
```

## Field map y umbrales

| Campo operativo | Concept registry | Cadencia |
|-----------------|------------------|----------|
| `salaryBaseMonthly` | `REGISTRY_SALARY_BASE_MONTHLY` | monthly |
| `salaryBaseAnnual`  | `REGISTRY_SALARY_BASE_ANNUAL`  | annual  |
| `plusConvenio`      | `REGISTRY_PLUS_CONVENIO`       | monthly |
| `plusTransport`     | `REGISTRY_PLUS_TRANSPORT`      | monthly |
| `plusAntiguedad`    | `REGISTRY_PLUS_ANTIGUEDAD`     | monthly |
| `extraPayAmount`    | `REGISTRY_EXTRA_PAY_AMOUNT`    | monthly |

### Umbrales de severidad (importes)

- `|Δ| ≤ tolerance` (default 0.02€) → sin diff.
- Monthly: `tolerance < |Δ| ≤ 5€` → `warning`; `|Δ| > 5€` → `critical`.
- Annual:  `tolerance < |Δ| ≤ 60€` → `warning`; `|Δ| > 60€` → `critical`.

### Reglas de presencia

- Operative present, registry concept missing → `warning`
  (`field=missing_registry_concept:<code>`).
- Registry concept present, operative missing → `info`
  (`field=extra_registry_concept:<code>`).
- Ambos null/undefined → no diff.
- Concept registry no mapeado a campo operativo → `info`
  (`field=extra_registry_concept:<code>`).

### Casos especiales

- `registryPreview.canUseForPayroll === false`: emite **un único** diff
  `critical` (`field='registryPreview'`, detail con blockers); se omiten
  comparaciones de importes; `canApplyRegistrySafely=false`.
- `operative.annualHours` presente: `warning`
  `registry_annual_hours_not_comparable` (B10A no expone jornada como
  conceptos comparables).
- `registryPreview.warnings[*]` → `info` (`field='registry_warning'`).
- `operative.warnings[*]` → `info` (`field='operative_warning'`).

## Semántica de `canApplyRegistrySafely`

```text
canApplyRegistrySafely =
  registryPreview.canUseForPayroll === true
  AND summary.critical === 0
```

Es una **señal consultiva** para fases posteriores (B10C/B10D). B10B nunca
aplica por sí mismo aunque el flag valga `true`.

## Garantías de pureza

- Sin Supabase, sin fetch, sin React, sin hooks.
- Sin DB (`.from`, `.insert`, `.update`, `.delete` no aparecen en el archivo).
- Sin imports de `payrollEngine`, `payslipEngine`, `salaryNormalizer`,
  `agreementSalaryResolver`, `useESPayrollBridge`.
- Sin referencias a la tabla operativa `erp_hr_collective_agreements`
  (solo `*_registry` están permitidos, y aquí ni eso).
- Idempotente: dos llamadas con el mismo input devuelven el mismo output.
- Diffs ordenados de forma determinista (severity → field → detail).

## Qué NO hace B10B

- No aplica conceptos registry a la nómina.
- No toca nómina final (`payslip`, `payrollEngine`, `payslipEngine`).
- No toca el bridge (`useESPayrollBridge`).
- No toca el resolver operativo (`agreementSalaryResolver`).
- No toca la tabla operativa `erp_hr_collective_agreements`.
- No crea ni modifica migraciones, RLS, edge functions ni feature flags.

## Próxima fase: B10C

- Crear bridge en modo **shadow** con flag hardcoded
  `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false`.
- Invocar `registryAwareAgreementResolver` (B10A) y
  `compareOperativeVsRegistryAgreementResolution` (B10B) en modo lectura.
- Persistir solo logs/observabilidad; **nunca** alterar el output real de
  nómina.
- Activación efectiva por empresa queda reservada para B10D.