# CASUISTICA-FECHAS-01 — Fase C3B3B-paso2 (BUILD)

**Estado:** ✅ COMPLETADA — 2026-04-27
**Modo:** wiring técnico activo, **default operativo `local_only` (cálculo idéntico al previo)**.

## Objetivo
Conectar `effectiveCasuistica` al motor de nómina (`simulateES`) preservando una única fuente de verdad por concepto, **sin cambiar el comportamiento real de producción**: el flag `PAYROLL_EFFECTIVE_CASUISTICA_MODE` permanece en `local_only`. El modo `persisted_priority_apply` solo se valida vía override test-only.

## Qué se ha conectado
1. `HRPayrollEntryDialog.tsx`:
   - Nueva prop opcional `effectiveCasuisticaModeOverride` (test-only).
   - Lectura read-only de `useHRPayrollIncidencias` (deduplica con el panel; respeta RLS).
   - `effectiveCasuisticaResult = buildEffectiveCasuistica({...mode: 'persisted_priority'})`.
   - `casuisticaForEngine`: en `local_only` y `preview` ⇒ `=== casuistica` (referencia idéntica). En `apply` ⇒ `effective` con `period*` siempre forzado desde local.
   - Sustitución quirúrgica `const cas = casuistica` → `const cas = casuisticaForEngine` en los **dos** call sites de `simulateES` (live bridge + preview/guardar).
   - Bloqueo suave de Guardar (`shouldBlockSaveByLegalReview`) solo cuando `apply + blockingForClose=true`. Tooltip explicativo.
2. `HRPersistedIncidentsPanel.tsx`: nueva prop `effectiveMode` propagada al panel de conflictos.
3. `HRCasuisticaConflictsPanel.tsx`: ya soportaba la columna "Fuente aplicada al cálculo" y los banners por modo desde paso1; sin cambios funcionales nuevos en paso2.

## Default y comportamiento real
- `PAYROLL_EFFECTIVE_CASUISTICA_MODE === 'local_only'` (sin cambios).
- En runtime normal: `casuisticaForEngine === casuistica` ⇒ payload idéntico al previo. Producción no cambia comportamiento.
- `persisted_priority_apply` queda diferido a C3B3C, condicionado a checklist QA legal/manual aprobado.

## Matriz legal de fuente única (apply mode)
| Concepto | Fuente canónica si existe persistido | Fallback |
|---|---|---|
| PNR (`pnrDias`) | `erp_hr_payroll_incidents (pnr)` | local |
| Reducción (`reduccionJornadaPct`) | `payroll_incidents (reduccion_*)` | local |
| Atrasos (`atrasosITImporte`) | `payroll_incidents (atrasos_regularizacion)` | local |
| IT/AT (`itAtDias`) | `erp_hr_it_processes` | local |
| Nacimiento (`nacimientoDias`) | `erp_hr_leave_requests` | local |
| `unmapped` | nunca al payload | — |
| `period*` | **siempre local** (invariante) | — |

No se duplica nunca: si existe persistido activo, el local se ignora para ese campo.

## Tests ejecutados
- `src/lib/hr/__tests__/payrollEffectiveCasuisticaFlag.test.ts`: 4/4 ✅
- `src/lib/hr/__tests__/effectiveCasuistica.test.ts`: 16/16 ✅
- `src/lib/hr/__tests__/effectiveCasuistica.engineWiring.test.ts` (nuevo): 11/11 ✅
  - PNR 3+5 → 5 (no 8). Reducción 50+50 → 50 (no 100). Atrasos 300+300 → 300 (no 600). IT 4+7 → 7 (no 11). Nacimiento 16+16 → 16 (no 32). Sin persistidos: idempotente. `period*` desde local. `unmapped` fuera del payload. `legal_review_required ⇒ blockingForClose`.
- `src/components/erp/hr/casuistica/__tests__/HRCasuisticaConflictsPanel.test.tsx`: 11/11 ✅
- `src/components/erp/hr/__tests__/HRPayrollEntryDialog.effectiveCasuistica.test.tsx` (nuevo): 3/3 ✅

**Total:** 45/45 ✅

## Confirmaciones
- ❎ No se modificó `simulateES` ni su firma.
- ❎ No se tocó `salaryNormalizer.ts`, `contractSalaryParametrization.ts`, `agreementSalaryResolver.ts`, `fdiArtifactEngine.ts`, `afiInactivityEngine.ts`, `deltaArtifactEngine.ts`.
- ❎ No se generan ni envían FDI / AFI / DELT@ ni comunicaciones oficiales.
- ❎ No hay writes (insert/update/upsert/delete). No se usa `service_role`.
- ❎ No se tocan BD schema, RLS, migraciones, edge functions, dependencias ni CI.
- ✅ Default operativo permanece `local_only`. En runtime normal el cálculo es idéntico al previo.
- ✅ Apply mode probado vía override test-only; sin doble conteo demostrado.

