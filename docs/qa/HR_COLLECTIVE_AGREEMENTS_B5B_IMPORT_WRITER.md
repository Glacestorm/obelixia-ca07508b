# HR — Collective Agreements · B5B Import Writer (controlled persistence)

**Phase:** B5B
**Date:** 2026-04-28
**Scope:** Server-side writer + admin-gated edge function.
**Status:** ✅ Implemented. **No payroll, no salary tables, no real bulk import.**

---

## 1. Objetivo de B5B

Persistir de forma controlada los resultados del importer puro de B5A
en el Registro Maestro `erp_hr_collective_agreements_registry` y
tablas hijas, manteniendo intacto el contrato de seguridad: ningún
convenio importado puede salir con `ready_for_payroll=true`,
`salary_tables_loaded=true`, `requires_human_review=false` ni
`official_submission_blocked=false`.

## 2. B5A vs B5B

| Aspecto | B5A (puro) | B5B (writer) |
|---|---|---|
| Side effects | Ninguno | Escribe en DB con service_role |
| Normaliza | Sí | Reusa B5A |
| Planifica upsert | Sí | Reusa B5A |
| Persiste | ❌ | ✅ |
| Versiona | ❌ | ✅ initial_text + cambio de hash |
| Crea source | ❌ | ✅ status=pending |
| Audit run | ❌ | ✅ import_runs con report_json |
| Auth | N/A | Admin-gated (has_role) |

## 3. Seguridad del writer

- **JWT obligatorio** + **rol admin** (verificado vía RPC `has_role`).
- Service-role solo después de la verificación admin.
- Escritura solo en tablas del Registro Maestro:
  - `erp_hr_collective_agreements_registry`
  - `..._versions`
  - `..._sources`
  - `..._import_runs`
- ❌ NUNCA escribe en `erp_hr_collective_agreements` (operativa).
- ❌ NUNCA toca payroll engines, bridge, ni resolver.
- ❌ NUNCA acepta del input ningún flag de seguridad: se fuerza
  defensivamente vía `forceSafetyFlags`.
- Validación de body: `source` requerido, `items[]` requerido,
  máximo 1000 items por run.

## 4. Dry run

`dryRun: true`:
- No inserta en registry/versions/sources.
- Devuelve plan completo: `toInsert`, `toUpdate`, `skipped`, `errors`.
- **Sí** registra un `import_run` con `report_json.dryRun=true` para
  trazabilidad de quién planificó qué (decisión documentada para
  cumplir DORA/NIS2 audit trail).

## 5. Upsert seguro

Para cada record normalizado:

1. Si `internal_code` no existe → INSERT en registry + version
   `metadata-import-v1` + source `pending`.
2. Si existe → UPDATE únicamente con campos seguros (ver §6).
3. Si `publication_url` cambió respecto a la versión actual:
   - Marcar versiones anteriores `is_current=false`.
   - Insertar nueva versión `change_type='modificacion'`.

`publication_url` se usa como proxy de `document_hash` mientras B7
(parser real con SHA-256) no esté disponible.

## 6. Campos actualizables en update seguro

| Campo | ✅ Update | ❌ Update |
|---|---|---|
| official_name | ✅ | |
| short_name | ✅ | |
| jurisdiction_code | ✅ | |
| autonomous_region | ✅ | |
| province_code | ✅ | |
| sector | ✅ | |
| cnae_codes | ✅ | |
| publication_source | ✅ | |
| publication_url | ✅ | |
| publication_date | ✅ | |
| effective_start_date | ✅ | |
| effective_end_date | ✅ | |
| notes | ✅ | |
| updated_at | ✅ | |
| last_verified_at | ✅ | |
| **ready_for_payroll** | | ❌ |
| **salary_tables_loaded** | | ❌ |
| **data_completeness** | | ❌ |
| **requires_human_review** | | ❌ |
| **official_submission_blocked** | | ❌ |
| **status** | | ❌ |

`buildSafeMetadataPatch` jamás incluye claves prohibidas en el patch.
Test 17 lo verifica explícitamente.

## 7. Versionado

- INSERT nuevo → `metadata-import-v1`, `change_type='initial_text'`,
  `is_current=true`, `parsed_summary={data_completeness:'metadata_only', source}`.
- UPDATE sin cambio de hash → no nueva versión.
- UPDATE con cambio de `publication_url` → versión anterior
  `is_current=false`, nueva versión `change_type='modificacion'`,
  `metadata-import-YYYY-MM-DD`, `parsed_summary.reason='document_hash_change'`.
- Tablas salariales y reglas (B7) NO se tocan aquí.

