# B8A.2 — Edge Wrapper Admin-Gated para Validación Humana de Convenios

## 1. Objetivo

Edge function que envuelve el service puro B8A
(`collectiveAgreementValidationService`) y expone el workflow de validación
humana firmada del Registro Maestro de Convenios Colectivos a clientes
autenticados, con role-check server-side, service-role aislado y errores
sanitizados.

- Path: `supabase/functions/erp-hr-collective-agreement-validation/index.ts`
- Config: `verify_jwt = true` en `supabase/config.toml`.

## 2. Acciones soportadas

| Action | Resultado |
|---|---|
| `create_draft` | Crea validación en `draft` + checklist (18 ítems pending). |
| `update_checklist_item` | Upsert de un ítem del checklist (owner-only, status draft/pending_review). |
| `submit_for_review` | Pasa de `draft` a `pending_review`. |
| `approve` | Verifica checklist + SHA-256, firma SHA-256 canónica, marca `is_current=true`, supersede previo. |
| `reject` | Firma de rechazo con `notes` obligatorias (>=10 chars). |
| `supersede` | Marca una validación como `superseded`. |

## 3. Contrato HTTP

```jsonc
// Éxito
{ "success": true, "data": {...}, "meta": { "timestamp": "...", "action": "..." } }
// Error
{ "success": false, "error": { "code": "...", "message": "..." }, "meta": { "timestamp": "...", "action": "..." } }
```

## 4. Seguridad

- `verify_jwt = true` en config + `supabase.auth.getClaims(token)` defensivo en código.
- Sin `Authorization: Bearer ...` → **401 UNAUTHORIZED**.
- JWT inválido → **401 UNAUTHORIZED**.
- Role-check temprano vía `adminClient.from('user_roles')` antes de cualquier escritura.
- Roles autorizados: `admin`, `superadmin`, `hr_manager`, `legal_manager`. `auditor` solo lee (RLS); recibe **403 ROLE_NOT_AUTHORIZED** en cualquier acción de este edge.
- `SUPABASE_SERVICE_ROLE_KEY` se obtiene exclusivamente vía `Deno.env.get(...)`. Nunca se devuelve al cliente, nunca se loguea.
- Anti-tampering: el body se rechaza con **400 INVALID_PAYLOAD** si contiene cualquiera de:
  `ready_for_payroll`, `data_completeness`, `salary_tables_loaded`, `requires_human_review`, `official_submission_blocked`, `validation_status`, `signature_hash`, `validated_at`, `is_current`.
- Schemas Zod `.strict()` por acción → cualquier campo extra → **400 INVALID_PAYLOAD**.
- Errores sanitizados vía `mapServiceError`. Nunca se devuelven stacks ni mensajes raw del DB.

## 5. Códigos de error → HTTP

| Code | HTTP |
|---|---|
| `UNAUTHORIZED` | 401 |
| `ROLE_NOT_AUTHORIZED` | 403 |
| `INVALID_ACTION` | 400 |
| `INVALID_PAYLOAD` | 400 |
| `AGREEMENT_NOT_FOUND` / `VERSION_NOT_FOUND` / `SOURCE_NOT_FOUND` / `VALIDATION_NOT_FOUND` | 404 |
| `SHA256_MISMATCH` | 400 |
| `CHECKLIST_INCOMPLETE` | 400 |
| `CRITICAL_WARNINGS_UNRESOLVED` | 400 |
| `NO_PAYROLL_USE_ACK_REQUIRED` | 400 |
| `ACCEPTED_WITH_CAVEAT_REQUIRES_COMMENT` | 400 |
| `INTERNAL_ERROR` | 500 (mensaje genérico) |

## 6. Tablas tocadas (solo registry)

`erp_hr_collective_agreements_registry`,
`erp_hr_collective_agreements_registry_versions`,
`erp_hr_collective_agreements_registry_sources`,
`erp_hr_collective_agreement_registry_validations`,
`erp_hr_collective_agreement_registry_validation_items`,
`erp_hr_collective_agreement_registry_validation_signatures`,
`user_roles` (solo lectura para role-check).

## 7. Qué NO hace

- ❌ No activa `ready_for_payroll`.
- ❌ No modifica `data_completeness`, `salary_tables_loaded`, `requires_human_review`, `official_submission_blocked` del registro maestro.
- ❌ No añade `human_validated` global.
- ❌ No toca nómina (`payroll`, `payslip`, `salaryNormalizer`, `agreementSalaryResolver`, `useESPayrollBridge`).
- ❌ No toca la tabla operativa `erp_hr_collective_agreements`.
- ❌ No toca el parser (B7A) ni el writer (B7B).
- ❌ No abre endpoints sin JWT.
- ❌ No expone `SUPABASE_SERVICE_ROLE_KEY` ni stack traces.

## 8. Relación con B8A

Este edge es un wrapper HTTP del service puro B8A. Toda la lógica de
canonicalización, firma SHA-256, checklist y supersede está alineada con
`src/engines/erp/hr/collectiveAgreementValidationService.ts` y
`src/engines/erp/hr/collectiveAgreementValidationSignature.ts`. La lógica
está inlinada en el edge porque las edge functions Deno no pueden
importar desde `src/`.

## 9. Próximas fases

- **B8A.3 — UI**: pantalla de revisión y firma para roles autorizados, consumirá este edge.
- **B8B / B9 — Activación condicionada**: edge separada que (con doble confirmación humana y auditoría) podrá tocar las flags maestras (`salary_tables_loaded`, `data_completeness`, `ready_for_payroll`) cuando exista una validación `approved_internal` + `is_current = true`.

B8A.2 por sí sola **nunca** abre el camino a nómina real ni a presentaciones oficiales.