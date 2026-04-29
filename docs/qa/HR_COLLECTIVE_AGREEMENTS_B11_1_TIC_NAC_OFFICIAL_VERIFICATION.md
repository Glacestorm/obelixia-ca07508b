# B11.1 — Verificación oficial read-only del candidato TIC-NAC

> Fase **B11.1**. Solo verificación. Sin parser, sin escritura, sin
> validación humana, sin activación. No se confirma jurídicamente ningún
> dato no aportado por humano con fuente oficial.

## Estado actual en DB (SELECT only, ejecutado en B11.1)

### `erp_hr_collective_agreements_registry`

| Campo | Valor |
|---|---|
| `id` | `1e665f80-3f04-4939-a448-4b1a2a4525e0` |
| `internal_code` | `TIC-NAC` |
| `official_name` | `Convenio de Empresas de Consultoría y TIC` |
| `status` | `pendiente_validacion` |
| `source_quality` | `legacy_static` |
| `data_completeness` | `metadata_only` |
| `salary_tables_loaded` | `false` |
| `ready_for_payroll` | `false` |
| `requires_human_review` | `true` |
| `cnae_codes` | `{62, 63}` |
| `jurisdiction_code` | `ES` |
| `effective_start_date` | `2024-01-01` (PENDIENTE confirmar oficialmente) |
| `effective_end_date` | `2026-12-31` (PENDIENTE confirmar oficialmente) |
| `ultraactivity_status` | `null` |

### `erp_hr_collective_agreements_registry_versions`

| Campo | Valor |
|---|---|
| `id` (current) | `9739379b-68e5-4ffd-8209-d5a1222fefc2` |
| `version_label` | `metadata-seed-v1` |
| `is_current` | `true` |
| `source_hash` | **NULL** |
| `publication_date` | **NULL** |
| `effective_start_date` | `2024-01-01` |
| `effective_end_date` | `2026-12-31` |
| `change_type` | `initial_text` |

### `erp_hr_collective_agreements_registry_sources`

| Campo | Valor |
|---|---|
| `id` | `7e14af28-c27e-48bd-9a8f-c0bab81a16e8` |
| `source_quality` | `legacy_static` |
| `document_hash` | **NULL** |
| `source_url` | **NULL** |
| `document_url` | **NULL** |

### Tablas hijas

| Tabla | Filas |
|---|---|
| `..._salary_tables` (TIC-NAC) | 0 |
| `..._rules` (TIC-NAC) | 0 |

## Tabla de qué falta

| Check | Estado |
|---|---|
| registry existe | ✅ sí |
| version current existe | ✅ sí |
| source existe (fila) | ✅ sí (placeholder seed) |
| `source_hash` (versions) | ❌ NULL |
| `document_hash` (sources) | ❌ NULL |
| `source_quality` actual | ❌ `legacy_static` (debe ser `official`) |
| `status` actual | ❌ `pendiente_validacion` (debe ser `vigente` o `ultraactividad`) |
| `salary_tables_loaded` | ❌ `false` |
| `data_completeness` | ❌ `metadata_only` |
| `ready_for_payroll` | ❌ `false` (correcto, NO debe activarse aquí) |
| `requires_human_review` | ✅ `true` (correcto en este punto) |
| filas salary_tables | ❌ 0 |
| filas rules | ❌ 0 |
| `source_url` BOE | ❌ NULL |
| `document_url` PDF | ❌ NULL |
| `publication_date` versión | ❌ NULL |

## Checklist oficial humano (PENDING_HUMAN_INPUT)

Ningún valor de esta sección puede ser inferido por la IA. Debe ser
aportado por humano con evidencia oficial verificable.

| Campo | Valor a aportar | Estado |
|---|---|---|
| `official_boe_url` | URL canónica BOE (Resolución DG Trabajo) | PENDING_HUMAN_INPUT |
| `official_pdf_url` | URL del PDF firmado/archivado | PENDING_HUMAN_INPUT |
| `regcon_code` | Código REGCON oficial | PENDING_HUMAN_INPUT |
| `publication_date` | Fecha BOE | PENDING_HUMAN_INPUT |
| `effective_start_date` | Inicio vigencia oficial | PENDING_HUMAN_INPUT |
| `effective_end_date` | Fin vigencia oficial | PENDING_HUMAN_INPUT |
| `ultraactivity_status` | Estado ultraactividad si aplica | PENDING_HUMAN_INPUT |
| `official_name_literal` | Denominación literal del BOE | PENDING_HUMAN_INPUT |
| `functional_scope_excerpt` | Texto literal del ámbito funcional | PENDING_HUMAN_INPUT |
| `territorial_scope_excerpt` | Texto literal del ámbito territorial | PENDING_HUMAN_INPUT |
| `cnae_6201_coverage_evidence` | Evidencia textual de cobertura CNAE 6201 | PENDING_HUMAN_INPUT |
| `salary_revision_document_url` | Acta(s) de revisión salarial vigente | PENDING_HUMAN_INPUT |
| `human_reviewer` | Identidad y rol del revisor humano | PENDING_HUMAN_INPUT |
| `decision` | `continue` / `stop` | PENDING_HUMAN_INPUT |

## Decisión B11.1

**STOP_B11.1 — PENDING_HUMAN_INPUT.**

Motivos formales:

- `source_url` y `document_url` NULL en `..._sources`.
- `source_quality` = `legacy_static` (no `official`).
- `source_hash` y `document_hash` NULL → imposible alineación SHA-256.
- `status` = `pendiente_validacion` (no `vigente` ni `ultraactividad`).
- `publication_date` NULL en versión.
- Vigencia (`effective_*`) presente como seed pero sin verificación humana
  contra BOE.
- Cobertura CNAE 6201 declarada en `cnae_codes` (`{62,63}`) pero sin
  evidencia textual del ámbito funcional del convenio.

No se procede a B11.2 hasta recibir el bloque PENDING_HUMAN_INPUT
completo y firmado por humano.

## Invariantes B11.1

- ✅ Sin escrituras DB.
- ✅ Sin tocar bridge ni nómina.
- ✅ Sin tocar `erp_hr_collective_agreements` (tabla operativa).
- ✅ Sin mutar `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- ✅ `HR_REGISTRY_PILOT_MODE = false` (sin cambios).
- ✅ `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false` (sin cambios).
- ✅ Sin `service_role` nuevo.
- ✅ Sin `ready_for_payroll` mutado.
- ✅ Sin invocaciones a edges B7B/B8/B9.
- ✅ Solo SELECT contra el Registry.

## Tests asociados

- `src/__tests__/hr/collective-agreements-b11-tic-nac-verification-static.test.ts`
  — guardas estáticas: doc B11.1 existe, no se introducen escrituras,
  no se toca bridge/payroll/operativa/flag/allow-list.