/**
 * ERP HR Hooks - Barrel Export
 * Fases 7-8: Total Rewards & Contingent Workforce
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
