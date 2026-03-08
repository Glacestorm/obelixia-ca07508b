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

// Premium Phase 1 - Enterprise Security, Data Masking & SoD
export { useHRSecurityGovernance } from './useHRSecurityGovernance';
export type {
  DataClassification, MaskingRule, SoDRule, SoDViolation,
  SecurityIncident, SecurityStats, SecurityAnalysis
} from './useHRSecurityGovernance';

// Premium Phase 2 - AI Governance Layer
export { useHRAIGovernance } from './useHRAIGovernance';
export type {
  AIModelStatus, AIRiskLevel, DecisionOutcome, BiasAuditType, PolicyType,
  AIModelEntry, AIDecision, AIBiasAudit, AIGovernancePolicy,
  AIExplainabilityReport, AIGovernanceStats, AIGovernanceAnalysis
} from './useHRAIGovernance';

// Premium Phase 3 - Workforce Planning & Scenario Studio
export { useHRWorkforcePlanning } from './useHRWorkforcePlanning';

// Premium Phase 4 - Fairness / Justice Engine
export { useHRFairnessEngine } from './useHRFairnessEngine';
export type {
  AnalysisType, MetricType, ProtectedAttribute, CaseType, CaseStatus,
  PayEquityAnalysis, FairnessMetric, JusticeCase, EquityActionPlan,
  FairnessStats, FairnessAnalysis
} from './useHRFairnessEngine';
export type {
  WorkforcePlan as StrategicWorkforcePlan, HeadcountModel, Scenario, SkillGapForecast,
  CostProjection, WorkforcePlanningStats, PlanDetail
} from './useHRWorkforcePlanning';

// Premium Phase 5 - Organizational Digital Twin
export { useHRDigitalTwin } from './useHRDigitalTwin';
export type {
  TwinInstance, TwinModuleSnapshot, TwinMetric,
  TwinExperiment, TwinAlert, TwinStats
} from './useHRDigitalTwin';

// Premium Phase 6 - Documentary Legal Engine
export { useHRLegalEngine } from './useHRLegalEngine';
export type {
  LegalTemplate, LegalClause, LegalContract,
  ComplianceCheck, LegalStats, LegalAIAnalysis
} from './useHRLegalEngine';

// Premium Phase 7 - CNAE-Specific HR Intelligence
export { useHRCNAEIntelligence } from './useHRCNAEIntelligence';
export type {
  CNAESectorProfile, CNAEComplianceRule, CNAEBenchmark,
  CNAERiskAssessment, CNAEIntelligenceStats, CNAEIntelligenceAnalysis
} from './useHRCNAEIntelligence';

// Premium Phase 8 - Role-Based Experience Ecosystem
export { useHRRoleExperience } from './useHRRoleExperience';
export type {
  RoleExperienceProfile, QuickAction, KPIWidget, RoleDashboard,
  DashboardWidget, RoleOnboardingStep, UserExperience, RoleAnalytics,
  RoleExperienceStats, RoleExperienceAnalysis
} from './useHRRoleExperience';

// P9.5 - Role Experience Activation (Active role for current user)
export { useHRActiveRoleExperience } from './useHRActiveRoleExperience';
export type { ActiveRoleExperience } from './useHRActiveRoleExperience';

// P9.6 - Centralized Premium Re-Seed
export { useHRPremiumReseed } from './useHRPremiumReseed';
export type { SeedPhase } from './useHRPremiumReseed';

// P9.7 - Premium Executive Dashboard
export { useHRPremiumDashboard } from './useHRPremiumDashboard';
export type { PremiumModuleStatus, PremiumKPI, PremiumDashboardData } from './useHRPremiumDashboard';

// P9.8 - Premium Alerts Engine
export { useHRPremiumAlerts } from './useHRPremiumAlerts';
export type { AlertSeverity, AlertSource, AlertStatus, PremiumAlert, AlertStats } from './useHRPremiumAlerts';

// P10 - Inter-Module Orchestration
export { useHROrchestration } from './useHROrchestration';
export type { ModuleKey, TriggerEvent, ActionType, OrchestrationRule, OrchestrationLogEntry } from './useHROrchestration';
export { useHROrchestrationEmitter } from './useHROrchestrationEmitter';
export type { EmitResult } from './useHROrchestrationEmitter';
export { useHROrchestrationBridge } from './useHROrchestrationBridge';
export type { ModuleEmitHelpers } from './useHROrchestrationBridge';

// P11 - Compliance Automation Engine
export { useHRComplianceAutomation } from './useHRComplianceAutomation';
export type { ComplianceFramework, ComplianceChecklistItem, ComplianceAudit as P11ComplianceAudit, ComplianceAlert, ComplianceStats as P11ComplianceStats } from './useHRComplianceAutomation';
