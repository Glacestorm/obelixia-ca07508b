# CASUISTICA-FECHAS-01 — Fase C1: Migración de hardening de incidencias

**Fecha:** 2026-04-27
**Estado:** ✅ MIGRACIÓN APLICADA
**Scope:** una sola tabla (`public.erp_hr_payroll_incidents`). Cero tablas
nuevas. Cero cambios en RLS. Cero cambios en UI, motores o engines oficiales.

---

## 1. Resumen de la migración

Se reutiliza la tabla existente `erp_hr_payroll_incidents` (38 columnas
previas) extendiéndola con 6 columnas nuevas, 4 funciones de validación,
4 triggers y 2 índices parciales.

**Confirmación crítica:** **NO se creó tabla nueva.** En particular, **NO**
se creó `erp_hr_payroll_incidencias` (esta tabla es ghost-table según el
constraint del proyecto y queda explícitamente prohibida).

## 2. Mapping definitivo "proceso entre fechas" → tabla canónica

| Proceso (PDF) | Tabla destino | Discriminador |
|---|---|---|
| **PNR** (permiso no retribuido) | `erp_hr_payroll_incidents` | `incident_type='pnr'` |
| **IT** enfermedad común | `erp_hr_it_processes` | `process_type='EC'` |
| **AT** accidente trabajo | `erp_hr_it_processes` | `process_type='AT'` |
| **EP** enfermedad profesional | `erp_hr_it_processes` | `process_type='EP'` |
| **Nacimiento / cuidado menor** | `erp_hr_leave_requests` | `leave_type_code IN ('PAT','MAT','birth')` |
| **Reducción jornada guarda legal** | `erp_hr_payroll_incidents` | `incident_type='reduccion_jornada_guarda_legal'` |
| **Atrasos / regularización** | `erp_hr_payroll_incidents` | `incident_type='atrasos_regularizacion'` |
| **Desplazamiento temporal** | `erp_hr_payroll_incidents` | `incident_type='desplazamiento_temporal'` |
| **Suspensión empleo y sueldo** | `erp_hr_payroll_incidents` | `incident_type='suspension_empleo_sueldo'` |

**Justificación PNR → `erp_hr_payroll_incidents`** (decisión Fase C0):
- El catálogo `erp_hr_leave_types` (jurisdicción ES) **no contiene PNR** — sólo
  MAT, PAT, birth, MATRIM. Crear leave_type PNR queda fuera de scope.
- PNR no requiere workflow formal de aprobación de RRHH (acuerdo bilateral).
- Impacto directo y exclusivo en nómina (descuento de salario).
- Trazabilidad para AFI (inactividad TGSS) vía `requires_external_filing` +
  `official_communication_type='AFI'` ya disponibles en la tabla.

## 3. Cambios estructurales aplicados

### 3.1 Columnas nuevas en `erp_hr_payroll_incidents`

| Columna | Tipo | Default | Nullable | Propósito |
|---|---|---|---|---|
| `deleted_at` | `timestamptz` | `NULL` | sí | Soft-delete. NULL = activa. |
| `deleted_by` | `uuid` | `NULL` | sí | Autor del soft-delete. |
| `cancellation_reason` | `text` | `NULL` | sí | Motivo de anulación. |
| `version` | `int` | `1` | no | Bump obligatorio al modificar incidencia aplicada. |
| `legal_review_required` | `boolean` | `false` | no | Marca para revisión laboral previa. |
| `official_communication_type` | `text` | `NULL` | sí | Trazabilidad de canal: FDI/AFI/DELTA/INSS/TGSS/SEPE. **No dispara envío.** |

### 3.2 Funciones (todas con `SET search_path = public`)

| Función | Trigger asociado | Lógica |
|---|---|---|
| `validate_payroll_incident_type()` | `trg_validate_payroll_incident_type` BEFORE INSERT/UPDATE | Lista cerrada: `variable`, `correction`, `modification`, `retribution_in_kind` (legacy) + `pnr`, `reduccion_jornada_guarda_legal`, `atrasos_regularizacion`, `desplazamiento_temporal`, `suspension_empleo_sueldo`, `reduction`, `otra` (nuevos C1). |
| `validate_payroll_incident_dates()` | `trg_validate_payroll_incident_dates` BEFORE INSERT/UPDATE | `applies_to >= applies_from` si ambas; `percent ∈ [0,100]`; `official_communication_type ∈ {FDI,AFI,DELTA,INSS,TGSS,SEPE}` si presente. |
| `protect_applied_payroll_incidents()` | `trg_protect_applied_payroll_incidents` BEFORE UPDATE | Inmutabilidad de `company_id` y `employee_id` siempre; si `applied_at IS NOT NULL`, modificar `amount`/`units`/`unit_price`/`percent`/`applies_from`/`applies_to`/`incident_type` exige `version > OLD.version`. |
| `prevent_delete_applied_incidents()` | `trg_prevent_delete_applied_incidents` BEFORE DELETE | Bloquea DELETE físico si `applied_at IS NOT NULL`. Soft-delete obligatorio. |

