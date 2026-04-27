# CASUISTICA-FECHAS-01 — Fase C3A: UI READ-ONLY de procesos persistidos

**Fecha:** 2026-04-27
**Modo:** BUILD restringido (sólo lectura).

## Objetivo

Integrar en `HRPayrollEntryDialog` un bloque visual que muestre los procesos
persistidos del empleado en el periodo seleccionado, consumiendo el hook
`useHRPayrollIncidencias` (Fase C2) y el adapter `mapIncidenciasToLegacyCasuistica`.

C3A es **estrictamente read-only**: sin alta, sin edición, sin cancelación,
sin promoción, sin sustitución del payload del motor.

## Archivos creados

- `src/components/erp/hr/casuistica/IncidentTypeBadge.tsx`
- `src/components/erp/hr/casuistica/IncidentStatusBadge.tsx`
- `src/components/erp/hr/casuistica/HRPersistedIncidentsPanel.tsx`
- `src/components/erp/hr/casuistica/__tests__/HRPersistedIncidentsPanel.test.tsx`
- `docs/qa/CASUISTICA-FECHAS-01_C3A_readonly_ui.md` (este documento)

## Archivo modificado

- `src/components/erp/hr/HRPayrollEntryDialog.tsx`
  - Añadido import del nuevo panel.
  - Insertado `<HRPersistedIncidentsPanel ... />` justo después del acordeón
    "Casuística entre fechas".
  - **Sin cambios** en `simulateES`, payload, SafeMode, cálculos, derivedDays
    ni casuística local. El motor sigue recibiendo el `casuistica` legacy.

## Qué muestra el bloque

- Tabla con todas las filas del periodo provenientes de:
  - `erp_hr_payroll_incidents` (PNR, reducción, atrasos, desplazamiento, suspensión, …)
  - `erp_hr_it_processes` (EC/AT/EP/ANL)
  - `erp_hr_leave_requests` (PAT/MAT/birth/corresponsabilidad)
- Columnas: Tipo · Origen · Inicio · Fin · Estado / Flags.
- Badges read-only:
  - **Read-only** y **Sin envíos oficiales** en cabecera.
  - **Revisión legal** si `legal_review_required` o `mapping.legalReviewRequired`.
  - **{AFI|FDI|DELT@} pendiente** si `requires_external_filing` u
    `official_communication_type`.
  - **SS pendiente / Ajuste fiscal** si los flags correspondientes están en true.
  - **Aplicada vN** si `applied_at` no es null.
  - **Cancelada** si `deleted_at` no es null.
- Resumen informativo del impacto derivado (`pnrDias`, `itAtDias`,
  `reduccionJornadaPct`, `atrasosITImporte`, `nacimientoDias`, tipo IT,
  nº de trazas, nº de no mapeadas).
- Avisos globales si hay revisión legal, no mapeadas o comunicación oficial pendiente.
- Botón "Añadir proceso" presente pero **deshabilitado** con tooltip
  "Disponible en Fase C3B".

## Qué NO hace C3A

- ❌ NO ejecuta `.insert / .update / .upsert / .delete`.
- ❌ NO usa `service_role` (sólo cliente Supabase autenticado bajo RLS).
- ❌ NO genera FDI / AFI / DELT@.
- ❌ NO marca `applied_at`.
- ❌ NO modifica el motor de nómina (`simulateES`, salaryNormalizer,
  contractSalaryParametrization, agreementSalaryResolver).
- ❌ NO sustituye el payload `casuistica` legacy enviado al motor.
- ❌ NO toca BD / migraciones / RLS / edge functions / dependencias / CI.

## QA manual recomendado

1. Abrir Nueva Nómina (`/obelixia-admin/erp?tab=hr`).
2. Seleccionar empresa, mes y empleado.
3. Verificar que aparece el bloque "Procesos entre fechas persistidos"
   debajo del acordeón "Casuística entre fechas".
4. Si no hay datos del empleado en el mes: estado vacío con mensaje
   "Sin procesos persistidos para este empleado en el periodo".
5. Si hay datos: tabla, badges, resumen de impacto y avisos.
6. Confirmar que NO existen botones Guardar/Editar/Eliminar habilitados.
7. Confirmar que "Añadir proceso" está deshabilitado y muestra tooltip
   "Disponible en Fase C3B".
8. Cambiar de empleado y verificar que el panel se recarga sin errores.
9. Verificar que el cálculo de la nómina (devengos/deducciones/resumen) no
   ha cambiado respecto a antes de C3A.

## Riesgos residuales

- ⚠️ El payload del motor sigue siendo el manual/local. Cuando un proceso
  persistido y un valor manual coexisten, el motor sólo ve el manual. La
  resolución de prioridades se aborda en C3B/C3C.
- ⚠️ El bloque ejecuta 3 queries (payroll_incidents + it_processes +
  leave_requests) por empleado/periodo. React Query cachea con `staleTime=30s`.
- ⚠️ "Suspensión empleo/sueldo" y "Desplazamiento temporal" siguen apareciendo
  como `unmapped` con badge destructivo. La promoción asistida queda para C3B.
- ⚠️ Tests del panel usan inyección de hook (`useIncidenciasHook` prop).
  Tests end-to-end con mock Supabase quedan para fase posterior.

## Próxima fase

**CASUISTICA-FECHAS-01 — Fase C3B PLAN: alta de incidencias persistentes y
promoción de datos locales.**

No proceder con C3B en Build directo: requiere PLAN previo por introducir
mutaciones, validación de duplicados y reglas de combinación persistido/manual.