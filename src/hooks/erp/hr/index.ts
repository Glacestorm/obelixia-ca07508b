/**
 * ERP HR Hooks - Barrel Export
 * Fase 7: Total Rewards Module
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