### 3.3 Índices parciales

- `idx_payroll_incidents_employee_dates_active`
  `(employee_id, applies_from, applies_to) WHERE deleted_at IS NULL`
- `idx_payroll_incidents_official_pending`
  `(company_id, official_communication_type) WHERE requires_external_filing = true AND deleted_at IS NULL`

## 4. Vocabulario adoptado (alineado con datos reales)

Fase C0 detectó que estados como `pending_communication` o `communicated`
**no existen** en BD. En su lugar se usan **flags** existentes/nuevos:

| Concepto | Cómo se representa |
|---|---|
| Borrador editable | `status='pending'` (default actual) |
| Validada | `validated_at IS NOT NULL`, `validated_by` |
| Aplicada a nómina | `applied_at IS NOT NULL`, `applied_to_record_id` |
| Pendiente de comunicación oficial | `requires_external_filing=true` + `official_communication_type IS NOT NULL` |
| Comunicada (Fase D) | `requires_external_filing=false` (toggle al cerrar el envío) |
| Cancelada | `cancellation_reason IS NOT NULL` + `deleted_at IS NOT NULL` |
| Recálculo necesario | INSERT en `erp_hr_payroll_recalculations` (Fase C4) + `version++` |

No se inventó enum nuevo `incidence_status`. Reutilización de campos
existentes + nuevos flags.

## 5. RLS — sin cambios

Fase C0 confirmó que la policy actual sobre `erp_hr_payroll_incidents` es
segura y multi-tenant:

```
company_id IN (SELECT company_id FROM erp_user_companies
               WHERE user_id = auth.uid() AND is_active = true)
```

- ✅ Sin `USING(true)`.
- ✅ Cubre SELECT/INSERT/UPDATE/DELETE (policy ALL).
- ✅ Sin sub-selects recursivos sobre la propia tabla.

**C1 NO modifica políticas RLS.** Verificado.

### Gaps RLS aceptados (no tocados en C1)

1. **`erp_hr_it_processes/parts/bases` sin DELETE policy**: aceptado.
   Cancelación se gestiona vía `status='cancelled'`. Refuerza inmutabilidad
   legal (LGSS Art. 21, 4 años de retención).
2. **`erp_hr_payrolls` con `roles={}`**: protegido por
   `user_has_erp_company_access()` SECURITY DEFINER. Anotado para sprint
   de hardening transversal, fuera de scope C.
3. **Tres helpers RLS coexisten** (`erp_user_companies` directo,
   `erp_get_user_companies()`, `user_has_erp_company_access()`): no unificar
   en C, riesgo de regresión cross-módulo.

## 6. Validación de la migración (verificada en BD)

Verificación post-migración (read-only, sin modificar datos):

- ✅ 6 columnas nuevas presentes (`information_schema.columns`).
- ✅ 4 funciones presentes con `proconfig=[search_path=public]` (`pg_proc`).
- ✅ 4 triggers presentes (`pg_trigger`):
  - `trg_validate_payroll_incident_type` BEFORE INSERT OR UPDATE
  - `trg_validate_payroll_incident_dates` BEFORE INSERT OR UPDATE
  - `trg_protect_applied_payroll_incidents` BEFORE UPDATE
  - `trg_prevent_delete_applied_incidents` BEFORE DELETE
- ✅ 2 índices parciales creados.
- ✅ Datos existentes intactos: 10 filas previas (4 `variable`, 2 c/u
  `correction`/`modification`/`retribution_in_kind`) siguen siendo válidas.

## 7. Validación funcional documentada (manual / Fase C2)

Casos esperados a verificar desde la app o psql en sandbox:

| Caso | Resultado esperado |
|---|---|
| `INSERT incident_type='pnr'` con datos válidos | ✅ OK |
| `INSERT incident_type='ghost'` | ❌ exception "incident_type ghost no permitido" |
| `INSERT applies_to < applies_from` | ❌ exception coherencia de fechas |
| `INSERT percent=120` | ❌ exception fuera de [0,100] |
| `INSERT official_communication_type='SOAP'` | ❌ exception canal no permitido |
| `UPDATE company_id` (cualquier caso) | ❌ exception cross-tenant prohibido |
| `UPDATE employee_id` (cualquier caso) | ❌ exception |
| `DELETE` físico de incidencia con `applied_at IS NOT NULL` | ❌ exception → usar soft-delete |
| `UPDATE amount` en aplicada sin `version++` | ❌ exception version bump requerido |
| `UPDATE amount` + `version=2` en aplicada (era `version=1`) | ✅ OK (no genera recálculo aún — eso es C4) |
| `UPDATE deleted_at=now()` (soft-delete) sin tocar economía | ✅ OK |

