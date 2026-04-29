# B10D.2 — Runtime apply service (pure)

## Objetivo

Service puro que orquesta el ciclo de vida del **apply real controlado por
empresa** del mapping registry: creación de request, segunda aprobación
distinta del solicitante, activación del runtime setting y rollback. No
toca payroll runtime ni el bridge: solo prepara y graba estado en las
tres tablas creadas en B10D.1 a través del adapter inyectable.

## Relación entre fases

| Fase | Alcance |
|------|---------|
| B10D.1 | Migraciones `apply_requests`, `apply_runs`, `runtime_settings`, RLS, triggers |
| **B10D.2** | **Service puro (este documento)** |
| B10D.3 | Edge function que envuelve el service con autenticación + adapter Supabase |
| B10D.4 | UI interna para gestionar requests, segunda aprobación y rollback |
| B10E | Integración real con el bridge / payroll (única fase autorizada a tocarlo) |

## Funciones públicas

- `createApplyRequest(input, actor, adapter)` — crea draft.
- `submitApplyRequest({request_id}, actor, adapter)` — draft → pending_second_approval.
- `secondApproveApplyRequest({request_id, acknowledgements}, actor, adapter)` — pending → approved_for_runtime.
- `activateApplyRequest({request_id}, actor, adapter)` — approved → activated o blocked_by_invariant.
- `rollbackApplyRequest({request_id, reason}, actor, adapter)` — activated → rolled_back.
- `listApplyRequests({company_id, ...}, actor, adapter)` — solo si hay company access.
- `evaluateRuntimeApplyInvariants(input)` — helper puro de los 14 gates.

## Adapter

`RuntimeApplyAdapter` expone únicamente:

- lectores (`getMapping`, `getRegistryAgreement`, `getRegistryVersion`,
  `getApplyRequest`, `getCurrentRuntimeSetting`, `listApplyRequests`);
- escritores append-only (`insertApplyRequest`, `updateApplyRequestStatus`,
  `insertRuntimeSetting`, `markRuntimeSettingNotCurrent`, `insertApplyRun`).

No expone delete. El service no hace fetch ni accede a Supabase.

## 14 invariantes

1. mapping_exists
2. mapping_status_approved_internal
3. mapping_is_current
4. mapping_approved_by_present
5. mapping_approved_at_present
6. registry_ready_for_payroll
7. registry_no_human_review_pending
8. registry_data_completeness_human_validated
9. registry_source_quality_official
10. registry_version_is_current
11. comparison_no_critical_diffs
12. second_approver_distinct_from_requester
13. second_approver_role_allowed
14. four_acknowledgements_present (understands_runtime_enable, reviewed_comparison_report, reviewed_payroll_impact, confirms_rollback_available)

`activateApplyRequest` re-evalúa los invariantes server-side y graba un
run con `outcome='blocked_by_invariant'` si falla cualquiera. Nunca
activa runtime setting si los invariantes no pasan.

## Segunda aprobación

- Roles permitidos: `superadmin`, `admin`, `legal_manager`, `payroll_supervisor`.
- `hr_manager` queda explícitamente excluido del segundo aprobador.
- `actor.userId !== request.requested_by`.
- 4 acknowledgements obligatorias en true.
- Re-chequeo de mapping/agreement/version en el momento de la aprobación.
- Errores específicos por causa raíz.

## Activación de runtime setting

- Pre-snapshot del setting actual del scope.
- Post-snapshot determinista (sin id de fila).
- Hash de firma SHA-256 sobre payload estable (apply_request_id, mapping_id,
  company_id, outcome, pre/post snapshots, executed_by, executed_at).
- Insert run primero, luego marca setting previo como no current y crea
  el nuevo setting current.
- Update final del request a `activated` con `activation_run_id`.

## Rollback

- Requiere razón ≥ 10 caracteres.
- Solo desde `activated`.
- Bloquea doble rollback (`rollback_run_id` ya presente).
- Verifica que el setting current pertenece al mapping del request.
- Inserta run `rolled_back`, marca setting como `is_current=false` con
  `rollback_run_id`, actualiza request a `rolled_back`.

## Errores canónicos

`UNAUTHORIZED_ROLE`, `NO_COMPANY_ACCESS`, `MAPPING_NOT_FOUND`,
`MAPPING_NOT_APPROVED`, `MAPPING_NOT_CURRENT`,
`REGISTRY_AGREEMENT_NOT_FOUND`, `REGISTRY_VERSION_NOT_FOUND`,
`REGISTRY_NOT_READY`, `VERSION_NOT_CURRENT`, `INVALID_TRANSITION`,
`SECOND_APPROVER_REQUIRED`, `SELF_APPROVAL_FORBIDDEN`,
`SECOND_APPROVER_ROLE_NOT_ALLOWED`, `ACKNOWLEDGEMENTS_REQUIRED`,
`COMPARISON_HAS_CRITICAL_DIFFS`, `REASON_REQUIRED`,
`APPLY_REQUEST_NOT_FOUND`, `NO_ACTIVE_RUNTIME_SETTING`,
`ALREADY_ROLLED_BACK`.

## Qué NO hace B10D.2

- No toca el bridge.
- No toca payroll ni payslip engines.
- No lee ni escribe el global flag `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- No toca la tabla operativa de convenios.
- No es una edge function (no Deno, no fetch).
- No es UI.
- No mutates el flag `ready_for_payroll` del registry.
- No realiza deletes de filas.
- No desbloquea C3B3C2.

## Próxima fase

**B10D.3 — Edge function** que envuelve este service con un adapter
Supabase real, autenticación JWT, validación de tenant y respuestas HTTP
estandarizadas.
