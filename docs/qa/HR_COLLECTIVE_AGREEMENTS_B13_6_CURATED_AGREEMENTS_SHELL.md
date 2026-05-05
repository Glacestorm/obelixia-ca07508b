# B13.6 — Convenios Curados (shell unificado)

## 1. Objetivo

Crear el shell visual central de "Convenios Curados" dentro de RRHH → Oficial & Compliance, conectando las piezas B13 ya construidas y añadiendo un tab final de "Aplicación controlada" que **solo enruta** hacia los flujos B10C/B10D existentes.

B13.6 es **read + routing**. No aplica nómina, no crea mapping, no crea runtime, no activa convenios, no toca bridge ni flags.

## 2. Componentes creados

Carpeta: `src/components/erp/hr/collective-agreements/curated/shell/`

- `CuratedAgreementsPanel.tsx` — entry-point del shell.
- `CuratedAgreementsHeader.tsx` — título + banner permanente.
- `CuratedAgreementsNoAutoApplyBanner.tsx` — banner no-auto-apply.
- `CuratedAgreementsStatusOverview.tsx` — KPIs read-only (N/D si no hay datos).
- `CuratedAgreementsPipelineTabs.tsx` — 6 tabs.
- `CuratedAgreementsControlledApplyPanel.tsx` — flujo seguro y botones de navegación.
- `CuratedAgreementNavigationContext.tsx` — provider de filtros visuales (read-only).

## 3. Tabs del shell

1. **Fuentes detectadas** — placeholder seguro (B13.1 Source Watcher disponible vía hook/edge).
2. **Documentos pendientes** — embebe `AgreementDocumentIntakePanel` (B13.2).
3. **Extracción** — placeholder seguro (B13.3A disponible vía hook/edge).
4. **Revisión humana** — placeholder + nota: workbench reutilizable; generalización multi-convenio diferida a B13.7.
5. **Impacto económico** — embebe `AgreementImpactDashboardPanel` (B13.5C).
6. **Aplicación controlada** — `CuratedAgreementsControlledApplyPanel`.

## 4. Integración menú

- `HRModuleLazy.tsx`: nuevo export `LazyCuratedAgreementsPanel`.
- `HRModule.tsx`: nuevo branch `activeModule === 'curated-agreements'`.
- `HRNavigationMenu.tsx`: nueva entrada `id: 'curated-agreements'` ("Convenios Curados") en RRHH → Global → Oficial & Compliance.

No se elimina ni sustituye ninguna entrada previa: `agreement-hub`, `collective-agreements`, `registry-master`, `registry-validation`, `registry-mapping`, `registry-runtime-apply`, `registry-pilot-discovery`, `registry-pilot-monitor` siguen intactos.

## 5. Acciones permitidas

- "Abrir Mapping empresa/contrato" → `setActiveModule('registry-mapping')`.
- "Abrir Runtime Apply" → `setActiveModule('registry-runtime-apply')`.
- "Abrir Monitor piloto" → `setActiveModule('registry-pilot-monitor')`.
- "Abrir Centro de Convenios" → `setActiveModule('agreement-hub')`.
- "Ver guía de rollback" → no-op de routing (futuro: doc).

Todas estas acciones **solo cambian de tab/activeModule**. Ningún botón llama a edge functions de escritura.

## 6. Acciones prohibidas

No existe en el shell ningún CTA para:

- Aplicar/Ejecutar/Usar en nómina, Activar convenio, Activar para nómina.
- Crear mapping automático, Crear runtime automático.
- Aplicar payroll, Cambiar/Activar flag.
- Generar CRA / SILTRA / SEPA / asiento contable.
- `ready_for_payroll`, "Marcar listo para nómina", "Saltar validación".

Verificado por `curated-agreements-shell-static.test.ts` (lista controlada de regex).

## 7. Flujo completo

1. **Watcher (B13.1)** detecta fuentes oficiales → cola pendiente.
2. **Intake (B13.2)** triage humano de documentos detectados/manuales.
3. **Extraction (B13.3A)** corre extracción y publica findings.
4. **Review (B11.2C / B13.4)** revisión humana del staging salarial / candidate gate.
5. **Impact (B13.5A/B/C)** previews económicos read-only por empresa/empleado.
6. **Aplicación controlada (B13.6)** enruta a Mapping (B10C) → Runtime Apply (B10D) → Pilot/flags (B10E/B10F). El uso real en nómina sigue bloqueado por flags y allow-list.

