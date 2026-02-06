/**
 * Enterprise Components - Barrel Export
 * Fase 11 - Enterprise SaaS 2025-2026
 */

export { ComplianceMonitorPanel } from './ComplianceMonitorPanel';
export { CommandCenterPanel } from './CommandCenterPanel';
export { WorkflowEnginePanel } from './WorkflowEnginePanel';
export { BusinessIntelligencePanel } from './BusinessIntelligencePanel';
export { ExecutiveMetricsGrid } from './ExecutiveMetricsGrid';
export { RealTimeAlertsPanel } from './RealTimeAlertsPanel';
export { EnterpriseActivityFeed } from './EnterpriseActivityFeed';

// Fase 10: Dashboard Analítica Unificada Cross-Module
export { CrossModuleAnalyticsPanel } from './CrossModuleAnalyticsPanel';

// Hooks
export { useCrossModuleAnalytics } from '@/hooks/admin/enterprise/useCrossModuleAnalytics';
export type {
  ERPModuleId,
  ModuleKPI,
  CrossModuleCorrelation,
  CrossModuleAlert,
  UnifiedPrediction,
  ModuleSummary,
  CrossModuleInsight,
  ExecutiveSummary,
  CrossModuleContext
} from '@/hooks/admin/enterprise/useCrossModuleAnalytics';
