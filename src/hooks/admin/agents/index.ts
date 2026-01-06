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

// Tipos completos
export * from './erpAgentTypes';

// Configuración
export { AUTONOMOUS_ACTIONS, getDomainAgentCount, getModuleAgentCount, getAgentsByDomain } from './erpAgentConfig';

// Sistema de Ayuda de Agentes (FASE 1)
export { useAgentHelpSystem } from './useAgentHelpSystem';
export type {
  AgentHelpContent,
  AgentHelpSection,
  AgentHelpExample,
  LearnedKnowledge,
  ChatMessage,
  AgentHelpConfig,
  AgentType as HelpAgentType,
  RecursionGuard,
  RATE_LIMIT,
  AGENT_HELP_REGISTRY,
} from './agentHelpTypes';

// Sistema de Registro Dinámico de Módulos
export { useDynamicModuleRegistry, AGENT_TEMPLATES } from './dynamicModuleRegistry';
export type {
  ModuleDomain,
  AgentCapabilityLevel,
  DynamicModuleDefinition,
  DynamicAgentDefinition,
  AgentMetrics,
  SupervisorRegistration,
  RegistryEvent
} from './dynamicModuleRegistry';

// Sistema de Notificaciones Push de Agentes CRM
export { useCRMAgentNotifications } from './useCRMAgentNotifications';
export type {
  CRMAgentNotification,
  NotificationType,
  NotificationStats
} from './useCRMAgentNotifications';

// Sistema de Notificaciones Push de Agentes ERP
export { useERPAgentNotifications } from './useERPAgentNotifications';
export type {
  ERPAgentNotification,
  ERPNotificationType,
  ERPNotificationPriority,
  ERPNotificationStats,
  ERPNotificationPreferences
} from './useERPAgentNotifications';

// Sistema de IA Real para Agentes ERP
export { useERPAgentAI } from './useERPAgentAI';
export type {
  DomainAnalysis,
  MetricPrediction,
  OrchestrationPlan,
  StrategicInsight,
  AgentRanking,
  LearningRecord,
  ChatMessage as AIAgentChatMessage
} from './useERPAgentAI';

// Sistema de IA Real para Agentes CRM
export { useCRMAgentAI } from './useCRMAgentAI';
export type {
  CRMDomainAnalysis,
  LeadScoreResult,
  ChurnPrediction,
  UpsellOpportunity,
  PipelineOptimization,
  CRMStrategicInsight,
  CRMAgentRanking,
  CRMLearningRecord,
  CRMChatMessage
} from './useCRMAgentAI';
