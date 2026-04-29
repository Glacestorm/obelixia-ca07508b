# B10F.3 — Pilot Bridge Integration (double gate, both OFF)

## Objetivo

Integrar la rama piloto registry en `useESPayrollBridge.ts` bajo
**doble gate**, manteniendo:

- `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false`,
- `HR_REGISTRY_PILOT_MODE = false`,
- `REGISTRY_PILOT_SCOPE_ALLOWLIST = []`.

Con todo OFF, el output funcional de nómina es exactamente el de B10E.4:
sólo se adjunta una traza no-enumerable `__registry_runtime` con
`reason='flag_off'`.

## Doble gate — estructura mutuamente exclusiva

```ts
if ((HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL as unknown as boolean) === true) {
  // B10E.4 — global registry runtime branch
} else if ((HR_REGISTRY_PILOT_MODE as unknown as boolean) === true) {
  // B10F.3 — pilot branch (gate + parity preflight)
} else {
  // todo OFF (producción actual): trace flag_off, sin loader, sin chain
}
```

La rama piloto **nunca** se ejecuta si el global flag está ON. Si por
error alguien activase ambos a la vez, la propia gate B10F.1 devolvería
`global_flag_conflict` y la rama haría fallback con
`pilot_conflict_global_on`.

## Por qué el global sigue `false`

- El global flag autoriza **todas** las empresas con mapping aprobado y
  registry ready.
- B10F.3 sólo autoriza scopes **explícitos** por allow-list cerrada
  (máx 3 entradas).
- Mantener el global en `false` evita activación masiva accidental.

## Por qué el piloto sigue `false`

- B10F.3 es la **integración del cableado** sólo. La activación piloto
  real (con allow-list poblada) es una decisión operacional que se hará
  en B10F.4/B10F.5 con observabilidad y rollback documentados.
- Activar el piloto antes del edge log (B10F.4) y la UI monitor
  (B10F.5) dejaría sin auditoría la primera ejecución real.

## Flujo piloto (cuando `HR_REGISTRY_PILOT_MODE=true`)

1. Construir scope `{ companyId, employeeId, contractId, targetYear }`.
2. `isPilotEnabledForScope(scope)` (B10F.1):
   - `pilot_disabled` → fallback con outcome `pilot_disabled`.
   - `global_flag_conflict` → fallback `pilot_conflict_global_on`.
   - `invalid_scope` → fallback `pilot_invalid_scope`.
   - `invalid_allowlist` → fallback `pilot_invalid_allowlist`.
   - `scope_not_allowed` (allow-list vacía o sin match) → fallback
     `pilot_scope_not_allowed`.
   - `scope_allowed` → continuar.
3. `fetchRegistryRuntimePayrollSnapshot` (B10E.3) usando el cliente
   RLS-bound del usuario (NUNCA `service_role`):
   - error → `pilot_snapshot_load_failed`.
4. `resolveRegistryRuntimeSetting` (B10E.1):
   - sin setting → `pilot_no_runtime_setting`.
   - setting bloqueado → `pilot_runtime_setting_blocked`.
5. `buildRegistryPayrollResolution` (B10E.2):
   - `canBuild=false` → `pilot_registry_not_eligible`.
6. `runRegistryPilotParityPreflight` (B10F.2) con comparator B10B:
   - `registry_preview_blocked` → `pilot_blocked_registry_preview`.
   - `critical_diffs` → `pilot_blocked_critical_diffs`.
   - `warning_threshold_exceeded` → `pilot_blocked_warning_threshold`.
   - `parity_ok` → aplicar.
7. Si `applyRegistry=true`: sobreescribir `salarioBaseConvenio` y
   `plusConvenioTabla` con los valores registry, manteniendo el resto
   de la `salaryResolution` operativa intacta. Outcome `pilot_applied`.
8. En cualquier excepción inesperada → fallback `pilot_exception`.

En **todos** los casos, la `salaryResolution` operativa permanece como
fuente final. La nómina nunca queda bloqueada por el piloto.

