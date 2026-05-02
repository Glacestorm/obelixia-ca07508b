# B13.4 — Candidate Review & Promotion Gate (CLOSURE QA)

**Status:** ✅ READY
**Closure date:** 2026-05-02
**Phase:** B13.4A QA/FIX (no new functionality)
**Predecessor:** B13.3C (READY)
**Successor (NOT executed):** B13.5

---

## 1. Objetivo

Implementar una fase segura de **revisión y promoción controlada** de
candidatos extraídos por OCR/text extraction de convenios colectivos.

Ningún candidato puede convertirse automáticamente en dato oficial
salarial, legal o de nómina. La promoción es una transición
exclusivamente lógica dentro del payload del finding (`promoted_target =
'staging_review_only'`); **no** escribe en `salary_tables`, **no** activa
`ready_for_payroll`, **no** marca `human_validated`, **no** toca el
registry final ni el bridge de nómina.

---

## 2. Estados de la state machine

Archivo: `src/engines/erp/hr/agreementOcrCandidateReviewStateMachine.ts`

| Estado              | Significado                                        |
|---------------------|----------------------------------------------------|
| `extracted`         | Estado inicial tras OCR/text extraction (B13.3C)   |
| `needs_review`      | Marcado por revisor humano para análisis          |
| `approved_candidate`| Validado por humano. **Único** estado promocionable |
| `rejected`          | Descartado con razón (≥5 chars). Terminal         |
| `promoted`          | Promovido a `staging_review_only`. Terminal       |

---

## 3. Transiciones permitidas

```
extracted          → needs_review | rejected
needs_review       → approved_candidate | rejected
approved_candidate → promoted | rejected | needs_review
rejected           → (terminal)
promoted           → (terminal)
```

Cualquier otra transición devuelve `STATE_TRANSITION_BLOCKED`.
En particular **no existe** `extracted → promoted`.

---

## 4. Acciones edge implementadas

Edge: `supabase/functions/erp-hr-agreement-extraction-runner/index.ts`
(verify_jwt = true)

| Action                    | Efecto                                              |
|---------------------------|-----------------------------------------------------|
| `review_ocr_candidate`    | `extracted → needs_review`                          |
| `approve_ocr_candidate`   | `needs_review → approved_candidate`                 |
| `reject_ocr_candidate`    | `* → rejected` (requiere `reason ≥ 5 chars`)        |
| `promote_ocr_candidate`   | `approved_candidate → promoted` con completeness    |

Todas las acciones:
- Solo actualizan `payload_json`. **No** tocan `finding_status`.
- Bloquean `.delete()`.
- Pasan deep-scan de `FORBIDDEN_PROMOTION_PAYLOAD_KEYS`.
- Sanitizan errores (no exponen `error.message` ni stack traces).

---

## 5. Feature flag

`AGREEMENT_OCR_CANDIDATE_REVIEW_ENABLED` (env var, default = closed).

- Cuando está `false`/no definida, las cuatro acciones devuelven
  `FEATURE_DISABLED`.
- Es un gate de despliegue, **no** activa nada en payroll.

---

## 6. Forbidden payload keys (deep-scan)

Bloqueadas en cualquier nivel del payload:

- Payroll: `payroll`, `payroll_records`, `payroll_calculation`,
  `persisted_incidents`, `employee_payroll`, `employee_payroll_data`,
  `apply_to_payroll`, `ready_for_payroll`, `salary_tables_loaded`,
  `human_validated`
- Registry / version / legal: `legal_status`, `registry_status`,
  `version_status`, `source_watcher_state`
- Tenant / privilegios: `service_role`, `service_role_key`,
  `company_id_override`, `tenant_id_override`
- Scoring: `vpt_scores`

---

## 7. Reglas de completeness (`b13_4_isPromotableComplete`)

Para `promote_ocr_candidate` el candidato debe cumplir:

- `kind` ∈ {`concept`, `rule`, `salary_row`}
- `evidence_chunk` no vacío
- Para `salary_row`: importe parseado (`amount_eur`) **estricto** no
  ambiguo (sin formatos mixtos `1.234.56` o `1,234,56`).
- `confidence` numérico ≥ umbral mínimo del extractor.

Si no cumple → `CANDIDATE_INCOMPLETE`.

---

## 8. Significado funcional

- **review:** marcar para inspección humana. No cambia datos.
- **approve:** humano confirma que el candidato es válido como dato
  candidato (no como dato oficial).
- **reject:** descartado con razón mínima (5 chars). Auditable.
- **promote:** mueve el candidato a `promoted_target =
  'staging_review_only'`. Sigue requiriendo `accept_finding_to_staging`
  (B13.3B.1) + revisión humana en staging (B11.2C) antes de cualquier
  posible carga oficial. **No** activa nómina.

---

## 9. Qué NO hace B13.4

- ❌ NO ejecuta nómina ni payroll engine ni payslip engine.
- ❌ NO importa `useESPayrollBridge`, `salaryNormalizer` ni
  `agreementSalaryResolver`.
