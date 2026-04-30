# B11.2 — Parser/carga técnica TIC-NAC desde BOE-A-2025-7766

> Fase **B11.2**. Sólo extracción técnica preparatoria de B11.3 writer.
> NO escribe en DB. NO activa `ready_for_payroll`. NO toca bridge,
> nómina, tabla operativa, flags ni allow-list. Ningún importe se
> infiere; ningún concepto se inventa. Toda fila salarial requiere
> revisión humana antes de cualquier writer (B11.3) o validación (B8A).

## Decisión humana vinculada

| Campo | Valor |
|---|---|
| `human_reviewer` | Carlos |
| `human_approver` | `PENDING_B8A_FORMAL_APPROVAL` |
| `decision` | `continue` (autoriza SOLO B11.2 técnica) |
| `scope_piloto_confirmado` | `no` |
| `grupo_area_nivel_empleado` | `PENDING_EMPLOYEE_SCOPE` |
| `cnae_6201_coverage_confirmed` | `pending_human_review` |
| `modo_carga` | `auto_then_manual_fallback` |

Esta decisión **NO** autoriza: validación humana `approved_internal`,
`ready_for_payroll`, mapping, runtime setting, ni piloto.

## Identidad del convenio

| Campo | Valor |
|---|---|
| `internal_code` | `TIC-NAC` |
| `agreement_id` | `1e665f80-3f04-4939-a448-4b1a2a4525e0` |
| `version_id` (current) | `9739379b-68e5-4ffd-8209-d5a1222fefc2` |
| `source_id` | `7e14af28-c27e-48bd-9a8f-c0bab81a16e8` |
| `official_name_literal` | XIX Convenio colectivo estatal de empresas de consultoría, tecnologías de la información y estudios de mercado y de la opinión pública |
| `boe_reference` | `BOE-A-2025-7766` |
| `regcon_code` | `99001355011983` |
| `publication_date` | `2025-04-16` |
| `effective_start_date` | `2025-01-01` |
| `effective_end_date` | `2027-12-31` |
| `official_boe_url` | https://www.boe.es/buscar/doc.php?id=BOE-A-2025-7766 |
| `official_pdf_url` | https://boe.es/boe/dias/2025/04/16/pdfs/BOE-A-2025-7766.pdf |
| `eli_url` | https://www.boe.es/eli/es/res/2025/04/04/(10) |

## Modo de extracción

- `extractionMethod` propuesto: `pdf_text` para reglas articuladas
  (artículos del cuerpo del convenio, presentes como texto fiable en la
  versión HTML/XML del BOE).
- `extractionMethod` propuesto para Anexo I (tablas salariales 2025/26/27)
  y Anexo II (nomenclaturas): **`manual_table_upload`**. Ver sección
  *Bloqueo de tablas salariales* más abajo.
- **NO se ha ejecutado OCR automático.** Las reglas duras lo prohíben.

## Lo que se ha podido extraer (solo evidencia textual fiable)

### 1) Estructura de clasificación profesional (Anexo I — parte textual)

Áreas funcionales detectadas en el texto del convenio:

| Área | Denominación |
|---|---|
| Área 1 | Consultoría |
| Área 2 | Desarrollo de software |
| Área 3 | Servicios y soporte |
| Área 4 | Tecnologías de la información (evolución vertical) |
| Área 5 | Ciberseguridad (tabla salarial **nueva** desde 2025) |
| Área 6 | Estudios de mercado (subáreas: Técnica / Operaciones) |

Grupos profesionales detectados:

| Grupo | Niveles | Descripción funcional resumida |
|---|---|---|
| Grupo A | sin niveles | Coordinación, planificación y gestión con autonomía y supervisión amplias |
| Grupo B | Niveles 1, 2 | Análisis, definición, coordinación, supervisión de proyectos |
| Grupo C | Niveles 1, 2, 3 | Actividades técnicas, programación y supervisión de colaboradores |
| Grupo D | Niveles 1, 2, 3 | Ejecución de procesos administrativos/técnico-operativos de complejidad media |
| Grupo E | Niveles 1, 2 (al menos) | Tareas técnico-administrativas de baja complejidad bajo supervisión |

Source: BOE HTML, líneas 275–360 aprox. del cuerpo articulado.

### 2) Reglas extraídas con confianza alta (texto literal del BOE)

Cada regla queda lista para B11.3 con `extractionMethod='pdf_text'` y
`requiresHumanReview=true`. NO se persiste nada todavía.

