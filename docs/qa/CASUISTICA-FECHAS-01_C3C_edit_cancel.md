# CASUISTICA-FECHAS-01 — Fase C3C: edición y cancelación segura

**Fecha:** 2026-04-27
**Estado:** BUILD completado, tests verdes.

## 1. Objetivo
Permitir editar y cancelar (soft-delete) incidencias persistidas en
`erp_hr_payroll_incidents` con trazabilidad completa, sin DELETE físico,
sin recálculo de nómina, sin activar `persisted_priority_apply` y sin
generar comunicaciones oficiales.

## 2. Alcance
- `updatePayrollIncident(id, patch)` — UPDATE filtrado.
- `cancelPayrollIncident(id, reason)` — soft-delete con motivo obligatorio.
- UI: columna "Acciones" con Editar/Cancelar en `HRPersistedIncidentsPanel`.
- Reutilización de `HRPayrollIncidentFormDialog` con `mode='edit'`.
- Nuevo `HRCancelIncidentDialog` (motivo ≥5 chars).

## 3. Campos editables
`applies_from`, `applies_to`, `units`, `amount`, `percent`, `notes`,
`metadata`, `requires_ss_action`, `requires_tax_adjustment`,
`requires_external_filing`, `legal_review_required`,
`official_communication_type`.

## 4. Campos PROHIBIDOS (filtrados defensivamente en cliente)
`id`, `company_id`, `employee_id`, `created_by`, `created_at`,
`applied_at`, `applied_to_record_id`, `deleted_at`, `deleted_by`,
`incident_type`, `concept_code`, `period_year`, `period_month`,
`version`, `cancellation_reason`, `status`.

Constante exportada: `FORBIDDEN_UPDATE_KEYS` en
`src/hooks/erp/hr/usePayrollIncidentMutations.ts`.

## 5. Reglas de cancelación
- `reason.trim().length >= 5` obligatorio.
- UPDATE con `{ deleted_at, deleted_by, cancellation_reason, status:'cancelled' }`.
- Guardrails: `.eq('id', id).is('deleted_at', null).is('applied_at', null)`.
- Si `applied_at IS NOT NULL`: bloqueado en UI + filtro en query.

## 6. Confirmaciones de seguridad
- ❌ **No DELETE físico.** Test estático
  `src/__tests__/security/casuisticaNoPhysicalDelete.test.ts` verifica 0 hits
  funcionales de `.delete(` en `usePayrollIncidentMutations.ts`,
  `useHRPayrollIncidencias.ts` y `src/components/erp/hr/casuistica/`.
- ❌ **No `applied_at` tocado.** Filtrado en `FORBIDDEN_UPDATE_KEYS`.
- ❌ **No recálculos.** Mutaciones aisladas a `erp_hr_payroll_incidents`.
- ❌ **No comunicaciones oficiales.** No se invocan `fdiArtifactEngine`,
  `afiInactivityEngine`, `deltaArtifactEngine`.
- ❌ **No service_role.** Cliente Supabase autenticado (RLS multi-tenant).
- ❌ **No cambios en motor de nómina** ni en `simulateES`.
- ❌ **No migraciones / RLS / edge functions / dependencias / CI tocados.**
- ✅ `PAYROLL_EFFECTIVE_CASUISTICA_MODE` sigue en
  `persisted_priority_preview` (sin cambios).
- ✅ `persisted_priority_apply` sigue **OFF**.

## 7. Tests ejecutados
- `usePayrollIncidentMutations.test.ts` — 12/12 ✅
  (3 C3B1 originales + 9 nuevos C3C update/cancel).
- `HRPayrollIncidentFormDialog.test.tsx` — 7/7 ✅.
- `HRPersistedIncidentsPanel.test.tsx` — 12/12 ✅.
- `casuisticaNoPhysicalDelete.test.ts` — 1/1 ✅ (no `.delete(` en scope).

**Total C3C: 32/32 verdes.**

## 8. Riesgos residuales
- **Cancelación de incidencia ya aplicada:** bloqueada por triple barrera
  (UI disabled + guardrail `.is('applied_at', null)` + trigger C1
  `protect_applied_payroll_incidents`). Diferida a C4 (recálculo).
- **Concurrencia (race en UPDATE):** last-write-wins en C3C. Locking
  optimista basado en `version` queda para C4.
- **`incident_type` no editable:** decisión consciente para no romper
  `concept_code` ni mapping legacy. Workflow alternativo: cancelar + crear.

## 9. Próximo paso
- **C3B3C2 sigue BLOQUEADO** hasta completar el checklist legal/manual de
  12 puntos (`docs/qa/CASUISTICA-FECHAS-01_C3B3C_QA_LEGAL_MANUAL_CHECKLIST.md`
  + `docs/qa/CASUISTICA-FECHAS-01_C3B3C_MANUAL_VALIDATION_PACK.md`).
- **C4 (recálculo + apply):** edición/cancelación de incidencias aplicadas
  con flujo de recálculo. Fuera de alcance C3C.

## 10. Archivos
**Creados:**
- `src/components/erp/hr/casuistica/HRCancelIncidentDialog.tsx`
- `src/__tests__/security/casuisticaNoPhysicalDelete.test.ts`
- `docs/qa/CASUISTICA-FECHAS-01_C3C_edit_cancel.md`

**Modificados:**
- `src/hooks/erp/hr/usePayrollIncidentMutations.ts`
- `src/components/erp/hr/casuistica/HRPayrollIncidentFormDialog.tsx`
- `src/components/erp/hr/casuistica/HRPersistedIncidentsPanel.tsx`
- `src/hooks/erp/hr/__tests__/usePayrollIncidentMutations.test.ts`