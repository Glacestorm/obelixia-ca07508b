/**
 * GALIA Phase 8 Components - Productividad Avanzada
 * Lazy-loaded exports for build optimization
 */

import { lazy } from 'react';

// 8A - Generación Documental IA
export const GaliaDocumentGeneratorPanel = lazy(() => import('./GaliaDocumentGeneratorPanel').then(m => ({ default: m.GaliaDocumentGeneratorPanel })));

// 8B - Geointeligencia Territorial
export const GaliaGeoIntelligencePanel = lazy(() => import('./GaliaGeoIntelligencePanel').then(m => ({ default: m.GaliaGeoIntelligencePanel })));

// 8C - Simulador de Convocatorias
export const GaliaConvocatoriaSimulatorPanel = lazy(() => import('./GaliaConvocatoriaSimulatorPanel').then(m => ({ default: m.GaliaConvocatoriaSimulatorPanel })));

// 8D - Portal Beneficiario 360°
export const GaliaBeneficiario360Panel = lazy(() => import('./GaliaBeneficiario360Panel').then(m => ({ default: m.GaliaBeneficiario360Panel })));

// 8E - Flujos No-Code (BPMN)
export const GaliaBPMNWorkflowsPanel = lazy(() => import('./GaliaBPMNWorkflowsPanel').then(m => ({ default: m.GaliaBPMNWorkflowsPanel })));

// Próximos componentes Phase 8:
// 8F - Integraciones Administrativas (AEAT, TGSS, etc.)
