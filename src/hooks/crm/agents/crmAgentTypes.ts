/**
 * Tipos para el sistema de agentes CRM
 * Arquitectura: Supervisor General → Agentes CRM Especializados
 */

// === TIPOS DE AGENTES CRM ===

export type CRMModuleType = 
  | 'lead_scoring' 
  | 'pipeline_optimizer' 
  | 'customer_success' 
  | 'churn_predictor' 
  | 'upsell_detector'
  | 'engagement_analyzer'
  | 'deal_accelerator'
  | 'contact_enrichment'
  | 'activity_optimizer'
  | 'forecast_analyst';

export type CRMAgentStatus = 'active' | 'idle' | 'analyzing' | 'error' | 'paused';
export type CRMInsightType = 'opportunity' | 'risk' | 'prediction' | 'recommendation' | 'alert';
export type CRMInsightPriority = 'low' | 'medium' | 'high' | 'critical';
export type CRMExecutionMode = 'autonomous' | 'supervised' | 'manual';

// === INTERFACES ===

export interface CRMModuleAgent {
  id: string;
  type: CRMModuleType;
  name: string;
  description: string;
  status: CRMAgentStatus;
  capabilities: string[];
  metrics: {
    leadsProcessed?: number;
    dealsAnalyzed?: number;
    predictionsAccuracy?: number;
    actionsGenerated?: number;
    successRate?: number;
    avgResponseTime?: number;
  };
  lastActivity: string;
  healthScore: number;
  confidenceThreshold: number;
  executionMode: CRMExecutionMode;
  priority: number;
}

export interface CRMAgentInsight {
  id: string;
  type: CRMInsightType;
  priority: CRMInsightPriority;
  title: string;
  description: string;
  affectedEntities: Array<{
    type: 'lead' | 'deal' | 'contact' | 'account';
    id: string;
    name: string;
  }>;
  suggestedAction?: string;
  confidence: number;
  estimatedImpact?: {
    revenue?: number;
    probability?: number;
    timeframe?: string;
  };
  timestamp: string;
  agentId: string;
}

export interface CRMSupervisorStatus {
  status: 'running' | 'idle' | 'analyzing' | 'coordinating';
  activeAgents: number;
  totalAgents: number;
  pendingDecisions: number;
  insightsGenerated: number;
  systemHealth: number;
  predictiveAccuracy: number;
  lastOptimization: string;
  autonomousMode: boolean;
  autonomousIntervalMs: number;
  pipelineHealth: {
    totalDeals: number;
    atRiskDeals: number;
    acceleratedDeals: number;
    forecastAccuracy: number;
  };
  insights: CRMAgentInsight[];
}

export interface CRMAgentCommunication {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: 'request' | 'response' | 'escalation' | 'coordination';
  payload: Record<string, unknown>;
  status: 'pending' | 'processed' | 'failed';
  timestamp: string;
}

// === CONFIGURACIÓN ===

export interface CRMAgentConfig {
  type: CRMModuleType;
  name: string;
  description: string;
  capabilities: string[];
  defaultPriority: number;
  icon: string;
  color: string;
}

// === CONSTANTES DE CONFIGURACIÓN ===

