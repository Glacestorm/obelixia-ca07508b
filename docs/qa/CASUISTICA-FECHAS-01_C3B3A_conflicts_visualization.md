# CASUISTICA-FECHAS-01 — Fase C3B3A
## Helper `buildEffectiveCasuistica` + UI de conflictos local vs persistido

**Estado:** BUILD entregado · vista informativa, sin impacto en cálculo.

## Objetivo
Detectar y mostrar visualmente los conflictos entre datos locales (Fase B) y
procesos persistidos (`erp_hr_payroll_incidents`, `erp_hr_it_processes`,
`erp_hr_leave_requests` vía adapter C2), proponiendo una fuente única por
campo, **sin alterar todavía** el cálculo de nómina.

## Política anti doble conteo
- Una sola fuente por campo: nunca se suman local + persistido.
- Modo por defecto: `persisted_priority` (persistido > local).
- Cobertura del periodo (`periodFechaDesde/Hasta`, `periodMotivo`,
  `periodDiasNaturales`, `periodDiasEfectivos`) **siempre local**.
- `unmapped` (desplazamiento temporal, suspensión empleo/sueldo) **nunca**
  entra en `effective`; se muestra como "No aplicado al motor".

## Modos soportados
| Modo | Comportamiento C3B3A |
|---|---|
| `persisted_priority` | Persistido gana en conflicto. Recomendado. |
| `local_priority` | Local gana, conflicto registrado. Transición. |
| `manual_override` | Resolución por campo vía `manualOverrides`. |
| `sum_explicit` | Tratado como local + warning. **No suma** en C3B3A. |

## Qué muestra la UI
`HRCasuisticaConflictsPanel` se renderiza dentro de `HRPersistedIncidentsPanel`
cuando hay conflictos, unmapped o `blockingForClose`. Incluye:
- Banner de aviso de doble conteo + modo activo.
- Texto obligatorio: *"Vista informativa. El cálculo actual sigue usando
  datos locales hasta C3B3B."*
- Tabla: Tipo · Local · Persistido · Fuente propuesta · Revisión legal · Motivo.
- Badges: `Persistido prioridad`, `Local`, `Manual override`,
  `Requiere revisión legal`, `No aplicado al motor`.
- Sección "No aplicado al cálculo" para `unmappedInformative`.
- **Sin botones de mutación.** Sin override funcional. Sin bloqueo de cierre.

## Confirmaciones de invariantes
- ✅ No se modificó `simulateES` ni el payload del motor.
- ✅ No se tocó `salaryNormalizer.ts`, `contractSalaryParametrization.ts`,
  `agreementSalaryResolver.ts`, `fdiArtifactEngine.ts`,
  `afiInactivityEngine.ts`, `deltaArtifactEngine.ts`.
- ✅ Sin generación FDI/AFI/DELT@.
- ✅ Sin writes (insert/update/upsert/delete). Sin service_role.
- ✅ Sin migraciones, RLS, edge functions, dependencias ni CI.
- ✅ Helper puro y determinista (no muta inputs).

## Tests entregados
- `src/lib/hr/__tests__/effectiveCasuistica.test.ts` (15 casos):
  - sin conflicto (solo local / solo persistido),
  - conflicto PNR/Reducción/Atrasos/IT/Nacimiento,
  - IT nunca suma,
  - cobertura periodo siempre local,
  - `local_priority`, `manual_override` (local y persisted), `sum_explicit`,
  - `legalReviewRequired` → `blockingForClose=true`,
  - pureza y determinismo.
- `src/components/erp/hr/casuistica/__tests__/HRCasuisticaConflictsPanel.test.tsx`
  (5 casos): no renderiza vacío, banner, fuente propuesta, unmapped, badge legal,
  sin botones.
- `HRPersistedIncidentsPanel.test.tsx`: cobertura del panel integrado.

## Riesgos residuales
- El cálculo de nómina **sigue consumiendo solo datos locales**. La fuente
  recomendada por el helper aún no se aplica → riesgo de divergencia entre
  "Fuente propuesta" mostrada y resultado real hasta C3B3B.
- El override manual está modelado en el helper pero la UI aún no expone
  controles funcionales.
- `sum_explicit` está reservado para evolución futura; no debe activarse sin
  validación legal.

## Próximo paso
**CASUISTICA-FECHAS-01 Fase C3B3B PLAN**: conectar `effectiveCasuistica` al
motor (`simulateES`) en modo `persisted_priority`, con feature flag de
seguridad, snapshot tests de regresión y bloqueo opcional de cierre cuando
`blockingForClose=true`.

## Cierre
C3B3A queda **entregado** y operativo como vista informativa.

---

## CASUISTICA-FECHAS-01 — Fase C3B3A CERRADA

**Fecha de cierre:** 2026-04-27

### 1. Resumen
- Helper puro `buildEffectiveCasuistica` creado.
- Panel `HRCasuisticaConflictsPanel` creado.
- Integración visual en `HRPersistedIncidentsPanel`.
- Detección de conflictos local vs persistido operativa.
- Fuente recomendada visible por campo.
- `unmapped` mostrado como "No aplicado al motor".
- Cálculo real de nómina **todavía sin cambios**.

### 2. Archivos creados
- `src/lib/hr/effectiveCasuistica.ts`
- `src/lib/hr/__tests__/effectiveCasuistica.test.ts`
- `src/components/erp/hr/casuistica/HRCasuisticaConflictsPanel.tsx`
- `src/components/erp/hr/casuistica/__tests__/HRCasuisticaConflictsPanel.test.tsx`
- `docs/qa/CASUISTICA-FECHAS-01_C3B3A_conflicts_visualization.md`

### 3. Archivos modificados mínimamente
- `src/components/erp/hr/casuistica/HRPersistedIncidentsPanel.tsx`
- `src/components/erp/hr/casuistica/__tests__/HRPersistedIncidentsPanel.test.tsx`

### 4. Confirmaciones
- ✅ Sin tocar `simulateES`.
- ✅ Sin tocar `salaryNormalizer.ts`.
- ✅ Sin tocar `contractSalaryParametrization.ts`.
- ✅ Sin tocar `agreementSalaryResolver.ts`.
- ✅ Sin tocar motores payroll.
- ✅ Sin cambiar payload del motor.
- ✅ Sin insert/update/upsert/delete.
- ✅ Sin service_role.
- ✅ Sin `applied_at`.
- ✅ Sin `applied_to_record_id`.
- ✅ Sin recálculos.
- ✅ Sin FDI/AFI/DELT@.
- ✅ Sin migraciones.
- ✅ Sin RLS.
- ✅ Sin edge functions.
- ✅ Sin dependencias.
- ✅ Sin CI.

### 5. Tests
- **33/33 tests verdes.**
- `effectiveCasuistica`: 16 tests.
- `HRCasuisticaConflictsPanel`: 6 tests.
- `HRPersistedIncidentsPanel`: 11 tests.

### 6. Riesgos residuales
- Divergencia visual entre "fuente propuesta" y cálculo real hasta C3B3B.
- Override manual modelado en helper pero sin UI funcional aún.
- `sum_explicit` reservado para futuro; no debe activarse sin validación legal.
- El motor de nómina sigue consumiendo solo datos locales.

### 7. Próximo paso recomendado
**CASUISTICA-FECHAS-01 Fase C3B3B PLAN** — conexión de `effectiveCasuistica`
al motor (`simulateES`) con feature flag de seguridad, QA de regresión,
snapshot tests y bloqueo opcional de cierre cuando `blockingForClose=true`.

**Estado final:** Fase C3B3A **CERRADA**.