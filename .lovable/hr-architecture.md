# HR Module — Architectural Consolidation (V2-RRHH-FASE-1)

## Domain Map (12 domains)

| Domain | ID | Path | Barrel |
|--------|----|------|--------|
| People Core | D1 | `domains/people/` | `@/components/erp/hr/domains/people` |
| Contract Lifecycle | D2 | `domains/contracts/` | `@/components/erp/hr/domains/contracts` |
| Payroll | D3 | `domains/payroll/` | `@/components/erp/hr/domains/payroll` |
| Social-Fiscal | D4 | `domains/social-fiscal/` | `@/components/erp/hr/domains/social-fiscal` |
| Compliance & Legal | D5 | `domains/compliance/` | `@/components/erp/hr/domains/compliance` |
| Document Expedient | D6 | `domains/documents/` | `@/components/erp/hr/domains/documents` |
| Employee Portal | D7 | `domains/portal/` | `@/components/erp/hr/domains/portal` |
| Workflows & Approvals | D8 | `domains/workflows/` | `@/components/erp/hr/domains/workflows` |
| Official Integrations | D9 | `domains/integrations/` | `@/components/erp/hr/domains/integrations` |
| Talent & Development | D10 | `domains/talent/` | `@/components/erp/hr/domains/talent` |
| Analytics & BI | D11 | `domains/analytics/` | `@/components/erp/hr/domains/analytics` |
| AI / Control Tower | D12 | `domains/ai-tower/` | `@/components/erp/hr/domains/ai-tower` |

## Layer Architecture

```
UI Layer (Presentational)     → *View.tsx, *Card.tsx
Orchestration Layer (Smart)   → *Panel.tsx, *Module.tsx
Hook Layer                    → useQuery*, useCommand*, useDomain*
Engine Layer (Pure Logic)     → src/engines/erp/hr/*.ts
Repository Layer              → (future) repos/*.ts
```

## Standard Contracts

### Panel Props
```typescript
interface HRDomainPanelProps {
  companyId: string;
  employeeId?: string;
  mvpMode?: boolean;
  isAdmin?: boolean;
  onNavigate?: (moduleId: string) => void;
}
```

### Entity Status
```typescript
type EntityStatus = 'draft' | 'pending' | 'active' | 'completed' | 'cancelled' | 'error';
type ProcessStatus = 'idle' | 'running' | 'success' | 'failed';
```

## Analytics Consolidation (Sprint 2)

| Panel | Tier | Route | Status |
|-------|------|-------|--------|
| HRExecutiveDashboard | Core | `dashboard` | ✅ Primary landing |
| HRAdvancedAnalyticsPanel | Core | `analytics` | ✅ KPIs predictivos |
| PeopleAnalyticsModule | Core | `people-analytics` | ✅ Unified PA |
| HRAnalyticsIntelligencePanel | Specialized | `analytics-intelligence` | ✅ AI workforce |
| HRAnalyticsBIPremiumPanel | Specialized | `util-analytics-bi` | ✅ Premium BI |
| HRReportingEnginePanel | Specialized | `util-reporting` | ✅ Reporting |
| HRBoardPackPanel | Specialized | `board-pack` | ✅ Board |
| HRDashboardPanel | Deprecated | — | ⚠️ Replaced by HRExecutiveDashboard |

## Root Dialogs → Domain Mapping (Sprint 2)

| Dialog | Domain |
|--------|--------|
| HREmployeeFormDialog | D1 People |
| HRBenefitEnrollmentDialog | D1 People |
| HRContractFormDialog | D2 Contracts |
| HRSeveranceCalculatorDialog | D2 Contracts |
| HRIndemnizationCalculatorDialog | D2 Contracts |
| HRPayrollEntryDialog | D3 Payroll |
| HRDocumentGeneratorDialog | D6 Documents |
| HRDocumentUploadDialog | D6 Documents |
| HRVacationRequestDialog | D8 Workflows |
| HRIncidentFormDialog | D8 Workflows |

## Deprecated Components
- `HREmployeeDocumentsPanel` → use `DocumentExpedientModule`
- `HRNewsPanel` → use `HRRegulatoryWatchPanel`
- `HRTrends2026Panel` → static content, no replacement needed
- `HRDashboardPanel` → use `HRExecutiveDashboard` (Sprint 2)

## Sprint Status
- [x] Sprint 1: Domain barrels, deprecations, architecture doc
- [x] Sprint 2: Enrich domain barrels, analytics consolidation, dialog mapping, deprecate HRDashboardPanel
- [x] Sprint 3: Separate shared/ engines, fix cross-layer imports, domain barrel adoption, root component assignment
- [ ] Sprint 4: Complete migration, tests, lazy loading

## Sprint 3 — Migration Table

| Source (shared/) | Destination (engines/) | Type | Compat Re-export | 
|---|---|---|---|
| calendarHelpers.ts | src/engines/erp/hr/calendarHelpers.ts | util | ✅ |
| documentCatalogES.ts | src/engines/erp/hr/documentCatalogES.ts | engine | ✅ |
| documentExpectedTypes.ts | src/engines/erp/hr/documentExpectedTypes.ts | engine | ✅ |
| documentStatusEngine.ts | src/engines/erp/hr/documentStatusEngine.ts | engine | ✅ |
| contractDeadlineEngine.ts | src/engines/erp/hr/contractDeadlineEngine.ts | engine | ✅ |
| registrationDeadlineEngine.ts | src/engines/erp/hr/registrationDeadlineEngine.ts | engine | ✅ |
| proactiveAlertEngine.ts | src/engines/erp/hr/proactiveAlertEngine.ts | engine | ✅ |

## Sprint 3 — Cross-Layer Import Fixes

| Hook | Old Import (shared/) | New Import (engines/) |
|---|---|---|
| useHRDocumentCatalog | documentCatalogES | ✅ engines/ |
| useHRDocActionQueue | documentStatusEngine | ✅ engines/ |
| useHRDocumentDueRules | calendarHelpers | ✅ engines/ |
| useHRContractProcess | contractDeadlineEngine | ✅ engines/ |
| hooks/erp/hr/index.ts | registrationDeadlineEngine | ✅ engines/ |

## Sprint 3 — Domain Barrel Consumers

| Consumer | Barrels Used |
|---|---|
| HRModule.tsx | D3 Payroll, D7 Portal, D8 Workflows |

## Sprint 3 — Root Component Assignment

| Component | Domain | Rationale |
|---|---|---|
| TotalRewardsDashboardPanel | D3 Payroll | Compensation + benefits + recognition |
| HRAlertsPanel | D8 Workflows | Alert workflows, notifications, escalation |
| HRHelpIndex | D7 Portal | Active help panel used by HRModule |
| HRSettlementsPanel | D3 Payroll | Finiquitos/liquidaciones |

## Sprint 3 — Deprecations

| Component | Reason |
|---|---|
| HRHelpPanel | 0 consumers, superseded by HRHelpIndex |

## Sprint 3 — NOT Touched

- usePayrollEngine, payrollRunEngine, closingIntelligenceEngine
- useOfficialIntegrationsHub, useOfficialReadiness, useTGSSReadiness, useContrataReadiness
- All tgss*, contrata*, sandbox*, dryRun*, official*, aeat* engines in shared/
- expedientAlertEngine (depends on UI component DocReconciliationBadge)
- contractClosureEngine (depends on contrataPayloadBuilder)
- registrationClosureEngine (depends on tgssPayloadBuilder)
- HRModule.tsx navigation logic, HRNavigationMenu.tsx
- No business rules changed, no UX modified
