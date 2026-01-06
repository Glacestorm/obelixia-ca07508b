// Static Agent Help Configurations - No API calls needed
import { AgentHelpConfig, AgentHelpSection, AgentExample, AgentTip } from '@/hooks/admin/agents/agentHelpTypes';

// === ERP AGENT CONFIGS ===
const ERP_AGENT_CONFIGS: Record<string, Partial<AgentHelpConfig>> = {
  accounting: {
    name: 'Agente de Contabilidad',
    shortDescription: 'Gestiona asientos contables, balances y reportes financieros',
    fullDescription: 'El Agente de Contabilidad es un asistente especializado en la gestión integral de la contabilidad empresarial. Automatiza la creación de asientos, valida la coherencia del plan de cuentas, genera balances de comprobación y analiza desviaciones presupuestarias. Trabaja bajo normativas NIIF/NIF y puede adaptarse a regulaciones locales.',
    icon: 'Calculator',
    color: 'blue',
    capabilities: [
      'Creación automática de asientos contables',
      'Validación de plan de cuentas',
      'Generación de balances de comprobación',
      'Análisis de desviaciones presupuestarias',
      'Conciliación bancaria asistida',
      'Cálculo de amortizaciones',
      'Detección de errores contables',
    ],
    bestPractices: [
      'Revisar asientos sugeridos antes de confirmar',
      'Mantener el plan de cuentas actualizado',
      'Usar etiquetas para clasificar transacciones',
      'Configurar alertas de desviación presupuestaria',
    ],
  },
  treasury: {
    name: 'Agente de Tesorería',
    shortDescription: 'Optimiza flujos de caja y gestiona liquidez',
    fullDescription: 'El Agente de Tesorería monitorea en tiempo real los flujos de efectivo, predice necesidades de liquidez, optimiza la posición de caja y gestiona relaciones bancarias. Utiliza modelos predictivos para anticipar déficits o excedentes.',
    icon: 'Wallet',
    color: 'green',
    capabilities: [
      'Predicción de flujos de caja',
      'Optimización de posición de liquidez',
      'Gestión de cuentas bancarias múltiples',
      'Alertas de déficit de caja',
      'Sugerencias de inversión de excedentes',
      'Conciliación automática de movimientos',
    ],
    bestPractices: [
      'Revisar predicciones semanalmente',
      'Mantener buffer de seguridad configurado',
      'Clasificar movimientos por categoría',
    ],
  },
  invoicing: {
    name: 'Agente de Facturación',
    shortDescription: 'Automatiza emisión y validación de facturas',
    fullDescription: 'El Agente de Facturación gestiona todo el ciclo de facturación: desde la creación automática basada en pedidos, validación fiscal, envío electrónico, hasta el seguimiento de cobros. Compatible con sistemas de facturación electrónica SII, TicketBAI, etc.',
    icon: 'FileText',
    color: 'purple',
    capabilities: [
      'Generación automática de facturas',
      'Validación fiscal en tiempo real',
      'Envío electrónico automatizado',
      'Seguimiento de cobros pendientes',
      'Gestión de rectificativas',
      'Integración con SII/TicketBAI',
    ],
    bestPractices: [
      'Configurar plantillas por tipo de cliente',
      'Activar validación fiscal previa',
      'Programar envíos automáticos',
    ],
  },
  payroll: {
    name: 'Agente de Nóminas',
    shortDescription: 'Calcula y gestiona nóminas y seguros sociales',
    fullDescription: 'El Agente de Nóminas automatiza el cálculo de salarios, retenciones, seguros sociales y genera los ficheros para presentación. Mantiene actualizado el convenio colectivo y aplica automáticamente las actualizaciones legales.',
    icon: 'Users',
    color: 'orange',
    capabilities: [
      'Cálculo automático de nóminas',
      'Gestión de retenciones IRPF',
      'Generación de ficheros Seguridad Social',
      'Control de vacaciones y ausencias',
      'Simulación de costes salariales',
      'Actualización automática de convenios',
    ],
    bestPractices: [
      'Verificar datos de empleados mensualmente',
      'Revisar retenciones tras cambios familiares',
      'Programar cálculo antes de fecha límite',
    ],
  },
  inventory: {
    name: 'Agente de Inventario',
    shortDescription: 'Optimiza stock y gestiona almacenes',
    fullDescription: 'El Agente de Inventario monitorea niveles de stock en tiempo real, predice necesidades de reposición, optimiza la rotación de productos y gestiona múltiples almacenes. Utiliza IA para detectar anomalías y sugerir ajustes.',
    icon: 'Package',
    color: 'amber',
    capabilities: [
      'Monitoreo de stock en tiempo real',
      'Predicción de demanda',
      'Alertas de stock mínimo',
      'Optimización de reposición',
      'Gestión multi-almacén',
      'Detección de obsolescencia',
    ],
    bestPractices: [
      'Configurar puntos de reorden por producto',
      'Realizar inventarios cíclicos',
      'Analizar rotación mensualmente',
    ],
  },
  purchasing: {
    name: 'Agente de Compras',
    shortDescription: 'Optimiza aprovisionamiento y relaciones con proveedores',
    fullDescription: 'El Agente de Compras analiza necesidades de aprovisionamiento, compara proveedores, negocia condiciones y automatiza pedidos. Evalúa el rendimiento de proveedores y sugiere alternativas más rentables.',
    icon: 'ShoppingCart',
    color: 'teal',
    capabilities: [
      'Análisis de necesidades de compra',
      'Comparación de proveedores',
      'Automatización de pedidos',
      'Evaluación de proveedores',
      'Negociación de condiciones',
      'Control de plazos de entrega',
    ],
    bestPractices: [
      'Mantener catálogo de proveedores actualizado',
      'Definir criterios de evaluación',
      'Revisar condiciones periódicamente',
    ],
  },
  sales: {
    name: 'Agente de Ventas',
    shortDescription: 'Optimiza proceso de ventas y pedidos',
    fullDescription: 'El Agente de Ventas gestiona el ciclo completo de ventas: desde la cotización hasta la entrega. Analiza patrones de compra, sugiere cross-selling y up-selling, y optimiza rutas de entrega.',
    icon: 'TrendingUp',
    color: 'rose',
    capabilities: [
      'Gestión de cotizaciones',
      'Procesamiento de pedidos',
      'Sugerencias de cross-selling',
      'Análisis de patrones de compra',
      'Optimización de rutas',
      'Seguimiento de entregas',
    ],
    bestPractices: [
      'Configurar reglas de descuento',
      'Activar sugerencias automáticas',
      'Revisar métricas de conversión',
    ],
  },
  fixed_assets: {
    name: 'Agente de Activos Fijos',
    shortDescription: 'Gestiona activos y amortizaciones',
    fullDescription: 'El Agente de Activos Fijos controla el ciclo de vida completo de los activos: adquisición, amortización, mantenimiento y baja. Calcula automáticamente las cuotas de amortización según diferentes métodos.',
    icon: 'Building',
    color: 'slate',
    capabilities: [
      'Registro de activos',
      'Cálculo de amortizaciones',
      'Planificación de mantenimiento',
      'Valoración de activos',
      'Gestión de bajas',
      'Reportes fiscales',
    ],
    bestPractices: [
      'Revisar vida útil estimada',
      'Programar mantenimientos preventivos',
      'Documentar cada activo con fotos',
    ],
  },
  tax: {
    name: 'Agente Fiscal',
    shortDescription: 'Gestiona impuestos y cumplimiento tributario',
    fullDescription: 'El Agente Fiscal calcula y presenta impuestos, monitorea cambios normativos, optimiza la carga fiscal dentro del marco legal y genera alertas de vencimientos. Especializado en IVA, IS, IRPF y tributos locales.',
    icon: 'Receipt',
    color: 'red',
    capabilities: [
      'Cálculo automático de impuestos',
      'Presentación telemática',
      'Monitoreo de normativa',
      'Optimización fiscal legal',
      'Alertas de vencimientos',
      'Simulación de escenarios',
    ],
    bestPractices: [
      'Configurar calendario fiscal',
      'Revisar retenciones trimestralmente',
      'Mantener documentación ordenada',
    ],
  },
  budgeting: {
    name: 'Agente de Presupuestos',
    shortDescription: 'Planifica y controla presupuestos',
    fullDescription: 'El Agente de Presupuestos ayuda a crear presupuestos realistas, monitorea su ejecución en tiempo real, detecta desviaciones y sugiere acciones correctivas. Soporta múltiples escenarios y versiones.',
    icon: 'PieChart',
    color: 'indigo',
    capabilities: [
      'Creación de presupuestos',
      'Monitoreo de ejecución',
      'Detección de desviaciones',
      'Análisis de varianzas',
      'Proyecciones y forecasting',
      'Múltiples escenarios',
    ],
    bestPractices: [
      'Crear presupuesto base cero anual',
      'Revisar ejecución mensualmente',
      'Documentar supuestos clave',
    ],
  },
  consolidation: {
    name: 'Agente de Consolidación',
    shortDescription: 'Consolida estados financieros de grupos',
    fullDescription: 'El Agente de Consolidación gestiona la consolidación de estados financieros de grupos empresariales, eliminando operaciones intercompañía, ajustando participaciones y generando estados consolidados.',
    icon: 'GitMerge',
    color: 'cyan',
    capabilities: [
      'Consolidación multi-empresa',
      'Eliminación de intercompañías',
      'Ajustes de participación',
      'Estados consolidados',
      'Conversión de divisas',
      'Reporting de grupo',
    ],
    bestPractices: [
      'Estandarizar plan de cuentas del grupo',
      'Definir perímetro de consolidación',
      'Automatizar eliminaciones recurrentes',
    ],
  },
  reporting: {
    name: 'Agente de Reporting',
    shortDescription: 'Genera informes y dashboards financieros',
    fullDescription: 'El Agente de Reporting crea informes financieros personalizados, dashboards interactivos y análisis ad-hoc. Automatiza la generación periódica y distribución a stakeholders.',
    icon: 'BarChart3',
    color: 'violet',
    capabilities: [
      'Informes personalizados',
      'Dashboards interactivos',
      'Análisis ad-hoc',
      'Distribución automática',
      'Exportación múltiples formatos',
      'Drill-down de datos',
    ],
    bestPractices: [
      'Definir KPIs clave por área',
      'Programar informes recurrentes',
      'Usar visualizaciones claras',
    ],
  },
};

