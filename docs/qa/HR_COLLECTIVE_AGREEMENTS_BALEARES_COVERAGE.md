# HR — Collective Agreements · Baleares Reinforced Coverage

**Phase:** B2
**Region:** Illes Balears (`ES-IB`)
**Status:** Metadata-only seed. **No payroll automation enabled.**

---

## 1. Reinforced agreements (4)

| internal_code | Official name (working title) | CNAEs | Source quality | Notes |
|---|---|---|---|---|
| **COM-GEN-IB** | Convenio Colectivo de Comercio en General de las Illes Balears | `47` | `pending_official_validation` | Comercio minorista general. |
| **PAN-PAST-IB** | Convenio Colectivo de Industrias de Panadería y Pastelería de las Illes Balears | `1071`, `1072`, `4724` | `pending_official_validation` | **Candidato prioritario para pastelería + obrador.** |
| **HOST-IB** | Convenio Colectivo de Hostelería de las Illes Balears | `55`, `56` | `pending_official_validation` | Aplica si hay consumo en local / cafetería. |
| **IND-ALIM-IB** | Convenio Colectivo de Industria Alimentaria de las Illes Balears | `10` | `pending_official_validation` | Solo si la actividad principal es fabricación alimentaria amplia. |

All four are `data_completeness='metadata_only'`, `ready_for_payroll=false`,
`requires_human_review=true`, `official_submission_blocked=true`.

## 2. Routing rules by activity

These rules drive `rankAgreementsForCnaeBaleares()` (see
`src/__tests__/hr/collective-agreements-registry-seed.test.ts`). The
function returns a **list of candidates**; the final decision is always
human.

### Pastelería + obrador (industria — CNAE 1071 / 1072)
- **Primer candidato:** `PAN-PAST-IB`.
- Secundario: `IND-ALIM-IB` si la actividad es más amplia.
- ❌ No usar `COM-GEN-IB` como primera opción — la actividad principal
  es industrial, no comercial.

### Tienda especializada de pan/pastelería (CNAE 4724)
- Candidatos en empate operativo: `PAN-PAST-IB` y `COM-GEN-IB`.
- **Selección humana obligatoria.** Si hay obrador propio, prevalece
  `PAN-PAST-IB`. Si es solo punto de venta, puede prevalecer
  `COM-GEN-IB`.

### Comercio minorista genérico (CNAE 47)
- Candidato: `COM-GEN-IB`.
- ⚠️ Si la inspección detecta obrador, abrir revisión con
  `PAN-PAST-IB` antes de cerrar la asignación.

### Hostelería con consumo (CNAE 55 / 56)
- Candidato: `HOST-IB`.
- Si es venta sin consumo (take-away puro), revisar comercio o
  panadería antes de cerrar.

### Industria alimentaria amplia (CNAE 10)
- Candidato: `IND-ALIM-IB` solo si la actividad principal es
  fabricación alimentaria de gama amplia. Si es solo panadería,
  preferir `PAN-PAST-IB`.

## 3. Limitaciones (honestidad de datos)

- **No tenemos texto oficial cargado** para ninguno de los cuatro
  convenios. Todos los campos `effective_start_date`,
  `effective_end_date`, `publication_url` están en `null` o son
  marcadores de trabajo.
- **No hay tablas salariales** (`salary_tables_loaded=false`). Cualquier
  cifra que aparezca en pantalla debe llevar el sufijo `(est.)` y un
  aviso de que NO procede de fuente oficial verificada.
- **No hay versionado oficial** — solo la versión inicial
  `metadata-seed-v1`.
- **Las fuentes (`erp_hr_collective_agreements_registry_sources`)
  están en `status='pending'`** y referencian `BOIB` como tipo de
  publicación esperada, sin URL verificada.

## 4. Validación BOIB / REGCON pendiente

Para que cualquiera de estos cuatro convenios pueda alimentar nómina
automática, B5/B6 deberá:

1. Localizar la publicación oficial vigente en BOIB y/o REGCON.
2. Cargar el documento, calcular `document_hash`, marcar `source_quality='official'`.
3. Parsear tablas salariales (B4) y guardar en
   `erp_hr_collective_agreements_registry_salary_tables` con
   `salary_tables_loaded=true`.
4. Pasar revisión humana (B5) — operador laboral debe firmar con
   `requires_human_review=false`.
5. Sólo entonces el trigger `enforce_ca_registry_ready_for_payroll`
   permitirá `ready_for_payroll=true`.

Hasta entonces, las recomendaciones aquí descritas son **orientativas**
y deben confirmarse manualmente caso a caso.

## 5. Riesgos abiertos

- **Pastelería con tienda + obrador** sigue siendo el caso más
  ambiguo. La regla por defecto (`PAN-PAST-IB` primero) es
  conservadora pero requiere validación humana siempre.
- **Hostelería con take-away** puede caer en `COM-GEN-IB` o
  `PAN-PAST-IB`; no asumir `HOST-IB` automáticamente sin verificar
  consumo en local.
- **Convenios provinciales** (Mallorca / Menorca / Eivissa-Formentera)
  no están modelados todavía. Si aparece uno aplicable más restrictivo,
  prevalece sobre el autonómico.