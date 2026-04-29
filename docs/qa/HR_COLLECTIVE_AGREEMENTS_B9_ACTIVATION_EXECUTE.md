# B9 — Activation Execute (Registry only)

## Objetivo
Activar efectivamente un convenio del **Registro Maestro** dejando
`ready_for_payroll = true` **únicamente en**
`erp_hr_collective_agreements_registry`, si y solo si:

1. Existe una *activation request* B8B en estado `approved_for_activation`.
2. Existe una segunda aprobación (`decision = approved`) emitida por un
   usuario distinto del solicitante.
3. La función `computeReadiness` revalida en tiempo real **todas** las
   invariantes (validation_status, scope, sha256_alignment,
   source_quality_official, salary_tables_loaded, status vigente/ultra,
   sin warnings críticos pendientes, sin filas críticas descartadas
   pendientes, ≥1 salary table, ≥1 rule).
4. El trigger DB `enforce_ca_registry_ready_for_payroll` **no rechaza**
   la escritura.

## Diferencia B8B / B9 / B10

| Fase | Qué hace | Qué NO hace |
|------|----------|-------------|
| **B8B** | Propuesta de activación + segunda aprobación + readiness report firmado. | No activa nada. |
| **B9**  | **Activa** el registry (3 columnas + 3 flags) y registra el `run`. | No toca nómina, no toca tabla operativa. |
| **B10** | Integración con payroll runtime (consumir `ready_for_payroll`). | (Fuera de B9) |

## Edge Function
`supabase/functions/erp-hr-collective-agreement-activation-execute`

- `verify_jwt = true` (ver `supabase/config.toml`).
- Acciones soportadas:
  - `{ action: 'activate', request_id }`
  - `{ action: 'rollback', run_id }`
- **Role-check server-side**: solo `admin` o `superadmin`.
- **Service-role** se obtiene **únicamente** vía
  `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`. Nunca se devuelve.
- **Errores sanitizados** mediante `mapError`. No se devuelven
  `error.message` crudos ni stack traces.
- `FORBIDDEN_PAYLOAD_KEYS` rechaza cualquier intento del cliente de
  inyectar campos sensibles
  (`ready_for_payroll`, `data_completeness`, `requires_human_review`,
  `salary_tables_loaded`, `official_submission_blocked`, `activated_by`,
  `activated_for_payroll_at`, `activation_request_id`,
  `readiness_report_json`, `readiness_passed`,
  `request_signature_hash`, `approval_signature_hash`).
- Schemas `ActivateSchema` y `RollbackSchema` con `.strict()`.

## Patch permitido (EXACTO 6 keys)

Sobre `erp_hr_collective_agreements_registry` para el `agreement_id`:

| Campo | Valor |
|-------|-------|
| `data_completeness`        | `'human_validated'` |
| `requires_human_review`    | `false` |
| `ready_for_payroll`        | `true` |
| `activated_for_payroll_at` | `now()` (ISO server-side) |
| `activated_by`             | `auth.uid()` del ejecutor |
| `activation_request_id`    | `request.id` |

## Trigger DB como última defensa
`enforce_ca_registry_ready_for_payroll` permanece intacto. Si por
cualquier razón (race condition, bug de readiness) el patch viola las
invariantes, el trigger rechaza con `23514` y el edge:

- captura `isCheckViolation`,
- inserta un `run` con `outcome = 'blocked_by_trigger'`,
- responde `409 BLOCKED_BY_TRIGGER`.

## Runs (append-only)
Tabla: `erp_hr_collective_agreement_registry_activation_runs`.
Posibles `outcome`:

- `activated` — patch aplicado + firma SHA-256.
- `blocked_by_invariant` — readiness recalculada falla.
- `blocked_by_trigger` — trigger DB rechaza el patch.
- `rolled_back` — rollback admin desde `pre_state_snapshot_json`.

Cada `run` lleva `pre_state_snapshot_json` y `post_state_snapshot_json`
(snapshot exacto de las 6 keys de SNAPSHOT_KEYS) y, cuando aplica,
`run_signature_hash` (SHA-256 de un JSON estable).

## Rollback
- Solo admin/superadmin.
- Solo sobre `runs` con `outcome = 'activated'`.
- Restaura el registry desde `pre_state_snapshot_json`.
- **Append-only**: NO borra `runs`. Inserta un nuevo run
  `outcome = 'rolled_back'`.

## Migración B9
`20260429090950_785a97f8-c270-4de7-b293-a4df93190d26.sql`

Solo añade 3 columnas al registry:

- `activated_for_payroll_at timestamptz NULL`
- `activated_by uuid NULL REFERENCES auth.users(id)`
- `activation_request_id uuid NULL REFERENCES
   public.erp_hr_collective_agreement_registry_activation_requests(id)`

Más un índice por `activation_request_id`.

**No** añade políticas RLS de INSERT/UPDATE sobre el registry, **no**
toca el trigger, **no** modifica salary_tables / rules / sources /
versions, **no** menciona la tabla operativa.

## Qué NO hace B9
- ❌ No toca **nómina** (payroll engine, payslipEngine).
- ❌ No toca la **tabla operativa** `erp_hr_collective_agreements`.
- ❌ No toca el **resolver** (`agreementSalaryResolver`,
  `salaryNormalizer`).
- ❌ No toca el **bridge** (`useESPayrollBridge`).
- ❌ No migra empresas.
- ❌ No invoca la edge B8B proposal.
- ❌ No precalcula nada que B10 vaya a consumir.

## Próxima fase
**B10** — Integración con runtime de payroll: consumir el flag
`ready_for_payroll` del registry desde el resolver/bridge bajo feature
flag y con auditoría completa.
