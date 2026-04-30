# B11.2C.3 — UI revisión humana OCR/manual TIC-NAC

## Objetivo
Crear la UI de revisión humana sobre las filas de staging de tablas
salariales TIC-NAC. **No** escribe en tablas reales, **no** activa nómina,
**no** modifica flags ni allow-list. Toda acción pasa por la edge
`erp-hr-agreement-staging` mediante los hooks `useTicNacSalaryTableStaging`
(read) y `useTicNacSalaryTableStagingActions` (write).

## Componentes creados
`src/components/erp/hr/collective-agreements/staging/`

- `TicNacSalaryTableReviewPanel.tsx` — panel principal (banner + contadores + tabs).
- `StagingApprovalModeSelector.tsx`
- `StagingRowsTable.tsx` — tabla principal con acciones.
- `OcrRowsTable.tsx` / `ManualRowsTable.tsx` — vistas filtradas.
- `OcrVsManualComparator.tsx` — comparador read-only por clave lógica.
- `StagingRowDetailDrawer.tsx` — detalle (fuente, OCR raw, hashes, auditoría).
- `StagingRowEditForm.tsx` — corrección de propuesta.
- `StagingApprovalDialog.tsx` — confirmación con responsabilidad obligatoria.
- `StagingReasonDialog.tsx` — motivo para reject / needs_correction.
- `StagingAuditTrail.tsx` — listado append-only.
- `StagingStatusBadge.tsx` / `StagingBlockersWarningsPanel.tsx`
- `stagingLiteralGuard.ts` — helper puro de literal preservation (espejo
  visual de la regla del trigger `enforce_staging_approval_rules`).

## Cómo revisar OCR
1. Abrir tab **OCR**. Cada fila muestra confianza, fuente y modo de aprobación.
2. Acción **Ver detalle** → expone `source_page`, `source_excerpt`,
   `ocr_raw_text`, hashes y auditoría de la fila.
3. Si el `payslip_label` no conserva la palabra del literal del convenio
   (transporte, nocturnidad, festivo, antigüedad, dieta, kilomet,
   responsabilidad, convenio), aparece un blocker visible. La aprobación
   queda bloqueada en servidor hasta corregirlo.
4. **Editar propuesta** → permite ajustar literal/etiquetas/importes y
   guardar vía `editRow` (sin tocar reviewers ni hashes server-side).
5. Aprobar / rechazar / marcar para corrección abre el diálogo
   correspondiente.

## Cómo revisar manual
1. Tab **Manual** lista filas `manual_csv` y `manual_form`.
2. Mismo flujo de revisión que OCR.

## Modos single / dual
- **single**: una única acción **Aprobar (única)**.
- **dual**: **Aprobar 1ª** disponible cuando la fila está pending;
  **Aprobar 2ª** disponible cuando está `human_approved_first`.
- Si el usuario actual coincide con `first_reviewed_by` y se intenta
  `approve_second`, la UI muestra `staging-same-reviewer-blocked` y
  desactiva el botón de confirmar (el servidor también lo rechaza).

## Responsabilidad del aprobador
Antes de aprobar, el diálogo muestra el texto literal:

> «Al aprobar esta fila confirmo que he revisado el dato contra la fuente
> oficial y asumo la responsabilidad de su uso posterior en el flujo de
> convenio.»

y exige marcar el checkbox «Confirmo mi responsabilidad sobre esta
revisión». Sin checkbox, **Confirmar aprobación** queda deshabilitado.

## Por qué no activa nómina
- La UI nunca llama a `payrollEngine`, `payslipEngine`, `salaryNormalizer`,
  `agreementSalaryResolver`, ni a `useESPayrollBridge`.
- No referencia la tabla operativa `erp_hr_collective_agreements` (sólo
  variantes `_registry`).
- No contiene CTAs prohibidos: «Usar en nómina», «Activar convenio»,
  «Activar nómina», «Aplicar payroll», «Marcar listo para nómina»,
  «Saltar revisión», `ready_for_payroll`.
- No envía a la edge ningún campo `ready_for_payroll`,
  `salary_tables_loaded=true` ni `data_completeness='human_validated'`.
- No muta `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
  `HR_REGISTRY_PILOT_MODE`, ni `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- No usa `service_role` ni `SUPABASE_SERVICE_ROLE_KEY` y no llama a
  `.from(...).insert/update/delete/upsert`.

## Cómo se preservan los literales
`checkPayslipLabelPreservesLiteral` valida en cliente que toda palabra
sensible del literal del convenio aparezca también en `payslip_label`. La
misma regla está enforced en el trigger `enforce_staging_approval_rules`
(B11.2C.1). Esto garantiza que conceptos como «Plus transporte» o
«Nocturnidad» **no se ocultan ni renombran** en el flujo posterior.

## Cómo pasar después a B11.3B
B11.3B (writer Registry de tablas salariales) sólo podrá ejecutarse cuando:
1. Existan filas TIC-NAC con `validation_status` ∈
   {`human_approved_single`, `human_approved_second`}.
2. El conjunto cubra los años / áreas / grupos / niveles requeridos.
3. Una decisión humana explícita lo lance — esta UI **no** dispara B11.3B.

