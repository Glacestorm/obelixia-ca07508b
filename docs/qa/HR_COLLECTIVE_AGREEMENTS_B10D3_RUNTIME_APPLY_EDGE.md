# B10D.3 — Runtime apply edge function

## Objetivo

Edge function admin-gated que envuelve el service puro B10D.2
(`collectiveAgreementRuntimeApplyService`) para gestionar el ciclo de
vida del **apply real controlado por empresa** del mapping del Registry:
creación de request, segunda aprobación distinta del solicitante,
activación del runtime setting con re-evaluación de invariantes
server-side y rollback explícito.

B10D.3 prepara estado en las 3 tablas creadas en B10D.1 a través de un
adapter que mirrorea el contrato del service. **NO toca payroll
runtime** y **NO activa el flag global**: la integración real con el
bridge sigue reservada a B10E.

## Relación entre fases

| Fase | Alcance |
|------|---------|
| B10D.1 | Migraciones + RLS + triggers |
| B10D.2 | Service puro |
| **B10D.3** | **Edge function (este documento)** |
| B10D.4 | UI interna |
| B10E | Integración real con bridge / payroll |

## Acciones (POST `body.action`)

- `create_request` — crea draft del request.
- `submit_for_second_approval` — `draft → pending_second_approval`.
- `second_approve` — `pending → approved_for_runtime`. Exige las 4 acks.
- `reject` — rechazo con `reason` ≥ 10 chars.
- `activate` — `approved → activated` o `blocked_by_invariant`. Re-evalúa
  los 14 invariantes server-side.
- `rollback` — `activated → rolled_back` con `reason` ≥ 10 chars.
- `list` — lista requests por scope.

## Seguridad

- `verify_jwt = true` en `supabase/config.toml`.
- Dual client:
  - `userClient` con JWT del solicitante para `auth.getClaims` y RPC
    `user_has_erp_company_access`.
  - `adminClient` (service-role) **solo server-side**, **solo para
    escrituras**, **solo después** de pasar role + company gates.
- Zod `.strict()` en todos los schemas.
- `FORBIDDEN_PAYLOAD_KEYS` rechaza cualquier campo server-decided o
  prohibido en el cuerpo (incluye `request_status`, `is_current`,
  `signature_hash`, `executed_by`, `executed_at`, `requested_by`,
  `requested_at`, `second_approved_by`, `second_approved_at`,
  `activation_run_id`, `rollback_run_id`, `use_registry_for_payroll`,
  `ready_for_payroll`, `requires_human_review`, `data_completeness`,
  `salary_tables_loaded`, `source_quality`,
  `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
  `persisted_priority_apply`, `C3B3C2`, `run_signature_hash`,
  `activated_by`, `activated_at`, y la versión snake_case
  `comparison_critical_diffs_count`).
- Errores sanitizados via `mapError` — nunca se devuelve `error.message`
  ni `.stack`.
- No se usa `.delete(` en ningún lugar. Append-only.

## Roles autorizados

- `superadmin`
- `admin`
- `legal_manager`
- `payroll_supervisor`

`hr_manager` queda **excluido** explícitamente de second_approve y
activate. No se promociona a `hr_manager` aunque tenga acceso a la
empresa.

## Adapter

Implementa el contrato `RuntimeApplyAdapter` del service B10D.2:

- Lectores: `getMapping`, `getRegistryAgreement`, `getRegistryVersion`,
  `getApplyRequest`, `getCurrentRuntimeSetting`, `listApplyRequests`.
- Escritores append-only: `insertApplyRequest`,
  `updateApplyRequestStatus`, `insertRuntimeSetting`,
  `markRuntimeSettingNotCurrent`, `insertApplyRun`.

No expone `delete`. No expone service-role al cliente. No toca tabla
operativa. Usa el centinela `00000000-0000-0000-0000-000000000000` en
lookups de `runtime_settings` para alinearse con el índice único parcial
definido en B10D.1.

## mapError → códigos canónicos

| Código service | HTTP |
|---|---|
| `UNAUTHORIZED_ROLE` | 403 |
| `NO_COMPANY_ACCESS` | 403 |
| `MAPPING_NOT_FOUND` | 404 |
| `MAPPING_NOT_APPROVED` | 400 |
| `MAPPING_NOT_CURRENT` | 400 |
| `REGISTRY_AGREEMENT_NOT_FOUND` | 404 |
| `REGISTRY_VERSION_NOT_FOUND` | 404 |
| `REGISTRY_NOT_READY` | 400 |
| `VERSION_NOT_CURRENT` | 400 |
| `INVALID_TRANSITION` | 400 |
| `SECOND_APPROVER_REQUIRED` | 400 |
| `SELF_APPROVAL_FORBIDDEN` | 400 |
| `SECOND_APPROVER_ROLE_NOT_ALLOWED` | 403 |
| `ACKNOWLEDGEMENTS_REQUIRED` | 400 |
| `COMPARISON_HAS_CRITICAL_DIFFS` | 400 |
| `REASON_REQUIRED` | 400 |
| `APPLY_REQUEST_NOT_FOUND` | 404 |
| `NO_ACTIVE_RUNTIME_SETTING` | 400 |
| `ALREADY_ROLLED_BACK` | 400 |
| default | 500 `INTERNAL_ERROR` |

## Qué NO hace B10D.3

- No toca el bridge `useESPayrollBridge`.
- No toca payroll/payslip engines, salary resolver/normalizer, safety gate.
- No lee ni activa `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- No toca tabla operativa `erp_hr_collective_agreements`.
- No es UI.
- No mutates `ready_for_payroll` del registry.
- No hace deletes.
- No desbloquea C3B3C2.
- No es B10E.

## Tests

- Estáticos: `src/__tests__/hr/collective-agreement-runtime-apply-edge-static.test.ts`.
  Cubre verify_jwt, FORBIDDEN_PAYLOAD_KEYS, ausencia de imports de
  payroll/bridge/flag, dual client, getClaims, RPC, mapError sanitizado,
  ausencia de `.delete(`, ausencia de `error.message`/`.stack`, mirroring
  de readiness flags y del listado de roles autorizados sin `hr_manager`.
- No se añaden Deno tests para esta fase: la lógica algorítmica está
  cubierta por la suite del service puro B10D.2 (33/33), y los contratos
  HTTP por el conjunto de tests estáticos. Añadir Deno tests requeriría
  doble mock de Supabase clients sin valor incremental sobre lo ya
  cubierto por el service.

## Próxima fase

**B10D.4 — UI interna** para gestionar requests, doble aprobación y
rollback consumiendo esta edge.