// === CRM AGENT CONFIGS ===
const CRM_AGENT_CONFIGS: Record<string, Partial<AgentHelpConfig>> = {
  lead_scoring: {
    name: 'Agente de Lead Scoring',
    shortDescription: 'Califica leads automáticamente con IA',
    fullDescription: 'El Agente de Lead Scoring utiliza machine learning para evaluar y priorizar leads basándose en comportamiento, demografía y engagement. Aprende continuamente de las conversiones exitosas.',
    icon: 'Target',
    color: 'emerald',
    capabilities: [
      'Scoring automático de leads',
      'Priorización inteligente',
      'Predicción de conversión',
      'Segmentación dinámica',
      'Alertas de leads calientes',
    ],
    bestPractices: [
      'Revisar modelo mensualmente',
      'Alimentar con datos de conversión',
      'Ajustar umbrales de prioridad',
    ],
  },
  churn_predictor: {
    name: 'Agente Predictor de Churn',
    shortDescription: 'Predice y previene abandono de clientes',
    fullDescription: 'El Agente de Predicción de Churn analiza patrones de comportamiento para identificar clientes en riesgo de abandono y sugiere acciones preventivas personalizadas.',
    icon: 'UserMinus',
    color: 'rose',
    capabilities: [
      'Predicción de abandono',
      'Identificación de señales de riesgo',
      'Acciones preventivas sugeridas',
      'Segmentación por riesgo',
      'Análisis de causas',
    ],
    bestPractices: [
      'Actuar en los primeros indicadores',
      'Personalizar retención por segmento',
      'Medir efectividad de acciones',
    ],
  },
  deal_coach: {
    name: 'Agente Coach de Ventas',
    shortDescription: 'Asesora en estrategias de cierre',
    fullDescription: 'El Agente Coach de Ventas analiza cada oportunidad y proporciona recomendaciones específicas para avanzar en el pipeline, identificando objeciones potenciales y sugiriendo tácticas de cierre.',
    icon: 'Award',
    color: 'amber',
    capabilities: [
      'Análisis de oportunidades',
      'Recomendaciones de siguiente paso',
      'Identificación de objeciones',
      'Tácticas de cierre',
      'Benchmarking de deals',
    ],
    bestPractices: [
      'Actualizar estado de deals diariamente',
      'Seguir secuencia recomendada',
      'Documentar objeciones encontradas',
    ],
  },
  sentiment_analyzer: {
    name: 'Agente de Análisis de Sentimiento',
    shortDescription: 'Analiza tono y sentimiento de comunicaciones',
    fullDescription: 'El Agente de Análisis de Sentimiento evalúa el tono emocional de emails, chats y llamadas para identificar clientes satisfechos, frustrados o en riesgo.',
    icon: 'Heart',
    color: 'pink',
    capabilities: [
      'Análisis de sentimiento en tiempo real',
      'Detección de emociones',
      'Alertas de sentimiento negativo',
      'Tendencias de satisfacción',
      'Análisis de comunicaciones',
    ],
    bestPractices: [
      'Actuar rápido ante sentimiento negativo',
      'Celebrar feedback positivo',
      'Analizar tendencias semanales',
    ],
  },
};

