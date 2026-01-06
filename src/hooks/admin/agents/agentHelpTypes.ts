/**
 * Tipos para el Sistema de Ayuda de Agentes
 * Incluye protecciones anti-recursión
 */

// === ANTI-RECURSION TYPES ===

export interface RecursionGuard {
  isInitialized: boolean;
  lastFetchTime: number;
  fetchCount: number;
  isCurrentlyFetching: boolean;
}

export const RATE_LIMIT = {
  MIN_FETCH_INTERVAL_MS: 5000,
  MAX_FETCHES_PER_MINUTE: 10,
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_RESET_MS: 60000,
} as const;

export const createRecursionGuard = (): RecursionGuard => ({
  isInitialized: false,
  lastFetchTime: 0,
  fetchCount: 0,
  isCurrentlyFetching: false,
});

// === AGENT HELP TYPES ===

export type AgentType = 
  | 'supervisor'
  | 'domain_financial' | 'domain_crm_cs' | 'domain_compliance' 
  | 'domain_operations' | 'domain_hr' | 'domain_analytics'
  | 'deal_coaching' | 'churn_prevention' | 'revenue_optimization'
  | 'accounting' | 'treasury' | 'invoicing' | 'collections' | 'cashflow'
  | 'sales' | 'customer_success' | 'pipeline' | 'upsell'
  | 'gdpr' | 'psd2' | 'esg' | 'audit' | 'kyc_aml' | 'risk'
  | 'inventory' | 'procurement' | 'logistics' | 'maintenance' | 'scheduling'
  | 'payroll' | 'recruitment' | 'training' | 'performance'
  | 'reporting' | 'forecasting' | 'anomaly_detection';

export interface AgentHelpSection {
  id: string;
  title: string;
  content: string;
  order: number;
  examples?: AgentHelpExample[];
}

export interface AgentHelpExample {
  id: string;
  title: string;
  description: string;
  input?: string;
  output?: string;
  tags?: string[];
}

export interface LearnedKnowledge {
  id: string;
  title: string;
  content: string;
  source: 'user_feedback' | 'interaction' | 'external' | 'ai_generated';
  confidence: number;
  createdAt: string;
  usageCount: number;
}

export interface AgentHelpContent {
  agentId: string;
  agentType: AgentType;
  agentName: string;
  description: string;
  version: string;
  lastUpdated: string;
  
  // Índice estructurado
  tableOfContents: Array<{
    section: string;
    anchor: string;
    subsections?: string[];
  }>;
  
  // Secciones principales
  overview: string;
  capabilities: string[];
  useCases: AgentHelpSection[];
  bestPractices: AgentHelpSection[];
  examples: AgentHelpExample[];
  
  // Conocimiento aprendido
  learnedKnowledge: LearnedKnowledge[];
  
  // Tips y trucos
  tips: string[];
  warnings: string[];
  
  // Métricas de uso
  metrics?: {
    totalQueries: number;
    successfulInteractions: number;
    averageResponseTime: number;
  };
}

export interface AgentHelpState {
  isLoading: boolean;
  error: string | null;
  helpContent: AgentHelpContent | null;
  chatHistory: ChatMessage[];
  isVoiceActive: boolean;
  isSpeaking: boolean;
  isListening: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audioUrl?: string;
  isVoice?: boolean;
  tokensUsed?: number;
  responseTimeMs?: number;
}

export interface AgentHelpConfig {
  enableVoice: boolean;
  enableLearning: boolean;
  autoRefresh: boolean;
  refreshIntervalMs: number;
  maxChatHistory: number;
  language: 'es' | 'en';
}

export const DEFAULT_HELP_CONFIG: AgentHelpConfig = {
  enableVoice: true,
  enableLearning: true,
  autoRefresh: false,
  refreshIntervalMs: 300000, // 5 minutos
  maxChatHistory: 50,
  language: 'es',
};

// === AGENT HELP REGISTRY ===

export interface AgentHelpRegistry {
  [agentId: string]: {
    type: AgentType;
    name: string;
    domain?: string;
    helpEndpoint: string;
  };
}

export const AGENT_HELP_REGISTRY: AgentHelpRegistry = {
  // Supervisor
  'supervisor-general': {
    type: 'supervisor',
    name: 'Supervisor General',
    helpEndpoint: 'agent-help-assistant',
  },
  // Agentes de Dominio
  'domain-financial': {
    type: 'domain_financial',
    name: 'Agente Dominio Financiero',
    domain: 'financial',
    helpEndpoint: 'agent-help-assistant',
  },
  'domain-crm-cs': {
    type: 'domain_crm_cs',
    name: 'Agente Dominio CRM/CS',
    domain: 'crm_cs',
    helpEndpoint: 'agent-help-assistant',
  },
  'domain-compliance': {
    type: 'domain_compliance',
    name: 'Agente Dominio Compliance',
    domain: 'compliance',
    helpEndpoint: 'agent-help-assistant',
  },
  'domain-operations': {
    type: 'domain_operations',
    name: 'Agente Dominio Operaciones',
    domain: 'operations',
    helpEndpoint: 'agent-help-assistant',
  },
  'domain-hr': {
    type: 'domain_hr',
    name: 'Agente Dominio RRHH',
    domain: 'hr',
    helpEndpoint: 'agent-help-assistant',
  },
  'domain-analytics': {
    type: 'domain_analytics',
    name: 'Agente Dominio Analytics',
    domain: 'analytics',
    helpEndpoint: 'agent-help-assistant',
  },
  // Agentes V2
  'deal-coaching-agent': {
    type: 'deal_coaching',
    name: 'Deal Coaching Agent',
    domain: 'crm_cs',
    helpEndpoint: 'agent-help-assistant',
  },
  'churn-prevention-agent': {
    type: 'churn_prevention',
    name: 'Churn Prevention Agent',
    domain: 'crm_cs',
    helpEndpoint: 'agent-help-assistant',
  },
  'revenue-optimization-agent': {
    type: 'revenue_optimization',
    name: 'Revenue Optimization Agent',
    domain: 'financial',
    helpEndpoint: 'agent-help-assistant',
  },
};
