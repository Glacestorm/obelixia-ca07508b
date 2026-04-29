# HR — Collective Agreements B10C.2B.2C: Mapping Internal UI

## Objetivo

UI interna para gestión de mappings empresa/contrato/empleado →
convenio del Registro Maestro. Consume exclusivamente la edge
`erp-hr-company-agreement-registry-mapping` (B10C.2B.2B) a través del
hook `useCompanyAgreementRegistryMappingActions`.

Aprobar un mapping aquí **NO** ejecuta nómina con ese convenio. La
activación real al runtime queda reservada a B10D.

## Diferencia entre fases

| Fase | Qué hace | Qué NO hace |
|---|---|---|
| B10C.2B.2A | Service puro + tests. | No edge, no UI, no nómina. |
| B10C.2B.2B | Edge function dual-client. | No UI, no nómina. |
| **B10C.2B.2C (esta)** | UI interna de revisión y gestión. | No nómina, no bridge, no flag. |
| B10D (futura) | Apply real con doble confirmación humana. | Único punto autorizado a alterar nómina. |

## Pantallas / componentes

`src/components/erp/hr/collective-agreements/mappings/`

| Componente | Propósito |
|---|---|
| `CompanyAgreementRegistryMappingPanel.tsx` | Panel principal: banner, lista, detalle, acciones. |
| `MappingStatusBadge.tsx` | Badge de estado (`draft`/`pending_review`/`approved_internal`/`rejected`/`superseded`). |
| `MappingRationaleCard.tsx` | Renderiza `rationale_json`, blockers, warnings, evidencia. |
| `MappingCandidateSignalsTable.tsx` | Tabla de signals del candidato (preview B10C.2A). |
| `MappingHistoryList.tsx` | Histórico append-only del scope (con marca "Actual"). |
| `MappingActionDialog.tsx` | Confirmación: motivo ≥5, checkbox cnae, warning blockers. |

Hook:

| Hook | Propósito |
|---|---|
| `src/hooks/erp/hr/useCompanyAgreementRegistryMappingActions.ts` | Encapsula `create_draft`, `submit_for_review`, `approve`, `reject`, `supersede`, `list`. Sanitiza `FORBIDDEN_PAYLOAD_KEYS`. |

## Acciones UI

| Acción | Estado origen | Gating UI |
|---|---|---|
| Enviar a revisión | `draft` | `canManage`. |
| Aprobar interno | `pending_review` | `canManage`, sin blockers. Si `source_type='cnae_suggestion'` exige checkbox "Confirmo selección humana". |
| Rechazar | `draft` o `pending_review` | `canManage` + motivo ≥ 5 caracteres. |
| Superar | `approved_internal` o `pending_review` | `canManage` + motivo ≥ 5 caracteres. |

Todas las acciones se enrutan vía
`supabase.functions.invoke('erp-hr-company-agreement-registry-mapping', ...)`.

## Banner permanente (obligatorio)

> **Mapping interno — no activa nómina.**
>
> Aprobar un mapping aquí no ejecuta nómina con ese convenio. La
> activación real requiere una fase posterior.

## CTAs prohibidos (test estático)

La UI no puede contener ninguna de estas cadenas:

- `Aplicar en nómina`
- `Activar payroll`
- `Usar en nómina`
- `Cambiar nómina`
- `Activar flag`
- `Activar para nómina`
- `ready_for_payroll`
- `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`

## Forbidden payload keys (sanitizados por el hook)

`approved_by`, `approved_at`, `is_current`, `ready_for_payroll`,
`requires_human_review`, `data_completeness`, `salary_tables_loaded`,
`source_quality`, `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
`persisted_priority_apply`, `C3B3C2`, `validation_status`,
`signature_hash`.

Si el caller los pasa, el hook los descarta antes de invocar la edge.
La edge B10C.2B.2B también los rechaza con `400 INVALID_PAYLOAD`.

## Qué NO hace B10C.2B.2C

- No toca `useESPayrollBridge`.
- No toca `registryShadowFlag` ni activa
  `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` (sigue `false`).
- No toca `agreementSalaryResolver`, `salaryNormalizer`,
  `payrollEngine`, `payslipEngine`.
- No toca tabla operativa `erp_hr_collective_agreements` (sin
  `_registry`).
- No tiene escrituras directas
  (`.from(...).insert/.update/.upsert/.delete`).
- No usa `service_role`.
- No escribe `ready_for_payroll`.
- No ejecuta apply real al runtime.
- No cambia `persisted_priority_apply`.
- No desbloquea C3B3C2.

## Tests asociados

`src/__tests__/hr/collective-agreement-mapping-ui-static.test.ts` (17
casos): banner, CTAs prohibidos, identificadores prohibidos, sin
`.from(...).insert/.update/.upsert/.delete`, sin `service_role`, sin
tabla operativa, hook con 6 acciones y `FORBIDDEN_PAYLOAD_KEYS`,
integridad de `useESPayrollBridge` y `registryShadowFlag`.

`src/__tests__/hr/collective-agreement-mapping-ui.test.tsx` (13
casos): render del banner, ausencia de CTAs prohibidos,
`canManage=false` deshabilita acciones, badges de los 5 estados,
approve deshabilitado con blockers, gating de motivo en reject/
supersede, gating de checkbox cnae, routing de approve/reject/
supersede a la edge, sanitización de payload prohibido por el hook.

## Estado

- Componentes creados: 6.
- Hook creado: `useCompanyAgreementRegistryMappingActions`.
- Tests B10C.2B.2C: **30/30 verdes**.
- Suite collective-agreements + B10A + B10B + B10C + B10C.2A +
  B10C.2B.* : **558/558 verdes**.
- Payroll crítico: **21/21 verde**.

## Próxima fase

- **B10D**: apply real al runtime con doble confirmación humana,
  activación de flag por empresa, audit ledger, integración real con
  `useESPayrollBridge`.