/**
 * Legal Hooks - Barrel Export
 * Fase 3-10: Sistema de hooks para el Módulo Jurídico Enterprise
 */

export { useLegalAdvisor } from './useLegalAdvisor';
export type {
  LegalJurisdiction,
  LegalAdvice,
  ValidationResult,
  ContractAnalysis,
  ComplianceReport,
  LegalPrecedent,
  RiskAssessment,
  AgentAction,
  LegalContext
} from './useLegalAdvisor';

export { useLegalCompliance } from './useLegalCompliance';
export type { ComplianceCheck, ComplianceStats } from './useLegalCompliance';

export { useLegalKnowledge } from './useLegalKnowledge';
export type { LegalKnowledgeItem, KnowledgeSearchResult, KnowledgeStats } from './useLegalKnowledge';

export { useLegalDocuments } from './useLegalDocuments';
export type { LegalTemplate, GeneratedDocument } from './useLegalDocuments';

export { useLegalAgentIntegration } from './useLegalAgentIntegration';
export type { AgentQuery, ValidationLog, AgentStats } from './useLegalAgentIntegration';

// Fase 10: Legal Validation Gateway
export { useLegalValidationGateway } from './useLegalValidationGateway';
export type {
  ValidationRiskLevel,
  ValidationStatus,
  ModuleType,
  ValidationRequest,
  ValidationRule,
  ModuleConnectionStatus,
  GatewayStats,
  ValidationContext,
  ValidationResult as GatewayValidationResult
} from './useLegalValidationGateway';

// Fase 8: Legal Entity & IP Management
export { useLegalEntityManagement } from './useLegalEntityManagement';
export type {
  LegalEntity,
  EntityStructureAnalysis,
  GovernanceAssessment,
  PowerOfAttorney,
  PowersAnalysis,
  IPAsset,
  IPPortfolioAnalysis,
  TrademarkAlert,
  TrademarkMonitoring,
  DiscoveryDocument,
  EDiscoveryResults,
  LitigationHold,
  LitigationHoldManagement,
  CorporateEvent,
  CorporateCalendar,
  EntityRiskAssessment
} from './useLegalEntityManagement';

// Fase 9: AI Autonomous Agents & Predictive Legal Analytics
export { usePredictiveLegalAnalytics } from './usePredictiveLegalAnalytics';
export type {
  LitigationPrediction,
  LegalCostEstimate,
  JurisprudenceTrend
} from './usePredictiveLegalAnalytics';

export { useLegalAutonomousCopilot } from './useLegalAutonomousCopilot';
export type {
  AutonomyLevel,
  SituationAnalysis,
  SuggestedAction,
  TaskExecution
} from './useLegalAutonomousCopilot';

// Fase 10: Legal Validation Gateway Enhanced & Cross-Module Orchestration
export { useLegalValidationGatewayEnhanced } from './useLegalValidationGatewayEnhanced';
export type {
  RiskLevel as EnhancedRiskLevel,
  ValidationStatus as EnhancedValidationStatus,
  ModuleType as EnhancedModuleType,
  ValidationRule as EnhancedValidationRule,
  RuleCondition,
  RuleAction,
  ComplianceCheck as EnhancedComplianceCheck,
  EnhancedValidationResult,
  AppliedRule,
  AuditData,
  AuditEntry,
  AuditTrailResult,
  BlockingPolicy,
  RiskAssessment as EnhancedRiskAssessment,
  RiskDimension,
  RiskFactor,
  RiskRecommendation,
  ComplianceGap,
  ComplianceMatrix,
  JurisdictionCompliance,
  RegulationStatus,
  ModuleCompliance,
  ComplianceDeadline
} from './useLegalValidationGatewayEnhanced';

export { useCrossModuleOrchestrator } from './useCrossModuleOrchestrator';
export type {
  ModuleType as OrchestratorModuleType,
  WorkflowType,
  StepStatus,
  OrchestrationStatus,
  OrchestrationRequest,
  WorkflowStep,
  Workflow,
  SharedContext,
  AgentResponse,
  Conflict,
  Orchestration,
  ModuleContextData,
  CrossReference,
  PendingSync,
  SharedContextResult,
  AgentCoordination,
  AgentInfo,
  CommunicationEntry,
  ConflictResolution,
  ConflictPosition,
  DependencyAnalysis,
  DependencyNode,
  DependencyEdge,
  Blocker,
  ImpactAnalysis,
  DirectImpact,
  CascadeImpact,
  FutureImpact,
  ImpactRecommendation
} from './useCrossModuleOrchestrator';

export { useSmartLegalContracts } from './useSmartLegalContracts';
export type {
  ClauseType,
  TriggerType,
  ActionType,
  ContractStatus as SmartContractStatus,
  DisputeStatus,
  SmartContract,
  ContractParty as SmartContractParty,
  ProgrammableClause,
  ClauseTrigger,
  ClauseCondition,
  ClauseAction,
  ContractObligation,
  ClauseExecution,
  ExecutionNotification,
  ConditionVerification,
  Dispute,
  DisputeAnalysis,
  ProposedResolution,
  ExecutionSimulation,
  SimulationScenario,
  ContractAudit,
  ObligationsStatus
} from './useSmartLegalContracts';

export { useAdvancedCLM } from './useAdvancedCLM';
export type {
  ContractStatus as CLMContractStatus,
  SignatureType,
  ApprovalStatus,
  Contract as CLMContract,
  ContractParty as CLMContractParty,
  ContractTerms,
  ContractSection,
  ContractClause,
  ClauseLibrary,
  LibraryClause,
  ClauseVariable,
  ClauseAlternative,
  NegotiationSession,
  NegotiationPosition,
  NegotiationAnalysis,
  NegotiationRecommendation,
  FallbackPosition,
  Playbook,
  ClauseStrategy,
  ApprovalWorkflow,
  ApprovalStep,
  Approver,
  SignaturePreparation,
  Signatory,
  VersionComparison,
  VersionChange,
  ObligationsExtraction,
  ContractRiskAnalysis
} from './useAdvancedCLM';
