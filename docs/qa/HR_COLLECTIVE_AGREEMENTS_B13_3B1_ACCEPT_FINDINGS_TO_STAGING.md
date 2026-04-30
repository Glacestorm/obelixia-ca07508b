# HR Collective Agreements — B13.3B.1: Accept Findings to Staging (no real OCR)

## 1. Objetivo
Conectar B13.3A (`extraction_findings`) con la capa staging de B11.2C
(`erp_hr_collective_agreement_salary_table_staging`).

Un finding revisable se convierte en una fila staging **pendiente de revisión
humana**. Nunca se escribe en `salary_tables` reales, nunca se activa nómina,
nunca se aprueba automáticamente por confianza.

Regla central:

```
finding → staging pending review
NUNCA finding → salary_tables real
NUNCA finding → ready_for_payroll
```

## 2. Tipos de findings aceptables

| finding_type                | aceptado a staging | nota |
|-----------------------------|--------------------|------|
| `salary_table_candidate`    | ✅ | requiere importes en payload |
| `concept_candidate`         | ✅ | si contiene importe mapeable |
| `rule_candidate`            | ❌ deferred | no se envía a salary table staging en este build |
| `metadata_candidate`        | ❌ bloqueado | |
| `classification_candidate`  | ❌ bloqueado | |
| `ocr_required`              | ❌ bloqueado | requiere reextracción humana |
| `manual_review_required`    | ❌ bloqueado | requiere intervención |

## 3. Precondiciones (`validateFindingStagingReadiness`)
1. `finding_status` ∈ {`pending_review`, `needs_correction`}.
2. `agreement_id` no nulo.
3. `version_id` no nulo.
4. `source_page` no vacío.
5. `source_excerpt` no vacío.
6. `concept_literal_from_agreement` no vacío.
7. `normalized_concept_key` no vacío.
8. `payslip_label` no vacío.
9. `requires_human_review === true`.
10. `payload_json.year` definido y entero.
11. `payload_json.professional_group` definido.
12. Al menos un campo salarial: `salary_base_annual|monthly`, `extra_pay_amount`,
    `plus_convenio_*`, `plus_transport`, `plus_antiguedad`, `other_amount`.
13. Si extracción es OCR, `payload_json.row_confidence` debe estar presente.
14. `payslip_label` conserva keywords del literal: transporte, nocturnidad,
    festivo, antigüedad, dieta, kilomet, responsabilidad, convenio.
15. Importes negativos están **prohibidos** → `APPROVAL_BLOCKED`.

Errores devueltos:
- `FINDING_NOT_STAGING_READY` (HTTP 422)
- `APPROVAL_BLOCKED` (HTTP 409)

## 4. Mapping `finding → staging`
Helper puro: `src/engines/erp/hr/agreementFindingToStagingMapper.ts`

Exporta:
- `mapExtractionFindingToSalaryStagingRow(finding, options)`
- `validateFindingStagingReadiness(finding)`
- `inferExtractionMethodFromFinding(finding)`
- `inferApprovalModeFromFinding(finding, options)`
- `mapFindingPayloadAmounts(payload)`
- `buildStagingSourceFields(finding, options)`
- `computeFindingToStagingHash(finding)`

Reglas de mapeo:
- OCR findings → `validation_status='ocr_pending_review'`,
  `approval_mode='ocr_single_human_approval'` (o `_dual_` si se pide).
- Manual findings → `validation_status='manual_pending_review'`,
  `approval_mode='manual_upload_single_approval'` (o `_dual_`).
- `requires_human_review = true` siempre.
- `cra_mapping_status = 'pending'` siempre.
- `currency = 'EUR'` por defecto.
- `source_document` desde intake `document_hash` (si existe), o
  `payload_json.source_document`/`document_hash`, o sentinel
  `extraction_finding`.

## 5. Estados resultantes

| extracción | validation_status         | approval_mode (default)             |
|------------|---------------------------|--------------------------------------|
| `ocr`        | `ocr_pending_review`      | `ocr_single_human_approval`          |
| `manual_csv` | `manual_pending_review`   | `manual_upload_single_approval`      |
| `manual_form`| `manual_pending_review`   | `manual_upload_single_approval`      |

