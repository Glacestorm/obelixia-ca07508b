/**
 * Configuración de dominios y agentes del sistema ERP
 * Define la estructura jerárquica de agentes por módulo
 */

import type { AgentDomain, ModuleAgentType, DomainConfig, ModuleAgentConfig } from './erpAgentTypes';

// === CONFIGURACIÓN DE DOMINIOS ===

export const DOMAIN_CONFIG: Record<AgentDomain, DomainConfig> = {
  financial: {
    name: 'Financiero',
    color: 'from-emerald-500 to-green-600',
    icon: 'Calculator',
    description: 'Gestión contable, tesorería, facturación, fiscalidad y cash flow',
    moduleTypes: ['accounting', 'treasury', 'invoicing', 'collections', 'cashflow', 'fiscal']
  },
  crm_cs: {
    name: 'CRM & Customer Success',
    color: 'from-blue-500 to-indigo-600',
    icon: 'Users',
    description: 'Pipeline de ventas, retención y satisfacción de clientes',
    moduleTypes: ['sales', 'customer_success', 'pipeline', 'churn_prevention', 'upsell']
  },
  compliance: {
    name: 'Compliance & Auditoría',
    color: 'from-orange-500 to-red-600',
    icon: 'Shield',
    description: 'Normativas RGPD, PSD2/3, ESG, KYC/AML y auditoría continua',
    moduleTypes: ['gdpr', 'psd2', 'esg', 'audit', 'kyc_aml', 'risk']
  },
  operations: {
    name: 'Operaciones',
    color: 'from-purple-500 to-violet-600',
    icon: 'Cog',
    description: 'Inventario, compras, logística y mantenimiento',
    moduleTypes: ['inventory', 'procurement', 'logistics', 'maintenance', 'scheduling']
  },
  hr: {
    name: 'Recursos Humanos',
    color: 'from-pink-500 to-rose-600',
    icon: 'UserCheck',
    description: 'Nóminas, contratos, vacaciones, PRL, reclutamiento y formación',
    moduleTypes: ['payroll', 'contracts', 'vacations', 'prl_safety', 'recruitment', 'training', 'performance']
  },
  analytics: {
    name: 'Analytics & BI',
    color: 'from-cyan-500 to-teal-600',
    icon: 'BarChart3',
    description: 'Reporting, forecasting y detección de anomalías',
    moduleTypes: ['reporting', 'forecasting', 'anomaly_detection']
  }
};

// === CONFIGURACIÓN DE AGENTES DE MÓDULO ===