| `rule_key` | Valor / fórmula | sourceArt | rowConfidence |
|---|---|---|---|
| `vigencia_inicio` | `2025-01-01` | Disp. preliminar / Art. 27 | high |
| `vigencia_fin` | `2027-12-31` | Art. 27 | high |
| `efectos_economicos` | Tablas 2025 con efectos económicos desde 2025-01-01 (regularización en 2 meses tras publicación BOE) | Art. 27.2 | high |
| `pagas_anuales` | `14` (12 mensualidades + paga julio + paga diciembre) | Art. 28.1 | high |
| `paga_extra_julio_devengo` | Semestre enero–junio | Art. 28 | high |
| `paga_extra_diciembre_devengo` | Semestre julio–diciembre | Art. 28 | high |
| `jornada_anual_max_horas` | `1800` h/año | Art. 20.1 | high |
| `jornada_diaria_max_ordinaria` | `9` h/día | Art. 20.1 | high |
| `jornada_intensiva_agosto` | Sí, máx 36 h/semana en periodo intensivo | Art. 20.2 | high |
| `vacaciones_dias_laborables` | `23` (o `22` si la empresa cumple ciertas condiciones de jornada intensiva o días no laborables adicionales) | Art. 21.1 | high |
| `antiguedad_estructura` | 5 trienios al 5% + 3 trienios al 10% + 1 trienio al 5% sobre salario base área/grupo/nivel | Art. 26 | high |
| `plus_convenio` | Existe Plus Convenio anual por grupo/nivel, importes en Anexo I | Art. 30 | high |
| `preaviso_dimision` | 15 días laborables; pérdida proporcional de paga extra devengada en caso contrario | Art. 31 | high |
| `clausula_revision_2028` | Revisión IPC 2025–2027 con tope 2% (área 5 ciberseguridad: cómputo desde 2026) | Art. 27.5 | high |
| `periodo_prueba_grupos` | Grupo A: 6m / Grupo B: 6m / Grupo C: 4m–6m según caso | Arts. periodo de prueba | high |

Todas estas reglas se entregarán a B11.3 como filas `..._rules` con
`requiresHumanReview=true`. Ninguna habilita nómina por sí sola.

### 3) Anexo II — Nomenclaturas

- `extraction_status`: PENDING (no presente en el cuerpo articulado HTML
  del BOE; figura como anexo separado en el PDF).
- `extractionMethod` propuesto: `manual_table_upload`.
- NO se infieren nomenclaturas.

## Bloqueo de tablas salariales (Anexo I numérico)

**STATUS: `MANUAL_TABLE_UPLOAD_REQUIRED`.**

Razón técnica:

- La versión HTML/XML del BOE expone íntegramente el texto articulado
  (artículos 1 a 39 y disposiciones), pero **no expone los importes
  numéricos por área/grupo/nivel/año** del Anexo I; éstos figuran
  exclusivamente en el PDF como tablas renderizadas.
- Las reglas duras de B11.2 prohíben OCR automático.
- Por tanto, ningún importe puede extraerse vía `pdf_text` con
  `rowConfidence ≥ umbral`.
- Conforme a la regla "*Si una tabla no alcanza confianza suficiente,
  detener y preparar manual_table_upload con sourcePage y
  sourceExcerpt*", se detiene la extracción automática de tablas
  salariales.

### Esquema de filas a aportar manualmente (template B11.3)

Para cada combinación válida `(year, area, group, level)` el humano
aportará una fila con esta forma exacta:

```
{
  year: 2025 | 2026 | 2027,
  area: "1" | "2" | "3" | "4" | "5" | "6",
  group: "A" | "B" | "C" | "D" | "E",
  level: null | "1" | "2" | "3",
  concept: "salario_base_anual" | "plus_convenio_anual",
  amount: <number, EUR, anual>,
  pagas: 14,
  sourcePage: <num. de página BOE PDF, p. ej. 53620>,
  sourceExcerpt: "<recorte literal del Anexo I>",
  rowConfidence: "manual_high" | "manual_medium",
  extractionMethod: "manual_table_upload",
  requiresHumanReview: true
}
```

Universo esperado de filas (sólo cardinalidad, sin importes inventados):

