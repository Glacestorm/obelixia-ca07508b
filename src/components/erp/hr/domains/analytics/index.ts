/**
 * Domain D11: Analytics & BI
 * 
 * V2-RRHH-FASE-1 Sprint 2: Consolidated analytics hierarchy
 * 
 * Tier 1 — Core (active routes in HRModule):
 *   - HRExecutiveDashboard       → route 'dashboard' (main HR landing)
 *   - HRAdvancedAnalyticsPanel   → route 'analytics' (KPIs predictivos)
 *   - PeopleAnalyticsModule      → route 'people-analytics' (unified PA)
 * 
 * Tier 2 — Specialized:
 *   - HRAnalyticsIntelligencePanel → route 'analytics-intelligence' (AI workforce)
 *   - HRAnalyticsBIPremiumPanel    → route 'util-analytics-bi' (premium BI)
 *   - HRReportingEnginePanel       → route 'util-reporting'
 *   - HRBoardPackPanel             → route 'board-pack'
 * 
 * Tier 3 — Legacy/Deprecated:
 *   - HRDashboardPanel → @deprecated, replaced by HRExecutiveDashboard
 */

// ── Tier 1: Core Analytics ──
export { HRExecutiveDashboard } from '../../HRExecutiveDashboard';
export { HRAdvancedAnalyticsPanel } from '../../HRAdvancedAnalyticsPanel';
export { PeopleAnalyticsModule } from '../../people-analytics';

// ── Tier 2: Specialized ──
export { HRAnalyticsIntelligencePanel } from '../../analytics/HRAnalyticsIntelligencePanel';
export { HRAnalyticsBIPremiumPanel } from '../../premium-dashboard';
export { HRReportingEnginePanel } from '../../reporting-engine';
export { HRBoardPackPanel } from '../../board-pack';

// ── Tier 3: Deprecated ──
/**
 * @deprecated Use HRExecutiveDashboard instead.
 * Kept for backward compatibility — will be removed in Sprint 4.
 */
export { HRDashboardPanel } from '../../HRDashboardPanel';

// ── Predictive Audit (S8.5) ──
export { PredictiveAuditPanel } from './PredictiveAuditPanel';
