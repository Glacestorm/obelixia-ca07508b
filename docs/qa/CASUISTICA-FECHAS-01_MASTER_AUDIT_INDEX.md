# CASUISTICA-FECHAS-01 — Índice maestro de auditoría final

**Fecha de emisión:** 2026-04-27
**Modo:** Auditoría documental (read-only).
**Alcance:** Fase B → Fase C3C (incluida QA legal/manual previa a C3B3C2).

---

## 1. Estado ejecutivo

- CASUISTICA-FECHAS-01 está **documentalmente cerrado hasta C3C**.
- **Preview persistido activo por defecto:**
  `PAYROLL_EFFECTIVE_CASUISTICA_MODE = 'persisted_priority_preview'`.
- **`persisted_priority_apply` sigue OFF.** El payload real enviado a
  `simulateES` continúa siendo el local; el modo preview solo activa
  visibilidad (banner + columna "Fuente aplicada al cálculo").
- **C3B3C2 BLOQUEADA** hasta completar y firmar el manual validation pack
  (puntos 9–12 con evidencia de Legal / RRHH / Compliance).
- **Motor de nómina y motores legales NO modificados** en ninguna fase
  (incluye `salaryNormalizer.ts`, `contractSalaryParametrization.ts`,
  `agreementSalaryResolver.ts`, `fdiArtifactEngine.ts`,
  `afiInactivityEngine.ts`, `deltaArtifactEngine.ts`, `simulateES`).
- **Comunicaciones oficiales NO generadas ni enviadas.**
  No FDI / no AFI / no DELT@.
- El sistema actualmente permite:
  - registrar fechas inicio/fin por proceso de casuística local,
  - persistir incidencias en `erp_hr_payroll_incidents`,
  - promover datos locales → incidencias persistidas,
  - visualizar conflictos local vs persistido,
  - editar / cancelar incidencias **no aplicadas** con soft-delete y
    motivo obligatorio,
  - mantener trazabilidad completa (sin DELETE físico).

---

## 2. Tabla maestra de fases

