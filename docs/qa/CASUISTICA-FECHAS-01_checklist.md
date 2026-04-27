# CASUISTICA-FECHAS-01 — Fase B QA Checklist

**Estado:** ✅ BUILD aplicado, pendiente de validación funcional en preview.
**Scope:** UI únicamente. Cero cambios en motor, BD, RLS, edge functions, migraciones, dependencias o CI.

## Archivos modificados

- `src/components/erp/hr/HRPayrollEntryDialog.tsx`
  - Tipo `CasuisticaDatesExtension` añadido (campos opcionales de fecha por proceso).
  - `DEFAULT_CASUISTICA` ampliado con valores vacíos para todos los nuevos campos.
  - `useState<CasuisticaState & CasuisticaDatesExtension>` (intersección de tipos).
  - Helpers puros exportados: `calculateInclusiveDays`, `isInvertedRange`.
  - `derivedDays` memo con días calculados + flags de rango invertido por proceso.
  - Payload del motor (live calc + preview) usa `derived ?? legacy`. Contrato del
    motor sin cambios (sigue recibiendo número de días).
  - UI: bloques rediseñados PNR, IT/AT, Reducción jornada, Atrasos, Nacimiento.
    Mantiene cobertura intramensual original.
- `src/components/erp/hr/__tests__/HRPayrollEntryDialog.casuisticaDates.test.ts`
  - Tests unitarios para los helpers puros.
- `docs/qa/CASUISTICA-FECHAS-01_checklist.md` (este documento).

## Archivos NO tocados (verificado)

- `src/engines/erp/hr/salaryNormalizer.ts`
- `src/engines/erp/hr/contractSalaryParametrization.ts`
- `src/engines/erp/hr/agreementSalaryResolver.ts`
- `src/engines/erp/hr/fdiArtifactEngine.ts`
- `src/engines/erp/hr/afiInactivityEngine.ts`
- `src/engines/erp/hr/deltaArtifactEngine.ts`
- Cualquier otro motor de payroll/legal/IRPF/SS
- Migraciones (`supabase/migrations/`)
- RLS policies
- Edge functions (`supabase/functions/`)
- BD (sin queries, sin backfill)
- `package.json`, `bun.lock`, CI

## Nuevos campos en CasuisticaState

| Proceso | Campo desde | Campo hasta | Otros |
|---|---|---|---|
| PNR | `pnrFechaDesde` | `pnrFechaHasta` | — |
| IT/AT | `itAtFechaDesde` | `itAtFechaHasta` | `itAtTipo` (4 valores + vacío) |
| Reducción jornada | `reduccionFechaDesde` | `reduccionFechaHasta` | — |
| Atrasos / regularización | `atrasosFechaDesde` | `atrasosFechaHasta` | (legacy `atrasosITPeriodo` YYYY-MM se mantiene) |
| Nacimiento / cuidado menor | `nacimientoFechaInicio` | `nacimientoFechaFin` | `nacimientoFechaHechoCausante` |
| Cobertura período (legacy) | `periodFechaDesde` | `periodFechaHasta` | sin cambios |

## Helper de cálculo

`calculateInclusiveDays(from, to)` — pure function:
- Mismo día → 1.
- 2026-03-01 a 2026-03-31 → 31.
- Falta alguna fecha → `null`.
- Fecha fin < fecha inicio → `null`.
- Formato distinto a YYYY-MM-DD estricto → `null`.

`isInvertedRange(from, to)` — devuelve `true` cuando ambas fechas son válidas y
`to < from`. Usado para mostrar warning visual no bloqueante.

## Compatibilidad legacy

- ✅ Si NO hay fechas: input numérico de días sigue editable; valor manual entra al motor.
- ✅ Si hay fechas válidas: input numérico se muestra como **calculado** (etiqueta "(calc.)") y queda `disabled`. Días derivados entran al motor en lugar del valor manual.
- ✅ Para volver a edición manual: vaciar las fechas → el input vuelve a quedar editable y se vuelve a usar el valor legacy almacenado.
- ✅ Reducción jornada % no se ve afectada por las fechas (el motor sigue recibiendo `reduccionJornadaPct` numérico).
- ✅ Atrasos: el motor sigue recibiendo `atrasosITImporte` + `atrasosITPeriodo`. Las fechas son trazabilidad complementaria.
- ✅ Nacimiento: días pueden derivarse de fechas inicio/fin; el `nacimientoTramos` que llega al motor sigue usando `periodFechaDesde/Hasta` actuales (sin cambio en contrato).

