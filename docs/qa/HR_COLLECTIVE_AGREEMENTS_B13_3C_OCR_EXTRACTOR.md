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