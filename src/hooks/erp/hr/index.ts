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
  ESCalculationTrace,
  PayrollDiff,
  DiffVsPrevious,
  ReviewAction,
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

// Catálogo Documental Operativo (V2-ES.4)
export { useHRDocumentCatalog } from './useHRDocumentCatalog';
export type {
  HRDocumentType,
  HRDocumentCategory,
} from './useHRDocumentCatalog';

// Checklist documental por proceso (V2-ES.4)
export { useHRProcessDocRequirements } from './useHRProcessDocRequirements';
export type {
  ProcessDocRequirement,
  EnrichedCompleteness,
} from './useHRProcessDocRequirements';

// Reglas de plazos documentales (V2-ES.4)
export { useHRDocumentDueRules } from './useHRDocumentDueRules';
export type {
  DocumentDueRule,
  DueRuleType,
  DueSeverity,
  DueUrgency,
  DueDateResult,
} from './useHRDocumentDueRules';

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
  RelatedEntityType,
  EmployeeDocument,
  DocumentVersion,
  DocumentAccessLog,
  DocumentComment,
  HRConsent,
  RetentionPolicy,
  DocumentFilters,
  ExpedientStats,
} from './useHRDocumentExpedient';

// V2-ES.4 Paso 2: Cola de acciones documentales
export { useHRDocActionQueue, computePendingActions, enrichAction } from './useHRDocActionQueue';
export type {
  DocActionType,
  DocActionPriority,
  DocActionSeverity,
  DocActionStatus,
  DocActionSource,
  DocAction,
  DocActionSummary,
  PendingAction,
  EnrichedDocAction,
} from './useHRDocActionQueue';

// V2-ES.4 Paso 2.2: Motor de alertas y severidad (re-export from component layer)
export { computeExpedientAlerts } from '@/components/erp/hr/shared/expedientAlertEngine';
export type {
  AlertSeverity,
  ExpedientAlert,
  ExpedientAlertSummary,
} from '@/components/erp/hr/shared/expedientAlertEngine';

// People Analytics + IA (PA)
export { usePeopleAnalytics } from './usePeopleAnalytics';
export type {
  PADomain,
  PARoleView,
  PAFilters,
  PAKpi,
  PAHROverview,
  PAPayrollAnalytics,
  PAAbsenteeismAnalytics,
  PAComplianceRisks,
  PAEquityMetrics,
  PAAlert,
  PAInsight,
  PACopilotMessage,
} from './usePeopleAnalytics';

// V2-ES.4 Paso 3.2: Storage real para expediente documental
export { useHRDocumentStorage } from './useHRDocumentStorage';
export {
  HR_DOC_BUCKET,
  HR_DOC_MAX_SIZE_BYTES,
  HR_DOC_ALLOWED_MIME_TYPES,
  HR_DOC_ALLOWED_EXTENSIONS,
  buildStoragePath,
  computeFileChecksum,
  validateFile,
  formatFileSize,
  isPreviewableMime,
  getFileAttachmentStatus,
} from './useHRDocumentStorage';
export type {
  StorageErrorCode,
  StorageError,
  StorageResult,
  UploadResult,
  FileAttachmentStatus,
} from './useHRDocumentStorage';