export const MODULE_AGENT_CONFIG: Record<ModuleAgentType, ModuleAgentConfig> = {
  // === FINANCIERO ===
  accounting: {
    name: 'Agente Contable',
    description: 'Automatización de asientos, reconciliación y cierre contable',
    capabilities: ['asientos_automaticos', 'reconciliacion_bancaria', 'cierre_mensual', 'analisis_pgc', 'consolidacion'],
    defaultPriority: 1
  },
  treasury: {
    name: 'Agente Tesorería',
    description: 'Gestión de liquidez, previsiones y operaciones de tesorería',
    capabilities: ['prevision_liquidez', 'gestion_cobros', 'gestion_pagos', 'pooling_cash', 'alertas_saldos'],
    defaultPriority: 1
  },
  invoicing: {
    name: 'Agente Facturación',
    description: 'Generación automática de facturas y gestión de impuestos',
    capabilities: ['facturacion_automatica', 'calculo_iva', 'retenciones', 'envio_sii', 'facturas_electronicas'],
    defaultPriority: 2
  },
  collections: {
    name: 'Agente Cobros',
    description: 'Seguimiento de cobros y gestión de impagados',
    capabilities: ['seguimiento_vencimientos', 'recordatorios_automaticos', 'escalado_impagados', 'analisis_riesgo_cliente'],
    defaultPriority: 2
  },
  cashflow: {
    name: 'Agente Cash Flow',
    description: 'Predicción y optimización del flujo de caja',
    capabilities: ['prediccion_cashflow', 'escenarios_what_if', 'alertas_deficit', 'optimizacion_pagos'],
    defaultPriority: 1
  },
  fiscal: {
    name: 'Agente Fiscal',
    description: 'Gestión fiscal, IVA, SII, Intrastat y cumplimiento tributario',
    capabilities: ['sii_management', 'vat_calculation', 'intrastat_reporting', 'tax_compliance', 'fiscal_calendar', 'multi_jurisdiction'],
    defaultPriority: 1
  },

  // === CRM & CUSTOMER SUCCESS ===
  sales: {
    name: 'Agente Ventas',
    description: 'Calificación de leads y automatización del proceso comercial',
    capabilities: ['lead_scoring', 'seguimiento_automatico', 'prediccion_cierre', 'emails_personalizados', 'scheduling'],
    defaultPriority: 1
  },
  customer_success: {
    name: 'Agente CS',
    description: 'Gestión proactiva del éxito del cliente',
    capabilities: ['health_score', 'onboarding_asistido', 'qbr_automation', 'advocacy_detection', 'renewal_management'],
    defaultPriority: 1
  },
  pipeline: {
    name: 'Agente Pipeline',
    description: 'Análisis y optimización del pipeline de ventas',
    capabilities: ['forecast_accuracy', 'stage_optimization', 'deal_velocity', 'pipeline_coverage', 'bottleneck_detection'],
    defaultPriority: 2
  },
  churn_prevention: {
    name: 'Agente Anti-Churn',
    description: 'Detección temprana y prevención de bajas',
    capabilities: ['churn_prediction', 'risk_segmentation', 'intervention_automation', 'retention_campaigns', 'win_back'],
    defaultPriority: 1
  },
  upsell: {
    name: 'Agente Upsell',
    description: 'Identificación de oportunidades de expansión',
    capabilities: ['expansion_scoring', 'product_fit_analysis', 'timing_optimization', 'proposal_generation'],
    defaultPriority: 2
  },

  // === COMPLIANCE ===
  gdpr: {
    name: 'Agente RGPD',
    description: 'Cumplimiento y monitoreo de protección de datos',
    capabilities: ['consent_management', 'dsar_automation', 'breach_detection', 'pia_assistance', 'data_mapping'],
    defaultPriority: 1
  },
  psd2: {
    name: 'Agente PSD2/3',
    description: 'Cumplimiento de normativas de pagos y Open Banking',
    capabilities: ['sca_monitoring', 'tpp_management', 'api_compliance', 'fraud_detection', 'regulatory_reporting'],
    defaultPriority: 1
  },
  esg: {
    name: 'Agente ESG',
    description: 'Monitoreo y reporting de criterios ESG',
    capabilities: ['carbon_tracking', 'social_metrics', 'governance_scoring', 'esg_reporting', 'sustainability_alerts'],
    defaultPriority: 2
  },
  audit: {
    name: 'Agente Auditoría',
    description: 'Auditoría continua y detección de anomalías',
    capabilities: ['continuous_monitoring', 'control_testing', 'exception_detection', 'audit_trail', 'finding_management'],
    defaultPriority: 1
  },
  kyc_aml: {
    name: 'Agente KYC/AML',
    description: 'Verificación de clientes y prevención de blanqueo',
    capabilities: ['identity_verification', 'pep_screening', 'transaction_monitoring', 'sar_generation', 'risk_assessment'],
    defaultPriority: 1
  },
  risk: {
    name: 'Agente Riesgos',
    description: 'Evaluación y monitoreo de riesgos operacionales',
    capabilities: ['risk_identification', 'control_effectiveness', 'incident_management', 'risk_reporting', 'mitigation_tracking'],
    defaultPriority: 1
  },

  // === OPERACIONES ===
  inventory: {
    name: 'Agente Inventario',
    description: 'Gestión optimizada de stock y almacén',
    capabilities: ['stock_optimization', 'reorder_automation', 'demand_forecasting', 'obsolete_detection', 'abc_analysis'],
    defaultPriority: 2
  },
  procurement: {
    name: 'Agente Compras',
    description: 'Automatización del proceso de aprovisionamiento',
    capabilities: ['supplier_evaluation', 'purchase_automation', 'contract_management', 'spend_analysis', 'negotiation_support'],
    defaultPriority: 2
  },
  logistics: {
    name: 'Agente Logística',
    description: 'Optimización de rutas y entregas',
    capabilities: ['route_optimization', 'delivery_tracking', 'carrier_selection', 'last_mile', 'returns_management'],
    defaultPriority: 2
  },
  maintenance: {
    name: 'Agente Mantenimiento',
    description: 'Mantenimiento predictivo de activos',
    capabilities: ['predictive_maintenance', 'work_order_automation', 'spare_parts_management', 'asset_tracking'],
    defaultPriority: 3
  },
  scheduling: {
    name: 'Agente Scheduling',
    description: 'Programación inteligente de recursos',
    capabilities: ['resource_allocation', 'capacity_planning', 'conflict_resolution', 'optimization'],
    defaultPriority: 2
  },

  // === RRHH ===
  payroll: {
    name: 'Agente Nóminas',
    description: 'Automatización del proceso de nóminas y cotizaciones SS',
    capabilities: ['payroll_calculation', 'tax_compliance', 'benefits_administration', 'ss_cotizaciones', 'irpf_calculation', 'reporting'],
    defaultPriority: 1
  },
  contracts: {
    name: 'Agente Contratos',
    description: 'Gestión de contratos laborales, altas y bajas',
    capabilities: ['contract_generation', 'contract_renewal', 'termination_calculation', 'severance_calculation', 'sepe_registration'],
    defaultPriority: 1
  },
  vacations: {
    name: 'Agente Vacaciones',
    description: 'Planificación y control de vacaciones y ausencias',
    capabilities: ['vacation_planning', 'absence_tracking', 'calendar_management', 'conflict_detection', 'balance_calculation'],
    defaultPriority: 2
  },
  prl_safety: {
    name: 'Agente PRL',
    description: 'Prevención de Riesgos Laborales y seguridad',
    capabilities: ['risk_assessment', 'safety_training', 'incident_tracking', 'epi_management', 'health_surveillance', 'audit_prl'],
    defaultPriority: 1
  },
  recruitment: {
    name: 'Agente Reclutamiento',
    description: 'Optimización del proceso de selección',
    capabilities: ['cv_screening', 'candidate_matching', 'interview_scheduling', 'onboarding'],
    defaultPriority: 2
  },
  training: {
    name: 'Agente Formación',
    description: 'Gestión de capacitación y desarrollo',
    capabilities: ['learning_paths', 'skill_gap_analysis', 'certification_tracking', 'content_recommendation', 'mandatory_training'],
    defaultPriority: 3
  },
  performance: {
    name: 'Agente Performance',
    description: 'Evaluación y gestión del desempeño',
    capabilities: ['goal_tracking', 'feedback_automation', 'review_scheduling', 'talent_analytics'],
    defaultPriority: 2
  },

  // === ANALYTICS ===
  reporting: {
    name: 'Agente Reporting',
    description: 'Generación automática de informes',
    capabilities: ['report_generation', 'data_visualization', 'scheduled_reports', 'ad_hoc_queries'],
    defaultPriority: 2
  },
  forecasting: {
    name: 'Agente Forecasting',
    description: 'Predicciones y proyecciones de negocio',
    capabilities: ['revenue_forecasting', 'demand_prediction', 'trend_analysis', 'scenario_modeling'],
    defaultPriority: 1
  },
  anomaly_detection: {
    name: 'Agente Anomalías',
    description: 'Detección de patrones anómalos',
    capabilities: ['statistical_analysis', 'pattern_recognition', 'alert_generation', 'root_cause_analysis'],
    defaultPriority: 1
  }
};

// === ACCIONES AUTÓNOMAS DEL SUPERVISOR ===

export const AUTONOMOUS_ACTIONS = [
  'distribute_tasks',
  'realtime_monitoring', 
  'predictive_analysis',
  'optimize_workflows',
  'resolve_conflicts',
  'auto_optimize'
] as const;

export type AutonomousAction = typeof AUTONOMOUS_ACTIONS[number];

// === HELPERS ===

export function getDomainAgentCount(): number {
  return Object.keys(DOMAIN_CONFIG).length;
}

export function getModuleAgentCount(): number {
  return Object.values(DOMAIN_CONFIG).reduce(
    (sum, domain) => sum + domain.moduleTypes.length, 
    0
  );
}

export function getAgentsByDomain(domain: AgentDomain): ModuleAgentType[] {
  return DOMAIN_CONFIG[domain]?.moduleTypes || [];
}
