/**
 * GALIA Phase 7 Components - Excelencia Operacional
 * Lazy-loaded exports for build optimization
 */

import { lazy } from 'react';

export const GaliaSmartAuditPanel = lazy(() => import('./GaliaSmartAuditPanel').then(m => ({ default: m.GaliaSmartAuditPanel })));
export const GaliaCompliancePredictorPanel = lazy(() => import('./GaliaCompliancePredictorPanel').then(m => ({ default: m.GaliaCompliancePredictorPanel })));
export const GaliaEarlyWarningPanel = lazy(() => import('./GaliaEarlyWarningPanel').then(m => ({ default: m.GaliaEarlyWarningPanel })));
export const GaliaExecutiveDashboardPanel = lazy(() => import('./GaliaExecutiveDashboardPanel').then(m => ({ default: m.GaliaExecutiveDashboardPanel })));