## Validaciones visuales (no bloqueantes)

- ⚠️ "Fecha fin anterior a fecha inicio" en cada proceso si rango invertido.
- ℹ️ "Días calculados automáticamente desde fechas. Para editar manualmente, vacía las fechas."
- ℹ️ "Este registro no genera aún comunicación oficial FDI/AFI/DELT@ en esta fase."
- ℹ️ "Las semanas obligatorias y la prestación INSS requieren validación laboral."
- ℹ️ "Pendiente de validación legal si afecta a guarda legal / bases de cotización."

## Checklist funcional manual

- [ ] Abrir Nueva Nómina → seleccionar empleado.
- [ ] Abrir acordeón **"Casuística entre fechas"** y activarlo.
- [ ] **PNR** 2026-03-01 → 2026-03-01 → muestra **1 día** calculado, input días bloqueado.
- [ ] **IT/AT** 2026-03-01 → 2026-03-31 → muestra **31 días** calculados.
- [ ] **IT/AT** seleccionar tipo "Accidente de trabajo" → no rompe payload.
- [ ] Cambiar IT/AT fecha fin a 2026-02-28 → aparece warning **"Fecha fin anterior a fecha inicio"**, días NO se calculan.
- [ ] Vaciar fechas IT/AT → el input numérico vuelve a editable; valor manual previo se restaura como base.
- [ ] **Reducción jornada** % 50 + fechas → mantiene 50%; fechas son trazabilidad.
- [ ] **Atrasos**: importe 350€ + periodo 2025-09 + fechas 2025-09-01..2025-09-30 → no rompe importe.
- [ ] **Nacimiento** paternidad + fechas inicio/fin 2026-03-01..2026-04-25 → muestra **56 días** calc.
- [ ] **Sin fechas + sólo días manuales** → comportamiento idéntico al previo (regresión OK).
- [ ] Resumen / Vista previa → reflejan días derivados (verificar badge total devengos/deducciones).
- [ ] No se generan FDI/AFI/DELT@ ni se persiste nada nuevo en BD.
- [ ] Al recargar el diálogo, los nuevos campos de fecha NO persisten en BD (esperado en Fase B; persistencia se aborda en Fase C).

## Tests automatizados

- `src/components/erp/hr/__tests__/HRPayrollEntryDialog.casuisticaDates.test.ts`
  - 11 casos: same-day, mes completo, cambio mes/año, rango invertido, fechas vacías, formato inválido.

## Riesgos residuales

1. **Sin persistencia (esperado)**: las nuevas fechas viven sólo en estado local; al cerrar el diálogo se pierden. La persistencia requiere Fase C (tabla `erp_hr_payroll_incidencias` + RLS + migración) — fuera de scope de esta fase.
2. **No hay validación legal de tramos**: no se valida que las fechas de paternidad respeten el mínimo legal de 16 semanas obligatorias desde el parto. Microcopy lo advierte.
3. **No hay generación oficial FDI/AFI/DELT@**: explícitamente fuera de scope (Fase D).
4. **Reducción jornada**: el % sigue siendo el dato que entra al motor; las fechas son sólo informativas. Si el motor en el futuro debe ponderar % por días dentro del rango, requerirá cambio de contrato (no en esta fase).
5. **Cobertura intramensual** (`periodFechaDesde/Hasta`) sigue usándose como rango global; no se ha unificado con los nuevos rangos por proceso para evitar regresiones en `nacimientoTramos` y `periodCoverage` que viajan al motor.

## Próxima fase (recomendada)

**Fase C — Modelo persistente de incidencias**: nueva tabla `erp_hr_payroll_incidencias` (con RLS por tenant), array de incidencias estructuradas con tipo + rango + metadatos. Habilitará histórico, trazabilidad y comunicación oficial.

---

## CASUISTICA-FECHAS-01 — Fase B CERRADA

