# CASUISTICA-FECHAS-01 — Fase C3B3C1: default `persisted_priority_preview`

**Fecha:** 2026-04-27
**Modo:** BUILD
**Estado:** ✅ CERRADA

## 1. Objetivo
Activar `persisted_priority_preview` como modo por defecto del flag
`PAYROLL_EFFECTIVE_CASUISTICA_MODE` para que la UI muestre en producción
la fuente persistida propuesta y los conflictos local vs persistido, **sin
modificar el cálculo real de la nómina**.

Esta fase es estrictamente visual/diagnóstica. El payload enviado al motor
`simulateES` sigue siendo exactamente el local.

## 2. Cambio realizado
- `src/lib/hr/payrollEffectiveCasuisticaFlag.ts`: default cambia de
  `'local_only'` a `'persisted_priority_preview'`.
- Comentario de cabecera actualizado a invariantes C3B3C1.
- El wiring `casuisticaForEngine` (en `HRPayrollEntryDialog.tsx`) **no se
  toca**: solo sustituye payload cuando el modo es
  `'persisted_priority_apply'`. Por tanto, en preview, el motor sigue
  recibiendo el local exacto.

## 3. Confirmaciones
- ✅ Cálculo real sigue usando casuística local.
- ✅ Apply sigue OFF: `isEffectiveCasuisticaApplyEnabled(default) === false`.
- ✅ No cambia nómina, devengos, bases, IRPF, líquido, IT, PNR, reducción,
  atrasos ni nacimiento.
- ✅ No se generan ni envían FDI / AFI / DELT@ / INSS / TGSS / SEPE.
- ❎ `simulateES` no fue tocado; firma del motor intacta.
- ❎ No se tocaron `salaryNormalizer.ts`, `contractSalaryParametrization.ts`,
  `agreementSalaryResolver.ts`, `fdiArtifactEngine.ts`,
  `afiInactivityEngine.ts`, `deltaArtifactEngine.ts`.
- ❎ Sin BD schema, sin migraciones, sin RLS, sin edge functions, sin
  dependencias, sin CI.
- ❎ Sin insert/update/upsert/delete. Sin `service_role`.
- ❎ Sin `applied_at`, sin `applied_to_record_id`, sin recálculos.

## 4. UI resultante
- Banner por defecto: **"Modo preview: se muestra la fuente persistida
  propuesta, pero el cálculo sigue usando datos locales."**
- Columna "Fuente aplicada al cálculo" presente en `HRCasuisticaConflictsPanel`.
  En preview muestra **"Local aplicado"** + badge **"Vista preview"**.
- `unmapped` (desplazamiento_temporal, suspensión empleo/sueldo, otra)
  sigue como **"No aplicado al cálculo"** / **"No aplicado al motor"**.
- `legal_review_required` muestra warning, **no bloquea** Guardar en
  preview (solo bloquea en `apply`).

## 5. Tests
- `payrollEffectiveCasuisticaFlag.test.ts`: actualizado. Default ahora
  `persisted_priority_preview`. Garantía explícita de que el default no
  es apply.
- `HRPayrollEntryDialog.effectiveCasuistica.test.tsx`: actualizado.
  Verifica default = preview y `apply=false` para el default.
- `effectiveCasuistica.engineWiring.test.ts`: nueva suite "C3B3C1 default
  flag" con 3 tests:
  - default flag = `persisted_priority_preview`,
  - el motor recibe local idéntico aunque haya persistido (regresión cero),
  - rollback a `local_only` produce el mismo payload local que preview.
- `HRCasuisticaConflictsPanel.test.tsx`: ajustado para esperar
  `mode-banner-preview` cuando se renderiza con default.
- `HRPersistedIncidentsPanel.test.tsx`: ajustado para esperar
  `mode-banner-preview` por defecto.

## 6. Rollback
Procedimiento sin código BD ni migraciones:
1. Editar `src/lib/hr/payrollEffectiveCasuisticaFlag.ts` y dejar
   `PAYROLL_EFFECTIVE_CASUISTICA_MODE = 'local_only'`.
2. Desplegar.
3. Resultado:
   - El cálculo sigue siendo el mismo (no había cambiado en preview).
   - El banner cambia a "Fuente aplicada al cálculo: Local".
   - Las incidencias persistidas quedan intactas.
   - No hay datos a revertir.

