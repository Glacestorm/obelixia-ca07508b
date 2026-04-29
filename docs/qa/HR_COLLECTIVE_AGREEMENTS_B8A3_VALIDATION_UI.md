# B8A.3 — UI de validación humana firmada de convenios

## Objetivo
UI interna admin-gated para validar convenios del Registro Maestro consumiendo la edge B8A.2 (`erp-hr-collective-agreement-validation`).

## Componentes
- `CollectiveAgreementValidationPanel` (contenedor con tabs)
- `AgreementValidationHeader`, `AgreementSourceHashCard`,
  `AgreementSalaryRowsReviewTable`, `AgreementRulesReviewCard`,
  `AgreementParserWarningsPanel`, `AgreementDiscardedRowsPanel`,
  `AgreementValidationChecklist`, `AgreementSignatureCard`,
  `AgreementValidationHistory`
- Internos: `NotOfficialBanner`, `ValidationStatusBadge`, `ChecklistItemRow`

## Hooks
- `useCollectiveAgreementValidation` — lectura via user client + RLS.
- `useCollectiveAgreementValidationActions` — escrituras EXCLUSIVAMENTE via
  `supabase.functions.invoke('erp-hr-collective-agreement-validation', …)`.

## Acciones
`create_draft`, `update_checklist_item`, `submit_for_review`, `approve`,
`reject`, `supersede`.

## Roles UI (defensa en profundidad)
`admin`, `superadmin`, `hr_manager`, `legal_manager`. Autorización real:
server-side en B8A.2.

## Banner permanente
> "Validación interna — no oficial. No activa el uso en nómina."

## Validaciones cliente
- `accepted_with_caveat` exige comment.
- `no_payroll_use_acknowledged` debe ser `verified` para Aprobar.
- Ningún item `pending`/`rejected` para Aprobar.
- Critical unresolved warning bloquea Aprobar.
- SHA mismatch (source vs version) bloquea Aprobar.
- Reject exige notes ≥10. Supersede exige reason ≥5.

## Qué NO hace
- No activa `ready_for_payroll`.
- No cambia `data_completeness` global ni `human_validated`.
- No toca nómina ni motores (`payslipEngine`, `salaryNormalizer`,
  `agreementSalaryResolver`, `useESPayrollBridge`).
- No toca tabla operativa `erp_hr_collective_agreements`.
- No escribe directo en tablas (todas las escrituras pasan por edge B8A.2).
- No usa `service_role`.
- No presenta la validación como artefacto oficial.

## Próximas fases
- B8B / B9 — activación condicionada de uso en nómina sobre validaciones
  internas firmadas + condiciones adicionales.
