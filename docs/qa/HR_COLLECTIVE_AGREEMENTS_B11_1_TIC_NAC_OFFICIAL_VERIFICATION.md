# B11.1 / B11.1B — Verificación oficial read-only del candidato TIC-NAC

> Fase **B11.1 / B11.1B**. Solo verificación. Sin parser, sin escritura,
> sin validación humana firmada, sin activación. Ningún dato jurídico se
> da por confirmado sin decisión humana explícita (`decision='continue'`).

## Estado actual

**Decisión vigente:** `B11.1B — OFFICIAL_SOURCE_FOUND / PENDING_HUMAN_DECISION`

(Estado anterior: `STOP_B11.1 — PENDING_HUMAN_INPUT`, superado al
localizar la fuente oficial BOE.)

**B11.2 sigue BLOQUEADO** hasta firma humana de `decision='continue'`.

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
| `effective_start_date` | `2024-01-01` (seed; superseded por BOE oficial 2025-01-01) |
| `effective_end_date` | `2026-12-31` (seed; superseded por BOE oficial 2027-12-31) |
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

## B11.1B — Fuente oficial localizada (BOE)

> Documentación localizada por humano. La IA NO infiere ningún campo
> oficial; solo registra el bloque aportado.

### Bloque oficial confirmado

| Campo | Valor |
|---|---|
| `official_name_literal` | XIX Convenio colectivo estatal de empresas de consultoría, tecnologías de la información y estudios de mercado y de la opinión pública |
| `boe_reference` | `BOE-A-2025-7766` |
| `official_boe_url` | https://www.boe.es/buscar/doc.php?id=BOE-A-2025-7766 |
| `official_pdf_url` | https://boe.es/boe/dias/2025/04/16/pdfs/BOE-A-2025-7766.pdf |
| `eli_url` | https://www.boe.es/eli/es/res/2025/04/04/(10) |
| `regcon_code` | `99001355011983` |
| `publication_date` | `2025-04-16` |
| `resolution_date` | `2025-04-04` |
| `effective_start_date` | `2025-01-01` |
| `effective_effects_note` | Efectos económicos desde `2025-01-01`. |
| `effective_end_date` | `2027-12-31` |
| `ultraactivity_status` | Prorrogable según texto BOE hasta convenio sustitutorio en los términos del artículo 5. |
| `territorial_scope` | Todo el territorio del Estado español. |
| `status_propuesto` | `vigente` |
| `source_quality_propuesta` | `official` |
| `document_contains_salary_tables` | `true` (Anexo I — Tablas salariales 2025, 2026 y 2027) |
| `salary_tables_location` | Anexo I — Tablas salariales 2025, 2026 y 2027 |
| `document_contains_nomenclatures` | `true` (Anexo II) |
| `nomenclatures_location` | Anexo II |
| `replacement_note` | El XIX Convenio sustituye al XVIII Convenio colectivo estatal de empresas de consultoría y estudios de mercado y de la opinión pública. |
| `functional_scope_evidence` | El BOE incluye empresas de consultoría tecnológica, tecnologías de la información, servicios de informática, consultoría de negocio y estudios de mercado/opinión pública. |
| `salary_revision_document_url` | No separar todavía. Las tablas 2025, 2026 y 2027 constan en el propio Anexo I del `BOE-A-2025-7766`, salvo que se localice revisión salarial posterior. |

### Pendiente humano (PENDING)

| Campo | Estado |
|---|---|
| `cnae_6201_coverage_evidence` | PENDING_HUMAN_REVIEW — confirmar correspondencia exacta con CNAE 6201 y actividad real |
| `human_reviewer` | PENDING_HUMAN_INPUT |
| `human_approver` | PENDING_HUMAN_INPUT |
| `decision` (continue / stop) | PENDING_HUMAN_DECISION |
| Confirmación scope piloto real | PENDING_HUMAN_INPUT |
| Grupo / área / nivel del empleado piloto | PENDING_HUMAN_INPUT |
| Modo B11.2 (extracción auto vs `manual_table_upload`) | PENDING_HUMAN_INPUT |

## Tabla de qué falta vs Registry

| Check | Estado |
|---|---|
| registry existe | ✅ sí |
| version current existe | ✅ sí |
| source existe (fila) | ✅ sí (placeholder seed) |
| `source_hash` (versions) | ❌ NULL — pendiente B11.2 |
| `document_hash` (sources) | ❌ NULL — pendiente B11.2 |
| `source_quality` actual | ❌ `legacy_static` (propuesta: `official`) |
| `status` actual | ❌ `pendiente_validacion` (propuesta: `vigente`) |
| `salary_tables_loaded` | ❌ `false` |
| `data_completeness` | ❌ `metadata_only` |
| `ready_for_payroll` | ❌ `false` (correcto, NO debe activarse aquí) |
| `requires_human_review` | ✅ `true` (correcto en este punto) |
| filas salary_tables | ❌ 0 |
| filas rules | ❌ 0 |
| `source_url` BOE | ✅ localizada (no escrita) |
| `document_url` PDF | ✅ localizada (no escrita) |
| `publication_date` versión | ✅ localizada (no escrita) |

## Decisión B11.1B

**`B11.1B — OFFICIAL_SOURCE_FOUND / PENDING_HUMAN_DECISION`.**

- Fuente oficial BOE localizada y registrada (`BOE-A-2025-7766`).
- REGCON `99001355011983` registrado.
- Vigencia oficial 2025-01-01 → 2027-12-31 registrada.
- Anexo I (tablas) y Anexo II (nomenclaturas) identificados en el propio BOE.
- **No se escribe nada en DB.** No se ejecuta parser. No se activa nada.

### Criterios de avance a B11.2

B11.2 podrá iniciarse SOLO cuando:

1. `human_reviewer` y `human_approver` estén identificados.
2. `decision = 'continue'` esté firmada por humano.
3. Cobertura CNAE 6201 quede confirmada humanamente.
4. Scope piloto real quede confirmado.
5. Quede decidido si B11.2 usa extracción automática o `manual_table_upload`.

Mientras alguno de los anteriores siga `PENDING_*`, B11.2 permanece bloqueado.

## Invariantes B11.1 / B11.1B

- ✅ Sin escrituras DB.
- ✅ Sin tocar bridge ni nómina.
- ✅ Sin tocar `erp_hr_collective_agreements` (tabla operativa).
- ✅ Sin mutar `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- ✅ `HR_REGISTRY_PILOT_MODE = false` (sin cambios).
- ✅ `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false` (sin cambios).
- ✅ Sin `service_role` nuevo.
- ✅ Sin `ready_for_payroll` mutado.
- ✅ Sin invocaciones a edges B7B/B8/B9.
- ✅ Solo SELECT contra el Registry + bloque oficial documental.

## Tests asociados

- `src/__tests__/hr/collective-agreements-b11-tic-nac-verification-static.test.ts`
  — guardas estáticas: doc B11.1/B11.1B existe, contiene los identificadores
  oficiales BOE (`BOE-A-2025-7766`, REGCON `99001355011983`, fechas, status
  y source_quality propuestos), no introduce escrituras, no toca bridge /
  payroll / operativa / flag / allow-list.