| Fase | Objetivo | Estado | Documento QA | Archivos clave | Tests asociados | Riesgos residuales | Próximo paso |
|------|----------|--------|--------------|----------------|-----------------|-------------------|--------------|
| **B** | Fechas inicio/fin por proceso en casuística local | ✅ Cerrada | `CASUISTICA-FECHAS-01_checklist.md` | `src/lib/hr/casuisticaTypes.ts`, `src/lib/hr/casuisticaDates.ts`, `src/components/erp/hr/HRPayrollEntryDialog.tsx` | `casuisticaDates.test`, `HRPayrollEntryDialog.casuisticaDates` (cobertura local) | Fechas locales no persistidas hasta promoción | C1 |
| **C1** | Endurecer `erp_hr_payroll_incidents`: soft-delete, versionado, triggers, índices | ✅ Cerrada | `CASUISTICA-FECHAS-01_C1_migration.md` | Migración SQL (ver anexo) | Verificación vía `usePayrollIncidentMutations.test` y `casuisticaNoPhysicalDelete.test` | RLS multi-tenant verificada; sin ghost tables | C2 |
| **C2** | Hook read-only + adapter persistido → CasuisticaState legacy | ✅ Cerrada | `CASUISTICA-FECHAS-01_C2_hook_adapter.md` | `src/hooks/erp/hr/useHRPayrollIncidencias.ts`, `src/lib/hr/incidenciasTypes.ts`, `src/lib/hr/incidenciasMapper.ts` | `incidenciasMapper.test` | `unmapped` puede aparecer; queda fuera del cálculo | C3A |
| **C3A** | Panel read-only de procesos persistidos | ✅ Cerrada | `CASUISTICA-FECHAS-01_C3A_readonly_ui.md` | `src/components/erp/hr/casuistica/HRPersistedIncidentsPanel.tsx`, `IncidentTypeBadge.tsx`, `IncidentStatusBadge.tsx` | `HRPersistedIncidentsPanel.test` (vista read-only) | Sin acciones aún | C3B1 |
| **C3B1** | Alta manual de incidencias persistentes | ✅ Cerrada | `CASUISTICA-FECHAS-01_C3B1_create_modal.md` | `src/components/erp/hr/casuistica/HRPayrollIncidentFormDialog.tsx`, `src/hooks/erp/hr/usePayrollIncidentMutations.ts` (create) | `HRPayrollIncidentFormDialog.test`, `usePayrollIncidentMutations.test` | Validación de fechas/tipo dependiente de triggers | C3B2 |
| **C3B2** | Promoción local → incidencias persistentes | ✅ Cerrada | `CASUISTICA-FECHAS-01_C3B2_promotion.md` | `src/lib/hr/incidenciasPromotion.ts`, `HRPromoteLocalCasuisticaDialog.tsx` | `incidenciasPromotion.test`, `HRPromoteLocalCasuisticaDialog.test` | Promoción no fuerza recálculo | C3B3A |
| **C3B3A** | Helper `effectiveCasuistica` + UI de conflictos | ✅ Cerrada | `CASUISTICA-FECHAS-01_C3B3A_conflicts_visualization.md` | `src/lib/hr/effectiveCasuistica.ts`, `src/components/erp/hr/casuistica/HRCasuisticaConflictsPanel.tsx` | `effectiveCasuistica.test`, `HRCasuisticaConflictsPanel.test` | Resolución de conflicto es informativa, no bloqueante | C3B3B-paso1 |
| **C3B3B-paso1** | Feature flag tipado + preview visual | ✅ Cerrada | `CASUISTICA-FECHAS-01_C3B3B_step1_preview_mode.md` | `src/lib/hr/payrollEffectiveCasuisticaFlag.ts` | `payrollEffectiveCasuisticaFlag.test` | Flag controla solo visibilidad | C3B3B-paso2 |
| **C3B3B-paso2** | Wiring técnico con `apply` OFF por defecto | ✅ Cerrada | `CASUISTICA-FECHAS-01_C3B3B_step2_engine_wiring.md` | `src/components/erp/hr/HRPayrollEntryDialog.tsx` (wiring `casuisticaForEngine`) | `effectiveCasuistica.engineWiring.test`, `HRPayrollEntryDialog.effectiveCasuistica.test` | Apply solo sustituye payload si flag = `apply` (OFF) | C3B3C1 |
| **C3B3C1** | Default operativo `persisted_priority_preview` | ✅ Cerrada | `CASUISTICA-FECHAS-01_C3B3C1_preview_default.md` | `src/lib/hr/payrollEffectiveCasuisticaFlag.ts` | `payrollEffectiveCasuisticaFlag.test` | Cálculo real sigue local | QA legal/manual C3B3C |
| **QA legal/manual C3B3C** | Checklist 12 puntos + execution report + manual pack previo a C3B3C2 | 🟡 En espera de firma | `CASUISTICA-FECHAS-01_C3B3C_QA_LEGAL_MANUAL_CHECKLIST.md`, `CASUISTICA-FECHAS-01_C3B3C_QA_EXECUTION_REPORT.md`, `CASUISTICA-FECHAS-01_C3B3C_MANUAL_VALIDATION_PACK.md` | 62/62 verdes (auto) — puntos 9–12 manuales pendientes | Puntos 9 (unmapped), 10 (legal_review), 11 (SafeMode), 12 (oficiales) sin firma | Ejecución manual + firma |
| **C3C** | Edición y cancelación segura (soft-delete) de incidencias persistidas no aplicadas | ✅ Cerrada | `CASUISTICA-FECHAS-01_C3C_edit_cancel.md` | `usePayrollIncidentMutations.ts` (update/cancel), `HRPayrollIncidentFormDialog.tsx` (modo edit), `HRPersistedIncidentsPanel.tsx`, `HRCancelIncidentDialog.tsx` | `usePayrollIncidentMutations.test`, `casuisticaNoPhysicalDelete.test` (estático) — 32/32 verdes | Last-write-wins; no se editan aplicadas; cambiar `incident_type` requiere cancelar+crear | Bloqueada hasta firma manual pack |
| **C3C-UX** | Visual polish del modal `HRPayrollIncidentFormDialog`: cabecera, contraste, banners accesibles, asteriscos rojos en obligatorios y bloque de errores agrupado | ✅ Cerrada | `CASUISTICA-FECHAS-01_C3C_visual_polish_modal.md` | `src/components/erp/hr/casuistica/HRPayrollIncidentFormDialog.tsx`, `src/components/erp/hr/casuistica/__tests__/HRPayrollIncidentFormDialog.test.tsx` | Tests visuales del modal ampliados (suite C3C visual polish, 7 asserts) | Ninguno funcional; cambio visual/accesibilidad. Motor y cálculo intactos | Ninguno; bloque cerrado |
| **WIZ-PLAN** | Diseño documental de guía asistida para nóminas con convenio dudoso, conceptos no claros, SafeMode o necesidad de intervención humana | 📋 PLAN cerrado — no implementado | `RRHH_NOMINA_GUIA_ASISTIDA_CONVENIO_DUDOSO_PLAN.md` | Documento Markdown únicamente | No aplica todavía; tests futuros definidos en el plan | Guía no implementada; requiere fase WIZ-A separada; no sustituye revisión humana ni asesoría legal/laboral | WIZ-A PLAN/BUILD separado, solo con aprobación explícita |
| **C3B3C2** | Activación controlada de `persisted_priority_apply` | ⛔ BLOQUEADA | (sin documento aún) | (no aplica) | (no aplica) | Apply afectaría payload real al motor → requiere QA 12/12 firmado | Completar y firmar manual pack |
| **C4** | Recálculo + aplicación a nómina + locking optimista por `version` + edición/cancelación de aplicadas con flujo de reverso | ⛔ FUTURA | (sin documento aún) | (no aplica) | (no aplica) | Requiere C3B3C2 cerrada y validada | C3B3C2 firmada |