## Qué sigue bloqueado
- `salary_tables_loaded` permanece `false`.
- `ready_for_payroll` permanece `false`.
- `requires_human_review` permanece `true`.
- B8A / B8B / B9 siguen sin ejecutarse para TIC-NAC.
- El bridge y el motor de nómina no reciben datos del Registry de TIC-NAC.

## Tests
- `src/__tests__/hr/tic-nac-salary-table-review-panel-static.test.ts`
  (verde — guards estructurales del folder `staging/`).
- `src/__tests__/hr/tic-nac-salary-table-review-panel.test.tsx`
  (cobertura de banner, auth, tabs, tablas, blocker literal, diálogo de
  responsabilidad, mismo-revisor bloqueado y ausencia de CTAs prohibidos).

> Nota: las acciones por fila exponen `data-testid` estables
> (`staging-action-view-…`, `staging-action-approve-first-…`, etc.) tanto
> para QA como para tests deterministas, evitando depender del portal de
> Radix DropdownMenu en jsdom.

## Integración menú
Pendiente de añadir entrada técnica «TIC-NAC Staging» bajo Centro de
Convenios → Registro Maestro como vista review-only. No sustituye ninguna
pantalla existente.

## FIX B11.2C.3A — acciones testeables y accesibles

### Motivo
La versión inicial de `StagingRowsTable` exponía las acciones por fila a
través de un `DropdownMenu` de Radix. En jsdom (vitest) la combinación
Radix + floating-ui + Portal no monta los `menuitem` de forma
determinista, lo que dejaba 5/12 tests en rojo aunque el componente
funcionara en navegador. Esos tests cubrían justamente las rutas
sensibles: detalle, aprobaciones (single / 1ª / 2ª), bloqueo de literal
`payslip_label` y bloqueo de mismo revisor.

### Cambio
- Nuevo componente
  `src/components/erp/hr/collective-agreements/staging/StagingRowActions.tsx`
  que renderiza las acciones como **botones explícitos** con
  `role="menuitem"` y `data-testid` estables:
  - `staging-action-detail-{rowId}`
  - `staging-action-edit-{rowId}`
  - `staging-action-approve-single-{rowId}`
  - `staging-action-approve-first-{rowId}`
  - `staging-action-approve-second-{rowId}`
  - `staging-action-needs-correction-{rowId}`
  - `staging-action-reject-{rowId}`
- `StagingRowsTable.tsx` ya **no importa** `DropdownMenu*` ni
  `MoreHorizontal`; delega 100 % de las acciones a `StagingRowActions`.
- Se mantiene `data-testid="staging-row-actions-{rowId}"` como wrapper
  estable (ahora un `<div role="group">`) para no romper QA externo.

### Reglas de disponibilidad (sin cambios de negocio)
- `approve_single` visible solo en modo `*single*` y estado pendiente
  (`ocr_pending_review`, `manual_pending_review`, `needs_correction`).
- `approve_first` visible solo en modo `*dual*` y estado pendiente.
- `approve_second` visible solo en modo `*dual*` y estado
  `human_approved_first`.
- `reject` y `needs_correction` visibles si la fila no está rechazada ni
  aprobada-final.
- `edit` visible si la fila no está rechazada ni aprobada-final.
- `view` siempre visible (acción no destructiva).

Las reglas de aprobación reales (mismo revisor, literal preservado,
responsabilidad obligatoria, dual approval) se siguen enforzando en el
diálogo (`StagingApprovalDialog`) y en el trigger
`enforce_staging_approval_rules` (B11.2C.1). La UI no puede saltarse
ninguna porque toda escritura sigue pasando por
`erp-hr-agreement-staging` mediante hooks.

### Garantías que se mantienen
- No se escribe en `salary_tables` reales.
- No se activa `ready_for_payroll`.
- No se sube `salary_tables_loaded` a `true`.
- No se baja `requires_human_review`.
- No se establece `data_completeness='human_validated'`.
- No se ejecutan B8A / B8B / B9.
- No se ejecuta el writer B11.3B (sigue bloqueado hasta que existan
  filas aprobadas).
- Sin imports de `useESPayrollBridge`, `payrollEngine`, `payslipEngine`,
  `salaryNormalizer`, `agreementSalaryResolver`.
- Sin referencias a la tabla operativa `erp_hr_collective_agreements`.
- Sin mutaciones de flags
  (`HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
  `HR_REGISTRY_PILOT_MODE`, `REGISTRY_PILOT_SCOPE_ALLOWLIST`).
- Sin `service_role` ni `.from(...).insert/update/delete/upsert`.
- `verify_jwt` de la edge sigue en `true`.

### Resultado de tests tras el fix
- `tic-nac-salary-table-review-panel.test.tsx` → **12/12 verde**.
- `tic-nac-salary-table-review-panel-static.test.ts` → **9/9 verde**
  (incluye comprobación de que `staging/` no importa payroll, no usa
  service-role, no llama `.insert/.update/.delete/.upsert` y no expone
  CTAs prohibidas como «Usar en nómina» o «Activar convenio»).
- `tic-nac-salary-table-staging-edge-static.test.ts` → **15/15 verde**.
- `tic-nac-salary-table-staging-hooks-static.test.ts` → **8/8 verde**.
- `tic-nac-salary-table-staging-actions.test.ts` → **5/5 verde**.
- `tic-nac-salary-table-ocr-staging.test.ts` → **24/24 verde**.
- `tic-nac-salary-table-ocr-staging-static.test.ts` → **7/7 verde**.