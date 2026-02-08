/**
 * ObelixIA Accounting Page
 * Página principal del módulo de contabilidad interna
 * Fase 2-10: Contabilidad Completa con IA Avanzada
 */

import { useState, lazy, Suspense } from 'react';
import { DashboardLayout } from '@/layouts';

import {
  ObelixiaAccountingDashboard,
  ChartOfAccountsManager,
  JournalEntryEditor,
  PartnerManager,
  BankReconciliation,
  FinancialReports,
  TaxDeclarations,
  ObelixiaAccountingSidebar,
  // Phases 3-10: Advanced AI Modules
  AutonomousAgentPanel,
  FinancialForecastingPanel,
  ComplianceAuditPanel,
  MultiCurrencyPanel,
  SmartReconciliationPanel,
  TreasuryPanel,
  TaxPlanningPanel,
  FinancialAnalyticsPanel,
  // Phase 11: Enterprise Modules
  IntegrationsHubPanel,
  WorkflowPanel,
  DocumentsPanel,
  IntercompanyPanel,
  // Phase 13: Regulatory & Advanced Reporting
  RegulatoryReportingPanel,
  BudgetingPanel,
  RiskManagementPanel,
  ESGReportingPanel,
  // Phase 15: Financial Guardian & Automation
  FinancialGuardianPanel,
  ClosingAutomationPanel,
  FixedAssetsPanel,
  // Phase 15 Extended: Strategic Financial Agent
  GrantsIntelligencePanel,
  BusinessPlanGeneratorPanel,
  ViabilityStudyPanel,
  CompetitiveAnalysisPanel,
  InvestorDocumentsPanel,
  // PDF Generator
  ObelixiaPDFDownloader,
  // Phase 16: Billing Integration
  BillingIntegrationPanel
} from '@/components/admin/obelixia-accounting';

// Vertical Industry Modules
import {
  VerticalAccountingAgriculture,
  VerticalAccountingEducation,
  VerticalAccountingHealthcare,
  VerticalAccountingHospitality,
  VerticalAccountingLegal,
  VerticalAccountingEnergy,
  VerticalAccountingConstruction,
  VerticalAccountingManufacturing,
  VerticalAccountingLogistics,
  VerticalAccountingRealEstate,
  VerticalAccountingRetail,
  VerticalAccountingNGO,
  VerticalAccountingCrypto,
  VerticalAccountingAIMarketplace,
  VerticalAccountingPredictiveCashflow
} from '@/components/admin/obelixia-accounting/verticals';

