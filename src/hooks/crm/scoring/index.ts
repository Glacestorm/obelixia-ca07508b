/**
 * CRM Lead Scoring Hooks - 2026
 */

export { useCRMLeadScoring } from './useCRMLeadScoring';
export { useCRMAIInsights } from './useCRMAIInsights';

export type {
  ScoringModel,
  ScoringFactor,
  LeadScore,
  ContributingFactor,
  ScoreHistory,
  BehavioralEvent,
  ScoringRule,
  RuleCondition,
  ScoringStats
} from './useCRMLeadScoring';

export type {
  InsightType,
  InsightCategory,
  InsightPriority,
  InsightStatus,
  AIInsight,
  ActionItem,
  ImpactEstimate,
  PredictiveSignal,
  InsightFilters,
  InsightStats
} from './useCRMAIInsights';
