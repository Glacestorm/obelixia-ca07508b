/**
 * Configuración de agentes CRM ultra-especializados
 * Tendencias 2025-2027: Vertical specialization, Autonomous decision-making
 */

import type { CRMModuleType, CRMAgentCapability } from './crmAgentTypes';

// === CONFIGURACIÓN DE MÓDULOS CRM ===

export interface CRMModuleConfig {
  name: string;
  description: string;
  color: string;
  icon: string;
  systemPrompt: string;
  capabilities: CRMAgentCapability[];
  defaultConfidence: number;
  defaultPriority: 1 | 2 | 3 | 4 | 5;
  maxActionsPerHour: number;
  collaboratingModules: CRMModuleType[];
}

export const CRM_MODULE_CONFIG: Record<CRMModuleType, CRMModuleConfig> = {
  leads: {
    name: 'Agente de Leads',
    description: 'Calificación, scoring y nurturing automático de leads',
    color: 'from-blue-500 to-cyan-600',
    icon: 'UserPlus',
    systemPrompt: `Eres el Agente de Leads ultra-especializado. Tu misión es:
1. Calificar leads automáticamente usando scoring predictivo
2. Identificar el ICP (Ideal Customer Profile) match
3. Recomendar acciones de nurturing personalizadas
4. Detectar señales de compra y urgencia
5. Priorizar leads por probabilidad de conversión
Siempre responde con datos específicos y acciones concretas.`,
    capabilities: [
      { id: 'lead_scoring', name: 'Lead Scoring IA', description: 'Puntuación predictiva de leads', isAutonomous: true, confidenceRequired: 70, executionType: 'realtime' },
      { id: 'icp_matching', name: 'ICP Matching', description: 'Análisis de ajuste a perfil ideal', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' },
      { id: 'nurturing_automation', name: 'Nurturing Automático', description: 'Secuencias de nurturing personalizadas', isAutonomous: true, confidenceRequired: 80, executionType: 'scheduled' },
      { id: 'buying_signals', name: 'Señales de Compra', description: 'Detección de intent de compra', isAutonomous: true, confidenceRequired: 65, executionType: 'realtime' },
      { id: 'lead_enrichment', name: 'Enriquecimiento', description: 'Enriquecimiento automático de datos', isAutonomous: true, confidenceRequired: 85, executionType: 'batch' }
    ],
    defaultConfidence: 75,
    defaultPriority: 1,
    maxActionsPerHour: 100,
    collaboratingModules: ['opportunities', 'campaigns', 'accounts']
  },
  
  opportunities: {
    name: 'Agente de Oportunidades',
    description: 'Gestión inteligente del ciclo de ventas y forecast',
    color: 'from-emerald-500 to-green-600',
    icon: 'Target',
    systemPrompt: `Eres el Agente de Oportunidades ultra-especializado. Tu misión es:
1. Analizar probabilidad de cierre con precisión
2. Identificar riesgos en el pipeline
3. Recomendar acciones para acelerar deals
4. Predecir fechas de cierre realistas
5. Optimizar el proceso de ventas
Siempre proporciona recomendaciones accionables basadas en datos.`,
    capabilities: [
      { id: 'win_probability', name: 'Probabilidad de Cierre', description: 'Predicción de win rate', isAutonomous: true, confidenceRequired: 70, executionType: 'realtime' },
      { id: 'deal_risk_analysis', name: 'Análisis de Riesgos', description: 'Identificación de deals en riesgo', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' },
      { id: 'next_best_action', name: 'Siguiente Mejor Acción', description: 'Recomendación de acciones', isAutonomous: false, confidenceRequired: 80, executionType: 'realtime' },
      { id: 'close_date_prediction', name: 'Predicción de Cierre', description: 'Estimación de fecha de cierre', isAutonomous: true, confidenceRequired: 65, executionType: 'batch' },
      { id: 'competitor_analysis', name: 'Análisis Competitivo', description: 'Inteligencia competitiva', isAutonomous: true, confidenceRequired: 70, executionType: 'batch' }
    ],
    defaultConfidence: 75,
    defaultPriority: 1,
    maxActionsPerHour: 80,
    collaboratingModules: ['leads', 'quotes', 'contracts', 'pipeline']
  },
  
  accounts: {
    name: 'Agente de Cuentas',
    description: 'Gestión 360° de cuentas y health score',
    color: 'from-purple-500 to-violet-600',
    icon: 'Building',
    systemPrompt: `Eres el Agente de Cuentas ultra-especializado. Tu misión es:
1. Mantener health scores actualizados
2. Detectar señales de expansión
3. Identificar riesgos de churn
4. Mapear stakeholders clave
5. Analizar engagement y uso de producto
Siempre proporciona insights accionables sobre cada cuenta.`,
    capabilities: [
      { id: 'account_health', name: 'Health Score', description: 'Puntuación de salud de cuenta', isAutonomous: true, confidenceRequired: 75, executionType: 'scheduled' },
      { id: 'expansion_signals', name: 'Señales Expansión', description: 'Detección de oportunidades de upsell', isAutonomous: true, confidenceRequired: 70, executionType: 'batch' },
      { id: 'churn_risk', name: 'Riesgo Churn', description: 'Predicción de abandono', isAutonomous: true, confidenceRequired: 80, executionType: 'realtime' },
      { id: 'stakeholder_mapping', name: 'Mapa Stakeholders', description: 'Análisis de decisores', isAutonomous: true, confidenceRequired: 65, executionType: 'batch' },
      { id: 'engagement_analysis', name: 'Análisis Engagement', description: 'Análisis de interacciones', isAutonomous: true, confidenceRequired: 70, executionType: 'scheduled' }
    ],
    defaultConfidence: 75,
    defaultPriority: 2,
    maxActionsPerHour: 60,
    collaboratingModules: ['contacts', 'customer_success', 'support']
  },
  
  contacts: {
    name: 'Agente de Contactos',
    description: 'Gestión inteligente de relaciones y networking',
    color: 'from-pink-500 to-rose-600',
    icon: 'Users',
    systemPrompt: `Eres el Agente de Contactos ultra-especializado. Tu misión es:
1. Mantener información de contactos actualizada
2. Detectar cambios de rol o empresa
3. Identificar champions y detractores
4. Mapear redes de influencia
5. Recomendar momentos de contacto
Siempre prioriza la calidad de las relaciones.`,
    capabilities: [
      { id: 'contact_enrichment', name: 'Enriquecimiento', description: 'Datos actualizados de contactos', isAutonomous: true, confidenceRequired: 85, executionType: 'batch' },
      { id: 'role_change_detection', name: 'Cambios de Rol', description: 'Detección de movimientos', isAutonomous: true, confidenceRequired: 90, executionType: 'scheduled' },
      { id: 'influence_mapping', name: 'Mapa de Influencia', description: 'Red de influencia y decisión', isAutonomous: true, confidenceRequired: 70, executionType: 'batch' },
      { id: 'sentiment_analysis', name: 'Análisis Sentimiento', description: 'Sentimiento del contacto', isAutonomous: true, confidenceRequired: 65, executionType: 'realtime' },
      { id: 'best_contact_time', name: 'Mejor Momento', description: 'Momento óptimo de contacto', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' }
    ],
    defaultConfidence: 80,
    defaultPriority: 3,
    maxActionsPerHour: 50,
    collaboratingModules: ['accounts', 'leads', 'campaigns']
  },
  
  campaigns: {
    name: 'Agente de Campañas',
    description: 'Optimización de campañas de marketing y ABM',
    color: 'from-orange-500 to-amber-600',
    icon: 'Megaphone',
    systemPrompt: `Eres el Agente de Campañas ultra-especializado. Tu misión es:
1. Optimizar segmentación y targeting
2. Personalizar mensajes por segmento
3. Analizar rendimiento en tiempo real
4. Recomendar ajustes de presupuesto
5. Ejecutar estrategias ABM
Siempre maximiza el ROI de las campañas.`,
    capabilities: [
      { id: 'audience_optimization', name: 'Optimización Audiencia', description: 'Segmentación inteligente', isAutonomous: true, confidenceRequired: 75, executionType: 'batch' },
      { id: 'message_personalization', name: 'Personalización', description: 'Mensajes personalizados por segmento', isAutonomous: true, confidenceRequired: 70, executionType: 'batch' },
      { id: 'performance_analysis', name: 'Análisis Rendimiento', description: 'Métricas en tiempo real', isAutonomous: true, confidenceRequired: 65, executionType: 'realtime' },
      { id: 'budget_optimization', name: 'Optimización Budget', description: 'Ajuste de presupuesto', isAutonomous: false, confidenceRequired: 85, executionType: 'scheduled' },
      { id: 'abm_execution', name: 'Ejecución ABM', description: 'Account-Based Marketing', isAutonomous: true, confidenceRequired: 75, executionType: 'scheduled' }
    ],
    defaultConfidence: 75,
    defaultPriority: 2,
    maxActionsPerHour: 40,
    collaboratingModules: ['leads', 'contacts', 'analytics']
  },
  
  pipeline: {
    name: 'Agente de Pipeline',
    description: 'Análisis y optimización del funnel de ventas',
    color: 'from-indigo-500 to-blue-600',
    icon: 'Workflow',
    systemPrompt: `Eres el Agente de Pipeline ultra-especializado. Tu misión es:
1. Analizar velocidad del pipeline
2. Identificar cuellos de botella
3. Predecir forecast con precisión
4. Optimizar tasas de conversión por etapa
5. Alertar sobre anomalías
Siempre proporciona visibilidad total del pipeline.`,
    capabilities: [
      { id: 'pipeline_velocity', name: 'Velocidad Pipeline', description: 'Análisis de velocidad por etapa', isAutonomous: true, confidenceRequired: 70, executionType: 'scheduled' },
      { id: 'bottleneck_detection', name: 'Detección Cuellos', description: 'Identificación de bloqueos', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' },
      { id: 'forecast_accuracy', name: 'Forecast Preciso', description: 'Predicción de ingresos', isAutonomous: true, confidenceRequired: 80, executionType: 'batch' },
      { id: 'stage_optimization', name: 'Optimización Etapas', description: 'Mejora de conversión', isAutonomous: false, confidenceRequired: 75, executionType: 'batch' },
      { id: 'anomaly_alerts', name: 'Alertas Anomalías', description: 'Detección de desviaciones', isAutonomous: true, confidenceRequired: 85, executionType: 'realtime' }
    ],
    defaultConfidence: 80,
    defaultPriority: 1,
    maxActionsPerHour: 60,
    collaboratingModules: ['opportunities', 'analytics', 'automation']
  },
  
  quotes: {
    name: 'Agente de Presupuestos',
    description: 'Generación y optimización de propuestas comerciales',
    color: 'from-teal-500 to-cyan-600',
    icon: 'FileText',
    systemPrompt: `Eres el Agente de Presupuestos ultra-especializado. Tu misión es:
1. Generar propuestas personalizadas
2. Optimizar pricing dinámico
3. Analizar competitividad de ofertas
4. Recomendar descuentos estratégicos
5. Acelerar aprobaciones
Siempre maximiza el valor del deal.`,
    capabilities: [
      { id: 'proposal_generation', name: 'Generación Propuestas', description: 'Propuestas personalizadas', isAutonomous: true, confidenceRequired: 70, executionType: 'realtime' },
      { id: 'dynamic_pricing', name: 'Pricing Dinámico', description: 'Optimización de precios', isAutonomous: false, confidenceRequired: 85, executionType: 'realtime' },
      { id: 'competitive_analysis', name: 'Análisis Competitivo', description: 'Comparación con competencia', isAutonomous: true, confidenceRequired: 70, executionType: 'batch' },
      { id: 'discount_optimization', name: 'Optimización Descuentos', description: 'Descuentos estratégicos', isAutonomous: false, confidenceRequired: 80, executionType: 'realtime' },
      { id: 'approval_acceleration', name: 'Aceleración Aprobación', description: 'Flujo de aprobaciones', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' }
    ],
    defaultConfidence: 75,
    defaultPriority: 2,
    maxActionsPerHour: 30,
    collaboratingModules: ['opportunities', 'contracts', 'accounts']
  },
  
  contracts: {
    name: 'Agente de Contratos',
    description: 'Gestión inteligente del ciclo de vida de contratos',
    color: 'from-slate-500 to-gray-600',
    icon: 'FileSignature',
    systemPrompt: `Eres el Agente de Contratos ultra-especializado. Tu misión es:
1. Analizar riesgos contractuales
2. Automatizar renovaciones
3. Detectar cláusulas problemáticas
4. Optimizar términos comerciales
5. Gestionar compliance contractual
Siempre protege los intereses del negocio.`,
    capabilities: [
      { id: 'risk_analysis', name: 'Análisis Riesgos', description: 'Evaluación de riesgos contractuales', isAutonomous: true, confidenceRequired: 85, executionType: 'batch' },
      { id: 'renewal_automation', name: 'Renovación Automática', description: 'Gestión de renovaciones', isAutonomous: true, confidenceRequired: 75, executionType: 'scheduled' },
      { id: 'clause_detection', name: 'Detección Cláusulas', description: 'Análisis de términos', isAutonomous: true, confidenceRequired: 80, executionType: 'batch' },
      { id: 'terms_optimization', name: 'Optimización Términos', description: 'Mejora de condiciones', isAutonomous: false, confidenceRequired: 85, executionType: 'realtime' },
      { id: 'compliance_check', name: 'Verificación Compliance', description: 'Cumplimiento normativo', isAutonomous: true, confidenceRequired: 90, executionType: 'batch' }
    ],
    defaultConfidence: 85,
    defaultPriority: 2,
    maxActionsPerHour: 20,
    collaboratingModules: ['quotes', 'accounts', 'customer_success']
  },
  
  customer_success: {
    name: 'Agente Customer Success',
    description: 'Gestión proactiva del éxito y retención del cliente',
    color: 'from-green-500 to-emerald-600',
    icon: 'Heart',
    systemPrompt: `Eres el Agente de Customer Success ultra-especializado. Tu misión es:
1. Maximizar NRR (Net Revenue Retention)
2. Detectar riesgo de churn temprano
3. Identificar oportunidades de expansión
4. Automatizar QBRs y touchpoints
5. Gestionar onboarding exitoso
Siempre prioriza el éxito del cliente.`,
    capabilities: [
      { id: 'health_monitoring', name: 'Monitoreo Salud', description: 'Health score continuo', isAutonomous: true, confidenceRequired: 70, executionType: 'realtime' },
      { id: 'churn_prevention', name: 'Prevención Churn', description: 'Intervención proactiva', isAutonomous: true, confidenceRequired: 80, executionType: 'realtime' },
      { id: 'expansion_identification', name: 'Identificación Expansión', description: 'Oportunidades de upsell', isAutonomous: true, confidenceRequired: 75, executionType: 'batch' },
      { id: 'qbr_automation', name: 'Automatización QBR', description: 'Business reviews automáticos', isAutonomous: true, confidenceRequired: 70, executionType: 'scheduled' },
      { id: 'onboarding_optimization', name: 'Optimización Onboarding', description: 'Onboarding personalizado', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' }
    ],
    defaultConfidence: 75,
    defaultPriority: 1,
    maxActionsPerHour: 50,
    collaboratingModules: ['accounts', 'support', 'contracts']
  },
  
  support: {
    name: 'Agente de Soporte',
    description: 'Soporte inteligente y resolución proactiva',
    color: 'from-red-500 to-orange-600',
    icon: 'Headphones',
    systemPrompt: `Eres el Agente de Soporte ultra-especializado. Tu misión es:
1. Resolver tickets automáticamente cuando sea posible
2. Priorizar tickets por impacto
3. Detectar patrones de problemas
4. Escalar inteligentemente
5. Mejorar satisfacción (CSAT)
Siempre busca la resolución más rápida y efectiva.`,
    capabilities: [
      { id: 'auto_resolution', name: 'Resolución Automática', description: 'Solución de tickets nivel 1', isAutonomous: true, confidenceRequired: 90, executionType: 'realtime' },
      { id: 'ticket_prioritization', name: 'Priorización Tickets', description: 'Ordenamiento por impacto', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' },
      { id: 'pattern_detection', name: 'Detección Patrones', description: 'Problemas recurrentes', isAutonomous: true, confidenceRequired: 80, executionType: 'batch' },
      { id: 'smart_escalation', name: 'Escalado Inteligente', description: 'Routing óptimo', isAutonomous: true, confidenceRequired: 85, executionType: 'realtime' },
      { id: 'satisfaction_improvement', name: 'Mejora CSAT', description: 'Optimización satisfacción', isAutonomous: true, confidenceRequired: 70, executionType: 'scheduled' }
    ],
    defaultConfidence: 85,
    defaultPriority: 1,
    maxActionsPerHour: 100,
    collaboratingModules: ['accounts', 'customer_success', 'contracts']
  },
  
  analytics: {
    name: 'Agente Analytics CRM',
    description: 'Inteligencia y reporting avanzado del CRM',
    color: 'from-cyan-500 to-blue-600',
    icon: 'BarChart3',
    systemPrompt: `Eres el Agente de Analytics CRM ultra-especializado. Tu misión es:
1. Generar insights accionables
2. Predecir tendencias de negocio
3. Identificar patrones ocultos
4. Automatizar reporting
5. Recomendar optimizaciones
Siempre convierte datos en decisiones.`,
    capabilities: [
      { id: 'insight_generation', name: 'Generación Insights', description: 'Insights automáticos', isAutonomous: true, confidenceRequired: 70, executionType: 'scheduled' },
      { id: 'trend_prediction', name: 'Predicción Tendencias', description: 'Forecasting avanzado', isAutonomous: true, confidenceRequired: 75, executionType: 'batch' },
      { id: 'pattern_discovery', name: 'Descubrimiento Patrones', description: 'Análisis de patrones', isAutonomous: true, confidenceRequired: 80, executionType: 'batch' },
      { id: 'auto_reporting', name: 'Reporting Automático', description: 'Informes programados', isAutonomous: true, confidenceRequired: 65, executionType: 'scheduled' },
      { id: 'optimization_recommendations', name: 'Recomendaciones', description: 'Sugerencias de mejora', isAutonomous: true, confidenceRequired: 75, executionType: 'batch' }
    ],
    defaultConfidence: 75,
    defaultPriority: 2,
    maxActionsPerHour: 40,
    collaboratingModules: ['pipeline', 'campaigns', 'customer_success']
  },
  
  automation: {
    name: 'Agente de Automatización',
    description: 'Orquestación de workflows y procesos automáticos',
    color: 'from-violet-500 to-purple-600',
    icon: 'Zap',
    systemPrompt: `Eres el Agente de Automatización ultra-especializado. Tu misión es:
1. Diseñar workflows inteligentes
2. Optimizar procesos existentes
3. Eliminar tareas manuales repetitivas
4. Orquestar integraciones
5. Monitorear ejecuciones
Siempre maximiza la eficiencia operativa.`,
    capabilities: [
      { id: 'workflow_design', name: 'Diseño Workflows', description: 'Creación de flujos', isAutonomous: false, confidenceRequired: 80, executionType: 'realtime' },
      { id: 'process_optimization', name: 'Optimización Procesos', description: 'Mejora de eficiencia', isAutonomous: true, confidenceRequired: 75, executionType: 'batch' },
      { id: 'task_automation', name: 'Automatización Tareas', description: 'Eliminación tareas manuales', isAutonomous: true, confidenceRequired: 85, executionType: 'realtime' },
      { id: 'integration_orchestration', name: 'Orquestación Integraciones', description: 'Coordinación de sistemas', isAutonomous: true, confidenceRequired: 80, executionType: 'realtime' },
      { id: 'execution_monitoring', name: 'Monitoreo Ejecuciones', description: 'Supervisión de procesos', isAutonomous: true, confidenceRequired: 70, executionType: 'realtime' }
    ],
    defaultConfidence: 80,
    defaultPriority: 2,
    maxActionsPerHour: 200,
    collaboratingModules: ['pipeline', 'leads', 'opportunities']
  }
};

// === ACCIONES AUTÓNOMAS DEL SUPERVISOR CRM ===

export const CRM_AUTONOMOUS_ACTIONS = [
  'coordinate_all_agents',
  'optimize_pipeline',
  'analyze_conversion_funnel',
  'detect_revenue_opportunities',
  'prevent_churn_risks',
  'balance_workload',
  'cross_module_learning',
  'generate_insights',
  'resolve_conflicts',
  'auto_scale_priorities'
] as const;

export type CRMAutonomousAction = typeof CRM_AUTONOMOUS_ACTIONS[number];

// === TEMPLATES DE INSTRUCCIONES ===

export const INSTRUCTION_TEMPLATES: Record<string, string> = {
  analyze: 'Analiza el estado actual del módulo {module} y proporciona un resumen detallado con métricas clave.',
  optimize: 'Identifica oportunidades de optimización en {module} y propone acciones concretas.',
  predict: 'Genera predicciones para {module} considerando los datos históricos y tendencias actuales.',
  report: 'Genera un informe ejecutivo de {module} con KPIs, tendencias y recomendaciones.',
  coordinate: 'Coordina con los agentes {agents} para optimizar el proceso de {process}.',
  learn: 'Analiza los resultados recientes y extrae aprendizajes para mejorar el rendimiento.',
  escalate: 'Escala el caso {case} al nivel apropiado con contexto completo y recomendaciones.',
  automate: 'Identifica tareas repetitivas en {module} que puedan automatizarse.'
};
