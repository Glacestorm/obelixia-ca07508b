# HR — Collective Agreements · B7B Parser Result Writer (admin-gated)

## Objetivo

Persistir los `ParserResult` generados por el pipeline puro B7A en el
Registro Maestro de Convenios, manteniendo intactas todas las garantías
legales de B5E (no nómina, no `ready_for_payroll`,
`requires_human_review` siempre `true`).

B7B es un módulo puro (`src/engines/erp/hr/collectiveAgreementsParserResultWriter.ts`)
que delega TODO el I/O a un `ParserResultRegistryAdapter` inyectable.
No importa Supabase, no realiza fetch, no toca React.

## Qué persiste

1. **Sources** (`erp_hr_collective_agreements_registry_sources`) con
   SHA-256 real proveniente de B7A. Idempotente por `(agreement_id, document_hash)`.
2. **Versions** (`erp_hr_collective_agreements_registry_versions`):
   - `parser-import-v1` si no había current version.
   - `parser-import-YYYY-MM-DD` cuando el SHA-256 cambia respecto a la
     versión current. Antes, llama a `unsetCurrentVersions(agreementId)`.
   - `change_type`: `salary_revision` si hay filas válidas, `correction`
     si solo hay reglas, `initial_text` si no había current.
3. **Salary tables** (`erp_hr_collective_agreements_registry_salary_tables`)
   solo con filas que cumplen TODAS estas condiciones:
   - `sourcePage > 0`
   - `sourceExcerpt` no vacío
   - `rowConfidence >= 0.6`
   - `requiresHumanReview = true` (re-forzado)
4. **Rules** (`erp_hr_collective_agreements_registry_rules`) con
   `requires_human_review = true`.
5. **Patch seguro** sobre `erp_hr_collective_agreements_registry`
   limitado a `SafeParserPatch`:
   - `data_completeness`: `parsed_partial` o `metadata_only`.
   - `salary_tables_loaded`: `true` solo si hay filas válidas.
   - `requires_human_review`: `true` (forzado).
   - `ready_for_payroll`: `false` (forzado).
   - `official_submission_blocked`: `true` (forzado).
   - `parser_last_run_at`, `parser_last_sha256`, `updated_at`.
6. **Import run** (`erp_hr_collective_agreements_registry_import_runs`)
   con `source = 'PARSER_B7B'` y `report_json` enriquecido.

## Qué NO persiste

- `erp_hr_collective_agreements` (tabla operativa) — **nunca**.
- `human_validated` como `data_completeness` — **nunca**.
- Elevación de `source_quality` — fuera de alcance.
- Convenios nuevos: si `internal_code` no existe → `AGREEMENT_NOT_FOUND`.

## Flags forzados (defense-in-depth)

`forceParserSafety(parserResult)` se aplica en cada iteración aunque el
pipeline B7A ya neutralice. El input se trata como no confiable:

- Cualquier `proposedRegistryPatch.ready_for_payroll = true` → ignorado.
- Cualquier `requires_human_review = false` → ignorado.
- Cualquier `data_completeness = 'human_validated'` → ignorado.
- Cada `salaryRow.requiresHumanReview` se re-fija a `true`.

`safetySummary` cuenta las neutralizaciones aplicadas y se incluye en
`report_json` para auditoría inmutable.

## Versionado por SHA-256

| Estado actual | SHA recibido | Acción |
|---|---|---|
| Sin current version | cualquiera válido | Crear `parser-import-v1` (`is_current=true`) |
| Current con mismo SHA, `manualReviewed=false` | igual | No crea versión, no refresca, warning `MANUAL_REVIEW_REQUIRED_TO_REFRESH_EXISTING_VERSION` |
| Current con mismo SHA, `manualReviewed=true` | igual | No crea versión, refresca rows/rules sobre la current |
| Current con SHA distinto | distinto | `unsetCurrentVersions` + nueva versión `parser-import-YYYY-MM-DD` (`is_current=true`); `previousCurrentVersionId` registrado en `report_json.perAgreement[code]` |

SHA-256 inválido (no `^[a-f0-9]{64}$`) → error `INVALID_SHA256`, no se
toca el adapter (ni siquiera `fetchAgreementByInternalCode`).

## DryRun

Si `dryRun = true`:

