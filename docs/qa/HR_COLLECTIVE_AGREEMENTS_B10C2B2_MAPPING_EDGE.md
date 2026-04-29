# HR — Collective Agreements B10C.2B.2B: Mapping Edge Function

## Objetivo

Endpoint admin-gated `erp-hr-company-agreement-registry-mapping` que
expone el service puro B10C.2B.2A sobre HTTP con dual client, JWT
obligatorio, RBAC, company access, Zod strict, anti-tampering y errores
sanitizados.

Aprobar un mapping NO ejecuta nómina con ese convenio. La activación
real queda reservada a B10D.

## Diferencia entre fases

| Fase | Qué hace | Qué NO hace |
|---|---|---|
| B10C.2B.2A | Service puro + tests. | No edge, no UI, no nómina, no bridge. |
| **B10C.2B.2B (esta)** | Edge function dual-client + Zod strict + sanitización + payloads prohibidos. | No UI, no nómina, no bridge, no flag. |
| B10C.2B.2C (futura) | UI interna de gestión y revisión. | Sigue sin tocar nómina. |
| B10D (futura) | Apply real al runtime con doble confirmación humana. | Único punto autorizado a alterar nómina. |

## Endpoint

`POST` `/functions/v1/erp-hr-company-agreement-registry-mapping`

`config.toml`:
```
[functions.erp-hr-company-agreement-registry-mapping]
verify_jwt = true
```

## Acciones

| `action` | Payload | Resultado |
|---|---|---|
| `create_draft` | companyId, employeeId?, contractId?, registryAgreementId, registryVersionId, sourceType, confidenceScore?, rationaleJson?, evidenceUrls? | mapping draft creado |
| `submit_for_review` | mappingId, companyId | draft → pending_review |
| `approve` | mappingId, companyId, humanConfirmed? | pending_review → approved_internal |
| `reject` | mappingId, companyId, reason (≥5) | draft|pending_review → rejected |
| `supersede` | mappingId, companyId, reason (≥5) | mapping → superseded, is_current=false |
| `list` | companyId, employeeId?, contractId?, mappingStatus? | array de mappings |

## Seguridad

- `verify_jwt = true`.
- Bearer JWT obligatorio.
- `userClient.auth.getClaims(token)` para identidad.
- **Dual client**:
  - `userClient` (anon + Authorization header) para identidad y RPC
    `user_has_erp_company_access(p_company_id)`.
  - `adminClient` (service_role, server-side only) para
    lecturas/escrituras tras pasar todos los gates.
- `SUPABASE_SERVICE_ROLE_KEY` solo vía `Deno.env.get`. No se devuelve al
  cliente. No se hardcodea (test estático lo verifica).
- Errores sanitizados via `mapError`. No se devuelve `error.message` ni
  `.stack`.

## Roles autorizados

- `superadmin`
- `admin`
- `hr_manager`
- `legal_manager`
- `payroll_supervisor`

Sin rol autorizado → `403 UNAUTHORIZED_ROLE`.
Sin acceso a la company → `403 NO_COMPANY_ACCESS`.

## Anti-tampering — campos prohibidos en payload

`FORBIDDEN_PAYLOAD_KEYS` rechaza con `400 INVALID_PAYLOAD` si el cliente
envía cualquiera de:

- `approved_by`, `approved_at`, `is_current`
- `ready_for_payroll`, `requires_human_review`, `data_completeness`,
  `salary_tables_loaded`, `source_quality`
- `validation_status`, `signature_hash`, `validated_at`
- `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`
- `persisted_priority_apply`, `C3B3C2`

`approved_by` y `approved_at` los decide siempre el servidor (user.id +
now ISO).

## Adapter

Implementa el contrato `CollectiveAgreementMappingAdapter` del service:

- `getMappingById`
- `getRegistryAgreement` — lee `erp_hr_collective_agreements_registry`
  con los flags de readiness.
- `getRegistryVersion` — lee
  `erp_hr_collective_agreements_registry_versions`.
- `insertMapping`
- `updateMappingStatus`
- `listMappingsForScope`
- `fetchUserRoles` (uso interno del handler)
- `hasCompanyAccess` (RPC `user_has_erp_company_access`)

No existe `delete` en el adapter ni en el handler. Append-only.

## mapError

