/**
 * ERP HR Hooks - Barrel Export
 * Fases 7-9: Total Rewards, Contingent Workforce & Industry Templates
 */

// Hook principal Total Rewards (admin)
export { useHRTotalRewards } from './useHRTotalRewards';
export type {
  SalaryBand,
  Compensation,
  BenefitsPlan,
  BenefitsEnrollment,
  Recognition,
  RecognitionProgram,
  RewardsStatement,
  CompensationAnalytics,
  TotalRewardsContext
} from './useHRTotalRewards';

// Hook simplificado para empleado
export { useTotalRewards } from './useTotalRewards';
export type {
  CompensationComponent,
  TotalRewardsSummary
} from './useTotalRewards';

// Fase 8: Gestión de Workforce Contingente (Gig Economy)
export { useHRContingentWorkforce } from './useHRContingentWorkforce';
export type {
  ContingentWorker,
  ContingentContract,
  ProjectAssignment,
  TimeEntry,
  ContingentInvoice,
  ComplianceCheck,
  ContingentWorkforceStats,
  AIComplianceAnalysis,
  ContingentWorkerType,
  ContingentWorkerStatus,
  ContractType,
  PaymentTerms,
  ComplianceRiskLevel
} from './useHRContingentWorkforce';

// Fase 9: Industry Cloud Templates
export { useHRIndustryTemplates } from './useHRIndustryTemplates';
export type {
  IndustryCategory,
  TemplateType,
  TemplateStatus,
  IndustryTemplate,
  TemplateVariable,
  ComplianceRequirement,
  IndustryProfile,
  CollectiveAgreement,
  TemplateApplication,
  IndustryTemplateStats,
  AITemplateRecommendation
} from './useHRIndustryTemplates';

// Fase 11: Gestión de Fuerza Laboral Gig/Contingent
export { useGigWorkforce } from './useGigWorkforce';
export type {
  ContractorType,
  ContractorStatus,
  PaymentType,
  ComplianceStatus,
  GigContractor,
  GigProject,
  GigTimeEntry,
  GigInvoice,
  GigComplianceDocument,
  GigWorkforceAnalytics,
  GigAIInsight,
  GigWorkforceContext
} from './useGigWorkforce';

// Fase G1: Country Registry & Policy Engine
export { useCountryRegistry } from './useCountryRegistry';
export type {
  CountryRegistryEntry,
  CountryPolicy,
  EmployeeExtension,
  CountryRegistryStats,
  ComplianceAnalysis
} from './useCountryRegistry';