---

## 3. Invariantes legales protegidas

Auditadas y confirmadas en este corte:

- ✅ **No doble conteo** en apply test-only: el payload del motor o usa
  local o usa persistido, nunca ambos.
- ✅ Local + persistido **no se suman automáticamente** en ninguna ruta.
- ✅ Incidencias `unmapped` **no entran al cálculo** (visibles en UI,
  excluidas del payload).
- ✅ `period*` (periodo de nómina) **siempre local** — la casuística
  persistida nunca redefine el periodo de cálculo.
- ✅ `legal_review_required` **visible en UI** (badge/warning).
- ✅ Incidencias con `applied_at != null` **no se editan ni cancelan**
  en C3C (diferido a C4 con flujo de reverso).
- ✅ **No DELETE físico** en ningún flujo de casuística (verificado por
  `casuisticaNoPhysicalDelete.test` estático: 0 hits funcionales de
  `.delete()`).
- ✅ Cancelación = **soft-delete** con `deleted_at`, `deleted_by`,
  `cancellation_reason` obligatorio (mín. 5 caracteres) y
  `status = 'cancelled'`.
- ✅ **Sin `service_role`** en frontend ni en mutations: cliente Supabase
  autenticado con JWT del usuario, RLS activa.
- ✅ **RLS multi-tenant intacta** sobre `erp_hr_payroll_incidents`
  (aislamiento por `company_id`).
- ✅ **Sin comunicaciones oficiales** generadas ni enviadas en ninguna
  fase (B → C3C).
- ✅ **Sin FDI / AFI / DELT@** producidos.
- ✅ **Motores legales intactos:** `salaryNormalizer.ts`,
  `contractSalaryParametrization.ts`, `agreementSalaryResolver.ts`,
  `fdiArtifactEngine.ts`, `afiInactivityEngine.ts`,
  `deltaArtifactEngine.ts`, `simulateES`.
- ✅ **`persisted_priority_apply` OFF** — el cálculo real sigue
  consumiendo casuística local.
- ✅ `isRealSubmissionBlocked() === true` respetado donde aplica
  (invariante global de la plataforma; ver
  `mem://constraints/erp-hr-official-submission-safety`).

