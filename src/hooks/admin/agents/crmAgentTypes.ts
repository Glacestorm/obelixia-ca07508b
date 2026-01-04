/**
 * Tipos e interfaces para el sistema de agentes CRM ultra-especializados
 * Tendencias 2025-2027: Multi-agent orchestration, Agentic AI, Autonomous Decision Making
 */

// === TIPOS DE MÓDULOS CRM ===

export type CRMModuleType = 
  | 'leads'           // Gestión de leads
  | 'opportunities'   // Oportunidades y deals
  | 'accounts'        // Gestión de cuentas
  | 'contacts'        // Gestión de contactos
  | 'campaigns'       // Campañas de marketing
  | 'pipeline'        // Pipeline de ventas
  | 'quotes'          // Presupuestos y ofertas
  | 'contracts'       // Contratos
  | 'customer_success'// Customer Success
  | 'support'         // Soporte al cliente
  | 'analytics'       // Analytics CRM
  | 'automation';     // Automatización

// === INTERFACES DE AGENTES CRM ===

export interface CRMAgentCapability {
  id: string;
  name: string;
  description: string;
  isAutonomous: boolean;
  confidenceRequired: number;
  executionType: 'realtime' | 'batch' | 'scheduled';
}

export interface CRMAgentMetrics {
  // Métricas de rendimiento
  tasksCompleted: number;
  tasksInProgress: number;
  successRate: number;
  avgResponseTimeMs: number;
  errorRate: number;
  
  // Métricas de impacto
  conversionImpact: number;
  revenueImpacted: number;
  timesSaved: number; // en horas
  
  // Métricas de IA
  predictionsAccuracy: number;
  recommendationsAccepted: number;
  autonomousDecisions: number;
  learningScore: number;
}

export interface CRMModuleAgent {
  id: string;
  moduleType: CRMModuleType;
  name: string;
  description: string;
  systemPrompt: string;
  
  // Estado
  status: 'active' | 'idle' | 'processing' | 'learning' | 'error' | 'paused';
  
  // Configuración
  capabilities: CRMAgentCapability[];
  confidenceThreshold: number;
  executionMode: 'autonomous' | 'supervised' | 'manual';
  priority: 1 | 2 | 3 | 4 | 5;
  maxActionsPerHour: number;
  
  // Métricas
  metrics: CRMAgentMetrics;
  healthScore: number;
  
  // Historial
  lastActivity: string;
  lastLearning: string;
  conversationHistory: AgentConversation[];
  recentActions: AgentAction[];
  
  // Conexiones con otros agentes
  collaboratingAgents: string[];
  escalationAgentId?: string;
}

export interface AgentConversation {
  id: string;
  timestamp: string;
  role: 'user' | 'agent' | 'supervisor';
  content: string;
  context?: string;
  actionTaken?: string;
  confidenceScore?: number;
}

export interface AgentAction {
  id: string;
  timestamp: string;
  type: 'analyze' | 'recommend' | 'execute' | 'escalate' | 'learn';
  description: string;
  targetEntityType?: string;
  targetEntityId?: string;
  status: 'completed' | 'pending' | 'failed';
  result?: Record<string, unknown>;
  confidenceScore: number;
  wasAutonomous: boolean;
}

// === INTERFACES DEL SUPERVISOR GENERAL ===

export interface SupervisorGeneralConfig {
  id: string;
  name: string;
  status: 'running' | 'coordinating' | 'analyzing' | 'idle';
  autonomousMode: boolean;
  autonomousIntervalMs: number;
  
  // Coordinación
  registeredAgents: string[]; // IDs de todos los agentes (ERP + CRM)
  activeDomains: string[];
  
  // Configuración de decisiones
  globalConfidenceThreshold: number;
  maxConcurrentOperations: number;
  escalationPolicy: 'immediate' | 'batched' | 'smart';
  
  // Métricas globales
  systemHealth: number;
  resourceUtilization: number;
  totalAgentsManaged: number;
  decisionsToday: number;
  conflictsResolved: number;
  
  // Aprendizaje
  learningProgress: number;
  crossAgentPatterns: CrossAgentPattern[];
  
  // Insights predictivos
  predictiveInsights: SupervisorPrediction[];
}

export interface CrossAgentPattern {
  id: string;
  pattern: string;
  involvedAgents: string[];
  frequency: number;
  lastOccurrence: string;
  impact: 'positive' | 'negative' | 'neutral';
  recommendation?: string;
}

export interface SupervisorPrediction {
  id: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'trend';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedAgents: string[];
  probability: number;
  estimatedImpact: number; // en €
  recommendedAction: string;
  deadline?: string;
  timestamp: string;
}

export interface SupervisorCommand {
  id: string;
  timestamp: string;
  commandType: 'instruction' | 'query' | 'configuration' | 'coordination';
  targetAgentId?: string; // null = broadcast a todos
  content: string;
  status: 'pending' | 'executed' | 'failed';
  response?: string;
  executionTimeMs?: number;
}

// === INTERFACES DE COMUNICACIÓN ===

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  messageType: 'request' | 'response' | 'escalation' | 'sync' | 'learning';
  priority: 'low' | 'medium' | 'high' | 'critical';
  content: string;
  payload?: Record<string, unknown>;
  requiresResponse: boolean;
  responseDeadlineMs?: number;
  status: 'sent' | 'received' | 'processed' | 'timeout';
  timestamp: string;
}

export interface AgentCollaboration {
  id: string;
  initiatorAgentId: string;
  participantAgentIds: string[];
  objective: string;
  status: 'active' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  outcome?: string;
  sharedLearnings?: string[];
}

// === INTERFACES DE DASHBOARD ===

export interface AgentDashboardStats {
  // Resumen global
  totalAgents: number;
  activeAgents: number;
  processingAgents: number;
  errorAgents: number;
  
  // Métricas agregadas
  avgHealthScore: number;
  avgSuccessRate: number;
  totalTasksToday: number;
  totalDecisionsAutonomous: number;
  
  // Impacto de negocio
  totalRevenueImpacted: number;
  totalTimeSaved: number;
  conversionImprovement: number;
  
  // Tendencias
  healthTrend: 'improving' | 'stable' | 'declining';
  performanceTrend: 'improving' | 'stable' | 'declining';
  
  // Por módulo CRM
  moduleStats: Record<CRMModuleType, {
    status: string;
    healthScore: number;
    tasksCompleted: number;
  }>;
}

// === INTERFACES DE API ===

export interface CRMAgentExecutionResult {
  success: boolean;
  agentId: string;
  moduleType: CRMModuleType;
  action: string;
  result?: Record<string, unknown>;
  recommendations?: string[];
  nextActions?: string[];
  confidenceScore: number;
  executionTimeMs: number;
  error?: string;
}

export interface SupervisorOrchestrationCommand {
  action: 'coordinate' | 'optimize' | 'learn' | 'report' | 'configure';
  scope: 'all' | 'crm' | 'erp' | 'specific';
  targetAgents?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  objective: string;
  parameters?: Record<string, unknown>;
}

export interface AgentInstructionRequest {
  agentId: string;
  instruction: string;
  context?: Record<string, unknown>;
  expectResponse: boolean;
  maxResponseTimeMs?: number;
}

export interface AgentInstructionResponse {
  success: boolean;
  agentId: string;
  response: string;
  actionsTaken?: AgentAction[];
  recommendations?: string[];
  confidenceScore: number;
  executionTimeMs: number;
}
