// Agentes V2
export { useAIAgentsV2 } from './useAIAgentsV2';
export type { 
  AIAgent, 
  DealCoachingResult, 
  ChurnPreventionResult, 
  RevenueOptimizationResult,
  OrchestrationResult,
  AgentContext 
} from './useAIAgentsV2';

// Agentes ERP por Módulo
export { useERPModuleAgents, DOMAIN_CONFIG, MODULE_AGENT_CONFIG } from './useERPModuleAgents';
export type {
  AgentDomain,
  ModuleAgentType,
  ModuleAgent,
  DomainAgent,
  SupervisorStatus,
  SupervisorInsight,
  AgentCommunication
} from './erpAgentTypes';

// Sistema de Ayuda de Agentes
export { useAgentHelpSystem } from './useAgentHelpSystem';
export * from './agentHelpTypes';

// Tipos completos
export * from './erpAgentTypes';

// Configuración
export { AUTONOMOUS_ACTIONS, getDomainAgentCount, getModuleAgentCount, getAgentsByDomain } from './erpAgentConfig';
