# B10E.4 — Bridge Integration (flag OFF)

## Objetivo
Integrar la cadena registry runtime (B10E.1 → B10E.2 → B10E.3) en
`useESPayrollBridge.ts`, manteniendo `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL=false`.
Con flag OFF la nómina se comporta exactamente igual que antes; solo se
adjunta una metadata no-enumerable `__registry_runtime` con `reason='flag_off'`.

## Qué se integró
- Helper puro `registryRuntimeBridgeDecision.ts`:
  - `buildFlagOffTrace()` — trace canónica `flag_off`.
  - `buildRegistryRuntimeBridgeDecision(...)` — decisión determinista a
    partir de loader + setting resolver + builder + comparator.
  - `attachRegistryRuntimeTrace(sr, trace)` — adjunta la traza como
    propiedad **no-enumerable** (`Object.defineProperty`) preservando
    paridad funcional (JSON, deepEqual sobre claves enumerables).
  - `buildExceptionFallbackTrace()` — fallback en cualquier excepción.
- Edición quirúrgica en `useESPayrollBridge.ts` dentro del bloque B10C
  ya guarded por la flag. Imports añadidos: helper decisión, data loader
  (B10E.3), setting resolver (B10E.1), builder (B10E.2), comparator (B10B).

## Por qué la flag sigue false
- B10E es lógica solo. Activación piloto controlada queda para B10F.
- El literal `export const HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false;`
  no se modifica. Sin env vars, sin localStorage, sin remote flag.

## Flujo con flag OFF (producción actual)
1. Bridge resuelve salaryResolution operativa (sin cambios).
2. Bridge llama `attachRegistryRuntimeTrace(salaryResolution, buildFlagOffTrace())`.
3. `salaryResolution.__registry_runtime = { attempted:false, applied:false, reason:'flag_off' }`
   como propiedad NO-enumerable.
4. El `if (HR_USE_… === true)` es dead code: no se invoca el data loader,
   ni el setting resolver, ni el builder, ni el comparator.
5. `lines`, `summary`, `validations`, persistencia: sin cambios.
6. JSON.stringify y deepEqual de claves enumerables: idénticos al baseline.

## Flujo teórico con flag ON (B10F)
1. Pre-step: traza flag_off se sobrescribe.
2. `fetchRegistryRuntimePayrollSnapshot` con cliente RLS-bound del usuario.
3. `resolveRegistryRuntimeSetting` selecciona setting más específico.
4. `buildRegistryPayrollResolution` produce candidata registry.
5. `compareOperativeVsRegistryAgreementResolution` evalúa diffs.
6. `buildRegistryRuntimeBridgeDecision` decide `applyRegistry`.
7. Si `applyRegistry=true` (0 critical): se sobreescriben campos clave
   manteniendo el resto de la operativa como fallback. Si false: operativa
   intacta.

## Fallbacks
- `null/undefined` snapshot → `snapshot_load_failed`.
- loader error → `snapshot_load_failed` con `loader_<error>` blocker.
- no setting → `no_runtime_setting`.
- setting con blockers → `runtime_setting_blocked`.
- builder no construye → `registry_not_eligible`.
- ≥1 critical diff → `critical_diff_fallback`.
- Excepción inesperada → `buildExceptionFallbackTrace()`.
- En todos los casos, la operativa permanece como fuente final.

## Trace
Adjunta como propiedad NO-enumerable:
```ts
__registry_runtime: {
  attempted, applied, reason,
  setting_id?, mapping_id?,
  registry_agreement_id?, registry_version_id?,
  comparison_summary?: { critical, warnings, info? },
  blockers?: string[], warnings?: string[]
}
```
Razones canónicas: `flag_off | no_runtime_setting | runtime_setting_blocked
| snapshot_load_failed | registry_not_eligible | critical_diff_fallback
| applied_ok`.

## DB read-only
- Único acceso DB nuevo: `fetchRegistryRuntimePayrollSnapshot` (B10E.3),
  SELECT-only sobre tablas `*_registry*`, vía cliente RLS del usuario.
- Bridge no añade `.insert(`, `.update(`, `.delete(`, `.upsert(`.
- Sin `service_role`, sin `SUPABASE_SERVICE_ROLE_KEY`, sin admin client.
- Sin nuevas edge functions.

## Qué NO hace B10E.4
- ❌ No activa registry en producción (flag sigue false).
- ❌ No cambia el output funcional con flag OFF.
- ❌ No usa service-role.
- ❌ No escribe en DB.
- ❌ No toca la tabla operativa `erp_hr_collective_agreements`.
- ❌ No toca `payrollEngine`, `payslipEngine`, `salaryNormalizer`,
  `agreementSalaryResolver` (más allá de imports preexistentes).
- ❌ No cambia `persisted_priority_apply`.
- ❌ No desbloquea C3B3C2.
- ❌ No es B10F.

## Próxima fase
**B10F** — Activación piloto controlada: empresa piloto, flag ON, parity
tests reales, observabilidad, rollback inmediato si paridad rompe.

## Estado de la cadena B10E
- [x] B10E.1 Runtime setting resolver
- [x] B10E.2 Registry payroll resolution builder
- [x] B10E.3 Data loader read-only
- [x] B10E.4 Bridge integration (flag OFF)
- [ ] B10F Activación piloto
