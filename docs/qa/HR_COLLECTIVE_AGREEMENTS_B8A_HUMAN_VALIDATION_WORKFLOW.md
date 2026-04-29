# B8A — Workflow de Validación Humana Firmada de Convenios

## 1. Objetivo

B8A introduce una capa de **validación humana firmada internamente** sobre los
resultados parseados (B7A) y persistidos (B7B) en el Registro Maestro de
Convenios Colectivos.

Permite que un usuario autorizado revise una versión concreta del convenio
(pinned por `version_id` + SHA-256 documental), recorra un checklist
granular obligatorio y firme el resultado con una firma interna SHA-256
canónica.

B8A es la base de auditoría sobre la que se construirán:
- **B8A.2** — wrapper edge admin-gated.
- **B8A.3** — UI de validación.
- **B8B / B9** — activación condicionada (`ready_for_payroll`, etc.).

B8A **no** activa nada sobre nómina ni sobre la tabla operativa.

---

## 2. Tablas creadas

Migración: `supabase/migrations/20260429075050_fb8e33d5-fce3-49b7-97ba-f208303101cc.sql`.

| Tabla | Descripción |
|---|---|
| `erp_hr_collective_agreement_registry_validations` | Registro principal de validación (status, scope, signature, is_current). |
| `erp_hr_collective_agreement_registry_validation_items` | Checklist granular (18 ítems posibles, status individual + evidencia). |
| `erp_hr_collective_agreement_registry_validation_signatures` | Ledger **append-only** de firmas internas. |

Todas las tablas están aisladas a la zona `_registry` y **no** tocan la tabla
operativa `erp_hr_collective_agreements`.

---

## 3. Estados (`validation_status`)

| Estado | Significado |
|---|---|
| `draft` | Borrador editable por el dueño (validator_user_id). |
| `pending_review` | Borrador enviado a revisión (sigue editable por el dueño). |
| `approved_internal` | Aprobado internamente. Requiere firma SHA-256 + `validated_at`. |
| `rejected` | Rechazado. Requiere firma SHA-256 + `validated_at`. |
| `superseded` | Sustituido por una validación posterior `is_current = true`. |

Transiciones permitidas desde el cliente: `draft ↔ pending_review`.
Transiciones a `approved_internal` / `rejected` solo vía service role
(actualmente, futura edge admin-gated B8A.2). RLS bloquea el cambio directo.

---

## 4. Checklist obligatorio

Antes de aprobar internamente, el service exige que **todos** los ítems del
scope estén verificados (`verified` o `accepted_with_caveat`). Las claves
actuales incluyen, entre otras:

- `sha256_reviewed`
- `source_official_reviewed`
- `vigencia_reviewed`
- `scope_geographic_reviewed`
- `scope_sector_reviewed`
- `salary_base_reviewed`
- `salary_categories_reviewed`
- `pluses_reviewed`
- `jornada_reviewed`
- `pagas_extra_reviewed`
- `rules_reviewed`
- `parser_warnings_reviewed`
- `discarded_rows_reviewed`
- `evidence_reviewed`
- `applicability_notes_reviewed`
- `no_payroll_use_acknowledged`
- `no_official_submission_acknowledged`
- `no_ready_for_payroll_acknowledged`

Cualquier ítem `pending` o `rejected` impide pasar a `approved_internal`.

---

## 5. Firma interna

- **Algoritmo**: `sha256-canonical-v1`.
- **Canonicalización**: el payload se serializa con `stableStringify`
  (orden lexicográfico de claves) y los arrays sensibles (`checklist`,
  `validation_scope`) se ordenan antes de hashear.
- **Hash**: SHA-256 hex (64 chars `[a-f0-9]`).
- La migración exige formato vía trigger
  (`car_validations_enforce_invariants` y
  `car_validation_signatures_enforce_format`).

**No es firma cualificada.** No es eIDAS, no es FNMT, no es BOE.
Es exclusivamente trazabilidad interna y auditoría.

---

## 6. Service puro

Archivo: `src/engines/erp/hr/collectiveAgreementValidationService.ts`.