// === SUPERVISOR CONFIG ===
const SUPERVISOR_CONFIG: Partial<AgentHelpConfig> = {
  name: 'Supervisor General de Agentes',
  shortDescription: 'Coordina y optimiza todos los agentes del sistema',
  fullDescription: 'El Supervisor General es el orquestador central de todos los agentes del sistema. Monitorea su rendimiento, resuelve conflictos entre agentes, distribuye carga de trabajo y optimiza la colaboración. Puede operar en modo autónomo o supervisado.',
  icon: 'Crown',
  color: 'gold',
  capabilities: [
    'Orquestación de agentes',
    'Monitoreo de rendimiento',
    'Resolución de conflictos',
    'Distribución de carga',
    'Modo autónomo/supervisado',
    'Insights globales',
    'Alertas del sistema',
  ],
  bestPractices: [
    'Revisar insights diariamente',
    'Configurar umbrales de alerta',
    'Usar modo autónomo solo cuando esté calibrado',
    'Revisar conflictos resueltos semanalmente',
  ],
};

// === HELPER FUNCTIONS ===
function getDefaultSections(agentType: string): AgentHelpSection[] {
  return [
    {
      id: 'overview',
      title: 'Descripción General',
      content: 'Información general sobre el agente y sus funciones principales.',
      orderIndex: 1,
    },
    {
      id: 'capabilities',
      title: 'Capacidades',
      content: 'Lista completa de las capacidades del agente.',
      orderIndex: 2,
    },
    {
      id: 'usage',
      title: 'Guía de Uso',
      content: 'Cómo utilizar el agente de forma efectiva.',
      orderIndex: 3,
      subsections: [
        {
          id: 'getting-started',
          title: 'Primeros Pasos',
          content: 'Configuración inicial y primeras acciones.',
          orderIndex: 1,
        },
        {
          id: 'advanced',
          title: 'Uso Avanzado',
          content: 'Funcionalidades avanzadas y optimizaciones.',
          orderIndex: 2,
        },
      ],
    },
    {
      id: 'examples',
      title: 'Ejemplos Prácticos',
      content: 'Ejemplos de uso real del agente.',
      orderIndex: 4,
    },
    {
      id: 'learned',
      title: 'Conocimiento Aprendido',
      content: 'Lo que el agente ha aprendido de interacciones anteriores.',
      orderIndex: 5,
    },
    {
      id: 'tips',
      title: 'Tips y Mejores Prácticas',
      content: 'Consejos para sacar el máximo provecho.',
      orderIndex: 6,
    },
  ];
}

