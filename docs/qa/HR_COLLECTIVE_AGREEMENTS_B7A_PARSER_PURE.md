# B7A — Collective Agreement Parser (pure) · Salary tables + rules + SHA-256

## Objective

Build the **pure parser layer** for the Collective Agreements Master Registry.
Extracts salary tables and conservative rule fragments from BOIB-style
documents and produces evidence + warnings.

**Strict scope:** parser only. No DB writes. No fetch. No OCR. No payroll.
B7B (admin-gated writer) is intentionally deferred.

## Modules created

```
src/engines/erp/hr/
  collectiveAgreementParserTypes.ts          # Pure types
  collectiveAgreementDocumentHasher.ts       # Real SHA-256 (Web Crypto + Node fallback)
  collectiveAgreementSalaryTableParser.ts    # HTML + PDF text salary parsers
  collectiveAgreementRulesParser.ts          # Spanish rules text parser
  collectiveAgreementParserPipeline.ts       # Orchestrator (pure, adapters injected)
```

All modules are pure: no `@/integrations/supabase/client`, no `fetch`, no React,
no global side effects. Adapters (`DocumentReaderAdapter`, `HashAdapter`,
`FixtureLoaderAdapter`) are injected.

## Types contract

- `AgreementExtractionMethod`: `pdf_text | html_table | manual_table_upload | ocr_blocked | document_missing`
- `ParsedSourceDocument`: `sourceUrl`, `documentUrl`, `downloadedAt`, `sha256Hash`, `mimeType`, `pageCount?`, `extractionMethod`, `extractionConfidence`
- `ParsedSalaryRow`: `year`, identity (`professionalGroup` / `category` / `level`), monetary fields (all nullable, never invented), **mandatory** `sourcePage` + `sourceExcerpt`, `rowConfidence`, `warnings`, `requiresHumanReview: true` (literal type)
- `ParsedAgreementRules`: `jornadaAnualHours?`, `vacacionesDays?`, `extraPaymentsCount?`, `extraPaymentsProrrateadas?`, `antiguedadFormula?`, `horasExtraRule?`, `nocturnidadPercent?`, `festivosRule?`, `itComplementRule?`, `permisosRules?`, `preavisoDays?`, `periodoPruebaDays?`, `unresolvedFields`, `warnings`
- `ParserResult`: includes `proposedRegistryPatch` with **forced safety literals** (`requires_human_review: true`, `ready_for_payroll: false`, `official_submission_blocked: true`)

## SHA-256 (real)

`computeSha256Hex(buffer: Uint8Array): Promise<string>` returns 64 lowercase
hex chars.

- Primary: Web Crypto `crypto.subtle.digest('SHA-256', buf)`.
- Fallback: Node `crypto.createHash('sha256')` for non-browser test envs.
- **No FNV-1a fallback.** FNV-1a remains valid only for B5E metadata fingerprints (different purpose).

`isValidSha256Hex(hash)` validates 64 lowercase hex.

## Parsing rules

### Salary tables
- Recognized columns (Spanish header heuristics, accent-insensitive): grupo profesional, categoría, nivel, salario mensual/anual, paga extra, plus convenio, plus transporte, plus antigüedad, plus nocturnidad, plus festivo, plus responsabilidad.
- Spanish amount parser handles `1.234,56`, `1234,56`, `1,234.56`, `1234.56`, with `€` / `EUR` stripping.
- **Never invents** missing pluses, categories, groups. Missing → `null` + warning.
- Each row MUST have `sourcePage` and `sourceExcerpt` (20–200 chars) or it is dropped.
- Rows with `rowConfidence < 0.6` keep `requiresHumanReview: true` and do **not** count toward `salary_tables_loaded`.

### Rules
- `jornada anual ... 1.776 horas` → `jornadaAnualHours = 1776` (range 800–2400)
- `30 días naturales ... vacaciones` → `vacacionesDays = 30`
- `dos pagas extraordinarias` / `14 pagas` → `extraPaymentsCount = 2`
- `nocturnidad ... 25%` → `nocturnidadPercent = 25`
- Permisos: `matrimonio | fallecimiento | nacimiento | mudanza | hospitalización | lactancia | deber inexcusable` + N días
- `preaviso ... N días` → `preavisoDays`
- Complex antigüedad / horas extra / festivos / IT → kept as **literal text snippet**, never interpreted.