| Año | Áreas | Grupos×Niveles | Conceptos | Filas estimadas (orden de magnitud) |
|---|---|---|---|---|
| 2025 | 1–6 (Área 5 nueva) | A(1) + B(2) + C(3) + D(3) + E(≥2) ≈ 11 niveles | salario_base + plus_convenio | ≈ 6 × 11 × 2 ≈ 132 |
| 2026 | 1–6 | mismo | mismo | ≈ 132 |
| 2027 | 1–6 | mismo | mismo | ≈ 132 |

Las cifras anteriores son **estimación de cardinalidad para planificar
B11.3**, no importes monetarios.

## Lo que NO se ha hecho (invariantes B11.2)

- ❌ NO se ha escrito en `erp_hr_collective_agreements_registry*`.
- ❌ NO se ha escrito en `erp_hr_collective_agreements_registry_versions`.
- ❌ NO se ha escrito en `erp_hr_collective_agreements_registry_sources`.
- ❌ NO se ha escrito en `..._salary_tables`.
- ❌ NO se ha escrito en `..._rules`.
- ❌ NO se ha invocado B7B (parser writer).
- ❌ NO se ha invocado B8A (validación humana).
- ❌ NO se ha invocado B8B (propuesta de activación).
- ❌ NO se ha invocado B9 (activación).
- ❌ NO se ha tocado `erp_hr_collective_agreements` (tabla operativa).
- ❌ NO se ha tocado `useESPayrollBridge`, `payrollEngine`,
  `payslipEngine`, `salaryNormalizer`, `agreementSalaryResolver`.
- ❌ NO se ha mutado `HR_REGISTRY_PILOT_MODE`.
- ❌ NO se ha mutado `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- ❌ NO se ha modificado `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- ❌ NO se ha tocado `ready_for_payroll` (sigue `false`).
- ❌ NO se ha bajado `requires_human_review` (sigue `true`).
- ❌ NO se ha ejecutado OCR.
- ❌ NO se ha inferido ningún importe ni concepto ausente.
- ❌ NO se ha utilizado `service_role`.

## Estado máximo permitido tras B11.2/B11.3 (recordatorio)

- `data_completeness`: `parsed_partial` (esperable) o `parsed_full`.
- `salary_tables_loaded`: `true` SOLO si existen filas válidas tras
  carga manual humana en B11.3.
- `requires_human_review`: `true` (no debe bajar).
- `ready_for_payroll`: `false` (no se toca).
- `official_submission_blocked`: `true`.

## Resultado B11.2

1. **Tablas extraídas automáticamente:** ninguna numérica. Estructura
   de áreas, grupos y niveles sí extraída como evidencia textual.
2. **Reglas extraídas automáticamente:** 14 reglas con `pdf_text` y
   `rowConfidence=high` (vigencia, pagas, jornada, vacaciones,
   antigüedad, plus convenio, preaviso, revisión 2028, periodos prueba).
3. **Pendiente carga manual:**
   - Tablas salariales Anexo I 2025/2026/2027 (todas las filas
     numéricas).
   - Anexo II nomenclaturas.
4. **Blockers:**
   - Sin OCR autorizado, los importes salariales del PDF no son
     accesibles automáticamente.
   - `human_approver` sigue PENDING (`PENDING_B8A_FORMAL_APPROVAL`).
   - `scope_piloto_confirmado=no` y `grupo_area_nivel_empleado=PENDING`.
   - `cnae_6201_coverage_confirmed=pending_human_review`.
5. **¿Pasable a B11.3 writer?** **SÍ, pero con alcance limitado**:
   B11.3 puede iniciarse SÓLO para escribir las **14 reglas** y la
   **estructura de áreas/grupos/niveles** como filas con
   `requiresHumanReview=true` y manteniendo `ready_for_payroll=false`,
   `requires_human_review=true`. Las **tablas salariales numéricas
   requieren carga manual humana antes** de cualquier escritura, por
   lo que la rama de salary_tables de B11.3 queda BLOQUEADA hasta que
   el humano aporte el upload manual.
6. **No se ha activado nómina.** No se ha tocado `ready_for_payroll`.
   No se ha tocado bridge ni payroll engines. Allow-list y flags
   intactos.

## Tests asociados

- `src/__tests__/hr/collective-agreements-b11-2-tic-nac-parse-static.test.ts`
  — guardas estáticas: doc B11.2 existe, contiene los identificadores
  reales (BOE, REGCON, IDs Registry), declara `MANUAL_TABLE_UPLOAD_REQUIRED`
  para Anexo I, no contiene SQL de escritura, no referencia bridge /
  payroll engines / tabla operativa / flags / allow-list, y la flag
  `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` permanece `false`.
