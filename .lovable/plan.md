

# Análisis: Funcionalidad exclusiva en los 13 archivos standalone

## Hallazgo crítico

La búsqueda de componentes clave (`SymbolicValuesCard`, `SupervisionLinesCard`, `validateIBAN`, `Modelo 111/190`, `REJECTION_FEEDBACK`, `DEMO_PREDICTIONS`) en `src/components/erp/hr/` devolvió **0 resultados**. Esto significa que **SÍ hay funcionalidad exclusiva** que no existe en el cockpit ERP unificado.

---

## Inventario por archivo: qué hace, qué es exclusivo

| # | Archivo | Funcionalidad principal | ¿Exclusivo? | Valor |
|---|---------|------------------------|-------------|-------|
| 1 | `HRHubPage.tsx` | Hub de tarjetas con navegación visual a 13 módulos | No — reemplazado por `HRCockpitHeader` + mega-menu | Bajo |
| 2 | `HRAuditPage.tsx` | Wrapper de `HRAuditDashboard` + `HRComplianceKPIsDashboard` + `ExternalAuditorExportDialog` | No — los 3 componentes ya se importan desde el ERP | Bajo |
| 3 | `HRITDashboardPage.tsx` | Wrapper de `HRITProcessPanel` | No — componente ya disponible en ERP | Bajo |
| 4 | `HRGarnishmentsPage.tsx` | Wrapper de `HRGarnishmentPanel` | No — pero el `GarnishmentSimulator` (Art. 607 LEC) NO se usa aquí ni en ERP | Medio |
| 5 | `HRContractsPage.tsx` | Wrapper de `HRContractsAdvancedPanel` + `HRLaborObservationsPanel` | No — ambos disponibles en ERP | Bajo |
| 6 | `HRMultiEmploymentPage.tsx` | `HRMultiEmploymentPanel` + `BaseDistributionPanel` + `SolidaritySimulator` | Parcial — los 3 componentes existen pero su composición combinada es única | Medio |
| 7 | **`HRPayrollPage.tsx`** | `PayrollSimulatorPanel` + `HRCustomConceptsPanel` + **`SymbolicValuesCard`** (260 líneas, editor inline de valores simbólicos por empleado con CRUD real a `erp_hr_employee_symbolic_data`) | **SÍ — `SymbolicValuesCard` es exclusivo** | **Alto** |
| 8 | `HRFilingsPage.tsx` | `HRFileGeneratorPanel` + `HRFilingsPanel` con `refreshKey` para recarga automática tras generación | No — lógica simple de estado | Bajo |
| 9 | **`HRIRPFPage.tsx`** | Motor IRPF completo: resumen retenciones por empleado, **Modelo 111** (declaración trimestral), **Modelo 190** (resumen anual), **Certificados de retenciones** (generación PDF individual) | **SÍ — 4 tabs exclusivas con lógica fiscal** | **Alto** |
| 10 | **`HRBankAccountsPage.tsx`** | Gestión Multi-IBAN: **validación IBAN** (regex española), **formateo IBAN**, CRUD real a `hr_employee_bank_accounts`, KPIs (total/principales/activas), dialog de creación con SWIFT/BIC | **SÍ — CRUD completo exclusivo** | **Alto** |
| 11 | **`HRGovernancePage.tsx`** | 505 líneas: **4 tabs** (Agentes, Observabilidad, Escalaciones, Gobernanza), **`SupervisionLinesCard`** (tabla filtrable de líneas de supervisión), clasificación riesgo EU AI Act, políticas de supervisión HITL, latencia por operación | **SÍ — UI de gobernanza completa** | **Alto** |
| 12 | **`HRPredictivePage.tsx`** | 440 líneas: **5 tabs** (Predicciones IA, Validación cruzada, **Feedback rechazos TGSS/AEAT**, Simulador de escenarios, **Portal auditor externo**), predicción duración IT por CIE-10, integración con `useHRPredictiveAI` y `crossValidationEngine` | **SÍ — capa premium completa** | **Alto** |
| 13 | `HRBridgePage.tsx` | Wrapper de `HRBridgeDashboard` | No — componente disponible en ERP | Bajo |

---

## Resumen de funcionalidad exclusiva NO presente en ERP

| Funcionalidad exclusiva | Archivo origen | Líneas | Impacto si se pierde |
|---|---|---|---|
| `SymbolicValuesCard` — Editor CRUD de valores simbólicos por empleado | `HRPayrollPage.tsx` | ~230 líneas | **Crítico** — Es la única UI para gestionar `erp_hr_employee_symbolic_data` |
| Motor IRPF — Modelo 111, Modelo 190, Certificados | `HRIRPFPage.tsx` | ~300 líneas | **Crítico** — Obligaciones fiscales trimestrales/anuales |
| Gestión Multi-IBAN — Validación, CRUD, SWIFT/BIC | `HRBankAccountsPage.tsx` | ~285 líneas | **Crítico** — Sin esta UI no se pueden gestionar cuentas bancarias |
| Gobernanza IA — 4 tabs, SupervisionLinesCard, EU AI Act | `HRGovernancePage.tsx` | ~505 líneas | **Alto** — Observabilidad y compliance IA |
| Auditoría Predictiva — 5 tabs, feedback rechazos, portal auditor | `HRPredictivePage.tsx` | ~440 líneas | **Alto** — Capa premium diferenciadora |

**Total: ~1.760 líneas de funcionalidad exclusiva que NO se debe perder.**

---

## Recomendación: Absorber, no eliminar

Estos 5 archivos contienen funcionalidad de alto valor que **debe ser absorbida como paneles lazy en el HRModule** antes de eliminar los archivos standalone. Propongo un plan por fases:

### Fase 1 — Extraer componentes exclusivos a `src/components/erp/hr/`
- `SymbolicValuesCard` → `src/components/erp/hr/payroll-engine/SymbolicValuesPanel.tsx`
- Motor IRPF (4 tabs) → `src/components/erp/hr/payroll-engine/IRPFMotorPanel.tsx`
- Multi-IBAN CRUD → `src/components/erp/hr/domains/people/BankAccountsPanel.tsx`
- Gobernanza IA (4 tabs) → `src/components/erp/hr/domains/ai-tower/GovernanceCockpit.tsx`
- Auditoría Predictiva (5 tabs) → `src/components/erp/hr/domains/analytics/PredictiveAuditPanel.tsx`

### Fase 2 — Registrar como paneles lazy en `HRModuleLazy.tsx`
- 5 nuevos `React.lazy()` imports
- 5 nuevas entradas en el mega-menu de `HRNavigationMenu.tsx`

### Fase 3 — Verificar integración con `ERPContext`
- Asegurar que `companyId` se propaga correctamente
- Aplicar `extractErrorMessage()` donde corresponda
- Envolver en `ERPModuleErrorBoundary`

### Fase 4 — Eliminar los 13 archivos standalone
- Solo después de verificar que toda la funcionalidad es accesible desde el cockpit ERP

**Archivos a crear:** 5 componentes nuevos en `src/components/erp/hr/`
**Archivos a modificar:** `HRModuleLazy.tsx`, `HRNavigationMenu.tsx`
**Archivos a eliminar:** 13 páginas en `src/pages/admin/hr/`
**Backend:** 0 cambios

