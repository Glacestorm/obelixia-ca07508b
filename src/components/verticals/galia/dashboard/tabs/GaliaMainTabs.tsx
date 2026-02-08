// src/components/verticals/galia/dashboard/tabs/GaliaMainTabs.tsx
import { lazy } from 'react';

// Lazy loading all heavy components
export const GaliaPortalCiudadano = lazy(() => import('../../GaliaPortalCiudadano'));
export const GaliaModeradorCostes = lazy(() => import('../../GaliaModeradorCostes'));
export const GaliaReportGenerator = lazy(() => import('../../GaliaReportGenerator'));
export const GaliaDocumentAnalyzer = lazy(() => import('../../GaliaDocumentAnalyzer'));
export const GaliaTransparencyPortal = lazy(() => import('../../transparency/GaliaTransparencyPortal'));

// Phase 8 Components
export const GaliaDocumentGeneratorPanel = lazy(() => import('@/components/galia/phase8/GaliaDocumentGeneratorPanel').then(m => ({ default: m.GaliaDocumentGeneratorPanel })));
export const GaliaGeoIntelligencePanel = lazy(() => import('@/components/galia/phase8/GaliaGeoIntelligencePanel').then(m => ({ default: m.GaliaGeoIntelligencePanel })));
export const GaliaConvocatoriaSimulatorPanel = lazy(() => import('@/components/galia/phase8/GaliaConvocatoriaSimulatorPanel').then(m => ({ default: m.GaliaConvocatoriaSimulatorPanel })));
export const GaliaBeneficiario360Panel = lazy(() => import('@/components/galia/phase8/GaliaBeneficiario360Panel').then(m => ({ default: m.GaliaBeneficiario360Panel })));
export const GaliaBPMNWorkflowsPanel = lazy(() => import('@/components/galia/phase8/GaliaBPMNWorkflowsPanel').then(m => ({ default: m.GaliaBPMNWorkflowsPanel })));
export const GaliaAdminIntegrationsPanel = lazy(() => import('@/components/galia/phase8/GaliaAdminIntegrationsPanel').then(m => ({ default: m.GaliaAdminIntegrationsPanel })));

// Phase 9 Components
export const GaliaKnowledgeExplorer = lazy(() => import('@/components/galia/phase9/GaliaKnowledgeExplorer').then(m => ({ default: m.GaliaKnowledgeExplorer })));