| Código service | HTTP | Wire code |
|---|---|---|
| `UNAUTHORIZED_ROLE` | 403 | `UNAUTHORIZED_ROLE` |
| `NO_COMPANY_ACCESS` | 403 | `NO_COMPANY_ACCESS` |
| `INVALID_TRANSITION` | 400 | `INVALID_TRANSITION` |
| `REGISTRY_NOT_READY` | 400 | `REGISTRY_NOT_READY` |
| `VERSION_NOT_CURRENT` | 400 | `VERSION_NOT_CURRENT` |
| `IMMUTABLE_FIELD` | 400 | `IMMUTABLE_FIELD` |
| `REASON_REQUIRED` | 400 | `REASON_REQUIRED` |
| `MAPPING_NOT_FOUND` | 404 | `MAPPING_NOT_FOUND` |
| `CNAE_AUTO_APPROVAL_FORBIDDEN` | 400 | `CNAE_AUTO_APPROVAL_FORBIDDEN` |
| `REGISTRY_AGREEMENT_NOT_FOUND` | 404 | `REGISTRY_AGREEMENT_NOT_FOUND` |
| `REGISTRY_VERSION_NOT_FOUND` | 404 | `REGISTRY_VERSION_NOT_FOUND` |
| `VERSION_AGREEMENT_MISMATCH` | 400 | `VERSION_AGREEMENT_MISMATCH` |
| (default) | 500 | `INTERNAL_ERROR` |

## Reglas de aprobación (mirror del service)

`approve` valida server-side:

- estado actual = `pending_review`;
- registry agreement: `ready_for_payroll === true` &&
  `requires_human_review === false` &&
  `data_completeness === 'human_validated'` &&
  `source_quality === 'official'`;
- registry version: existe, `agreement_id` coincide, `is_current === true`;
- si `source_type === 'cnae_suggestion'`, `humanConfirmed === true`
  obligatorio;
- al aprobar: `approved_by = userId`, `approved_at = nowIso`,
  `is_current = true`. El trigger DB
  `supersede_previous_current` marca cualquier mapping anterior del
  scope como `superseded`.

## Qué NO hace B10C.2B.2B

- No toca `useESPayrollBridge` ni `registryShadowFlag`.
- No activa `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` (sigue `false`).
- No toca `agreementSalaryResolver`, `salaryNormalizer`,
  `payrollEngine`, `payslipEngine`.
- No toca tabla operativa `erp_hr_collective_agreements` (sin
  `_registry`).
- No escribe `ready_for_payroll`.
- No tiene `.delete(`.
- No expone service-role al cliente.
- No devuelve `error.message` ni `.stack`.
- No crea UI.
- No ejecuta apply real al runtime de nómina.

## Tests asociados

`src/__tests__/hr/collective-agreement-mapping-edge-static.test.ts`

Cubre 21 casos estáticos:
- `verify_jwt = true` declarado.
- `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`.
- Sin JWT hardcoded.
- Sin tabla operativa sin `_registry`.
- Sin imports de bridge/flag/resolver/normalizer/engines.
- Sin `.delete(`.
- Sin escritura de `ready_for_payroll`.
- `FORBIDDEN_PAYLOAD_KEYS` con los 14 campos.
- ≥6 schemas con `.strict()`.
- 6 acciones declaradas.
- `mapError` presente con `INTERNAL_ERROR`.
- Sin `error.message`/`err.message`/`.stack` devueltos.
- Mirror del service: comprobaciones explícitas de los 4 flags
  registry y del gate cnae.
- `useESPayrollBridge.ts` y `registryShadowFlag.ts` intactos.
- Dual client + `auth.getClaims` + RPC `user_has_erp_company_access`.

Tests Deno runtime se omiten en este Build (cubierto por static +
service tests B10C.2B.2A).

## Estado

- Edge creada: `supabase/functions/erp-hr-company-agreement-registry-mapping/index.ts`.
- Config actualizada: `[functions.erp-hr-company-agreement-registry-mapping] verify_jwt = true`.
- Tests B10C.2B.2B: **21/21 verdes**.
- Suite CA + B10A + B10B + B10C + B10C.2A + B10C.2B.1 + B10C.2B.2A +
  B10C.2B.2B: **528/528 verdes**.
- Payroll crítico: **21/21 verde**.

## Próxima fase

- **B10C.2B.2C**: UI interna `CompanyAgreementRegistryMappingPanel`,
  banner permanente "Mapping interno — no activa nómina", CTAs de
  activación prohibidos.
- **B10D**: apply real al runtime con doble confirmación humana y
  activación de flag por empresa.
