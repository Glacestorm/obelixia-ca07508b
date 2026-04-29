# B10F.4 — Pilot decision log (append-only)

## Objetivo

Persistir, de forma **append-only e inmutable**, las decisiones piloto
que la rama `HR_REGISTRY_PILOT_MODE` toma en `useESPayrollBridge`
(ver B10F.3): aplicado, bloqueado o fallback. La traza permite
auditar cada intento del Registry en nómina antes de cualquier
activación global.

## Por qué tabla separada y NO `apply_runs.outcome`

`erp_hr_company_agreement_registry_apply_runs.outcome` modela el
**ciclo de vida operativo** de la activación runtime (`activated`,
`blocked_by_invariant`, `rolled_back`). Mezclar valores piloto
(`pilot_applied`, `pilot_blocked`, `pilot_fallback`) en su CHECK:

- contaminaría el audit trail operativo;
- forzaría a cambiar el CHECK existente, rompiendo el contrato
  validado en B10D;
- haría imposible distinguir "activación real efectuada por humano
  con doble aprobación" de "intento piloto evaluado en cada cálculo
  de nómina".

B10F.4 introduce, por tanto, una tabla **dedicada y aislada**:

`public.erp_hr_company_agreement_registry_pilot_decision_logs`

## Esquema

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `company_id` | uuid NOT NULL | scope obligatorio |
| `employee_id` | uuid NOT NULL | scope obligatorio |
| `contract_id` | uuid NOT NULL | scope obligatorio |
| `target_year` | integer NOT NULL | > 0 (validado por trigger) |
| `runtime_setting_id` | uuid NULL | FK runtime_settings RESTRICT |
| `mapping_id` | uuid NULL | FK mappings RESTRICT |
| `registry_agreement_id` | uuid NULL | FK registry agreements RESTRICT |
| `registry_version_id` | uuid NULL | FK registry versions RESTRICT |
| `decision_outcome` | text NOT NULL | CHECK ∈ pilot_applied / pilot_blocked / pilot_fallback |
| `decision_reason` | text NOT NULL | min length 1 (trigger) |
| `comparison_summary_json` | jsonb NOT NULL | summary del comparator B10B |
| `blockers_json` | jsonb NOT NULL | array de blockers |
| `warnings_json` | jsonb NOT NULL | array de warnings |
| `trace_json` | jsonb NOT NULL | traza no enumerable de B10F.3 |
| `decided_by` | uuid NULL | FK auth.users (rellenado server-side) |
| `decided_at` | timestamptz NOT NULL | server-side `now()` |
| `signature_hash` | text NOT NULL | SHA-256 server-side, regex `^[a-f0-9]{64}$` |
| `created_at` | timestamptz NOT NULL | `now()` |

### Append-only

- `BEFORE INSERT trg_car_pilot_decision_logs_validate`: signature
  format, scope no nulo, `target_year > 0`, `decision_reason` no
  vacía. CHECK `decision_outcome` aparte.
- `BEFORE UPDATE trg_car_pilot_decision_logs_no_update` →
  `pilot_decision_logs_append_only`.
- `BEFORE DELETE trg_car_pilot_decision_logs_no_delete` →
  `pilot_decision_logs_append_only`.
- No CHECK con `now()` (Postgres requiere CHECK inmutable).

## RLS

- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`.
- Política única **SELECT** `car_pilot_decision_logs_select_authorized`:
  `user_has_erp_company_access(company_id)` AND uno de los roles
  `superadmin`, `admin`, `hr_manager`, `legal_manager`,
  `payroll_supervisor`, `auditor`.
- **Sin** políticas INSERT/UPDATE/DELETE para clientes.
- Sin `USING(true)` ni `WITH CHECK(true)`.

Las escrituras suceden únicamente desde el edge tras los gates
(JWT + rol + RPC company access), usando service-role server-side.

## Edge function

`supabase/functions/erp-hr-pilot-runtime-decision-log/index.ts`,
`verify_jwt = true`.

### Acciones

| Acción | Roles autorizados |
|---|---|
| `log_decision` | superadmin, admin, payroll_supervisor, legal_manager |
| `list_decisions` | superadmin, admin, hr_manager, legal_manager, payroll_supervisor, auditor |

### `log_decision` — payload (Zod `.strict()`)

```ts
{
  action: 'log_decision',
  companyId: uuid,
  employeeId: uuid,
  contractId: uuid,
  targetYear: number,
  runtimeSettingId?: uuid,
  mappingId?: uuid,
  registryAgreementId?: uuid,
  registryVersionId?: uuid,
  decisionOutcome: 'pilot_applied' | 'pilot_blocked' | 'pilot_fallback',
  decisionReason: string,    // 1..500
  comparisonSummary?: object,
  blockers?: string[],
  warnings?: string[],
  trace?: object
}
```

### `list_decisions` — payload

```ts
{
  action: 'list_decisions',
  companyId: uuid,
  employeeId?: uuid,
  contractId?: uuid,
  targetYear?: number,
  limit?: number   // max 100
}
```

Devuelve los logs ordenados por `decided_at` desc, capados a 100.

### Firma SHA-256 server-side

Calculada con `sha256Hex(stableStringify(canonicalPayload))` sobre:

- `company_id`, `employee_id`, `contract_id`, `target_year`,
- `decision_outcome`, `decision_reason`,
- `mapping_id`, `registry_agreement_id`, `registry_version_id`,
- `decided_by` (= identidad del JWT, no del cliente),
- `decided_at` (= server `now()`),
- `comparison_summary_json`, `blockers_json`, `warnings_json`.

El cliente **nunca** envía `signature_hash`, `decided_by` ni
`decided_at`: están en `FORBIDDEN_PAYLOAD_KEYS` y se rechazan con
`400 FORBIDDEN_PAYLOAD_KEY`.

### `FORBIDDEN_PAYLOAD_KEYS`

```
signature_hash, decided_by, decided_at, created_at,
ready_for_payroll, requires_human_review, data_completeness,
salary_tables_loaded, source_quality,
HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL, HR_REGISTRY_PILOT_MODE,
REGISTRY_PILOT_SCOPE_ALLOWLIST, persisted_priority_apply, C3B3C2,
service_role, SUPABASE_SERVICE_ROLE_KEY
```

### Hardening

- `verify_jwt = true`.
- Identity-bound `userClient` (auth header) + `adminClient`
  service-role nunca expuesto.
- `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` (no hardcoded).
- Errores sanitizados via `mapError` — sin `error.message` raw,
  sin `.stack`.
- Sin `.delete(`.
- Sin imports a `src/` (bridge, shadow flag, pilot gate, payroll,
  resolver, normalizer).
- Sin referencia a tabla operativa `erp_hr_collective_agreements`.

## Qué NO hace B10F.4

- ❌ No toca `useESPayrollBridge`.
- ❌ No toca `registryShadowFlag`.
- ❌ No toca `registryPilotGate`.
- ❌ No cambia `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- ❌ No cambia `HR_REGISTRY_PILOT_MODE`.
- ❌ No añade scopes a `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- ❌ No ejecuta nómina con registry.
- ❌ No modifica `ready_for_payroll`.
- ❌ No modifica `persisted_priority_apply`.
- ❌ No desbloquea C3B3C2.
- ❌ No toca `apply_runs.outcome` ni su CHECK.
- ❌ No toca tabla operativa `erp_hr_collective_agreements`.
- ❌ No es B10F.5 (UI monitor).

## Estado de la cadena B10F

- [x] B10F.1 Pilot gate puro
- [x] B10F.2 Parity preflight wrapper
- [x] B10F.3 Bridge integration (doble gate, ambos OFF)
- [x] B10F.4 Pilot decision log append-only
- [ ] B10F.5 UI monitor read-only

## Próxima fase

**B10F.5** — UI monitor read-only que consume `list_decisions` para
visualizar la traza piloto por scope, distinguiendo `pilot_applied`
vs `pilot_blocked` vs `pilot_fallback` y exponiendo
`comparison_summary` y `blockers` para auditoría humana antes de
activar el global flag.