- ❌ NO escribe en `salary_tables`, `erp_hr_payroll*`,
  `erp_hr_payslips`, `erp_hr_employee_payroll`, `erp_hr_vpt_scores`,
  `erp_hr_collective_agreements`, `erp_hr_collective_agreement_versions`.
- ❌ NO activa `ready_for_payroll = true`.
- ❌ NO setea `salary_tables_loaded = true`.
- ❌ NO setea `data_completeness = 'human_validated'`.
- ❌ NO modifica `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- ❌ NO modifica `HR_REGISTRY_PILOT_MODE`.
- ❌ NO modifica `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- ❌ NO desbloquea B11.3B.
- ❌ NO usa `service_role` desde frontend.
- ❌ NO desactiva `verify_jwt`.
- ❌ NO crea mapping ni runtime setting.

---

## 10. Tests focalizados B13.4 — RESULTADO

```
✓ agreement-ocr-candidate-review-state-machine.test.ts   34/34
✓ agreement-ocr-candidate-review-edge-static.test.ts     17/17
✓ agreement-ocr-candidate-review-no-payroll-impact.test.ts 10/10

TOTAL B13.4: 61/61 ✅
```

### Suite de regresión B13.x + B11.2C + payroll crítico

```
✓ agreement-extraction-runner-edge-static               (B13.3A)
✓ agreement-extraction-runner-hook-static               (B13.3A)
✓ agreement-extraction-runner-schema                    (B13.3A)
✓ agreement-extraction-runner-accept-staging-static     (B13.3B.1)
✓ agreement-finding-to-staging-mapper                   (B13.3B.1)
✓ agreement-extraction-runner-ocr-static                (B13.3C)
✓ agreement-ocr-extractor                               (B13.3C)
✓ agreement-salary-table-candidate-extractor            (B13.3C)
✓ agreement-ocr-no-payroll-impact                       (B13.3C-VERIFY)
✓ agreement-concept-literal-extractor                   (B13.3A)
✓ agreement-document-intake-* (4 suites)                (B13.2)
✓ agreement-source-watcher-static                       (B13.1)
✓ registry-ui-flags-untouched                           (Flags guard)
✓ tic-nac-salary-table-staging-* (5 suites)             (B11.2C)
✓ payroll-positive-path                                 (Payroll crítico)
✓ payroll-bridge-agreement-safety                       (Payroll crítico)
✓ payroll-bridge-registry-shadow                        (Payroll crítico)
✓ payroll-bridge-registry-runtime-flag-off              (Payroll crítico)
✓ payroll-bridge-registry-pilot-flag-off                (Payroll crítico)

TOTAL REGRESIÓN: 298/298 ✅
```

---

## 11. Análisis de los 11 fallos en suite HR completa

Ejecutando `bunx vitest run src/__tests__/hr/` resulta:
`6 failed | 131 passed (137 files); 11 failed | 1773 passed (1784 tests)`.

### Clasificación

| # | Test                                                                                                | Suite phase | Clasificación |
|---|-----------------------------------------------------------------------------------------------------|-------------|---------------|
| 1 | `collective-agreement-runtime-apply-ui-static` › Hook routes all writes through the runtime-apply edge function | B10D.4 | **PREEXISTING** |
| 2 | `collective-agreements-b8a3-ui-static` › actions hook routes writes through edge function          | B8A.3   | **PREEXISTING** |
| 3 | `collective-agreement-mapping-ui-static` › Hook routes all writes through the edge function        | B10C.2B.2C | **PREEXISTING** |
| 4 | `collective-agreements-b8a3-validation-ui` › approve calls functions.invoke with action=approve     | B8A.3   | **PREEXISTING** |
| 5 | `collective-agreement-mapping-ui` › approve calls edge with action=approve                          | B10C.2B.2C | **PREEXISTING** |
| 6 | `collective-agreement-mapping-ui` › reject calls edge with action=reject and reason                | B10C.2B.2C | **PREEXISTING** |
| 7 | `collective-agreement-mapping-ui` › supersede calls edge with action=supersede and reason          | B10C.2B.2C | **PREEXISTING** |
| 8 | `collective-agreement-mapping-ui` › hook strips forbidden payload keys before invoking edge        | B10C.2B.2C | **PREEXISTING** |
| 9 | `registry-pilot-monitor-ui` › renders summary applied/blocked/fallback                              | B10F.5  | **PREEXISTING** |
|10 | `registry-pilot-monitor-ui` › renders decision log table with signature_hash                       | B10F.5  | **PREEXISTING** |
|11 | `registry-pilot-monitor-ui` › hook calls edge with action list_decisions and never log_decision    | B10F.5  | **PREEXISTING** |

### Justificación

- B13.4 **solo** modifica:
  - `src/engines/erp/hr/agreementOcrCandidateReviewStateMachine.ts` (nuevo)
  - `supabase/functions/erp-hr-agreement-extraction-runner/index.ts` (acciones añadidas)
  - `src/hooks/erp/hr/useAgreementExtractionRunner.ts` (4 acciones expuestas)
  - 3 archivos de test nuevos en `src/__tests__/hr/`