---

## 4. Estado fuente de verdad

### Estado actual
- **Flag:** `PAYROLL_EFFECTIVE_CASUISTICA_MODE = 'persisted_priority_preview'`.
- **Visibilidad:** preview persistido visible en UI (banner + columna
  "Fuente aplicada al cálculo").
- **Cálculo real:** sigue consumiendo casuística **local** vía
  `simulateES` (payload no sustituido).
- **Apply:** **OFF**. `isEffectiveCasuisticaApplyEnabled()` retorna
  `false` con el default actual.

### Estado futuro (no autorizado todavía)
- Activación de `persisted_priority_apply` solo tras:
  1. Manual validation pack puntos 9–12 con evidencia,
  2. Firma de Legal / RRHH / Compliance,
  3. C3B3C2 PLAN aprobado,
  4. C3B3C2 BUILD ejecutado en condiciones controladas.

### Rollback
- **Inmediato:** cambiar el default del flag a `'local_only'` y
  desplegar. No requiere migración ni cambios de BD. La UI vuelve a
  mostrar exclusivamente datos locales y el wiring técnico se
  desactiva.

---

## 5. Estado UI

Componentes operativos (sin cambios funcionales en este cierre):

- **Panel de procesos persistidos:** `HRPersistedIncidentsPanel.tsx`
  con tabla, badges y acciones Editar/Cancelar.
- **Alta manual:** `HRPayrollIncidentFormDialog.tsx` (modo `create`).
- **Edición:** `HRPayrollIncidentFormDialog.tsx` (modo `edit`,
  `incident_type` deshabilitado).
- **Cancelación:** `HRCancelIncidentDialog.tsx` con motivo obligatorio.
- **Promoción local → persistido:** `HRPromoteLocalCasuisticaDialog.tsx`.
- **Conflictos local vs persistido:** `HRCasuisticaConflictsPanel.tsx`.
- **Badges de tipo y estado:** `IncidentTypeBadge.tsx`,
  `IncidentStatusBadge.tsx` (incluye estados `applied`, `cancelled`).
- **Warning legal visible:** marcado de `legal_review_required` en
  filas de la tabla.
- **`unmapped` visible pero no aplicado:** las filas sin mapping legal
  quedan marcadas y excluidas del payload del motor.
- **Bloqueos de UI:** filas con `applied_at != null` desactivan
  Editar/Cancelar; filas con `deleted_at != null` aparecen tachadas/
  badgeadas.
- **Modal `HRPayrollIncidentFormDialog` visualmente corregido (C3C-UX):**
  - cabecera sticky no truncada,
  - banners accesibles (ámbar para legal permanente, sky para info por
    tipo, red para excluidos / bloqueo),
  - campos obligatorios con asterisco rojo (`<Req/>`) y `aria-required`,
  - bloque de errores agrupado con cabecera "Revisa los siguientes
    campos:".
- **Guía asistida de nómina con convenio dudoso (WIZ-PLAN):**
  - solo diseñada,
  - no implementada,
  - prevista como wizard futuro (`HRPayrollManualGuidanceWizard`,
    Pasos 1–10, fases WIZ-A → WIZ-E).

---

## 6. Estado BD / RLS

Sin modificaciones en este cierre. Estado heredado de C1:

- Tabla `erp_hr_payroll_incidents` extendida en C1 con: `version`,
  `applied_at`, `applied_to_record_id`, `deleted_at`, `deleted_by`,
  `cancellation_reason`, `status`, `legal_review_required`,
  `incident_type`, `concept_code`, índices y triggers.
- **Triggers operativos:**
  - `validate type` — bloquea tipos no permitidos,
  - `validate dates` — coherencia inicio/fin,
  - `protect applied` — impide mutar incidencias con `applied_at`,
  - `prevent delete applied` — impide DELETE físico de aplicadas,
  - `updated_at` — refresco de timestamp si existe en el esquema.
- **RLS multi-tenant** auditada: aislamiento por `company_id` con
  `userClient` (JWT). Sin uso de `service_role` en este flujo.
