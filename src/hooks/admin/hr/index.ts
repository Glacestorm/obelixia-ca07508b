/**
 * HR Hooks - Barrel Export
 * Módulo de Recursos Humanos Enterprise
 */

export { useHRIntegrationLog } from './useHRIntegrationLog';
export type {
  IntegrationType,
  IntegrationStatus,
  IntegrationLogEntry,
  IntegrationMetrics,
  CreateLogParams
} from './useHRIntegrationLog';

// Phase 1 - Legal Compliance Hooks
export { useHRWhistleblower } from './useHRWhistleblower';
export type { 
  WhistleblowerStatus, 
  WhistleblowerCategory, 
  WhistleblowerReport,
  ReportSubmission 
} from './useHRWhistleblower';

export { useHREquality } from './useHREquality';
export type { 
  EqualityPlanStatus, 
  EqualityPlan, 
  SalaryAudit, 
  HarassmentProtocol 
} from './useHREquality';

export { useHRTimeTracking } from './useHRTimeTracking';
export type { 
  EntryType, 
  EntrySource, 
  TimeEntry, 
  TimePolicy, 
  DisconnectionPolicy 
} from './useHRTimeTracking';

// Phase 2 - Talent Management Hooks
export { useHRTalentSkills } from './useHRTalentSkills';
export type {
  SkillGap,
  SkillStrength,
  SkillsAnalysis,
  DevelopmentAction,
  DevelopmentRecommendation,
  DevelopmentPlan,
  OpportunityMatch,
  SuccessionCandidate,
  CareerPath
} from './useHRTalentSkills';

// Phase 3 - Employee Experience & Wellbeing Hooks
export { useHRWellbeing } from './useHRWellbeing';
export type {
  WellbeingScore,
  WellbeingFactor,
  BurnoutRisk,
  WellbeingRecommendation,
  Survey,
  SurveyQuestion,
  SurveyResults,
  WellnessProgram,
  ProgramRecommendations,
  BurnoutAnalysis,
  WellnessPlan
} from './useHRWellbeing';

// Phase 4 - Contract Lifecycle Management Hooks
export { useHRContractLifecycle } from './useHRContractLifecycle';
export type {
  ContractParty,
  ContractRisk,
  ContractAnalysis,
  SuggestedClause,
  ClauseSuggestions,
  NegotiationProposal,
  NegotiationStrategy,
  VersionChange,
  VersionComparison,
  ContractObligation,
  ObligationsExtraction,
  ContractRiskItem,
  RiskAssessment,
  ContractAmendment
} from './useHRContractLifecycle';

// Phase 5 - Credenciales Blockchain y Copilotos IA Autónomos
export { useHRCredentials } from './useHRCredentials';
export type {
  CredentialProof,
  CredentialSubject,
  BlockchainRecord,
  DigitalCredential,
  IssuedCredential,
  VerificationResult,
  SelectiveProof,
  AuditEntry,
  CredentialsList,
  CredentialType
} from './useHRCredentials';

export { useHRAutonomousCopilot } from './useHRAutonomousCopilot';
export type {
  AutonomyLevel,
  ReviewFinding,
  AutoAction,
  DocumentReview,
  ProactiveAlert,
  ScheduledEvent,
  TaskDelegation,
  Prediction,
  Optimization
} from './useHRAutonomousCopilot';

// Phase 6 - Smart Contracts Legales
export { useHRSmartContracts } from './useHRSmartContracts';
export type {
  ContractType as SmartContractType,
  ContractStatus as SmartContractStatus,
  ConditionType,
  TriggerCategory,
  ContractParty as SmartContractParty,
  SmartContractClause,
  SmartContractCondition,
  SmartContract,
  ContractTrigger,
  SimulationResult,
  ComplianceReport as SmartContractComplianceReport,
  AuditTrail as SmartContractAuditTrail,
  ContractMonitoring,
  ClauseExecution
} from './useHRSmartContracts';

// Phase 7 - HR Analytics Predictivos y Workforce Intelligence
export { useHRAnalyticsIntelligence } from './useHRAnalyticsIntelligence';
export type {
  TurnoverRiskFactor,
  TurnoverRecommendation,
  TurnoverPrediction,
  TurnoverAnalysis,
  DepartmentState,
  HiringNeed,
  WorkforceProjection,
  WorkforceRiskArea,
  WorkforcePlan,
  RoleComparison,
  SalaryBenchmark,
  TalentDemandForecast,
  SuccessionRisk,
  ProductivityInsights,
  EngagementPrediction,
  SkillsGapForecast
} from './useHRAnalyticsIntelligence';

// Phase Enterprise - Architecture Foundations
export { useHREnterprise } from './useHREnterprise';
export type {
  HRLegalEntity,
  HRWorkCenter,
  HROrgUnit,
  HRWorkCalendar,
  HRCalendarEntry,
  HREnterpriseRole,
  HRPermission,
  HRAuditLogEntry,
  HRCriticalEvent,
  HREnterpriseStats
} from './useHREnterprise';

// Phase Enterprise - Workflow Engine
export { useHRWorkflowEngine } from './useHRWorkflowEngine';
export type {
  WorkflowDefinition, WorkflowStep, WorkflowInstance,
  WorkflowDecision, SLATracking, WorkflowStats
} from './useHRWorkflowEngine';

// Phase Enterprise - Compensation Suite
export { useHRCompensationSuite } from './useHRCompensationSuite';
export type {
  MeritCycle, MeritProposal, BonusCycle, SalaryLetter,
  PayEquitySnapshot, CompensationStats
} from './useHRCompensationSuite';

// Phase Enterprise - Talent Intelligence
export { useHRTalentIntelligence } from './useHRTalentIntelligence';
export type {
  SkillNode, CareerPath as TalentCareerPath, TalentPool, MentoringMatch,
  GigAssignment, TalentAnalysis, TalentStats
} from './useHRTalentIntelligence';

// Phase 5 - Compliance Enterprise
export { useHRComplianceEnterprise } from './useHRComplianceEnterprise';

// Phase 6 - Wellbeing Enterprise
export { useHRWellbeingEnterprise } from './useHRWellbeingEnterprise';
export type {
  WellbeingAssessment, WellbeingSurvey, WellnessProgram as WellnessEnterpriseProgram,
  BurnoutAlert, WellbeingKPI, WellbeingAIAnalysis, WellbeingStats
} from './useHRWellbeingEnterprise';
export type {
  CompliancePolicy, ComplianceAudit, ComplianceIncident,
  ComplianceTraining, ComplianceRiskAssessment, ComplianceKPI,
  RiskAnalysis, GapAnalysis, ComplianceStats
} from './useHRComplianceEnterprise';

// Phase 7 - ESG Social + Self-Service
export { useHRESGSelfService } from './useHRESGSelfService';
export type {
  ESGSocialMetric, ESGSocialKPI, SelfServiceRequest,
  FAQ, ESGSurvey, DocumentRequest, ESGSocialAnalysis
} from './useHRESGSelfService';

// Phase 8 - Copilot + Digital Twin
export { useHRCopilotTwin } from './useHRCopilotTwin';
export type {
  CopilotSession, CopilotAction, TwinSnapshot,
  TwinSimulation, CopilotKPI
} from './useHRCopilotTwin';
