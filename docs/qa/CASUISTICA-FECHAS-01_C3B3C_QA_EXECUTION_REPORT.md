# CASUISTICA-FECHAS-01 — Informe de ejecución QA legal/manual previo a C3B3C2

**Fecha de ejecución:** 2026-04-27
**Modo:** PLAN / READ-ONLY + DOCUMENTACIÓN
**Estado global:** ⚠️ **NO APROBADO** para C3B3C2 — pendientes de validación manual por RRHH/Legal/Operaciones.

## 1. Resumen ejecutivo

- 8 / 12 puntos verificados automáticamente por tests deterministas.
- 3 / 12 puntos requieren ejecución y firma manual en entorno demo/test
  (puntos 9 UI-unmapped, 10 bloqueo Guardar interactivo, 11 SafeMode salarial).
- Punto 12 (comunicaciones oficiales) verificado por análisis estático:
  el path de casuística no importa motores de filing.
- **No se puede declarar 12/12 OK con firma sin la pasada manual.**
- Recomendación: **NO** abrir C3B3C2 PLAN hasta completar la validación manual y firmarla.

## 2. Estado del entorno

- `PAYROLL_EFFECTIVE_CASUISTICA_MODE = 'persisted_priority_preview'` ✅
- `persisted_priority_apply` **OFF** ✅
- Cálculo real usa casuística local ✅
- Sin writes / sin `service_role` / sin migraciones / sin RLS / sin edge functions / sin dependencias / sin CI tocados ✅
- Sin generación ni envío de FDI / AFI / DELT@ / INSS / TGSS / SEPE / AEAT ✅
- `simulateES` no modificado ✅
- Motores legales intactos (`salaryNormalizer`, `contractSalaryParametrization`, `agreementSalaryResolver`, `fdiArtifactEngine`, `afiInactivityEngine`, `deltaArtifactEngine`) ✅

## 3. Tabla de los 12 puntos

