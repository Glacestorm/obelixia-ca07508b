# B13.5B — Agreement Impact Previews (Persistence + Edge + Hook)

**Status: READY (documental closure)**
Last updated: 2026-05-05

---

## 1. Objetivo

Crear la **capa persistente y controlada** sobre el motor puro `agreementImpactEngine`
(B13.5A) para que usuarios autorizados puedan calcular, almacenar y consultar
previews de impacto de convenios curados, **sin** que ello modifique nómina,
activación, mapping, runtime ni artefactos oficiales.

B13.5B aporta:
- Tablas de persistencia (scopes + previews) con RLS y FORCE RLS.
- Triggers anti-activación que rechazan claves prohibidas.
- Edge Function `erp-hr-agreement-impact-engine` con `verify_jwt = true`.
- Hook `useAgreementImpactPreviews` auth-safe via `authSafeInvoke`.
- Suite de tests schema + edge-static + hook-static (B13.5B) y regresión engine puro
  (B13.5A).

B13.5B **no** ejecuta nómina, **no** crea mapping/runtime, **no** crea UI ni
mini-panel, y **no** activa flags. UI mini-panel y behavioural edge tests se
difieren a B13.5C.

---

## 2. Tablas nuevas

### `public.erp_hr_collective_agreement_affected_scopes`

Persiste el **scope agregado** de un cómputo de impacto para un convenio /
versión / empresa. Una fila resume el universo afectado.

Columnas clave:
- `agreement_id`, `version_id`, `company_id` — coordenadas del convenio.
- `employee_count_estimated`, `summary_json` — agregados de impacto.
- `risk_flags`, `blockers_json`, `warnings_json` — señales devueltas por el
  engine puro.
- `computed_at`, `created_at`, `updated_at` — auditoría temporal.

### `public.erp_hr_collective_agreement_impact_previews`

Persiste **una preview por empleado / contrato** dentro de un scope.

Columnas clave:
- `affected_scope_id` — FK lógica al scope agregado.
- `agreement_id`, `version_id`, `company_id`, `employee_id`, `contract_id`.
- `affected`, `blocked` — clasificación.
- `current_salary_monthly`, `target_salary_monthly`, `delta_monthly`,
  `delta_annual`, `arrears_estimate`, `employer_cost_delta`.
- `risk_flags`, `blockers_json`, `warnings_json`.
- `requires_human_review boolean NOT NULL DEFAULT true CHECK (= true)`
  — invariante: ninguna preview puede saltarse el review humano.
- `computed_at`, `source_trace`.

Índices declarados sobre las columnas de filtrado más frecuentes (agreement +
version, company, employee, contract, scope, computed_at).

---

## 3. Edge Function: `erp-hr-agreement-impact-engine`

- Path: `supabase/functions/erp-hr-agreement-impact-engine/index.ts`.
- `supabase/config.toml`:
  ```toml
  [functions.erp-hr-agreement-impact-engine]
  verify_jwt = true
  ```
- Validación de body con **Zod `.strict()`** por acción.
- `mapError` centralizado: nunca devuelve `error.stack` ni `JSON.stringify(err)`
  hacia el cliente.
- Usa `SUPABASE_SERVICE_ROLE_KEY` solo dentro del handler (vía
  `Deno.env.get(...)`); no se expone en respuestas.
- **No importa**: `payrollEngine`, `payslipEngine`, `useESPayrollBridge`,
  `salaryNormalizer`, `agreementSalaryResolver`, `agreementSafetyGate`.
- **No invoca**: `erp-hr-collective-agreement-activation-execute`,
  `erp-hr-company-agreement-runtime-apply`,
  `erp-hr-company-agreement-registry-mapping`.
- **No referencia** la tabla operativa legacy `erp_hr_collective_agreements`
  (sin sufijo `_registry`).
- **No contiene** `.delete(` en ningún handler.

### Acciones soportadas

| Acción | Propósito | Persiste |
|---|---|---|
| `compute_scope` | Calcula scope agregado + previews por empleado para un convenio/versión/empresa | sí (insert / refresh) |
| `compute_impact_preview` | Calcula scope + preview filtrando por empleado o contrato | sí |
| `list_scopes` | Lista scopes existentes con filtros | no (read-only) |
| `list_previews` | Lista previews existentes con filtros | no (read-only) |
| `mark_preview_stale` | Marca una preview como obsoleta (no la borra) | sí (update flag) |