## 8. Restricciones legales respetadas

- ❌ **No** se enviaron comunicaciones oficiales.
- ❌ **No** se generaron ficheros FDI/AFI/DELT@.
- ❌ **No** se modificaron nóminas existentes.
- ❌ **No** se marcaron incidencias existentes como aplicadas.
- ❌ **No** se recalcularon nóminas.
- ❌ **No** se tocaron datos históricos.
- ✅ `isRealSubmissionBlocked() === true` sigue intacto (no tocado).
- ✅ Mem core `Safety: isRealSubmissionBlocked()===true` respetado.
- ✅ Mem core `Isolation: company_id` reforzado por trigger inmutabilidad.
- ✅ Mem core `Schema constraints: no ghost tables` respetado.

## 9. Riesgos residuales

1. **Datos legacy sin tipos PDF**: las 10 filas existentes usan tipos legacy
   (`variable`, `correction`, `modification`, `retribution_in_kind`). Siguen
   siendo válidas tras la migración. Migración futura de re-clasificación
   queda fuera de scope.
2. **Sin recálculo automático**: modificar incidencia aplicada con `version++`
   es admitido pero **no** dispara INSERT en `erp_hr_payroll_recalculations`.
   Eso es Fase C4.
3. **Sin UI de soft-delete**: `deleted_at` debe poblarse vía hook (Fase C2)
   o queries manuales hasta entonces.
4. **Sin filtro automático `deleted_at IS NULL` en RLS**: las queries deben
   filtrar explícitamente desde el cliente. Los índices están preparados.
5. **Trigger `protect_applied_payroll_incidents` no escribe audit_log
   automático**: la auditoría de cambios económicos sobre incidencias
   aplicadas se delega a Fase C4 (mecanismo de recálculo).
6. **Linter Supabase reporta 865 warnings de `Function Search Path Mutable`
   pre-existentes** en el proyecto. Las 4 funciones nuevas C1 **sí**
   establecen `SET search_path = public`. Los warnings restantes
   corresponden a funciones legacy fuera de scope.

## 10. Próximas fases

- **Fase C2 — Hook + adapter**:
  - `useHRPayrollIncidencias(employeeId, year, month)` lee de **3 tablas**
    (`erp_hr_payroll_incidents` + `erp_hr_it_processes` + `erp_hr_leave_requests`).
  - `mapIncidenciasToLegacyCasuistica()` consolida en `CasuisticaState`
    legacy para que `HRPayrollEntryDialog` no cambie su contrato con motor.
  - Tests unitarios del mapper.
- **Fase C3 — UI integrada**:
  - Bloque "Procesos entre fechas" en el diálogo de Nueva Nómina.
  - Modal único con dispatcher por tipo → escribe en tabla correcta.
  - Coexiste con Fase B (estado local) durante transición.
- **Fase C4 — Aplicación a nómina + recálculo**:
  - Setear `applied_at`, `applied_to_record_id` al guardar nómina.
  - INSERT en `erp_hr_payroll_recalculations` si modificación posterior.
  - Audit log unificado.
- **Fase D — Comunicaciones oficiales** (DIFERIDA, NO en scope C):
  - Bridges a `fdiArtifactEngine`, `afiInactivityEngine`, `deltaArtifactEngine`.
  - Siempre `isRealSubmissionBlocked()===true`.

## 11. Confirmaciones de no-cambio

- ❌ NO se tocó `src/components/erp/hr/HRPayrollEntryDialog.tsx`.
- ❌ NO se tocaron `salaryNormalizer.ts`, `contractSalaryParametrization.ts`,
  `agreementSalaryResolver.ts`.
- ❌ NO se tocaron `fdiArtifactEngine.ts`, `afiInactivityEngine.ts`,
  `deltaArtifactEngine.ts`.
- ❌ NO se tocaron edge functions.
- ❌ NO se tocaron `package.json`, `bun.lock`, ni workflows de CI.
- ❌ NO se modificó `src/integrations/supabase/types.ts` (regenerado
  automáticamente).
- ❌ NO se crearon tablas nuevas. NO existe `erp_hr_payroll_incidencias`.
- ❌ NO se modificaron políticas RLS de ninguna tabla.

**Fase C1 CERRADA — lista para Fase C2 (hook + adapter).**