## Pipeline behaviour matrix

| extractionMethod      | sha256 | salaryRows | data_completeness | salary_tables_loaded |
|-----------------------|--------|------------|-------------------|----------------------|
| `html_table`          | real   | parsed     | `parsed_partial`* | true if ≥1 row ≥0.6  |
| `pdf_text`            | real   | parsed     | `parsed_partial`* | true if ≥1 row ≥0.6  |
| `manual_table_upload` | real   | parsed     | `parsed_partial`* | true if ≥1 row ≥0.6  |
| `ocr_blocked`         | n/a    | `[]`       | `metadata_only`   | false                |
| `document_missing`    | sentinel | `[]`     | `metadata_only`   | false                |

*Falls back to `metadata_only` if both `salary_tables_loaded === false` AND no rules detected.

## Forced safety invariants (B5E-aligned)

Regardless of any caller input, every `ParserResult.proposedRegistryPatch`
satisfies:

```
requires_human_review === true
ready_for_payroll === false
official_submission_blocked === true
```

These are constructed from literal types in the pipeline; no override path exists.

## Fixtures (BOIB Baleares)

Located at `src/__tests__/hr/fixtures/collective-agreements/b7-boib-parser/`:

- `comercio-html-table.fixture.ts` — COM-GEN-IB · 3-row HTML table, jornada + vacaciones rules.
- `panaderia-pdf-text.fixture.ts` — PAN-PAST-IB · 2 simulated PDF pages with Spanish-formatted amounts.
- `hosteleria-ambiguous.fixture.ts` — HOST-IB · ambiguous amounts ("aprox 1.300", "—") to verify warnings + low confidence.
- `alimentaria-document-missing.fixture.ts` — IND-ALIM-IB · no buffer → metadata_only.
- `boib-rules-text.fixture.ts` — Plain text fragment exercising the rules parser.

## Tests

| File                                                                            | Tests |
|---------------------------------------------------------------------------------|-------|
| `collective-agreements-document-hasher.test.ts`                                 | 5     |
| `collective-agreements-salary-table-parser.test.ts`                             | 7     |
| `collective-agreements-rules-parser.test.ts`                                    | 9     |
| `collective-agreements-b7-boib-parser-pipeline.test.ts`                         | 7     |
| **B7A total**                                                                   | **28** |

Full `collective-agreements-*` suite: **175/175 green** (147 previous + 28 B7A).

### Tripwires asserted

- `globalThis.fetch` is spied and asserted **never called**.
- All 5 new parser source files asserted to contain **no Supabase imports** and no `supabase.from(` calls.
- `proposedRegistryPatch` literal flags asserted on every pipeline path.

## What B7A does NOT do

- No DB writes (`erp_hr_collective_agreements_registry_*` untouched).
- No fetch / no scraping.
- No OCR (`ocr_blocked` short-circuits to `metadata_only`).
- No interaction with `agreementSalaryResolver`, `useESPayrollBridge`, `payslipEngine`, `salaryNormalizer`, payroll engine, or operational table `erp_hr_collective_agreements`.
- No RLS, migrations, or edge functions.
- No flags toggled. `persisted_priority_apply` OFF. C3B3C2 BLOCKED.
- `requires_human_review` never relaxed; `ready_for_payroll` never set true.

## Criteria to proceed to B7B (writer)

1. B7A approved.
2. Schema agreed for:
   - `erp_hr_collective_agreements_registry_sources`
   - `erp_hr_collective_agreements_registry_salary_tables`
   - `erp_hr_collective_agreements_registry_rules`
3. Reuse B5B/B5E writer pattern: admin-gated, dryRun, `import_runs` with `preUpdateSnapshots` + `previousCurrentVersionId`, rollback metadata.
4. Versioning rule: new `*_versions` row only when `sha256Hash` changes.
5. Forced safety remains: writer must neutralize any unsafe input (mirror B5E).