- Los 11 tests fallidos viven todos en módulos B8A.3 / B10C / B10D / B10F
  cuyas rutas de código (`useCompanyAgreementRegistryMappingActions`,
  `useCollectiveAgreementValidationActions`, `useRegistryPilotMonitor`)
  **no son tocadas** por B13.4.

- La causa común reportada en los stack traces es
  `getAccessToken` de `_authSafeInvoke.ts` fallando porque los mocks de
  estos tests UI no instalan sesión Supabase. Es un patrón de mock
  legacy de fases B8/B10 anterior a la introducción de
  `_authSafeInvoke` (independiente de B13.x).

- No hay ningún `CAUSED_BY_B13_4`. No hay ningún `FLAKY_TEST`
  (los 11 fallan determinísticamente en cada corrida).

**Conclusión:** Los 11 fallos son **PREEXISTING_TEST_DEBT** y deben ser
abordados en una fase de hardening de mocks UI dedicada (fuera del
alcance de B13.4).

---

## 12. Análisis del Security 1 Error

Scanner: `supabase_lov` — Finding `EXPOSED_SENSITIVE_DATA`
(`internal_id: erp_customers_public_access`, level: `error`).

- **Tabla afectada:** `public.erp_customers` (CRM/ERP general).
- **Causa:** Política `Users can manage customers` con
  `USING (true) WITH CHECK (true)` aplicada al rol `{public}`.
- **Timestamp:** 2026-04-09 (anterior a B13.4).
- **¿Afecta a B13.4?** **No.** B13.4 solo opera sobre:
  - `erp_hr_collective_agreement_extraction_runs`
  - `erp_hr_collective_agreement_extraction_findings`
  - `erp_hr_collective_agreement_document_intake`
  - `erp_hr_collective_agreement_salary_table_staging` (lectura/insert via B13.3B.1)
  - `erp_hr_collective_agreement_staging_audit`
  - `user_roles`
- **¿Es dependencia obsoleta?** No.
- **¿Es policy/RLS?** Sí — RLS permisiva en tabla CRM no relacionada.
- **¿Es verify_jwt edge?** No (verify_jwt = true en
  `erp-hr-agreement-extraction-runner`).
- **¿Falso positivo?** No, es deuda técnica real preexistente del
  módulo CRM.

**Clasificación:** `PREEXISTING_SECURITY_FINDING` (módulo CRM, fuera del
alcance de B13.x). Documentado para tratamiento en una fase de hardening
RLS específica de `erp_customers`.

Otros findings vistos (todos preexistentes y fuera de alcance):
- `SUPA_function_search_path_mutable` (warn, global)
- `SUPA_rls_policy_always_true` (warn, global)
- `realtime_messages_no_channel_authorization` (warn, realtime)
- `demo_sessions_public_ip_exposure` (warn, demo module)

Ninguno toca el extraction runner ni las tablas de B13.x.

---

## 13. Veredicto final

✅ **READY**

### Criterios cumplidos

1. ✅ Tests B13.4 focalizados verdes (61/61).
2. ✅ Sin fallos `CAUSED_BY_B13_4`. Los 11 fallos suite-completa son
   `PREEXISTING_TEST_DEBT` en B8A/B10C/B10D/B10F.
3. ✅ Doc QA creado (este archivo).
4. ✅ Security 1 Error clasificado como `PREEXISTING_SECURITY_FINDING`
   en `erp_customers` (CRM, ajeno a B13.x).
5. ✅ Invariantes de no activación confirmadas por
   `agreement-ocr-candidate-review-no-payroll-impact.test.ts` y
   `registry-ui-flags-untouched.test.ts`.
6. ✅ B11.3B sigue bloqueado (no se altera ningún flag de activación).
7. ✅ No se toca nómina, bridge, payrollEngine, payslipEngine,
   salaryNormalizer ni agreementSalaryResolver.

### Confirmaciones finales

- ❌ no salary_tables reales
- ❌ no ready_for_payroll
- ❌ no salary_tables_loaded=true
- ❌ no human_validated
- ❌ no bridge
- ❌ no nómina
- ❌ no tabla operativa legacy `erp_hr_collective_agreements`
- ❌ no flags `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` /
  `HR_REGISTRY_PILOT_MODE`
- ❌ no allow-list `REGISTRY_PILOT_SCOPE_ALLOWLIST`
- ❌ no mapping nuevo
- ❌ no runtime setting nuevo
- ❌ B13.5 NO ejecutado

---

## 14. Archivos modificados en B13.4A QA/FIX

- `docs/qa/HR_COLLECTIVE_AGREEMENTS_B13_4_CANDIDATE_REVIEW_PROMOTION_GATE.md` (nuevo, este archivo)

No se modificó ningún archivo de código durante el cierre QA. La
implementación entregada en B13.4 (engine, edge, hook, 3 suites de
test) queda inalterada.