- **NO** se llama a `insertSource`, `unsetCurrentVersions`,
  `insertVersion`, `replaceSalaryRowsForVersion`,
  `replaceRulesForVersion`, `updateAgreementParserStatus`.
- Sí se permiten lecturas (`fetch*`) y la auditoría
  (`insertImportRun` con `report_json.dryRun = true`).
- Si `insertImportRun` falla en dryRun → swallow, `importRunId = null`,
  warning `DRYRUN_IMPORT_RUN_AUDIT_FAILED`. El dryRun nunca aborta.

## import_run · report_json

```json
{
  "source": "PARSER_B7B",
  "dryRun": false,
  "manualReviewed": false,
  "triggeredBy": "user-uuid",
  "dryRunReference": null,
  "parserResultsCount": 4,
  "internalCodes": ["COM-GEN-IB", "PAN-PAST-IB", "HOST-IB", "IND-ALIM-IB"],
  "perAgreement": {
    "COM-GEN-IB": {
      "sha256": "abc...",
      "previousCurrentVersionId": "uuid-or-null",
      "newVersionId": "uuid-or-null",
      "sourceInserted": true,
      "salaryRowsInserted": 12,
      "salaryRowsDiscarded": 3,
      "rulesInserted": 1,
      "patchApplied": { "...SafeParserPatch": "..." },
      "preUpdateSnapshot": { "...": "..." },
      "warnings": [],
      "errors": []
    }
  },
  "safetySummary": {
    "forcedReadyForPayrollFalse": 4,
    "forcedRequiresHumanReviewTrue": 4,
    "forcedOfficialSubmissionBlocked": 4
  },
  "warnings": [],
  "errors": [],
  "plan": { "...": "..." }
}
```

`status`:
- `failed` si todos los `ParserResult` fallaron.
- `completed_with_warnings` si hay errores parciales o warnings.
- `completed` en caso limpio.

## Rollback (manual / SQL)

Dado un `import_run_id` con `report_json.perAgreement[code]`:

```sql
-- Para cada code donde newVersionId IS NOT NULL:
DELETE FROM erp_hr_collective_agreements_registry_salary_tables
 WHERE version_id = :newVersionId;
DELETE FROM erp_hr_collective_agreements_registry_rules
 WHERE version_id = :newVersionId;
DELETE FROM erp_hr_collective_agreements_registry_versions
 WHERE id = :newVersionId;

-- Restaurar versión current anterior (si previousCurrentVersionId no es null):
UPDATE erp_hr_collective_agreements_registry_versions
   SET is_current = true
 WHERE id = :previousCurrentVersionId;

-- Borrar source SOLO si fue creada por este run (sourceInserted=true):
DELETE FROM erp_hr_collective_agreements_registry_sources
 WHERE agreement_id = :agreementId AND document_hash = :sha256;

-- Restaurar metadata segura desde preUpdateSnapshot (whitelist):
UPDATE erp_hr_collective_agreements_registry
   SET data_completeness = :prev_data_completeness,
       salary_tables_loaded = :prev_salary_tables_loaded,
       parser_last_run_at = :prev_parser_last_run_at,
       parser_last_sha256 = :prev_parser_last_sha256
 WHERE id = :agreementId;

-- Auditoría del rollback:
INSERT INTO erp_hr_collective_agreements_registry_import_runs
  (source, status, report_json)
VALUES ('PARSER_B7B_ROLLBACK', 'completed',
        jsonb_build_object('rolledBackFrom', :original_run_id));
```

**Nunca**: borrar el convenio del registry, tocar
`erp_hr_collective_agreements`, tocar nómina.

## Qué queda para B8

- Validación humana explícita que permita transitar a
  `data_completeness = 'human_validated'` (NO en B7B).
- Activación condicional de `ready_for_payroll` (NO en B7B).
- Edge function admin-gated que envuelva este writer con
  `validateTenantAccess` y `service_role` controlado.
- Función automática de rollback (B7C opcional).

## Confirmación

- ✅ No nómina.
- ✅ No tabla operativa `erp_hr_collective_agreements`.
- ✅ No `ready_for_payroll`.
- ✅ No `human_validated`.
- ✅ No Supabase imports en el writer.
- ✅ No fetch real.
- ✅ No RLS / migraciones / edge functions añadidos en este Build.
- ✅ SHA-256 real (no FNV-1a) provisto por B7A.
- ✅ Rollback definido en SQL manual.
