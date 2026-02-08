/**
 * GALIA Phase 6 Components - Innovation
 * Lazy-loaded exports for build optimization
 */

import { lazy } from 'react';

export const GaliaEUDIWalletPanel = lazy(() => import('./GaliaEUDIWalletPanel').then(m => ({ default: m.GaliaEUDIWalletPanel })));
export const GaliaMultimodalAIPanel = lazy(() => import('./GaliaMultimodalAIPanel').then(m => ({ default: m.GaliaMultimodalAIPanel })));
export const GaliaBlockchainAuditPanel = lazy(() => import('./GaliaBlockchainAuditPanel').then(m => ({ default: m.GaliaBlockchainAuditPanel })));
export const GaliaPublicAPIPanel = lazy(() => import('./GaliaPublicAPIPanel').then(m => ({ default: m.GaliaPublicAPIPanel })));
