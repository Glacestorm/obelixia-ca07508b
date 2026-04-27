# CASUISTICA-FECHAS-01 — Fase C3B2: promoción de datos locales a incidencias persistentes

**Estado:** ✅ CERRADA — 2026-04-27.

## Objetivo
Permitir convertir los datos locales de la casuística (Fase B) en incidencias persistidas en `erp_hr_payroll_incidents`, con preview, detección de duplicados, omitidos por módulo especializado, confirmación explícita y sin tocar el motor de nómina ni generar comunicaciones oficiales.

## Archivos creados
- `src/lib/hr/incidenciasPromotion.ts` — función pura `buildIncidentsFromLocalCasuistica`.
- `src/lib/hr/__tests__/incidenciasPromotion.test.ts` — 14 tests.
- `src/components/erp/hr/casuistica/HRPromoteLocalCasuisticaDialog.tsx` — diálogo de promoción.
- `src/components/erp/hr/casuistica/__tests__/HRPromoteLocalCasuisticaDialog.test.tsx` — 7 tests.
- `docs/qa/CASUISTICA-FECHAS-01_C3B2_promotion.md`.

## Archivos modificados mínimamente
- `src/components/erp/hr/casuistica/HRPersistedIncidentsPanel.tsx`: prop `localCasuistica`, botón "Promover datos actuales", apertura del diálogo, `refetch()` post-promoción.
- `src/components/erp/hr/casuistica/__tests__/HRPersistedIncidentsPanel.test.tsx`: +3 tests (botón visible/habilitado/oculto).
- `src/components/erp/hr/HRPayrollEntryDialog.tsx`: una sola línea — pasa `localCasuistica={casuistica}` al panel ya existente.

## Reglas de promoción
- **PNR** (`pnr`): requiere `pnrFechaDesde + pnrFechaHasta + (pnrDias>0 || derivable)`. Output: `units`, `concept_code='ES_PNR'`, `requires_external_filing=true`, `official_communication_type='AFI'`.
- **Reducción jornada** (`reduccion_jornada_guarda_legal`): requiere fechas + `reduccionJornadaPct>0`. Output: `percent`, `legal_review_required=true`, `metadata.legal_guardianship=true`.
- **Atrasos** (`atrasos_regularizacion`): requiere `atrasosITImporte>0` y fechas (directas o derivadas de `atrasosITPeriodo` YYYY-MM). Output: `amount`, `requires_tax_adjustment=true`, `metadata.settlement_type='arrears'`, `metadata.period_origin`.
- Suspensión / desplazamiento / "otra": no se promueven automáticamente (no hay campo local Fase B); siguen disponibles vía alta manual C3B1.

## Reglas de duplicados
Match exacto contra `payrollIncidents` activos (`deleted_at == null` y `status !== 'cancelled'`):
- mismo `company_id`,
- mismo `employee_id`,
- mismo `incident_type`,
- mismo `applies_from`,
- mismo `applies_to`.

Si match → `duplicate` con `duplicateOfId`, no se crea. No se resuelven solapes parciales.

## Tipos omitidos (skipped_specialized)
- IT/AT/EP → "use el módulo IT/AT".
- Nacimiento / cuidado del menor / lactancia → "use el módulo de permisos".

## Confirmaciones de invariantes
- Solo `INSERT` vía `createPayrollIncident` de C3B1.
- Sin `update`, `upsert`, `delete`, `cancel`, `soft-delete`, `version bump`.
- Sin `service_role`.
- Sin `applied_at` ni `applied_to_record_id`.
- Sin recálculo. Sin cambios en payload del motor (`simulateES`, `liveBridgeCalc`, `derivedDays` intactos).
- Sin tocar motores ni engines FDI/AFI/DELT@.
- Sin generar comunicaciones oficiales (sólo se marcan flags pendientes en metadata).
- Sin migraciones, RLS, edge functions, dependencias ni CI.
- No limpia campos locales tras promover.
- No suma persistido + manual.
- Función pura: no muta input, no usa `Date.now()`, determinista.

## Tests ejecutados
5 archivos · 40/40 verdes:
- `incidenciasPromotion.test.ts` (14): vacío, PNR ok/derivado/incompleto/invertido, reducción ok, atrasos directos/derivados de periodo, IT/AT skipped, nacimiento skipped, duplicado activo, duplicado cancelado/deleted, mix, pureza.
- `HRPromoteLocalCasuisticaDialog.test.tsx` (7): nada que promover, 3 secciones, desmarcar deshabilita, N llamadas a `createPayrollIncident`, fallo mantiene abierto, todo OK cierra y `onPromoted`, no muta input.
- `HRPersistedIncidentsPanel.test.tsx` (9, +3 nuevos): botón visible+habilitado, deshabilitado sin datos promovibles, oculto sin `localCasuistica`.
- `usePayrollIncidentMutations.test.ts` (3) — regresión C3B1 intacta.
- `HRPayrollIncidentFormDialog.test.tsx` (7) — regresión C3B1 intacta.

