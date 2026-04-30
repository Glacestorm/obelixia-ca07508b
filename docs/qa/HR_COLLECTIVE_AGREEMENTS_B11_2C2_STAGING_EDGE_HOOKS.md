# HR Collective Agreements — B11.2C.2: Staging Edge + Hooks (TIC-NAC)

## 1. Objetivo
Crear la capa de acceso controlado al staging de tablas salariales TIC-NAC:

- Edge function `erp-hr-agreement-staging` (verify_jwt = true).
- Acciones seguras sobre staging y audit (append-only).
- Hooks frontend auth-safe que sólo invocan la edge.
- Tests estáticos + unit + de schema.

No se crea UI, no se escribe en `salary_tables` reales, no se activa nómina,
no se baja `requires_human_review`, no se tocan flags ni allow-list.

## 2. Acciones edge
| Acción | Descripción | Audit |
|--------|-------------|-------|
| `list_for_review` | Devuelve filas del staging (filtrado por status opcional) y los últimos 200 eventos del audit. | — |
| `stage_ocr_batch` | Inserta filas OCR shape-normalizadas en estado `ocr_pending_review`. | `create` por fila |
| `stage_manual_batch` | Inserta filas manuales (CSV/form) en estado `manual_pending_review`. | `create` por fila |
| `edit_row` | Edita campos de una fila pendiente. Recalcula `content_hash`. Bloqueado en `human_approved_second` salvo `superadmin`/`admin`. | `edit` |
| `approve_single` | Aprobación única (modos `*_single_approval`). Setea `first_reviewed_*` y `validation_status='human_approved_single'`. | `approve_single` |
| `approve_first` | Primera aprobación dual (modos `*_dual_approval`). | `approve_first` |
| `approve_second` | Segunda aprobación dual; **bloquea mismo reviewer** (`SAME_REVIEWER_NOT_ALLOWED`). | `approve_second` |
| `reject` | Rechazo definitivo. `reason` mínimo 5 caracteres. | `reject` |
| `mark_needs_correction` | Pide corrección. `reason` mínimo 5 caracteres. | `needs_correction` |

Todas las transiciones también están protegidas por:
- `enforce_staging_approval_rules` (DB trigger).
- `tic_nac_staging_audit_block_mutations` (audit append-only).
- RLS + FORCE RLS por rol.

## 3. Roles autorizados
- `superadmin`
- `admin`
- `legal_manager`
- `hr_manager`
- `payroll_supervisor`

Cualquier otro rol obtiene `INSUFFICIENT_ROLE` (HTTP 403).

## 4. Forbidden payload keys
El cliente NO puede mandar ninguna de estas claves; si están presentes, la
edge devuelve `INVALID_PAYLOAD` (HTTP 400):

- `ready_for_payroll`
- `salary_tables_loaded`
- `data_completeness`
- `requires_human_review`
- `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`
- `HR_REGISTRY_PILOT_MODE`
- `REGISTRY_PILOT_SCOPE_ALLOWLIST`
- `service_role`
- `created_at`
- `updated_at`
- `first_reviewed_by`
- `first_reviewed_at`
- `second_reviewed_by`
- `second_reviewed_at`
- `approval_hash`

Los reviewers (`*_reviewed_by`/`*_reviewed_at`) y `approval_hash` los decide
exclusivamente el servidor.

## 5. Auditoría por acción
Cada acción inserta en `erp_hr_collective_agreement_staging_audit`:
- `staging_row_id`
- `agreement_id`, `version_id`
- `action` (`create`/`edit`/`approve_*`/`reject`/`needs_correction`)
- `actor_id` (server-side)
- `snapshot_json` (estado post-acción)
- `content_hash`
- `approval_hash` (sólo en aprobaciones; SHA-256 estable de
  `{content_hash, reviewer, step, day, schema_version}`)

El audit es **append-only** por trigger. Cualquier UPDATE/DELETE genera
excepción.

## 6. No-auto-aprobación OCR
- Las filas OCR siempre entran como `ocr_pending_review`.
- `row_confidence` se conserva (default `ocr_low` si vacío).
- No existe ninguna ruta del código que pase de `ocr_pending_review` a un
  estado aprobado sin acción humana explícita (`approve_single` / `approve_first`).
- La confianza OCR no se usa como criterio de aprobación.

## 7. Aprobación single vs dual
- **Single** (`*_single_approval`): un único reviewer ejecuta `approve_single`
  → `human_approved_single`, primer reviewer registrado.
- **Dual** (`*_dual_approval`):
  - Reviewer A ejecuta `approve_first` → `human_approved_first`.
  - Reviewer B (≠ A) ejecuta `approve_second` → `human_approved_second`.
  - Si A intenta `approve_second`, devuelve `SAME_REVIEWER_NOT_ALLOWED`.
  - El trigger DB `enforce_staging_approval_rules` es la última línea de defensa.

## 8. Trazabilidad de conceptos
Antes de cualquier inserción/edición/aprobación se valida que `payslip_label`
conserva las palabras clave del literal del convenio (transporte, nocturnidad,
festivo, antigüedad, dieta, kilomet, responsabilidad, convenio). Si no las
conserva → `APPROVAL_BLOCKED` y nunca se persiste. Esto garantiza que un
"Plus transporte" del convenio nunca queda escondido como un concepto opaco.

## 9. Confirmación de NO activación
- `salary_tables` reales: **no tocadas**.
- `ready_for_payroll`: **false** (no se modifica).
- `salary_tables_loaded`: **false** (no se modifica).
- `data_completeness='human_validated'`: **no aplicado**.
- `requires_human_review`: **true** (DB trigger lo enforza).
- Bridge / payroll / payslip / normalizer / resolver: **no tocados**.
- Tabla operativa `erp_hr_collective_agreements`: **no tocada**.
- Flags `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`, `HR_REGISTRY_PILOT_MODE`: **false**.
- `REGISTRY_PILOT_SCOPE_ALLOWLIST`: **[]**.
- B8A / B8B / B9 / B11.3B: **bloqueados** hasta autorización explícita.

## 10. Criterios para pasar a B11.2C.3 (UI de revisión)
1. Tests verdes:
   - `tic-nac-salary-table-staging-edge-static.test.ts`
   - `tic-nac-salary-table-staging-hooks-static.test.ts`
   - `tic-nac-salary-table-staging-actions.test.ts`
   - `tic-nac-salary-table-ocr-staging.test.ts`
   - `tic-nac-salary-table-staging-schema.test.ts`
   - `tic-nac-salary-table-ocr-staging-static.test.ts`
2. Edge desplegada con `verify_jwt=true`.
3. Hooks publicados y manejando `auth_required` de forma silenciosa.
4. Equipo legal/HR ha firmado el flujo single vs dual.
5. Definición visual:
   - Panel side-by-side (PDF BOE original vs fila staging).
   - Indicador explícito de single/dual y reviewer pendiente.
   - Acciones siempre con doble confirmación (legal/payroll).
   - Sin acceso desde frontend a `service_role`.
6. Gobernanza: B11.3B sigue **bloqueado** hasta que el equipo humano apruebe
   un set completo de filas y exista decisión formal documentada para activar
   el writer de `salary_tables` reales.