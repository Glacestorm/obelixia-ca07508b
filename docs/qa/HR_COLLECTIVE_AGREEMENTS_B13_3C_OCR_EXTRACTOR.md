# HR — Collective Agreements — B13.3C OCR / Text Extractor (controlled)

## 1. Objetivo

Añadir extracción real controlada (texto / OCR-asistida / tabla pegada manual)
sobre `extraction_runs` ya existentes, generando `extraction_findings` siempre
`pending_review` con `requires_human_review = true`. NUNCA escribe
`salary_tables` reales, NUNCA activa `ready_for_payroll`, NUNCA toca nómina.

## 2. Inputs permitidos

Acción: `run_ocr_or_text_extraction`. Discriminada por `extraction_input_type`:

| Modo | Campos | Descripción |
| --- | --- | --- |
| `text_content` | `text_content` | Texto aportado explícitamente por el caller. |
| `document_url` | `document_url` | DEBE coincidir con `run.document_url` o `intake.document_url`. Si `intake.document_hash` existe, se verifica SHA-256. |
| `manual_pasted_table` | `rows[]` | Filas estructuradas pegadas a mano. No es OCR. |

## 3. Diferencia entre los tres modos

- `text_content`: el caller entrega el texto. No hay descarga ni red.
- `document_url`: descarga estricta del documento ya registrado en run/intake;
  si `document_hash` no se puede verificar → `document_hash_unverified` y el
  run se marca `blocked` o `completed_with_warnings`. NUNCA acepta URLs
  arbitrarias.
- `manual_pasted_table`: ruta sin OCR; usa el mismo pipeline de candidates.

## 4. Cómo se crean findings

Pipeline puro (helpers `agreementOcrExtractor`, `agreementSalaryTableCandidateExtractor`):

1. `concept_candidate` por cada literal detectado (preserva el literal).
2. `salary_table_candidate` por cada línea con concepto **y** importe
   parseable; importes ambiguos quedan con `amount=null` + warnings.
3. `rule_candidate` por jornada / vacaciones / permisos / preaviso /
   periodo de prueba / IT / horas extra.
4. `ocr_required` si la ratio de caracteres imprimibles es baja.
5. `manual_review_required` si no se detecta nada.

Cada finding incluye:
`requires_human_review = true`, `finding_status = 'pending_review'`,
`confidence ∈ low|medium|high`, `source_page`, `source_excerpt`, `raw_text`,
`payload_json` (incluye `extraction_method`, `source_document`, `warnings`,
`row_confidence`, `requires_manual_amount_review`).

## 5. Por qué todo queda `pending_review`

- Ningún importe entra a payroll sin validación humana.
- B11.3B writer **sigue bloqueado**.
- No se acepta payload con `human_approved_*`, `approved_by`, `approved_at`,
  `ready_for_payroll`, `salary_tables_loaded`, `human_validated`,
  `apply_to_payroll`, etc.

## 6. Cómo pasa después a staging

Vía `accept_finding_to_staging` (B13.3B.1) → fila `ocr_pending_review` o
`manual_pending_review` en `erp_hr_collective_agreement_salary_table_staging`.
La aprobación final sigue siendo humana en B11.2C.

## 7. Por qué no activa nada

- No `salary_tables` reales.
- No `ready_for_payroll`, no `salary_tables_loaded=true`,
  no `data_completeness='human_validated'`.
- No `useESPayrollBridge`, `payrollEngine`, `payslipEngine`,
  `salaryNormalizer`, `agreementSalaryResolver`.
