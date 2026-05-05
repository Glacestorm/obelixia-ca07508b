# HR — B13.5C — Agreement Impact UI

## 1. Objetivo
UI read-only sobre la capa B13.5B (`useAgreementImpactPreviews` + edge `erp-hr-agreement-impact-engine`) para visualizar el impacto económico previsto de un convenio curado sobre empresas/empleados/contratos. **No aplica nómina, no crea mapping, no crea runtime, no activa convenios.**

## 2. Componentes creados (`src/components/erp/hr/collective-agreements/curated/impact/`)
- `AgreementImpactDashboardPanel.tsx` — panel principal.
- `AgreementImpactNoApplyBanner.tsx` — banner permanente "no aplica nómina".
- `AgreementImpactSummaryCards.tsx` — KPIs agregados.
- `AgreementImpactScopeList.tsx` — tabla de affected scopes.
- `AgreementImpactPreviewTable.tsx` — tabla de previews.
- `AgreementImpactRiskBadge.tsx` — badge de riesgo low/medium/high.
- `AgreementImpactRiskFlagsPanel.tsx` — render de risk_flags / blockers / warnings.
- `AgreementImpactEmployeeDetailDrawer.tsx` — detalle read-only por preview.
- `AgreementImpactComputeDialog.tsx` — diálogo de cálculo (compute_scope / compute_impact_preview).
- `AgreementImpactExportPanel.tsx` — export CSV in-memory (sin DB writes).

## 3. Acciones permitidas
Todas vía `useAgreementImpactPreviews`:
- `refreshScopes(filters)` → `list_scopes`.
- `refreshPreviews(filters)` → `list_previews`.
- `computeScope(...)` → `compute_scope`.
- `computeImpactPreview(...)` → `compute_impact_preview`.
- `markPreviewStale(...)` → `mark_preview_stale`.
- Export CSV in-memory de previews.

## 4. CTAs prohibidos (verificados por static test)
Aplicar nómina, Activar convenio, Activar para nómina, Crear mapping/runtime automático, Generar CRA/SILTRA/SEPA/asiento contable, Marcar listo para nómina, Usar en nómina, Saltar validación, ready_for_payroll, salary_tables_loaded=true, data_completeness='human_validated'.

## 5. Cómo se calcula la preview
`AgreementImpactComputeDialog` recoge `agreement_id`, `version_id`, `company_id`, opcional `employee_id`/`contract_id`, `target_year`, `as_of_date`, ventana `arrears_from/to`, `employer_cost_multiplier`, `require_runtime_setting`. Si hay `employee_id`/`contract_id` → `computeImpactPreview`; si no → `computeScope`. Aviso obligatorio: "Este cálculo no modifica nóminas ni empleados. Solo genera preview de impacto."

## 6. Visualización
- **Deltas** mensuales y anuales (€) en tabla y detalle.
- **Atrasos** estimados en tabla y detalle.
- **Coste empresa** Δ (multiplicador) en tabla y detalle.
- **Risk flags / blockers / warnings**: chips en `AgreementImpactRiskFlagsPanel`.
- **Drawer detalle**: muestra company/employee/contract IDs, salarios actual/objetivo (mensual y anual), Δ, atrasos, coste, banderas y aviso "previsualización".

## 7. Qué NO hace
- No escribe en `salary_tables`.
- No toca `payrollEngine`, `payslipEngine`, `useESPayrollBridge`, `salaryNormalizer`, `agreementSalaryResolver`, `agreementSafetyGate`.
- No toca tabla operativa legacy `erp_hr_collective_agreements`.
- No muta `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`, `HR_REGISTRY_PILOT_MODE`, `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- No usa `service_role`. No desactiva `verify_jwt`.
- No genera CRA/SILTRA/SEPA/asiento contable.
- No crea mapping/runtime ni activa convenios.

## 8. Relación con B13.6
B13.6 conectará la UI a la shell del Centro de Convenios Curados como pestaña "Impacto económico". B13.5C deja el panel como componente exportado independiente y testeado.

## 9. Tests ejecutados
- `src/__tests__/hr/agreement-impact-dashboard-panel.test.tsx` — **9/9 ✅** (banner, auth-required, KPIs, scopes/previews, dialog notice, compute_scope vs compute_impact_preview, drawer deltas/warnings, mark_preview_stale, no forbidden CTAs).
- `src/__tests__/hr/agreement-impact-dashboard-static.test.ts` — **30/30 ✅** (forbidden imports/CTAs/writes/flags + banner/hook presence).
- `src/__tests__/hr/agreement-impact-previews-hook-static.test.ts` — **6/6 ✅** (regresión).
- `src/__tests__/hr/agreement-impact-engine-edge-static.test.ts` — **11/11 ✅** (regresión).
- `src/__tests__/hr/agreement-impact-preview-schema.test.ts` — **OK** (regresión).
- `src/tests/hr/agreement-impact-engine.test.ts` — **36/36 ✅** (regresión B13.5A).
- `src/tests/hr/agreement-impact-engine-static.test.ts` — **16/16 ✅** (regresión B13.5A).
- `src/__tests__/engines/payrollEngineBackendMirror.test.ts` — **4/4 ✅**.
- `src/__tests__/engines/ssContributionSharedCore.test.ts` — **11/11 ✅**.

## 10. Confirmación de no activación
- ❌ payrollEngine / payslipEngine / bridge tocados.
- ❌ salaryNormalizer / agreementSalaryResolver / agreementSafetyGate tocados.
- ❌ tabla operativa legacy tocada.
- ❌ ready_for_payroll, salary_tables_loaded=true, data_completeness='human_validated'.
- ❌ HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL / HR_REGISTRY_PILOT_MODE / REGISTRY_PILOT_SCOPE_ALLOWLIST mutados.
- ❌ mapping/runtime creados; ❌ nómina aplicada; ❌ CRA/SILTRA/SEPA/accounting generados.
- ⏸ B13.6 no ejecutado.