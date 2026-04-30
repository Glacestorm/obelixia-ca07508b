# B11.2C.1 — TIC-NAC Salary Table Staging (engine + persistencia)

## 1. Objetivo
Crear la base segura para revisar tablas salariales del XIX Convenio
TIC (BOE-A-2025-7766) mediante OCR asistido o carga manual, sin escribir
nada en las tablas reales de Registry ni activar nómina.

## 2. Por qué tabla staging persistente
- La aprobación dual exige persistencia entre sesiones de dos personas
  distintas.
- La auditoría exige `content_hash`, `approver`, `timestamp` inmutables.
- Permite reanudar revisión sin reprocesar OCR.
- Aísla totalmente las tablas reales (`…_registry_salary_tables`), que
  solo serán tocadas por el writer B11.3B y solo con filas aprobadas.
- La tabla operativa `erp_hr_collective_agreements` no se toca jamás.

## 3. Modos de validación
| approval_mode | entrada | tras 1ª aprobación | tras 2ª aprobación | acepta writer |
|---|---|---|---|---|
| `ocr_single_human_approval` | `ocr_pending_review` | `human_approved_single` | n/a | `human_approved_single` |
| `ocr_dual_human_approval` | `ocr_pending_review` | `human_approved_first` | `human_approved_second` (reviewer ≠ 1º) | `human_approved_second` |
| `manual_upload_single_approval` | `manual_pending_review` | `human_approved_single` | n/a | `human_approved_single` |
| `manual_upload_dual_approval` | `manual_pending_review` | `human_approved_first` | `human_approved_second` (reviewer ≠ 1º) | `human_approved_second` |

OCR directo nunca significa automático. OCR + aprobación humana siempre
queda auditada y trazable.

## 4. Modelo de datos
- `erp_hr_collective_agreement_salary_table_staging` (filas a revisar).
- `erp_hr_collective_agreement_staging_audit` (append-only, snapshot por
  acción: create / edit / approve_first / approve_second / approve_single
  / reject / needs_correction).

RLS: solo `superadmin`, `admin`, `legal_manager`, `hr_manager`,
`payroll_supervisor` pueden leer/escribir staging y auditoría. Sin
`USING(true)`. Sin DELETE policy. Audit con triggers que bloquean UPDATE
y DELETE además de no tener policies.

Trigger `enforce_staging_approval_rules` (BEFORE INSERT/UPDATE) bloquea:
1. `requires_human_review` distinto de `true`.
2. estados aprobados sin `source_page` / `source_excerpt` /
   `concept_literal_from_agreement` / `payslip_label`.
3. `human_approved_second` con `second_reviewed_by = first_reviewed_by`.
4. `human_approved_second` sin `first_reviewed_by`.
5. `extraction_method='ocr'` sin `row_confidence`.
6. literal con palabra clave (`transporte`, `nocturnidad`, `festivo`,
   `antigüedad`, `dieta`, `kilomet`, `responsabilidad`, `convenio`) y
   `payslip_label` sin esa misma palabra.

## 5. Reglas de aprobación
- El writer (B11.3B) se basa en `isApprovedForWriter(row)`:
  - Single mode → `human_approved_single`.
  - Dual mode → `human_approved_second`.
- Cualquier otro estado bloquea el writer.
- `rejected` se ignora.

## 6. Trazabilidad de conceptos en nómina
- `concept_literal_from_agreement` conserva el literal del convenio.
- `normalized_concept_key` da clave interna (`plus_transport`, etc.).
- `payroll_label` y `payslip_label` siempre referencian el literal y el
  código del convenio (`"Plus transporte — Convenio TIC-NAC"`). No se
  permiten etiquetas genéricas tipo "Complemento 1" para conceptos con
  impacto en nómina.
- DB trigger + engine validan que palabras clave del literal se conservan
  en el `payslip_label`.

## 7. Por qué nada se activa
- `ready_for_payroll` no se toca.
- `salary_tables_loaded` no se toca.
- `data_completeness` no pasa a `'human_validated'`.
- `requires_human_review` permanece `true` (constraint + trigger).
- `official_submission_blocked` permanece `true`.
- Tabla operativa `erp_hr_collective_agreements`: no tocada (test estático).
- Bridge / payroll / payslip / normalizer / resolver: no importados (test
  estático).
- Flags `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`, `HR_REGISTRY_PILOT_MODE`,
  `REGISTRY_PILOT_SCOPE_ALLOWLIST`: sin cambios.
- `service_role` no se usa en frontend ni engine.

## 8. Criterios para pasar a B11.2C.2
B11.2C.2 implementará la edge function `erp-hr-agreement-staging` y los
hooks/UI de revisión humana. Precondiciones:
1. B11.2C.1 cerrada con tests verdes.
2. Roles `superadmin / admin / legal_manager / hr_manager /
   payroll_supervisor` funcionando vía `has_role`.
3. Plantilla CSV B11.2B disponible para carga manual.
4. Decisión humana explícita: `continue`.

B11.2C.2 podrá:
- Insertar filas vía edge usando JWT del usuario.
- Cambiar `validation_status` con auditoría.
- Editar filas antes de aprobar.
- Listar/filtrar para revisión.

B11.2C.2 NO podrá:
- Activar nómina.
- Tocar tabla operativa.
- Saltar la doble aprobación cuando el modo lo exige.
- Usar `service_role`.

## 9. Tests (este build)
- `src/__tests__/hr/tic-nac-salary-table-ocr-staging.test.ts` — engine.
- `src/__tests__/hr/tic-nac-salary-table-staging-schema.test.ts` —
  contrato schema/RLS/triggers.
- `src/__tests__/hr/tic-nac-salary-table-ocr-staging-static.test.ts` —
  guards estáticos engine + migración.