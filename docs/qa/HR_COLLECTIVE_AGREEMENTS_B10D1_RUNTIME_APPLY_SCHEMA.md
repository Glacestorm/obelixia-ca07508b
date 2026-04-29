# HR — Collective Agreements B10D.1: Runtime Apply Schema

## Objetivo

Crear las 3 tablas, RLS forzado, triggers e índices que soportan el flujo de **apply real controlado por empresa** del mapping del Registry a payroll runtime. Solo schema: no hay service, ni edge, ni UI, ni consumo desde nómina.

Aprobar/activar aquí NO ejecuta nómina. La integración real con `useESPayrollBridge` queda reservada a B10E.

## Diferencia entre fases

| Fase | Qué hace | Qué NO hace |
|---|---|---|
| **B10D.1 (esta)** | Migración: 3 tablas + RLS + triggers + índices + tests + doc. | No service, no edge, no UI, no nómina, no bridge, no flag. |
| B10D.2 | Service puro `collectiveAgreementRuntimeApplyService`. | No edge, no UI, no nómina. |
| B10D.3 | Edge `erp-hr-company-agreement-runtime-apply` dual-client. | No UI, no nómina. |
| B10D.4 | UI interna apply/rollback. | No nómina, no bridge, no flag. |
| B10E | Lectura de `runtime_settings` desde `useESPayrollBridge`. | Única fase autorizada a tocar el bridge. |

## Tablas

### 1) `erp_hr_company_agreement_registry_apply_requests`
Solicitudes con doble aprobación. Estados (`request_status`): `draft`, `pending_second_approval`, `approved_for_runtime`, `activated`, `rejected`, `rolled_back`, `superseded`. Índice único parcial: 1 request "viva" por mapping.

### 2) `erp_hr_company_agreement_registry_apply_runs`
Bitácora **append-only**. `outcome` ∈ {`activated`, `blocked_by_invariant`, `rolled_back`}. Firma `run_signature_hash` validada por trigger contra `^[a-f0-9]{64}$`.

### 3) `erp_hr_company_agreement_registry_runtime_settings`
Estado vigente. B10E leerá `WHERE is_current AND use_registry_for_payroll`. Índice único parcial garantiza ≤1 current por scope (empresa+empleado+contrato, NULLs normalizados con UUID centinela).

## Segunda aprobación (gates trigger-side)

Para llegar a `approved_for_runtime` el trigger exige TODO:
1. `second_approved_by` y `second_approved_at` no nulos.
2. `second_approved_by != requested_by` (no auto-aprobación).
3. Rol ∈ {`superadmin`, `admin`, `payroll_supervisor`, `legal_manager`}.
4. 4 acknowledgements en `true`: `understands_runtime_enable`, `reviewed_comparison_report`, `reviewed_payroll_impact`, `confirms_rollback_available`.
5. `comparison_critical_diffs_count = 0`.
6. Mapping: `mapping_status='approved_internal'`, `is_current=true`, `approved_by`/`approved_at` no nulos.

## Rollback

Setting current → `is_current=false` + `rollback_at`/`rollback_run_id`. **No se borra**. Se inserta `apply_run` con `outcome='rolled_back'` + snapshots.

## RLS

- `ENABLE` + `FORCE ROW LEVEL SECURITY` en las 3 tablas.
- **SELECT** solo con `user_has_erp_company_access(company_id)` Y rol ∈ {`superadmin`, `admin`, `hr_manager`, `legal_manager`, `payroll_supervisor`}.
- **No** policies de INSERT/UPDATE/DELETE para `authenticated`. Las escrituras quedan reservadas a la edge B10D.3 con service-role.
- **No** `USING(true)` ni `WITH CHECK(true)`. **No** policies DELETE.

## Triggers

| Tabla | Trigger | Propósito |
|---|---|---|
| apply_requests | `_updated_at` | mantiene `updated_at`. |
| apply_requests | `_second_approval` | gates de doble aprobación + self-approval. |
| apply_requests | `_immutable` | `mapping_id`, `company_id`, `employee_id`, `contract_id`, `requested_by`, `requested_at` inmutables. |
| apply_runs | `_signature` | regex SHA-256. |
| apply_runs | `_no_update`/`_no_delete` | append-only. |
| runtime_settings | `_updated_at` | mantiene `updated_at`. |
| runtime_settings | `_supersede` | desmarca current previo del scope. |
| runtime_settings | `_immutable` | campos clave inmutables; permite `is_current`, `rollback_at`, `rollback_run_id`. |
| runtime_settings | `_no_delete` | bloquea DELETE. |

## Qué NO hace B10D.1

- No bridge, no nómina, no flag global.
- No tabla operativa `erp_hr_collective_agreements`.
- No escribe `ready_for_payroll`.
- No crea service TS, edge ni UI.
- No consume `runtime_settings` desde payroll.
- No ejecuta apply real al runtime.
- No cambia `persisted_priority_apply` ni desbloquea C3B3C2.
- No tiene policies DELETE.

## Tests

`src/__tests__/hr/collective-agreement-runtime-apply-schema.test.ts` — **35/35 verdes**.

## Estado

- Migración: `supabase/migrations/20260429121837_*.sql`.
- Tests B10D.1: **35/35 verdes**.
- Suite completa + payroll crítico: **614/614 verdes**.
- `useESPayrollBridge.ts` intacto. `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL=false`.
- B10E: completamente separado.

## Próxima fase

**B10D.2** — service puro `collectiveAgreementRuntimeApplyService` con adapter inyectable + tests.