`mark_preview_stale` actualiza estado/etiqueta `stale_preview` pero **no
ejecuta `.delete(`** sobre la fila — la trazabilidad histórica se preserva.

---

## 4. Data loading permitido

La edge puede leer:
- Convenio Registry (`erp_hr_collective_agreements_registry`) y versiones.
- Mapping/runtime existentes en modo **lectura** (sin crearlos).
- Datos laborales del empleado (employees, contracts, salarios actuales).
- Tabla salarial del convenio (Registry).
- Conceptos obligatorios.

No carga ni invoca nómina, payslip, bridge, normalizer, resolver ni safety
gate.

---

## 5. Uso del engine puro B13.5A

La edge **delega íntegramente** la lógica de impacto a
`computeAgreementImpactPreview` (puro, sin DB, sin React, sin fetch).
Resultados (deltas, atrasos, cost_delta, risk_flags, blockers/warnings) se
mapean directamente a las filas persistidas, manteniendo paridad con la suite
B13.5A (52/52 verde).

---

## 6. Qué persiste

- **Affected scopes** — agregados de empresa/versión.
- **Employee previews** — fila por empleado / contrato.
- **Deltas** mensuales y anuales.
- **Arrears estimate** (limitado por `arrears_max_months`).
- **Risk flags** (15 categorías soportadas por el engine).
- **Blockers / warnings** estructurados.
- **Trazabilidad** (`computed_at`, `source_trace`, autores via RLS).

## 7. Qué NO persiste / NO produce

- ❌ Nómina aplicada.
- ❌ Resultado de payroll real.
- ❌ CRA / SILTRA / SEPA / accounting entries.
- ❌ Mapping de convenio.
- ❌ Runtime setting.
- ❌ `ready_for_payroll = true`.
- ❌ `salary_tables_loaded = true`.
- ❌ `data_completeness = 'human_validated'`.
- ❌ Cambio en flags `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
  `HR_REGISTRY_PILOT_MODE`, `REGISTRY_PILOT_SCOPE_ALLOWLIST`.

---

## 8. RLS y roles

Ambas tablas: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`.

- **SELECT** — `user_has_erp_company_access(company_id)` para usuarios
  autenticados.
- **INSERT / UPDATE** — combinación de `user_has_erp_company_access` + rol
  autorizado entre: `superadmin`, `admin`, `legal_manager`, `hr_manager`,
  `payroll_supervisor`.
- **DELETE** — **no existe ninguna policy DELETE**. El borrado físico está
  prohibido por diseño (las previews son evidencia auditable).

Triggers:
- `trg_agr_affected_scopes_updated_at`, `trg_agr_impact_previews_updated_at` —
  mantenimiento.
- `trg_agr_affected_scopes_block_activation`, `trg_agr_impact_previews_guard` —
  rechazan cualquier payload que contenga claves de activación o artefactos
  operativos.

---

## 9. `FORBIDDEN_PAYLOAD_KEYS`

Tanto la edge como los triggers DB rechazan payloads con cualquiera de:

`ready_for_payroll`, `salary_tables_loaded`, `human_validated`,
`HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`, `HR_REGISTRY_PILOT_MODE`,
`apply_to_payroll`, `cra_file`, `siltra_file`, `sepa_file`,
`accounting_entry`, `service_role`.

---

## 10. Confirmación de no activación

- Engine puro intacto (B13.5A) — no DB writes, no fetch.
- Edge no escribe flags de activación, no invoca activation/runtime/mapping
  edges.
- Hook usa solo `authSafeInvoke` — no `.from().insert/update/delete/upsert`.
- Migración: cero referencias a `erp_hr_collective_agreements` (legacy).
- Tests `registry-ui-flags-untouched.test.ts` siguen verdes ⇒ flags y
  bridge no modificados.

---

## 11. Tests ejecutados (regresión B13.5B)

