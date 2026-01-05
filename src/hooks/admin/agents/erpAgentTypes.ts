/**
 * Tipos para el sistema de agentes ERP
 * Arquitectura híbrida: Supervisor → Agentes de Dominio → Sub-agentes de Módulo
 */

// === TIPOS DE AGENTES ===

export type AgentDomain = 'financial' | 'crm_cs' | 'compliance' | 'operations' | 'hr' | 'analytics';

export type ModuleAgentType = 
  // Financiero
  | 'accounting' | 'treasury' | 'invoicing' | 'collections' | 'cashflow'
  // CRM & CS
  | 'sales' | 'customer_success' | 'pipeline' | 'churn_prevention' | 'upsell'
  // Compliance
  | 'gdpr' | 'psd2' | 'esg' | 'audit' | 'kyc_aml' | 'risk'
  // Operaciones
  | 'inventory' | 'procurement' | 'logistics' | 'maintenance' | 'scheduling'
  // RRHH
  | 'payroll' | 'recruitment' | 'training' | 'performance'
  // Analytics
  | 'reporting' | 'forecasting' | 'anomaly_detection';

export type ModuleAgentStatus = 'active' | 'idle' | 'analyzing' | 'error' | 'paused';
export type DomainAgentStatus = 'active' | 'coordinating' | 'idle' | 'error';
export type SupervisorStatusType = 'running' | 'idle' | 'analyzing' | 'coordinating';
export type InsightType = 'optimization' | 'warning' | 'prediction' | 'recommendation';
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';
export type ExecutionMode = 'autonomous' | 'supervised' | 'manual';
export type CommunicationType = 'request' | 'response' | 'escalation' | 'coordination' | 'learning';
export type CommunicationStatus = 'pending' | 'processed' | 'failed';

// === INTERFACES ===

export interface ModuleAgent {
  id: string;
  domain: AgentDomain;
  type: ModuleAgentType;
  name: string;
  description: string;
  status: ModuleAgentStatus;
  capabilities: string[];
  metrics: Record<string, number | string>;
  lastActivity: string;
  healthScore: number;
  confidenceThreshold: number;
  executionMode: ExecutionMode;
  parentAgentId?: string;
  priority: number;
}

export interface DomainAgentMetrics {
  totalActions: number;
  successRate: number;
  avgResponseTime: number;
  activeModules: number;
}

export interface DomainAgent {
  id: string;
  domain: AgentDomain;
  name: string;
  description: string;
  status: DomainAgentStatus;
  moduleAgents: ModuleAgent[];
  metrics: DomainAgentMetrics;
  lastCoordination: string;
}

export interface SupervisorInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  affectedDomains: AgentDomain[];
  suggestedAction?: string;
  confidence: number;
  timestamp: string;
}

export interface SupervisorStatus {
  status: SupervisorStatusType;
  activeDomains: number;
  activeAgents: number;
  pendingDecisions: number;
  conflictsResolved: number;
  lastOptimization: string;
  systemHealth: number;
  resourceUtilization: number;
  learningProgress: number;
  predictiveInsights: SupervisorInsight[];
  autonomousMode: boolean;
  autonomousIntervalMs: number;
}

export interface AgentCommunication {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: CommunicationType;
  payload: Record<string, unknown>;
  status: CommunicationStatus;
  timestamp: string;
}

// === CONFIGURACIÓN TYPES ===

export interface DomainConfig {
  name: string;
  color: string;
  icon: string;
  description: string;
  moduleTypes: ModuleAgentType[];
}

export interface ModuleAgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  defaultPriority: number;
}

// === EDGE FUNCTION TYPES ===

export interface AgentExecuteParams {
  agentType: ModuleAgentType;
  domain: AgentDomain;
  context: Record<string, unknown>;
  capabilities: string[];
}

export interface CoordinateDomainParams {
  domain: AgentDomain;
  objective: string;
  moduleAgents: Array<{
    id: string;
    type: string;
    status: string;
    capabilities: string[];
  }>;
}

export interface SupervisorOrchestratParams {
  objective: string;
  priority: InsightPriority;
  domains: Array<{
    id: string;
    domain: string;
    status: string;
    activeModules: number;
  }>;
}

export interface AgentConfigUpdate {
  confidenceThreshold?: number;
  executionMode?: ExecutionMode;
  priority?: number;
}
