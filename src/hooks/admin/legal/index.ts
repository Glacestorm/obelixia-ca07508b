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
