# HR — Collective Agreements B10C.2B.2A: Mapping Service (pure, no payroll)

## Objetivo

Capa **pura** que gestiona internamente las decisiones humanas de mapping
entre una empresa / empleado / contrato y un convenio del Registro
Maestro (Registry). Aprobar un mapping aquí **no** ejecuta nómina con ese
convenio. La activación efectiva queda reservada a B10D.

B10C.2B.2A es **service puro + tests + docs**. No es edge, no es UI, no
es runtime de nómina, no es bridge.

## Diferencia entre fases

| Fase | Qué hace | Qué NO hace |
|---|---|---|
| B10C.2A | Helper puro de scoring + preview de candidatos. | No DB, no bridge, no apply, no flag. |
| B10C.2B.1 | Tabla persistente + RLS + triggers. | No service, no UI, no edge. |
| **B10C.2B.2A (esta)** | Service puro con adapter inyectable para gestionar transiciones del mapping. | No edge, no UI, no nómina, no bridge, no flag. |
| B10C.2B.2B (futura) | Edge function con dual client + Zod strict + sanitización de errores. | Sigue sin tocar nómina. |
| B10C.2B.2C (futura) | UI interna de gestión y revisión humana. | Sigue sin tocar nómina. |
| B10D (futura) | Apply real al runtime usando mappings aprobados, doble confirmación humana, flag por empresa. | Único punto autorizado a alterar nómina. |

## Qué gestiona

- Crear borradores de mapping.
- Enviar a revisión.
- Aprobar internamente (con `approved_by`/`approved_at` SIEMPRE
  derivados del actor server-side).
- Rechazar con motivo obligatorio.
- Superseder con motivo obligatorio (sin borrar nada).
- Listar mappings de un scope dado.

## Estados y transiciones

```text
draft ──submit──▶ pending_review ──approve──▶ approved_internal
  │                       │
  └──reject──▶ rejected   └──reject──▶ rejected

approved_internal ──(nuevo is_current entra)──▶ superseded
(superseded vía supersedeMapping también permitido)
```

- Inmutables tras crear: `registry_agreement_id`, `registry_version_id`,
  `company_id`, `employee_id`, `contract_id`. El service no expone
  ninguna función que los modifique. La DB también lo bloquea por trigger.

## Reglas de aprobación

`approveMapping` exige TODOS:

- estado actual = `pending_review`;
- `actor` con rol autorizado y company access;
- registry agreement:
  - `ready_for_payroll === true`
  - `requires_human_review === false`
  - `data_completeness === 'human_validated'`
  - `source_quality === 'official'`
- registry version:
  - existe;
  - `agreement_id` coincide con el del mapping;
  - `is_current === true`.
- si `source_type === 'cnae_suggestion'`, `humanConfirmed === true` es
  obligatorio (no aprobación automática).
- `approved_by = actor.userId` y `approved_at = actor.now() ISO`
  asignados server-side. El cliente no los decide.
- al aprobar, `is_current = true`. El trigger DB
  `supersede_previous_current` marca cualquier mapping anterior del
  scope como `superseded` automáticamente.

## Errores canónicos

`MappingServiceError.code`:

- `UNAUTHORIZED_ROLE`
- `NO_COMPANY_ACCESS`
- `INVALID_TRANSITION`
- `REGISTRY_NOT_READY`
- `VERSION_NOT_CURRENT`
- `IMMUTABLE_FIELD` (reservado; la DB lo aplica)
- `REASON_REQUIRED`
- `MAPPING_NOT_FOUND`
- `CNAE_AUTO_APPROVAL_FORBIDDEN`
- `REGISTRY_AGREEMENT_NOT_FOUND`
- `REGISTRY_VERSION_NOT_FOUND`
- `VERSION_AGREEMENT_MISMATCH`

## Adapter

`CollectiveAgreementMappingAdapter` desacopla el service de cualquier
infraestructura. Métodos:

- `getMappingById`
- `getRegistryAgreement`
- `getRegistryVersion`
- `insertMapping`
- `updateMappingStatus`
- `listMappingsForScope`

No existe `delete` en el contrato. La supersesión es un cambio de estado.

El edge B10C.2B.2B implementará una versión real del adapter sobre
Supabase con dual client; el service queda intacto.

## Qué NO hace B10C.2B.2A

- No toca `useESPayrollBridge` ni `registryShadowFlag` ni
  `registryShadowPreview`.
- No activa `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` (sigue `false`).
- No toca `agreementSalaryResolver`, `salaryNormalizer`,
  `payrollEngine`, `payslipEngine`, `agreementSafetyGate`.
- No toca tabla operativa `erp_hr_collective_agreements` (sin
  `_registry`).
- No escribe `ready_for_payroll`.
- No expone `applyToPayroll` ni `activateForPayroll`.
- No tiene `.delete(`.
- No importa Supabase, fetch, React, hooks, Deno.
- No usa `service_role`.

## Tests asociados

`src/__tests__/hr/collective-agreement-mapping-service.test.ts`

- `createMappingDraft`: feliz, rol, company access, agreement no
  encontrado, version no encontrada, version-agreement mismatch.
- `submitMappingForReview`: feliz, transición inválida, no encontrado.
- `approveMapping`: feliz (con `approved_by/at` server-side),
  draft → INVALID_TRANSITION, gates de readiness (4 variantes),
  version no current, cnae sin humanConfirmed, cnae con humanConfirmed.
- `rejectMapping`: reason corto, reason válido, transición inválida.
- `supersedeMapping`: sin reason, con reason, sin delete en adapter.
- `listMappingsForScope`: company access.
- `MappingServiceError`: contrato.
- Static contract: sin imports prohibidos, sin
  bridge/flag/resolver/normalizer/engines, sin apply/activate, sin
  `.delete(`, sin tabla operativa, sin escritura de
  `ready_for_payroll`. `useESPayrollBridge.ts` y
  `registryShadowFlag.ts` intactos.

## Estado

- Service creado: `src/engines/erp/hr/collectiveAgreementMappingService.ts`.
- Tests B10C.2B.2A: **34/34 verdes**.
- Suite CA + B10A + B10B + B10C + B10C.2A + B10C.2B.1 + B10C.2B.2A: **507/507 verdes**.
- Payroll crítico: **21/21 verde**.

## Próxima fase

- **B10C.2B.2B**: edge function `erp-hr-company-agreement-registry-mapping`
  con `verify_jwt=true`, dual client, Zod strict, payloads prohibidos,
  errores sanitizados, tests static + Deno.
- **B10C.2B.2C**: UI interna de gestión, banner permanente
  "Mapping interno — no activa nómina", sin CTAs de activación.
- **B10D**: apply real al runtime con doble confirmación humana.
