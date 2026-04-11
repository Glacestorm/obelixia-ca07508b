/**
 * HRModuleLazy — Lazy-loaded wrappers for all HR domain panels
 * Prevents 503 errors by splitting the massive dependency graph into on-demand chunks
 * @version 1.0.0
 */

import React, { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

/** Tiny fallback shown while a panel chunk loads */
function PanelSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Creates a lazy component with automatic retry on chunk failure
 * and a built-in Suspense boundary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyPanel(
  factory: () => Promise<any>,
  exportName?: string,
): React.FC<any> {
  const resolve = (mod: any) => {
    if (exportName && exportName in mod) {
      return { default: mod[exportName] };
    }
    return mod;
  };

  // Fallback component shown when chunk fails to load after retry
  const FailedPlaceholder: ComponentType<any> = () => (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-4 text-center">
      <p className="text-sm text-muted-foreground">No se pudo cargar este panel.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 text-xs text-primary underline"
      >
        Recargar página
      </button>
    </div>
  );

  const LazyComp = lazy(() =>
    factory()
      .then(resolve)
      .catch(() =>
        new Promise<{ default: ComponentType<any> }>((res) =>
          setTimeout(() => {
            factory()
              .then(resolve)
              .then(res)
              .catch(() => res({ default: FailedPlaceholder }));
          }, 1500),
        ),
      ),
  );

  const Wrapper: React.FC<any> = (props) => (
    <Suspense fallback={<PanelSkeleton />}>
      <LazyComp {...props} />
    </Suspense>
  );
  Wrapper.displayName = exportName || 'LazyPanel';
  return Wrapper;
}

// ─── D1 People ───────────────────────────────────────────────
export const LazyHREmployeesPanel = lazyPanel(() => import('./domains/people'), 'HREmployeesPanel');
export const LazyHRDepartmentsPanel = lazyPanel(() => import('./domains/people'), 'HRDepartmentsPanel');
export const LazyHREmployeeExpedient = lazyPanel(() => import('./domains/people'), 'HREmployeeExpedient');

// ─── D2 Contracts ────────────────────────────────────────────
export const LazyHRContractsPanel = lazyPanel(() => import('./domains/contracts'), 'HRContractsPanel');
export const LazyHRSeveranceCalculatorDialog = lazyPanel(() => import('./domains/contracts'), 'HRSeveranceCalculatorDialog');
export const LazyHRIndemnizationCalculatorDialog = lazyPanel(() => import('./domains/contracts'), 'HRIndemnizationCalculatorDialog');

// ─── D3 Payroll ──────────────────────────────────────────────
export const LazyHRPayrollPanel = lazyPanel(() => import('./domains/payroll'), 'HRPayrollPanel');
export const LazyHRPayrollRecalculationPanel = lazyPanel(() => import('./domains/payroll'), 'HRPayrollRecalculationPanel');
export const LazyHRSocialBenefitsPanel = lazyPanel(() => import('./domains/payroll'), 'HRSocialBenefitsPanel');
export const LazyHRSettlementsPanel = lazyPanel(() => import('./domains/payroll'), 'HRSettlementsPanel');
export const LazyHRPayrollEntryDialog = lazyPanel(() => import('./domains/payroll'), 'HRPayrollEntryDialog');

// ─── D4 Social-Fiscal ───────────────────────────────────────
export const LazyHRSocialSecurityPanel = lazyPanel(() => import('./domains/social-fiscal'), 'HRSocialSecurityPanel');
export const LazyHRCNAEIntelligencePanel = lazyPanel(() => import('./domains/social-fiscal'), 'HRCNAEIntelligencePanel');

// ─── D5 Compliance ──────────────────────────────────────────
export const LazyHRSafetyPanel = lazyPanel(() => import('./domains/compliance'), 'HRSafetyPanel');
export const LazyHRRegulatoryWatchPanel = lazyPanel(() => import('./domains/compliance'), 'HRRegulatoryWatchPanel');
export const LazyHRLegalComplianceDashboard = lazyPanel(() => import('./domains/compliance'), 'HRLegalComplianceDashboard');
export const LazyHRLegalEnginePanel = lazyPanel(() => import('./domains/compliance'), 'HRLegalEnginePanel');
export const LazyComplianceReportingPanel = lazyPanel(() => import('./domains/compliance'), 'ComplianceReportingPanel');
export const LazyHRUnionsPanel = lazyPanel(() => import('./domains/compliance'), 'HRUnionsPanel');

// ─── D6 Documents ───────────────────────────────────────────
export const LazyDocumentExpedientModule = lazyPanel(() => import('./domains/documents'), 'DocumentExpedientModule');
export const LazyHREmployeeDocumentsPanel = lazyPanel(() => import('./domains/documents'), 'HREmployeeDocumentsPanel');

// ─── D7 Portal ──────────────────────────────────────────────
export const LazyHRHelpIndex = lazyPanel(() => import('./domains/portal'), 'HRHelpIndex');

// ─── D8 Workflows ───────────────────────────────────────────
export const LazyHRVacationsPanel = lazyPanel(() => import('./domains/workflows'), 'HRVacationsPanel');
export const LazyHRTimeClockPanel = lazyPanel(() => import('./domains/workflows'), 'HRTimeClockPanel');
export const LazyHRAlertsPanel = lazyPanel(() => import('./domains/workflows'), 'HRAlertsPanel');
export const LazyHRVacationRequestDialog = lazyPanel(() => import('./domains/workflows'), 'HRVacationRequestDialog');
export const LazyHRIncidentFormDialog = lazyPanel(() => import('./domains/workflows'), 'HRIncidentFormDialog');

// ─── D10 Talent ─────────────────────────────────────────────
export const LazyHRRecruitmentPanel = lazyPanel(() => import('./domains/talent'), 'HRRecruitmentPanel');
export const LazyHROnboardingPanel = lazyPanel(() => import('./domains/talent'), 'HROnboardingPanel');
export const LazyHROffboardingPanel = lazyPanel(() => import('./domains/talent'), 'HROffboardingPanel');
export const LazyHRPerformancePanel = lazyPanel(() => import('./domains/talent'), 'HRPerformancePanel');
export const LazyHRTrainingPanel = lazyPanel(() => import('./domains/talent'), 'HRTrainingPanel');
export const LazyHRSkillsMatrixPanel = lazyPanel(() => import('./domains/talent'), 'HRSkillsMatrixPanel');
export const LazyHRInternalMarketplacePanel = lazyPanel(() => import('./domains/talent'), 'HRInternalMarketplacePanel');
export const LazyHRSuccessionPlanningPanel = lazyPanel(() => import('./domains/talent'), 'HRSuccessionPlanningPanel');
export const LazyHRTalentIntelligencePanel = lazyPanel(() => import('./domains/talent'), 'HRTalentIntelligencePanel');
export const LazyHRRoleExperiencePanel = lazyPanel(() => import('./domains/talent'), 'HRRoleExperiencePanel');

// ─── D11 Analytics ──────────────────────────────────────────
export const LazyHRExecutiveDashboard = lazyPanel(() => import('./domains/analytics'), 'HRExecutiveDashboard');
export const LazyHRAdvancedAnalyticsPanel = lazyPanel(() => import('./domains/analytics'), 'HRAdvancedAnalyticsPanel');
export const LazyPeopleAnalyticsModule = lazyPanel(() => import('./domains/analytics'), 'PeopleAnalyticsModule');
export const LazyHRAnalyticsIntelligencePanel = lazyPanel(() => import('./domains/analytics'), 'HRAnalyticsIntelligencePanel');
export const LazyHRAnalyticsBIPremiumPanel = lazyPanel(() => import('./domains/analytics'), 'HRAnalyticsBIPremiumPanel');
export const LazyHRReportingEnginePanel = lazyPanel(() => import('./domains/analytics'), 'HRReportingEnginePanel');
export const LazyHRBoardPackPanel = lazyPanel(() => import('./domains/analytics'), 'HRBoardPackPanel');

// ─── D12 AI Tower ───────────────────────────────────────────
export const LazyHRAIControlCenter = lazyPanel(() => import('./domains/ai-tower'), 'HRAIControlCenter');
export const LazyHRAIAgentPanel = lazyPanel(() => import('./domains/ai-tower'), 'HRAIAgentPanel');
export const LazyMultiAgentSupervisorPanel = lazyPanel(() => import('./domains/ai-tower'), 'MultiAgentSupervisorPanel');
export const LazyHRKnowledgeUploader = lazyPanel(() => import('./domains/ai-tower'), 'HRKnowledgeUploader');
export const LazyHRDemoSeedPanel = lazyPanel(() => import('./domains/ai-tower'), 'HRDemoSeedPanel');
export const LazyHRCopilotTwinPanel = lazyPanel(() => import('./domains/ai-tower'), 'HRCopilotTwinPanel');
export const LazyHRDigitalTwinPanel = lazyPanel(() => import('./domains/ai-tower'), 'HRDigitalTwinPanel');
export const LazyHRAIGovernancePanel = lazyPanel(() => import('./domains/ai-tower'), 'HRAIGovernancePanel');

// ─── Cross-cutting modules ─────────────────────────────────
export const LazyHRNewsPanel = lazyPanel(() => import('./HRNewsPanel'), 'HRNewsPanel');
export const LazyHRTrends2026Panel = lazyPanel(() => import('./HRTrends2026Panel'), 'HRTrends2026Panel');
export const LazyHRIntegrationDashboard = lazyPanel(() => import('./integration'), 'HRIntegrationDashboard');

// Enterprise
export const LazyHREnterpriseDashboard = lazyPanel(() => import('./enterprise'), 'HREnterpriseDashboard');
export const LazyHRLegalEntitiesPanel = lazyPanel(() => import('./enterprise'), 'HRLegalEntitiesPanel');
export const LazyHRWorkCentersPanel = lazyPanel(() => import('./enterprise'), 'HRWorkCentersPanel');
export const LazyHROrgStructurePanel = lazyPanel(() => import('./enterprise'), 'HROrgStructurePanel');
export const LazyHRCalendarsPanel = lazyPanel(() => import('./enterprise'), 'HRCalendarsPanel');
export const LazyHRRolesPermissionsPanel = lazyPanel(() => import('./enterprise'), 'HRRolesPermissionsPanel');
export const LazyHRAuditTrailPanel = lazyPanel(() => import('./enterprise'), 'HRAuditTrailPanel');
export const LazyHRWorkflowDesigner = lazyPanel(() => import('./enterprise'), 'HRWorkflowDesigner');
export const LazyHRApprovalInbox = lazyPanel(() => import('./enterprise'), 'HRApprovalInbox');
export const LazyHRSLADashboard = lazyPanel(() => import('./enterprise'), 'HRSLADashboard');
export const LazyHRComplianceEnterprisePanel = lazyPanel(() => import('./enterprise'), 'HRComplianceEnterprisePanel');

// Advisory, Control Tower, Copilot, etc.
export const LazyAdvisoryDashboardPanel = lazyPanel(() => import('./advisory'), 'AdvisoryDashboardPanel');
export const LazyControlTowerPanel = lazyPanel(() => import('./control-tower'), 'ControlTowerPanel');
export const LazyHRLaborCopilotPanel = lazyPanel(() => import('./copilot'), 'HRLaborCopilotPanel');
export const LazyHRLaborDigitalTwinPanel = lazyPanel(() => import('./digital-twin-labor'), 'HRLaborDigitalTwinPanel');
export const LazyHRCompensationSuitePanel = lazyPanel(() => import('./compensation'), 'HRCompensationSuitePanel');
export const LazyHRWellbeingEnterprisePanel = lazyPanel(() => import('./wellbeing/HRWellbeingEnterprisePanel'), 'HRWellbeingEnterprisePanel');
export const LazyHRESGSelfServicePanel = lazyPanel(() => import('./esg-selfservice/HRESGSelfServicePanel'), 'HRESGSelfServicePanel');
export const LazyHRSecurityGovernancePanel = lazyPanel(() => import('./security-governance/HRSecurityGovernancePanel'), 'HRSecurityGovernancePanel');
export const LazyHRWorkforcePlanningPanel = lazyPanel(() => import('./workforce-planning/HRWorkforcePlanningPanel'), 'HRWorkforcePlanningPanel');
export const LazyHRFairnessEnginePanel = lazyPanel(() => import('./fairness-engine/HRFairnessEnginePanel'), 'HRFairnessEnginePanel');

// Premium dashboard
export const LazyHRPremiumExecutiveDashboard = lazyPanel(() => import('./premium-dashboard'), 'HRPremiumExecutiveDashboard');
export const LazyHRPremiumAlertsPanel = lazyPanel(() => import('./premium-dashboard'), 'HRPremiumAlertsPanel');
export const LazyHRPremiumActivityFeed = lazyPanel(() => import('./premium-dashboard'), 'HRPremiumActivityFeed');
export const LazyHRPremiumSettingsPanel = lazyPanel(() => import('./premium-dashboard'), 'HRPremiumSettingsPanel');
export const LazyHRPremiumHealthCheckPanel = lazyPanel(() => import('./premium-dashboard'), 'HRPremiumHealthCheckPanel');
export const LazyHRPremiumExportPanel = lazyPanel(() => import('./premium-dashboard'), 'HRPremiumExportPanel');
export const LazyHRPremiumHelpCenter = lazyPanel(() => import('./premium-dashboard'), 'HRPremiumHelpCenter');
export const LazyHROrchestrationPanel = lazyPanel(() => import('./premium-dashboard'), 'HROrchestrationPanel');
export const LazyHRComplianceAutomationPanel = lazyPanel(() => import('./premium-dashboard'), 'HRComplianceAutomationPanel');
export const LazyHRUtilitiesNavigation = lazyPanel(() => import('./premium-dashboard/HRUtilitiesNavigation'), 'HRUtilitiesNavigation');

// Premium API, Enterprise Integrations
export const LazyPremiumAPIWebhooksPanel = lazyPanel(() => import('./premium-api'), 'PremiumAPIWebhooksPanel');
export const LazyEnterpriseIntegrationsPanel = lazyPanel(() => import('./enterprise-integrations'), 'EnterpriseIntegrationsPanel');

// Global
export const LazyHRCountryRegistryPanel = lazyPanel(() => import('./global'), 'HRCountryRegistryPanel');
export const LazyHRLeaveIncidentsPanel = lazyPanel(() => import('./global'), 'HRLeaveIncidentsPanel');
export const LazyHRPayrollPeriodsPanel = lazyPanel(() => import('./global'), 'HRPayrollPeriodsPanel');
export const LazyHRComplianceEvidencePanel = lazyPanel(() => import('./global'), 'HRComplianceEvidencePanel');

// Tasks, Integrations, Mobility, Payroll Engine, Localization, Admin
export const LazyHRTasksModule = lazyPanel(() => import('./tasks'), 'HRTasksModule');
export const LazyOfficialIntegrationsHub = lazyPanel(() => import('./official-integrations'), 'OfficialIntegrationsHub');
export const LazyGlobalMobilityModule = lazyPanel(() => import('./mobility'), 'GlobalMobilityModule');
export const LazyHRPayrollEngine = lazyPanel(() => import('./payroll-engine'), 'HRPayrollEngine');
export const LazyESLocalizationPlugin = lazyPanel(() => import('./localization/es'), 'ESLocalizationPlugin');
export const LazyHRAdminPortal = lazyPanel(() => import('./admin-portal'), 'HRAdminPortal');

// Shared
export const LazyHRDemoJourneyPanel = lazyPanel(() => import('./shared/HRDemoJourneyPanel'), 'HRDemoJourneyPanel');
export const LazyHRPilotOnboardingPanel = lazyPanel(() => import('./shared/HRPilotOnboardingPanel'), 'HRPilotOnboardingPanel');
export const LazyHRPayrollReconciliationPanel = lazyPanel(() => import('./shared/HRPayrollReconciliationPanel'), 'HRPayrollReconciliationPanel');

// Cross-cutting heavy modules
export const LazyUnifiedAuditGenerator = lazyPanel(() => import('@/components/reports/UnifiedAuditGenerator'), 'UnifiedAuditGenerator');
export const LazyAIUnifiedDashboard = lazyPanel(() => import('@/components/admin/ai-hybrid'), 'AIUnifiedDashboard');

// ─── Contract Lifecycle ─────────────────────────────────────
export const LazyHRContractExpiryWidget = lazyPanel(() => import('./widgets/HRContractExpiryWidget'), 'HRContractExpiryWidget');
export const LazyHRContractExpiryReport = lazyPanel(() => import('./reports/HRContractExpiryReport'), 'HRContractExpiryReport');

// ─── S8.5 Absorbed panels ──────────────────────────────────
export const LazySymbolicValuesPanel = lazyPanel(() => import('./payroll-engine'), 'SymbolicValuesPanel');
export const LazyIRPFMotorPanel = lazyPanel(() => import('./payroll-engine'), 'IRPFMotorPanel');
export const LazyBankAccountsPanel = lazyPanel(() => import('./domains/people'), 'BankAccountsPanel');
export const LazyGovernanceCockpit = lazyPanel(() => import('./domains/ai-tower'), 'GovernanceCockpit');
export const LazyPredictiveAuditPanel = lazyPanel(() => import('./domains/analytics'), 'PredictiveAuditPanel');

// ─── S8.5b Exclusive simulators ────────────────────────────
export const LazyGarnishmentSimulator = lazyPanel(() => import('@/components/hr/garnishments/GarnishmentSimulator'), 'GarnishmentSimulator');

// ─── P1.7 Preflight Cockpit ───────────────────────────────
export const LazyPayrollPreflightCockpit = lazyPanel(() => import('./payroll-engine/PayrollPreflightCockpit'), 'PayrollPreflightCockpit');

// ─── P1.7B-RB Equity / Stock Options ─────────────────────
export const LazyStockOptionsPanel = lazyPanel(() => import('./equity'), 'StockOptionsPanel');
