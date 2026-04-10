# S8.5 — Verificación de Absorción HR Cockpit

## Fecha: 2026-04-10

## Resumen
5 componentes exclusivos (~1.760 líneas) absorbidos desde `src/pages/admin/hr/` al cockpit ERP unificado.

## Tabla de Mapeo Completa

| # | Standalone | Funcionalidad | Panel ERP | Ruta mega-menu | Estado |
|---|-----------|---------------|-----------|----------------|--------|
| 1 | `HRHubPage` | Hub tarjetas | `HRCockpitHeader` + mega-menu | `dashboard` | ✅ Reemplazado |
| 2 | `HRAuditPage` | ISO Audits | `LazyHRComplianceEvidencePanel` | `compliance-evidence` | ✅ OK |
| 3 | `HRITDashboardPage` | IT/Bajas | `LazyHRLeaveIncidentsPanel` | `leave-incidents` | ✅ OK |
| 4 | `HRGarnishmentsPage` | Embargos | `LazyHRSettlementsPanel` | `settlements` | ✅ OK |
| 5 | `HRContractsPage` | Contratos | `LazyHRContractsPanel` | `contracts` | ✅ OK |
| 6 | `HRMultiEmploymentPage` | Pluriempleo | `LazyESLocalizationPlugin` | `es-localization` | ✅ OK |
| 7 | **`HRPayrollPage`** | **SymbolicValuesCard** | `LazySymbolicValuesPanel` | `symbolic-values` | ✅ **Absorbido** |
| 8 | `HRFilingsPage` | Ficheros oficiales | `LazyOfficialIntegrationsHub` | `official-submissions` | ✅ OK |
| 9 | **`HRIRPFPage`** | **Motor IRPF 4 tabs** | `LazyIRPFMotorPanel` | `irpf-motor` | ✅ **Absorbido** |
| 10 | **`HRBankAccountsPage`** | **Multi-IBAN CRUD** | `LazyBankAccountsPanel` | `bank-accounts` | ✅ **Absorbido** |
| 11 | **`HRGovernancePage`** | **Gobernanza IA 4 tabs** | `LazyGovernanceCockpit` | `governance-cockpit` | ✅ **Absorbido** |
| 12 | **`HRPredictivePage`** | **Audit Predictiva 5 tabs** | `LazyPredictiveAuditPanel` | `predictive-audit` | ✅ **Absorbido** |
| 13 | `HRBridgePage` | Bridge contable | `LazyHRIntegrationDashboard` | `integration` | ✅ OK |

## Componentes Creados (S8.5)

| Componente | Ubicación | Líneas | Mega-menu |
|-----------|-----------|--------|-----------|
| `SymbolicValuesPanel` | `payroll-engine/SymbolicValuesPanel.tsx` | ~220 | Payroll > Nómina Mensual |
| `IRPFMotorPanel` | `payroll-engine/IRPFMotorPanel.tsx` | ~170 | Payroll > Nómina Mensual |
| `BankAccountsPanel` | `domains/people/BankAccountsPanel.tsx` | ~170 | People > Directorio |
| `GovernanceCockpit` | `domains/ai-tower/GovernanceCockpit.tsx` | ~220 | Enterprise > Tecnología & IA |
| `PredictiveAuditPanel` | `domains/analytics/PredictiveAuditPanel.tsx` | ~220 | Enterprise > Tecnología & IA |

## Archivos Modificados

- `HRModuleLazy.tsx` — 5 nuevos lazy imports
- `HRModule.tsx` — 5 nuevas rutas de módulo
- `HRNavigationMenu.tsx` — 5 nuevas entradas en mega-menu + CreditCard icon
- `payroll-engine/index.ts` — exports añadidos
- `domains/people/index.ts` — export añadido
- `domains/ai-tower/index.ts` — export añadido
- `domains/analytics/index.ts` — export añadido

## Código Muerto Pendiente de Limpieza
Los 13 archivos en `src/pages/admin/hr/` pueden eliminarse tras verificación visual.
