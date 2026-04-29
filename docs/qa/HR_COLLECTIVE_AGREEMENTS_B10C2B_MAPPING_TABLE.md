# HR — Collective Agreements B10C.2B.1: Mapping Table (read-only for payroll)

## Objetivo

Implementar la capa de **persistencia** que registra qué convenio del
Registro Maestro corresponde a una empresa, empleado o contrato concretos.

B10C.2B.1 es **persistencia + RLS + triggers + tests + docs**. No es
apply, no es runtime de nómina, no es UI, no es service, no es edge.

## Diferencia B10C.2A / B10C.2B / B10D

| Fase | Qué hace | Qué NO hace |
|---|---|---|
| B10C.2A | Helper puro de scoring + preview de candidatos. | No DB, no bridge, no apply, no flag. |
| **B10C.2B.1 (esta)** | Tabla `erp_hr_company_agreement_registry_mappings` read-only para payroll, con RLS y triggers append-only. | No consumida por nómina ni por el bridge. No service / edge / UI. |
| B10C.2B.2 (futura) | Service TS + UI interna de revisión y aprobación humana sobre la tabla creada en B10C.2B.1. | Sigue sin tocar nómina ni bridge. |
| B10D (futura) | Apply real al runtime usando mappings aprobados, con doble confirmación humana y activación de flag por empresa. | Único punto autorizado a alterar nómina. |

## Tabla

`public.erp_hr_company_agreement_registry_mappings`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `company_id` | uuid NOT NULL | scope obligatorio |
| `employee_id` | uuid NULL | scope opcional |
| `contract_id` | uuid NULL | scope opcional |
| `registry_agreement_id` | uuid NOT NULL | FK → `erp_hr_collective_agreements_registry(id)` ON DELETE RESTRICT |
| `registry_version_id` | uuid NOT NULL | FK → `erp_hr_collective_agreements_registry_versions(id)` ON DELETE RESTRICT |
| `source_type` | text NOT NULL | CHECK ∈ {`manual_selection`, `cnae_suggestion`, `legacy_operational_match`, `imported_mapping`} |
| `mapping_status` | text NOT NULL DEFAULT `'draft'` | CHECK ∈ {`draft`, `pending_review`, `approved_internal`, `rejected`, `superseded`} |
| `confidence_score` | numeric(5,2) NULL | CHECK 0..100 |
| `rationale_json` | jsonb NOT NULL DEFAULT `'{}'` | trazabilidad de la decisión |
| `evidence_urls` | text[] NOT NULL DEFAULT `'{}'` | enlaces de evidencia |
| `is_current` | boolean NOT NULL DEFAULT false | sólo una fila `true` por scope |
| `created_by` | uuid NOT NULL DEFAULT `auth.uid()` | autor |
| `approved_by` | uuid NULL | obligatorio en `approved_internal` |
| `approved_at` | timestamptz NULL | obligatorio en `approved_internal` |
| `created_at` / `updated_at` | timestamptz | trigger refresca `updated_at` |

## Índices

- `idx_car_mappings_company_id` sobre `company_id`.
- `idx_car_mappings_registry_agreement_id` sobre `registry_agreement_id`.
- `idx_car_mappings_mapping_status` sobre `mapping_status`.
- **Índice único parcial** `uniq_car_mappings_current_per_scope` sobre
  `(company_id, COALESCE(employee_id, sentinel), COALESCE(contract_id, sentinel))`
  con `WHERE is_current = true`. UUID centinela
  `00000000-0000-0000-0000-000000000000` para tratar NULLs como un valor
  comparable. Garantiza un único mapping vigente por scope.

## RLS

- `ENABLE` + `FORCE` ROW LEVEL SECURITY.
- Helpers reales:
  - `public.user_has_erp_company_access(p_company_id)`
  - `public.has_role(_user_id, _role app_role)`

Roles autorizados: `superadmin`, `admin`, `hr_manager`, `legal_manager`,
`payroll_supervisor`.

| Policy | Scope | Reglas |
|---|---|---|
| `car_mappings_select_authorized` | `SELECT` `authenticated` | acceso a `company_id` **AND** rol autorizado |
| `car_mappings_insert_authorized` | `INSERT` `authenticated` | `created_by = auth.uid()` **AND** acceso a `company_id` **AND** rol autorizado |
| `car_mappings_update_authorized` | `UPDATE` `authenticated` | `USING` y `WITH CHECK` ambos exigen acceso a `company_id` **AND** rol autorizado |
| — | `DELETE` | **No existe policy DELETE.** Append-only. |

