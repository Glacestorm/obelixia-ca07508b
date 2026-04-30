# B11.2B — TIC-NAC Salary Table Manual Upload (Anexo I)

## 1. Objetivo
Preparar la carga humana de las tablas salariales del Anexo I del XIX
Convenio Colectivo de Consultoría (BOE-A-2025-7766) sin escribir importes
definitivos en Registry y sin activar nómina.

- agreement_id: `1e665f80-3f04-4939-a448-4b1a2a4525e0`
- version_id: `9739379b-68e5-4ffd-8209-d5a1222fefc2`
- internal_code: `TIC-NAC`
- BOE: `BOE-A-2025-7766` — REGCON `99001355011983`
- document_hash: `389eaf9c9ea65a348a42cfa0667a0dfd640bb2e556beaed88ccac48ec1f9585a`

## 2. Por qué no se usan importes OCR como definitivos
Las tablas del Anexo I del PDF oficial son imágenes rasterizadas. Cualquier
OCR puede producir errores de coma decimal, de columna o de cabecera. Por
política institucional (no OCR como verdad) los importes deben ser
revisados por humano antes de cualquier escritura en Registry. El staging
OCR (helper `stageOcrRowsForHumanReview`) marca obligatoriamente cada fila
con `requires_human_review=true` y `validation_status='pending_human_check'`.

## 3. Columnas de la plantilla
Fichero: `docs/templates/TIC_NAC_salary_tables_manual_upload.csv`.
Columnas: agreement_id, version_id, year, area_code, area_name,
professional_group, level, category, salary_base_annual,
salary_base_monthly, extra_pay_amount, plus_convenio_annual,
plus_convenio_monthly, plus_transport, plus_antiguedad, currency,
source_document, source_page, source_excerpt, source_table, row_confidence,
requires_human_review, validation_status, notes.

Defaults: agreement_id/version_id fijados; currency=EUR;
source_document=BOE-A-2025-7766; requires_human_review=true;
validation_status=pending_human_check.

## 4. Reglas de validación (`validateTicNacSalaryTableRows`)
1. agreement_id == TIC-NAC. 2. version_id == versión vigente.
3. year ∈ {2025,2026,2027}. 4. professional_group no vacío.
5. area_code o area_name presente. 6. salary_base_annual o monthly presente.
7. importes positivos y finitos. 8. importes normalizados a 2 decimales (warn).
9. source_page presente. 10. source_excerpt presente.
11. requires_human_review=true. 12. validation_status ∈
{pending_human_check, human_reviewed}. 13. sin duplicados por
(year+area+group+level+category). 14. coherencia 2027≥2026≥2025 (warn,
suprimible con `notes: coherence_override`). 15. row_confidence requerido
si origin=ocr. 16. confidence baja → warning (manual) o blocker (ocr_low
sin reseña humana).

## 5. Cómo rellenar desde Anexo I
1. Abrir BOE-A-2025-7766. 2. Localizar Anexo I (tablas por Área/Grupo/Nivel).
3. Por cada celda copiar el importe **a mano** y registrar `source_page` y
un `source_excerpt` literal (≤200 chars). 4. Marcar row_confidence en
`manual_high|medium|low`. 5. No inventar importes ausentes; dejar la fila
fuera del CSV.

## 6. Cómo marcar filas dudosas
- Confianza media/baja → `row_confidence=manual_medium|manual_low` y
  detallar la duda en `notes`.
- Diferencia inter-anual sin justificación BOE → omitir o adjuntar
  `notes: coherence_override: <motivo>`.
- Categorías ambiguas (p. ej. plus convenio prorrateado) → dejar la fila
  con `validation_status=pending_human_check` hasta confirmación.

## 7. Criterios para pasar a B11.3B
1. CSV real cargado y parseado. 2. `validateTicNacSalaryTableRows` sin
blockers. 3. Filas sin warnings críticos o con override documentado.
4. Todas las filas con `source_page` y `source_excerpt`. 5. Filas dudosas
revisadas → `validation_status='human_reviewed'`. 6. Reviewer humano
identificado. 7. Decisión humana explícita: continue.

## 8. Confirmación de no escritura
- B11.2B no inserta, actualiza ni borra ninguna fila Registry/Operativa.
- No invoca edge functions ni usa credenciales privilegiadas.
- No importa módulos de payroll/payslip/normalizer/resolver/bridge.
- No modifica `ready_for_payroll`, `salary_tables_loaded`, ni flags pilot.
- Estado TIC-NAC tras B11.2B: idéntico al cierre de B11.3A.

## 9. Tests
- `src/__tests__/hr/tic-nac-salary-table-manual-upload-validator.test.ts` (16)
- `src/__tests__/hr/tic-nac-salary-table-manual-upload-static.test.ts` (6)
- Resultado: **22/22 verde**.

---

# PLAN B11.3B — Writer de tablas salariales TIC-NAC (DISEÑO, NO EJECUCIÓN)

## Precondición obligatoria (STOP si falta cualquiera)
1. CSV/Excel real rellenado desde Anexo I.
2. `validateTicNacSalaryTableRows(rows)` sin blockers.
3. Todas las filas con source_page + source_excerpt.
4. Filas dudosas revisadas por humano.
5. `validation_status='human_reviewed'` en filas aceptadas.
6. `human_reviewer` informado y trazable.
7. Decisión humana explícita: continue.

## Escrituras futuras permitidas
- `erp_hr_collective_agreements_registry_salary_tables` (insert/upsert).
- `erp_hr_collective_agreements_registry` (flags de progreso limitados).
- Eventualmente `erp_hr_collective_agreements_registry_versions`
  (`parsed_summary` actualizado), si procede.

## Reglas del writer cuando se autorice
1. Insert/upsert idempotente por (agreement_id, version_id, year, area,
   group, level, category) con `document_hash` adjunto.
2. No tocar rules salvo verificar count == 15.
3. No tocar `erp_hr_collective_agreements` (operativa).
4. No tocar nómina/bridge/resolver/normalizer.
5. No activar `ready_for_payroll`.
6. No setear `data_completeness='human_validated'`.
7. Mantener `requires_human_review=true`.
8. Solo `salary_tables_loaded=true` si hay filas válidas suficientes
   (todos los años pilotables presentes para los grupos del piloto).
9. Mantener `official_submission_blocked=true`.
10. Auditoría: registrar reviewer, hash CSV, timestamp, count.

## Estado final esperado tras B11.3B
- source_quality=official
- data_completeness=parsed_full | parsed_partial
- salary_tables_loaded=true
- requires_human_review=true
- ready_for_payroll=false

Aún pendiente: B8A (validación humana), B8B (propuesta), B9 (activación
Registry).

## Tests requeridos para B11.3B
1. salary_tables count > 0.
2. años 2025/2026/2027 presentes (al menos los del scope).
3. todas las filas con source_page/source_excerpt.
4. ninguna fila escrita con `validation_status='pending_human_check'`.
5. ninguna escritura sobre `ready_for_payroll`.
6. ninguna referencia a bridge.
7. ninguna referencia a payroll/payslip/normalizer/resolver.
8. ninguna escritura en tabla operativa.
9. flags pilot siguen false.
10. allow-list sigue [].

## Resultado del PLAN
B11.3B queda diseñado pero **NO ejecutado**. Espera CSV real revisado
humanamente y autorización explícita antes de implementar el writer.