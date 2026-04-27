# CASUISTICA-FECHAS-01 — Fase C3B3B-paso1
## Feature flag + visualización de "Fuente aplicada" SIN cambio de payload

**Estado:** BUILD entregado · vista informativa.
**Fecha:** 2026-04-27.

## Objetivo
Introducir el flag tipado `PAYROLL_EFFECTIVE_CASUISTICA_MODE` y la
visualización clara del modo activo y la fuente aplicada al cálculo,
**sin tocar todavía** las llamadas reales a `simulateES` ni el payload
del motor de nómina.

## Razón legal/operativa
La conexión real de `effectiveCasuistica` al motor puede afectar
devengos, bases de cotización, IT/AT, PNR, reducciones, atrasos, IRPF y
líquido de nómina. Por prudencia regulatoria (TGSS, AEAT, normativa
laboral) esta fase queda como **solo visual y reversible**. La activación
real se planificará en C3B3B-paso2 con snapshot tests y QA legal.

## Feature flag
`src/lib/hr/payrollEffectiveCasuisticaFlag.ts`

```ts
export type PayrollEffectiveCasuisticaMode =
  | 'local_only'                  // default: motor usa local (sin cambios)
  | 'persisted_priority_preview'  // futuro: visual diff, motor sigue local
  | 'persisted_priority_apply';   // futuro: motor usaría effective (NO conectado)
```

- **Default operativo:** `'local_only'`.
- No lee env, BD, ni configuración remota.
- `persisted_priority_apply` queda tipado pero **NO conectado al motor**.

## UI ampliada
`HRCasuisticaConflictsPanel.tsx` recibe la nueva prop opcional
`effectiveMode` (default = `PAYROLL_EFFECTIVE_CASUISTICA_MODE`):
- Banner dinámico (`mode-banner-local-only` / `-preview` / `-apply`).
- Nueva columna **"Fuente aplicada al cálculo"** con badges:
  - `local_only` → "Local aplicado".
  - `persisted_priority_preview` → "Local aplicado" + "Vista preview".
  - `persisted_priority_apply` → "Persistido aplicado" / "Manual override"
    / "Local aplicado" según `resolvedSource` (visual únicamente).
- Texto explícito en `apply`: "Este modo no está activado en esta fase."

`HRPersistedIncidentsPanel.tsx` propaga
`effectiveMode={PAYROLL_EFFECTIVE_CASUISTICA_MODE}` al panel de
conflictos. No cambia queries, mapping, refetch, alta manual ni
promoción.

## Confirmaciones de invariantes
- ✅ **`HRPayrollEntryDialog.tsx` NO tocado.**
- ✅ **`simulateES` NO tocado** (las dos llamadas siguen consumiendo
  `casuistica` local, no `effective`).
- ✅ **Payload del motor NO modificado.**
- ✅ Sin tocar `salaryNormalizer.ts`, `contractSalaryParametrization.ts`,
  `agreementSalaryResolver.ts`, `fdiArtifactEngine.ts`,
  `afiInactivityEngine.ts`, `deltaArtifactEngine.ts`.
- ✅ Sin generación FDI/AFI/DELT@.
- ✅ Sin comunicaciones oficiales.
- ✅ Sin writes (insert/update/upsert/delete).
- ✅ Sin `service_role`.
- ✅ Sin tocar `applied_at` ni `applied_to_record_id`.
- ✅ Sin recálculos.
- ✅ Sin migraciones, RLS, edge functions, dependencias ni CI.
- ✅ Sin bloquear Guardar/Cerrar.

## Implicación legal
La visualización **no altera** nóminas, devengos, bases de cotización,
IRPF ni seguros sociales. No genera artefactos oficiales. El cálculo
sigue siendo bit-equivalente al de C3B3A.

## Tests
- `src/lib/hr/__tests__/payrollEffectiveCasuisticaFlag.test.ts` — 4 tests
  (default `local_only`, helpers `apply`/`preview` enabled).
- `HRCasuisticaConflictsPanel.test.tsx` — 11 tests (5 originales +
  6 nuevos: banner por modo, columna "Fuente aplicada", badges
  Local/Preview/Apply, unmapped invariante).
- `HRPersistedIncidentsPanel.test.tsx` — 12 tests (incluido el
  nuevo de propagación del modo por defecto y mantenimiento de
  promoción/alta).
- `effectiveCasuistica.test.ts` — 16 tests (sin cambios, sigue verde).

**Resultado:** 43/43 tests verdes.

## Riesgos residuales
- Divergencia visual entre "Fuente propuesta" y cálculo real hasta
  C3B3B-paso2 (mitigada por banner explícito en `preview`).
- En `persisted_priority_apply` la columna "Fuente aplicada" muestra
  "Persistido aplicado" como **simulación visual**, no como cálculo
  real. Riesgo de malinterpretación → mitigado con copy
  "Este modo no está activado en esta fase."
- Override manual y `sum_explicit` siguen sin UI funcional.

## Próximo paso
**CASUISTICA-FECHAS-01 Fase C3B3B-paso2 PLAN** — diseño de la conexión
real al motor (`simulateES`) en modo `persisted_priority_apply`, con:
- snapshot tests de regresión bit-a-bit en `local_only`,
- QA legal de la matriz fuente única (PNR, reducción, atrasos, IT/AT,
  nacimiento),
- bloqueo de Guardar/Cerrar cuando `blockingForClose=true`,
- política de cobertura de periodo siempre local (defensa en profundidad).

## Cierre
C3B3B-paso1 queda **entregado**. El cálculo de nómina sigue idéntico al
de C3B3A; solo cambia la visualización.