## Riesgos residuales
- Activación accidental de `persisted_priority_apply` en producción: mitigada por default constante y override solo test-only.
- Bloqueo de Guardar en apply es "suave" (disable + tooltip). El bloqueo formal con confirmación explícita queda para C3B3C.
- `HRPayrollEntryDialog` añade una llamada a `useHRPayrollIncidencias`; React Query deduplica con el panel, sin tráfico extra.

## Próximo paso recomendado
**C3B3C PLAN** — activar `persisted_priority_apply` por defecto solo tras superar el checklist QA legal/manual (12 puntos descritos en el PLAN C3B3B-paso2 §8) y añadir confirmación explícita robusta para el bloqueo de Guardar.

---

# CASUISTICA-FECHAS-01 — Fase C3B3B-paso2 CERRADA

**Fecha de cierre:** 2026-04-27

## 1. Resumen
- Wiring técnico de `effectiveCasuistica` implementado.
- `casuisticaForEngine` creado vía `useMemo` en `HRPayrollEntryDialog.tsx`.
- `effectiveCasuisticaModeOverride` añadido como prop **test-only**.
- Los **dos call sites** de `simulateES` (live bridge y preview/save) usan `casuisticaForEngine`.
- `PAYROLL_EFFECTIVE_CASUISTICA_MODE` permanece en `local_only` por defecto.
- Runtime normal continúa calculando con casuística local exactamente como antes.
- Modo `persisted_priority_apply` validado únicamente vía override / tests.

## 2. Archivos creados
- `src/lib/hr/__tests__/effectiveCasuistica.engineWiring.test.ts`
- `src/components/erp/hr/__tests__/HRPayrollEntryDialog.effectiveCasuistica.test.tsx`
- `docs/qa/CASUISTICA-FECHAS-01_C3B3B_step2_engine_wiring.md`

## 3. Archivos modificados
- `src/components/erp/hr/HRPayrollEntryDialog.tsx`
- `src/components/erp/hr/casuistica/HRPersistedIncidentsPanel.tsx`

## 4. Confirmaciones
- ✅ Default `PAYROLL_EFFECTIVE_CASUISTICA_MODE = 'local_only'`.
- ✅ Apply mode **no** está activo por defecto.
- ✅ Runtime normal mantiene cálculo idéntico al previo.
- ❎ `simulateES` no modificado; firma del motor intacta.
- ❎ No se tocaron `salaryNormalizer.ts`, `contractSalaryParametrization.ts`, `agreementSalaryResolver.ts`, `fdiArtifactEngine.ts`, `afiInactivityEngine.ts`, `deltaArtifactEngine.ts`.
- ❎ Sin insert/update/upsert/delete. Sin `service_role`.
- ❎ Sin `applied_at`, sin `applied_to_record_id`, sin recálculos.
- ❎ Sin FDI / AFI / DELT@. Sin comunicaciones oficiales.
- ❎ Sin migraciones, sin RLS, sin edge functions, sin dependencias, sin CI.

## 5. Tests
- **Total: 45/45 verdes.**
  - `effectiveCasuistica.engineWiring`: 11 tests.
  - `HRPayrollEntryDialog.effectiveCasuistica`: 3 tests.
  - Panel / dialog / wiring restantes: incluidos en los 45/45.
- Casos validados (no doble conteo en apply):
  - PNR 3 + 5 → **5**, no 8.
  - Reducción 50 + 50 → **50**, no 100.
  - Atrasos 300 + 300 → **300**, no 600.
  - IT 4 + 7 → **7**, no 11.
  - Nacimiento 16 + 16 → **16**, no 32.
  - Campos `period*` siempre desde estado local.
  - Campos `unmapped` quedan fuera del payload del motor.

## 6. Riesgos residuales
- Apply mode sigue **OFF** por defecto.
- Activación real de `persisted_priority_apply` requiere fase **C3B3C**.
- Bloqueo de Guardar en apply sigue siendo "suave" (disable + tooltip).
- Confirmación explícita robusta queda pendiente para C3B3C.
- Checklist QA legal/manual (12 puntos) pendiente antes de cualquier activación.
- No se ha ejecutado ninguna comunicación oficial.

## 7. Próximo paso recomendado
**CASUISTICA-FECHAS-01 — Fase C3B3C PLAN**: activación controlada de `persisted_priority_apply` solo tras superar el checklist QA legal/manual de 12 puntos y añadir confirmación explícita robusta de bloqueo.

**Estado:** ✅ Fase C3B3B-paso2 **CERRADA**. Apply OFF por defecto. Sin código funcional modificado en este cierre documental.