export const CRM_AGENT_CONFIG: Record<CRMModuleType, CRMAgentConfig> = {
  lead_scoring: {
    type: 'lead_scoring',
    name: 'Agente Lead Scoring',
    description: 'Puntuación predictiva de leads con ML',
    capabilities: [
      'Scoring predictivo basado en comportamiento',
      'Análisis de engagement',
      'Priorización automática',
      'Detección de leads calientes'
    ],
    defaultPriority: 1,
    icon: 'Target',
    color: 'from-blue-500 to-cyan-500'
  },
  pipeline_optimizer: {
    type: 'pipeline_optimizer',
    name: 'Agente Optimizador Pipeline',
    description: 'Optimización continua del pipeline de ventas',
    capabilities: [
      'Análisis de velocidad del pipeline',
      'Detección de cuellos de botella',
      'Recomendaciones de etapas',
      'Optimización de conversión'
    ],
    defaultPriority: 2,
    icon: 'GitBranch',
    color: 'from-purple-500 to-pink-500'
  },
  customer_success: {
    type: 'customer_success',
    name: 'Agente Customer Success',
    description: 'Monitoreo proactivo de éxito del cliente',
    capabilities: [
      'Health score tracking',
      'Análisis de adopción',
      'Detección de riesgos',
      'Recomendaciones de engagement'
    ],
    defaultPriority: 2,
    icon: 'Heart',
    color: 'from-green-500 to-emerald-500'
  },
  churn_predictor: {
    type: 'churn_predictor',
    name: 'Agente Predicción Churn',
    description: 'Predicción y prevención de abandono',
    capabilities: [
      'Predicción de churn con ML',
      'Análisis de señales de riesgo',
      'Acciones de retención',
      'Segmentación de riesgo'
    ],
    defaultPriority: 1,
    icon: 'AlertTriangle',
    color: 'from-red-500 to-orange-500'
  },
  upsell_detector: {
    type: 'upsell_detector',
    name: 'Agente Detección Upsell',
    description: 'Identificación de oportunidades de expansión',
    capabilities: [
      'Detección de señales de expansión',
      'Análisis de uso',
      'Recomendaciones de productos',
      'Timing óptimo'
    ],
    defaultPriority: 3,
    icon: 'TrendingUp',
    color: 'from-amber-500 to-yellow-500'
  },
  engagement_analyzer: {
    type: 'engagement_analyzer',
    name: 'Agente Análisis Engagement',
    description: 'Análisis profundo de engagement multicanal',
    capabilities: [
      'Tracking de interacciones',
      'Análisis de sentimiento',
      'Patrones de comunicación',
      'Scoring de engagement'
    ],
    defaultPriority: 3,
    icon: 'MessageSquare',
    color: 'from-indigo-500 to-blue-500'
  },
  deal_accelerator: {
    type: 'deal_accelerator',
    name: 'Agente Acelerador de Deals',
    description: 'Aceleración inteligente de oportunidades',
    capabilities: [
      'Análisis de bloqueos',
      'Recomendaciones de acción',
      'Next best action',
      'Predicción de cierre'
    ],
    defaultPriority: 1,
    icon: 'Zap',
    color: 'from-violet-500 to-purple-500'
  },
  contact_enrichment: {
    type: 'contact_enrichment',
    name: 'Agente Enriquecimiento',
    description: 'Enriquecimiento automático de contactos',
    capabilities: [
      'Enriquecimiento de datos',
      'Validación de información',
      'Detección de duplicados',
      'Actualización automática'
    ],
    defaultPriority: 4,
    icon: 'UserPlus',
    color: 'from-teal-500 to-cyan-500'
  },
  activity_optimizer: {
    type: 'activity_optimizer',
    name: 'Agente Optimizador Actividades',
    description: 'Optimización de actividades de ventas',
    capabilities: [
      'Priorización de tareas',
      'Optimización de calendario',
      'Análisis de productividad',
      'Sugerencias de seguimiento'
    ],
    defaultPriority: 3,
    icon: 'Calendar',
    color: 'from-rose-500 to-pink-500'
  },
  forecast_analyst: {
    type: 'forecast_analyst',
    name: 'Agente Analista Forecast',
    description: 'Análisis predictivo de ingresos',
    capabilities: [
      'Forecasting con ML',
      'Análisis de tendencias',
      'Escenarios what-if',
      'Precisión de predicciones'
    ],
    defaultPriority: 2,
    icon: 'BarChart3',
    color: 'from-sky-500 to-blue-500'
  }
};

export const CRM_AUTONOMOUS_ACTIONS = [
  'Analizar leads entrantes y asignar scores',
  'Revisar pipeline y detectar oportunidades estancadas',
  'Evaluar health scores de clientes activos',
  'Identificar señales de churn en cuentas',
  'Buscar oportunidades de upsell',
  'Analizar engagement de contactos clave',
  'Optimizar actividades pendientes',
  'Actualizar forecasts de revenue'
];
