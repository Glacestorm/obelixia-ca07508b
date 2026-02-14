// src/components/verticals/galia/dashboard/tabs/GaliaMainTabs.tsx
/**
 * GALIA Dashboard Lazy Components
 * Aggressive code-splitting to prevent build memory errors
 */
import { lazy } from 'react';

// Core vertical components - lazy loaded
export const GaliaPortalCiudadano = lazy(() => import('../../GaliaPortalCiudadano'));
export const GaliaModeradorCostes = lazy(() => import('../../GaliaModeradorCostes'));
export const GaliaReportGenerator = lazy(() => import('../../GaliaReportGenerator'));
export const GaliaDocumentAnalyzer = lazy(() => import('../../GaliaDocumentAnalyzer'));
export const GaliaTransparencyPortal = lazy(() => import('../../transparency/GaliaTransparencyPortal'));

// Phase 8 Components - lazy loaded
export const GaliaDocumentGeneratorPanel = lazy(() => import('@/components/galia/phase8/GaliaDocumentGeneratorPanel').then(m => ({ default: m.GaliaDocumentGeneratorPanel })));
export const GaliaGeoIntelligencePanel = lazy(() => import('@/components/galia/phase8/GaliaGeoIntelligencePanel').then(m => ({ default: m.GaliaGeoIntelligencePanel })));
export const GaliaConvocatoriaSimulatorPanel = lazy(() => import('@/components/galia/phase8/GaliaConvocatoriaSimulatorPanel').then(m => ({ default: m.GaliaConvocatoriaSimulatorPanel })));
export const GaliaBeneficiario360Panel = lazy(() => import('@/components/galia/phase8/GaliaBeneficiario360Panel').then(m => ({ default: m.GaliaBeneficiario360Panel })));
export const GaliaBPMNWorkflowsPanel = lazy(() => import('@/components/galia/phase8/GaliaBPMNWorkflowsPanel').then(m => ({ default: m.GaliaBPMNWorkflowsPanel })));
export const GaliaAdminIntegrationsPanel = lazy(() => import('@/components/galia/phase8/GaliaAdminIntegrationsPanel').then(m => ({ default: m.GaliaAdminIntegrationsPanel })));

// Phase 9 Components - lazy loaded (GALIA 2.0)
export const GaliaKnowledgeExplorer = lazy(() => import('@/components/galia/phase9/GaliaKnowledgeExplorer').then(m => ({ default: m.GaliaKnowledgeExplorer })));
export const GaliaDecisionSupportPanel = lazy(() => import('@/components/galia/phase9/GaliaDecisionSupportPanel').then(m => ({ default: m.GaliaDecisionSupportPanel })));
export const GaliaExportToolbar = lazy(() => import('@/components/galia/phase9/GaliaExportToolbar').then(m => ({ default: m.GaliaExportToolbar })));
export const GaliaComplianceAuditor = lazy(() => import('@/components/galia/phase9/GaliaComplianceAuditor').then(m => ({ default: m.GaliaComplianceAuditor })));
export const GaliaProjectStatusDashboard = lazy(() => import('@/components/galia/phase9/GaliaProjectStatusDashboard').then(m => ({ default: m.GaliaProjectStatusDashboard })));

// Phase 9-10 Components - lazy loaded (IA Híbrida y Federación Nacional)
export const GaliaHybridAIPanel = lazy(() => import('@/components/galia/phase9/GaliaHybridAIPanel').then(m => ({ default: m.GaliaHybridAIPanel })));
export const GaliaNationalFederationDashboard = lazy(() => import('@/components/galia/phase9/GaliaNationalFederationDashboard').then(m => ({ default: m.GaliaNationalFederationDashboard })));

// Territorial Map - lazy loaded (Mapa Interactivo Nacional)
export const GaliaTerritorialMapPanel = lazy(() => import('@/components/galia/territorial-map/GaliaTerritorialMapPanel').then(m => ({ default: m.GaliaTerritorialMapPanel })));

// Phase V4 Coverage - Formación y Feedback (Act. 3 -> 100%)
export const GaliaTrainingCenter = lazy(() => import('@/components/galia/training/GaliaTrainingCenter'));
export const GaliaPilotFeedback = lazy(() => import('@/components/galia/feedback/GaliaPilotFeedback'));

// Phase V4 Coverage - Planificación Fase 2 (Act. 4 -> 100%)
export const GaliaBudgetPlanner = lazy(() => import('@/components/galia/planning/GaliaBudgetPlanner'));
export const GaliaPhase2Planner = lazy(() => import('@/components/galia/planning/GaliaPhase2Planner'));

// Phase V4 Coverage - CRM Socios (Act. 5 -> 100%)
export const GaliaPartnerCRM = lazy(() => import('@/components/galia/partners/GaliaPartnerCRM'));

// Phase V4 Coverage - Coordinación Transversal (Act. 6 -> 100%)
export const GaliaProcurementManager = lazy(() => import('@/components/galia/procurement/GaliaProcurementManager'));
export const GaliaDiffusionManager = lazy(() => import('@/components/galia/diffusion/GaliaDiffusionManager'));