Nunca se asignan estados aprobados (`human_approved_*`).

## 6. Auditoría
La acción `accept_finding_to_staging` escribe en
`erp_hr_collective_agreement_staging_audit`:
- `staging_row_id`
- `agreement_id`, `version_id`
- `action = 'create'`
- `actor_id` (server-side)
- `snapshot_json` (estado tras inserción)
- `content_hash`

El audit es append-only (trigger DB en B11.2C.1).

Adicionalmente el finding se actualiza:
- `finding_status = 'accepted_to_staging'`
- `payload_json.accepted_to_staging = { staging_row_id, by, at }`

## 7. Qué NO hace
- ❌ No ejecuta OCR real.
- ❌ No descarga documentos externos.
- ❌ No escribe en `salary_tables` reales.
- ❌ No activa `ready_for_payroll`.
- ❌ No pone `salary_tables_loaded = true`.
- ❌ No pone `data_completeness = 'human_validated'`.
- ❌ No baja `requires_human_review`.
- ❌ No aprueba automáticamente por confianza OCR.
- ❌ No toca tabla operativa `erp_hr_collective_agreements` (legacy).
- ❌ No toca `useESPayrollBridge` / `payrollEngine` / `payslipEngine` /
  `salaryNormalizer` / `agreementSalaryResolver`.
- ❌ No toca flags `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
  `HR_REGISTRY_PILOT_MODE`, `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- ❌ No usa `service_role` en frontend.
- ❌ No ejecuta B8A / B8B / B9 / B11.3B writer.

## 8. Relación con B11.2C UI de revisión humana
La fila creada por B13.3B.1 aparece en el staging que ya consumen los hooks
de B11.2C (`useTicNacSalaryTableStaging`) y la UI de revisión humana, donde
un revisor humano (`legal_manager` / `hr_manager` / `payroll_supervisor`)
podrá ejecutar `approve_single` / `approve_first` / `approve_second` /
`reject` / `mark_needs_correction` mediante la edge
`erp-hr-agreement-staging`.

## 9. Relación con B13.3C OCR real (futuro)
B13.3B.1 acepta findings ya formados por la text-extraction o por extracciones
manuales. La extracción OCR real desde PDF/imagen queda diferida a B13.3C.
Mientras tanto, los findings con `extraction_method='ocr'` solo entran si
incluyen `row_confidence` provisto por una herramienta humana o pre-OCR
externo, y siempre quedan como `ocr_pending_review` (nunca aprobados).

## 10. Confirmación de no activación
- `salary_tables` reales: **no tocadas**.
- `ready_for_payroll`: **false** (no se modifica).
- `salary_tables_loaded`: **false** (no se modifica).
- `data_completeness='human_validated'`: **no aplicado**.
- `requires_human_review`: **true** (DB trigger lo enforza).
- Bridge / payroll / payslip / normalizer / resolver: **no tocados**.
- Tabla operativa `erp_hr_collective_agreements`: **no tocada**.
- Flags `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`, `HR_REGISTRY_PILOT_MODE`: **false**.
- `REGISTRY_PILOT_SCOPE_ALLOWLIST`: **[]**.
- Las filas creadas quedan **pending review**.
- B11.3B writer: **bloqueado** hasta aprobación humana explícita.

## Tests ejecutados
Verde:
- `agreement-finding-to-staging-mapper.test.ts` (21 tests)
- `agreement-extraction-runner-accept-staging-static.test.ts` (13 tests)
- `agreement-extraction-runner-edge-static.test.ts` (14 tests)
- `agreement-extraction-runner-hook-static.test.ts` (8 tests)
- `agreement-extraction-runner-schema.test.ts` (12 tests)
- `agreement-concept-literal-extractor.test.ts` (13 tests)
- `registry-ui-flags-untouched.test.ts` (5 tests)

Regression verde:
- B13.1 / B13.2 (52 tests)
- B11.2C TIC-NAC staging suite (125 tests)