- **Sin ghost tables.** No se introducen ni se referencian tablas
  inexistentes (cumple `mem://constraints/erp-hr-schema-ghost-tables`).
- **Sin tablas nuevas** posteriores a C1. C2 → C3C operan exclusivamente
  sobre `erp_hr_payroll_incidents`.

---

## 7. Riesgos residuales

- **C3B3C2 BLOQUEADA** hasta completar y firmar manual validation pack.
- **Puntos 9, 10, 11 y 12 pendientes** según
  `CASUISTICA-FECHAS-01_C3B3C_QA_EXECUTION_REPORT.md`:
  - 9: unmapped visibles pero excluidos del cálculo (firma demo),
  - 10: warnings y bloqueo de Guardar con `legal_review_required` (firma demo),
  - 11: SafeMode salarial invariante (verificación manual),
  - 12: ausencia de FDI/AFI/DELT@ y comunicaciones oficiales (firma).
- **Apply OFF** — el cálculo real no consume aún casuística persistida.
- **Bloqueo de "Guardar" no es definitivo** hasta que apply esté ON con
  reglas de bloqueo formalizadas.
- **`legal_review_required` sin workflow formal de aprobación**: hoy es
  un flag visible, no un estado con ruta de aprobación trazable.
- **Concurrencia last-write-wins en C3C.** Locking optimista por
  `version` queda diferido a C4.
- **C4 pendiente** para recálculo, aplicación efectiva a nómina,
  edición/cancelación de aplicadas con flujo de reverso y cierre.
- **Última milla oficial pendiente** (fase D futura): comunicaciones
  oficiales con `isRealSubmissionBlocked` siempre activo hasta firma
  legal/operativa.
- **Guía asistida (WIZ-PLAN) todavía no existe en UI.** El documento es
  diseño cerrado; no hay componente, hook ni tipos creados.
- La implementación futura debe hacerse **por fases WIZ-A → WIZ-E**, sin
  saltar etapas.
- La guía **no debe activar comunicaciones oficiales** ni sustituir el
  criterio humano / la asesoría legal/laboral.

---

## 8. Bloqueos explícitos

- ⛔ **No activar `persisted_priority_apply`.**
- ⛔ **No pedir C3B3C2 BUILD.**
- ⛔ **No aplicar incidencias persistidas a nómina.**
- ⛔ **No cerrar nómina usando persistido como fuente real.**
- ⛔ **No generar comunicaciones oficiales** (FDI / AFI / DELT@).
- ⛔ **No avanzar a C4** hasta completar validación legal/operativa de
  C3B3C2.
- ⛔ **No marcar el manual validation pack como firmado** sin evidencia
  real de Legal / RRHH / Compliance.

---

## 9. Próximos pasos recomendados

1. **Ejecutar manualmente** los puntos 9–12 del manual validation pack
   (`CASUISTICA-FECHAS-01_C3B3C_MANUAL_VALIDATION_PACK.md`) en entorno
   demo/test.
2. **Actualizar el QA execution report** con evidencias (capturas,
   payloads, firmas).
3. Si **12/12 OK firmado** → preparar **CASUISTICA-FECHAS-01 Fase
   C3B3C2 PLAN** (activación controlada de
   `persisted_priority_apply`).
4. Si **C3B3C2 PLAN aprobado** → ejecutar **C3B3C2 BUILD** (cambio de
   default del flag, monitorización, rollback inmediato disponible).
5. Tras C3B3C2 estable → **C4 PLAN**: aplicación a nómina, recálculo,
   locking optimista por `version`, cierre y auditoría inmutable.
6. **Fase D futura:** comunicaciones oficiales, siempre con
   `isRealSubmissionBlocked() === true` hasta validación legal/operativa
   independiente.

**Opción independiente (no bloqueante del flujo principal):**

- **WIZ-A PLAN/BUILD:** implementar solo Pasos 1–3 de la guía asistida
  (`HRPayrollManualGuidanceWizard`), sin BD, sin tocar motor de nómina y
  sin comunicaciones oficiales. Snapshot in-memory. Reusa el helper
  `<Req/>` de la fase C3C-UX.
