/**
 * Legal Analytics - Barrel exports
 * Phase 9: Predictive Analytics and Autonomous Copilot
 */

export { LegalPredictiveAnalyticsPanel } from './LegalPredictiveAnalyticsPanel';
export { LegalAutonomousCopilotPanel } from './LegalAutonomousCopilotPanel';

// Re-export types from hooks for convenience
export type {
  LitigationPrediction,
  LegalCostEstimate,
  JurisprudenceTrend
} from '@/hooks/admin/legal/usePredictiveLegalAnalytics';

export type {
  AutonomyLevel,
  SituationAnalysis,
  SuggestedAction,
  TaskExecution
} from '@/hooks/admin/legal/useLegalAutonomousCopilot';
