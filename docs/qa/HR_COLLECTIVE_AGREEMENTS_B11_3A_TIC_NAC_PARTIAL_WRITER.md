# B11.3A — Writer parcial TIC-NAC: reglas + fuente oficial, sin tablas salariales

> Fase **B11.3A**. Persistencia parcial en Registry de los hallazgos de
> B11.2 para `TIC-NAC`. NO escribe tablas salariales. NO activa
> `ready_for_payroll`. NO baja `requires_human_review`. NO toca
> nómina, bridge, tabla operativa, flags ni allow-list. Hash SHA-256
> real del documento BOE.

## Identidad del convenio

| Campo | Valor |
|---|---|
| `internal_code` | `TIC-NAC` |
| `agreement_id` | `1e665f80-3f04-4939-a448-4b1a2a4525e0` |
| `version_id` (current) | `9739379b-68e5-4ffd-8209-d5a1222fefc2` |
| `source_id` | `7e14af28-c27e-48bd-9a8f-c0bab81a16e8` |
| `boe_reference` | `BOE-A-2025-7766` |
| `regcon_code` | `99001355011983` |
| `publication_date` | `2025-04-16` |
| `effective_start_date` | `2025-01-01` |
| `effective_end_date` | `2027-12-31` |
| `official_boe_url` | https://www.boe.es/buscar/doc.php?id=BOE-A-2025-7766 |
| `official_pdf_url` | https://boe.es/boe/dias/2025/04/16/pdfs/BOE-A-2025-7766.pdf |

## Hash del documento oficial

`document_hash = sha256(BOE-A-2025-7766.pdf) =`

`389eaf9c9ea65a348a42cfa0667a0dfd640bb2e556beaed88ccac48ec1f9585a`

- Calculado de forma estable desde el PDF oficial publicado por el BOE
  (764 981 bytes, descarga directa).
- Persistido idénticamente en:
  - `erp_hr_collective_agreements_registry_sources.document_hash`
  - `erp_hr_collective_agreements_registry_versions.source_hash`
  - `erp_hr_collective_agreements_registry.source_document_hash`

## Filas escritas / actualizadas

### `erp_hr_collective_agreements_registry_sources` (UPDATE 1 fila)

| Campo | Antes | Después |
|---|---|---|
| `source_type` | `OTHER` | `BOE` |
| `source_url` | `null` | `https://www.boe.es/buscar/doc.php?id=BOE-A-2025-7766` |
| `document_url` | `null` | `https://boe.es/boe/dias/2025/04/16/pdfs/BOE-A-2025-7766.pdf` |
| `document_hash` | `null` | `389eaf9c…85a` |
| `downloaded_at` | `null` | `now()` |
| `status` | `pending` | `verified` |
| `source_quality` | `legacy_static` | `official` |

### `erp_hr_collective_agreements_registry_versions` (UPDATE 1 fila)

| Campo | Antes | Después |
|---|---|---|
| `source_url` | `null` | BOE oficial |
| `source_hash` | `null` | `389eaf9c…85a` |
| `publication_date` | `null` | `2025-04-16` |
| `effective_start_date` | `2024-01-01` | `2025-01-01` |
| `effective_end_date` | `2026-12-31` | `2027-12-31` |
| `change_type` | `initial_text` | `new_agreement` (único valor permitido por el `chk` que documenta enriquecimiento desde fuente oficial) |
| `parsed_summary` | `{}` | resumen B11.3A (rules=14+, salary=`MANUAL_TABLE_UPLOAD_REQUIRED`, áreas/grupos) |
| `is_current` | `true` | `true` |

> Adaptación de modelo: el constraint
> `erp_hr_carv_change_type_chk` solo admite
> `initial_text | salary_revision | correction | extension | denunciation | new_agreement`.
> El valor solicitado por la spec (`official_source_enrichment` o
> equivalente permitido) se mapea a **`new_agreement`** (valor permitido
> más cercano para registrar la nueva versión oficial XIX Convenio TIC).

### `erp_hr_collective_agreements_registry_rules` (INSERT 15 filas)

Antes: 0 reglas. Después: 15 reglas, todas con
`requires_human_review = true` y `confidence='high'` en su `rule_json`.

Mapeo a los `rule_type` permitidos por
`erp_hr_carr_rule_type_chk`:

| `rule_key` | `rule_type` | Source article |
|---|---|---|
| `vigencia_inicio` | `other` | Disp. preliminar / Art. 27 |
| `vigencia_fin` | `other` | Art. 27 |
| `efectos_economicos` | `other` | Art. 27.2 |
| `pagas_anuales` | `extra_pay` | Art. 28.1 |
| `paga_extra_julio_devengo` | `extra_pay` | Art. 28 |
| `paga_extra_diciembre_devengo` | `extra_pay` | Art. 28 |
| `jornada_anual_max_horas` | `working_time` | Art. 20.1 |
| `jornada_diaria_max_ordinaria` | `working_time` | Art. 20.1 |
| `jornada_intensiva_agosto` | `working_time` | Art. 20.2 |
| `vacaciones_dias_laborables` | `vacation` | Art. 21.1 |
| `antiguedad_estructura` | `seniority` | Art. 26 |
| `plus_convenio` | `other` | Art. 30 |
| `preaviso_dimision` | `notice` | Art. 31 |
| `clausula_revision_2028` | `other` | Art. 27.5 |
| `periodo_prueba_grupos` | `probation` | Periodo de prueba |