- **Prioridad:** mantener prioridad superior del manual validation pack
  C3B3C puntos 9–12 antes de avanzar a C3B3C2. WIZ-A es pista paralela
  opcional, no condiciona ni desbloquea C3B3C2.

---

## 10. Anexo de archivos

### 10.1 Documentos QA (14)
- `docs/qa/CASUISTICA-FECHAS-01_checklist.md`
- `docs/qa/CASUISTICA-FECHAS-01_C1_migration.md`
- `docs/qa/CASUISTICA-FECHAS-01_C2_hook_adapter.md`
- `docs/qa/CASUISTICA-FECHAS-01_C3A_readonly_ui.md`
- `docs/qa/CASUISTICA-FECHAS-01_C3B1_create_modal.md`
- `docs/qa/CASUISTICA-FECHAS-01_C3B2_promotion.md`
- `docs/qa/CASUISTICA-FECHAS-01_C3B3A_conflicts_visualization.md`
- `docs/qa/CASUISTICA-FECHAS-01_C3B3B_step1_preview_mode.md`
- `docs/qa/CASUISTICA-FECHAS-01_C3B3B_step2_engine_wiring.md`
- `docs/qa/CASUISTICA-FECHAS-01_C3B3C1_preview_default.md`
- `docs/qa/CASUISTICA-FECHAS-01_C3B3C_QA_LEGAL_MANUAL_CHECKLIST.md`
- `docs/qa/CASUISTICA-FECHAS-01_C3B3C_QA_EXECUTION_REPORT.md`
- `docs/qa/CASUISTICA-FECHAS-01_C3B3C_MANUAL_VALIDATION_PACK.md`
- `docs/qa/CASUISTICA-FECHAS-01_C3C_edit_cancel.md`

**Documentos QA adicionales (anexos cerrados posteriores):**
- `docs/qa/CASUISTICA-FECHAS-01_C3C_visual_polish_modal.md`
- `docs/qa/RRHH_NOMINA_GUIA_ASISTIDA_CONVENIO_DUDOSO_PLAN.md`

### 10.2 Componentes UI
- `src/components/erp/hr/HRPayrollEntryDialog.tsx`
- `src/components/erp/hr/casuistica/HRPersistedIncidentsPanel.tsx`
- `src/components/erp/hr/casuistica/HRPayrollIncidentFormDialog.tsx`
- `src/components/erp/hr/casuistica/HRCancelIncidentDialog.tsx`
- `src/components/erp/hr/casuistica/HRCasuisticaConflictsPanel.tsx`
- `src/components/erp/hr/casuistica/HRPromoteLocalCasuisticaDialog.tsx`
- `src/components/erp/hr/casuistica/IncidentTypeBadge.tsx`
- `src/components/erp/hr/casuistica/IncidentStatusBadge.tsx`

### 10.3 Hooks
- `src/hooks/erp/hr/useHRPayrollIncidencias.ts`
- `src/hooks/erp/hr/usePayrollIncidentMutations.ts`

### 10.4 Libs
- `src/lib/hr/casuisticaTypes.ts`
- `src/lib/hr/casuisticaDates.ts`
- `src/lib/hr/incidenciasTypes.ts`
- `src/lib/hr/incidenciasMapper.ts`
- `src/lib/hr/incidenciasPromotion.ts`
- `src/lib/hr/effectiveCasuistica.ts`
- `src/lib/hr/payrollEffectiveCasuisticaFlag.ts`

