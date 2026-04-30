# B11.2D — Primera carga staging OCR/manual TIC-NAC

## Resultado: **STOP_B11.2D — STAGING_INPUT_NOT_READY**

No se ha ejecutado ninguna escritura: ni `stage_ocr_batch`, ni
`stage_manual_batch`, ni nada en tablas reales. La razón es que **no
existe input verificable** para construir filas honestas.

## Estado verificado antes de decidir

Consultas de control (sin escritura):

```
SELECT id, salary_tables_loaded, ready_for_payroll,
       requires_human_review, data_completeness
FROM erp_hr_collective_agreements_registry
WHERE id = '1e665f80-3f04-4939-a448-4b1a2a4525e0';

--  salary_tables_loaded | f
--  ready_for_payroll    | f
--  requires_human_review| t
--  data_completeness    | parsed_partial
```

```
SELECT count(*) AS staging_rows,
       count(*) FILTER (
         WHERE validation_status NOT IN ('ocr_pending_review','manual_pending_review')
       ) AS approved_or_other
FROM erp_hr_collective_agreement_salary_table_staging
WHERE agreement_id = '1e665f80-3f04-4939-a448-4b1a2a4525e0';

--  staging_rows = 0
--  approved_or_other = 0
```

```
SELECT to_regclass('public.erp_hr_collective_agreement_salary_tables');
--  NULL  (la tabla operativa de salary_tables reales no existe / no está creada)
```

TIC-NAC sigue exactamente como lo dejó B11.3A: `parsed_partial`,
`requires_human_review=true`, sin tablas salariales cargadas y sin
`ready_for_payroll`.

## Por qué se ha parado

1. **OCR no es viable en este turno.**
   - El sandbox no tiene acceso confiable y reproducible al PDF
     `https://boe.es/boe/dias/2025/04/16/pdfs/BOE-A-2025-7766.pdf` con
     una pipeline OCR validada para tablas multipágina del Anexo I del
     TIC-NAC.
   - No hay `ocr_raw_text` real, `source_page` real ni
     `source_excerpt` real para adjuntar a cada fila.
   - Generar `row_confidence` sin OCR ejecutado sería invención.

2. **El CSV manual está vacío.**
   - `docs/templates/TIC_NAC_salary_tables_manual_upload.csv` solo
     contiene la cabecera y una fila placeholder con casi todos los
     campos en blanco (sin `professional_group`, sin
     `salary_base_annual`, sin `source_page`, sin `source_excerpt`,
     sin `concept_literal_from_agreement`).
   - El validador `ticNacSalaryTableManualUploadValidator` y las
     reglas declaradas en este propio prompt (años 2025/2026/2027,
     `source_page` y `source_excerpt` obligatorios,
     `concept_literal_from_agreement` obligatorio, `payslip_label`
     que conserve los literales) rechazarían el batch entero.

3. **No hay input de usuario.**
   - Esta vuelta no se ha adjuntado ningún PDF, Excel ni CSV con los
     importes reales del Anexo I.

4. **Reglas duras del proyecto.**
   - Core memory: *"Honesty: No dummy data in UI. Estimates must have
     '(est.)'."*
   - Prompt B11.2D: *"NO inventar importes."*
   - B11.2C.1 trigger `enforce_staging_approval_rules` exige literal
     preservation y trazabilidad — no hay literal verificado que
     preservar sin haber leído realmente el Anexo I.

   Cualquier `stage_ocr_batch` o `stage_manual_batch` con números
   inventados violaría estas tres reglas a la vez. No se hace.

## Lo que NO se ha tocado (verificado)

- `salary_tables` reales: no existen / no se han creado.
- `salary_tables_loaded` permanece `false`.
- `ready_for_payroll` permanece `false`.
- `requires_human_review` permanece `true`.
- `data_completeness` permanece `parsed_partial` (no se ha promovido
  a `human_validated`).
- Tabla operativa `erp_hr_collective_agreements`: no se ha tocado.
- Bridge `useESPayrollBridge`: no se ha tocado.
- `payrollEngine`, `payslipEngine`, `salaryNormalizer`,
  `agreementSalaryResolver`: no se han tocado.