Fallos restantes en la suite global (marketing, QuotationCalculator, agentApi, webVitals…) son **pre-existentes** y sin relación con HR ni con C3B2.

## Riesgos residuales
- Doble conteo si el usuario informa local + persistido: el motor sigue recibiendo el payload local. Mitigación: banner permanente en el diálogo + toast de aviso. Decisión sobre payload diferida a C3B3.
- Match exacto de duplicados puede dejar pasar solapes parciales (mismo tipo, rangos solapados pero no idénticos). Documentado; revisión manual.
- `concept_code` sembrado por defecto: alineación con `payrollConceptGlossary` queda para C4.
- `legal_review_required` sigue siendo recordatorio visual (sin workflow de aprobación; Fase D).
- Atrasos sin `period_origin` ni fechas → `skipped_incomplete` (esperado).

## Próximo paso recomendado
- **CASUISTICA-FECHAS-01 Fase C3B3 PLAN** — decisión sobre el payload del motor (sustituir local por persistido, con flags de override) y mitigación definitiva del doble conteo.
- Alternativamente **C3C PLAN** — edición / cancelación / soft-delete de incidencias persistidas.

**Estado final:** ✅ C3B2 CERRADA.

---

## CASUISTICA-FECHAS-01 — Fase C3B2 CERRADA

**Fecha de cierre:** 2026-04-27.

### 1. Resumen
- Promoción de datos locales implementada.
- Función pura `buildIncidentsFromLocalCasuistica`.
- Diálogo `HRPromoteLocalCasuisticaDialog`.
- Botón **"Promover datos actuales"** en panel persistido.
- Preview de creadas / duplicadas / omitidas.
- Confirmación explícita por checkbox.
- Creación secuencial usando `createPayrollIncident` (C3B1).

### 2. Archivos creados
- `src/lib/hr/incidenciasPromotion.ts`
- `src/lib/hr/__tests__/incidenciasPromotion.test.ts`
- `src/components/erp/hr/casuistica/HRPromoteLocalCasuisticaDialog.tsx`
- `src/components/erp/hr/casuistica/__tests__/HRPromoteLocalCasuisticaDialog.test.tsx`
- `docs/qa/CASUISTICA-FECHAS-01_C3B2_promotion.md`

### 3. Archivos modificados mínimamente
- `src/components/erp/hr/casuistica/HRPersistedIncidentsPanel.tsx`
- `src/components/erp/hr/casuistica/__tests__/HRPersistedIncidentsPanel.test.tsx`
- `src/components/erp/hr/HRPayrollEntryDialog.tsx`

### 4. Confirmaciones
- Solo `INSERT`.
- Sin `update`.
- Sin `upsert`.
- Sin `delete`.
- Sin `cancel`.
- Sin `soft-delete`.
- Sin version bump.
- Sin `service_role`.
- Sin `applied_at`.
- Sin `applied_to_record_id`.
- Sin recálculo.
- Sin cambios en payload del motor.
- Sin tocar `simulateES`.
- Sin tocar `liveBridgeCalc`.
- Sin tocar `derivedDays`.
- Sin tocar motores payroll.
- Sin tocar engines FDI / AFI / DELT@.
- Sin migraciones.
- Sin RLS.
- Sin edge functions.
- Sin dependencias.
- Sin CI.
- No limpia campos locales.

### 5. Mapping de promoción
- PNR local → `incident_type='pnr'`.
- Reducción local → `incident_type='reduccion_jornada_guarda_legal'`.
- Atrasos local → `incident_type='atrasos_regularizacion'`.
- IT / AT local → omitido (módulo IT/AT).
- Nacimiento / cuidado del menor → omitido (módulo de permisos).
- Suspensión / desplazamiento → no promovidos automáticamente (no existen en UI local Fase B).

### 6. Tests
- 40 / 40 tests verdes en archivos relevantes.
- `incidenciasPromotion`: 14 tests.
- `HRPromoteLocalCasuisticaDialog`: 7 tests.
- `HRPersistedIncidentsPanel`: 9 tests.
- `usePayrollIncidentMutations`: 3 tests.
- `HRPayrollIncidentFormDialog`: 7 tests.

### 7. Riesgos residuales
- Posible doble conteo local + persistido (payload del motor sigue siendo el local).
- Payload del motor aún manual / local.
- Match de duplicados solo exacto, no detecta solape parcial.
- `legal_review_required` sin workflow de aprobación.
- Comunicación oficial solo marcada en metadata, no generada.

### 8. Próximo paso recomendado
Decidir entre:
- **A) CASUISTICA-FECHAS-01 Fase C3B3 PLAN** — decisión sobre payload del motor (persistido vs. manual) y mitigación definitiva del doble conteo.
- **B) CASUISTICA-FECHAS-01 Fase C3C PLAN** — edición / cancelación / soft-delete de incidencias persistidas.

**Estado:** ✅ CASUISTICA-FECHAS-01 Fase C3B2 CERRADA.