/**
 * Tipos e interfaces para el sistema de agentes ERP
 */

// === TIPOS DE DOMINIOS Y MÓDULOS ===

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

// === INTERFACES DE AGENTES ===

export interface ModuleAgent {
  id: string;
  domain: AgentDomain;
  type: ModuleAgentType;
  name: string;
  description: string;
  status: 'active' | 'idle' | 'analyzing' | 'error' | 'paused';
  capabilities: string[];
  metrics: Record<string, number | string>;
  lastActivity: string;
  healthScore: number;
  confidenceThreshold: number;
  executionMode: 'autonomous' | 'supervised' | 'manual';
  parentAgentId?: string;
  priority: number;
}

export interface DomainAgent {
  id: string;
  domain: AgentDomain;
  name: string;
  description: string;
  status: 'active' | 'coordinating' | 'idle' | 'error';
  moduleAgents: ModuleAgent[];
  metrics: {
    totalActions: number;
    successRate: number;
    avgResponseTime: number;
    activeModules: number;
  };
  lastCoordination: string;
}

export interface SupervisorStatus {
  status: 'running' | 'idle' | 'analyzing' | 'coordinating';
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

export interface SupervisorInsight {
  id: string;
  type: 'optimization' | 'warning' | 'prediction' | 'recommendation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedDomains: AgentDomain[];
  suggestedAction?: string;
  confidence: number;
  timestamp: string;
}

export interface AgentCommunication {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: 'request' | 'response' | 'escalation' | 'coordination' | 'learning';
  payload: Record<string, unknown>;
  status: 'pending' | 'processed' | 'failed';
  timestamp: string;
}

// === INTERFACES DE CONFIGURACIÓN ===

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

// === INTERFACES DE RESPUESTA DE API ===

export interface AgentExecutionResult {
  success: boolean;
  agentType?: string;
  domain?: string;
  actions?: Array<{
    actionId: string;
    type: string;
    description: string;
    status: 'completed' | 'pending' | 'failed';
    result: Record<string, unknown>;
  }>;
  metrics?: {
    executionTime: number;
    confidenceScore: number;
    itemsProcessed: number;
  };
  recommendations?: string[];
  nextActions?: string[];
}

export interface DomainCoordinationResult {
  success: boolean;
  domain?: string;
  coordination?: {
    tasksDistributed: Array<{
      agentId: string;
      task: string;
      priority: number;
    }>;
    resourceOptimizations: string[];
    conflictsResolved: number;
    bottlenecksIdentified: string[];
  };
  metrics?: {
    efficiency: number;
    utilization: number;
    pendingTasks: number;
  };
  insights?: SupervisorInsight[];
}

export interface SupervisorOrchestrationResult {
  success: boolean;
  orchestration?: {
    actionsTaken: Array<{
      type: string;
      targetDomain: string;
      description: string;
      result: string;
    }>;
    crossDomainOptimizations: string[];
    resourceRebalancing: Record<string, unknown>;
    conflictsResolved: number;
    learningsApplied: string[];
  };
  insights?: SupervisorInsight[];
  systemStatus?: {
    overallHealth: number;
    resourceUtilization: number;
    activeOptimizations: number;
    pendingDecisions: number;
  };
  predictions?: Array<{
    type: string;
    probability: number;
    impact: string;
    recommendedAction: string;
  }>;
  rawContent?: string;
  parseError?: boolean;
}

export interface PredictiveInsightsResult {
  insights: SupervisorInsight[];
  systemTrends?: {
    performance: 'improving' | 'stable' | 'declining';
    utilizationTrend: number;
    predictedBottlenecks: string[];
  };
}