- No tabla operativa legacy `erp_hr_collective_agreements`.
- No flags (`HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
  `HR_REGISTRY_PILOT_MODE`), no `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- No `service_role` desde frontend, `verify_jwt = true`.

## 8. Preservación de literales

`payslip_label` conserva la palabra clave del convenio (transporte,
nocturnidad, festivo, antigüedad, dieta, kilomet, responsabilidad, convenio).
Validación delegada a `agreementFindingToStagingMapper` (B13.3B.1) en el
momento de aceptar a staging.

## 9. Límites conocidos

- `parseSpanishMoneyStrict` rechaza importes ambiguos (`1,234`, `1.234`):
  amount queda `null` + `amount_ambiguous = true`.
- Documentos PDF binarios desde `document_url` producen ratio bajo y
  generan `ocr_required` finding (no se ejecuta OCR real binario aquí).
- `year` y `professional_group` no detectables → warnings, no blockers
  (la aceptación a staging exige ambos).

## 10. Criterios para B13.3D / B13.4

- B13.3D: UI Workbench dedicada al run + findings.
- B13.4: Review Workbench generalizado para múltiples convenios.
- B13.5: pipeline OCR binario real con proveedor dedicado (sigue sin
  activar nada por sí solo).

## 11. Tests

- `src/__tests__/hr/agreement-ocr-extractor.test.ts`
- `src/__tests__/hr/agreement-salary-table-candidate-extractor.test.ts`
- `src/__tests__/hr/agreement-extraction-runner-ocr-static.test.ts`
- `src/__tests__/hr/agreement-extraction-runner-hook-static.test.ts` (ampliado)
- Re-ejecutados: B13.3B.1, B13.3A, B13.2, B13.1, B11.2C,
  `registry-ui-flags-untouched`, payroll crítico.

## 12. Confirmación de no activación

- ✅ no `salary_tables` reales
- ✅ no `ready_for_payroll`
- ✅ no `salary_tables_loaded = true`
- ✅ no `data_completeness = 'human_validated'`
- ✅ no auto approval (`human_approved_*` rechazado)
- ✅ no bridge / payroll / payslip / normalizer / resolver
- ✅ no tabla operativa legacy
- ✅ no flags / allow-list
- ✅ findings quedan `pending_review`
- ✅ staging sigue pendiente de `accept_finding_to_staging`
- ✅ B11.3B writer bloqueado hasta aprobación humana

## 13. Cierre B13.3C-VERIFY

### 13.1 Estado final

**B13.3C — READY**. Cierre documental y de regresión completado el 2026-05-01.

### 13.2 Tests ejecutados (regresión total)

Ejecutado en una sola corrida (`bunx vitest run`) — **268/268 verde** sobre las
22 suites siguientes:

| Capa | Suite | Tests |
| --- | --- | --- |
| B13.3C | `agreement-ocr-extractor.test.ts` | 13 |
| B13.3C | `agreement-salary-table-candidate-extractor.test.ts` | 13 |
| B13.3C | `agreement-extraction-runner-ocr-static.test.ts` | 10 |
| B13.3C-VERIFY | `agreement-ocr-no-payroll-impact.test.ts` | 7 |
| B13.3B.1 | `agreement-extraction-runner-accept-staging-static.test.ts` | 13 |
| B13.3B.1 | `agreement-finding-to-staging-mapper.test.ts` | 21 |
| B13.3A | `agreement-extraction-runner-edge-static.test.ts` | 14 |
| B13.3A | `agreement-extraction-runner-hook-static.test.ts` | 9 |
| B13.3A | `agreement-extraction-runner-schema.test.ts` | 12 |
| B13.3A | `agreement-concept-literal-extractor.test.ts` | 13 |
| B13.2 | `agreement-document-intake-edge-static.test.ts` | 14 |
| B13.2 | `agreement-document-intake-hook-static.test.ts` | 7 |
| B13.2 | `agreement-document-intake-schema.test.ts` | 11 |
| B13.2 | `agreement-document-intake-panel.test.tsx` | 6 |
| B13.1 | `agreement-source-watcher-static.test.ts` | 14 |
| B11.2C | `collective-agreements-b11-3a-tic-nac-writer.test.ts` | 18 |
| B11.2 | `collective-agreements-b11-2-tic-nac-parse-static.test.ts` | 10 |
| Flags UI | `registry-ui-flags-untouched.test.ts` | 5 |
| Payroll | `payroll-bridge-agreement-safety.test.ts` | 9 |
| Payroll | `payroll-positive-path.test.ts` | 6 |
| Payroll | `payroll-bridge-registry-shadow.test.ts` | 16 |
| Payroll | `payroll-bridge-registry-runtime-flag-off.test.ts` | 13 |
| Payroll | `payroll-bridge-registry-pilot-flag-off.test.ts` | 21 |

### 13.3 Tests añadidos en VERIFY

`src/__tests__/hr/agreement-ocr-no-payroll-impact.test.ts` (7 tests)
demuestra de forma estática:

1. helpers OCR son puros (sin `supabase`, sin `createClient`);
2. helpers no importan `payrollEngine`, `payslipEngine`, `useESPayrollBridge`,
   `salaryNormalizer`, `agreementSalaryResolver`, `registryShadowFlag`,
   `registryPilotGate`;
3. helpers no hacen `insert/update/upsert/delete/rpc/fetch`;
4. la edge no toca `erp_hr_payroll*`, `erp_hr_payslips`,
   `erp_hr_employee_payroll`, `erp_hr_vpt_scores`,
   `erp_hr_collective_agreement_versions`, `erp_hr_collective_agreements`,
   `salary_tables`, ni fija `legal_status` final;
5. la edge no muta tablas del Source Watcher;
6. el hook no expone mutaciones payroll/registry (`apply_to_payroll`,
   `ready_for_payroll`, `salary_tables_loaded`, `human_validated`,
   `human_approved`, `activate_version`, `publish_version`,
   `set_legal_status`);
7. `FORBIDDEN_PAYLOAD_KEYS` cubre todos los vectores de
   salario/score/registry/version/legal/aprobación.

### 13.4 Archivos tocados en VERIFY

- ➕ `src/__tests__/hr/agreement-ocr-no-payroll-impact.test.ts`
- ✏️ `docs/qa/HR_COLLECTIVE_AGREEMENTS_B13_3C_OCR_EXTRACTOR.md` (esta sección)

No se ha modificado ningún helper, edge, hook, migración, UI, ni código de
payroll. No se ha añadido ningún secret. No se ha relajado ningún RLS.

### 13.5 Garantías

- **Payroll**: 0 cambios funcionales. `payroll-positive-path` y los 3
  `payroll-bridge-registry-*-flag-off` siguen verdes idénticos.
- **UI flags**: `registry-ui-flags-untouched` verde — `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL=false`,
  `HR_REGISTRY_PILOT_MODE=false`, `REGISTRY_PILOT_SCOPE_ALLOWLIST=[]`.
- **Escritura salarial automática**: imposible — toda fila salarial
  requiere `accept_finding_to_staging` (B13.3B.1) → staging
  `*_pending_review` → aprobación humana B11.2C → writer B11.3B
  (que sigue **bloqueado**).
- **Source Watcher (B13.1)**: comportamiento intacto; la edge OCR sólo
  lee `erp_hr_collective_agreement_document_intake` (link existente
  desde B13.2) y nunca escribe en `*_source_watcher/_hits/_sources`.
- **Registry / versionado / estado legal**: no se tocan; la edge no
  hace `.from()` sobre `erp_hr_collective_agreements` ni
  `erp_hr_collective_agreement_versions`.
- **VPT scores / readiness gate**: no se tocan.

### 13.6 Riesgos residuales

- `parseSpanishMoneyStrict` deja como `amount=null` los importes
  ambiguos (`1,234`, `1.234`); requiere revisión humana en staging,
  por diseño.
- PDFs binarios entregados vía `document_url` generan `ocr_required`
  finding (no se ejecuta OCR binario real hasta B13.5).
- Detección de `year` y `professional_group` puede fallar en textos
  ruidosos; la aceptación a staging exige ambos campos, así que el
  riesgo está contenido.

### 13.7 Confirmación final

| Item | Estado |
| --- | --- |
| Helpers puros, sin efectos secundarios | ✅ |
| Helpers no escriben en tablas críticas | ✅ |
| OCR/text no actualiza payroll | ✅ |
| OCR/text no modifica convenios automáticamente | ✅ |
| `FORBIDDEN_PAYLOAD_KEYS` bloquea payloads peligrosos | ✅ |
| Salary table candidates quedan como candidatos | ✅ |
| Source Watcher (B13.1) sin cambios | ✅ |
| Document Intake (B13.2) sin cambios | ✅ |
| Extraction Runner skeleton (B13.3A) sin cambios | ✅ |
| Accept-to-staging (B13.3B.1) sin cambios | ✅ |
| TIC-NAC writer (B11.2C) sin cambios | ✅ |
| Flags registry/UI sin cambios | ✅ |
| Payroll crítico sin cambios | ✅ |
| B11.3B writer sigue bloqueado | ✅ |

### 13.8 Siguiente fase recomendada

**B13.3D — Workbench UI dedicada al run + findings** (review humano por
run con preview de `source_excerpt` y acción explícita
`accept_finding_to_staging`). No activar B13.4 ni B13.5 hasta cerrar
B13.3D documentalmente.