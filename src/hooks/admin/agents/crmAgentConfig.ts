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
  },
  
  // === EXTENDED MODULES (Componentes existentes del proyecto) ===
  
  customer_360: {
    name: 'Agente Customer 360',
    description: 'Vista integral y unificada del cliente con todos los touchpoints',
    color: 'from-sky-500 to-cyan-600',
    icon: 'Eye',
    systemPrompt: `Eres el Agente de Customer 360 ultra-especializado. Tu misión es:
1. Consolidar toda la información del cliente en una vista unificada
2. Analizar el perfil RFM completo
3. Identificar patrones de comportamiento
4. Mapear todos los touchpoints y interacciones
5. Generar recomendaciones personalizadas
Siempre proporciona una visión holística del cliente.`,
    capabilities: [
      { id: 'profile_unification', name: 'Unificación Perfil', description: 'Consolidación de datos del cliente', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' },
      { id: 'rfm_analysis', name: 'Análisis RFM', description: 'Recency, Frequency, Monetary', isAutonomous: true, confidenceRequired: 80, executionType: 'batch' },
      { id: 'behavior_patterns', name: 'Patrones Comportamiento', description: 'Análisis de comportamiento', isAutonomous: true, confidenceRequired: 70, executionType: 'scheduled' },
      { id: 'touchpoint_mapping', name: 'Mapeo Touchpoints', description: 'Seguimiento de interacciones', isAutonomous: true, confidenceRequired: 65, executionType: 'realtime' },
      { id: 'personalized_recommendations', name: 'Recomendaciones', description: 'Sugerencias personalizadas', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' }
    ],
    defaultConfidence: 75,
    defaultPriority: 1,
    maxActionsPerHour: 80,
    collaboratingModules: ['accounts', 'contacts', 'customer_success']
  },
  
  retention: {
    name: 'Agente de Retención',
    description: 'Prevención de churn y estrategias de retención proactiva',
    color: 'from-rose-500 to-red-600',
    icon: 'ShieldCheck',
    systemPrompt: `Eres el Agente de Retención ultra-especializado. Tu misión es:
1. Detectar señales tempranas de churn
2. Ejecutar playbooks de retención
3. Segmentar clientes por riesgo
4. Automatizar intervenciones proactivas
5. Medir efectividad de estrategias
Siempre prioriza la retención sobre la adquisición.`,
    capabilities: [
      { id: 'churn_detection', name: 'Detección Churn', description: 'Alertas tempranas de abandono', isAutonomous: true, confidenceRequired: 80, executionType: 'realtime' },
      { id: 'playbook_execution', name: 'Ejecución Playbooks', description: 'Automatización de playbooks', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' },
      { id: 'risk_segmentation', name: 'Segmentación Riesgo', description: 'Clasificación por nivel de riesgo', isAutonomous: true, confidenceRequired: 70, executionType: 'batch' },
      { id: 'proactive_intervention', name: 'Intervención Proactiva', description: 'Acciones preventivas', isAutonomous: true, confidenceRequired: 85, executionType: 'realtime' },
      { id: 'retention_analytics', name: 'Analytics Retención', description: 'Métricas de retención', isAutonomous: true, confidenceRequired: 65, executionType: 'scheduled' }
    ],
    defaultConfidence: 80,
    defaultPriority: 1,
    maxActionsPerHour: 60,
    collaboratingModules: ['customer_success', 'health_score', 'winback']
  },
  
  cs_metrics: {
    name: 'Agente CS Metrics',
    description: 'Métricas avanzadas de Customer Success y NRR',
    color: 'from-lime-500 to-green-600',
    icon: 'Activity',
    systemPrompt: `Eres el Agente de CS Metrics ultra-especializado. Tu misión es:
1. Calcular y monitorear NRR, GRR, CSAT, NPS
2. Generar insights accionables de métricas
3. Correlacionar métricas con outcomes
4. Predecir tendencias de CS
5. Alertar sobre desviaciones críticas
Siempre convierte métricas en acciones.`,
    capabilities: [
      { id: 'nrr_monitoring', name: 'Monitoreo NRR', description: 'Net Revenue Retention tracking', isAutonomous: true, confidenceRequired: 75, executionType: 'scheduled' },
      { id: 'cs_insights', name: 'Insights CS', description: 'Análisis de métricas CS', isAutonomous: true, confidenceRequired: 70, executionType: 'batch' },
      { id: 'metric_correlation', name: 'Correlación Métricas', description: 'Relación entre indicadores', isAutonomous: true, confidenceRequired: 80, executionType: 'batch' },
      { id: 'trend_prediction', name: 'Predicción Tendencias', description: 'Forecasting de métricas', isAutonomous: true, confidenceRequired: 75, executionType: 'scheduled' },
      { id: 'anomaly_detection', name: 'Detección Anomalías', description: 'Alertas de desviaciones', isAutonomous: true, confidenceRequired: 85, executionType: 'realtime' }
    ],
    defaultConfidence: 80,
    defaultPriority: 2,
    maxActionsPerHour: 40,
    collaboratingModules: ['customer_success', 'analytics', 'retention']
  },
  
  customer_journey: {
    name: 'Agente Customer Journey',
    description: 'Mapeo y optimización del viaje del cliente',
    color: 'from-amber-500 to-orange-600',
    icon: 'Route',
    systemPrompt: `Eres el Agente de Customer Journey ultra-especializado. Tu misión es:
1. Mapear todas las etapas del journey
2. Identificar friction points
3. Optimizar conversiones por etapa
4. Personalizar experiencias
5. Medir engagement por touchpoint
Siempre mejora la experiencia del cliente.`,
    capabilities: [
      { id: 'journey_mapping', name: 'Mapeo Journey', description: 'Visualización del viaje', isAutonomous: true, confidenceRequired: 70, executionType: 'batch' },
      { id: 'friction_detection', name: 'Detección Fricción', description: 'Puntos de dolor', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' },
      { id: 'conversion_optimization', name: 'Optimización Conversión', description: 'Mejora por etapa', isAutonomous: true, confidenceRequired: 80, executionType: 'batch' },
      { id: 'experience_personalization', name: 'Personalización', description: 'Experiencias personalizadas', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' },
      { id: 'engagement_tracking', name: 'Tracking Engagement', description: 'Métricas de engagement', isAutonomous: true, confidenceRequired: 65, executionType: 'scheduled' }
    ],
    defaultConfidence: 75,
    defaultPriority: 2,
    maxActionsPerHour: 50,
    collaboratingModules: ['customer_360', 'analytics', 'sentiment']
  },
  
  omnichannel: {
    name: 'Agente Omnichannel',
    description: 'Gestión unificada de comunicaciones multicanal',
    color: 'from-fuchsia-500 to-pink-600',
    icon: 'MessageCircle',
    systemPrompt: `Eres el Agente Omnichannel ultra-especializado. Tu misión es:
1. Unificar conversaciones de todos los canales
2. Priorizar y enrutar mensajes inteligentemente
3. Mantener contexto cross-channel
4. Automatizar respuestas de nivel 1
5. Escalar con contexto completo
Siempre mantén la continuidad de la conversación.`,
    capabilities: [
      { id: 'channel_unification', name: 'Unificación Canales', description: 'Inbox unificado', isAutonomous: true, confidenceRequired: 80, executionType: 'realtime' },
      { id: 'intelligent_routing', name: 'Enrutamiento Inteligente', description: 'Distribución de mensajes', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' },
      { id: 'context_preservation', name: 'Preservación Contexto', description: 'Historial cross-channel', isAutonomous: true, confidenceRequired: 70, executionType: 'realtime' },
      { id: 'auto_response', name: 'Respuestas Automáticas', description: 'Automatización L1', isAutonomous: true, confidenceRequired: 90, executionType: 'realtime' },
      { id: 'smart_escalation', name: 'Escalado Inteligente', description: 'Escalación con contexto', isAutonomous: true, confidenceRequired: 85, executionType: 'realtime' }
    ],
    defaultConfidence: 85,
    defaultPriority: 1,
    maxActionsPerHour: 150,
    collaboratingModules: ['support', 'sentiment', 'sla']
  },
  
  sentiment: {
    name: 'Agente de Sentimiento',
    description: 'Análisis de sentimiento y emociones en tiempo real',
    color: 'from-pink-500 to-rose-600',
    icon: 'Heart',
    systemPrompt: `Eres el Agente de Sentimiento ultra-especializado. Tu misión es:
1. Analizar sentimiento en tiempo real
2. Detectar emociones y tonos
3. Alertar sobre sentimiento negativo
4. Identificar patrones emocionales
5. Recomendar respuestas empáticas
Siempre prioriza la empatía y comprensión.`,
    capabilities: [
      { id: 'realtime_analysis', name: 'Análisis Realtime', description: 'Sentimiento en tiempo real', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' },
      { id: 'emotion_detection', name: 'Detección Emociones', description: 'Identificación de emociones', isAutonomous: true, confidenceRequired: 70, executionType: 'realtime' },
      { id: 'negative_alerts', name: 'Alertas Negativas', description: 'Notificación de problemas', isAutonomous: true, confidenceRequired: 85, executionType: 'realtime' },
      { id: 'pattern_analysis', name: 'Análisis Patrones', description: 'Tendencias emocionales', isAutonomous: true, confidenceRequired: 70, executionType: 'batch' },
      { id: 'empathy_recommendations', name: 'Recomendaciones Empáticas', description: 'Sugerencias de respuesta', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' }
    ],
    defaultConfidence: 75,
    defaultPriority: 2,
    maxActionsPerHour: 200,
    collaboratingModules: ['omnichannel', 'support', 'customer_success']
  },
  
  sla: {
    name: 'Agente SLA Manager',
    description: 'Gestión y cumplimiento de SLAs multicanal',
    color: 'from-yellow-500 to-amber-600',
    icon: 'Timer',
    systemPrompt: `Eres el Agente de SLA Manager ultra-especializado. Tu misión es:
1. Monitorear cumplimiento de SLAs
2. Alertar antes de incumplimientos
3. Priorizar por tiempo restante
4. Optimizar asignaciones para cumplir SLA
5. Reportar métricas de cumplimiento
Siempre protege el cumplimiento de SLAs.`,
    capabilities: [
      { id: 'sla_monitoring', name: 'Monitoreo SLA', description: 'Tracking de cumplimiento', isAutonomous: true, confidenceRequired: 80, executionType: 'realtime' },
      { id: 'breach_prevention', name: 'Prevención Breach', description: 'Alertas preventivas', isAutonomous: true, confidenceRequired: 90, executionType: 'realtime' },
      { id: 'priority_management', name: 'Gestión Prioridades', description: 'Ordenamiento por urgencia', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' },
      { id: 'assignment_optimization', name: 'Optimización Asignación', description: 'Distribución óptima', isAutonomous: true, confidenceRequired: 80, executionType: 'realtime' },
      { id: 'compliance_reporting', name: 'Reporting Cumplimiento', description: 'Métricas de SLA', isAutonomous: true, confidenceRequired: 65, executionType: 'scheduled' }
    ],
    defaultConfidence: 85,
    defaultPriority: 1,
    maxActionsPerHour: 100,
    collaboratingModules: ['omnichannel', 'support', 'automation']
  },
  
  winback: {
    name: 'Agente Winback',
    description: 'Recuperación de clientes perdidos y campañas de reactivación',
    color: 'from-red-500 to-rose-600',
    icon: 'Undo2',
    systemPrompt: `Eres el Agente Winback ultra-especializado. Tu misión es:
1. Identificar clientes perdidos recuperables
2. Diseñar campañas de winback personalizadas
3. Segmentar por probabilidad de recuperación
4. Ejecutar secuencias de reactivación
5. Medir ROI de recuperación
Siempre busca recuperar relaciones valiosas.`,
    capabilities: [
      { id: 'recovery_identification', name: 'Identificación Recuperables', description: 'Clientes a recuperar', isAutonomous: true, confidenceRequired: 75, executionType: 'batch' },
      { id: 'campaign_design', name: 'Diseño Campañas', description: 'Campañas personalizadas', isAutonomous: false, confidenceRequired: 80, executionType: 'batch' },
      { id: 'recovery_segmentation', name: 'Segmentación Recuperación', description: 'Probabilidad de éxito', isAutonomous: true, confidenceRequired: 75, executionType: 'batch' },
      { id: 'reactivation_sequences', name: 'Secuencias Reactivación', description: 'Automatización winback', isAutonomous: true, confidenceRequired: 85, executionType: 'scheduled' },
      { id: 'roi_tracking', name: 'Tracking ROI', description: 'Medición de resultados', isAutonomous: true, confidenceRequired: 65, executionType: 'scheduled' }
    ],
    defaultConfidence: 75,
    defaultPriority: 3,
    maxActionsPerHour: 30,
    collaboratingModules: ['retention', 'campaigns', 'customer_360']
  },
  
  health_score: {
    name: 'Agente Health Score',
    description: 'Cálculo y monitoreo de health scores de clientes',
    color: 'from-emerald-500 to-teal-600',
    icon: 'Gauge',
    systemPrompt: `Eres el Agente de Health Score ultra-especializado. Tu misión es:
1. Calcular health scores multidimensionales
2. Identificar factores de riesgo
3. Detectar cambios significativos
4. Correlacionar con outcomes
5. Recomendar acciones por score
Siempre mantén la salud del cliente visible.`,
    capabilities: [
      { id: 'score_calculation', name: 'Cálculo Score', description: 'Health score automático', isAutonomous: true, confidenceRequired: 80, executionType: 'scheduled' },
      { id: 'risk_factors', name: 'Factores de Riesgo', description: 'Análisis de riesgos', isAutonomous: true, confidenceRequired: 75, executionType: 'batch' },
      { id: 'change_detection', name: 'Detección Cambios', description: 'Alertas de variación', isAutonomous: true, confidenceRequired: 85, executionType: 'realtime' },
      { id: 'outcome_correlation', name: 'Correlación Outcomes', description: 'Relación con resultados', isAutonomous: true, confidenceRequired: 70, executionType: 'batch' },
      { id: 'action_recommendations', name: 'Recomendaciones', description: 'Acciones por score', isAutonomous: true, confidenceRequired: 75, executionType: 'realtime' }
    ],
    defaultConfidence: 80,
    defaultPriority: 1,
    maxActionsPerHour: 60,
    collaboratingModules: ['customer_success', 'retention', 'accounts']
  },
  
  renewals: {
    name: 'Agente de Renovaciones',
    description: 'Gestión proactiva del ciclo de renovaciones',
    color: 'from-blue-500 to-indigo-600',
    icon: 'RefreshCcw',
    systemPrompt: `Eres el Agente de Renovaciones ultra-especializado. Tu misión es:
1. Gestionar el calendario de renovaciones
2. Predecir probabilidad de renovación
3. Automatizar outreach de renovación
4. Identificar upsell opportunities
5. Optimizar timing de contacto
Siempre maximiza la tasa de renovación.`,
    capabilities: [
      { id: 'renewal_calendar', name: 'Calendario Renovaciones', description: 'Gestión de fechas', isAutonomous: true, confidenceRequired: 70, executionType: 'scheduled' },
      { id: 'renewal_prediction', name: 'Predicción Renovación', description: 'Probabilidad de éxito', isAutonomous: true, confidenceRequired: 80, executionType: 'batch' },
      { id: 'outreach_automation', name: 'Automatización Outreach', description: 'Contacto proactivo', isAutonomous: true, confidenceRequired: 75, executionType: 'scheduled' },
      { id: 'upsell_identification', name: 'Identificación Upsell', description: 'Oportunidades de expansión', isAutonomous: true, confidenceRequired: 75, executionType: 'batch' },
      { id: 'timing_optimization', name: 'Optimización Timing', description: 'Mejor momento de contacto', isAutonomous: true, confidenceRequired: 70, executionType: 'realtime' }
    ],
    defaultConfidence: 80,
    defaultPriority: 1,
    maxActionsPerHour: 40,
    collaboratingModules: ['contracts', 'customer_success', 'accounts']
  },
  
  rfm: {
    name: 'Agente RFM Analysis',
    description: 'Análisis RFM avanzado y segmentación de valor',
    color: 'from-violet-500 to-purple-600',
    icon: 'Calculator',
    systemPrompt: `Eres el Agente de RFM Analysis ultra-especializado. Tu misión es:
1. Calcular scores RFM precisos
2. Segmentar clientes por valor
3. Identificar VIPs y clientes en riesgo
4. Recomendar acciones por segmento
5. Predecir movimientos entre segmentos
Siempre maximiza el valor del cliente.`,
    capabilities: [
      { id: 'rfm_scoring', name: 'Scoring RFM', description: 'Cálculo de RFM', isAutonomous: true, confidenceRequired: 85, executionType: 'batch' },
      { id: 'value_segmentation', name: 'Segmentación Valor', description: 'Clasificación por valor', isAutonomous: true, confidenceRequired: 80, executionType: 'batch' },
      { id: 'vip_identification', name: 'Identificación VIPs', description: 'Detección de VIPs', isAutonomous: true, confidenceRequired: 75, executionType: 'batch' },
      { id: 'segment_actions', name: 'Acciones por Segmento', description: 'Recomendaciones', isAutonomous: true, confidenceRequired: 70, executionType: 'realtime' },
      { id: 'segment_prediction', name: 'Predicción Movimientos', description: 'Forecasting de segmentos', isAutonomous: true, confidenceRequired: 75, executionType: 'scheduled' }
    ],
    defaultConfidence: 80,
    defaultPriority: 2,
    maxActionsPerHour: 30,
    collaboratingModules: ['customer_360', 'analytics', 'segmentation']
  },
  
  segmentation: {
    name: 'Agente de Segmentación',
    description: 'Segmentación ML avanzada y clustering de clientes',
    color: 'from-cyan-500 to-sky-600',
    icon: 'Layers',
    systemPrompt: `Eres el Agente de Segmentación ultra-especializado. Tu misión es:
1. Crear segmentos dinámicos con ML
2. Identificar patrones ocultos en datos
3. Personalizar estrategias por segmento
4. Medir efectividad de segmentación
5. Automatizar targeting por segmento
Siempre busca insights en los datos.`,
    capabilities: [
      { id: 'ml_clustering', name: 'Clustering ML', description: 'Segmentación automática', isAutonomous: true, confidenceRequired: 80, executionType: 'batch' },
      { id: 'pattern_discovery', name: 'Descubrimiento Patrones', description: 'Análisis de datos', isAutonomous: true, confidenceRequired: 75, executionType: 'batch' },
      { id: 'segment_strategies', name: 'Estrategias Segmento', description: 'Personalización', isAutonomous: false, confidenceRequired: 80, executionType: 'batch' },
      { id: 'segmentation_metrics', name: 'Métricas Segmentación', description: 'Medición de efectividad', isAutonomous: true, confidenceRequired: 65, executionType: 'scheduled' },
      { id: 'automated_targeting', name: 'Targeting Automatizado', description: 'Acciones por segmento', isAutonomous: true, confidenceRequired: 85, executionType: 'realtime' }
    ],
    defaultConfidence: 80,
    defaultPriority: 2,
    maxActionsPerHour: 25,
    collaboratingModules: ['rfm', 'campaigns', 'analytics']
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