### 10.5 Tests (13 archivos identificados)
- `src/lib/hr/__tests__/casuisticaDates.test.ts` — fechas/rango por proceso.
- `src/lib/hr/__tests__/incidenciasMapper.test.ts` — adapter persistido → legacy.
- `src/lib/hr/__tests__/incidenciasPromotion.test.ts` — promoción local → persistido.
- `src/lib/hr/__tests__/effectiveCasuistica.test.ts` — helper de resolución.
- `src/lib/hr/__tests__/effectiveCasuistica.engineWiring.test.ts` — wiring `apply` OFF.
- `src/lib/hr/__tests__/payrollEffectiveCasuisticaFlag.test.ts` — modos del flag.
- `src/components/erp/hr/__tests__/HRPayrollEntryDialog.effectiveCasuistica.test.tsx` — payload local invariante.
- `src/components/erp/hr/casuistica/__tests__/HRPersistedIncidentsPanel.test.tsx` — panel + acciones.
- `src/components/erp/hr/casuistica/__tests__/HRPayrollIncidentFormDialog.test.tsx` — alta + edición.
- `src/components/erp/hr/casuistica/__tests__/HRPromoteLocalCasuisticaDialog.test.tsx` — promoción UI.
- `src/components/erp/hr/casuistica/__tests__/HRCasuisticaConflictsPanel.test.tsx` — conflictos UI.
- `src/hooks/erp/hr/__tests__/usePayrollIncidentMutations.test.ts` — create/update/cancel + guardrails.
- `src/__tests__/security/casuisticaNoPhysicalDelete.test.ts` — análisis estático: 0 `.delete()` funcionales.

**Resultados documentados más recientes:**
- ✅ **32/32 verdes** en scope C3C (`C3C_edit_cancel.md`).
- ✅ **62/62 verdes** en QA previa C3B3C2 (`C3B3C_QA_EXECUTION_REPORT.md`).
- Recuento por fase individual: no documentado de forma desglosada.

### 10.6 Migración C1
- Identificada y descrita en `docs/qa/CASUISTICA-FECHAS-01_C1_migration.md`.
  Sin migraciones nuevas en C2 → C3C.

### 10.7 Archivos explícitamente NO tocados en B → C3C
- `src/lib/hr/salaryNormalizer.ts`
- `src/lib/hr/contractSalaryParametrization.ts`
- `src/lib/hr/agreementSalaryResolver.ts`
- `src/lib/hr/fdiArtifactEngine.ts`
- `src/lib/hr/afiInactivityEngine.ts`
- `src/lib/hr/deltaArtifactEngine.ts`
- `simulateES` (motor de simulación de nómina ES)
- Edge functions de comunicaciones oficiales (TGSS / SILTRA / AEAT / Contrat@ / DELT@)
- Cualquier conector oficial (`mem://constraints/erp-hr-aislamiento-conectores-oficiales`)

---

## 11. Veredicto final

> **CASUISTICA-FECHAS-01 queda en estado seguro de espera operativa: preview persistido activo, apply OFF, edición/cancelación segura disponible, y C3B3C2 bloqueada hasta validación manual/legal.**

---

**Confirmaciones de este cierre documental:**
- ❌ No se modificó ningún archivo `.ts` / `.tsx`.
- ❌ No se modificó ningún otro `.md`.
- ❌ No se cambiaron flags. `PAYROLL_EFFECTIVE_CASUISTICA_MODE` sigue
  en `'persisted_priority_preview'` y `persisted_priority_apply` sigue
  **OFF**.
- ❌ No se tocó BD / RLS / migraciones / edge functions /
  dependencias / CI.
- ❌ No se usó `service_role`. No hubo writes.
- ❌ No se generaron FDI / AFI / DELT@ ni comunicaciones oficiales.
- ❌ No se marcó C3B3C2 como desbloqueada.
- ❌ No se firmó el manual validation pack.

---

## Nota de actualización (anexos)

Tras el cierre del índice maestro inicial, se incorporan como anexos
cerrados el pulido visual del modal de incidencias
(`CASUISTICA-FECHAS-01_C3C_visual_polish_modal.md`, ✅ CERRADO) y el
plan de guía asistida para convenios dudosos
(`RRHH_NOMINA_GUIA_ASISTIDA_CONVENIO_DUDOSO_PLAN.md`, 📋 PLAN CERRADO —
NO IMPLEMENTADO). Ninguno altera el cálculo, el motor, los flags, la
BD, la RLS ni las comunicaciones oficiales. `persisted_priority_apply`
sigue **OFF** y **C3B3C2 sigue BLOQUEADA**.