Total: **15 reglas** (cubre el universo de las 14 de B11.2 ampliado al
desglose de jornada). Cumple `rules count >= 14`.

### `erp_hr_collective_agreements_registry` (UPDATE 1 fila)

| Campo | Antes | Después |
|---|---|---|
| `source_quality` | `legacy_static` | `official` |
| `data_completeness` | `metadata_only` | `parsed_partial` |
| `salary_tables_loaded` | `false` | `false` (sin cambio — no se persisten importes) |
| `requires_human_review` | `true` | `true` (se mantiene) |
| `ready_for_payroll` | `false` | `false` (se mantiene; bloqueado por trigger DB) |
| `official_submission_blocked` | `true` | `true` (se mantiene) |
| `status` | `pendiente_validacion` | `pendiente_validacion` (se mantiene) |
| `publication_source` | `null` | `BOE` |
| `publication_url` | `null` | BOE oficial |
| `publication_date` | `null` | `2025-04-16` |
| `effective_start_date` | `2024-01-01` | `2025-01-01` |
| `effective_end_date` | `2026-12-31` | `2027-12-31` |
| `source_document_hash` | `null` | `389eaf9c…85a` |
| `last_verified_at` | `null` | `now()` |
| `notes` | (legacy) | append `[B11.3A …] Partial writer …` |

## Tablas salariales (Anexo I numérico)

- `erp_hr_collective_agreements_registry_salary_tables` count = `0`
  antes y después.
- `salary_tables_loaded = false`.
- Status técnico: **`MANUAL_TABLE_UPLOAD_REQUIRED`** (sin cambio respecto
  a B11.2). No se ha inferido ni inventado ningún importe.

## Invariantes de seguridad — confirmadas

| Invariante | Estado |
|---|---|
| `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` | sigue `false` |
| `HR_REGISTRY_PILOT_MODE` | sigue `false` |
| `REGISTRY_PILOT_SCOPE_ALLOWLIST` | sigue `[]` |
| `useESPayrollBridge` | NO tocado |
| `payrollEngine`, `payslipEngine`, `salaryNormalizer`, `agreementSalaryResolver` | NO tocados |
| `erp_hr_collective_agreements` (tabla operativa) | NO tocada |
| `erp_hr_collective_agreements_registry_salary_tables` | NO tocada (0 filas) |
| Trigger `enforce_ca_registry_ready_for_payroll` | activo y permisivo (todas las gates cerradas) |
| `service_role` fuera del writer/edge autorizado | no usado |
| OCR | no usado |

## Estado final esperado vs. obtenido

| Campo | Esperado | Obtenido |
|---|---|---|
| `data_completeness` | `parsed_partial` | ✅ `parsed_partial` |
| `source_quality` | `official` | ✅ `official` |
| `salary_tables_loaded` | `false` | ✅ `false` |
| `requires_human_review` | `true` | ✅ `true` |
| `ready_for_payroll` | `false` | ✅ `false` |
| `official_submission_blocked` | `true` | ✅ `true` |
| `status` | `pendiente_validacion` | ✅ `pendiente_validacion` |
| `effective_start_date` | `2025-01-01` | ✅ `2025-01-01` |
| `effective_end_date` | `2027-12-31` | ✅ `2027-12-31` |
| rules count | `>= 14` | ✅ `15` |
| document_hash | sha256 estable | ✅ `389eaf9c…85a` |
| version.source_hash == source.document_hash | sí | ✅ idénticos |

## Blockers restantes para B11.3B / B8A / B9

1. **Anexo I numérico**: requiere subida manual de tablas salariales
   `(year, area, group, level)` por humano. Sin importes oficiales,
   `salary_tables_loaded` no puede subir a `true`.
2. **Validación humana formal (B8A)**: sigue `PENDING_B8A_FORMAL_APPROVAL`.
3. **Scope piloto**: `scope_piloto_confirmado=no`,
   `grupo_area_nivel_empleado=PENDING_EMPLOYEE_SCOPE`,
   `cnae_6201_coverage_confirmed=pending_human_review`.
4. **Trigger DB**: el trigger
   `enforce_ca_registry_ready_for_payroll` impide cualquier intento de
   poner `ready_for_payroll=true` mientras no se cumplan a la vez
   `salary_tables_loaded=true`, `requires_human_review=false`,
   `source_quality='official'`, `data_completeness='human_validated'`,
   `status IN ('vigente','ultraactividad')`.

## Confirmación de no activación

- **NO** se ha ejecutado B8A, B8B ni B9.
- **NO** se ha activado nómina ni `ready_for_payroll`.
- **NO** se ha ejecutado `useESPayrollBridge` ni motor alguno de
  payroll/payslip.
- **NO** se ha tocado la tabla operativa `erp_hr_collective_agreements`.
- **NO** se ha modificado ningún flag ni la allow-list piloto.
- El convenio TIC-NAC pasa de
  `metadata_only / legacy_static / 0 rules`
  a
  `parsed_partial / official / 15 rules / salary_tables_loaded=false / requires_human_review=true / ready_for_payroll=false`.

B11.3A queda **CERRADO**. Próximas fases (B11.3B writer salarial manual,
B8A validación humana, B9 activación) requieren autorización explícita
adicional.