// Phase 12: Advanced AI & Automation - Lazy loaded to avoid chunking conflicts
const AdvancedCopilotPanel = lazy(() => import('@/components/admin/advanced-ai/AdvancedCopilotPanel').then(m => ({ default: m.AdvancedCopilotPanel })));
const AIOrchestorPanel = lazy(() => import('@/components/admin/advanced-ai/AIOrchestorPanel').then(m => ({ default: m.AIOrchestorPanel })));
const SmartAnalyticsPanel = lazy(() => import('@/components/admin/advanced-ai/SmartAnalyticsPanel').then(m => ({ default: m.SmartAnalyticsPanel })));
const RealTimeInsightsPanel = lazy(() => import('@/components/admin/advanced-ai/RealTimeInsightsPanel').then(m => ({ default: m.RealTimeInsightsPanel })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export default function ObelixiaAccountingPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ObelixiaAccountingDashboard />;
      case 'chart':
        return <ChartOfAccountsManager />;
      case 'entries':
        return <JournalEntryEditor />;
      case 'partners':
        return <PartnerManager />;
      case 'banking':
        return <BankReconciliation />;
      case 'reports':
        return <FinancialReports />;
      case 'fiscal':
        return <TaxDeclarations />;
      case 'ai-agent':
        return <AutonomousAgentPanel />;
      case 'forecasting':
        return <FinancialForecastingPanel />;
      case 'compliance':
        return <ComplianceAuditPanel />;
      case 'multicurrency':
        return <MultiCurrencyPanel />;
      case 'reconciliation':
        return <SmartReconciliationPanel />;
      case 'treasury':
        return <TreasuryPanel />;
      case 'tax-planning':
        return <TaxPlanningPanel />;
      case 'analytics':
        return <FinancialAnalyticsPanel />;
      // Phase 11: Enterprise Modules
      case 'integrations-hub':
        return <IntegrationsHubPanel />;
      case 'workflow':
        return <WorkflowPanel />;
      case 'documents':
        return <DocumentsPanel />;
      case 'intercompany':
        return <IntercompanyPanel />;
      // Phase 12: Advanced AI & Automation (lazy loaded)
      case 'advanced-copilot':
        return <Suspense fallback={<LoadingFallback />}><AdvancedCopilotPanel context={{ entityId: 'obelixia-accounting', entityName: 'ObelixIA Contabilidad' }} /></Suspense>;
      case 'ai-orchestrator':
        return <Suspense fallback={<LoadingFallback />}><AIOrchestorPanel /></Suspense>;
      case 'smart-analytics':
        return <Suspense fallback={<LoadingFallback />}><SmartAnalyticsPanel context={{ entityId: 'obelixia-accounting', entityType: 'accounting' }} /></Suspense>;
      case 'realtime-insights':
        return <Suspense fallback={<LoadingFallback />}><RealTimeInsightsPanel context={{ entityId: 'obelixia-accounting', entityType: 'accounting' }} /></Suspense>;
      // Phase 13: Regulatory & Advanced Reporting
      case 'regulatory-reporting':
        return <RegulatoryReportingPanel />;
      case 'budgeting':
        return <BudgetingPanel />;
      case 'risk-management':
        return <RiskManagementPanel />;
      case 'esg-reporting':
        return <ESGReportingPanel />;
      // Phase 15: Financial Guardian & Automation
      case 'financial-guardian':
        return <FinancialGuardianPanel />;
      case 'closing-automation':
        return <ClosingAutomationPanel />;
      case 'fixed-assets':
        return <FixedAssetsPanel />;
      // Phase 15 Extended: Strategic Financial Agent
      case 'grants-intelligence':
        return <GrantsIntelligencePanel />;
      case 'business-plan':
        return <BusinessPlanGeneratorPanel />;
      case 'viability-study':
        return <ViabilityStudyPanel />;
      case 'competitive-analysis':
        return <CompetitiveAnalysisPanel />;
      case 'investor-documents':
        return <InvestorDocumentsPanel />;
      case 'pdf-generator':
        return <ObelixiaPDFDownloader />;
      case 'billing-integration':
        return <BillingIntegrationPanel />;
      // Vertical Industry Modules
      case 'vertical-agriculture':
        return <VerticalAccountingAgriculture />;
      case 'vertical-education':
        return <VerticalAccountingEducation />;
      case 'vertical-healthcare':
        return <VerticalAccountingHealthcare />;
      case 'vertical-hospitality':
        return <VerticalAccountingHospitality />;
      case 'vertical-legal':
        return <VerticalAccountingLegal />;
      case 'vertical-energy':
        return <VerticalAccountingEnergy />;
      case 'vertical-construction':
        return <VerticalAccountingConstruction />;
      case 'vertical-manufacturing':
        return <VerticalAccountingManufacturing />;
      case 'vertical-logistics':
        return <VerticalAccountingLogistics />;
      case 'vertical-realestate':
        return <VerticalAccountingRealEstate />;
      case 'vertical-retail':
        return <VerticalAccountingRetail />;
      case 'vertical-ngo':
        return <VerticalAccountingNGO />;
      // Disruptive Modules
      case 'vertical-crypto':
        return <VerticalAccountingCrypto />;
      case 'vertical-ai-marketplace':
        return <VerticalAccountingAIMarketplace />;
      case 'vertical-predictive-cashflow':
        return <VerticalAccountingPredictiveCashflow />;
      default:
        return <ObelixiaAccountingDashboard />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ObelixiaAccountingSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <DashboardLayout title="ObelixIA Accounting" contentPadding="none">
          <div className="flex-1 overflow-auto p-6">
            {renderContent()}
          </div>
        </DashboardLayout>
      </main>
    </div>
  );
}
