/**
 * GALIA Phase 8 Components - Productividad Avanzada
 * Lazy-loaded exports for build optimization
 */

import { lazy } from 'react';

export const GaliaDocumentGeneratorPanel = lazy(() => import('./GaliaDocumentGeneratorPanel').then(m => ({ default: m.GaliaDocumentGeneratorPanel })));
// Próximos componentes Phase 8:
// export const GaliaGeoIntelligencePanel = lazy(() => import('./GaliaGeoIntelligencePanel').then(m => ({ default: m.GaliaGeoIntelligencePanel })));
// export const GaliaConvocatoriaSimulatorPanel = lazy(() => import('./GaliaConvocatoriaSimulatorPanel').then(m => ({ default: m.GaliaConvocatoriaSimulatorPanel })));
// export const GaliaBeneficiario360Panel = lazy(() => import('./GaliaBeneficiario360Panel').then(m => ({ default: m.GaliaBeneficiario360Panel })));