- Flags `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
  `HR_REGISTRY_PILOT_MODE`,
  `REGISTRY_PILOT_SCOPE_ALLOWLIST`: no se han tocado.
- `service_role`: no se ha usado.
- B8A / B8B / B9: no se han ejecutado.
- B11.3B writer: sigue bloqueado.

## Cómo desbloquear B11.2D (siguiente intento)

Para que B11.2D pueda ejecutarse de verdad hace falta **una** de estas
dos vías, con datos reales del Anexo I del TIC-NAC:

### Vía A — OCR asistido

1. Adjuntar a la conversación el PDF oficial completo
   `BOE-A-2025-7766` (o sus páginas del Anexo I).
2. Confirmar que se autoriza ejecutar OCR asistido sobre esas páginas
   en este sandbox.
3. El proceso producirá un batch con:
   - `extraction_method='ocr'`,
   - `validation_status='ocr_pending_review'`,
   - `approval_mode='ocr_single_human_approval'` por defecto, o
     `'ocr_dual_human_approval'` cuando `row_confidence ∈ {low,
     medium-low}` o cuando el importe diverja entre páginas.
   - `ocr_raw_text`, `source_page`, `source_excerpt` reales.
4. Toda fila quedaría pendiente de revisión humana en la UI
   `TicNacSalaryTableReviewPanel`. **No** se aprobaría nada de forma
   automática.

### Vía B — CSV manual

1. Rellenar `docs/templates/TIC_NAC_salary_tables_manual_upload.csv`
   con los datos del Anexo I (área, grupo, nivel, categoría,
   importes, página, excerpt literal del PDF) **transcritos a mano y
   firmados por una persona responsable**.
2. Cargar el CSV vía la edge `erp-hr-agreement-staging`,
   `action='stage_manual_batch'`.
3. Cada fila quedará con:
   - `extraction_method='manual_csv'`,
   - `validation_status='manual_pending_review'`,
   - `approval_mode='manual_upload_single_approval'`,
   - `requires_human_review=true`,
   - hash inmutable, audit `action='create'`.
4. Revisión y aprobación humana en la UI staging — sin atajos.

## Cómo revisar / aprobar cuando haya filas

1. Abrir `TicNacSalaryTableReviewPanel` (montada a partir de B11.2C.3
   y endurecida en B11.2C.3A).
2. Tab **OCR** o **Manual** según el origen.
3. Para cada fila:
   - **Ver detalle** → confirmar `source_page`, `source_excerpt`,
     `ocr_raw_text` (si OCR), hashes y auditoría.
   - **Editar propuesta** si hay un error transcrito o el
     `payslip_label` no conserva los literales (transporte,
     nocturnidad, antigüedad, festivo, dieta, kilomet,
     responsabilidad, convenio).
   - **Aprobar (única)** o **Aprobar 1ª / 2ª** según el
     `approval_mode`. Marcar el checkbox de responsabilidad. Mismo
     revisor no puede firmar 1ª y 2ª en modo dual.
   - **Necesita corrección** o **Rechazar** cuando proceda.
4. Sólo después, y como decisión humana explícita, podrá lanzarse
   B11.3B writer (Registry de tablas salariales). B11.3B sigue
   bloqueado mientras no existan filas
   `human_approved_single` / `human_approved_second`.

## Confirmación de no activación

- ❌ No se ha escrito en `salary_tables` reales (la tabla ni siquiera
  existe en este momento).
- ❌ No se ha activado `ready_for_payroll`.
- ❌ No se ha puesto `salary_tables_loaded=true`.
- ❌ No se ha bajado `requires_human_review`.
- ❌ No se ha puesto `data_completeness='human_validated'`.
- ❌ No se ha tocado nómina, bridge, motores ni resolver.
- ❌ No se ha tocado la tabla operativa
  `erp_hr_collective_agreements`.
- ❌ No se han tocado flags ni allow-list.
- ❌ No se ha usado `service_role` desde frontend.
- ❌ No se ha ejecutado B8A / B8B / B9 ni el writer B11.3B.

## Test de salvaguarda añadido

`src/__tests__/hr/tic-nac-salary-table-first-staging-load.test.ts`
verifica, contra la base real:

1. No existen filas staging TIC-NAC con estado distinto de
   `ocr_pending_review` / `manual_pending_review`.
2. No hay filas TIC-NAC `human_approved_*`.
3. La tabla operativa `salary_tables` reales no se ha creado.
4. `ready_for_payroll = false` para TIC-NAC.
5. `salary_tables_loaded = false` para TIC-NAC.
6. `requires_human_review = true` para TIC-NAC.
7. `data_completeness != 'human_validated'` para TIC-NAC.

Mientras este test pase y B11.2D no se haya ejecutado de verdad,
queda como guard de regresión.