| Nº | Caso | Estado | Evidencia | Responsable pendiente | Observaciones |
|----|------|--------|-----------|----------------------|---------------|
| 1 | Sin persistidos | ✅ OK automático | `engineWiring.test.ts:225` ("sin persistidos: apply equivale a local"); `effectiveCasuistica.test.ts` (16 tests base) | — | Apply sin persistidos === local. Preview === local por construcción. |
| 2 | PNR solo local | ✅ OK automático | `engineWiring.test.ts:103` (`local_only` payload === local), `:119` (preview === local), `:313` (default flag → motor recibe local) | — | Default actual recibe local exacto. |
| 3 | PNR solo persistido | ✅ OK automático (apply override) | `engineWiring.test.ts:136` (PNR 3+5→5) cubre la sustitución; caso 0+5→5 derivable por la misma regla `resolvedSource='persisted'` | RRHH (validar fuente propuesta en preview UI) | Verificable también en preview viendo la fuente propuesta = Persistido. |
| 4 | PNR local + persistido | ✅ OK automático | `engineWiring.test.ts:136` "PNR local 3 + persistido 5 → 5 (no 8)" | — | No doble conteo. |
| 5 | Reducción jornada local + persistida | ✅ OK automático | `engineWiring.test.ts:152` "Reducción 50% + 50% → 50 (no 100)" | — | No doble conteo. |
| 6 | Atrasos local + persistido | ✅ OK automático | `engineWiring.test.ts:170` "Atrasos 300€ + 300€ → 300 (no 600)" | — | No doble conteo. |
| 7 | IT/AT local + persistido | ✅ OK automático | `engineWiring.test.ts:193` "IT 4 + 7 → 7 (no 11)" | RRHH (validar tipo IT en demo) | Días no se duplican; tipo cubierto por mapping en `effectiveCasuistica.test.ts`. |
| 8 | Nacimiento/cuidado menor local + persistido | ✅ OK automático | `engineWiring.test.ts:209` "Nacimiento 16 + 16 → 16 (no 32)" | — | No doble conteo. |
| 9 | Unmapped (`desplazamiento_temporal` / `suspension_empleo_sueldo` / `otra`) | 🟡 Lógica OK + ⏳ **pendiente captura UI** | `engineWiring.test.ts:270` "unmapped no entra al payload"; `HRCasuisticaConflictsPanel.test.tsx:96` ("muestra unmapped como No aplicado al motor") | RRHH (captura panel en preview con incidencia real) | Lógica e UI cubiertas; falta evidencia visual firmada en demo. |
| 10 | `legal_review_required=true` | 🟡 Lógica OK + ⏳ **pendiente bloqueo interactivo** | `engineWiring.test.ts:288` (`blockingForClose=true`); `HRPayrollEntryDialog.tsx:433-434` (`shouldBlockSaveByLegalReview`) y `:2775` (botón Guardar `disabled`) | Legal (probar bloqueo Guardar en apply override en demo + acordar política de confirmación reforzada para C3B3C2) | Bloqueo "suave" (disable + tooltip). Confirmación explícita robusta queda explícitamente para C3B3C2. |
| 11 | SafeMode salarial | ⏳ **Pendiente verificación manual** | No hay test directo de invariancia SafeMode-vs-casuística. Separación arquitectónica existe (`salaryNormalizer.ts` no se ha tocado), pero no hay test cruzado. | RRHH + Legal (ejecutar nómina demo con SafeMode activo y aplicar PNR/reducción/IT vía override apply; comparar bases salariales antes/después) | **Punto crítico no automatizable hoy**. Considerar añadir test en C3B3C2-precheck. |
| 12 | Comunicaciones oficiales (AFI/FDI/DELT@/INSS/TGSS/SEPE/AEAT) | ✅ OK por análisis estático | `rg` confirma que `HRPayrollEntryDialog.tsx`, `effectiveCasuistica.ts` y `payrollEffectiveCasuisticaFlag.ts` **no importan** `fdiArtifactEngine`, `afiInactivityEngine`, `deltaArtifactEngine`. `isRealSubmissionBlocked()===true` se mantiene como invariante global. | Compliance (firmar acta) | El path de casuística no puede generar comunicaciones oficiales por construcción. |

## 4. Resultado técnico

### Tests ejecutados (2026-04-27)

```
✓ src/lib/hr/__tests__/payrollEffectiveCasuisticaFlag.test.ts          (5 tests)
✓ src/lib/hr/__tests__/effectiveCasuistica.test.ts                     (16 tests)
✓ src/lib/hr/__tests__/effectiveCasuistica.engineWiring.test.ts        (14 tests)
✓ src/components/erp/hr/casuistica/__tests__/HRCasuisticaConflictsPanel.test.tsx (11 tests)
✓ src/components/erp/hr/casuistica/__tests__/HRPersistedIncidentsPanel.test.tsx  (12 tests)
✓ src/components/erp/hr/__tests__/HRPayrollEntryDialog.effectiveCasuistica.test.tsx (4 tests)

Test Files  6 passed (6)
     Tests  62 passed (62)
```

### Tests faltantes recomendados (no bloqueantes para esta fase, sí antes de C3B3C2 BUILD)

- Test de invariancia SafeMode salarial frente a casuística (cubre punto 11).
- Test interactivo de `HRPayrollEntryDialog` en modo apply override que asserte el botón Guardar `disabled` cuando `blockingForClose=true` (refuerza punto 10).
- Snapshot del payload `simulateES` en preview vs `local_only` para garantizar regresión cero (ya cubierto a nivel de wiring puro pero no end-to-end).

## 5. Resultado legal/operativo

Puntos que requieren revisión humana antes de C3B3C2 PLAN:

- **Punto 9**: ejecutar en demo una incidencia `desplazamiento_temporal`, `suspension_empleo_sueldo` y `otra`; capturar el panel `HRCasuisticaConflictsPanel` con la fila "No aplicado al motor"; comparar payload del motor (no debe contener esos conceptos). Firma RRHH.
- **Punto 10**: con override `effectiveCasuisticaModeOverride='persisted_priority_apply'` en demo, generar conflicto `legalReviewRequired=true` y verificar botón Guardar deshabilitado con tooltip. Acordar con Legal si el bloqueo "suave" es suficiente o si C3B3C2 debe endurecerlo con confirmación explícita motivada (recomendación técnica: endurecer en C3B3C2).
- **Punto 11**: ejecutar nómina demo con SafeMode salarial activo; aplicar casuística (PNR + reducción + IT) tanto local como persistida; comprobar bases salariales no alteradas. Firma RRHH + Legal.
- **Punto 12**: aunque el análisis estático lo confirma, Compliance debe firmar acta del checklist.

## 6. Confirmaciones

- ✅ Apply OFF (default `persisted_priority_preview`).
- ✅ Sin writes (insert/update/upsert/delete) en este informe.
- ✅ Sin `service_role`.
- ✅ Sin generación ni envío de FDI/AFI/DELT@/INSS/TGSS/SEPE/AEAT.
- ✅ Sin cambios en motor (`simulateES`, `salaryNormalizer`, `contractSalaryParametrization`, `agreementSalaryResolver`, `fdiArtifactEngine`, `afiInactivityEngine`, `deltaArtifactEngine`).
- ✅ Sin cambios en BD, RLS, migraciones, edge functions, dependencias ni CI.
- ✅ Sin cambios en flags.
- ✅ Sin código funcional modificado en este informe (solo documentación añadida en `docs/qa/`).

## 7. Decisión recomendada

**NO avanzar a C3B3C2 PLAN** todavía.

Motivos:
- 3 puntos del checklist (9, 10, 11) requieren ejecución manual con evidencia firmada por RRHH/Legal.
- El bloqueo interactivo del Guardar (punto 10) y la invariancia de SafeMode salarial (punto 11) **no pueden marcarse OK con firma** desde la auditoría automática actual.
- C3B3C2 PLAN solo debe abrirse cuando exista acta firmada de 12/12 OK.

Cuando se complete la pasada manual, marcar los puntos pendientes en la columna "Estado" de este informe y entonces solicitar **CASUISTICA-FECHAS-01 — Fase C3B3C2 PLAN**.

## 8. Rollback (recordatorio)

Si en cualquier momento se detecta riesgo:

1. Editar `src/lib/hr/payrollEffectiveCasuisticaFlag.ts`: `PAYROLL_EFFECTIVE_CASUISTICA_MODE = 'local_only'`.
2. Desplegar.
3. Resultado: el cálculo vuelve a leer local; los procesos persistidos no se borran; sin migraciones, sin RLS, sin edge functions; sin datos a revertir.

---

## Anexo — Resumen ejecutivo de estados

| Bloque | Puntos | Estado |
|--------|--------|--------|
| Lógica de no-doble-conteo | 1, 2, 3, 4, 5, 6, 7, 8 | ✅ OK automático (tests verdes) |
| UI unmapped | 9 | 🟡 OK lógica + UI cubierta por test, ⏳ pendiente captura demo firmada |
| Bloqueo legal Guardar | 10 | 🟡 OK lógica wiring, ⏳ pendiente prueba interactiva demo |
| SafeMode salarial | 11 | ⏳ Pendiente verificación manual (no automatizable hoy) |
| Comunicaciones oficiales | 12 | ✅ OK por análisis estático, ⏳ pendiente firma Compliance |

**Veredicto:** 8/12 OK automático estricto · 3/12 OK parcial pendientes de firma · 1/12 (SafeMode) pendiente verificación manual completa.
No se cumple el criterio "12/12 OK con firma" exigido por el checklist.
