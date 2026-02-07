/**
 * AI Hybrid Hooks - Barrel Export
 * Sistema de IA Híbrida Universal (Local + Externa)
 */

export { useAIProviders } from './useAIProviders';
export type {
  AIProvider,
  AIModel,
  PricingInfo,
  ProviderCredential,
  ConnectionTestResult,
} from './useAIProviders';

export { useDataPrivacyGateway } from './useDataPrivacyGateway';
export type {
  DataClassification,
  ClassificationRule,
  FieldPattern,
  ClassificationResult,
  AnonymizationResult,
} from './useDataPrivacyGateway';

export { useAICredits } from './useAICredits';
export type {
  CreditTransactionType,
  AlertSeverity,
  CreditBalance,
  CreditTransaction,
  UsageRecord,
  UsageStats,
  CostEstimate,
  CreditAlert,
} from './useAICredits';

export { useHybridAI } from './useHybridAI';
export type {
  RoutingMode,
  HybridAIMessage,
  HybridAIContext,
  RoutingDecision,
  HybridAIOptions,
} from './useHybridAI';

export { useHybridAIIntegration } from './useHybridAIIntegration';
export type {
  EntityType,
  AnalysisType,
  AnalysisRequest,
  AnalysisResult,
  BatchAnalysisResult,
} from './useHybridAIIntegration';

export { useAIAnalytics } from './useAIAnalytics';
export type {
  UsageMetric,
  MetricsSummary,
  UsageOverTime,
  ProviderDistribution,
  ModelRanking,
  PrivacyStats,
  SavingsEstimate,
  AnalyticsDashboard,
  ProviderStats,
  ModelStats,
  PrivacyIncident,
  PrivacySummary,
  AnalyticsPeriod,
} from './useAIAnalytics';
