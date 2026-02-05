/**
 * Legal Gateway - Barrel exports
 * Phase 10: Enhanced Validation Gateway, Cross-Module Orchestration, Smart Contracts & CLM
 */

export { LegalValidationGatewayEnhancedPanel } from './LegalValidationGatewayEnhancedPanel';
export { CrossModuleOrchestratorPanel } from './CrossModuleOrchestratorPanel';
export { SmartLegalContractsPanel } from './SmartLegalContractsPanel';
export { AdvancedCLMPanel } from './AdvancedCLMPanel';

// Re-export types from hooks for convenience
export type {
  EnhancedRiskLevel,
  EnhancedValidationResult,
  AuditTrailResult,
  BlockingPolicy,
  ComplianceMatrix
} from '@/hooks/admin/legal';

export type {
  Orchestration,
  SharedContextResult,
  AgentCoordination,
  ConflictResolution,
  DependencyAnalysis,
  ImpactAnalysis
} from '@/hooks/admin/legal';

export type {
  SmartContract,
  ClauseExecution,
  Dispute,
  ExecutionSimulation,
  ContractAudit,
  ObligationsStatus
} from '@/hooks/admin/legal';

export type {
  CLMContract,
  ClauseLibrary,
  NegotiationSession,
  Playbook,
  ApprovalWorkflow,
  SignaturePreparation,
  VersionComparison
} from '@/hooks/admin/legal';