## 8. Import runs (auditoría)

Siempre se intenta crear un registro en
`erp_hr_collective_agreements_registry_import_runs` con:

- `source`, `total_found`, `inserted`, `updated`, `skipped`, `errors`
- `report_json` con `insertedCodes`, `updatedCodes`, `skippedCodes`,
  `dedupedDuringNormalize`, `errors[]`, `triggeredBy` (userId), `dryRun`.
- `status`: `completed` | `completed_with_warnings` | `failed`.

Si la inserción del audit run falla, el writer no propaga el error al
cliente: el resultado del import sigue devolviéndose.

## 9. Por qué B5B NO activa nómina

- Fase de metadatos: sin tablas salariales, sin reglas parseadas,
  sin URL oficial verificada con hash criptográfico.
- El trigger `enforce_ca_registry_ready_for_payroll` en DB rechazaría
  cualquier intento de elevar `ready_for_payroll=true` con
  `data_completeness='metadata_only'`.
- Defensa en profundidad:
  1. `planRegistryUpsert` strip-ea flags sensibles en update.
  2. `forceSafetyFlags` los re-fuerza antes de cualquier write.
  3. La edge function ignora cualquier flag de seguridad del input.
  4. La columna `data_completeness` no está en `SAFE_UPDATE_FIELDS`.

## 10. Cómo ejecutar (admin)

```bash
curl -X POST \
  https://avaugfnqvvqcilhiudlf.supabase.co/functions/v1/erp-hr-collective-agreements-importer \
  -H "Authorization: Bearer <admin_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "BOIB",
    "dryRun": true,
    "items": [{
      "source": "BOIB",
      "officialName": "Convenio colectivo de Comercio General de las Illes Balears",
      "agreementCode": "COM-GEN-IB",
      "publicationUrl": "https://www.caib.es/eboibfront/es/2025/com-gen-ib",
      "publicationDate": "2025-06-10",
      "jurisdictionCode": "IB",
      "autonomousRegion": "IB",
      "scopeType": "autonomous",
      "cnaeCodes": ["4711","4719","4724"]
    }]
  }'
```

Respuestas: `401` sin JWT, `403` sin rol admin, `400` body inválido,
`200` con plan/result.

## 11. Verificación

```bash
bunx vitest run \
  src/__tests__/hr/collective-agreements-import-writer.test.ts \
  src/__tests__/hr/collective-agreements-importer.test.ts \
  src/__tests__/hr/collective-agreements-data-layer.test.ts \
  src/__tests__/hr/collective-agreements-classifier.test.ts \
  src/__tests__/hr/collective-agreements-registry-schema.test.ts \
  src/__tests__/hr/collective-agreements-registry-seed.test.ts \
  src/__tests__/hr/agreement-safety-gate.test.ts \
  src/__tests__/hr/agreement-salary-resolver-gate.test.ts \
  src/__tests__/hr/payroll-bridge-agreement-safety.test.ts \
  src/__tests__/hr/payroll-safe-mode-agreement-warnings.test.tsx \
  --pool=forks
```

Esperado: **143 passed** (17 nuevos B5B + 126 previos B1-B6).

## 12. Lo que NO se tocó

- ❌ `payslipEngine`, `salaryNormalizer`, `agreementSalaryResolver`.
- ❌ `useESPayrollBridge`.
- ❌ Tabla operativa `erp_hr_collective_agreements`.
- ❌ RLS, migraciones (la edge function asume RLS y `has_role` ya
  existentes; no se añadieron migraciones).
- ❌ Fixtures Carlos Ruiz, Command Center, HRNavigationMenu, HRModule,
  flags, `persisted_priority_apply`, C3B3C2.
- ❌ Tablas salariales — pendiente B7.
- ❌ Validación humana firmada — pendiente B8.
- ❌ Integración con nómina — pendiente B9.
- ❌ No se importaron convenios reales masivamente: sólo el writer
  está listo. El operador admin debe lanzar runs explícitos.

## 13. Próximas fases

- **B7** — Parser de PDFs/HTML BOIB/BOE/REGCON con hash SHA-256 real,
  poblando `_salary_tables` y `_rules` (no `metadata_only`).
- **B8** — Workflow de validación humana firmada por asesor laboral
  (lo único que puede bajar `requires_human_review` a `false`).
- **B9** — Activación condicionada de `ready_for_payroll` cuando se
  cumplan TODAS las condiciones del trigger
  `enforce_ca_registry_ready_for_payroll` + integración real con
  `agreementSalaryResolver` y `useESPayrollBridge`.