## 8. Conexión con B10C/B10D sin auto-apply

El tab "Aplicación controlada" describe explícitamente los pasos y solo proporciona botones de navegación. No hay invocaciones a `supabase.functions.invoke` desde el panel. Mapping y Runtime apply siguen siendo responsabilidad exclusiva de los paneles existentes con su propia validación humana.

## 9. Qué NO hace

- No toca `payrollEngine`, `payslipEngine`, `useESPayrollBridge`.
- No toca `salaryNormalizer`, `agreementSalaryResolver`, `agreementSafetyGate`.
- No toca tabla operativa legacy `erp_hr_collective_agreements`.
- No activa `ready_for_payroll`, no pone `salary_tables_loaded=true`, no pone `data_completeness='human_validated'`.
- No muta `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`, `HR_REGISTRY_PILOT_MODE`, ni `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- No crea mapping ni runtime automáticamente.
- No genera CRA/SILTRA/SEPA/asiento contable.
- No usa `service_role` ni desactiva `verify_jwt`.

## 10. Tests ejecutados

- `src/__tests__/hr/curated-agreements-shell.test.tsx` — 7/7 ✅
- `src/__tests__/hr/curated-agreements-shell-static.test.ts` — 35/35 ✅
- `src/__tests__/hr/curated-agreements-shell-wiring.test.ts` — 4/4 ✅
- `src/__tests__/hr/registry-ui-wiring.test.ts` — 5/5 ✅ (regresión)
- `src/__tests__/hr/agreement-impact-dashboard-panel.test.tsx` — 9/9 ✅
- `src/__tests__/hr/agreement-impact-dashboard-static.test.ts` — incluido ✅
- `src/__tests__/hr/agreement-impact-preview-schema.test.ts` — 13/13 ✅
- `src/__tests__/hr/agreement-impact-engine-edge-static.test.ts` — ✅
- `src/__tests__/hr/agreement-impact-previews-hook-static.test.ts` — 6/6 ✅
- `src/tests/hr/agreement-impact-engine.test.ts` — 36/36 ✅
- `src/tests/hr/agreement-impact-engine-static.test.ts` — 16/16 ✅
- `src/__tests__/engines/payrollEngineBackendMirror.test.ts` — 4/4 ✅
- `src/__tests__/engines/ssContributionSharedCore.test.ts` — 11/11 ✅

Total foco B13.6 + regresión inmediata: **137/137 verde**.

## 11. Confirmación de no activación

- ❌ payrollEngine — no tocado.
- ❌ payslipEngine — no tocado.
- ❌ bridge — no tocado.
- ❌ salaryNormalizer / agreementSalaryResolver / agreementSafetyGate — no tocados.
- ❌ tabla operativa legacy `erp_hr_collective_agreements` — no tocada.
- ❌ `ready_for_payroll` — no escrito.
- ❌ `salary_tables_loaded=true` — no escrito.
- ❌ `data_completeness='human_validated'` — no escrito.
- ❌ flags `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` / `HR_REGISTRY_PILOT_MODE` — no mutadas.
- ❌ `REGISTRY_PILOT_SCOPE_ALLOWLIST` — no mutada.
- ❌ mapping/runtime automático — no creado.
- ❌ nómina aplicada — no.
- ❌ CRA/SILTRA/SEPA/asiento contable — no generados.

## 12. Criterios para B13.7

- Generalizar Workbench de revisión humana multi-convenio (hoy específico TIC-NAC).
- UI dedicada para Source Watcher y Extraction Runner.
- Status Overview con datos reales: contadores cableados a hooks B13.1/B13.2/B13.3/B11.2C/B13.5B.
- Filtros visuales `agreement_id` / `version_id` / `company_id` aplicados a sub-paneles vía `CuratedAgreementNavigationContext`.
- Documento de rollback enlazable desde el botón "Ver guía de rollback".

B13.7 **no** ejecutado en este build.