No hay `USING(true)` ni `WITH CHECK(true)` en ninguna policy.

## Triggers

1. `tg_car_mappings_set_updated_at` — `BEFORE UPDATE`. Refresca `updated_at`.
2. `tg_car_mappings_enforce_approval_invariants` — `BEFORE INSERT OR UPDATE`.
   Si `mapping_status = 'approved_internal'`, exige:
   - `approved_by IS NOT NULL` y `approved_at IS NOT NULL`.
   - `approved_by` con rol autorizado.
   - registry agreement: `ready_for_payroll = true`,
     `requires_human_review = false`,
     `data_completeness = 'human_validated'`,
     `source_quality = 'official'`.
   - registry version pertenece al agreement y `is_current = true`.
   - `source_type = 'cnae_suggestion'` ⇒ requiere `approved_by` humano
     autorizado (no aprobación automática).
   Errores con prefijo `mapping_approval_blocked:`.
3. `tg_car_mappings_supersede_previous_current` — `AFTER INSERT OR UPDATE`.
   Cuando `NEW.is_current = true`, marca filas previas del mismo scope
   con `is_current = false` y `mapping_status = 'superseded'`. **No
   borra nada.**
4. `tg_car_mappings_block_destructive_changes` — `BEFORE UPDATE`.
   Bloquea cambios post-creación en `registry_agreement_id`,
   `registry_version_id`, `company_id`, `employee_id`, `contract_id`.
   Errores con prefijo `mapping_immutable_field:`. Las correcciones se
   hacen insertando una fila nueva.

## Política append-only

- No hay `DELETE` policy.
- No se borra historial: `superseded` es un estado, no un borrado.
- Los identificadores de scope y de registry son inmutables tras crear.
- Cualquier corrección genera una nueva fila, preservando trazabilidad
  legal y auditoría.

## `approved_internal` y validaciones

`approved_internal` representa una decisión **interna** humana validada
sobre qué convenio del Registry corresponde a un scope.

No implica ejecutar nómina con ese convenio. La activación efectiva de
un convenio del Registry para nómina queda reservada a B10D, con doble
confirmación humana y activación de flag por empresa.

## Qué NO hace B10C.2B.1

- No toca `useESPayrollBridge`.
- No toca `registryShadowFlag` (sigue exportando `false`).
- No toca `registryShadowPreview`.
- No toca el resolver operativo, salary normalizer, payroll engine,
  payslip engine ni safety gate.
- No toca la tabla operativa `erp_hr_collective_agreements`.
- No activa `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- No escribe `ready_for_payroll`.
- No crea service TS, edge function ni UI.
- No expone `mapping_resolver` runtime.
- No desbloquea C3B3C2.

## Próxima fase

- **B10C.2B.2**: service TS + UI interna de revisión y aprobación
  humana sobre la tabla, sin consumo desde nómina.
- **B10D**: apply real al runtime usando `approved_internal + is_current`,
  con doble confirmación humana y activación de flag por empresa.

## Tests asociados

- `src/__tests__/hr/collective-agreement-mappings-schema.test.ts`
  - Contrato de tipos generados.
  - Inspección de la migración SQL: tabla, columnas, FKs, CHECKs,
    índices, RLS, policies (sin DELETE, sin `true` literales),
    triggers (updated_at, approval invariants, supersede,
    block_destructive).
  - Mensajes de error de invariantes (`mapping_approval_blocked:`,
    `mapping_immutable_field:`).
  - Trigger `supersede_previous_current` no usa `DELETE FROM`.
  - La migración no referencia tabla operativa
    `erp_hr_collective_agreements` (sin `_registry`).
  - La migración no referencia `payroll_engine`, `payslip`,
    `salaryNormalizer`, `agreementSalaryResolver`, `useESPayrollBridge`.
  - La migración no escribe `ready_for_payroll =`.
  - `useESPayrollBridge.ts` y `registryShadowFlag.ts` intactos; ningún
    archivo de nómina/bridge/resolver referencia la tabla mapping.

## Estado

- Migración aplicada.
- Tests B10C.2B.1: **40/40 verdes**.
- Suite CA + B10A + B10B + B10C + B10C.2A + B10C.2B.1: **473/473 verdes**.
- Payroll crítico: **21/21 verde**.