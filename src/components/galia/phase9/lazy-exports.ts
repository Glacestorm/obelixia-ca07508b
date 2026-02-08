/**
 * GALIA Phase 9 - Lazy Loading Exports
 * Code-splitting strategy to prevent build memory errors
 */

import { lazy } from 'react';

// Lazy load all heavy Phase 9 components
export const GaliaKnowledgeExplorerLazy = lazy(() => 
  import('./GaliaKnowledgeExplorer').then(m => ({ default: m.GaliaKnowledgeExplorer }))
);

export const GaliaEUFundingAlertsLazy = lazy(() => 
  import('./GaliaEUFundingAlerts').then(m => ({ default: m.GaliaEUFundingAlerts }))
);

export const GaliaSolicitudWizardLazy = lazy(() => 
  import('./GaliaSolicitudWizard').then(m => ({ default: m.GaliaSolicitudWizard }))
);

export const GaliaPortalCiudadanoAvanzadoLazy = lazy(() => 
  import('./GaliaPortalCiudadanoAvanzado').then(m => ({ default: m.GaliaPortalCiudadanoAvanzado }))
);

export const GaliaPublicDashboardLazy = lazy(() => 
  import('./GaliaPublicDashboard').then(m => ({ default: m.GaliaPublicDashboard }))
);

export const GaliaDecisionSupportPanelLazy = lazy(() => 
  import('./GaliaDecisionSupportPanel').then(m => ({ default: m.GaliaDecisionSupportPanel }))
);

export const GaliaExportToolbarLazy = lazy(() => 
  import('./GaliaExportToolbar').then(m => ({ default: m.GaliaExportToolbar }))
);

export const GaliaExpedientePrintLazy = lazy(() => 
  import('./GaliaExpedientePrint').then(m => ({ default: m.GaliaExpedientePrint }))
);

export const GaliaComplianceAuditorLazy = lazy(() => 
  import('./GaliaComplianceAuditor').then(m => ({ default: m.GaliaComplianceAuditor }))
);

export const GaliaProjectStatusDashboardLazy = lazy(() => 
  import('./GaliaProjectStatusDashboard').then(m => ({ default: m.GaliaProjectStatusDashboard }))
);
