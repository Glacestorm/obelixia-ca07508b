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

// Payroll Engine — Motor global de nómina
export { usePayrollEngine } from './usePayrollEngine';
export type {
  PayrollPeriod,
  PayrollRecord,
  PayrollLine,
  PayrollConceptTemplate,
  PayrollSimulation,
  PayrollAuditEntry,
  PreCloseValidation,
  PeriodStatus,
  PayrollRecordStatus,
  PayrollLineType,
  PayrollLineCategory,
  SimulationType,
} from './usePayrollEngine';

// Localización España (G2)
export { useESLocalization } from './useESLocalization';
export type {
  ESEmployeeLaborData,
  ESIRPFTramo,
  ESSSBase,
  ESContractType,
  IRPFCalculationParams,
  IRPFResult,
  SSContributionResult,
  SettlementParams,
  SettlementResult,
} from './useESLocalization';

// Motor de Nómina España (ESP)
export { useESPayrollBridge } from './useESPayrollBridge';
export type {
  ESPayrollConceptDef,
  ESPayrollInput,
  ESPayrollCalculation,
  ESPayrollLine,
  ESPayrollSummary,
  ESPreCloseValidation,
  ESReportData,
} from './useESPayrollBridge';

// Global Mobility / Expatriates
export { useGlobalMobility } from './useGlobalMobility';
export type {
  MobilityAssignment,
  MobilityDocument,
  MobilityCostProjection,
  MobilityAuditEntry,
  MobilityStats,
  AssignmentType,
  AssignmentStatus,
  CompensationApproach,
  RiskLevel,
  DocumentType,
  DocumentStatus,
  AllowancePackage,
  AssignmentFilters,
} from './useGlobalMobility';

// Official Integrations Hub (G4)
export { useOfficialIntegrationsHub } from './useOfficialIntegrationsHub';
export type {
  IntegrationAdapter,
  OfficialSubmission,
  SubmissionReceipt,
  SubmissionFilters,
  HubStats,
  SubmissionStatus,
  SubmissionPriority,
  ReceiptType,
} from './useOfficialIntegrationsHub';

// Expediente Documental & Compliance (DC)
export { useHRDocumentExpedient } from './useHRDocumentExpedient';

// Tasks Engine (WT)
export { useHRTasksEngine } from './useHRTasksEngine';
export type {
  HRTask,
  TaskFilters,
  TaskStats,
  TaskCreateData,
  TaskCategory,
  TaskSourceType,
  TaskStatus,
  TaskPriority,
  BulkActionType,
} from './useHRTasksEngine';
export type {
  DocumentCategory,
  DocumentSource,
  ConsentType as HRConsentType,
  ConsentStatus as HRConsentStatus,
  AccessAction,
  EmployeeDocument,
  DocumentVersion,
  DocumentAccessLog,
  DocumentComment,
  HRConsent,
  RetentionPolicy,
  DocumentFilters,
  ExpedientStats,
} from './useHRDocumentExpedient';