function getDefaultExamples(agentId: string): AgentExample[] {
  return [
    {
      id: `${agentId}-ex-1`,
      title: 'Ejemplo básico',
      description: 'Un ejemplo simple de uso del agente.',
      input: '¿Cómo puedo empezar a usar este agente?',
      output: 'Para empezar, configura los parámetros básicos en el panel de configuración...',
      tags: ['básico', 'inicio'],
    },
  ];
}

function getDefaultTips(agentId: string): AgentTip[] {
  return [
    {
      id: `${agentId}-tip-1`,
      title: 'Configura alertas personalizadas',
      content: 'Las alertas te ayudarán a estar al tanto de eventos importantes sin revisar constantemente.',
      priority: 'high',
      category: 'configuración',
    },
    {
      id: `${agentId}-tip-2`,
      title: 'Revisa los insights semanalmente',
      content: 'El agente genera insights que pueden pasar desapercibidos. Revísalos semanalmente para optimizar procesos.',
      priority: 'medium',
      category: 'uso',
    },
  ];
}

// === MAIN EXPORT ===
export function getAgentHelpConfig(
  agentId: string,
  agentType: 'erp' | 'crm' | 'supervisor' | 'domain'
): AgentHelpConfig {
  let baseConfig: Partial<AgentHelpConfig>;

  if (agentType === 'supervisor') {
    baseConfig = SUPERVISOR_CONFIG;
  } else if (agentType === 'crm') {
    baseConfig = CRM_AGENT_CONFIGS[agentId] || {};
  } else {
    baseConfig = ERP_AGENT_CONFIGS[agentId] || {};
  }

  return {
    agentId,
    agentType,
    name: baseConfig.name || `Agente ${agentId}`,
    shortDescription: baseConfig.shortDescription || 'Agente especializado del sistema',
    fullDescription: baseConfig.fullDescription || 'Descripción no disponible.',
    icon: baseConfig.icon || 'Bot',
    color: baseConfig.color || 'gray',
    sections: getDefaultSections(agentId),
    examples: getDefaultExamples(agentId),
    tips: getDefaultTips(agentId),
    capabilities: baseConfig.capabilities || [],
    bestPractices: baseConfig.bestPractices || [],
    limitations: baseConfig.limitations,
    relatedAgents: baseConfig.relatedAgents,
  };
}

export function getAllAgentConfigs(): AgentHelpConfig[] {
  const configs: AgentHelpConfig[] = [];
  
  // ERP agents
  Object.keys(ERP_AGENT_CONFIGS).forEach(id => {
    configs.push(getAgentHelpConfig(id, 'erp'));
  });
  
  // CRM agents
  Object.keys(CRM_AGENT_CONFIGS).forEach(id => {
    configs.push(getAgentHelpConfig(id, 'crm'));
  });
  
  // Supervisor
  configs.push(getAgentHelpConfig('supervisor', 'supervisor'));
  
  return configs;
}

export { ERP_AGENT_CONFIGS, CRM_AGENT_CONFIGS, SUPERVISOR_CONFIG };