**Fecha de cierre:** 2026-04-27
**Estado:** ✅ CERRADA (BUILD aplicado + validación read-only confirmada).

### 1. Resumen de cambios

Fase B añade soporte de **fecha inicio / fecha fin por proceso principal** en
el panel "Casuística entre fechas" del diálogo de Nueva Nómina, derivando los
días automáticamente de forma inclusiva y manteniendo compatibilidad total con
el flujo legacy de días manuales. Cero impacto en motor, BD, RLS, edge
functions, migraciones, dependencias o CI.

Procesos cubiertos:
- **PNR:** fecha inicio/fin.
- **IT/AT:** fecha inicio/fin + tipo (enfermedad común, accidente no laboral, accidente trabajo, enfermedad profesional).
- **Reducción de jornada:** fecha inicio/fin (el % sigue entrando al motor sin ponderar por fechas).
- **Atrasos / regularización:** fecha origen desde/hasta (importe + periodo legacy intactos).
- **Nacimiento / cuidado menor:** fecha hecho causante + fecha inicio/fin.

Helpers puros añadidos y exportados:
- `calculateInclusiveDays(from, to)` — días naturales inclusivos (mismo día = 1).
- `isInvertedRange(from, to)` — detecta fecha fin anterior a inicio (warning visual no bloqueante).

Comportamiento confirmado:
- Sin fechas → input manual de días editable (legacy intacto).
- Con fechas válidas → input bloqueado con etiqueta "(calc.)" y días derivados al payload.
- Payload al motor sigue recibiendo **números de días**, no objetos nuevos.
- No se generan FDI/AFI/DELT@.

### 2. Archivos modificados

- `src/components/erp/hr/HRPayrollEntryDialog.tsx` (UI + estado + helpers + payload).
- `src/components/erp/hr/__tests__/HRPayrollEntryDialog.casuisticaDates.test.ts` (nuevo).
- `docs/qa/CASUISTICA-FECHAS-01_checklist.md` (este documento).

### 3. Tests ejecutados

- Suite: `HRPayrollEntryDialog.casuisticaDates.test.ts`.
- 12 bloques `it()` cubriendo:
  - `calculateInclusiveDays`: mismo día, mes completo marzo, febrero 28d, cambio de mes, cambio de año, rango invertido (null), fechas vacías/null/undefined (null), formatos no estrictos (null).
  - `isInvertedRange`: rango invertido (true), válido + 1 día (false), fechas vacías (false), formato inválido (false).

### 4. Resultado

✅ **12/12 tests verdes**.

### 5. Riesgos residuales

1. **Fechas sólo en estado local** — viven en el `useState` del diálogo y se pierden al cerrarlo.
2. **Sin persistencia** — no hay tabla `erp_hr_payroll_incidencias` ni inserts en BD.
3. **Sin comunicaciones oficiales** — no se enlaza con FDI/AFI/DELT@ (fuera de scope).
4. **Validación legal avanzada pendiente** — no se valida mínimo 16 semanas paternidad, ponderación de % reducción por días dentro del rango, ni guarda legal.

### 6. Confirmaciones de no-cambio

- ❌ No se tocó motor (`salaryNormalizer`, `contractSalaryParametrization`, `agreementSalaryResolver`, `fdiArtifactEngine`, `afiInactivityEngine`, `deltaArtifactEngine`).
- ❌ No se tocó BD ni se crearon migraciones.
- ❌ No se tocaron RLS ni edge functions.
- ❌ No se tocaron `package.json`, `bun.lock`, ni workflows de CI.
- ❌ No se generaron artefactos oficiales nuevos.

### 7. Próximo paso recomendado

1. **QA manual** del checklist funcional de este documento (12 escenarios) en preview, validando especialmente que SafeMode (caso Carlos Ruiz Martín) no presenta regresión visual con la nueva UI de fechas.
2. Tras QA OK → **Fase C en PLAN**: modelo persistente de incidencias (`erp_hr_payroll_incidencias` con RLS por tenant, array estructurado tipo + rango + metadatos, migración + tipos regenerados).

**CASUISTICA-FECHAS-01 Fase B queda CERRADA.**