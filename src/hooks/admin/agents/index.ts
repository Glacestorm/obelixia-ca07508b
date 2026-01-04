// AI Agents V2
export { useAIAgentsV2 } from './useAIAgentsV2';
export type { 
  AIAgent, 
  DealCoachingResult, 
  ChurnPreventionResult, 
  RevenueOptimizationResult,
  OrchestrationResult,
  AgentContext 
} from './useAIAgentsV2';

// ERP Module Agents
export { useERPModuleAgents, DOMAIN_CONFIG, MODULE_AGENT_CONFIG } from './useERPModuleAgents';
export type {
  AgentDomain,
  ModuleAgentType,
  ModuleAgent,
  DomainAgent,
  SupervisorStatus,
  SupervisorInsight,
  AgentCommunication,
} from './erpAgentTypes';
export { AUTONOMOUS_ACTIONS } from './erpAgentConfig';
export type { AutonomousAction } from './erpAgentConfig';

// CRM Module Agents - Ultra-especializados 2025-2027
export { useCRMAgents, CRM_MODULE_CONFIG } from './useCRMAgents';
export type {
  CRMModuleType,
  CRMModuleAgent,
  SupervisorGeneralConfig,
  AgentDashboardStats,
  CRMAgentMetrics,
  AgentConversation,
  AgentAction,
  SupervisorPrediction,
} from './crmAgentTypes';
export { CRM_AUTONOMOUS_ACTIONS } from './crmAgentConfig';
export type { CRMAutonomousAction } from './crmAgentConfig';
