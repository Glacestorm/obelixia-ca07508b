# B10F.1 — Pilot Gate (pure)

## Objetivo

Helper puro que decide si un scope `{company, employee, contract, year}`
puede usar Registry en nómina bajo **modo piloto controlado**, sin
tocar bridge, nómina, DB, flag global, tabla operativa ni
`ready_for_payroll`.

## Doble gate

| Gate | Default | Cómo se cambia |
|---|---|---|
| `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` (B10C, global) | `false` | **Inmutable en B10F**. Sólo cambia en una hipotética fase posterior. |
| `HR_REGISTRY_PILOT_MODE` (B10F.1, piloto) | `false` | PR explícito. |
| `REGISTRY_PILOT_SCOPE_ALLOWLIST` | `[]` | PR por scope. Máx 3. |

Reglas duras de combinación:

- global `true` + pilot `true` → conflicto → `global_flag_conflict` →
  fallback obligatorio.
- pilot `false` → siempre `pilot_disabled` → fallback.
- pilot `true` + allow-list vacía → `scope_not_allowed` → fallback.
- pilot `true` + scope no exacto en allow-list → `scope_not_allowed`.
- pilot `true` + scope exacto + allow-list válida → `scope_allowed`.

## Por qué el global flag sigue `false`

B10F **no autoriza** activación global. El global flag implica
"todas las empresas con mapping aprobado y registry ready". B10F sólo
autoriza scope explícito en allow-list cerrada. Mantener global en
`false` evita activación accidental por un toggle único.

## Allow-list exacta

Cada entrada exige los tres ids no nulos, año numérico positivo,
`owner` y `rollback_contact` no vacíos, y `pilot_started_at` no vacío.

No se aceptan:

- `*` ni cualquier wildcard;
- `null` / `undefined` en ningún id;
- duplicados exactos `(company, employee, contract, year)`;
- más de **3** entradas (`REGISTRY_PILOT_ALLOWLIST_MAX`);
- ids vacíos o sólo whitespace.

Validación expuesta vía `validateRegistryPilotAllowlist`. Si falla,
`isPilotEnabledForScope` devuelve `reason='invalid_allowlist'` con los
blockers concretos.

## Rollback por PR

Dos vías equivalentes:

1. **Desactivar el modo piloto:** poner `HR_REGISTRY_PILOT_MODE = false`
   en un PR hotfix. Todos los scopes vuelven a fallback en el siguiente
   render del bridge.
2. **Quitar un scope concreto:** eliminar la entrada de
   `REGISTRY_PILOT_SCOPE_ALLOWLIST`. El resto del piloto sigue activo,
   pero ese scope vuelve a fallback inmediatamente.

Ambos son cambios de código; ninguno requiere migración ni redeploy de
schema.

## Qué NO hace B10F.1

- No toca `useESPayrollBridge`.
- No toca `registryShadowFlag` ni cambia el global flag.
- No toca `agreementSalaryResolver`, `salaryNormalizer`,
  `payrollEngine`, `payslipEngine`, `agreementSafetyGate`.
- No accede a Supabase, fetch, env vars, localStorage, ni Deno.
- No contiene DB writes (`.from/.insert/.update/.upsert/.delete`).
- No toca la tabla operativa `erp_hr_collective_agreements`.
- No mutates `ready_for_payroll`.
- No crea edge ni UI ni migraciones.
- No es B10F.3 (integración real en bridge).

## Tests

`src/__tests__/hr/registry-pilot-gate.test.ts` cubre constantes,
reglas de decisión, validación de allow-list y guardas estáticos del
source.

## Próxima fase

**B10F.2** — paridad pre-flight wrapper que combina la resolución del
resolver operativo y la del builder Registry vía comparator B10B y
decide si el piloto puede aplicar registry o debe caer a fallback.