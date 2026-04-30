# B11.1 — Verificación oficial read-only del candidato AGRO-NAC

> Fase **B11.1**. Solo verificación. Sin parser, sin escritura, sin
> validación humana firmada, sin activación. Ningún dato jurídico se
> da por confirmado sin decisión humana explícita (`decision='continue'`).

## Estado actual

**Decisión vigente:** `STOP_B11.1_AGRO_NAC — PENDING_HUMAN_INPUT`

Motivo: NO se ha localizado una fuente oficial estatal verificable en
BOE para un "Convenio Colectivo Estatal del Sector Agrario" con ámbito
nacional. La regulación efectiva del sector agrario en España es
predominantemente **provincial** (convenios provinciales del campo,
publicados en cada BOP), y las negociaciones de un eventual *I Convenio
Estatal del Campo* entre CCOO-Industria, UGT FICA, ASAJA y CEOE siguen
abiertas sin texto consolidado publicado en BOE como convenio único de
sector estatal.

En consecuencia, el candidato Registry `AGRO-NAC` (modelado como
convenio nacional, `jurisdiction_code='ES'`) **no puede avanzar a
B11.2** sin una de estas decisiones humanas:

1. Aportar un BOE oficial estatal vigente (si existiera y la IA no lo
   hubiera localizado), o
2. Reconvertir el alcance del candidato a un convenio **provincial**
   concreto (ej. Almería, Huelva, Murcia, Ciudad Real, Sevilla…) con
   su BOP, código REGCON y vigencia propios, o
3. Marcar el candidato como **no apto** para piloto y elegir otro
   convenio estatal real (ej. TIC-NAC, ya verificado en B11.1B).

**B11.2 queda BLOQUEADO** para AGRO-NAC hasta firma humana de
`decision='continue'` con fuente oficial concreta.

## Estado actual en DB (SELECT only, ejecutado en B11.1)

### `erp_hr_collective_agreements_registry`

| Campo | Valor |
|---|---|
| `id` | `ca364025-3856-4822-a3be-90d4dbbbd254` |
| `internal_code` | `AGRO-NAC` |
| `official_name` | `Convenio del Sector Agrario` |
| `status` | `pendiente_validacion` |
| `source_quality` | `legacy_static` |
| `data_completeness` | `metadata_only` |
| `salary_tables_loaded` | `false` |
| `ready_for_payroll` | `false` |
| `requires_human_review` | `true` |
| `cnae_codes` | `{01, 02, 03}` |
| `jurisdiction_code` | `ES` |
| `effective_start_date` | `2023-01-01` (seed; no validado) |
| `effective_end_date` | `2025-12-31` (seed; no validado) |
| `ultraactivity_status` | `null` |

### `erp_hr_collective_agreements_registry_versions`

| Campo | Valor |
|---|---|
| `id` (current) | `8230b322-6a1e-48aa-86cd-45fa92c2bf95` |
| `version_label` | `metadata-seed-v1` |
| `is_current` | `true` |
| `source_hash` | **NULL** |
| `publication_date` | **NULL** |
| `effective_start_date` | `2023-01-01` |
| `effective_end_date` | `2025-12-31` |
| `change_type` | `initial_text` |

### `erp_hr_collective_agreements_registry_sources`

| Campo | Valor |
|---|---|
| `id` | `b5b1def9-bfe5-4457-80ad-f88ec7b7a8b2` |
| `source_quality` | `legacy_static` |
| `document_hash` | **NULL** |
| `source_url` | **NULL** |
| `document_url` | **NULL** |

### Tablas hijas

| Tabla | Filas |
|---|---|
| `..._salary_tables` (AGRO-NAC) | 0 |
| `..._rules` (AGRO-NAC) | 0 |

## Búsqueda de fuente oficial — resultado

Búsqueda read-only realizada (sin escritura, sin inferencia jurídica):

- No existe a fecha de B11.1 un *Convenio Colectivo Estatal del Sector
  Agrario* publicado en BOE como convenio único de sector estatal con
  vigencia confirmada y código REGCON estatal asignado.
- Existen múltiples *Convenios Colectivos Provinciales del Campo /
  Sector Agrario* publicados en BOP (Almería, Huelva, Murcia, Ciudad
  Real, Sevilla, Jaén, etc.), cada uno con su propio REGCON, vigencia y
  tablas salariales.
