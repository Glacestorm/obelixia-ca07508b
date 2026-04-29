# B10F.2 — Pilot Parity Pre-flight Wrapper

## Objetivo

Wrapper puro que decide si una resolución registry puede aplicarse en
**modo piloto** comparándola contra la resolución operativa mediante el
comparator B10B. Es el segundo eslabón de B10F: **B10F.1** decide si el
scope está autorizado; **B10F.2** decide si la paridad permite aplicar
sin riesgo. Ambos son **necesarios** y ninguno aplica nada por sí mismo.

## Relación con B10B comparator

B10F.2 invoca directamente
`compareOperativeVsRegistryAgreementResolution` (B10B), preserva su
`AgreementResolutionComparisonReport` íntegro en el output (`comparison`)
y reduce el report a un único veredicto piloto (`allowApply` + `reason`).

No reemplaza ni reinterpreta los umbrales de severidad del comparator;
sólo añade **una capa de política piloto** sobre encima:

- `criticals > 0` ⇒ bloqueo duro (ninguna paridad crítica es admisible).
- `warningThreshold` opcional ⇒ política configurable por scope.
- `registryPreview.canUseForPayroll === false` ⇒ bloqueo previo.

## Reglas de bloqueo

| Orden | Condición | `reason` | `blockers` |
|-------|-----------|----------|------------|
| 1 | `registryPreview.canUseForPayroll !== true` | `registry_preview_blocked` | `['registry_preview_blocked', ...preview.blockers]` |
| 2 | `summary.critical > 0` | `critical_diffs` | `['critical_diffs']` |
| 3 | `warningThreshold` definido y `summary.warning > warningThreshold` | `warning_threshold_exceeded` | `['warning_threshold_exceeded']` |
| 4 | resto | `parity_ok` | `[]` |

`previewBlockers` se conservan también como `warnings` en los casos 2
y 3 para no perder trazabilidad.

## Warning threshold

- **Default (`undefined`)**: los warnings **no** bloquean. Es el modo
  más permisivo y se usa en simulaciones internas y en el primer arranque
  del piloto.
- **`0`**: cualquier warning bloquea. Modo estricto.
- **`N` (≥1)**: tolera hasta `N` warnings inclusive. Bloquea a partir
  de `N+1`.

El threshold es decisión del **caller** del wrapper (B10F.3 en bridge,
o un test). B10F.2 no asume política por defecto distinta de "permitir
warnings".

## Determinismo y pureza

- Misma entrada ⇒ misma salida (verificado en test).
- No usa fecha, random, env, almacenamiento ni IO.
- Devuelve estructuras nuevas; no muta los inputs.

## Qué NO hace B10F.2

- No toca `useESPayrollBridge`.
- No toca nómina (`payrollEngine`, `payslipEngine`).
- No accede a base de datos: ni lecturas ni escrituras.
- No cambia `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- No cambia `HR_REGISTRY_PILOT_MODE` ni la allow-list piloto.
- No invoca al gate piloto (B10F.1) — son helpers independientes que
  B10F.3 combinará.
- No referencia la tabla operativa `erp_hr_collective_agreements`.
- No mutates `ready_for_payroll`.
- No es B10F.3: no aplica la resolución, no devuelve un override de
  payroll, no toca el resultado funcional de la nómina.

## Tests

`src/__tests__/hr/registry-pilot-parity-preflight.test.ts` cubre:

- Reglas de bloqueo (preview blocked / critical / threshold / parity).
- Determinismo.
- Propagación de blockers del preview.
- Guardas estáticos de pureza (sin Supabase, sin fetch, sin React, sin
  DB APIs, sin imports prohibidos, sin `ready_for_payroll = ...`).
- Invariantes de flags: `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL=false`
  y `HR_REGISTRY_PILOT_MODE=false` con allow-list vacía.

## Próxima fase

**B10F.3** — integración en `useESPayrollBridge.ts`: combina B10F.1
(gate de scope) + B10F.2 (paridad pre-flight) en una segunda rama del
bridge protegida por **doble gate** (global flag OFF + pilot mode ON +
scope en allow-list + parity allowApply=true). Sigue sin escribir en
DB; el resultado piloto sólo activa el override de salaryResolution
para el scope autorizado. La rama global (`HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`)
permanece intacta.
