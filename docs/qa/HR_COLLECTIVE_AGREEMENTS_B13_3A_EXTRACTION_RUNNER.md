# HR — Collective Agreements — B13.3A Extraction Runner (skeleton)

## 1. Objetivo

Crear la **tercera capa** del servicio interno de Convenios Curados: un
**runner controlado** que toma documentos `ready_for_extraction` del intake
B13.2 y prepara **hallazgos (findings)** revisables por humanos, sin ejecutar
OCR masivo, sin escribir staging salarial real y sin tocar nómina.

## 2. Diferencia entre Intake (B13.2) y Extraction Runner (B13.3A)

| Capa | Tabla | Rol |
| --- | --- | --- |
| **B13.2 Intake** | `erp_hr_collective_agreement_document_intake` | Triaje y clasificación humana del documento. |
| **B13.3A Runner** | `erp_hr_collective_agreement_extraction_runs` + `..._findings` | Ejecuciones controladas que producen findings de metadatos / conceptos / candidatos a tabla salarial. |

El intake **clasifica**. El runner **propone hallazgos**. Ninguno **activa**.

## 3. Extraction modes

- `html_text`
- `pdf_text`
- `ocr_assisted` (no se ejecuta OCR real en B13.3A)
- `manual_csv`
- `metadata_only`

## 4. Findings

- `metadata_candidate`
- `classification_candidate`
- `concept_candidate`
- `salary_table_candidate` (marker, no parsea importes)
- `rule_candidate`
- `ocr_required`
- `manual_review_required`

`requires_human_review` está **forzado a true** en BD (CHECK + trigger).
`finding_status` arranca siempre en `pending_review`.

## 5. Preservación literal

`src/engines/erp/hr/agreementConceptLiteralExtractor.ts` es un helper **puro**
(sin Supabase/fetch/Deno/React/payroll/payslip/bridge/normalizer/resolver).
Reglas:

1. `payslip_label` conserva la palabra clave del literal (transporte,
   nocturnidad, festivo, antigüedad, dieta, kilomet, responsabilidad,
   convenio).
2. Nunca devuelve etiquetas genéricas tipo `Complemento 1`.
3. Salida determinista para una entrada dada.
4. `requires_human_review = true` siempre.

## 6. Por qué B13.3A NO ejecuta OCR real masivo

- Riesgo legal/operativo de extraer importes erróneos a nómina.
- Necesidad de "humano-en-el-loop" antes de cualquier figura monetaria.
- B13.3A solo opera sobre `text_content` aportado explícitamente por el
  caller (`run_text_extraction`) o sobre metadatos ya presentes en intake
  (`run_metadata_extraction`).

## 7. Por qué B13.3A NO escribe `salary_tables` reales

- B11.3B writer **sigue bloqueado**.
- `accept_finding_to_staging` está **deferred** a B13.3B y devuelve el
  sentinel `ACCEPT_TO_STAGING_DEFERRED_TO_B13_3B`.
- Aceptación a staging real requerirá B11.2C staging engine + revisión
  humana + B11.3B activador.

## 8. Conexión con B11.2C staging

B13.3B (futuro) cogerá findings `salary_table_candidate` ya revisados y los
enviará al **edge B11.2C staging** existente como filas `pending_review`.
Toda activación seguirá pasando por B8A/B8B/B9 y la activación staging→real
por B11.3B.

## 9. Qué queda para B13.3B

- Implementación efectiva de `accept_finding_to_staging` que llame al edge
  B11.2C con filas `pending_review`.
- UI Runner Panel (`AgreementExtractionRunnerPanel.tsx`) — diferida en
  B13.3A para no inflar el build.
- Parser de tablas salariales asistido (sin importes auto-aplicados).
- Conector con B13.2 desde la propia UI del intake.

## 10. Tests ejecutados (B13.3A)

- `src/__tests__/hr/agreement-concept-literal-extractor.test.ts`
- `src/__tests__/hr/agreement-extraction-runner-schema.test.ts`
- `src/__tests__/hr/agreement-extraction-runner-edge-static.test.ts`
- `src/__tests__/hr/agreement-extraction-runner-hook-static.test.ts`
- Re-ejecutados: B13.2 intake tests, B13.1 watcher tests,
  `registry-ui-flags-untouched`, B11.2C tests relevantes y payroll crítico.

## 11. Confirmación de no activación

- ✅ No OCR real masivo.
- ✅ No extraction automática desde fuentes externas.
- ✅ No staging salarial aprobado.
- ✅ No `salary_tables` reales escritas.
- ✅ `ready_for_payroll` no escrito.
- ✅ `salary_tables_loaded = true` no escrito.
- ✅ `data_completeness = 'human_validated'` no escrito.
- ✅ `useESPayrollBridge` no modificado.
- ✅ `payrollEngine`, `payslipEngine`, `salaryNormalizer`,
  `agreementSalaryResolver` no modificados.
- ✅ Tabla operativa legacy `erp_hr_collective_agreements` no tocada.
- ✅ `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` sigue `false`.
- ✅ `HR_REGISTRY_PILOT_MODE` sigue `false`.
- ✅ `REGISTRY_PILOT_SCOPE_ALLOWLIST` sigue `[]`.
- ✅ `service_role` no usado en frontend.
- ✅ `verify_jwt = true` en el edge.
- ✅ B11.3B writer **sigue bloqueado**.
- ✅ B8A / B8B / B9 no ejecutados desde B13.3A.
- ✅ `accept_finding_to_staging` deferred a B13.3B.