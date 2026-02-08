/**
 * GALIA Phase 4 Components - Advanced AI Features
 * Lazy-loaded exports for build optimization
 */

import { lazy } from 'react';

export const GaliaImpactPredictorPanel = lazy(() => import('./GaliaImpactPredictorPanel').then(m => ({ default: m.GaliaImpactPredictorPanel })));
export const GaliaBDNSPanel = lazy(() => import('./GaliaBDNSPanel').then(m => ({ default: m.GaliaBDNSPanel })));
export const GaliaAutoApprovalPanel = lazy(() => import('./GaliaAutoApprovalPanel').then(m => ({ default: m.GaliaAutoApprovalPanel })));
export const GaliaProactivePanel = lazy(() => import('./GaliaProactivePanel').then(m => ({ default: m.GaliaProactivePanel })));