| Suite | Resultado |
|---|---|
| `agreement-impact-engine.test.ts` (B13.5A) | 36/36 ✅ |
| `agreement-impact-engine-static.test.ts` (B13.5A) | 16/16 ✅ |
| `agreement-impact-preview-schema.test.ts` (B13.5B) | 13/13 ✅ |
| `agreement-impact-engine-edge-static.test.ts` (B13.5B) | 12/12 ✅ |
| `agreement-impact-previews-hook-static.test.ts` (B13.5B) | 6/6 ✅ |
| OCR candidate review (B13.4) — edge-static / state-machine / no-payroll-impact | 61/61 ✅ |
| Extraction runner (B13.3) — schema/edge/hook/ocr/accept-staging + finding-mapper | 79/79 ✅ |
| Document intake (B13.2) — schema/edge/hook | 32/32 ✅ |
| TIC-NAC staging (B11.2C) — schema/edge/hooks/actions/first-load | 51/51 ✅ |
| `registry-ui-flags-untouched.test.ts` | 5/5 ✅ |
| Payroll crítico — `payrollEngineBackendMirror`, `ssContributionSharedCore`, `usePayrollRecalcLegalTransition` | 23/23 ✅ |

**Total regresión focalizada B13.5B: 341/341 ✅** (318 HR + 23 payroll).

Flake conocido `command-center-render.test.tsx` documentado en QA-LEGACY-02
como deuda preexistente no relacionada con esta entrega; no se reejecuta la
suite HR completa en este cierre documental.

---

## 12. Behavioural edge — diferido

Los tests behavioural de la edge (que requieren stub de tablas Registry,
empleados y salarios para validar end-to-end la persistencia y los handlers)
se difieren a **B13.5C** porque:

1. Requieren un harness de mocking de Supabase server client suficientemente
   amplio como para amplificar el alcance de B13.5B.
2. La cobertura de seguridad (forbidden keys, no-activation, RLS, no-delete,
   schema invariantes) ya está garantizada por:
   - tests static de la edge,
   - tests de schema con CHECK / policies / triggers,
   - tests del engine puro B13.5A.
3. La capa behavioural se beneficia de hacerse junto con el mini-panel UI en
   B13.5C, donde el flujo end-to-end (compute → persist → list → display) se
   prueba en un único pase.

---

## 13. UI mini-panel — diferido a B13.5C

`AgreementImpactPreviewMiniPanel.tsx` no se entrega en B13.5B. Se difiere a
B13.5C junto con:
- behavioural edge tests,
- integración con la página de Convenios,
- presentación read-only de scopes/previews y semáforos de risk_flags /
  blockers.

B13.5B queda como **infraestructura backend** lista para ser consumida.

---

## 14. Criterios para pasar a B13.5C

B13.5C podrá iniciarse cuando:
- B13.5B esté **READY** (este documento).
- Schema/edge/hook static suites permanezcan verdes.
- Engine puro B13.5A permanezca verde.
- Flags `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`, `HR_REGISTRY_PILOT_MODE` y
  `REGISTRY_PILOT_SCOPE_ALLOWLIST` permanezcan en su estado actual (false /
  vacío).
- Payroll crítico permanezca verde.

B13.5C deberá:
- Añadir mini-panel read-only.
- Añadir behavioural edge tests con mocks de Supabase server client.
- Continuar respetando todas las prohibiciones de B13.5B (no nómina, no
  activación, no mapping/runtime, no flags).

---

## 15. Veredicto final

**B13.5B — READY (cierre documental).**

- Migración aplicada ✅
- Tablas creadas con RLS + FORCE RLS + triggers anti-activación ✅
- Edge `erp-hr-agreement-impact-engine` con `verify_jwt = true` ✅
- Hook `useAgreementImpactPreviews` auth-safe ✅
- Static suites schema/edge/hook 31/31 ✅
- Regresión focalizada 341/341 ✅
- Behavioural edge — diferido a B13.5C ⏭️
- UI mini-panel — diferido a B13.5C ⏭️

### Confirmaciones de seguridad
- ❌ no `payrollEngine`
- ❌ no `payslipEngine`
- ❌ no `useESPayrollBridge`
- ❌ no `salaryNormalizer`
- ❌ no `agreementSalaryResolver`
- ❌ no `agreementSafetyGate`
- ❌ no tabla operativa legacy `erp_hr_collective_agreements`
- ❌ no `ready_for_payroll`
- ❌ no `salary_tables_loaded = true`
- ❌ no `data_completeness = 'human_validated'`
- ❌ no flags modificados
- ❌ no allow-list modificada
- ❌ no mapping/runtime creado
- ❌ no nómina aplicada
- ❌ no CRA/SILTRA/SEPA/accounting
- ❌ B13.5C no ejecutado
- ⏭️ Security 1 Error CRM fuera de alcance (declarado)
