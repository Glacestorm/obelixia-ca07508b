# CASUISTICA-FECHAS-01 — Fase C3B1 (alta manual de incidencias persistidas)

Fecha: 2026-04-27 · Estado: CERRADA

## Objetivo
Permitir crear manualmente incidencias persistidas simples en `erp_hr_payroll_incidents` desde el panel "Procesos entre fechas persistidos" de Nueva Nómina, sin tocar el motor, sin promover datos locales y sin generar comunicaciones oficiales.

## Archivos creados
- `src/hooks/erp/hr/usePayrollIncidentMutations.ts` — sólo `createPayrollIncident` + `isCreating`. INSERT puro, RLS multi-tenant.
- `src/components/erp/hr/casuistica/HRPayrollIncidentFormDialog.tsx` — modal con validaciones, defaults por tipo y banners legales.
- `src/components/erp/hr/casuistica/__tests__/HRPayrollIncidentFormDialog.test.tsx`
- `src/hooks/erp/hr/__tests__/usePayrollIncidentMutations.test.ts`
- `docs/qa/CASUISTICA-FECHAS-01_C3B1_create_modal.md`

## Archivos modificados
- `src/components/erp/hr/casuistica/HRPersistedIncidentsPanel.tsx` — habilitado el botón "Añadir proceso", abre el modal y llama a `refetch()` tras la creación. Sin cambios en mapping ni payload.
- `src/components/erp/hr/casuistica/__tests__/HRPersistedIncidentsPanel.test.tsx` — ajuste del test de CRUD: el botón "Añadir proceso" ya no está deshabilitado.

## Tipos permitidos (creatable)
`pnr`, `reduccion_jornada_guarda_legal`, `atrasos_regularizacion`, `desplazamiento_temporal`, `suspension_empleo_sueldo`, `otra`.

## Tipos excluidos (bloqueados con aviso)
IT (enf. común / acc. no laboral), AT, EP, nacimiento (maternidad/paternidad), cuidado menor, corresponsabilidad, lactancia.

Mensaje fijo: "Este proceso debe gestionarse desde el módulo especializado correspondiente para conservar su trazabilidad legal."

## Defaults por tipo
| Tipo | legal_review | req_ss | req_tax | req_filing | comm |
|---|---|---|---|---|---|
| `pnr` | false | true | false | true | `AFI` |
| `reduccion_jornada_guarda_legal` | true | true | false | false | — |
| `atrasos_regularizacion` | true | false | true | false | — |
| `desplazamiento_temporal` | true | false | false | true | — |
| `suspension_empleo_sueldo` | true | false | false | false | — |
| `otra` | true | false | false | false | — |

Metadata sembrada según tipo (`legal_guardianship`, `settlement_type`, `tax_review_required`, `salary_accrual=false`, `contribution_required=false`).

## Validaciones cliente
- Tipo obligatorio. Tipo excluido → submit bloqueado.
- `applies_from`/`applies_to` obligatorias y coherentes (`to >= from`).
- `percent ∈ [0,100]` si presente. `amount >= 0` si presente.
- `official_communication_type ∈ {AFI, FDI, DELTA, INSS, TGSS, SEPE, null}` (alineado con trigger `validate_payroll_incident_dates`).

## Banner legal permanente
"Este registro no envía comunicaciones oficiales, no recalcula nóminas y no modifica el resultado de la nómina actual. Solo crea una incidencia persistida pendiente para revisión y fases posteriores."

## Confirmaciones de invariantes
- Sólo INSERT. No update / upsert / delete / cancel / version bump.
- Cliente Supabase autenticado. Sin `service_role`.
- No se tocan `simulateES`, `salaryNormalizer`, `contractSalaryParametrization`, `agreementSalaryResolver`, `fdiArtifactEngine`, `afiInactivityEngine`, `deltaArtifactEngine`.
- No se generan FDI / AFI / DELT@; sólo se marca el flag pendiente.
- No se cambia el payload entregado al motor de nómina.
- Sin migraciones, RLS, edge functions, dependencias ni CI.
- `applied_at = null`, `version = 1`, `status = 'pending'`, `source = 'payroll_dialog'`, `created_by = auth.user.id` o `null`.
- `concept_code` sembrado por tipo (`ES_PNR`, `ES_REDUCCION_JORNADA`, `ES_ATRASOS`, `ES_DESPLAZAMIENTO_TEMPORAL`, `ES_SUSPENSION_EMPLEO_SUELDO`, `ES_OTRA`) para satisfacer NOT NULL.

## Tests ejecutados
5 archivos · 48/48 verdes:
- `usePayrollIncidentMutations.test.ts` (3) — INSERT puro, error propagado, contexto incompleto bloquea llamada.
- `HRPayrollIncidentFormDialog.test.tsx` (7) — banner, fecha invertida, percent>100, submit PNR/AFI, desplazamiento legal review, IT excluido, ausencia de llamadas a engines.
- `HRPersistedIncidentsPanel.test.tsx` (6) — read-only intacto + alta C3B1.
- `casuisticaDates.test.ts`, `incidenciasMapper.test.ts` — regresiones C2.

## Riesgos residuales
- El payload al motor sigue siendo el manual/local de Fase B; persistir no se aplica a la nómina (intencional). Riesgo de doble conteo si se registra el mismo proceso en ambos sitios; mitigado en C3B2 con promoción y warnings.
- `concept_code` sembrado por defecto puede requerir alineación con `payrollConceptGlossary` en C4.
- `legal_review_required` es sólo recordatorio visual; sin workflow de aprobación (Fase D).

## Próximo paso recomendado
CASUISTICA-FECHAS-01 Fase C3B2 PLAN: promoción de datos locales Fase B (`buildIncidentsFromLocalCasuistica` + UI "Promover datos actuales" con preview, duplicados y confirmación), sin tocar aún el payload del motor.