- Existen comunicados sindicales (CCOO Industria, UGT FICA) sobre
  negociación de un *I Convenio Estatal del Campo*, sin texto
  consolidado publicado en BOE como convenio único de sector estatal a
  fecha de esta verificación.

La IA **no infiere** un convenio estatal donde no existe. AGRO-NAC, tal
como está modelado en Registry (`jurisdiction_code='ES'`,
`official_name='Convenio del Sector Agrario'`), **carece de fuente
oficial verificable**.

## Checklist oficial humano para AGRO-NAC (PENDING)

| Campo | Estado |
|---|---|
| `official_boe_url` | PENDING_HUMAN_INPUT — no localizado por IA |
| `official_pdf_url` | PENDING_HUMAN_INPUT |
| `boletín / autonomía / provincia` | PENDING_HUMAN_INPUT — probable BOP, NO BOE estatal |
| `regcon_code` | PENDING_HUMAN_INPUT |
| `publication_date` | PENDING_HUMAN_INPUT |
| `effective_start_date` (oficial) | PENDING_HUMAN_INPUT |
| `effective_end_date` (oficial) | PENDING_HUMAN_INPUT |
| `ultraactivity_status` | PENDING_HUMAN_INPUT |
| `official_name_literal` | PENDING_HUMAN_INPUT |
| `territorial_scope_excerpt` | PENDING_HUMAN_INPUT — probablemente provincial |
| `functional_scope_excerpt` | PENDING_HUMAN_INPUT |
| `cnae_coverage_evidence` (CNAE 01/02/03) | PENDING_HUMAN_REVIEW |
| `salary_tables_location` | PENDING_HUMAN_INPUT |
| `rules_location` | PENDING_HUMAN_INPUT |
| `human_reviewer` | PENDING_HUMAN_INPUT |
| `human_approver` | PENDING_HUMAN_INPUT |
| `decision` (continue / stop) | PENDING_HUMAN_DECISION |
| Reconversión a convenio provincial concreto | PENDING_HUMAN_DECISION |

## Tabla de qué falta vs Registry

| Check | Estado |
|---|---|
| registry existe | ✅ sí |
| version current existe | ✅ sí |
| source existe (fila) | ✅ sí (placeholder seed) |
| `source_hash` (versions) | ❌ NULL |
| `document_hash` (sources) | ❌ NULL |
| `source_quality` actual | ❌ `legacy_static` (sin propuesta válida hasta fuente oficial) |
| `status` actual | ❌ `pendiente_validacion` (correcto, debe permanecer) |
| `salary_tables_loaded` | ❌ `false` (correcto) |
| `data_completeness` | ❌ `metadata_only` |
| `ready_for_payroll` | ✅ `false` (correcto, NO debe activarse) |
| `requires_human_review` | ✅ `true` (correcto) |
| filas salary_tables | ❌ 0 |
| filas rules | ❌ 0 |
| `source_url` BOE estatal | ❌ NO LOCALIZADO |
| `document_url` PDF oficial | ❌ NO LOCALIZADO |
| `publication_date` versión | ❌ NULL |

## Decisión B11.1

**`STOP_B11.1_AGRO_NAC — PENDING_HUMAN_INPUT`.**

- No existe fuente oficial estatal BOE verificable para este candidato.
- El sector agrario español se regula mayoritariamente por convenios
  provinciales (BOP), no por un convenio único estatal vigente en BOE.
- **No se escribe nada en DB.** No se ejecuta parser. No se activa nada.
- No se modifican flags ni allow-list.
- El candidato AGRO-NAC permanece en `metadata_only` /
  `pendiente_validacion` / `ready_for_payroll=false` exactamente como
  estaba antes de B11.1.

### Criterios de avance a B11.2

B11.2 podrá iniciarse para AGRO-NAC SOLO cuando humano aporte una de
estas opciones:

1. Fuente oficial BOE estatal real (si la IA no la hubiera localizado),
   con todos los campos del checklist, **o**
2. Reconversión explícita del candidato a un convenio **provincial**
   concreto, con su BOP, REGCON y vigencia, **o**
3. Decisión de descartar AGRO-NAC como piloto.

Adicionalmente, en cualquiera de los casos anteriores se exigirá:

