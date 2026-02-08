/**
 * GALIA Phase 9 Components - Barrel Export
 * GALIA 2.0 - Excelencia Digital
 * 
 * NOTE: For code-splitting, prefer using lazy-exports.ts
 */

// Direct exports (for backward compatibility - prefer lazy loading)
export { GaliaKnowledgeExplorer } from './GaliaKnowledgeExplorer';
export { GaliaEUFundingAlerts } from './GaliaEUFundingAlerts';
export { GaliaSolicitudWizard } from './GaliaSolicitudWizard';
export { GaliaPortalCiudadanoAvanzado } from './GaliaPortalCiudadanoAvanzado';
export { GaliaPublicDashboard } from './GaliaPublicDashboard';
export { GaliaDecisionSupportPanel } from './GaliaDecisionSupportPanel';

// Phase 7 - Export & Print
export { GaliaExportToolbar } from './GaliaExportToolbar';
export { GaliaExpedientePrint } from './GaliaExpedientePrint';

// Phase 8 - Compliance Auditor
export { GaliaComplianceAuditor } from './GaliaComplianceAuditor';
export { GaliaProjectStatusDashboard } from './GaliaProjectStatusDashboard';

// Phase 9-10 - IA Híbrida y Federación Nacional
export { GaliaHybridAIPanel } from './GaliaHybridAIPanel';
export { GaliaNationalFederationDashboard } from './GaliaNationalFederationDashboard';

// Lazy exports for code-splitting (PREFERRED)
export {
  GaliaKnowledgeExplorerLazy,
  GaliaEUFundingAlertsLazy,
  GaliaSolicitudWizardLazy,
  GaliaPortalCiudadanoAvanzadoLazy,
  GaliaPublicDashboardLazy,
  GaliaDecisionSupportPanelLazy,
  GaliaExportToolbarLazy,
  GaliaExpedientePrintLazy,
  GaliaComplianceAuditorLazy,
  GaliaProjectStatusDashboardLazy
} from './lazy-exports';