## 7. Riesgos residuales
- Preview muestra conflictos pero no los resuelve: el operador debe
  alinear local y persistido manualmente o esperar a C3B3C2.
- `apply` requiere checklist QA legal/manual de 12 puntos antes de
  activarse como default (C3B3C2).
- Bloqueo de Guardar por `legal_review_required` sigue siendo "suave"
  (solo activo en `apply`); en preview se muestra como advertencia.

## 8. Próximo paso recomendado
- **CASUISTICA-FECHAS-01 — Fase C3B3C2 PLAN**: ejecutar el checklist QA
  legal/manual de 12 puntos. Solo tras firma de Legal/Operaciones,
  diseñar el cambio de default a `persisted_priority_apply` con
  confirmación explícita robusta para el bloqueo de Guardar.

**Estado final:** Default operativo = `persisted_priority_preview`.
Apply OFF. Cálculo real intacto. Sin código funcional del motor modificado.

---

# CASUISTICA-FECHAS-01 — Fase C3B3C1 CERRADA

**Fecha de cierre:** 2026-04-27

## 1. Resumen
- Default cambiado a `persisted_priority_preview`.
- Apply (`persisted_priority_apply`) sigue OFF.
- UI muestra fuente persistida propuesta y conflictos por defecto.
- Cálculo real sigue usando datos locales (payload del motor inalterado).
- Conflictos local vs persistido visibles en producción sin afectar nómina.

## 2. Archivos modificados
- `src/lib/hr/payrollEffectiveCasuisticaFlag.ts`
- `src/lib/hr/__tests__/payrollEffectiveCasuisticaFlag.test.ts`
- `src/lib/hr/__tests__/effectiveCasuistica.engineWiring.test.ts`
- `src/components/erp/hr/__tests__/HRPayrollEntryDialog.effectiveCasuistica.test.tsx`
- `src/components/erp/hr/casuistica/__tests__/HRCasuisticaConflictsPanel.test.tsx`
- `src/components/erp/hr/casuistica/__tests__/HRPersistedIncidentsPanel.test.tsx`

## 3. Archivos creados
- `docs/qa/CASUISTICA-FECHAS-01_C3B3C1_preview_default.md`

## 4. Confirmaciones
- ✅ Default = `persisted_priority_preview`.
- ✅ `persisted_priority_apply` sigue **OFF**.
- ❎ `simulateES` no tocado; firma del motor intacta.
- ✅ Payload real al motor sigue siendo el local exacto.
- ❎ Sin cambios en devengos, bases de cotización, IRPF, IT/AT, PNR, atrasos, nacimiento/cuidado menor.
- ❎ Sin FDI / AFI / DELT@ ni comunicaciones oficiales.
- ❎ Sin writes (insert/update/upsert/delete). Sin `service_role`.
- ❎ Sin BD schema, RLS, migraciones, edge functions, dependencias ni CI.
- ❎ Motores legales intactos (`salaryNormalizer`, `contractSalaryParametrization`, `agreementSalaryResolver`, `fdiArtifactEngine`, `afiInactivityEngine`, `deltaArtifactEngine`).

## 5. Tests
- **Total: 46/46 tests verdes.**
  - `payrollEffectiveCasuisticaFlag`: 5 tests.
  - `effectiveCasuistica.engineWiring`: 14 tests.
  - `HRPayrollEntryDialog.effectiveCasuistica`: 4 tests.
  - `HRCasuisticaConflictsPanel`: 11 tests.
  - `HRPersistedIncidentsPanel`: 12 tests.

## 6. Riesgos residuales
- Preview muestra conflictos pero no los resuelve.
- Cálculo real todavía usa casuística local.
- Apply real requiere fase **C3B3C2**.
- Checklist QA legal/manual de 12 puntos pendiente antes de cualquier activación de apply.
- No se ha ejecutado ni preparado ningún envío oficial.

## 7. Próximo paso recomendado
- Crear y ejecutar el **checklist QA legal/manual de 12 puntos** antes de abrir C3B3C2 PLAN.
- **No activar** `persisted_priority_apply` hasta validación legal/manual firmada por Legal/Operaciones.

**Estado:** ✅ Fase C3B3C1 **CERRADA**. Apply OFF. Sin código funcional modificado en este cierre documental.