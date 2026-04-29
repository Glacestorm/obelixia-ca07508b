# HR — Collective Agreements · B8B · Activation Proposal & Readiness

## 1. Objetivo de B8B

B8B introduce el **mecanismo de propuesta de activación** de un convenio del
Registro Maestro para uso futuro en nómina. B8B **no activa nada**: sólo
formaliza una solicitud firmada con un **readiness report** y exige una
**segunda aprobación** humana cualificada.

## 2. Diferencia entre B8B / B9 / B10

| Fase | Qué hace | Qué NO hace |
|------|----------|-------------|
| **B8B** | Crea solicitud de activación, calcula readiness, firma SHA-256 y registra segunda aprobación. | No toca el registry, no toca nómina, no toca tabla operativa. |
| **B9** | Ejecuta la activación efectiva sobre el registry (`ready_for_payroll = true`) sólo si hay solicitud `approved_for_activation`. | No integra todavía con el motor de nómina. |
| **B10** | Conecta el motor de nómina al registry vía bridge resolver. | — |

## 3. Tablas creadas

1. `erp_hr_collective_agreement_registry_activation_requests`
   - Solicitud + `readiness_report_json` + `request_signature_hash` (SHA-256).
   - `activation_status ∈ {draft, pending_second_approval, approved_for_activation, rejected, superseded}`.
   - Índice único parcial: una sola solicitud "viva" por `agreement_id`.
2. `erp_hr_collective_agreement_registry_activation_approvals` (append-only)
   - Segunda firma + `approval_signature_hash`.
   - `decision ∈ {approved, rejected}`.
   - `approver_role ∈ {admin, superadmin, payroll_supervisor, legal_manager}`.
3. `erp_hr_collective_agreement_registry_activation_runs` (append-only)
   - Reservada para B9: snapshots pre/post + `outcome`.

## 4. Readiness report y checks

Implementado en `src/engines/erp/hr/collectiveAgreementActivationReadiness.ts`
(`computeActivationReadiness`, `schema_version = 'b8b-v1'`).

Checks bloqueantes:

- `validation_approved_internal`
- `validation_is_current`
- `validation_scope_salary_tables`
- `validation_scope_rules`
- `version_is_current`
- `sha256_alignment` (validation.sha256 == version.source_hash == source.document_hash)
- `source_quality_official`
- `agreement_salary_tables_loaded`
- `agreement_data_completeness_min` (≥ `parsed_full`)
- `agreement_status_vigente_or_ultra`
- `no_unresolved_critical_warnings`
- `no_unresolved_discarded_critical_rows`
- `salary_tables_count_gt_zero`
- `rules_count_gt_zero`
- `checklist_no_payroll_use_ack` (cuando se aporta checklist)

Sin 100% pass no se permite avanzar a `pending_second_approval`.

## 5. Segunda aprobación

- El aprobador **debe ser distinto** del solicitante (trigger
  `tg_b8b_approvals_insert_guard`).
- Roles autorizados: `admin`, `superadmin`, `payroll_supervisor`,
  `legal_manager`.
- Cada decisión se firma con SHA-256 (`approval_signature_hash`).
- Las aprobaciones son **append-only** (sin UPDATE / DELETE, ni vía
  trigger ni vía policy).

## 6. Edge function `erp-hr-collective-agreement-activation-proposal`

- `verify_jwt = true`.
- Role-check server-side antes de cualquier escritura.
- Acciones: `create_request`, `submit_for_second_approval`,
  `record_second_approval`, `reject`, `supersede`.
- Service role **sólo** server-side.
- Payloads validados con Zod `.strict()` por acción.
- `FORBIDDEN_PAYLOAD_KEYS` incluye `ready_for_payroll`, `data_completeness`,
  `requires_human_review`, `official_submission_blocked`,
  `salary_tables_loaded` → cualquier intento devuelve `FORBIDDEN_FIELD`.
- Errores sanitizados (`mapError` → códigos canónicos, sin filtración).

## 7. RLS y triggers

- RLS activo en las 3 tablas.
- Sólo policies `SELECT` para roles `admin`, `superadmin`, `hr_manager`,
  `legal_manager`, `payroll_supervisor`, `auditor`. **No** hay policies
  `INSERT` / `UPDATE` / `DELETE` para `authenticated`.
- Triggers:
  - `trg_b8b_approvals_insert_guard` (approver != requester).
  - `trg_b8b_approvals_no_update` / `trg_b8b_approvals_no_delete`.
  - `trg_b8b_runs_no_update` / `trg_b8b_runs_no_delete`.
  - `trg_b8b_requests_decided_immutable` (post-decision: readiness,
    firma e identidad inmutables).
  - `trg_b8b_requests_updated_at`.

## 8. Qué NO hace B8B

- ❌ No setea `ready_for_payroll = true`.
- ❌ No modifica `data_completeness`, `requires_human_review`,
  `official_submission_blocked`, `salary_tables_loaded`.
- ❌ No toca el motor de nómina (`payrollEngine`, `payslipEngine`,
  `salaryNormalizer`, `agreementSalaryResolver`, `useESPayrollBridge`).
- ❌ No toca la tabla operativa `erp_hr_collective_agreements`.
- ❌ No parchea el registry maestro.
- ❌ No incluye edge B9 (activación efectiva).
- ❌ No promete presentación oficial.

## 9. Rollback / auditoría

- Las solicitudes se pueden marcar `rejected` o `superseded`. Tras la
  decisión los campos sensibles quedan inmutables (trigger).
- Las firmas (`request_signature_hash`, `approval_signature_hash`) son
  formato estricto `^[a-f0-9]{64}$` (constraint).
- Las tablas `approvals` y `runs` son append-only: cualquier intento
  destructivo lanza excepción.
- Para B9 se reservó `activation_runs` con `pre_state_snapshot_json` y
  `post_state_snapshot_json` para permitir rollback auditable.

## 10. Próxima fase B9

B9 implementará una edge admin-gated separada
(`erp-hr-collective-agreement-activation-execute`) que:

1. Lee la solicitud en estado `approved_for_activation`.
2. Re-verifica readiness en el momento de la ejecución.
3. Inserta una fila en `activation_runs` con snapshots.
4. Si todo pasa, escribe `ready_for_payroll = true` en el registry.
5. Nunca toca la tabla operativa ni el motor de nómina (eso queda B10).

B8B se considera **cerrado** cuando los tests
`collective-agreements-b8b-*` están verdes y la suite global
`collective-agreements-*` sigue verde.