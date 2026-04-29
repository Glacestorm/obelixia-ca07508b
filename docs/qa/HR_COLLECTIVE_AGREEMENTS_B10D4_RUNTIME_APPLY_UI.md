# B10D.4 — Runtime apply UI (internal)

## Objetivo

UI interna para gestionar el ciclo de vida del **apply real
controlado por empresa** del mapping del Registry: creación de
request, segunda aprobación distinta del solicitante, activación de
`runtime_settings` por scope y rollback explícito. Toda la lógica de
negocio y persistencia se realiza vía la edge `erp-hr-company-agreement-runtime-apply`
(B10D.3) que envuelve el service puro B10D.2 sobre las tablas creadas
en B10D.1.

B10D.4 **NO toca payroll runtime** y **NO activa el flag global**: la
integración real con el bridge sigue reservada a B10E.

## Relación entre fases

| Fase | Alcance |
|------|---------|
| B10D.1 | Migraciones + RLS + triggers |
| B10D.2 | Service puro |
| B10D.3 | Edge function |
| **B10D.4** | **UI interna (este documento)** |
| B10E | Integración real con bridge / payroll |

## Componentes

Directorio: `src/components/erp/hr/collective-agreements/runtime-apply/`

- `RuntimeApplyRequestPanel.tsx` — panel principal (lista + acciones).
- `RuntimeApplyStatusBadge.tsx` — badge de estado (7 estados).
- `RuntimeApplyInvariantsCard.tsx` — los 14 gates server-side, lectura.
- `RuntimeApplyComparisonReportCard.tsx` — JSON del reporte comparativo.
- `RuntimeApplyImpactPreviewCard.tsx` — preview JSON del impacto en nómina.
- `RuntimeApplySecondApprovalDialog.tsx` — diálogo con 4 acknowledgements.
- `RuntimeRollbackDialog.tsx` — rollback / reject con reason ≥10.
- `RuntimeApplyHistoryList.tsx` — historial de requests por scope.

## Hook

`src/hooks/erp/hr/useCompanyAgreementRuntimeApplyActions.ts`

Acciones expuestas: `createRequest`, `submitForSecondApproval`,
`secondApprove`, `reject`, `activate`, `rollback`, `list`.

Cada función invoca la edge `erp-hr-company-agreement-runtime-apply`
vía `supabase.functions.invoke`. **Ninguna** acción escribe directo en
tablas. El hook expone `FORBIDDEN_PAYLOAD_KEYS` y un `sanitize` que
elimina campos prohibidos (server-decided o reservados a B10E) antes
de invocar la edge.

## Edge usada

`erp-hr-company-agreement-runtime-apply` (B10D.3) con `verify_jwt = true`.
Acciones soportadas: `create_request`, `submit_for_second_approval`,
`second_approve`, `reject`, `activate`, `rollback`, `list`.

## Banner permanente B10E

El panel siempre renderiza:

> **Activación interna del registry por scope — el bridge sigue desactivado globalmente.**
>
> Activar aquí registra el scope como elegible para registry en payroll
> runtime, pero el cambio efectivo en nómina requiere una fase
> posterior B10E.

## Segunda aprobación

`RuntimeApplySecondApprovalDialog` exige las 4 acks (todas en true):

- `understands_runtime_enable`
- `reviewed_comparison_report`
- `reviewed_payroll_impact`
- `confirms_rollback_available`

Mientras falte alguna, el botón "Confirmar 2ª aprobación" queda
deshabilitado. Además se renderiza una advertencia explícita:

> La segunda aprobación no puede realizarla el mismo usuario solicitante.

El check real (`actor.userId !== request.requested_by`) se hace
server-side en la edge.

## Rollback

`RuntimeRollbackDialog` exige reason ≥ 10 caracteres (mismo límite que
la edge). Cubre:

- `rollback` (solo disponible si status = `activated`).
- `reject` (solo disponible si status ∈ {`draft`, `pending_second_approval`}).

## CTAs prohibidos

La UI no puede contener:

- "Aplicar en nómina ya"
- "Activar payroll global"
- "Activar flag global"
- "Cambiar nómina ahora"
- "HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL"
- "Usar registry en nómina ahora"
- "Ejecutar nómina con registry"
- "Activar nómina registry"

Verificado por el test estático.

## Gating UI

- `canManage=false` deshabilita todas las acciones.
- `submit` solo en `draft`.
- `second approve` solo en `pending_second_approval`.
- `activate` solo en `approved_for_runtime`.
- `rollback` solo en `activated`.
- `reject` solo en `draft` o `pending_second_approval`.
- `reject` y `rollback` exigen reason ≥ 10.

## Qué NO hace B10D.4

- No toca el bridge `useESPayrollBridge`.
- No toca payroll/payslip engines, salary resolver/normalizer,
  agreement safety gate.
- No lee ni activa `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- No toca tabla operativa `erp_hr_collective_agreements`.
- No escribe directo en DB (`.from(...).insert/.update/.upsert/.delete`).
- No mutates `ready_for_payroll` del registry.
- No es B10E.
- No desbloquea C3B3C2.

## Tests

- Behavioural: `src/__tests__/hr/collective-agreement-runtime-apply-ui.test.tsx`.
- Static contract: `src/__tests__/hr/collective-agreement-runtime-apply-ui-static.test.ts`.

## Próxima fase

**B10E — Integración real con bridge / payroll**: única fase
autorizada a leer `runtime_settings` desde el bridge y activar
`HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` por scope.