Métodos expuestos:

- `createValidationDraft(input, adapter)`
- `updateValidationChecklist(validationId, items, adapter)`
- `submitForReview(validationId, adapter)`
- `approveValidation(input, adapter)` → genera firma + `is_current = true`.
- `rejectValidation(input, adapter)` → genera firma de rechazo.
- `supersedeValidation(validationId, adapter)`

El service es **puro**: no importa `@/integrations/supabase/client`, no usa
`fetch`, no toca React. Toda persistencia se inyecta vía adapter
(`ValidationAdapter`).

---

## 7. RLS conservadora

| Acción | Regla |
|---|---|
| `SELECT validations` | admin / superadmin / hr_manager / legal_manager / auditor |
| `INSERT validations` | dueño + `status IN ('draft','pending_review')` + rol autorizado |
| `UPDATE validations` | dueño + `status IN ('draft','pending_review')` (USING + WITH CHECK) |
| `DELETE validations` | sin policy (no permitido desde cliente) |
| `SELECT items` | mismos roles que validations |
| `INSERT/UPDATE items` | solo si la validación padre es del usuario y editable |
| `SELECT signatures` | mismos roles |
| `INSERT/UPDATE/DELETE signatures` | sin policy → solo `service_role` |

No existen policies con `USING (true)` ni `WITH CHECK (true)`. El test
`collective-agreements-b8a-validation-schema.test.ts` lo verifica.

---

## 8. Signatures append-only

- Trigger `trg_car_validation_signatures_no_update` → `BEFORE UPDATE` → raise.
- Trigger `trg_car_validation_signatures_no_delete` → `BEFORE DELETE` → raise.
- Excepción: `CAR_VALIDATION_SIGNATURES_ARE_APPEND_ONLY`.

Una firma, una vez insertada, queda inmutable. No se puede borrar ni editar
ni siquiera con `service_role` (los triggers también se aplican).

---

## 9. Qué NO hace B8A

B8A **no**:
- activa `ready_for_payroll` en el registro maestro.
- modifica `data_completeness` global del registro maestro.
- añade `human_validated` a la tabla maestra (es atributo de la validation row).
- toca el motor de nómina (`payrollEngine`, `payslipEngine`,
  `salaryNormalizer`, `agreementSalaryResolver`, `useESPayrollBridge`).
- toca la tabla operativa `erp_hr_collective_agreements`.
- añade edge functions ni nuevas RLS sobre tablas registry antiguas.
- elimina `requires_human_review` ni `official_submission_blocked`.

Estas activaciones quedan estrictamente reservadas a **B8B / B9**.

---

## 10. Rollback / auditoría

- **No se borra una aprobación**: una validación `approved_internal` no se
  elimina nunca. Para corregirla:
  - se crea una nueva validación posterior y se marca `is_current = true`,
    lo que automáticamente pasa la anterior a `superseded` vía trigger
    `car_validations_supersede_previous`.
  - o se crea una validación posterior con `validation_status = 'rejected'`.
- **Historial inmutable**: las firmas son append-only. El historial completo
  de quién aprobó qué, cuándo y con qué hash queda preservado.
- **Versionado por SHA-256**: si el documento cambia (nuevo SHA-256), el
  parser B7B crea una nueva `version_id`; las validaciones anteriores siguen
  vinculadas a su `version_id` original y no se aplican a la nueva versión.

---

## 11. Próximas fases

- **B8A.2 — Edge wrapper admin-gated**: edge function que invoca el service
  con `service_role` previa verificación de rol vía JWT.
- **B8A.3 — UI**: pantalla de revisión y firma para roles autorizados.
- **B8B / B9 — Activación condicionada**: una vez exista una validación
  `approved_internal` + `is_current = true`, una edge function separada
  podrá (con doble confirmación humana) tocar las flags del registro maestro
  (`salary_tables_loaded`, `data_completeness`, `ready_for_payroll`).

B8A por sí sola **nunca** abre el camino a nómina real ni a presentaciones
oficiales.