/**
 * GALIA Phase 5 Components - Expansión
 * Lazy-loaded exports for build optimization
 */

import { lazy } from 'react';

export const GaliaClaveAuthPanel = lazy(() => import('./GaliaClaveAuthPanel').then(m => ({ default: m.GaliaClaveAuthPanel })));
export const GaliaFederationDashboard = lazy(() => import('./GaliaFederationDashboard').then(m => ({ default: m.GaliaFederationDashboard })));
export const GaliaGamificationPanel = lazy(() => import('./GaliaGamificationPanel').then(m => ({ default: m.GaliaGamificationPanel })));