- `human_reviewer` y `human_approver` identificados,
- `decision = 'continue'` firmada,
- cobertura CNAE confirmada humanamente,
- scope piloto real confirmado,
- modo B11.2 decidido (extracción auto vs `manual_table_upload`).

Mientras alguno siga `PENDING_*`, B11.2 permanece bloqueado para AGRO-NAC.

## Invariantes B11.1 (AGRO-NAC)

- ✅ Sin escrituras DB.
- ✅ Sin tocar bridge ni nómina.
- ✅ Sin tocar `erp_hr_collective_agreements` (tabla operativa).
- ✅ Sin mutar `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- ✅ `HR_REGISTRY_PILOT_MODE = false` (sin cambios).
- ✅ `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false` (sin cambios).
- ✅ Sin `service_role` nuevo.
- ✅ Sin `ready_for_payroll` mutado.
- ✅ Sin invocaciones a edges B7B/B8/B9.
- ✅ Solo SELECT contra el Registry + búsqueda documental externa
  read-only sin inferencia jurídica.

## Tests asociados

- `src/__tests__/hr/collective-agreements-b11-agro-nac-verification-static.test.ts`
  — guardas estáticas: doc B11.1 AGRO-NAC existe, contiene los IDs de
  registry/version/source reales, registra `STOP_B11.1_AGRO_NAC —
  PENDING_HUMAN_INPUT`, no introduce escrituras, no toca bridge /
  payroll / operativa / flag / allow-list.

## B11.1C — Decisión recomendada

**Decisión recomendada: no activable como convenio estatal genérico.**

AGRO-NAC, tal como está modelado en Registry (`internal_code='AGRO-NAC'`,
`jurisdiction_code='ES'`, `official_name='Convenio del Sector Agrario'`),
queda marcado como **convenio genérico no apto para activación** mientras
no exista una de las dos condiciones siguientes:

1. Aparición efectiva en BOE de un convenio estatal único del sector
   agrario con REGCON estatal y vigencia confirmada, **o**
2. Sustitución expresa por un convenio **territorial concreto**
   (provincia / CCAA / actividad) con su BOP/DO autonómico, REGCON,
   vigencia y tablas salariales propias.

> Para usar el sector agrario en nómina debe seleccionarse un convenio
> territorial concreto: provincia/CCAA/actividad.

### Señalización en UI (B11.1C)

En el Centro de Convenios y en el detalle Registry, AGRO-NAC se muestra
con:

- Badge visible: **`REQUIERE_CONVENIO_TERRITORIAL`** (variante
  `destructive`).
- Mensaje explicativo: "No activable como convenio estatal genérico".
- Recomendación textual de selección territorial concreta.
- **Supresión** de cualquier CTA de avance:
  - sin botón de wizard de incorporación / parser B11.2,
  - sin sugerencias de match Registry para arrastrarlo a flujo de
    incorporación,
  - sin CTA de validación humana B8A,
  - sin CTA de mapping / runtime apply,
  - sin CTA de `ready_for_payroll`.

La marca es **read-only y derivada en cliente**: no se modifica DB, ni
`requires_human_review`, ni `ready_for_payroll`, ni allow-list, ni
flags. Se aplica únicamente a convenios cuyo `internal_code` figura en
la lista explícita `GENERIC_NON_TERRITORIAL_INTERNAL_CODES` definida
en `src/lib/hr/agreementGenericTerritorialBlocker.ts`. Ampliar esa
lista exige cambio de código y un documento QA estilo B11.1 que
justifique la inclusión.

### Tests B11.1C asociados

- `src/__tests__/hr/collective-agreements-b11-1c-generic-territorial-static.test.ts`
  — guardas estáticas: helper existe, lista contiene `AGRO-NAC`, no
  contiene escrituras DB, no importa bridge / payroll / resolvers, no
  muta flags ni allow-list, y la flag `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`
  permanece `false`.
- `src/__tests__/hr/collective-agreements-b11-1c-generic-territorial-ui.test.tsx`
  — guardas UI: el drawer de detalle muestra el badge
  `REQUIERE_CONVENIO_TERRITORIAL` y el bloque de recomendación
  territorial para AGRO-NAC, **no** muestra CTA de wizard (parser /
  validación / mapping / activación) y **no** muestra texto de
  `ready_for_payroll`/activación.