## Trace adjunta (no-enumerable)

| Estado del bridge | `__registry_runtime` |
|-------------------|----------------------|
| Todo OFF (producción) | `{ attempted:false, applied:false, reason:'flag_off' }` |
| Pilot OFF (else if no entra) | `{ attempted:false, applied:false, reason:'flag_off' }` |
| Pilot ON, scope no permitido | `{ pilot_mode:true, attempted:true, applied:false, outcome:'pilot_fallback', reason:'pilot_scope_not_allowed', blockers:[...] }` |
| Pilot ON, critical diffs | `{ pilot_mode:true, attempted:true, applied:false, outcome:'pilot_blocked', reason:'pilot_blocked_critical_diffs', comparison_summary:{...} }` |
| Pilot ON, applied | `{ pilot_mode:true, attempted:true, applied:true, outcome:'pilot_applied', reason:'pilot_applied', comparison_summary:{...}, setting_id, mapping_id, registry_agreement_id, registry_version_id }` |
| Pilot ON, conflicto global | `{ pilot_mode:true, attempted:true, applied:false, outcome:'pilot_fallback', reason:'pilot_conflict_global_on' }` |
| Excepción cualquiera | trace fallback con `blockers:['pilot_exception']` |

La traza es **no-enumerable** (`Object.defineProperty`); JSON.stringify y
deepEqual sobre claves enumerables no cambian.

## Pruebas de paridad (con todo OFF)

- `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL === false` literal.
- `HR_REGISTRY_PILOT_MODE === false` literal.
- `REGISTRY_PILOT_SCOPE_ALLOWLIST.length === 0`.
- `Object.keys(salaryResolution)` no incluye `__registry_runtime`.
- `JSON.stringify(salaryResolution)` idéntico al baseline B10E.4.
- `fetchRegistryRuntimePayrollSnapshot` no se invoca.
- Suite payroll crítico verde.
- Suite B10/B10E/B10F verde.

## Helper puro creado

`src/engines/erp/hr/registryPilotBridgeDecision.ts`:

- Recibe sub-helpers inyectados (gate, setting resolver, builder,
  preflight) para mantenerse aislado del bridge y trivialmente testable.
- Devuelve `{ applyRegistry, trace, registrySalaryResolution?, scope? }`.
- Pure: sin Supabase, sin fetch, sin React, sin DB, sin
  `service_role`, sin imports prohibidos.

## Qué NO hace B10F.3

- ❌ No cambia `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- ❌ No cambia `HR_REGISTRY_PILOT_MODE`.
- ❌ No añade scopes a `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- ❌ No escribe en DB (`.insert/.update/.delete/.upsert/.rpc`).
- ❌ No usa `service_role` ni `SUPABASE_SERVICE_ROLE_KEY`.
- ❌ No toca la tabla operativa `erp_hr_collective_agreements`.
- ❌ No toca `agreementSalaryResolver`, `salaryNormalizer`,
  `payrollEngine`, `payslipEngine`, `agreementSafetyGate`.
- ❌ No modifica `ready_for_payroll`.
- ❌ No cambia `persisted_priority_apply`.
- ❌ No desbloquea C3B3C2.
- ❌ No crea edge functions.
- ❌ No crea UI.
- ❌ No es B10F.4 (edge log) ni B10F.5 (UI monitor).

## Estado de la cadena B10F

- [x] B10F.1 Pilot gate puro
- [x] B10F.2 Parity preflight wrapper
- [x] B10F.3 Bridge integration (doble gate, ambos OFF)
- [ ] B10F.4 Edge log de decisiones piloto
- [ ] B10F.5 UI monitor read-only

## Próxima fase

**B10F.4** — Edge function `erp-hr-pilot-runtime-decision-log`
(append-only) que recibe la traza piloto y la persiste para auditoría
inmutable. JWT del usuario, RLS sobre la tabla de log; sin
`service_role`. Sólo activa cuando `HR_REGISTRY_PILOT_MODE` se eleve a
`true` y haya scopes en la allow-list.
